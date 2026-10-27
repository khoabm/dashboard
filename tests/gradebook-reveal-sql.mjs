/** Checks the reveal projection in fresh disposable memory; no network or crypto implementation. */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PGLITE_MODULE_PATH;
assert(modulePath?.startsWith('/'), 'Set the existing local PGlite module path.');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const migrationName = '20261027173327_gradebook_reveal_identity_context.sql';
const signature = 'public.gb_student_read(uuid,uuid,uuid,bigint,boolean)';
const actor = '10000000-0000-4000-8000-000000000001';
const session = '20000000-0000-4000-8000-000000000001';
const otherClass = '30000000-0000-4000-8000-000000000001';
const unknown = '40000000-0000-4000-8000-000000000001';
const protectedFields = [
  'identityLookup',
  'lookupKeyVersion',
  'ciphertext',
  'nonce',
  'encKid',
  'algVersion',
];
const identity = {
  lookup: 'ab'.repeat(32),
  lookupKeyVersion: 1,
  ciphertext: '02'.repeat(25),
  nonce: '01'.repeat(12),
  encKid: 'synthetic-reveal',
  birthDate: '2000-01-01', // Synthetic calendar fixture, not a real person's DOB.
  fullName: 'Synthetic reveal fixture',
};
let groups = 0;

/** Reads one scalar from the disposable database. */
async function scalar(sql, args = []) {
  return Object.values((await db.query(sql, args)).rows[0])[0];
}

/** Snapshots every application function, including owner, defaults, return type and raw ACL. */
async function functions() {
  return (
    await db.query(`SELECT p.oid::regprocedure::text signature,
      to_jsonb(p)-'prosrc' metadata, p.prosrc,
      has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
      has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
      has_function_privilege('service_role',p.oid,'EXECUTE') server_execute
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN ('public','private','gradebook') AND p.prokind='f'
      ORDER BY signature`)
  ).rows;
}

/** Counts audited requests, never treating a row as proof of Edge decryption. */
async function auditCount() {
  return scalar('SELECT count(*)::int FROM public.audit_logs');
}

/** Reads the one synthetic student through the actual function signature. */
async function read(actorId, sessionId, cid, sid, reveal = false) {
  return scalar('SELECT public.gb_student_read($1,$2,$3,$4,$5)', [
    actorId,
    sessionId,
    cid,
    sid,
    reveal,
  ]);
}

/** Emits finite group labels without any identity/envelope contents. */
function passed(label) {
  groups++;
  console.log('PASS', label);
}

