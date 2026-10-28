import { safeDiagnostic, childDiagnostics } from '../scripts/gradebook-recovery-diagnostics.mjs';
/** Exercises real age offline, bounded failure cases and the upload dry-run; prints safe summaries only. */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  syntheticProject,
  sealBackup,
  openBackup,
  planTransfer,
  sha256,
} from '../scripts/gradebook-backup.mjs';

const directory = await mkdtemp(path.join(tmpdir(), 'gb-age-offline-'));
let cases = 0;
try {
  const poison = 'PRIVATE_SECRET_SENTINEL';
  assert.equal(
    safeDiagnostic(poison, { code: poison, message: poison, stack: poison, stderr: poison }),
    'GB_FAIL start unexpected',
  );
  assert.equal(
    childDiagnostics(poison + '\nGB_FAIL restore assertion\nGB_FAIL restore ' + poison),
    'GB_FAIL restore assertion',
  );
  cases += 2;
  const identities = {},
    recipients = {};
  for (const purpose of ['database', 'keyrings']) {
    const identity = path.join(directory, purpose);
    const key = execFileSync(process.env.GB_AGE_KEYGEN_BIN || 'age-keygen', [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    });
    await writeFile(identity, key, { mode: 0o600, flag: 'wx' });
    key.fill(0);
    identities[purpose] = identity;
    recipients[purpose] = execFileSync(
      process.env.GB_AGE_KEYGEN_BIN || 'age-keygen',
      ['-y', identity],
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000 },
    )
      .toString()
      .trim();
  }
  // This fixture checks the archive boundary only; actual PG17 dump/restore is a separate cloud gate.
  const dump = Buffer.concat([Buffer.from('PGDMP'), randomBytes(256)]);
  const purposes = ['identity', 'lookup', 'capability', 'preview'];
  const manifest = {
    format: 'gb-synthetic-recovery-v1',
    synthetic: true,
    project: syntheticProject,
    backupId: randomUUID(),
    sourceCommit: '0'.repeat(40),
    postgresMajor: 17,
    dumpSha256: sha256(dump),
    migrations: { 'synthetic-only.sql': sha256(Buffer.from('fixture')) },
    settings: Object.fromEntries(
      purposes.map((purpose) => [
        purpose,
        {
          active: '2',
          keys: {
            1: randomBytes(32).toString('base64url'),
            2: randomBytes(32).toString('base64url'),
          },
        },
      ]),
    ),
    required: Object.fromEntries(purposes.map((purpose) => [purpose, ['1', '2']])),
  };
  const sealed = await sealBackup(dump, manifest, recipients);
  const opened = await openBackup(sealed.files, identities, sealed.expected);
  assert(opened.dump.equals(dump));
  assert.equal(JSON.stringify(opened.manifest), JSON.stringify(manifest));
  cases++;
  const plan = planTransfer(sealed.files, sealed.expected, 1024 * 1024);
  assert.equal(plan.length, 2);
  assert(plan.every((item) => item.bytes > 0 && /^[a-f0-9]{64}$/.test(item.sha256)));
  for (const bytes of Object.values(sealed.files)) {
    for (const ring of Object.values(manifest.settings)) {
      for (const key of Object.values(ring.keys)) assert(!bytes.includes(Buffer.from(key)));
    }
    assert(!bytes.includes(Buffer.from('AGE-SECRET-KEY-')));
  }
  cases++;
  for (const bad of [
    { ...identities, database: identities.keyrings },
    { ...identities, keyrings: identities.database },
    { ...identities, keyrings: path.join(directory, 'absent') },
  ]) {
    await assert.rejects(
      openBackup(sealed.files, bad, sealed.expected),
      /^Error: recovery_failed$/,
    );
    cases++;
  }
  const changed = {
    ...sealed.files,
    'database.dump.age': Buffer.from(sealed.files['database.dump.age']),
  };
  changed['database.dump.age'][changed['database.dump.age'].length - 1] ^= 1;
  await assert.rejects(
    openBackup(changed, identities, sealed.expected),
    /^Error: recovery_failed$/,
  );
  cases++;
  // Recomputed outer hashes must not bypass age authentication or final dump binding.
  for (const name of Object.keys(sealed.files)) {
    const files = { ...sealed.files, [name]: sealed.files[name].subarray(0, -1) };
    const expected = { ...sealed.expected, [name]: sha256(files[name]) };
    await assert.rejects(openBackup(files, identities, expected), /^Error: recovery_failed$/);
    cases++;
  }
  const secondDump = Buffer.concat([Buffer.from('PGDMP'), randomBytes(256)]);
  const second = await sealBackup(
    secondDump,
    { ...manifest, backupId: randomUUID(), dumpSha256: sha256(secondDump) },
    recipients,
  );
  await assert.rejects(
    openBackup(
      { ...sealed.files, 'database.dump.age': second.files['database.dump.age'] },
      identities,
      { ...sealed.expected, 'database.dump.age': second.expected['database.dump.age'] },
    ),
    /^Error: recovery_failed$/,
  );
  cases++;
  for (const purpose of purposes) {
    const missing = structuredClone(manifest);
    delete missing.settings[purpose].keys['1'];
    await assert.rejects(sealBackup(dump, missing, recipients));
    cases++;
  }
  for (const update of [{ project: 'differentproject' }, { synthetic: false }]) {
    await assert.rejects(sealBackup(dump, { ...manifest, ...update }, recipients));
    cases++;
  }
  const reused = structuredClone(manifest);
  reused.settings.lookup.keys['1'] = reused.settings.identity.keys['1'];
  await assert.rejects(sealBackup(dump, reused, recipients));
  cases++;
  for (const [files, budget] of [
    [sealed.files, 0],
    [{ ...sealed.files, 'plaintext.json': Buffer.from('{}') }, 1024 * 1024],
    [{ ...sealed.files, 'keyrings.json.age': Buffer.from(JSON.stringify(manifest)) }, 1024 * 1024],
  ]) {
    assert.throws(() => planTransfer(files, sealed.expected, budget));
    cases++;
  }
  console.log(
    `PASS G07 age offline: ${cases} finite cases; upload dry-run only; network requests 0`,
  );
} catch {
  console.error('FAIL G07 age offline; sensitive diagnostics suppressed');
  process.exitCode = 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
