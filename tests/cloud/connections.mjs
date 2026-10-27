/** Verifies finite native connection barriers and synthetic recovery only inside the Actions runner. */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomBytes, webcrypto } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PGlite, connect } from './native-adapter.mjs';
import { createCrypto } from '../../supabase/functions/_shared/crypto.js';
import { createHandler } from '../../supabase/functions/_shared/handler.js';
import { rpcFailure } from '../../supabase/functions/_shared/http.js';

const db = new PGlite();
const peers = [];
const actor = '10000000-0000-4000-8000-000000000001';
const session = '20000000-0000-4000-8000-000000000001';
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const settings = Object.fromEntries(
  ['identity', 'lookup', 'capability', 'preview'].map((purpose) => [
    purpose,
    { active: '1', keys: { 1: randomBytes(32).toString('base64url') } },
  ]),
);
const cryptography = await createCrypto('syntheticprojectref01', settings);

/** Observes a real waiting backend, bounded to one second; never retries a business operation. */
async function blocked(pid) {
  for (let i = 0; i < 20; i++) {
    if (await scalar('SELECT cardinality(pg_blocking_pids($1))>0', [pid])) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw Error('Independent connection did not reach lock barrier');
}

/** Attaches rejection immediately so a deliberate SQL failure cannot become unhandled. */
const settled = (promise) =>
  promise.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );

