-- Manual specialist only: fresh synthetic PostgreSQL on loopback, never CI or hosted.
BEGIN;
SET LOCAL statement_timeout = '10s';
DO $$ BEGIN
  ASSERT current_database() = 'export_sort_verified' AND inet_server_addr() = '127.0.0.1'::inet,
    'Use only the disposable export_sort_verified loopback database';
END $$;

INSERT INTO auth.users(id) VALUES ('10000000-0000-4000-8000-000000000001');
INSERT INTO auth.sessions(id, user_id) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001');
INSERT INTO public.admin_profiles(user_id) VALUES ('10000000-0000-4000-8000-000000000001');
INSERT INTO gradebook.classes(id, name, school_year) VALUES
  ('30000000-0000-4000-8000-000000000001', 'Synthetic class', '2026');

DO $$
DECLARE payload JSONB;
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.gb_class_snapshot(uuid,uuid,uuid,boolean)', 'EXECUTE');
  ASSERT NOT has_function_privilege('authenticated', 'public.gb_class_snapshot(uuid,uuid,uuid,boolean)', 'EXECUTE');
  ASSERT has_function_privilege('service_role', 'public.gb_class_snapshot(uuid,uuid,uuid,boolean)', 'EXECUTE');
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.gb_class_snapshot(uuid,uuid,uuid,boolean)'::regprocedure);
  SET LOCAL ROLE service_role;
  payload := public.gb_class_snapshot('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', true);
  ASSERT payload->'students' = '[]'::jsonb;
  RESET ROLE;
END $$;

-- Forty-three rows cover three UI pages; there is no traffic/load benchmark.
INSERT INTO gradebook.students(class_id, full_name, birth_date, identity_ciphertext,
  identity_nonce, identity_enc_kid, identity_lookup, lookup_key_version, active)
SELECT '30000000-0000-4000-8000-000000000001', 'Synthetic ' || i, DATE '2000-02-29',
  decode(repeat('01', 25), 'hex'), decode(repeat('02', 12), 'hex'), 'synthetic',
  sha256(convert_to(i::text, 'UTF8')), 1, i <> 43 FROM generate_series(1, 43) i;
INSERT INTO gradebook.student_scores(student_id, semester, subject_code, score_column_code, score, updated_by)
SELECT id, semester, 'math', 'continuous_1', 8.12345,
  '10000000-0000-4000-8000-000000000001' FROM gradebook.students CROSS JOIN generate_series(1, 2) semester;

DO $$
DECLARE payload JSONB; listed JSONB; item JSONB;
BEGIN
  SET LOCAL ROLE service_role;
  payload := public.gb_class_snapshot('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', false);
  ASSERT jsonb_array_length(payload->'students') = 43;
  ASSERT (SELECT count(*) FROM jsonb_array_elements(payload->'students') row WHERE row->>'active' = 'false') = 1;
  FOR item IN SELECT * FROM jsonb_array_elements(payload->'students') LOOP
    ASSERT item->'scores1'->0->>'rawScore' = '8.12345';
    ASSERT item->'scores2'->0->>'rawScore' = '8.12345';
    ASSERT item ?& ARRAY['ciphertext','identityLookup','lookupKeyVersion','encKid','algVersion','nonce'];
    ASSERT NOT item ? 'documentNumber';
  END LOOP;
  listed := public.gb_students_list('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 0, 200);
  ASSERT NOT (listed->0) ?| ARRAY['ciphertext','identityLookup','documentNumber','documentOrder'];
  BEGIN
    PERFORM public.gb_class_snapshot('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', false);
    RAISE EXCEPTION 'Expected wrong-class denial';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  ASSERT (SELECT count(*) FROM public.audit_logs WHERE action LIKE 'gradebook:class_%') = 2;
  ASSERT NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE action LIKE '%8.12345%' OR action LIKE '%Synthetic%');
END $$;

DELETE FROM auth.sessions WHERE id = '20000000-0000-4000-8000-000000000001';
DO $$ BEGIN
  SET LOCAL ROLE service_role;
  BEGIN
    PERFORM public.gb_class_snapshot('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', true);
    RAISE EXCEPTION 'Expected revoked-session denial';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.gb_class_snapshot('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', true);
    RAISE EXCEPTION 'Expected direct anonymous denial';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;
ROLLBACK;
SELECT 'PASS: snapshot ACL, empty/full class, both semesters/exact strings, ordinary-list isolation, audit, wrong-class/revoked/anon denial' AS result;
