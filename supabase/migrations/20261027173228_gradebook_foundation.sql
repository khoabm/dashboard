-- DRAFT / NOT APPLIED. B2 foundation only; no public gb_* RPCs or runtime mutations.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

-- Fail closed rather than create a SECURITY DEFINER helper with an unverified owner.
DO $$
BEGIN
  IF CURRENT_USER <> 'postgres'
    OR NOT pg_catalog.has_table_privilege(CURRENT_USER, 'auth.sessions', 'SELECT')
    OR NOT pg_catalog.has_table_privilege(CURRENT_USER, 'public.admin_profiles', 'SELECT')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role' AND rolbypassrls)
  THEN
    RAISE EXCEPTION 'Gradebook prerequisite owner/roles unavailable' USING ERRCODE = '42501';
  END IF;
  -- Compile-time dependencies also verify the expected Auth metadata shape without reading rows.
  PERFORM s.id, s.user_id, s.not_after FROM auth.sessions AS s LIMIT 0;
  PERFORM a.user_id, a.role, a.active FROM public.admin_profiles AS a LIMIT 0;
END;
$$;

-- A collision requires explicit investigation, not adoption of an existing schema.
CREATE SCHEMA gradebook AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA gradebook FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA gradebook TO service_role;

CREATE TABLE gradebook.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 100),
  school_year TEXT NOT NULL CHECK (school_year = btrim(school_year) AND char_length(school_year) BETWEEN 1 AND 32),
  is_active BOOLEAN NOT NULL DEFAULT true,
  semester_1_published_at TIMESTAMPTZ,
  semester_2_published_at TIMESTAMPTZ,
  revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
  access_version BIGINT NOT NULL DEFAULT 1 CHECK (access_version > 0),
  lookup_key_version INTEGER NOT NULL DEFAULT 1 CHECK (lookup_key_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX gradebook_one_active_class ON gradebook.classes (is_active) WHERE is_active;

CREATE TABLE gradebook.subjects (
  code TEXT PRIMARY KEY CHECK (char_length(code) BETWEEN 1 AND 32 AND code ~ '^[a-z0-9_]+$'),
  display_name TEXT NOT NULL UNIQUE CHECK (display_name = btrim(display_name) AND char_length(display_name) BETWEEN 1 AND 100),
  sort_order SMALLINT NOT NULL UNIQUE CHECK (sort_order > 0),
  active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE gradebook.score_columns (
  code TEXT PRIMARY KEY CHECK (char_length(code) BETWEEN 1 AND 32 AND code ~ '^[a-z0-9_]+$'),
  display_name TEXT NOT NULL UNIQUE CHECK (display_name = btrim(display_name) AND char_length(display_name) BETWEEN 1 AND 100),
  sort_order SMALLINT NOT NULL UNIQUE CHECK (sort_order > 0),
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE gradebook.students (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY CHECK (id > 0),
  class_id UUID NOT NULL REFERENCES gradebook.classes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- Match B1 String.trim whitespace, while char_length counts Unicode code points.
  full_name TEXT CHECK (full_name = btrim(full_name, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
    AND char_length(full_name) BETWEEN 1 AND 200),
  birth_date DATE NOT NULL CHECK (isfinite(birth_date) AND birth_date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
  identity_ciphertext BYTEA NOT NULL CHECK (octet_length(identity_ciphertext) BETWEEN 25 AND 28),
  identity_nonce BYTEA NOT NULL CHECK (octet_length(identity_nonce) = 12),
  identity_enc_kid TEXT NOT NULL CHECK (char_length(identity_enc_kid) BETWEEN 1 AND 32),
  identity_alg_version SMALLINT NOT NULL DEFAULT 1 CHECK (identity_alg_version = 1),
  identity_lookup BYTEA NOT NULL CHECK (octet_length(identity_lookup) = 32),
  lookup_key_version INTEGER NOT NULL CHECK (lookup_key_version > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  capability_version BIGINT NOT NULL DEFAULT 1 CHECK (capability_version > 0),
  revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, identity_lookup)
);
CREATE INDEX gradebook_students_class_active_id ON gradebook.students (class_id, active, id);

CREATE TABLE gradebook.student_scores (
  student_id BIGINT NOT NULL REFERENCES gradebook.students(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  semester SMALLINT NOT NULL CHECK (semester IN (1, 2)),
  subject_code TEXT NOT NULL REFERENCES gradebook.subjects(code) ON DELETE RESTRICT ON UPDATE RESTRICT,
  score_column_code TEXT NOT NULL REFERENCES gradebook.score_columns(code) ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- No typmod/cast rounds values into validity. Lexical validation still belongs to B1/B3/B4.
  score NUMERIC NOT NULL CHECK (score BETWEEN 0 AND 10 AND scale(trim_scale(score)) <= 5),
  revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, semester, subject_code, score_column_code)
);
CREATE INDEX gradebook_scores_histogram ON gradebook.student_scores
  (semester, subject_code, score_column_code, student_id) INCLUDE (score);
-- Composite PK does not cover lookups beginning with these FK columns.
CREATE INDEX gradebook_scores_subject ON gradebook.student_scores (subject_code);
CREATE INDEX gradebook_scores_column ON gradebook.student_scores (score_column_code);
CREATE INDEX gradebook_scores_actor ON gradebook.student_scores (updated_by);

CREATE TABLE gradebook.lookup_attempts (
  scope TEXT NOT NULL CHECK (scope IN ('pair_global_minute', 'pair_global_window', 'pair_identity_window', 'read_global_minute')),
  key BYTEA NOT NULL,
  window_start TIMESTAMPTZ NOT NULL CHECK (isfinite(window_start)),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at TIMESTAMPTZ NOT NULL CHECK (isfinite(expires_at) AND expires_at > window_start),
  PRIMARY KEY (scope, key, window_start),
  CHECK ((scope = 'pair_identity_window' AND octet_length(key) = 32)
    OR (scope <> 'pair_identity_window' AND octet_length(key) = 0))
);
CREATE INDEX gradebook_attempts_expiry ON gradebook.lookup_attempts (expires_at);

-- BEGIN CATALOG SEED
-- Matching replays are no-ops; divergent/extra catalog rows require a reviewed migration.
DO $$
DECLARE
  expected RECORD;
  stored RECORD;
BEGIN
  FOR expected IN SELECT * FROM (VALUES
    ('math', 'Toán', 1),
    ('literature', 'Văn', 2),
    ('english', 'Anh', 3),
    ('natural_science', 'KHTN', 4),
    ('history_geography', 'LS / ĐL', 5),
    ('technology', 'Công Nghệ', 6),
    ('informatics', 'Tin Học', 7),
    ('civics', 'GDCD', 8)
  ) AS seed(code, display_name, sort_order) LOOP
    SELECT display_name, sort_order, active INTO stored FROM gradebook.subjects WHERE code = expected.code;
    IF FOUND THEN
      IF stored.display_name IS DISTINCT FROM expected.display_name
        OR stored.sort_order IS DISTINCT FROM expected.sort_order OR NOT stored.active THEN
        RAISE EXCEPTION 'Gradebook catalog divergence requires review';
      END IF;
    ELSE
      INSERT INTO gradebook.subjects(code, display_name, sort_order)
        VALUES (expected.code, expected.display_name, expected.sort_order);
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM gradebook.subjects) <> 8 THEN
    RAISE EXCEPTION 'Gradebook unexpected catalog rows';
  END IF;
END;
$$;
DO $$
DECLARE
  expected RECORD;
  stored RECORD;
BEGIN
  FOR expected IN SELECT * FROM (VALUES
    ('continuous_1', 'Thường xuyên 1', 1),
    ('continuous_2', 'Thường xuyên 2', 2),
    ('continuous_3', 'Thường xuyên 3', 3),
    ('continuous_4', 'Thường xuyên 4', 4),
    ('period_test', '1 tiết', 5),
    ('midterm', 'Giữa kì', 6),
    ('final', 'Cuối kì', 7)
  ) AS seed(code, display_name, sort_order) LOOP
    SELECT display_name, sort_order, active INTO stored FROM gradebook.score_columns WHERE code = expected.code;
    IF FOUND THEN
      IF stored.display_name IS DISTINCT FROM expected.display_name
        OR stored.sort_order IS DISTINCT FROM expected.sort_order OR NOT stored.active THEN
        RAISE EXCEPTION 'Gradebook catalog divergence requires review';
      END IF;
    ELSE
      INSERT INTO gradebook.score_columns(code, display_name, sort_order)
        VALUES (expected.code, expected.display_name, expected.sort_order);
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM gradebook.score_columns) <> 7 THEN
    RAISE EXCEPTION 'Gradebook unexpected catalog rows';
  END IF;
END;
$$;
-- END CATALOG SEED

ALTER TABLE gradebook.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook.score_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook.student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook.lookup_attempts ENABLE ROW LEVEL SECURITY;
-- No client policies. Reset inherited object defaults on every newly created object.
REVOKE ALL ON TABLE gradebook.classes, gradebook.students, gradebook.subjects,
  gradebook.score_columns, gradebook.student_scores, gradebook.lookup_attempts
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE gradebook.students_id_seq FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON gradebook.classes TO service_role;
GRANT SELECT ON gradebook.subjects, gradebook.score_columns TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON gradebook.students, gradebook.student_scores,
  gradebook.lookup_attempts TO service_role;
GRANT USAGE ON SEQUENCE gradebook.students_id_seq TO service_role;

-- Auth rows remain unreadable to service_role; only a boolean escapes this helper.
-- The caller is trusted server code that already verified JWT/user/session claims (B4).
CREATE FUNCTION gradebook.admin_session_ok(actor UUID, session UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles AS a
    JOIN auth.sessions AS s ON s.user_id = a.user_id
    WHERE a.user_id = actor AND a.active AND a.role = 'admin'
      AND s.id = session AND (s.not_after IS NULL OR s.not_after > statement_timestamp())
  );
$$;
ALTER FUNCTION gradebook.admin_session_ok(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION gradebook.admin_session_ok(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.admin_session_ok(UUID, UUID) TO service_role;
-- No global default-privilege change: B3 must explicitly revoke EVERY new gb_* signature.

-- Fail if pre-existing role inheritance unexpectedly defeats the browser deny boundary.
DO $$
DECLARE
  browser_role TEXT;
  relation_name TEXT;
BEGIN
  FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF pg_catalog.has_schema_privilege(browser_role, 'gradebook', 'USAGE')
      OR pg_catalog.has_schema_privilege(browser_role, 'gradebook', 'CREATE')
      OR pg_catalog.has_function_privilege(browser_role, 'gradebook.admin_session_ok(uuid,uuid)', 'EXECUTE')
      OR pg_catalog.has_sequence_privilege(browser_role, 'gradebook.students_id_seq', 'USAGE,SELECT,UPDATE')
    THEN
      RAISE EXCEPTION 'Gradebook unexpected browser privileges' USING ERRCODE = '42501';
    END IF;
    FOREACH relation_name IN ARRAY ARRAY['classes', 'students', 'subjects', 'score_columns', 'student_scores', 'lookup_attempts'] LOOP
      IF pg_catalog.has_table_privilege(browser_role, 'gradebook.' || relation_name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
        RAISE EXCEPTION 'Gradebook unexpected browser table privileges' USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
COMMIT;