try {
  await db.exec(await readFile('tests/gradebook/b2-bootstrap.sql', 'utf8'));
  for (const file of (await readdir('supabase/migrations')).sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  }
  await db.query('INSERT INTO auth.users VALUES($1)', [actor]);
  await db.query('INSERT INTO public.admin_profiles(user_id) VALUES($1)', [actor]);
  await db.query('INSERT INTO auth.sessions VALUES($1,$2,NULL)', [session, actor]);
  const cid = (
    await scalar('SELECT public.gb_class_create($1,$2,$3,$4)', [
      actor,
      session,
      'Synthetic cloud',
      '2026',
    ])
  ).id;
  const envelope = await cryptography.encryptIdentity(cid, 1, '000000000009');
  const student = await scalar('SELECT public.gb_student_create($1,$2,$3,$4)', [
    actor,
    session,
    cid,
    JSON.stringify({ ...envelope, birthDate: '2012-04-12' }),
  ]);
  const args = [actor, session, cid, student.id];
  const put = "SELECT public.gb_score_put($1,$2,$3,$4,1::smallint,'math','continuous_1',$5,$6)";
  await db.query(put, [...args, null, '"8.12345"']);
  const a = await connect(),
    b = await connect();
  peers.push(a, b);
  const pidB = (await b.query('SELECT pg_backend_pid() pid')).rows[0].pid;

  await a.query('BEGIN');
  await a.query(put, [...args, '1', '"8.24"']);
  let pending = settled(b.query(put, [...args, '1', '"9"']));
  await blocked(pidB);
  await a.query('COMMIT');
  assert.equal((await pending).error?.code, 'PT409');
  assert.equal(await scalar('SELECT score::text FROM gradebook.student_scores'), '8.24');
  console.log('PASS G05 two independent writers: one commit, stale loser PT409');

  const headers = JSON.stringify(Array(10).fill('custom'));
  const rows = JSON.stringify([
    {
      row: 2,
      lookup: envelope.lookup,
      lookupKeyVersion: 1,
      birthDate: '2012-04-12',
      subjectName: 'Toán',
      scores: ['9', null, null, null, null, null, null],
    },
  ]);
  const preview = await scalar('SELECT public.gb_scores_preview($1,$2,$3,1::smallint,$4,$5)', [
    actor,
    session,
    cid,
    headers,
    rows,
  ]);
  const apply = 'SELECT public.gb_scores_apply($1,$2,$3,1::smallint,$4,$5,$6)';
  const applyArgs = [actor, session, cid, headers, rows, preview.internalStateHash];
  await a.query('BEGIN');
  await a.query(put, [...args, '2', '"8.25"']);
  pending = settled(b.query(apply, applyArgs));
  await blocked(pidB);
  await a.query('COMMIT');
  assert.equal((await pending).error?.code, 'PT409');
  assert.equal(await scalar('SELECT score::text FROM gradebook.student_scores'), '8.25');
  console.log('PASS G05 preview/apply versus committed score change: zero stale overwrite');

  const revision = await scalar('SELECT revision::text FROM gradebook.classes');
  await a.query('BEGIN');
  await a.query('SELECT public.gb_semester_set($1,$2,$3,1::smallint,true,$4,true,true)', [
    actor,
    session,
    cid,
    revision,
  ]);
  pending = settled(b.query(apply, applyArgs));
  await blocked(pidB);
  await a.query('COMMIT');
  assert.equal((await pending).error?.code, '22023');
  assert.equal(await scalar('SELECT score::text FROM gradebook.student_scores'), '8.25');
  console.log('PASS G05 publication wins lock: concurrent import rejected without partial write');

  await a.query('BEGIN');
  await a.query('SELECT id FROM gradebook.classes WHERE id=$1 FOR UPDATE', [cid]);
  pending = settled(
    b.query('SELECT public.gb_class_patch($1,$2,$3,$4,$5,$6)', [
      actor,
      session,
      cid,
      String(Number(revision) + 1),
      'MUST NOT SAVE',
      '2026',
    ]),
  );
  await blocked(pidB);
  await db.query('DELETE FROM auth.sessions WHERE id=$1', [session]);
  await a.query('COMMIT');
  assert.equal((await pending).error?.code, '42501');
  assert.equal(await scalar('SELECT name FROM gradebook.classes'), 'Synthetic cloud');
  console.log('PASS G05 revoked session observed after class lock: no metadata write');

  await db.query(
    "INSERT INTO gradebook.lookup_attempts(scope,key,window_start,attempts,expires_at) VALUES('pair_identity_window',decode($1,'hex'),to_timestamp(floor(extract(epoch FROM statement_timestamp())/900)*900),4,statement_timestamp()+interval '45 minutes')",
    [envelope.lookup],
  );
  const limits = await Promise.all([
    a.query('SELECT public.gb_limit(false,$1) result', [envelope.lookup]),
    b.query('SELECT public.gb_limit(false,$1) result', [envelope.lookup]),
  ]);
  assert.deepEqual(limits.map((r) => r.rows[0].result.allowed).sort(), [false, true]);
  assert.equal(
    await scalar(
      "SELECT attempts FROM gradebook.lookup_attempts WHERE scope='pair_identity_window'",
    ),
    6,
  );
  console.log('PASS G03 concurrent last-slot limiter decisions and committed denial counter');

  // A closed native connection is an actual database transport fault, not a successful fake backend.
  const failed = await connect();
  await failed.end();
  let sensitiveRead = false;
  const handler = createHandler('student', {
    config: { origins: ['http://localhost:4173'] },
    cryptography,
    backendFactory: () => ({
      async rpc(name, values) {
        if (name === 'gb_lookup_context') return scalar('SELECT public.gb_lookup_context()');
        if (name !== 'gb_limit') sensitiveRead = true;
        try {
          return (await failed.query('SELECT public.gb_limit(false,NULL)')).rows[0];
        } catch (error) {
          throw rpcFailure(error, true);
        }
      },
    }),
  });
  const response = await handler(
    new Request('http://localhost/lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        op: 'verify',
        documentNumber: '000000000009',
        birthDate: '2012-04-12',
      }),
    }),
  );
  assert.equal(response.status, 503);
  assert.equal(sensitiveRead, false);
  console.log('PASS G03 real closed-DB limiter fault:503 and no pair read');

  // Restore a complete synthetic DB and an OS-neutral encrypted key export in a fresh process.
  const dump = execFileSync('docker', [
    'exec',
    'gb-postgres',
    'pg_dump',
    '-U',
    'postgres',
    '-d',
    process.env.GB_QA_DATABASE,
    '--no-owner',
    '--no-privileges',
  ]);
  const admin = await connect('postgres');
  await admin.query('CREATE DATABASE gbqa_recovery');
  await admin.end();
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'gb-postgres',
      'psql',
      '-U',
      'postgres',
      '-d',
      'gbqa_recovery',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: dump, stdio: ['pipe', 'ignore', 'pipe'] },
  );
  const raw = randomBytes(32),
    iv = randomBytes(12);
  const time = Math.floor(Date.now() / 1000);
  const claims = { classId: cid, studentId: student.id, classEpoch: '1', studentEpoch: '1' };
  const binding = { actor, session, classId: cid, kind: 'roster', semester: null };
  const capability = await cryptography.issueCapability(claims, time);
  const signedPreview = await cryptography.issuePreview(
    binding,
    'synthetic-input',
    '0'.repeat(64),
    time,
  );
  // Simulates retained generation 1 and new active generation 2 without touching any deployed key.
  for (const ring of Object.values(settings)) {
    ring.keys['2'] = randomBytes(32).toString('base64url');
    ring.active = '2';
  }
  const wrapping = await webcrypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const encrypted = Buffer.from(
    await webcrypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      wrapping,
      Buffer.from(JSON.stringify(settings)),
    ),
  );
  execFileSync(process.execPath, ['tests/cloud/recover.mjs'], {
    input: JSON.stringify({
      wrapped: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      wrapping: raw.toString('base64'),
      cid,
      sid: student.id,
      time,
      capability: capability.token,
      signedPreview: signedPreview.token,
      binding,
    }),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  raw.fill(0);
  console.log(
    'PASS G07 technical fresh-process key+DB restore without DPAPI; production custody NOT APPROVED',
  );
} catch (error) {
  console.error('FAIL disposable verification', error.code || error.name);
  process.exitCode = 1;
} finally {
  for (const peer of peers) await peer.end();
  await db.close();
}
