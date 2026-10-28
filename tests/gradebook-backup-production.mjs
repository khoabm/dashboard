/** Verifies the staged production contract using ephemeral local PG17 and runtime-generated synthetic keys only. */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createCrypto } from '../supabase/functions/_shared/crypto.js';
import { sha256, backupFiles } from '../scripts/gradebook-backup.mjs';
import {
  limits,
  tableNames,
  canonical,
  inventory,
  validateManifest,
  exportBackup,
  authenticateBackup,
  verifyRestored,
  native,
  inspectArchive,
} from '../scripts/gradebook-backup-production.mjs';

const directory = await mkdtemp(path.join(tmpdir(), 'gb-production-synthetic-'));
const pgBin = process.env.GB_TEST_PG_BIN;
const age = process.env.GB_AGE_BIN;
const keygen = process.env.GB_AGE_KEYGEN_BIN;
const tools = { age, pgRestore: path.join(pgBin || '', 'pg_restore.exe') };
const port = '15439';
const pgEnv = {
  ...Object.fromEntries(
    ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH']
      .filter((key) => process.env[key])
      .map((key) => [key, process.env[key]]),
  ),
  PGHOST: '127.0.0.1',
  PGPORT: port,
  PGUSER: 'gb_fixture_owner',
  PGDATABASE: 'postgres',
  PGCONNECT_TIMEOUT: '3',
  PGOPTIONS: '-c statement_timeout=15000 -c lock_timeout=3000',
  PSQLRC: path.join(directory, 'no-psqlrc'),
};
delete pgEnv.PGSERVICE;
delete pgEnv.PGSERVICEFILE;
delete pgEnv.PGPASSWORD;
delete pgEnv.PGPASSFILE;
let started = false,
  holder,
  cases = 0,
  stage = 'tools';
const sensitive = [];
const selectedCases = process.env.GB_TEST_ONLY?.split(',');

/** Runs a finite local fixture command with all diagnostics captured, never logged.
 * @param {string} executable - A trusted native tool path.
 * @param {string[]} args - Test-only options without credentials or row values.
 * @param {Buffer|string} input - Runtime synthetic stdin.
 * @returns {Buffer} Captured stdout after successful completion.
 */