try {
  await db.exec(await readFile('tests/gradebook/b2-bootstrap.sql', 'utf8'));
  for (const file of (await readdir('supabase/migrations'))
    .filter((file) => file.endsWith('.sql') && file < migrationName)
    .sort()) {
    await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
  }
  // Stable schema-qualified regprocedure rendering for exact-signature comparisons.
  await db.exec("SET search_path = ''");
  const migration = await readFile('supabase/migrations/' + migrationName, 'utf8');
  const beforeFunctions = await functions();
  const original = beforeFunctions.find((item) => item.signature === signature);
  assert(original);

  await db.query('INSERT INTO auth.users VALUES($1)', [actor]);
  await db.query('INSERT INTO public.admin_profiles(user_id) VALUES($1)', [actor]);
  await db.query('INSERT INTO auth.sessions VALUES($1,$2,NULL)', [session, actor]);
  await db.exec('SET ROLE service_role');
  const cid = (
    await scalar('SELECT public.gb_class_create($1,$2,$3,$4)', [
      actor,
      session,
      'Synthetic class',
      '2026',
    ])
  ).id;
  const dto = await scalar('SELECT public.gb_student_create($1,$2,$3,$4)', [
    actor,
    session,
    cid,
    JSON.stringify(identity),
  ]);
  const baselineRead = await read(actor, session, cid, dto.id);
  const baselineList = await scalar('SELECT public.gb_students_list($1,$2,$3)', [
    actor,
    session,
    cid,
  ]);
  await db.exec('RESET ROLE');
  // A deliberate owner-only fixture distinguishes stored generation from active-class generation.
  // B2 constraints allow it; this is not a supported rotation or ordinary write sequence.
  await db.query('UPDATE gradebook.students SET lookup_key_version=7 WHERE id=$1', [dto.id]);
  await db.query(
    'INSERT INTO gradebook.classes(id,name,school_year,is_active) VALUES($1,$2,$3,false)',
    [otherClass, 'Other synthetic class', '2026'],
  );
  const foreignStudent = await scalar(
    `INSERT INTO gradebook.students
    (class_id,birth_date,identity_ciphertext,identity_nonce,identity_enc_kid,identity_lookup,lookup_key_version)
    SELECT $1,birth_date,identity_ciphertext,identity_nonce,identity_enc_kid,identity_lookup,1
    FROM gradebook.students WHERE id=$2 RETURNING id::text`,
    [otherClass, dto.id],
  );

  await db.exec(migration);
  const afterFunctions = await functions();
  const corrected = afterFunctions.find((item) => item.signature === signature);
  assert.deepEqual(
    afterFunctions,
    beforeFunctions.map((item) =>
      item.signature === signature
        ? {
            ...item,
            prosrc: item.prosrc.replace(
              "'algVersion',s.identity_alg_version)",
              "'algVersion',s.identity_alg_version,'identityLookup',encode(s.identity_lookup,'hex'),'lookupKeyVersion',s.lookup_key_version)",
            ),
          }
        : item,
    ),
  );
  assert.deepEqual(corrected.metadata, original.metadata);
  assert.equal(corrected.anon_execute, false);
  assert.equal(corrected.authenticated_execute, false);
  assert.equal(corrected.server_execute, true);
  assert.deepEqual(corrected.metadata.proargnames, ['actor', 'session', 'cid', 'sid', 'reveal']);
  passed('E: exact body addition; all metadata/effective ACL and other functions unchanged');

  await db.exec('SET ROLE service_role');
  const countBefore = await auditCount();
  assert.deepEqual(await read(actor, session, cid, dto.id), baselineRead);
  assert.deepEqual(
    await scalar('SELECT public.gb_student_read($1,$2,$3,$4)', [actor, session, cid, dto.id]),
    baselineRead,
  );
  const list = await scalar('SELECT public.gb_students_list($1,$2,$3)', [actor, session, cid]);
  assert.deepEqual(list, baselineList);
  for (const ordinary of [baselineRead, ...list]) {
    for (const field of protectedFields) assert.equal(Object.hasOwn(ordinary, field), false);
  }
  assert.equal(await auditCount(), countBefore);
  passed('A: ordinary/default read and student list retain exactly the original DTO');

  const reveal = await read(actor, session, cid, dto.id, true);
  assert.deepEqual(reveal, {
    ...dto,
    ciphertext: identity.ciphertext,
    nonce: identity.nonce,
    encKid: identity.encKid,
    algVersion: 1,
    identityLookup: identity.lookup,
    lookupKeyVersion: 7,
  });
  assert.match(reveal.identityLookup, /^[0-9a-f]{64}$/);
  assert.equal(
    await scalar('SELECT lookup_key_version FROM gradebook.classes WHERE id=$1', [cid]),
    1,
  );
  await assert.rejects(
    scalar('SELECT public.gb_student_read($1,$2,$3,$4,true,$5::text)', [
      actor,
      session,
      cid,
      dto.id,
      '00'.repeat(32),
    ]),
    (error) => error.code === '42883',
  );
  passed('B: reveal returns the stored digest and row generation; no caller crypto argument');

  await assert.rejects(
    read(unknown, session, cid, dto.id, true),
    (error) => error.code === '42501',
  );
  await assert.rejects(read(actor, unknown, cid, dto.id, true), (error) => error.code === '42501');
  await assert.rejects(
    read(actor, session, unknown, dto.id, true),
    (error) => error.code === '42501',
  );
  await assert.rejects(
    read(actor, session, cid, foreignStudent, true),
    (error) => error.code === '22023',
  );
  await assert.rejects(
    read(actor, session, cid, '9223372036854775807', true),
    (error) => error.code === '22023',
  );
  for (const role of ['anon', 'authenticated']) {
    await db.exec('SET ROLE ' + role);
    await assert.rejects(
      read(actor, session, cid, dto.id, true),
      (error) => error.code === '42501',
    );
  }
  await db.exec('SET ROLE service_role');
  assert.equal(await auditCount(), countBefore + 1);
  passed('C: forged actor/session, wrong class/student and browser roles denied');

  const event = (
    await db.query(
      'SELECT actor_id,action,target_id FROM public.audit_logs ORDER BY id DESC LIMIT 1',
    )
  ).rows[0];
  assert.deepEqual(event, {
    actor_id: actor,
    target_id: cid,
    action: 'gradebook:student_reveal:count=1',
  });
  const auditText = await scalar('SELECT jsonb_agg(to_jsonb(a))::text FROM public.audit_logs a');
  for (const secret of [
    identity.lookup,
    identity.ciphertext,
    identity.nonce,
    identity.encKid,
    identity.birthDate,
    identity.fullName,
  ]) {
    assert.equal(auditText.includes(secret), false);
  }
  passed(
    'D: one class-scoped authorized-request audit; denied calls add none; no personal payload',
  );

  await db.exec('RESET ROLE');
  await db.exec(migration);
  assert.deepEqual(await functions(), afterFunctions);
  const definition = await scalar('SELECT pg_get_functiondef(to_regprocedure($1))', [signature]);
  await db.exec(definition.replace('BEGIN', 'BEGIN\n -- synthetic drift\n'));
  const drifted = await functions();
  await assert.rejects(db.exec(migration), (error) => error.code === 'P0001');
  await db.exec('ROLLBACK');
  assert.deepEqual(await functions(), drifted);
  await db.exec(definition);
  await db.exec(
    'ALTER FUNCTION public.gb_student_read(uuid,uuid,uuid,bigint,boolean) RENAME TO synthetic_missing_reveal',
  );
  const missing = await functions();
  await assert.rejects(db.exec(migration), (error) => error.code === 'P0001');
  await db.exec('ROLLBACK');
  assert.deepEqual(await functions(), missing);
  await db.exec(
    'ALTER FUNCTION public.synthetic_missing_reveal(uuid,uuid,uuid,bigint,boolean) RENAME TO gb_student_read',
  );
  assert.deepEqual(await functions(), afterFunctions);
  passed(
    'F: original/replay accepted; unexpected body/missing target fail closed without partial changes',
  );

  const conflicts = await readFile(
    'supabase/migrations/20261027173313_gradebook_nonretryable_conflicts.sql',
    'utf8',
  );
  const conflictSignatures = [
    ...conflicts.matchAll(
      /\('(public\.[a-z_]+\([^']+\)|gradebook\.import_run\([^']+\))','[0-9a-f]{64}'/g,
    ),
  ].map((match) => match[1]);
  assert.equal(conflictSignatures.length, 8);
  const finalFunctions = await functions();
  for (const name of conflictSignatures) {
    const item = finalFunctions.find((entry) => entry.signature === name);
    assert(item);
    assert.equal((item.prosrc.match(/ERRCODE='PT409'/g) || []).length, 1);
  }
  for (const item of finalFunctions)
    assert.doesNotMatch(item.prosrc, /40001|serialization_failure|deadlock_detected/);
  assert.deepEqual(finalFunctions, afterFunctions);
  passed('G: eight PT409 branches and board definitions preserved; no custom retryable errors');
  console.log(
    `Focused reveal SQL: ${groups}/${groups} groups PASS; disposable memory; hosted requests 0.`,
  );
} catch (error) {
  // Do not emit query text, diagnostics or fixture values, including on assertion failures.
  console.error('Focused reveal SQL failed:', error.code || error.name);
  process.exitCode = 1;
} finally {
  await db.close();
}
