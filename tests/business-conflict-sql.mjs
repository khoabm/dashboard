/** Checks the retry-code hotfix in disposable memory, with no hosted connection. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE_PATH).href);
const db = new PGlite();
try {
  await db.exec(await readFile('tests/gradebook/b2-bootstrap.sql', 'utf8'));
  for (const file of [
    '20261023150359_initial_board.sql',
    '20261023151152_quota_observability.sql',
    '20261023151459_atomic_post_reorder.sql',
    '20261023152049_split_write_policies.sql',
  ]) {
    await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
  }
  const before = (
    await db.query(
      "SELECT oid::regprocedure::text sig,proacl::text acl FROM pg_proc WHERE oid IN ('public.reorder_posts(uuid[],integer[])'::regprocedure,'public.save_post(jsonb,jsonb,integer)'::regprocedure) ORDER BY sig",
    )
  ).rows;
  const fix = await readFile(
    'supabase/migrations/20261026034549_stop_business_conflict_retries.sql',
    'utf8',
  );
  await db.exec(fix);
  await db.exec(fix);
  assert.deepEqual(
    (
      await db.query(
        "SELECT oid::regprocedure::text sig,proacl::text acl FROM pg_proc WHERE oid IN ('public.reorder_posts(uuid[],integer[])'::regprocedure,'public.save_post(jsonb,jsonb,integer)'::regprocedure) ORDER BY sig",
      )
    ).rows,
    before,
  );
  await db.exec(`INSERT INTO auth.users VALUES('10000000-0000-4000-8000-000000000001');
    INSERT INTO public.admin_profiles(user_id) VALUES('10000000-0000-4000-8000-000000000001');
    SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
    INSERT INTO public.boards(id,title) VALUES('20000000-0000-4000-8000-000000000001','Synthetic');
    INSERT INTO public.sections(id,board_id,title) VALUES('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic');
    INSERT INTO public.posts(id,section_id,title) VALUES('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Synthetic');`);
  await assert.rejects(
    db.query(
      "SELECT public.reorder_posts(ARRAY['40000000-0000-4000-8000-000000000001'::uuid],ARRAY[0])",
    ),
    (e) => e.code === 'PT409',
  );
  await assert.rejects(
    db.query("SELECT public.save_post($1,'[]'::jsonb,0)", [
      JSON.stringify({ id: '40000000-0000-4000-8000-000000000001' }),
    ]),
    (e) => e.code === 'PT409',
  );
  assert.equal((await db.query('SELECT version FROM public.posts')).rows[0].version, 1);
  console.log('PASS board conflict codes, zero writes, preserved ACL and replay');
} finally {
  await db.close();
}