function command(executable, args, input) {
  const serverControl = path.basename(executable) === 'pg_ctl.exe';
  const result = spawnSync(executable, args, {
    input,
    env: pgEnv,
    timeout: 30000,
    maxBuffer: limits.archive,
    windowsHide: true,
    // Windows descendants can retain pg_ctl pipe handles after it exits; the private server log captures startup.
    stdio: serverControl ? 'ignore' : ['pipe', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) {
    const reason = ['EPERM', 'ENOENT', 'ETIMEDOUT'].includes(result.error?.code)
      ? result.error.code
      : 'exit_' + String(result.status);
    throw new Error('fixture_command_' + reason);
  }
  return result.stdout || Buffer.alloc(0);
}

/** Counts one finite concern only after its assertions complete.
 * @param {string} name - Fixed non-sensitive case name.
 * @param {Function} check - The bounded check.
 */
async function test(name, check) {
  // The positive package is a fixture prerequisite; focused follow-ups do not replay unrelated concerns.
  if (selectedCases && name !== 'positive_export_authenticate' && !selectedCases.includes(name))
    return;
  stage = name;
  await check();
  cases++;
}

/** Calls the actual CLI and checks that neither success nor failure output contains generated secrets.
 * @param {string} operation - The fixed CLI operation.
 * @param {object} control - Runtime paths and public metadata.
 * @param {boolean} success - Expected exit disposition.
 * @returns {Promise<Buffer>} Captured fixed-summary output.
 */
async function cli(operation, control, success = true) {
  const file = path.join(directory, randomUUID() + '.json');
  await writeFile(file, JSON.stringify(control), { mode: 0o600 });
  const result = spawnSync(
    process.execPath,
    ['scripts/gradebook-backup-cli.mjs', operation, file],
    { env: pgEnv, timeout: 30000, maxBuffer: 16384, windowsHide: true },
  );
  assert(!result.error);
  assert.equal(result.status, success ? 0 : 1);
  const output = Buffer.concat([result.stdout, result.stderr]);
  for (const value of sensitive) assert(!output.includes(Buffer.from(value)));
  assert.match(output.toString(), success ? /^PASS G07 / : /^FAIL G07 backup operation;/);
  assert(!/stack|AssertionError|PRIVATE_SECRET_SENTINEL/.test(output.toString()));
  return output;
}

try {
  assert(pgBin && age && keygen, 'native_tools_required');
  assert.match(command(path.join(pgBin, 'pg_dump.exe'), ['--version']).toString(), /\b17\./);
  assert.match(command(age, ['--version']).toString(), /1\.3\.2/);
  // No production identities are generated; each invocation creates a disposable independent fixture.
  const identities = {},
    recipients = {};
  for (const name of ['database', 'keyrings']) {
    const bytes = command(keygen, []);
    const file = path.join(directory, name + '.txt');
    await writeFile(file, bytes, { mode: 0o600 });
    sensitive.push(
      bytes
        .toString()
        .split('\n')
        .find((line) => line.startsWith('AGE-SECRET-KEY-')),
    );
    bytes.fill(0);
    identities[name] = file;
    recipients[name] = command(keygen, ['-y', file]).toString().trim();
  }
  const settings = Object.fromEntries(
    ['identity', 'lookup', 'capability', 'preview'].map((purpose) => [
      purpose,
      {
        active: '2',
        keys: {
          1: randomBytes(32).toString('base64url'),
          2: randomBytes(32).toString('base64url'),
        },
      },
    ]),
  );
  for (const ring of Object.values(settings)) sensitive.push(...Object.values(ring.keys));
  const project = 'g07productioncontractfixture';
  const cid = randomUUID();
  const digits = ['000000000009', '000000000010'];
  sensitive.push(...digits);
  const envelopes = [];
  for (let i = 0; i < 2; i++) {
    const rings = structuredClone(settings);
    rings.identity.active = String(i + 1);
    envelopes.push(
      await (await createCrypto(project, rings)).encryptIdentity(cid, i + 1, digits[i]),
    );
  }
  const pgData = path.join(directory, 'pgdata');
  stage = 'initdb';
  command(path.join(pgBin, 'initdb.exe'), [
    '-D',
    pgData,
    '-U',
    'gb_fixture_owner',
    '-A',
    'trust',
    '--no-locale',
    '--encoding=UTF8',
  ]);
  stage = 'start_server';
  started = true;
  command(path.join(pgBin, 'pg_ctl.exe'), [
    '-D',
    pgData,
    '-l',
    path.join(directory, 'server.private.log'),
    '-o',
    '-h 127.0.0.1 -p ' + port,
    '-w',
    '-t',
    '10',
    'start',
  ]);
  const psql = path.join(pgBin, 'psql.exe');
  const sql = `CREATE SCHEMA gradebook;
    CREATE TABLE gradebook.classes(id uuid PRIMARY KEY,lookup_key_version integer,revision bigint,access_version bigint);
    CREATE TABLE gradebook.students(id bigint PRIMARY KEY,class_id uuid,identity_ciphertext bytea,identity_nonce bytea,identity_enc_kid text,identity_alg_version integer,identity_lookup bytea,lookup_key_version integer,birth_date date,revision bigint,capability_version bigint);
    CREATE TABLE gradebook.student_scores(student_id bigint,score numeric);
    CREATE TABLE gradebook.subjects(code text); CREATE TABLE gradebook.score_columns(code text);
    CREATE TABLE gradebook.lookup_attempts(attempts integer);
    INSERT INTO gradebook.classes VALUES ('${cid}',2,9007199254740993,1);
    ${envelopes.map((e, i) => `INSERT INTO gradebook.students VALUES (${i + 1},'${cid}','\\x${e.ciphertext}','\\x${e.nonce}','${e.encKid}',1,'\\x${e.lookup}',${i + 1},'2013-02-28',1,1);`).join('\n')}
    INSERT INTO gradebook.student_scores VALUES (1,8.12345),(2,0);
    INSERT INTO gradebook.subjects VALUES ('math'); INSERT INTO gradebook.score_columns VALUES ('final');`;
  command(psql, ['-X', '-q', '-v', 'ON_ERROR_STOP=1'], sql);
  const captureSql = await readFile('scripts/gradebook-backup-snapshot.sql', 'utf8');
  holder = spawn(psql, ['-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], {
    env: pgEnv,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let pending = '',
    parsed = [],
    capturedError = false;
  holder.stderr.on('data', () => {
    capturedError = true;
  });
  holder.stdin.on('error', () => {
    capturedError = true;
  });
  const capture = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('fixture_snapshot_timeout')), 15000);
    holder.on('error', () => {
      clearTimeout(timeout);
      reject(new Error('fixture_snapshot_failed'));
    });
    holder.on('exit', () => {
      if (parsed.length < 2) {
        clearTimeout(timeout);
        reject(new Error('fixture_snapshot_failed'));
      }
    });
    holder.stdout.on('data', (part) => {
      pending += part.toString();
      if (pending.length > limits.json) {
        clearTimeout(timeout);
        reject(new Error('fixture_snapshot_bound'));
        holder.kill();
        return;
      }
      let index;
      while ((index = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, index).trim();
        pending = pending.slice(index + 1);
        if (line) parsed.push(line);
        if (parsed.length === 2) {
          clearTimeout(timeout);
          resolve(parsed);
        }
      }
    });
  });
  holder.stdin.write(
    'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSELECT pg_export_snapshot();\n' +
      captureSql +
      '\n',
  );
  const [snapshot, stateText] = await capture;
  assert(!capturedError);
  const state = JSON.parse(stateText);
  stage = 'native_dump';
  const dump = command(path.join(pgBin, 'pg_dump.exe'), [
    '--format=custom',
    '--snapshot=' + snapshot,
  ]);
  holder.stdin.end('COMMIT;\n');
  const migrations = [
    {
      ledgerVersion: '20261027173228',
      file: '20261027173228_gradebook_foundation.sql',
      sha256: sha256(await readFile('supabase/migrations/20261027173228_gradebook_foundation.sql')),
    },
  ];
  const expected = {
    project,
    sourceCommit: command('git', ['rev-parse', 'HEAD']).toString().trim(),
    migrations,
    keyInventory: Object.fromEntries(
      Object.entries(settings).map(([purpose, ring]) => [
        purpose,
        {
          active: ring.active,
          kids: Object.keys(ring.keys).sort(),
          sha256: sha256(Buffer.from(canonical(ring))),
        },
      ]),
    ),
  };
  const manifest = {
    format: 'gb-recovery-v1',
    backupId: randomUUID(),
    createdAt: new Date().toISOString(),
    project: expected.project,
    sourceCommit: expected.sourceCommit,
    migrations: expected.migrations,
    postgresMajor: 17,
    snapshot: {
      id: snapshot,
      method: 'pg_export_snapshot',
      keysFrozen: true,
      evidenceId: randomUUID(),
    },
    dumpSha256: sha256(dump),
    settings,
    required: Object.fromEntries(
      Object.entries(settings).map(([p, ring]) => [p, Object.keys(ring.keys).sort()]),
    ),
    inventory: inventory(state),
  };
  let sealed, authenticated;
  await test('positive_export_authenticate', async () => {
    sealed = await exportBackup(dump, manifest, expected, recipients, tools);
    authenticated = await authenticateBackup(
      sealed.files,
      sealed.receipt,
      identities,
      expected,
      tools,
    );
    assert.deepEqual(authenticated.dump, dump);
    assert.equal(canonical(authenticated.manifest), canonical(manifest));
    assert.equal(sealed.receipt.verification, 'CANDIDATE_UNVERIFIED');
    assert.equal(sealed.receipt.databaseRecoveryVerification, 'NOT_RUN');
  });
  await test('four_retained_crypto_contracts', async () => {
    const restoredCrypto = await createCrypto(project, authenticated.manifest.settings);
    for (const kid of ['1', '2']) {
      const old = structuredClone(settings);
      for (const ring of Object.values(old)) ring.active = kid;
      const crypto = await createCrypto(project, old);
      const now = 100000;
      const claims = { classId: cid, studentId: '1', classEpoch: '1', studentEpoch: '1' };
      const token = await crypto.issueCapability(claims, now);
      assert.equal((await restoredCrypto.capability(token.token, now)).studentId, '1');
      await assert.rejects(restoredCrypto.capability(token.token, now + 601));
      const binding = {
        classId: cid,
        actor: randomUUID(),
        session: randomUUID(),
        kind: 'roster',
        semester: null,
      };
      const preview = await crypto.issuePreview(binding, 'synthetic', 'a'.repeat(64), now);
      await restoredCrypto.preview(preview.token, binding, 'synthetic', now);
      await assert.rejects(restoredCrypto.preview(preview.token, binding, 'synthetic', now + 301));
    }
  });
  await test('inventory_crypto_exactness', async () => {
    const result = await verifyRestored(manifest, expected, state);
    assert.equal(result.dataVerification, 'RESTORED_DATA_CRYPTO_VERIFIED');
    assert.equal(result.permissionVerification, 'NOT_RUN');
    assert(state.tables.student_scores.some((row) => row.score === '8.12345'));
    assert(state.tables.classes.some((row) => row.revision === '9007199254740993'));
    const shuffled = structuredClone(state);
    for (const rows of Object.values(shuffled.tables)) rows.reverse();
    assert.equal(canonical(inventory(shuffled)), canonical(manifest.inventory));
  });
  for (const purpose of ['identity', 'lookup', 'capability', 'preview']) {
    await test('missing_retained_' + purpose, async () => {
      const changed = structuredClone(manifest);
      delete changed.settings[purpose].keys['1'];
      await assert.rejects(validateManifest(changed, expected), {
        message: 'backup_manifest_failed',
      });
    });
  }
  for (const field of ['project', 'sourceCommit', 'migrations']) {
    await test('wrong_expected_' + field, async () => {
      const changed = structuredClone(expected);
      changed[field] = field === 'migrations' ? [] : 'wrong';
      await assert.rejects(validateManifest(manifest, changed));
    });
  }
  for (const field of ['format', 'snapshot', 'dumpSha256', 'required', 'inventory']) {
    await test('invalid_manifest_' + field, async () => {
      const changed = structuredClone(manifest);
      changed[field] = null;
      await assert.rejects(validateManifest(changed, expected));
    });
  }
  await test('unknown_field_secret_containment', async () => {
    const changed = structuredClone(manifest);
    changed.secret = 'PRIVATE_SECRET_SENTINEL';
    await assert.rejects(validateManifest(changed, expected), {
      message: 'backup_manifest_failed',
    });
    assert.throws(
      () =>
        native(process.execPath, [
          '-e',
          'process.stderr.write("PRIVATE_SECRET_SENTINEL");process.exit(1)',
        ]),
      { message: 'backup_native_failed' },
    );
  });
  await test('archive_structural_refusal', () => {
    assert.throws(() => inspectArchive(Buffer.from('PGDMP' + 'x'.repeat(100)), tools));
    assert.throws(() => inspectArchive(dump.subarray(0, 28), tools));
  });
  await test('truncated_data_blocks_rehashed', async () => {
    const truncated = dump.subarray(0, -48);
    const changed = structuredClone(manifest);
    changed.dumpSha256 = sha256(truncated);
    await assert.rejects(exportBackup(truncated, changed, expected, recipients, tools));
  });
  await test('trusted_key_inventory_and_active', async () => {
    const changed = structuredClone(manifest);
    delete changed.settings.capability.keys['1'];
    changed.required.capability = ['2'];
    await assert.rejects(validateManifest(changed, expected));
    const changedActive = structuredClone(manifest);
    changedActive.settings.preview.active = '1';
    await assert.rejects(validateManifest(changedActive, expected));
  });
  await test('archive_manifest_mismatch', async () => {
    await assert.rejects(
      exportBackup(
        Buffer.concat([dump, Buffer.from('changed')]),
        manifest,
        expected,
        recipients,
        tools,
      ),
    );
  });
  await test('same_recipients_refused', async () => {
    await assert.rejects(
      exportBackup(
        dump,
        manifest,
        expected,
        { ...recipients, keyrings: recipients.database },
        tools,
      ),
    );
  });
  for (const name of backupFiles) {
    await test('missing_' + name, async () => {
      const files = { ...sealed.files };
      delete files[name];
      await assert.rejects(authenticateBackup(files, sealed.receipt, identities, expected, tools));
    });
    await test('truncated_' + name, async () => {
      const files = { ...sealed.files, [name]: sealed.files[name].subarray(0, -1) };
      const receipt = structuredClone(sealed.receipt);
      receipt.files[name] = { bytes: files[name].length, sha256: sha256(files[name]) };
      await assert.rejects(authenticateBackup(files, receipt, identities, expected, tools), {
        message: 'backup_authentication_failed',
      });
    });
  }
  await test('wrong_identities', async () => {
    await assert.rejects(
      authenticateBackup(
        sealed.files,
        sealed.receipt,
        { database: identities.keyrings, keyrings: identities.database },
        expected,
        tools,
      ),
    );
  });
  await test('snapshot_receipt_mismatch', async () => {
    const changed = structuredClone(sealed.receipt);
    changed.backupId = randomUUID();
    await assert.rejects(authenticateBackup(sealed.files, changed, identities, expected, tools));
  });
  await test('mixed_encrypted_pair', async () => {
    const changed = structuredClone(manifest);
    changed.backupId = randomUUID();
    const other = await exportBackup(dump, changed, expected, recipients, tools);
    await assert.rejects(
      authenticateBackup(
        { ...sealed.files, 'keyrings.json.age': other.files['keyrings.json.age'] },
        sealed.receipt,
        identities,
        expected,
        tools,
      ),
    );
  });
  for (const field of ['student_scores', 'students']) {
    await test('restored_data_change_' + field, async () => {
      const changed = structuredClone(state);
      changed.tables[field].pop();
      await assert.rejects(verifyRestored(manifest, expected, changed));
    });
  }
  await test('restored_acl_change', async () => {
    const changed = structuredClone(state);
    changed.security.objects[0].acl = ['PUBLIC=r/owner'];
    await assert.rejects(verifyRestored(manifest, expected, changed));
  });
  await test('wrong_crypto_same_inventory', async () => {
    const changed = structuredClone(manifest);
    changed.settings.identity.keys['1'] = randomBytes(32).toString('base64url');
    const reviewed = structuredClone(expected);
    reviewed.keyInventory.identity.sha256 = sha256(
      Buffer.from(canonical(changed.settings.identity)),
    );
    await assert.rejects(verifyRestored(changed, reviewed, state), {
      message: 'backup_restore_verification_failed',
    });
  });
  await test('bounds', async () => {
    assert.throws(() => inspectArchive(Buffer.alloc(limits.archive + 1), tools));
    const changed = structuredClone(state);
    changed.tables.students[0].extra = 'x'.repeat(limits.json);
    assert.throws(() => inventory(changed));
  });
  const files = {};
  for (const [name, value] of Object.entries({
    expected,
    metadata: Object.fromEntries(
      Object.entries(manifest).filter(
        ([key]) => !['settings', 'required', 'inventory', 'dumpSha256'].includes(key),
      ),
    ),
    keyrings: settings,
    state,
    receipt: sealed.receipt,
    manifest,
  })) {
    files[name] = path.join(directory, name + '.json');
    await writeFile(files[name], JSON.stringify(value), { mode: 0o600 });
  }
  files.dump = path.join(directory, 'source.dump');
  await writeFile(files.dump, dump);
  const control = {
    expectedFile: files.expected,
    metadataFile: files.metadata,
    keyringsFile: files.keyrings,
    stateFile: files.state,
    dumpFile: files.dump,
    recipients,
    tools,
    outputDirectory: path.join(directory, 'candidate'),
  };
  await test('cli_export_exclusive', async () => {
    await cli('export', control);
    await cli('export', control, false);
    assert.equal((await readdir(control.outputDirectory)).length, 3);
  });
  const cipherDirectory = path.join(directory, 'ciphertexts');
  await mkdir(cipherDirectory);
  for (const name of backupFiles)
    await writeFile(path.join(cipherDirectory, name), sealed.files[name]);
  const authControl = {
    expectedFile: files.expected,
    ciphertextDirectory: cipherDirectory,
    receiptFile: files.receipt,
    identities,
    tools,
    outputDirectory: path.join(directory, 'opened'),
  };
  await test('cli_authenticate_open_verify', async () => {
    await cli('authenticate', authControl);
    await cli('open', authControl);
    await cli('verify-restored', {
      expectedFile: files.expected,
      manifestFile: path.join(authControl.outputDirectory, 'manifest.private.json'),
      stateFile: files.state,
      outputDirectory: path.join(directory, 'verification'),
    });
  });
  await test('cli_fail_closed', async () => {
    await cli(
      'open',
      {
        ...authControl,
        identities: { ...identities, database: identities.keyrings },
        outputDirectory: path.join(directory, 'must-not-exist'),
      },
      false,
    );
    await assert.rejects(readdir(path.join(directory, 'must-not-exist')));
    await cli(
      'export',
      { ...control, outputDirectory: path.resolve('tests/local/g07-3/not-allowed') },
      false,
    );
  });
  await test('cli_metadata_cannot_override_generated_fields', async () => {
    const badMetadata = path.join(directory, 'bad-metadata.json');
    const metadata = JSON.parse(await readFile(files.metadata, 'utf8'));
    metadata.settings = { secret: 'PRIVATE_SECRET_SENTINEL' };
    await writeFile(badMetadata, JSON.stringify(metadata), { mode: 0o600 });
    await cli(
      'export',
      {
        ...control,
        metadataFile: badMetadata,
        outputDirectory: path.join(directory, 'no-metadata-output'),
      },
      false,
    );
    await assert.rejects(readdir(path.join(directory, 'no-metadata-output')));
  });
  authenticated.dump.fill(0);
  dump.fill(0);
  console.log(
    `PASS G07-3: ${cases} finite cases; actual age/native PG17 TOC/source snapshot; no restore, hosted or Drive operations`,
  );
} catch (error) {
  const category = /^fixture_command_(EPERM|ENOENT|ETIMEDOUT|exit_[0-9]+)$/.test(error.message)
    ? error.message
    : 'assertion_or_contract';
  console.error(
    'FAIL G07-3 at ' + stage + ': ' + category + '; sensitive diagnostics suppressed; STOP',
  );
  process.exitCode = 1;
} finally {
  holder?.kill();
  if (started) {
    try {
      command(path.join(pgBin, 'pg_ctl.exe'), [
        '-D',
        path.join(directory, 'pgdata'),
        '-m',
        'immediate',
        '-w',
        '-t',
        '10',
        'stop',
      ]);
    } catch {
      console.error('FAIL G07-3 cleanup; inspect private fixture staging');
      process.exitCode = 1;
    }
  }
  // This is a known mkdtemp path under the OS temp root, never an owner backup or checkout path.
  try {
    assert(
      path.isAbsolute(directory) &&
        path.dirname(directory) === path.resolve(tmpdir()) &&
        path.basename(directory).startsWith('gb-production-synthetic-'),
    );
    await rm(directory, { recursive: true, force: true });
    console.log('PASS G07-3 synthetic staging cleanup');
  } catch {
    console.error('FAIL G07-3 staging cleanup; keep private and stop');
    process.exitCode = 1;
  }
}
