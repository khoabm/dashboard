/** Exercises B3 only in fresh in-memory PostgreSQL; never accepts connection credentials. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { frameTuple } from '../src/utils/gradebook/canonical.js';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE_PATH).href);
const db = new PGlite();
const actor = '10000000-0000-4000-8000-000000000001',
  session = '20000000-0000-4000-8000-000000000001';
let checks = 0;
/** Returns rows from a synthetic parameterized query. */
async function q(sql, args = []) {
  return (await db.query(sql, args)).rows;
}
/** Reads one scalar from disposable SQL. */
async function scalar(sql, args = []) {
  return Object.values((await q(sql, args))[0])[0];
}
/** Runs one labeled group without logging payloads. */
async function check(name, run) {
  await run();
  checks++;
  console.log('PASS', name);
}
/** Asserts rejection using a safe SQLSTATE predicate. */
async function reject(sql, args = [], code) {
  await assert.rejects(db.query(sql, args), (e) => !code || e.code === code);
}
try {
  await db.exec(await readFile('tests/gradebook/b2-bootstrap.sql', 'utf8'));
  const snapshot = async () =>
    q(`SELECT 'table' kind,schemaname||'.'||tablename name,rowsecurity::text definition FROM pg_tables WHERE schemaname IN ('public','private','auth','storage')
 UNION ALL SELECT 'policy',schemaname||'.'||tablename||'.'||policyname,concat_ws('|',roles::text,cmd,qual,with_check) FROM pg_policies
 UNION ALL SELECT 'function',p.oid::regprocedure::text,pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private','auth','storage') AND p.proname NOT LIKE 'gb_%'
 UNION ALL SELECT 'acl',c.oid::regclass::text,coalesce(c.relacl::text,'') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private','auth','storage') ORDER BY kind,name`);
  let before;
  for (const file of (await readdir('supabase/migrations')).sort()) {
    if (file.includes('gradebook_transactions')) before = await snapshot();
    await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
    if (file.includes('gradebook_transactions')) {
      await check('B3 preserves existing board/Auth policies/functions/ACLs', async () =>
        assert.deepEqual(await snapshot(), before),
      );
    }
  }
  await db.query('INSERT INTO auth.users VALUES($1)', [actor]);
  await db.query('INSERT INTO public.admin_profiles(user_id) VALUES($1)', [actor]);
  await db.query('INSERT INTO auth.sessions VALUES($1,$2,NULL)', [session, actor]);
  await db.exec('SET ROLE service_role');
  let cid;
  await check('authorized class setup and frame UTF8/null parity', async () => {
    cid = (
      await scalar('SELECT public.gb_class_create($1,$2,$3,$4)', [
        actor,
        session,
        'Synthetic',
        '2026',
      ])
    ).id;
    for (const fields of [
      ['Toán', null, '', '😀'],
      ['EXISTS', '9007199254740993'],
    ])
      assert.equal(
        await scalar('SELECT gradebook.tuple($1,$2)', ['vector', fields]),
        frameTuple('vector', fields),
      );
  });

  const lookup = '01'.repeat(32),
    identity = {
      lookup,
      lookupKeyVersion: 1,
      ciphertext: '00'.repeat(25),
      nonce: '00'.repeat(12),
      encKid: 'synthetic',
      birthDate: '2012-04-12',
    };
  const headers = ['same', 'same', 'same'];
  let rows = [{ ...identity, row: 2, fullName: ' Synthetic ' }],
    hash,
    sid;
  /** Calls the shared planner through the appropriate public import RPC. */
  async function preview(kind = 'roster', rr = rows) {
    return scalar(
      kind === 'roster'
        ? 'SELECT public.gb_roster_preview($1,$2,$3,$4,$5)'
        : 'SELECT public.gb_scores_preview($1,$2,$3,1::smallint,$4,$5)',
      [actor, session, cid, JSON.stringify(headers), JSON.stringify(rr)],
    );
  }
  /** Applies the full batch in one statement with a trusted state hash. */
  async function apply(kind, rr, expected) {
    return scalar(
      kind === 'roster'
        ? 'SELECT public.gb_roster_apply($1,$2,$3,$4,$5,$6)'
        : 'SELECT public.gb_scores_apply($1,$2,$3,1::smallint,$4,$5,$6)',
      [actor, session, cid, JSON.stringify(headers), JSON.stringify(rr), expected],
    );
  }
  await check(
    'every new exact signature denies browser and is invoker with safe search_path',
    async () => {
      const funcs = await q(
        "SELECT p.oid::regprocedure::text sig,prosecdef,proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='gradebook' AND proname<>'admin_session_ok') OR (n.nspname='public' AND proname LIKE 'gb_%')",
      );
      assert(funcs.length > 30);
      for (const f of funcs) {
        assert.equal(f.prosecdef, false);
        assert(f.proconfig.includes('search_path=""'));
        for (const role of ['anon', 'authenticated'])
          assert.equal(
            await scalar("SELECT has_function_privilege($1,$2,'EXECUTE')", [role, f.sig]),
            false,
          );
      }
      await reject('SELECT public.gb_class_read($1,$2,$3)', [actor, actor, cid], '42501');
    },
  );
  await check('decimal lexical and calendar parity reject invalids before writes', async () => {
    for (const v of ['8.123456', '8.123450', '8e0', '-1', 'NaN', '10.00001', 8.1])
      await reject('SELECT gradebook.score($1)', [JSON.stringify(v)], '22023');
    for (const v of ['0', '8.1', '8.12345', '10.00000'])
      assert.equal(await scalar('SELECT gradebook.score($1)::text', [JSON.stringify(v)]), v);
    for (const d of ['1900-02-29', '2100-02-29', '2012-04-31', '9999-01-01', '2012-4-12'])
      await reject("SELECT gradebook.dob($1,DATE '2026-10-26')", [d], '22023');
    assert.equal(
      await scalar("SELECT gradebook.dob('2000-02-29',DATE '2026-10-26')::text"),
      '2000-02-29',
    );
  });
  await check(
    'roster insert, missing/existing hash, unchanged and name update with source gaps',
    async () => {
      const p = await preview();
      assert.equal(p.counts.insert, 1);
      hash = p.internalStateHash;
      assert.match(hash, /^[a-f0-9]{64}$/);
      const c = (await q('SELECT * FROM gradebook.classes'))[0];
      let t = frameTuple('context', [
        '1',
        'roster',
        cid,
        null,
        String(c.revision),
        c.name,
        c.school_year,
        '1',
        String(c.access_version),
        String(c.lookup_key_version),
        null,
        null,
      ]);
      for (const [table, tag] of [
        ['subjects', 'subject'],
        ['score_columns', 'column'],
      ]) {
        const catalog = await q(`SELECT * FROM gradebook.${table} ORDER BY code COLLATE "C"`);
        t += frameTuple('count', [String(catalog.length)]).slice(frameTuple('count', []).length);
        for (const entry of catalog)
          t += frameTuple(tag, [
            entry.code,
            entry.display_name,
            String(entry.sort_order),
            entry.active ? '1' : '0',
          ]);
      }
      t += 'V1:1' + frameTuple('student_missing', ['1', lookup, 'MISSING']) + 'V1:0';
      assert.equal(hash, createHash('sha256').update(t, 'utf8').digest('hex'));

      assert.equal((await apply('roster', rows, hash)).committed, true);
      sid = await scalar('SELECT id::text FROM gradebook.students');
      const next = await preview();
      assert.equal(next.counts.unchanged, 1);
      assert.notEqual(next.internalStateHash, hash);
      await reject(
        'SELECT public.gb_roster_apply($1,$2,$3,$4,$5,$6)',
        [actor, session, cid, JSON.stringify(headers), JSON.stringify(rows), hash],
        'PT409',
      );
      rows = [{ ...identity, row: 7, fullName: 'Changed' }];
      const updated = await preview();
      assert.equal(updated.counts.update, 1);
      await apply('roster', rows, updated.internalStateHash);
      assert.equal(await scalar('SELECT full_name FROM gradebook.students'), 'Changed');
      rows = [{ ...identity, row: 7, fullName: '' }];
      assert.equal((await preview()).counts.unchanged, 1);
    },
  );
  await check(
    'DOB conflict and duplicate identities return safe coordinates and zero mutation',
    async () => {
      const bad = [rows[0], { ...identity, row: 10, birthDate: '2011-04-12' }];
      const p = await preview('roster', bad);
      assert(p.counts.error > 0);
      assert.equal(p.internalStateHash, null);
      assert.deepEqual(Object.keys(p.errors[0]).sort(), ['code', 'column', 'row']);
      const before = await scalar('SELECT revision::text FROM gradebook.students');
      await assert.rejects(apply('roster', bad, '0'.repeat(64)));
      assert.equal(await scalar('SELECT revision::text FROM gradebook.students'), before);
    },
  );
  let scoreRows = [
    {
      row: 2,
      lookup,
      lookupKeyVersion: 1,
      birthDate: '2012-04-12',
      subjectName: 'Toán',
      scores: ['8.25', null, '', null, null, null, '0'],
    },
  ];
  headers.splice(0, headers.length, ...Array(10).fill('custom'));
  await check(
    'score batch inserts zero, skips blanks, preserves raw values and numeric equivalence',
    async () => {
      const p = await preview('scores', scoreRows);
      assert.equal(p.counts.insert, 2);
      assert.equal(p.counts.skippedBlank, 5);
      await apply('scores', scoreRows, p.internalStateHash);
      assert.equal(await scalar('SELECT count(*)::int FROM gradebook.student_scores'), 2);
      const next = await preview('scores', scoreRows);
      assert.equal(next.counts.unchanged, 2);
      scoreRows[0].scores[0] = '8.25000';
      assert.equal((await preview('scores', scoreRows)).internalStateHash, next.internalStateHash);
      await db.exec(
        'RESET ROLE; UPDATE gradebook.student_scores SET score=8.26 WHERE score=8.25; SET ROLE service_role',
      );
      assert.notEqual(
        (await preview('scores', scoreRows)).internalStateHash,
        next.internalStateHash,
      );
      await assert.rejects(
        apply('scores', scoreRows, next.internalStateHash),
        (error) => error.code === 'PT409',
      );
    },
  );
  await check('mixed invalid and duplicate score batches never commit a prefix', async () => {
    const original = await scalar('SELECT sum(score)::text FROM gradebook.student_scores');
    for (const rr of [
      [scoreRows[0], { ...scoreRows[0], row: 4 }],
      [{ ...scoreRows[0], scores: ['9', '8.123450', null, null, null, null, null] }],
    ]) {
      const p = await preview('scores', rr);
      assert(p.counts.error > 0);
      await assert.rejects(apply('scores', rr, '0'.repeat(64)), (error) => error.code === 'PT409');
    }
    assert.equal(await scalar('SELECT sum(score)::text FROM gradebook.student_scores'), original);
  });
  await check('forced audit failure rolls the entire score mutation back', async () => {
    const p = await preview('scores', scoreRows);
    const before = await scalar('SELECT sum(score)::text FROM gradebook.student_scores');
    await db.exec(
      'RESET ROLE; REVOKE INSERT ON public.audit_logs FROM service_role; SET ROLE service_role',
    );
    await assert.rejects(apply('scores', scoreRows, p.internalStateHash));
    assert.equal(await scalar('SELECT sum(score)::text FROM gradebook.student_scores'), before);
    await db.exec(
      'RESET ROLE; GRANT INSERT ON public.audit_logs TO service_role; SET ROLE service_role',
    );
  });
  await check('publication, epochs, histogram aggregate and republish boundaries', async () => {
    let rev = await scalar('SELECT revision::text FROM gradebook.classes');
    await scalar('SELECT public.gb_semester_set($1,$2,$3,1::smallint,true,$4,true,true)', [
      actor,
      session,
      cid,
      rev,
    ]);
    assert.equal(
      (await scalar('SELECT public.gb_student_grades($1,$2,1,1,1::smallint)', [cid, sid])).length,
      2,
    );
    const hist = await scalar(
      "SELECT public.gb_histogram($1,$2,1,1,1::smallint,'math','continuous_1')",
      [cid, sid],
    );
    assert.equal(hist.length, 101);
    assert.equal(hist[83].studentCount, 1);
    await reject('SELECT public.gb_student_grades($1,$2,2,1,1::smallint)', [cid, sid], '42501');
    await assert.rejects(preview('scores', scoreRows));
    rev = await scalar('SELECT revision::text FROM gradebook.classes');
    await scalar('SELECT public.gb_semester_set($1,$2,$3,1::smallint,false,$4,true)', [
      actor,
      session,
      cid,
      rev,
    ]);
    await reject('SELECT public.gb_student_grades($1,$2,1,1,1::smallint)', [cid, sid], '42501');
    assert.equal(await scalar('SELECT access_version::text FROM gradebook.classes'), '1');
    for (const [sem, published] of [
      [2, true],
      [1, true],
      [1, false],
    ]) {
      const current = await scalar('SELECT revision::text FROM gradebook.classes');
      await scalar('SELECT public.gb_semester_set($1,$2,$3,$4::smallint,$5,$6,true,true)', [
        actor,
        session,
        cid,
        sem,
        published,
        current,
      ]);
      if (sem === 1 && published)
        assert.equal(
          (await scalar('SELECT public.gb_student_grades($1,$2,1,1,1::smallint)', [cid, sid]))
            .length,
          2,
        );
      assert.deepEqual(
        await scalar('SELECT public.gb_student_grades($1,$2,1,1,2::smallint)', [cid, sid]),
        [],
      );
    }
  });
  await check(
    'rate-limit denied decisions persist and global quota bounds identity allocation',
    async () => {
      for (let i = 0; i < 5; i++)
        assert.equal((await scalar('SELECT public.gb_limit(false,$1)', [lookup])).allowed, true);
      assert.equal((await scalar('SELECT public.gb_limit(false,$1)', [lookup])).allowed, false);
      assert.equal(
        await scalar(
          "SELECT attempts FROM gradebook.lookup_attempts WHERE scope='pair_identity_window'",
        ),
        6,
      );
      for (let i = 0; i < 60; i++) await scalar('SELECT public.gb_limit(false,NULL)');
      assert.equal(
        (await scalar('SELECT public.gb_limit(false,$1)', ['02'.repeat(32)])).allowed,
        false,
      );
      assert.equal(
        await scalar(
          "SELECT count(*)::int FROM gradebook.lookup_attempts WHERE scope='pair_identity_window'",
        ),
        1,
      );
      await db.exec(
        "INSERT INTO gradebook.lookup_attempts(scope,key,window_start,expires_at) SELECT 'pair_identity_window',decode(lpad(to_hex(n),64,'0'),'hex'),now()-interval '2 days',now()-interval '1 day' FROM generate_series(1,501)n",
      );
      await scalar('SELECT public.gb_limit(true,NULL)');
      assert.equal(
        await scalar('SELECT count(*)::int FROM gradebook.lookup_attempts WHERE expires_at<now()'),
        1,
      );
    },
  );
  await check('student CRUD scope, optimistic revisions and capability revocation', async () => {
    const s = await scalar('SELECT public.gb_student_read($1,$2,$3,$4)', [
      actor,
      session,
      cid,
      sid,
    ]);
    await scalar('SELECT public.gb_student_status($1,$2,$3,$4,$5,false,true)', [
      actor,
      session,
      cid,
      sid,
      s.revision,
    ]);
    assert.equal(await scalar('SELECT capability_version::text FROM gradebook.students'), '2');
    const patch = await scalar('SELECT public.gb_student_patch($1,$2,$3,$4,$5,$6)', [
      actor,
      session,
      cid,
      sid,
      String(Number(s.revision) + 1),
      JSON.stringify({ fullName: 'Renamed' }),
    ]);
    assert.equal(patch.fullName, 'Renamed');
    assert.equal(await scalar('SELECT capability_version::text FROM gradebook.students'), '2');
    await reject('SELECT public.gb_student_delete($1,$2,$3,$4,$5,true)', [
      actor,
      session,
      cid,
      sid,
      patch.revision,
    ]);
    assert.equal(await scalar('SELECT count(*)::int FROM gradebook.students'), 1);
  });

  await check('manual CRUD, secure reveal, pagination and metadata-only class edits', async () => {
    const second = await scalar('SELECT public.gb_student_create($1,$2,$3,$4)', [
      actor,
      session,
      cid,
      JSON.stringify({ ...identity, lookup: '03'.repeat(32) }),
    ]);
    assert.equal(
      (await scalar('SELECT public.gb_students_list($1,$2,$3)', [actor, session, cid])).length,
      2,
    );
    const revealed = await scalar('SELECT public.gb_student_read($1,$2,$3,$4,true)', [
      actor,
      session,
      cid,
      second.id,
    ]);
    assert.equal(revealed.ciphertext, identity.ciphertext);
    await scalar("SELECT public.gb_score_put($1,$2,$3,$4,1::smallint,'math','final',NULL,$5)", [
      actor,
      session,
      cid,
      second.id,
      JSON.stringify('8.1'),
    ]);
    await scalar("SELECT public.gb_score_put($1,$2,$3,$4,1::smallint,'math','final',1,$5)", [
      actor,
      session,
      cid,
      second.id,
      JSON.stringify('8.10000'),
    ]);
    assert.equal(
      await scalar('SELECT revision::text FROM gradebook.student_scores WHERE student_id=$1', [
        second.id,
      ]),
      '1',
    );
    await scalar("SELECT public.gb_score_delete($1,$2,$3,$4,1::smallint,'math','final',1,true)", [
      actor,
      session,
      cid,
      second.id,
    ]);
    await scalar('SELECT public.gb_student_delete($1,$2,$3,$4,1,true)', [
      actor,
      session,
      cid,
      second.id,
    ]);
    const rev = await scalar('SELECT revision::text FROM gradebook.classes');
    const patched = await scalar(
      "SELECT public.gb_class_patch($1,$2,$3,$4,'Renamed class','2027')",
      [actor, session, cid, rev],
    );
    assert.equal(patched.schoolYear, '2027');
    assert.equal(await scalar('SELECT count(*)::int FROM gradebook.student_scores'), 2);
    assert.equal(
      (await scalar('SELECT public.gb_scores_read($1,$2,$3,1::smallint)', [actor, session, cid]))
        .length,
      1,
    );
  });
  await check('pair lookup binds class/key/DOB and inactive identities are neutral', async () => {
    assert.equal(
      await scalar('SELECT public.gb_pair_check($1,$2,$3,1)', [cid, lookup, '2012-04-12']),
      null,
    );
    assert.equal(
      await scalar('SELECT public.gb_pair_check($1,$2,$3,1)', [cid, lookup, '2012-04-13']),
      null,
    );
    const context = await scalar('SELECT public.gb_lookup_context()');
    assert.equal(context.classId, cid);
    assert.equal(context.subjects.length, 8);
    assert.equal(context.scoreColumns.length, 7);
  });
  console.log('B3 SQL groups', checks);
} catch (e) {
  console.error('FAIL', e.code, e.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
