-- Extracts private verification state inside the operator's already-open repeatable-read snapshot.
-- Run only with psql output redirected to restricted staging; never print this result into logs.
-- The holder remains open for pg_dump --snapshot; this file performs no writes or network setup.
SET LOCAL timezone = 'UTC';
SET LOCAL datestyle = 'ISO, YMD';
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

SELECT jsonb_build_object(
  'tables', jsonb_build_object(
    'classes', (SELECT coalesce(jsonb_agg(r), '[]') FROM (SELECT (SELECT jsonb_object_agg(key, value) FROM jsonb_each_text(to_jsonb(t))) r FROM gradebook.classes t) q),
    'students', (SELECT coalesce(jsonb_agg(r), '[]') FROM (SELECT (SELECT jsonb_object_agg(key, value) FROM jsonb_each_text(to_jsonb(t))) r FROM gradebook.students t) q),
    'student_scores', (SELECT coalesce(jsonb_agg(r), '[]') FROM (SELECT (SELECT jsonb_object_agg(key, value) FROM jsonb_each_text(to_jsonb(t))) r FROM gradebook.student_scores t) q),
    'subjects', (SELECT coalesce(jsonb_agg(r), '[]') FROM (SELECT (SELECT jsonb_object_agg(key, value) FROM jsonb_each_text(to_jsonb(t))) r FROM gradebook.subjects t) q),
    'score_columns', (SELECT coalesce(jsonb_agg(r), '[]') FROM (SELECT (SELECT jsonb_object_agg(key, value) FROM jsonb_each_text(to_jsonb(t))) r FROM gradebook.score_columns t) q),
    'lookup_attempts', (SELECT coalesce(jsonb_agg(r), '[]') FROM (SELECT (SELECT jsonb_object_agg(key, value) FROM jsonb_each_text(to_jsonb(t))) r FROM gradebook.lookup_attempts t) q)
  ),
  'security', jsonb_build_object(
    'objects', (SELECT coalesce(jsonb_agg(to_jsonb(q)), '[]') FROM (
      SELECT n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity,
        pg_get_userbyid(c.relowner) AS owner,
        ARRAY(SELECT a::text FROM unnest(coalesce(c.relacl, acldefault(CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END::"char", c.relowner))) a ORDER BY 1) AS acl
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname IN ('public', 'private', 'gradebook', 'auth', 'storage')
    ) q),
    'schemas', (SELECT coalesce(jsonb_agg(to_jsonb(q)), '[]') FROM (
      SELECT n.nspname, pg_get_userbyid(n.nspowner) AS owner,
        ARRAY(SELECT a::text FROM unnest(coalesce(n.nspacl, acldefault('n', n.nspowner))) a ORDER BY 1) AS acl
      FROM pg_namespace n WHERE n.nspname IN ('public', 'private', 'gradebook', 'auth', 'storage')
    ) q),
    'routines', (SELECT coalesce(jsonb_agg(to_jsonb(q)), '[]') FROM (
      SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
        pg_get_userbyid(p.proowner) AS owner, p.prosecdef, p.proconfig,
        ARRAY(SELECT a::text FROM unnest(coalesce(p.proacl, acldefault('f', p.proowner))) a ORDER BY 1) AS acl
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('public', 'private', 'gradebook', 'auth', 'storage')
    ) q),
    'policies', (SELECT coalesce(jsonb_agg(to_jsonb(q)), '[]') FROM (
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies
      WHERE schemaname IN ('public', 'private', 'gradebook', 'auth', 'storage')
    ) q),
    'defaults', (SELECT coalesce(jsonb_agg(to_jsonb(q)), '[]') FROM (
      SELECT pg_get_userbyid(d.defaclrole) AS owner, n.nspname, d.defaclobjtype,
        ARRAY(SELECT a::text FROM unnest(d.defaclacl) a ORDER BY 1) AS acl
      FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
    ) q)
  )
);
