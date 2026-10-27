/** Executes B2 SQL only in a fresh in-memory PGlite instance; never accepts a database URL. */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PGLITE_MODULE_PATH;
assert(modulePath?.startsWith('/'), 'Set PGLITE_MODULE_PATH to a local pinned PGlite module file.');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const root = new URL('../', import.meta.url);
const sql = await readFile(
  new URL('supabase/migrations/20261027173228_gradebook_foundation.sql', root),
  'utf8',
);
let checks = 0;
/** Runs a labeled acceptance group without logging row payloads or sensitive SQL. */
async function check(label, run) {
  await run();
  checks++;
  console.log(`PASS ${label}`);
}
/** Returns one scalar value from a synthetic metadata/constraint query. */
async function scalar(query, params = []) {
  return Object.values((await db.query(query, params)).rows[0])[0];
}
/** Checks a deliberate rejection by SQLSTATE, without exposing error-detail row values. */
async function denied(query, code = '42501', params = []) {
  await assert.rejects(db.query(query, params), (error) =>
    (Array.isArray(code) ? code : [code]).includes(error.code),
  );
}
/** Captures existing-object definitions/ACLs to detect effects beyond the additive schema. */
async function boardSnapshot() {
  return (
    await db.query(`
    SELECT 'relation' AS kind, n.nspname || '.' || c.relname AS name,
      concat_ws('|',c.relkind,c.relrowsecurity,c.relacl::text) AS definition
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','private','auth','storage')
    UNION ALL SELECT 'schema',nspname,coalesce(nspacl::text,'') FROM pg_namespace WHERE nspname IN ('public','private','auth','storage')
    UNION ALL SELECT 'default_acl',oid::text,defaclacl::text FROM pg_default_acl
    UNION ALL SELECT 'function', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
      pg_get_functiondef(p.oid) || coalesce(p.proacl::text,'')
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private','auth','storage')
    UNION ALL SELECT 'policy',schemaname || '.' || tablename || '.' || policyname,
      concat_ws('|',permissive,roles::text,cmd,qual,with_check) FROM pg_policies
    UNION ALL SELECT 'trigger',n.nspname || '.' || t.tgname,pg_get_triggerdef(t.oid)
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','private','auth','storage')
      AND NOT EXISTS (SELECT 1 FROM pg_constraint k JOIN pg_class r ON r.oid=k.conrelid JOIN pg_namespace rn ON rn.oid=r.relnamespace WHERE k.oid=t.tgconstraint AND rn.nspname='gradebook')
    ORDER BY kind,name,definition`)
  ).rows;
}
try {
  console.log(`Engine: ${await scalar('SELECT version()')}`);
  await db.exec(await readFile(new URL('tests/gradebook/b2-bootstrap.sql', root), 'utf8'));
  const migrations = (await readdir(new URL('supabase/migrations/', root)))
    .filter((name) => name < '20261026014933')
    .sort();
  assert.equal(migrations.length, 4);
  for (const name of migrations)
    await db.exec(await readFile(new URL(`supabase/migrations/${name}`, root), 'utf8'));
  const before = await boardSnapshot();
  await check('migration executes after four unchanged board migrations', () => db.exec(sql));
  await check(
    'existing board/Auth/Storage definitions, policies, functions and ACLs unchanged',
    async () => assert.deepEqual(await boardSnapshot(), before),
  );
  await check('six tables with RLS and no client policies', async () => {
    assert.equal(
      await scalar("SELECT count(*)::int FROM pg_tables WHERE schemaname='gradebook'"),
      6,
    );
    assert.equal(
      await scalar(
        "SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='gradebook' AND c.relkind='r' AND c.relrowsecurity",
      ),
      6,
    );
    assert.equal(
      await scalar("SELECT count(*)::int FROM pg_policies WHERE schemaname='gradebook'"),
      0,
    );
  });
  await check('exact ordered catalogs, no guessed class or students', async () => {
    assert.deepEqual(
      (await db.query('SELECT display_name FROM gradebook.subjects ORDER BY sort_order')).rows.map(
        (r) => r.display_name,
      ),
      ['Toán', 'Văn', 'Anh', 'KHTN', 'LS / ĐL', 'Công Nghệ', 'Tin Học', 'GDCD'],
    );
    assert.deepEqual(
      (
        await db.query('SELECT display_name FROM gradebook.score_columns ORDER BY sort_order')
      ).rows.map((r) => r.display_name),
      [
        'Thường xuyên 1',
        'Thường xuyên 2',
        'Thường xuyên 3',
        'Thường xuyên 4',
        '1 tiết',
        'Giữa kì',
        'Cuối kì',
      ],
    );
    assert.equal(await scalar('SELECT count(*)::int FROM gradebook.classes'), 0);
    assert.equal(await scalar('SELECT count(*)::int FROM gradebook.students'), 0);
  });
  await check('matching catalog replay is a no-op and divergence never overwrites', async () => {
    const seed = sql.slice(
      sql.indexOf('-- BEGIN CATALOG SEED'),
      sql.indexOf('-- END CATALOG SEED'),
    );
    await db.exec(seed);
    assert.equal(await scalar('SELECT count(*)::int FROM gradebook.subjects'), 8);
    await db.exec(
      "BEGIN; UPDATE gradebook.subjects SET display_name='Synthetic change' WHERE code='math';",
    );
    await assert.rejects(db.exec(seed), (error) => error.code === 'P0001');
    await db.exec('ROLLBACK');
    assert.equal(
      await scalar("SELECT display_name FROM gradebook.subjects WHERE code='math'"),
      'Toán',
    );
  });
  await check('anon/authenticated denied direct reads, writes, sequence, helper', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      for (const table of [
        'classes',
        'students',
        'subjects',
        'score_columns',
        'student_scores',
        'lookup_attempts',
      ]) {
        await denied(`SELECT * FROM gradebook.${table}`);
        await denied(`DELETE FROM gradebook.${table}`);
        await denied(
          `UPDATE gradebook.${table} SET ${table === 'lookup_attempts' ? 'attempts=0' : table === 'student_scores' ? 'score=0' : table === 'classes' ? "name='x'" : 'active=true'}`,
        );
      }
      await denied("INSERT INTO gradebook.classes(name,school_year) VALUES ('x','x')");
      await denied("SELECT nextval('gradebook.students_id_seq')");
      await denied('SELECT gradebook.admin_session_ok(NULL,NULL)');
      await db.exec('RESET ROLE');
    }
  });
  await check('RLS still denies with temporary test-only USAGE/SELECT grants', async () => {
    await db.exec(
      'BEGIN; GRANT USAGE ON SCHEMA gradebook TO anon; GRANT SELECT ON gradebook.subjects TO anon; SET LOCAL ROLE anon;',
    );
    assert.equal(await scalar('SELECT count(*)::int FROM gradebook.subjects'), 0);
    await db.exec('ROLLBACK');
  });
  await check(
    'service has catalog read and no catalog write/DDL/truncate/Auth-session read',
    async () => {
      await db.exec('SET ROLE service_role');
      assert.equal(await scalar('SELECT count(*)::int FROM gradebook.subjects'), 8);
      await denied("UPDATE gradebook.subjects SET display_name='changed'");
      await denied('TRUNCATE gradebook.students');
      await denied('CREATE TABLE gradebook.unwanted(id int)');
      await denied('SELECT * FROM auth.sessions');
      await db.exec('RESET ROLE');
    },
  );
  const actor = '10000000-0000-4000-8000-000000000001';
  const other = '10000000-0000-4000-8000-000000000002';
  const session = '20000000-0000-4000-8000-000000000001';
  await db.query('INSERT INTO auth.users(id) VALUES ($1),($2)', [actor, other]);
  await db.query('INSERT INTO public.admin_profiles(user_id) VALUES ($1)', [actor]);
  await db.query('INSERT INTO auth.sessions(id,user_id,not_after) VALUES ($1,$2,NULL)', [
    session,
    actor,
  ]);
  await check(
    'boolean helper validates active admin/session and denies mismatch, expiry, revocation',
    async () => {
      await db.exec('SET ROLE service_role');
      assert.equal(
        await scalar('SELECT gradebook.admin_session_ok($1,$2)', [actor, session]),
        true,
      );
      assert.equal(
        await scalar('SELECT gradebook.admin_session_ok($1,$2)', [other, session]),
        false,
      );
      assert.equal(await scalar('SELECT gradebook.admin_session_ok(NULL,NULL)'), false);
      await db.exec('RESET ROLE');
      await db.query("UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id=$1", [
        session,
      ]);
      assert.equal(
        await scalar('SELECT gradebook.admin_session_ok($1,$2)', [actor, session]),
        false,
      );
      await db.query('UPDATE auth.sessions SET not_after=NULL WHERE id=$1', [session]);
      await db.query('UPDATE public.admin_profiles SET active=false WHERE user_id=$1', [actor]);
      assert.equal(
        await scalar('SELECT gradebook.admin_session_ok($1,$2)', [actor, session]),
        false,
      );
      await db.query('UPDATE public.admin_profiles SET active=true WHERE user_id=$1', [actor]);
      await db.query('DELETE FROM auth.sessions WHERE id=$1', [session]);
      assert.equal(
        await scalar('SELECT gradebook.admin_session_ok($1,$2)', [actor, session]),
        false,
      );
    },
  );
  let classId, studentId;
  await check(
    'server DML creates DB-generated identities, one active class and protected blobs',
    async () => {
      await db.exec('SET ROLE service_role');
      classId = await scalar(
        "INSERT INTO gradebook.classes(name,school_year) VALUES ('Synthetic','2026') RETURNING id",
      );
      await denied(
        "INSERT INTO gradebook.classes(name,school_year) VALUES ('Second','2026')",
        '23505',
      );
      studentId = await scalar(
        `INSERT INTO gradebook.students(class_id,birth_date,identity_ciphertext,identity_nonce,identity_enc_kid,identity_lookup,lookup_key_version)
      VALUES ($1,'2012-04-12',decode(repeat('00',25),'hex'),decode(repeat('00',12),'hex'),'synthetic',decode(repeat('01',32),'hex'),1) RETURNING id::text`,
        [classId],
      );
      await db.exec('RESET ROLE');
      await denied("UPDATE gradebook.students SET identity_nonce=decode('00','hex')", '23514');
      await denied('UPDATE gradebook.students SET identity_alg_version=2', '23514');
      await denied('UPDATE gradebook.students SET lookup_key_version=0', '23514');
      await denied('UPDATE gradebook.students SET capability_version=0', '23514');
      await denied('UPDATE gradebook.students SET id=0', '428C9');
    },
  );
  await check('DOB finite range, Unicode name length and foreign key restrictions', async () => {
    for (const date of ['infinity', '-infinity', '10000-01-01', '0001-01-01 BC'])
      await denied('UPDATE gradebook.students SET birth_date=$1::date', '23514', [date]);
    await denied("UPDATE gradebook.students SET birth_date='1900-02-29'", '22008');
    await db.query('UPDATE gradebook.students SET full_name=$1', ['😀'.repeat(200)]);
    await denied('UPDATE gradebook.students SET full_name=$1', '23514', ['😀'.repeat(201)]);
    await denied('UPDATE gradebook.students SET full_name=$1', '23514', ['\u00a0Synthetic\u00a0']);
    await denied('DELETE FROM gradebook.classes', ['23503', '23001']);
  });
  await check('numeric exact range/meaningful precision and no typmod rounding', async () => {
    for (const value of ['0', '8', '8.1', '8.12345', '10', '10.00000', '8.123450']) {
      await db.query(
        `INSERT INTO gradebook.student_scores(student_id,semester,subject_code,score_column_code,score,updated_by)
        VALUES ($1,1,'math','final',$2::numeric,$3) ON CONFLICT (student_id,semester,subject_code,score_column_code) DO UPDATE SET score=excluded.score`,
        [studentId, value, actor],
      );
      assert.equal(
        await scalar('SELECT score=$1::numeric FROM gradebook.student_scores', [value]),
        true,
      );
    }
    for (const value of ['8.123456', '10.00001', '-1', 'NaN', 'Infinity', '-Infinity'])
      await denied('UPDATE gradebook.student_scores SET score=$1::numeric', '23514', [value]);
    await denied('UPDATE gradebook.student_scores SET semester=3', '23514');
    await denied('UPDATE gradebook.student_scores SET revision=0', '23514');
    await denied('DELETE FROM gradebook.students', ['23503', '23001']);
    await denied("DELETE FROM gradebook.subjects WHERE code='math'", ['23503', '23001']);
    await denied("DELETE FROM gradebook.score_columns WHERE code='final'", ['23503', '23001']);
    assert.equal(
      await scalar(
        "SELECT atttypmod FROM pg_attribute WHERE attrelid='gradebook.student_scores'::regclass AND attname='score'",
      ),
      -1,
    );
  });
  await check(
    'publication timestamps independent of global/student versions and score rows',
    async () => {
      await db.query('UPDATE gradebook.classes SET semester_1_published_at=now() WHERE id=$1', [
        classId,
      ]);
      assert.equal(
        await scalar(
          'SELECT semester_2_published_at IS NULL AND access_version=1 FROM gradebook.classes',
        ),
        true,
      );
      assert.equal(await scalar('SELECT capability_version=1 FROM gradebook.students'), true);
      assert.equal(await scalar('SELECT count(*)::int FROM gradebook.student_scores'), 1);
    },
  );
  await check('counter scope/key/window constraints and expiry index foundation', async () => {
    await db.exec(
      "SET ROLE service_role; INSERT INTO gradebook.lookup_attempts(scope,key,window_start,expires_at) VALUES ('pair_global_minute',''::bytea,now(),now()+interval '31 minutes'); RESET ROLE;",
    );
    await denied("UPDATE gradebook.lookup_attempts SET key=decode('00','hex')", '23514');
    await denied("UPDATE gradebook.lookup_attempts SET scope='unknown'", '23514');
    await denied('UPDATE gradebook.lookup_attempts SET attempts=-1', '23514');
    await denied('UPDATE gradebook.lookup_attempts SET expires_at=window_start', '23514');
  });
  await check('no public RPC, no grade audit trigger, fixed helper owner/search_path', async () => {
    assert.equal(
      await scalar(
        "SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'gb_%'",
      ),
      0,
    );
    assert.equal(
      await scalar(
        "SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='gradebook' AND NOT t.tgisinternal",
      ),
      0,
    );
    assert.equal(
      await scalar(
        "SELECT prosecdef AND provolatile='s' AND pg_get_userbyid(proowner)='postgres' AND proconfig @> ARRAY['search_path=\"\"'] FROM pg_proc WHERE oid='gradebook.admin_session_ok(uuid,uuid)'::regprocedure",
      ),
      true,
    );
  });
  await check('existing board public read and non-admin write deny still work', async () => {
    await db.exec('SET ROLE anon');
    assert.equal(await scalar('SELECT count(*)::int FROM public.boards'), 0);
    await db.exec('RESET ROLE; SET ROLE authenticated');
    await denied("INSERT INTO public.boards(title) VALUES ('forbidden')");
    await db.exec('RESET ROLE');
  });
  await check('class UUID and server actor fit unchanged audit table/sequence', async () => {
    await db.exec('SET ROLE service_role');
    await db.query(
      "INSERT INTO public.audit_logs(actor_id,action,target_id) VALUES ($1,'gradebook:synthetic_test',$2)",
      [actor, classId],
    );
    await db.exec('RESET ROLE');
    assert.equal(
      await scalar('SELECT target_id=$1::uuid AND actor_id=$2::uuid FROM public.audit_logs', [
        classId,
        actor,
      ]),
      true,
    );
  });
  await check(
    'unexpected inherited server permissions abort the whole draft atomically',
    async () => {
      const blocked = new PGlite();
      try {
        await blocked.exec(
          await readFile(new URL('tests/gradebook/b2-bootstrap.sql', root), 'utf8'),
        );
        for (const name of migrations)
          await blocked.exec(await readFile(new URL(`supabase/migrations/${name}`, root), 'utf8'));
        await blocked.exec('GRANT service_role TO anon');
        await assert.rejects(blocked.exec(sql), (error) => error.code === '42501');
        await blocked.exec('ROLLBACK');
        assert.equal(
          (await blocked.query("SELECT to_regnamespace('gradebook') IS NULL AS absent")).rows[0]
            .absent,
          true,
        );
      } finally {
        await blocked.close();
      }
    },
  );
  console.log(
    `B2 disposable SQL: ${checks}/${checks} groups PASS; hosted/JWT/concurrency NOT RUN.`,
  );
} catch (error) {
  console.error('B2 validation failed:', error.code || error.name, error.message.slice(0, 180));
  process.exitCode = 1;
} finally {
  await db.close();
}
