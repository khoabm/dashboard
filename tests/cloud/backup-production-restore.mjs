/** Executes one synthetic gb-recovery-v1 PG17 restore on disposable Actions runner only. */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { PGlite, connect } from './native-adapter.mjs';
import { createCrypto } from '../../supabase/functions/_shared/crypto.js';
import { syntheticProject, backupFiles, sha256 } from '../../scripts/gradebook-backup.mjs';
import {
  canonical,
  inventory,
  exportBackup,
  authenticateBackup,
  verifyRestored,
} from '../../scripts/gradebook-backup-production.mjs';

import { safeDiagnostic, childDiagnostics } from '../../scripts/gradebook-recovery-diagnostics.mjs';
let currentStage = 'start';
/** Emits a fixed stage identifier, without fixture values. */
function stage(value) {
  currentStage = value;
  console.log(`GB_STAGE ${value}`);
}

globalThis.fetch = () => Promise.reject(new Error('network_forbidden'));
const mode = process.argv[2] || 'create';
const source = 'gbqa_g074_source';
const target = 'gbqa_g074_restored';
const purposes = ['identity', 'lookup', 'capability', 'preview'];
assert.equal(process.env.GB_QA_DATABASE, source);

/** Captures subprocess output without allowing raw SQL errors, identities or row payloads into logs.
 * @param {string} executable - The trusted local executable.
 * @param {string[]} args - Fixed subprocess arguments.
 * @param {Buffer|string} [input] - Stdin bytes, never a command-line credential.
 * @returns {Buffer} Complete bounded stdout after a successful exit.
 */
