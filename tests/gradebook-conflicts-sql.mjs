/** Verifies only conflict correction/guards in disposable memory; never accepts DB credentials. */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.PGLITE_MODULE_PATH;
assert(modulePath?.startsWith('/'), 'Set the existing local PGlite module path.');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const correctionName = '20261027173313_gradebook_nonretryable_conflicts.sql';
const correction = await readFile('supabase/migrations/' + correctionName, 'utf8');
const signatures = [
  ...correction.matchAll(
    /\('(public\.[a-z_]+\([^']+\)|gradebook\.import_run\([^']+\))','[0-9a-f]{64}'/g,
  ),
].map((m) => m[1]);
assert.equal(signatures.length, 8);
const actor = '10000000-0000-4000-8000-000000000001';
const session = '20000000-0000-4000-8000-000000000001';
let groups = 0;
/** Reads synthetic query results with parameters. */
async function rows(sql, args = []) {
  return (await db.query(sql, args)).rows;
}
/** Reads a single synthetic scalar. */
async function scalar(sql, args = []) {
  return Object.values((await rows(sql, args))[0])[0];
}
/** Snapshots mutation/audit tables to prove no partial or unintended writes. */
async function state() {
  return scalar(
    `SELECT jsonb_build_object('classes',(SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM gradebook.classes c),'students',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM gradebook.students s),'scores',(SELECT jsonb_agg(to_jsonb(x) ORDER BY student_id,semester,subject_code,score_column_code) FROM gradebook.student_scores x),'audit',(SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM public.audit_logs a))`,
  );
}
/** Captures ownership, exact ACL and execution attributes without source text. */
async function attributes() {
  return rows(
    `SELECT p.oid::regprocedure::text signature,p.proowner::text,p.proacl::text,p.provolatile,p.prosecdef,p.proconfig,p.prolang::text,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,has_function_privilege('service_role',p.oid,'EXECUTE') server_execute
 FROM pg_proc p WHERE p.oid IN (SELECT to_regprocedure(s) FROM unnest($1::text[]) s) ORDER BY signature`,
    [signatures],
  );
}
/** Checks one business conflict and unchanged state in its own finite statement. */
async function conflict(label, sql, args) {
  const before = await state();
  await assert.rejects(db.query(sql, args), (error) => error.code === 'PT409');
  assert.deepEqual(await state(), before, label);
  groups++;
  console.log('PASS', label);
}
try {
  await db.exec(await readFile('tests/gradebook/b2-bootstrap.sql', 'utf8'));
  for (const file of (await readdir('supabase/migrations'))
    .filter((f) => f < correctionName)
    .sort())
    await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
  const before = await attributes();
  const originalSources = await rows(
    'SELECT p.oid::regprocedure::text signature,p.prosrc FROM pg_proc p WHERE p.oid IN (SELECT to_regprocedure(s) FROM unnest($1::text[]) s)',
    [signatures],
  );
  await db.exec(correction);
  assert.deepEqual(await attributes(), before);
  for (const original of originalSources)
    assert.equal(
      await scalar('SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure($1)', [
        original.signature,
      ]),
      original.prosrc.replaceAll("ERRCODE='40001'", "ERRCODE='PT409'"),
    );
  assert.equal(
    await scalar(
      "SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='gradebook' OR (n.nspname='public' AND p.proname LIKE 'gb_%')) AND p.prosrc LIKE '%40001%'",
    ),
    0,
  );
  await db.exec(correction);
  assert.deepEqual(await attributes(), before);
  groups++;
  console.log('PASS exact eight code-only changes, metadata/effective ACL and replay');
  // Guard failures use reviewed local definitions and restore them after rollback.
  const definition = await scalar('SELECT pg_get_functiondef(to_regprocedure($1))', [
    signatures[0],
  ]);
  await db.exec(definition.replace('BEGIN', 'BEGIN\n -- synthetic definition drift\n'));
  await assert.rejects(db.exec(correction), (error) => error.code === 'P0001');
  await db.exec('ROLLBACK');
  await db.exec(definition);
  await db.exec(
    'ALTER FUNCTION gradebook.import_run(uuid,uuid,uuid,text,smallint,jsonb,jsonb,boolean,text) RENAME TO synthetic_missing_target',
  );
  await assert.rejects(db.exec(correction), (error) => error.code === 'P0001');
  await db.exec('ROLLBACK');
  await db.exec(
    'ALTER FUNCTION gradebook.synthetic_missing_target(uuid,uuid,uuid,text,smallint,jsonb,jsonb,boolean,text) RENAME TO import_run',
  );
  assert.deepEqual(await attributes(), before);
  groups++;
  console.log('PASS fail-closed guards for drift and missing exact signature');
  await db.query('INSERT INTO auth.users VALUES($1)', [actor]);
  await db.query('INSERT INTO public.admin_profiles(user_id) VALUES($1)', [actor]);
  await db.query('INSERT INTO auth.sessions VALUES($1,$2,NULL)', [session, actor]);
  await db.exec('SET ROLE service_role');
  const cid = (
    await scalar('SELECT public.gb_class_create($1,$2,$3,$4)', [
      actor,
      session,
      'Synthetic',
      '2026',
    ])
  ).id;
  const identity = {
    lookup: '01'.repeat(32),
    lookupKeyVersion: 1,
    ciphertext: '00'.repeat(25),
    nonce: '00'.repeat(12),
    encKid: 'synthetic',
    birthDate: '2012-04-12',
    fullName: 'Synthetic',
  };
  const student = await scalar('SELECT public.gb_student_create($1,$2,$3,$4)', [
    actor,
    session,
    cid,
    JSON.stringify(identity),
  ]);
  const sid = student.id;
  await scalar("SELECT public.gb_score_put($1,$2,$3,$4,1::smallint,'math','final',NULL,$5)", [
    actor,
    session,
    cid,
    sid,
    JSON.stringify('8.25'),
  ]);
  await conflict('stale class patch', 'SELECT public.gb_class_patch($1,$2,$3,0,$4,$5)', [
    actor,
    session,
    cid,
    'Unwanted',
    '2099',
  ]);
  await conflict(
    'stale semester publication',
    'SELECT public.gb_semester_set($1,$2,$3,1::smallint,true,0,true,true)',
    [actor, session, cid],
  );
  await conflict('stale student patch', 'SELECT public.gb_student_patch($1,$2,$3,$4,0,$5)', [
    actor,
    session,
    cid,
    sid,
    JSON.stringify({ fullName: 'Unwanted' }),
  ]);
  await conflict(
    'stale student status',
    'SELECT public.gb_student_status($1,$2,$3,$4,0,false,true)',
    [actor, session, cid, sid],
  );
  await conflict('stale student delete', 'SELECT public.gb_student_delete($1,$2,$3,$4,0,true)', [
    actor,
    session,
    cid,
    sid,
  ]);
  await conflict(
    'stale score put',
    "SELECT public.gb_score_put($1,$2,$3,$4,1::smallint,'math','final',0,$5)",
    [actor, session, cid, sid, JSON.stringify('9')],
  );
  await conflict(
    'stale score delete',
    "SELECT public.gb_score_delete($1,$2,$3,$4,1::smallint,'math','final',0,true)",
    [actor, session, cid, sid],
  );
  const headers = JSON.stringify(['Name', 'Document', 'Birth']);
  const batch = JSON.stringify([
    { ...identity, row: 2, fullName: 'Changed' },
    { ...identity, row: 4, lookup: '02'.repeat(32) },
  ]);
  const preview = await scalar('SELECT public.gb_roster_preview($1,$2,$3,$4,$5)', [
    actor,
    session,
    cid,
    headers,
    batch,
  ]);
  await scalar('SELECT public.gb_student_patch($1,$2,$3,$4,1,$5)', [
    actor,
    session,
    cid,
    sid,
    JSON.stringify({ fullName: 'Newer edit' }),
  ]);
  await conflict(
    'stale import hash prevents mixed batch writes',
    'SELECT public.gb_roster_apply($1,$2,$3,$4,$5,$6)',
    [actor, session, cid, headers, batch, preview.internalStateHash],
  );
  const scoreHeaders = JSON.stringify(Array(10).fill('custom'));
  const scoreRows = JSON.stringify([
    {
      row: 2,
      lookup: identity.lookup,
      lookupKeyVersion: 1,
      birthDate: identity.birthDate,
      subjectName: 'Toán',
      scores: [null, null, null, null, null, null, '9'],
    },
  ]);
  await conflict(
    'score apply propagates private conflict code',
    'SELECT public.gb_scores_apply($1,$2,$3,1::smallint,$4,$5,$6)',
    [actor, session, cid, scoreHeaders, scoreRows, '0'.repeat(64)],
  );
  const changed = await scalar('SELECT public.gb_class_patch($1,$2,$3,1,$4,$5)', [
    actor,
    session,
    cid,
    'Valid edit',
    '2027',
  ]);
  assert.equal(changed.name, 'Valid edit');
  const fresh = await scalar('SELECT public.gb_roster_preview($1,$2,$3,$4,$5)', [
    actor,
    session,
    cid,
    headers,
    batch,
  ]);
  const applied = await scalar('SELECT public.gb_roster_apply($1,$2,$3,$4,$5,$6)', [
    actor,
    session,
    cid,
    headers,
    batch,
    fresh.internalStateHash,
  ]);
  assert.equal(applied.committed, true);
  const same = await scalar('SELECT public.gb_roster_preview($1,$2,$3,$4,$5)', [
    actor,
    session,
    cid,
    headers,
    batch,
  ]);
  assert.equal(same.counts.unchanged, 2);
  groups++;
  console.log('PASS valid writes and subsequent no-op preview');
  await db.exec('RESET ROLE');
  for (const signature of [
    'public.reorder_posts(uuid[],integer[])',
    'public.save_post(jsonb,jsonb,integer)',
  ]) {
    assert.equal(
      await scalar(
        "SELECT position('PT409' IN prosrc)>0 AND position('40001' IN prosrc)=0 FROM pg_proc WHERE oid=to_regprocedure($1)",
        [signature],
      ),
      true,
    );
  }
  groups++;
  console.log('PASS board hotfix remains nonretryable');
  console.log(`Focused conflict SQL: ${groups}/${groups} groups PASS; hosted requests 0.`);
} catch (error) {
  console.error('Focused SQL failed:', error.code || error.name, error.message.slice(0, 180));
  process.exitCode = 1;
} finally {
  await db.close();
}
