-- Gradebook security-only extension: count *failed* verified-identity attempts, never successful logins.
-- Applies after 20261027173327_gradebook_reveal_identity_context; old rows remain for expiry cleanup.
-- Invariants: no plaintext identity, service-role-only RPC, transactional per-identity serialization.
BEGIN;
SET LOCAL lock_timeout = '3s';

ALTER TABLE gradebook.lookup_attempts
  DROP CONSTRAINT lookup_attempts_scope_check,
  DROP CONSTRAINT lookup_attempts_check1,
  ADD CONSTRAINT lookup_attempts_scope_check
    CHECK (scope IN ('pair_global_minute','pair_global_window','pair_identity_window',
      'pair_identity_failed_window','read_global_minute')),
  ADD CONSTRAINT lookup_attempts_check1
    CHECK (
      (scope IN ('pair_identity_window','pair_identity_failed_window') AND octet_length(key)=32)
      OR (scope NOT IN ('pair_identity_window','pair_identity_failed_window') AND octet_length(key)=0)
    );

-- Existing global quotas stay exactly the same. The identity_lookup argument remains
-- for old deployed clients, but no longer increases a per-identity count.
CREATE OR REPLACE FUNCTION public.gb_limit(reading BOOLEAN, identity_lookup TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE t TIMESTAMPTZ:=statement_timestamp(); start_min TIMESTAMPTZ; start_window TIMESTAMPTZ;
  scopes TEXT[]; scope_name TEXT; start_time TIMESTAMPTZ; cap INTEGER; duration INTERVAL;
  charged INTEGER; allowed BOOLEAN:=true; retry INTEGER:=1;
BEGIN
  PERFORM gradebook.require(reading IS NOT NULL AND (identity_lookup IS NULL OR identity_lookup ~ '^[0-9a-f]{64}$'));
  start_min:=to_timestamp(floor(extract(epoch FROM t)/60)*60);
  start_window:=to_timestamp(floor(extract(epoch FROM t)/900)*900);
  scopes:=CASE WHEN reading THEN ARRAY['read_global_minute'] ELSE ARRAY['pair_global_minute','pair_global_window'] END;
  FOREACH scope_name IN ARRAY scopes LOOP
    start_time:=CASE WHEN scope_name='pair_global_window' THEN start_window ELSE start_min END;
    duration:=CASE WHEN scope_name='pair_global_window' THEN interval '15 minutes' ELSE interval '1 minute' END;
    cap:=CASE scope_name WHEN 'pair_global_window' THEN 300 WHEN 'read_global_minute' THEN 120 ELSE 60 END;
    INSERT INTO gradebook.lookup_attempts(scope,key,window_start,attempts,expires_at)
      VALUES(scope_name,''::bytea,start_time,1,start_time+duration+interval '30 minutes')
      ON CONFLICT(scope,key,window_start)
      DO UPDATE SET attempts=least(lookup_attempts.attempts+1,cap+1)
      RETURNING attempts INTO charged;
    IF charged>cap THEN
      allowed:=false;
      retry:=greatest(retry,ceil(extract(epoch FROM start_time+duration-t))::int);
    END IF;
  END LOOP;
  -- Existing bounded expiry cleanup, never touches active failure counters.
  DELETE FROM gradebook.lookup_attempts WHERE (scope,key,window_start) IN
    (SELECT scope,key,window_start FROM gradebook.lookup_attempts
      WHERE expires_at<t ORDER BY expires_at,scope,key,window_start LIMIT 500 FOR UPDATE SKIP LOCKED);
  RETURN jsonb_build_object('allowed',allowed,'retryAfter',CASE WHEN allowed THEN 0 ELSE retry END);
END;
$$;

-- All of the following occurs in one PostgreSQL transaction/row lock. The
-- first ten bad DOBs return a neutral failed verification; the eleventh request
-- (even if correct) is limited until the end of this fifteen-minute window.
-- Successful pair matches never increment attempts, including repeated success.
CREATE OR REPLACE FUNCTION public.gb_pair_check(
  cid UUID, lookup TEXT, birth_date TEXT, key_version INTEGER
) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE
  t TIMESTAMPTZ:=statement_timestamp();
  start_window TIMESTAMPTZ;
  attempt_key BYTEA;
  failed INTEGER;
  retry INTEGER;
  c gradebook.classes;
  s gradebook.students;
  d DATE;
BEGIN
  PERFORM gradebook.require(
    cid IS NOT NULL AND lookup IS NOT NULL AND lookup ~ '^[0-9a-f]{64}$'
    AND key_version IS NOT NULL AND key_version > 0
  );
  d:=gradebook.dob(birth_date,(t AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
  PERFORM 1 FROM gradebook.classes WHERE id=cid FOR SHARE;
  SELECT * INTO c FROM gradebook.classes
    WHERE id=cid AND is_active AND lookup_key_version=key_version;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',true,'retryAfter',0,'pair',NULL);
  END IF;

  start_window:=to_timestamp(floor(extract(epoch FROM t)/900)*900);
  attempt_key:=decode(lookup,'hex');
  -- The UPSERT acquires and keeps the row lock while comparing DOB + updating
  -- the same identity/window; it prevents simultaneous wrong attempts bypassing cap.
  INSERT INTO gradebook.lookup_attempts(scope,key,window_start,attempts,expires_at)
    VALUES('pair_identity_failed_window',attempt_key,start_window,0,
      start_window + interval '45 minutes')
    ON CONFLICT(scope,key,window_start)
    DO UPDATE SET expires_at=EXCLUDED.expires_at
    RETURNING attempts INTO failed;

  IF failed >= 10 THEN
    retry:=greatest(1,ceil(extract(epoch FROM start_window+interval '15 minutes'-t))::int);
    RETURN jsonb_build_object('allowed',false,'retryAfter',retry,'pair',NULL);
  END IF;

  SELECT * INTO s FROM gradebook.students
    WHERE class_id=cid AND identity_lookup=attempt_key
      AND students.birth_date=d AND active AND lookup_key_version=key_version;

  IF NOT FOUND THEN
    UPDATE gradebook.lookup_attempts SET attempts=least(attempts+1,10)
      WHERE scope='pair_identity_failed_window'
        AND key=attempt_key AND window_start=start_window;
    RETURN jsonb_build_object('allowed',true,'retryAfter',0,'pair',NULL);
  END IF;

  RETURN jsonb_build_object('allowed',true,'retryAfter',0,'pair',
    jsonb_build_object('classId',cid,'studentId',s.id::text,
      'classEpoch',c.access_version::text,'studentEpoch',s.capability_version::text,
      'class',gradebook.class_dto(c)));
END;
$$;

-- Fail closed if ACL was changed by a previous deployment.
REVOKE ALL ON FUNCTION public.gb_limit(BOOLEAN,TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_limit(BOOLEAN,TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.gb_pair_check(UUID,TEXT,TEXT,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_pair_check(UUID,TEXT,TEXT,INTEGER) TO service_role;

COMMIT;