function command(executable, args, input) {
  try {
    return execFileSync(executable, args, {
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    const safe = childDiagnostics(String(error.stdout || '') + '\n' + String(error.stderr || ''));
    if (safe) console.error(safe);
    throw error;
  }
}

/** Captures source/target state entirely inside a read-only transaction, without logging rows. */
async function readState(db) {
  const sql = await readFile('scripts/gradebook-backup-snapshot.sql', 'utf8');
  const query = sql.slice(sql.indexOf('SELECT jsonb_build_object(')).trim();
  assert(query.startsWith('SELECT jsonb_build_object('));
  for (const setting of [
    "timezone='UTC'",
    "datestyle='ISO, YMD'",
    "statement_timeout='15s'",
    "lock_timeout='3s'",
  ])
    await db.query('SET LOCAL ' + setting);
  const response = await db.query(query);
  assert.equal(response.rows.length, 1);
  const state = response.rows[0].jsonb_build_object;
  inventory(state);
  return state;
}

/** Starts an exported snapshot, reads the source metadata and dumps the same snapshot. */
async function captureSource(db) {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  let dump;
  try {
    const snapshot = (await db.query('SELECT pg_export_snapshot() id')).rows[0].id;
    const state = await readState(db);
    dump = command('docker', [
      'exec',
      'gb-backup-postgres',
      'pg_dump',
      '-U',
      'postgres',
      '--format=custom',
      '--snapshot=' + snapshot,
      '--dbname',
      source,
    ]);
    await db.query('COMMIT');
    return { snapshot, state, dump };
  } catch {
    dump?.fill(0);
    await db.query('ROLLBACK').catch(() => {});
    throw new Error('source_snapshot_failed');
  }
}

/** Extracts a new state from the restored target, never from source memory. */
async function extractRestored(db) {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const state = await readState(db);
    await db.query('COMMIT');
    return state;
  } catch {
    await db.query('ROLLBACK').catch(() => {});
    throw new Error('target_extract_failed');
  }
}

/** Checks the manifest's migration hashes against the exact checkout before executing restored SQL.
 * @returns {Promise<object>} Reviewed migration paths and SHA-256 digests.
 */
async function migrations() {
  const result = {};
  for (const name of (await readdir('supabase/migrations')).sort())
    result[name] = sha256(await readFile(`supabase/migrations/${name}`));
  return result;
}

/** Reads only a small controller message, never raw keyrings, from the parent process.
 * @returns {Promise<object>} Encrypted file paths, independent credential paths and checksums.
 */
async function controlInput() {
  let text = '';
  for await (const part of process.stdin) {
    text += part;
    assert(text.length < 65536);
  }
  return JSON.parse(text);
}

/** Restores only after full age authentication, then checks actual runtime crypto and role denial.
 * @param {object} input - Paths and trusted digests from the synthetic controller.
 * @returns {Promise<void>} Completes only when every restored-data and permission assertion passes.
 */
async function restore(input) {
  const files = Object.fromEntries(
    await Promise.all(
      Object.entries(input.files).map(async ([name, file]) => [name, await readFile(file)]),
    ),
  );
  stage('decrypt');
  const { dump, manifest } = await authenticateBackup(
    files,
    input.receipt,
    input.identities,
    input.expected,
    input.tools,
  );
  assert.equal(canonical(manifest.migrations), canonical(input.expected.migrations));
  assert.equal(manifest.sourceCommit, command('git', ['rev-parse', 'HEAD']).toString().trim());
  const admin = await connect('postgres');
  try {
    // The target is a fixed, nonexistent QA database; no clean/drop/overwrite mode exists.
    stage('fresh_target');
    await admin.query(`CREATE DATABASE ${target} TEMPLATE template0`);
  } finally {
    await admin.end();
  }
  stage('restore');
  try {
    command(
      'docker',
      [
        'exec',
        '-i',
        'gb-backup-postgres',
        'pg_restore',
        '-U',
        'postgres',
        '--exit-on-error',
        '--single-transaction',
        '--dbname',
        target,
      ],
      dump,
    );
  } finally {
    dump.fill(0);
  }
  const db = await connect(target);
  try {
    stage('metadata');
    const restoredState = await extractRestored(db);
    stage('metadata_objects');
    const checked = await verifyRestored(manifest, input.expected, restoredState);
    assert.equal(checked.dataVerification, 'RESTORED_DATA_CRYPTO_VERIFIED');
    assert.equal(checked.permissionVerification, 'NOT_RUN');
    stage('data');
    const { cid, actor, session, time, binding, capability, preview } = input.probe;
    const cryptography = await createCrypto(syntheticProject, manifest.settings);
    const rows = (
      await db.query(`SELECT id::text,class_id::text AS "classId",
      encode(identity_ciphertext,'hex') ciphertext,encode(identity_nonce,'hex') nonce,
      identity_enc_kid AS "encKid",identity_alg_version AS "algVersion",
      encode(identity_lookup,'hex') AS "identityLookup",lookup_key_version AS "lookupKeyVersion"
      FROM gradebook.students ORDER BY id`)
    ).rows;
    assert.equal(rows.length, 2);
    for (let i = 0; i < rows.length; i++) {
      const digits = i === 0 ? '000000000009' : '000000000010';
      assert.equal(await cryptography.reveal(rows[i], cid), digits);
      assert.equal(await cryptography.lookup(cid, 1, digits), rows[i].identityLookup);
      assert.equal(rows[i].encKid, String(i + 1));
    }
    const scores = (await db.query('SELECT score::text score FROM gradebook.student_scores')).rows;
    assert.equal(scores.length, 1);
    assert.equal(scores[0].score, '8.12345');
    assert.equal((await cryptography.capability(capability, time)).studentId, rows[0].id);
    await cryptography.preview(preview, binding, 'synthetic-input', time);
    await assert.rejects(cryptography.capability(capability, time + 601));
    await assert.rejects(cryptography.preview(preview, binding, 'synthetic-input', time + 301));
    assert.equal((await cryptography.encryptIdentity(cid, 1, '000000000009')).encKid, '2');
    assert.equal(await cryptography.lookup(cid, 2, '000000000009'), input.probe.lookup2);
    stage('versions');
    for (const purpose of purposes) {
      const missing = structuredClone(manifest.settings);
      delete missing[purpose].keys['1'];
      const incomplete = await createCrypto(syntheticProject, missing);
      const operation = {
        identity: () => incomplete.reveal(rows[0], cid),
        lookup: () => incomplete.lookup(cid, 1, '000000000009'),
        capability: () => incomplete.capability(capability, time),
        preview: () => incomplete.preview(preview, binding, 'synthetic-input', time),
      }[purpose];
      await assert.rejects(operation());
    }
    stage('permissions');
    for (const role of ['anon', 'authenticated']) {
      await db.query(`SET ROLE ${role}`);
      try {
        for (const sql of [
          'SELECT * FROM gradebook.students',
          'DELETE FROM gradebook.student_scores WHERE false',
          'SELECT public.gb_class_read($1,$2,$3)',
        ]) {
          const args = sql.includes('$1') ? [actor, session, cid] : [];
          await assert.rejects(db.query(sql, args), (error) => error.code === '42501');
        }
      } finally {
        await db.query('RESET ROLE');
      }
    }
    await db.query('SET ROLE service_role');
    try {
      assert.equal((await db.query('SELECT count(*)::int n FROM gradebook.students')).rows[0].n, 2);
      await db.query('SELECT public.gb_class_read($1,$2,$3)', [actor, session, cid]);
    } finally {
      await db.query('RESET ROLE');
    }
    stage('catalogs');
    const context = (await db.query('SELECT public.gb_lookup_context() value')).rows[0].value;
    assert.equal(context.subjects.length, 8);
    assert.equal(context.scoreColumns.length, 7);
  } finally {
    await db.end();
  }
}

let directory;
let db;
try {
  if (mode === '--restore') {
    await restore(await controlInput());
    console.log('PASS G07-4 gb-recovery-v1 age auth, PG17 target restore, crypto, ACL/RLS, roles');
  } else {
    assert.equal(mode, 'create');
    stage('credentials');
    directory = await mkdtemp(path.join(process.env.RUNNER_TEMP, 'gb-backup-'));
    const credentials = path.join(directory, 'credentials');
    const encrypted = path.join(directory, 'encrypted');
    await mkdir(credentials, { mode: 0o700 });
    await mkdir(encrypted, { mode: 0o700 });
    const identities = {},
      recipients = {};
    for (const purpose of ['database', 'keyrings']) {
      identities[purpose] = path.join(credentials, purpose);
      const raw = command('age-keygen', []);
      await writeFile(identities[purpose], raw, { mode: 0o600, flag: 'wx' });
      raw.fill(0);
      recipients[purpose] = command('age-keygen', ['-y', identities[purpose]]).toString().trim();
    }
    stage('bootstrap');
    db = new PGlite();
    await db.exec(await readFile('tests/gradebook/b2-bootstrap.sql', 'utf8'));
    stage('migrations');
    const migrationHashes = await migrations();
    await db.query('CREATE SCHEMA supabase_migrations');
    await db.query('CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY)');
    for (const name of Object.keys(migrationHashes)) {
      await db.exec(await readFile('supabase/migrations/' + name, 'utf8'));
      await db.query('INSERT INTO supabase_migrations.schema_migrations VALUES ($1)', [
        name.slice(0, 14),
      ]);
    }
    const applied = (
      await db.query('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version')
    ).rows.map((row) => row.version);
    assert.deepEqual(
      applied,
      Object.keys(migrationHashes)
        .map((file) => file.slice(0, 14))
        .sort(),
    );
    stage('fixtures');
    const actor = '10000000-0000-4000-8000-000000000001';
    const session = '20000000-0000-4000-8000-000000000001';
    await db.query('INSERT INTO auth.users VALUES($1)', [actor]);
    await db.query('INSERT INTO public.admin_profiles(user_id) VALUES($1)', [actor]);
    await db.query('INSERT INTO auth.sessions VALUES($1,$2,NULL)', [session, actor]);
    const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
    const cid = (
      await scalar('SELECT public.gb_class_create($1,$2,$3,$4)', [
        actor,
        session,
        'Synthetic recovery',
        '2026',
      ])
    ).id;
    const settings = Object.fromEntries(
      purposes.map((purpose) => [
        purpose,
        {
          active: '1',
          keys: { 1: randomBytes(32).toString('base64url') },
        },
      ]),
    );
    const oldCrypto = await createCrypto(syntheticProject, settings);
    const oldEnvelope = await oldCrypto.encryptIdentity(cid, 1, '000000000009');
    const student = await scalar('SELECT public.gb_student_create($1,$2,$3,$4)', [
      actor,
      session,
      cid,
      JSON.stringify({ ...oldEnvelope, birthDate: '2012-04-12' }),
    ]);
    await db.query(
      "SELECT public.gb_score_put($1,$2,$3,$4,1::smallint,'math','continuous_1',NULL,$5)",
      [actor, session, cid, student.id, '"8.12345"'],
    );
    const time = Math.floor(Date.now() / 1000);
    const binding = { actor, session, classId: cid, kind: 'roster', semester: null };
    const capability = await oldCrypto.issueCapability(
      { classId: cid, studentId: student.id, classEpoch: '1', studentEpoch: '1' },
      time,
    );
    const preview = await oldCrypto.issuePreview(binding, 'synthetic-input', '0'.repeat(64), time);
    for (const ring of Object.values(settings)) {
      ring.keys['2'] = randomBytes(32).toString('base64url');
      ring.active = '2';
    }
    stage('rotation');
    const currentCrypto = await createCrypto(syntheticProject, settings);
    const currentEnvelope = await currentCrypto.encryptIdentity(cid, 1, '000000000010');
    await db.query('SELECT public.gb_student_create($1,$2,$3,$4)', [
      actor,
      session,
      cid,
      JSON.stringify({ ...currentEnvelope, birthDate: '2012-04-13' }),
    ]);
    stage('dump');
    const { snapshot, state, dump } = await captureSource(db);
    const migrationList = Object.entries(migrationHashes).map(([file, hash]) => ({
      ledgerVersion: file.slice(0, 14),
      file,
      sha256: hash,
    }));
    assert.deepEqual(migrationList.map((m) => m.ledgerVersion).sort(), applied);
    const expected = {
      project: syntheticProject,
      sourceCommit: command('git', ['rev-parse', 'HEAD']).toString().trim(),
      migrations: migrationList,
      keyInventory: Object.fromEntries(
        purposes.map((purpose) => [
          purpose,
          {
            active: settings[purpose].active,
            kids: Object.keys(settings[purpose].keys).sort(),
            sha256: sha256(Buffer.from(canonical(settings[purpose]))),
          },
        ]),
      ),
    };
    const manifest = {
      format: 'gb-recovery-v1',
      backupId: randomUUID(),
      createdAt: new Date().toISOString(),
      project: syntheticProject,
      sourceCommit: expected.sourceCommit,
      postgresMajor: 17,
      migrations: migrationList,
      snapshot: {
        id: snapshot,
        method: 'pg_export_snapshot',
        keysFrozen: true,
        evidenceId: randomUUID(),
      },
      dumpSha256: sha256(dump),
      settings,
      required: Object.fromEntries(purposes.map((p) => [p, Object.keys(settings[p].keys).sort()])),
      inventory: inventory(state),
    };
    stage('seal');
    await verifyRestored(manifest, expected, state);
    const tools = { age: process.env.GB_TEST_AGE, pgRestore: process.env.GB_TEST_PG_RESTORE };
    stage('invalid_archive');
    const sealed = await exportBackup(dump, manifest, expected, recipients, tools);
    dump.fill(0);
    assert.deepEqual(Object.keys(sealed.files).sort(), [...backupFiles].sort());
    assert.equal(sealed.receipt.verification, 'CANDIDATE_UNVERIFIED');
    const files = {};
    for (const [name, bytes] of Object.entries(sealed.files)) {
      files[name] = path.join(encrypted, name);
      await writeFile(files[name], bytes, { mode: 0o600, flag: 'wx' });
      for (const ring of Object.values(settings))
        for (const key of Object.values(ring.keys)) assert(!bytes.includes(Buffer.from(key)));
    }
    const input = {
      files,
      identities,
      receipt: sealed.receipt,
      expected,
      tools,
      probe: {
        cid,
        actor,
        session,
        time,
        binding,
        capability: capability.token,
        preview: preview.token,
        lookup2: await currentCrypto.lookup(cid, 2, '000000000009'),
      },
    };

    stage('remove_source');
    await db.close();
    db = undefined;
    const admin = await connect('postgres');
    try {
      await admin.query(`DROP DATABASE ${source}`);
    } finally {
      await admin.end();
    }
    stage('child');
    const output = command(
      process.execPath,
      ['tests/cloud/backup-production-restore.mjs', '--restore'],
      JSON.stringify(input),
    );
    assert.match(
      output.toString(),
      /^PASS G07-4 gb-recovery-v1 age auth, PG17 target restore, crypto, ACL\/RLS, roles/m,
    );
    for (const ring of Object.values(settings))
      for (const key of Object.values(ring.keys)) assert(!output.includes(Buffer.from(key)));
    console.log(
      'PASS G07-4 new-format age encryption/authentication, actual target PG17 restore; hosted requests 0',
    );
    console.log(
      'PASS G07-4 removed source DB; fresh child process restored only from ciphertexts + identities',
    );
    console.log(output.toString().trim());
    console.log(
      'PASS G07-4 no raw key/dump output; managed recovery and independent owner custody NOT RUN',
    );
  }
} catch (error) {
  console.error(safeDiagnostic(currentStage, error));
  console.error('FAIL G07-4 synthetic recovery; sensitive diagnostics suppressed');
  process.exitCode = 1;
} finally {
  if (db) await db.close().catch(() => {});
  if (directory) await rm(directory, { recursive: true, force: true });
}
