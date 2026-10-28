-- B3 DRAFT ONLY. Apply only to an explicitly authorized disposable database.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
DO $$
BEGIN
  IF NOT pg_catalog.has_table_privilege('service_role','public.audit_logs','INSERT')
    OR NOT pg_catalog.has_sequence_privilege('service_role','public.audit_logs_id_seq','USAGE') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='audit_prerequisites';
  END IF;
END;
$$;

CREATE FUNCTION gradebook.frame(value TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN value IS NULL THEN 'N' ELSE 'V' || octet_length(convert_to(value,'UTF8'))::text || ':' || value END;
$$;
CREATE FUNCTION gradebook.tuple(tag TEXT, fields TEXT[]) RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT gradebook.frame(tag) || coalesce(string_agg(gradebook.frame(v),'' ORDER BY n),'') FROM unnest(fields) WITH ORDINALITY AS t(v,n);
$$;
CREATE FUNCTION gradebook.require(ok BOOLEAN, code TEXT DEFAULT 'invalid') RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE=code; END IF;
END;
$$;
CREATE FUNCTION gradebook.fields(value JSONB, allowed TEXT[], required TEXT[]) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM gradebook.require(jsonb_typeof(value)='object');
  PERFORM gradebook.require(NOT EXISTS(SELECT 1 FROM jsonb_object_keys(value) k WHERE NOT k=ANY(allowed)) AND value ?& required);
END;
$$;
CREATE FUNCTION gradebook.score(value JSONB) RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE t TEXT := value #>> '{}';
BEGIN
  PERFORM gradebook.require(jsonb_typeof(value)='string' AND length(t)<=32 AND t ~ '^[0-9]+([.][0-9]{1,5})?$','score');
  PERFORM gradebook.require(t::numeric BETWEEN 0 AND 10,'score');
  RETURN t::numeric;
END;
$$;
CREATE FUNCTION gradebook.dob(value TEXT, today DATE) RETURNS DATE
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE d DATE;
BEGIN
  PERFORM gradebook.require(value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$','date');
  BEGIN d := value::date; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='date'; END;
  PERFORM gradebook.require(d BETWEEN DATE '0001-01-01' AND today AND to_char(d,'YYYY-MM-DD')=value,'date');
  RETURN d;
END;
$$;
CREATE FUNCTION gradebook.name(value TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE t TEXT;
BEGIN
  PERFORM gradebook.require(length(value)<=4096,'name');
  t := btrim(value,U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
  PERFORM gradebook.require(length(t)<=200,'name');
  RETURN nullif(t,'');
END;
$$;
-- Lock first, then inspect fresh READ COMMITTED state and current authorization.
CREATE FUNCTION gradebook.lock_admin(actor UUID, session UUID, cid UUID, writing BOOLEAN)
RETURNS gradebook.classes LANGUAGE plpgsql VOLATILE SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes;
BEGIN
  IF writing THEN PERFORM 1 FROM gradebook.classes WHERE id=cid FOR UPDATE;
  ELSE PERFORM 1 FROM gradebook.classes WHERE id=cid FOR SHARE; END IF;
  IF NOT gradebook.admin_session_ok(actor,session) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='authorization'; END IF;
  SELECT * INTO c FROM gradebook.classes WHERE id=cid;
  IF NOT FOUND OR NOT c.is_active THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='class_unavailable'; END IF;
  RETURN c;
END;
$$;
CREATE FUNCTION gradebook.audit(actor UUID, cid UUID, event TEXT, changed INTEGER DEFAULT 1) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM gradebook.require(event=ANY(ARRAY['class_create','class_patch','student_create','student_patch','student_status','student_delete','score_put','score_delete','semester_publish','semester_unpublish','roster_upsert','scores_upsert','student_reveal']) AND changed>=0);
  INSERT INTO public.audit_logs(actor_id,target_id,action) VALUES(actor,cid,'gradebook:'||event||':count='||changed::text);
END;
$$;
CREATE FUNCTION gradebook.student_dto(s gradebook.students) RETURNS JSONB
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object('id',s.id::text,'classId',s.class_id,'fullName',s.full_name,'birthDate',to_char(s.birth_date,'YYYY-MM-DD'),'active',s.active,'revision',s.revision::text);
$$;
CREATE FUNCTION gradebook.class_dto(c gradebook.classes) RETURNS JSONB
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object('id',c.id,'name',c.name,'schoolYear',c.school_year,'revision',c.revision::text,'semester1Published',c.semester_1_published_at IS NOT NULL,'semester2Published',c.semester_2_published_at IS NOT NULL);
$$;
CREATE FUNCTION public.gb_class_create(actor UUID, session UUID, name TEXT, school_year TEXT) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes;
BEGIN
  IF NOT gradebook.admin_session_ok(actor,session) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='authorization'; END IF;
  -- The one-active-class unique index arbitrates concurrent initial setup.
  INSERT INTO gradebook.classes(name,school_year) VALUES(name,school_year) RETURNING * INTO c;
  PERFORM gradebook.audit(actor,c.id,'class_create'); RETURN gradebook.class_dto(c);
END;
$$;
CREATE FUNCTION public.gb_class_read(actor UUID, session UUID, cid UUID) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
BEGIN RETURN gradebook.class_dto(gradebook.lock_admin(actor,session,cid,false)); END;
$$;
CREATE FUNCTION public.gb_class_patch(actor UUID, session UUID, cid UUID, expected BIGINT, name TEXT, school_year TEXT) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes;
BEGIN
  c:=gradebook.lock_admin(actor,session,cid,true);
  IF c.revision IS DISTINCT FROM expected THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='stale'; END IF;
  IF (c.name,c.school_year) IS DISTINCT FROM (name,school_year) THEN
    UPDATE gradebook.classes SET name=gb_class_patch.name,school_year=gb_class_patch.school_year,revision=revision+1,updated_at=now() WHERE id=cid RETURNING * INTO c;
    PERFORM gradebook.audit(actor,cid,'class_patch');
  END IF;
  RETURN gradebook.class_dto(c);
END;
$$;
CREATE FUNCTION public.gb_semester_set(actor UUID, session UUID, cid UUID, semester SMALLINT, published BOOLEAN, expected BIGINT, confirmed BOOLEAN, acknowledge_missing BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; missing BIGINT;
BEGIN
  c:=gradebook.lock_admin(actor,session,cid,true);
  PERFORM gradebook.require(semester IN(1,2) AND published IS NOT NULL AND confirmed);
  IF c.revision IS DISTINCT FROM expected THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='stale'; END IF;
  SELECT count(*) INTO missing FROM gradebook.students s CROSS JOIN gradebook.subjects u CROSS JOIN gradebook.score_columns k
    WHERE s.class_id=cid AND s.active AND u.active AND k.active AND NOT EXISTS(SELECT 1 FROM gradebook.student_scores x WHERE x.student_id=s.id AND x.semester=gb_semester_set.semester AND x.subject_code=u.code AND x.score_column_code=k.code);
  PERFORM gradebook.require(NOT published OR missing=0 OR acknowledge_missing,'missing_acknowledgement');
  IF (CASE semester WHEN 1 THEN c.semester_1_published_at ELSE c.semester_2_published_at END IS NOT NULL) IS DISTINCT FROM published THEN
    UPDATE gradebook.classes SET semester_1_published_at=CASE WHEN semester=1 THEN CASE WHEN published THEN now() END ELSE semester_1_published_at END,
      semester_2_published_at=CASE WHEN semester=2 THEN CASE WHEN published THEN now() END ELSE semester_2_published_at END,
      revision=revision+1,updated_at=now() WHERE id=cid RETURNING * INTO c;
    PERFORM gradebook.audit(actor,cid,CASE WHEN published THEN 'semester_publish' ELSE 'semester_unpublish' END);
  END IF;
  RETURN gradebook.class_dto(c);
END;
$$;
-- Identity material comes exclusively from B4. No key or plaintext document enters SQL.
CREATE FUNCTION gradebook.identity(value JSONB, key_version INTEGER) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM gradebook.require(jsonb_typeof(value->'lookup')='string' AND value->>'lookup' ~ '^[0-9a-f]{64}$'
    AND jsonb_typeof(value->'lookupKeyVersion')='number' AND value->>'lookupKeyVersion'=key_version::text,'identity');
  PERFORM gradebook.require(jsonb_typeof(value->'ciphertext')='string' AND value->>'ciphertext' ~ '^([0-9a-f]{2}){25,28}$'
    AND jsonb_typeof(value->'nonce')='string' AND value->>'nonce' ~ '^[0-9a-f]{24}$'
    AND jsonb_typeof(value->'encKid')='string' AND length(value->>'encKid') BETWEEN 1 AND 32,'identity');
END;
$$;
CREATE FUNCTION public.gb_student_create(actor UUID, session UUID, cid UUID, value JSONB) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; s gradebook.students; d DATE; n TEXT;
BEGIN
  c:=gradebook.lock_admin(actor,session,cid,true);
  PERFORM gradebook.fields(value,ARRAY['lookup','lookupKeyVersion','ciphertext','nonce','encKid','birthDate','fullName'],ARRAY['lookup','lookupKeyVersion','ciphertext','nonce','encKid','birthDate']);
  PERFORM gradebook.identity(value,c.lookup_key_version);
  PERFORM gradebook.require(jsonb_typeof(value->'birthDate')='string' AND (NOT value?'fullName' OR jsonb_typeof(value->'fullName')='string'));
  d:=gradebook.dob(value->>'birthDate',(statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
  IF value?'fullName' THEN n:=gradebook.name(value->>'fullName'); END IF;
  INSERT INTO gradebook.students(class_id,full_name,birth_date,identity_ciphertext,identity_nonce,identity_enc_kid,identity_lookup,lookup_key_version)
    VALUES(cid,n,d,decode(value->>'ciphertext','hex'),decode(value->>'nonce','hex'),value->>'encKid',decode(value->>'lookup','hex'),c.lookup_key_version) RETURNING * INTO s;
  PERFORM gradebook.audit(actor,cid,'student_create'); RETURN gradebook.student_dto(s);
END;
$$;
CREATE FUNCTION public.gb_students_list(actor UUID, session UUID, cid UUID, after_id BIGINT DEFAULT 0, page_size INTEGER DEFAULT 100) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
BEGIN
  PERFORM gradebook.lock_admin(actor,session,cid,false);
  PERFORM gradebook.require(after_id>=0 AND page_size BETWEEN 1 AND 200);
  RETURN (SELECT coalesce(jsonb_agg(gradebook.student_dto(t) ORDER BY t.id),'[]') FROM (SELECT * FROM gradebook.students WHERE class_id=cid AND id>after_id ORDER BY id LIMIT page_size) t);
END;
$$;
CREATE FUNCTION public.gb_student_read(actor UUID, session UUID, cid UUID, sid BIGINT, reveal BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE s gradebook.students;
BEGIN
  PERFORM gradebook.lock_admin(actor,session,cid,reveal);
  SELECT * INTO s FROM gradebook.students WHERE id=sid AND class_id=cid;
  PERFORM gradebook.require(FOUND,'not_found');
  IF reveal THEN
    PERFORM gradebook.audit(actor,cid,'student_reveal');
    RETURN gradebook.student_dto(s)||jsonb_build_object('ciphertext',encode(s.identity_ciphertext,'hex'),'nonce',encode(s.identity_nonce,'hex'),'encKid',s.identity_enc_kid,'algVersion',s.identity_alg_version);
  END IF;
  RETURN gradebook.student_dto(s);
END;
$$;
CREATE FUNCTION public.gb_student_patch(actor UUID, session UUID, cid UUID, sid BIGINT, expected BIGINT, value JSONB) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; s gradebook.students; n TEXT; d DATE; identity_change BOOLEAN; changed BOOLEAN;
BEGIN
  c:=gradebook.lock_admin(actor,session,cid,true);
  SELECT * INTO s FROM gradebook.students WHERE class_id=cid AND id=sid FOR UPDATE;
  IF NOT FOUND OR s.revision IS DISTINCT FROM expected THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='stale'; END IF;
  PERFORM gradebook.fields(value,ARRAY['fullName','birthDate','lookup','lookupKeyVersion','ciphertext','nonce','encKid'],ARRAY[]::text[]);
  n:=s.full_name; d:=s.birth_date;
  IF value?'fullName' THEN PERFORM gradebook.require(jsonb_typeof(value->'fullName') IN('string','null')); n:=CASE WHEN value->'fullName'='null'::jsonb THEN NULL ELSE gradebook.name(value->>'fullName') END; END IF;
  IF value?'birthDate' THEN PERFORM gradebook.require(jsonb_typeof(value->'birthDate')='string'); d:=gradebook.dob(value->>'birthDate',(statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date); END IF;
  identity_change:=value ?| ARRAY['lookup','lookupKeyVersion','ciphertext','nonce','encKid'];
  IF identity_change THEN PERFORM gradebook.identity(value,c.lookup_key_version); END IF;
  changed:=(n,d) IS DISTINCT FROM (s.full_name,s.birth_date) OR identity_change;
  IF changed THEN
    UPDATE gradebook.students SET full_name=n,birth_date=d,
      identity_lookup=CASE WHEN identity_change THEN decode(value->>'lookup','hex') ELSE identity_lookup END,
      identity_ciphertext=CASE WHEN identity_change THEN decode(value->>'ciphertext','hex') ELSE identity_ciphertext END,
      identity_nonce=CASE WHEN identity_change THEN decode(value->>'nonce','hex') ELSE identity_nonce END,
      identity_enc_kid=CASE WHEN identity_change THEN value->>'encKid' ELSE identity_enc_kid END,
      lookup_key_version=c.lookup_key_version,revision=revision+1,updated_at=now(),
      capability_version=capability_version+CASE WHEN identity_change OR d<>s.birth_date THEN 1 ELSE 0 END WHERE id=sid RETURNING * INTO s;
    PERFORM gradebook.audit(actor,cid,'student_patch');
  END IF;
  RETURN gradebook.student_dto(s);
END;
$$;
CREATE FUNCTION public.gb_student_status(actor UUID, session UUID, cid UUID, sid BIGINT, expected BIGINT, active BOOLEAN, confirmed BOOLEAN) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE s gradebook.students;
BEGIN
  PERFORM gradebook.lock_admin(actor,session,cid,true); PERFORM gradebook.require(active IS NOT NULL AND confirmed);
  SELECT * INTO s FROM gradebook.students WHERE id=sid AND class_id=cid FOR UPDATE;
  IF NOT FOUND OR s.revision IS DISTINCT FROM expected THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='stale'; END IF;
  IF s.active IS DISTINCT FROM active THEN
    UPDATE gradebook.students SET active=gb_student_status.active,revision=revision+1,capability_version=capability_version+1,updated_at=now() WHERE id=sid RETURNING * INTO s;
    PERFORM gradebook.audit(actor,cid,'student_status');
  END IF;
  RETURN gradebook.student_dto(s);
END;
$$;
CREATE FUNCTION public.gb_student_delete(actor UUID, session UUID, cid UUID, sid BIGINT, expected BIGINT, confirmed BOOLEAN) RETURNS VOID
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE s gradebook.students;
BEGIN
  PERFORM gradebook.lock_admin(actor,session,cid,true); PERFORM gradebook.require(confirmed);
  SELECT * INTO s FROM gradebook.students WHERE id=sid AND class_id=cid FOR UPDATE;
  IF NOT FOUND OR s.revision IS DISTINCT FROM expected THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='stale'; END IF;
  DELETE FROM gradebook.students WHERE id=sid;
  PERFORM gradebook.audit(actor,cid,'student_delete');
END;
$$;
CREATE FUNCTION public.gb_score_put(actor UUID, session UUID, cid UUID, sid BIGINT, semester SMALLINT, subject TEXT, col TEXT, expected BIGINT, value JSONB, acknowledged BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; x gradebook.student_scores; v NUMERIC;
BEGIN
  c:=gradebook.lock_admin(actor,session,cid,true);
  PERFORM gradebook.require(semester IN(1,2) AND EXISTS(SELECT 1 FROM gradebook.students WHERE id=sid AND class_id=cid));
  PERFORM gradebook.require((CASE semester WHEN 1 THEN c.semester_1_published_at ELSE c.semester_2_published_at END IS NULL) OR acknowledged,'published_acknowledgement');
  PERFORM gradebook.require(EXISTS(SELECT 1 FROM gradebook.subjects WHERE code=subject AND active) AND EXISTS(SELECT 1 FROM gradebook.score_columns WHERE code=col AND active));
  v:=gradebook.score(value);
  SELECT * INTO x FROM gradebook.student_scores WHERE student_id=sid AND student_scores.semester=gb_score_put.semester AND subject_code=subject AND score_column_code=col FOR UPDATE;
  IF x.revision IS DISTINCT FROM expected THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='stale'; END IF;
  IF x.student_id IS NULL THEN
    INSERT INTO gradebook.student_scores(student_id,semester,subject_code,score_column_code,score,updated_by) VALUES(sid,semester,subject,col,v,actor);
  ELSIF x.score IS DISTINCT FROM v THEN
    UPDATE gradebook.student_scores SET score=v,revision=revision+1,updated_at=now(),updated_by=actor WHERE student_id=sid AND student_scores.semester=gb_score_put.semester AND subject_code=subject AND score_column_code=col;
  ELSE RETURN jsonb_build_object('changed',false); END IF;
  PERFORM gradebook.audit(actor,cid,'score_put'); RETURN jsonb_build_object('changed',true);
END;
$$;
CREATE FUNCTION public.gb_score_delete(actor UUID, session UUID, cid UUID, sid BIGINT, semester SMALLINT, subject TEXT, col TEXT, expected BIGINT, confirmed BOOLEAN, acknowledged BOOLEAN DEFAULT false) RETURNS VOID
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; x gradebook.student_scores;
BEGIN
  c:=gradebook.lock_admin(actor,session,cid,true);
  PERFORM gradebook.require(confirmed AND semester IN(1,2) AND EXISTS(SELECT 1 FROM gradebook.students WHERE id=sid AND class_id=cid));
  PERFORM gradebook.require((CASE semester WHEN 1 THEN c.semester_1_published_at ELSE c.semester_2_published_at END IS NULL) OR acknowledged);
  SELECT * INTO x FROM gradebook.student_scores WHERE student_id=sid AND student_scores.semester=gb_score_delete.semester AND subject_code=subject AND score_column_code=col FOR UPDATE;
  IF NOT FOUND OR x.revision IS DISTINCT FROM expected THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='stale'; END IF;
  DELETE FROM gradebook.student_scores WHERE student_id=sid AND student_scores.semester=gb_score_delete.semester AND subject_code=subject AND score_column_code=col;
  PERFORM gradebook.audit(actor,cid,'score_delete');
END;
$$;
-- A single planner is shared by preview and apply. Results never cross the B4 browser DTO boundary.
CREATE FUNCTION gradebook.plan(c gradebook.classes, kind TEXT, semester SMALLINT, headers JSONB, rows JSONB)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE r JSONB; s gradebook.students; x gradebook.student_scores; sub TEXT; k RECORD; cell JSONB; v NUMERIC;
  today DATE := (statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  d DATE; n TEXT; pos BIGINT:=1; rownum BIGINT; width INTEGER; seen TEXT[]:=ARRAY[]::text[]; targets TEXT[]:=ARRAY[]::text[];
  students JSONB:='{}'; scores JSONB:='{}'; writes JSONB:='[]'; errors JSONB:='[]';
  ins INTEGER:=0; upd INTEGER:=0; unchanged INTEGER:=0; skipped INTEGER:=0;
  errcol INTEGER; key TEXT; transcript TEXT; record_item RECORD; st TEXT;
BEGIN
  PERFORM gradebook.require(kind IN('roster','scores') AND jsonb_typeof(headers)='array' AND jsonb_typeof(rows)='array');
  width:=jsonb_array_length(headers);
  PERFORM gradebook.require((kind='roster' AND width IN(2,3)) OR (kind='scores' AND width=10 AND semester IN(1,2)));
  PERFORM gradebook.require(jsonb_array_length(rows) BETWEEN 1 AND 2000 AND octet_length(rows::text)<=4194304);
  PERFORM gradebook.require(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(headers) h WHERE jsonb_typeof(h)<>'string' OR length(h#>>'{}')>4096));
  IF kind='scores' THEN PERFORM gradebook.require((CASE semester WHEN 1 THEN c.semester_1_published_at ELSE c.semester_2_published_at END) IS NULL,'published'); END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(rows) LOOP
    rownum:=NULL; errcol:=1;
    BEGIN
      PERFORM gradebook.fields(r,CASE WHEN kind='roster' THEN ARRAY['row','lookup','lookupKeyVersion','birthDate','fullName','ciphertext','nonce','encKid'] ELSE ARRAY['row','lookup','lookupKeyVersion','birthDate','subjectName','scores'] END,
        ARRAY['row','lookup','lookupKeyVersion','birthDate']);
      PERFORM gradebook.require(jsonb_typeof(r->'row')='number' AND r->>'row' ~ '^[0-9]{1,16}$');
      rownum:=(r->>'row')::bigint;
      PERFORM gradebook.require(rownum>pos AND rownum<=9007199254740991); pos:=rownum;
      errcol:=CASE WHEN kind='roster' AND width=3 THEN 2 ELSE 1 END;
      PERFORM gradebook.require(jsonb_typeof(r->'lookup')='string' AND r->>'lookup' ~ '^[0-9a-f]{64}$' AND r->>'lookupKeyVersion'=c.lookup_key_version::text AND jsonb_typeof(r->'lookupKeyVersion')='number');
      key:=r->>'lookup';
      IF kind='roster' THEN PERFORM gradebook.require(NOT key=ANY(seen),'duplicate_identity'); seen:=array_append(seen,key); END IF;
      errcol:=errcol+1;
      PERFORM gradebook.require(jsonb_typeof(r->'birthDate')='string'); d:=gradebook.dob(r->>'birthDate',today);
      SELECT * INTO s FROM gradebook.students WHERE class_id=c.id AND identity_lookup=decode(key,'hex');
      st:=gradebook.tuple(CASE WHEN s.id IS NULL THEN 'student_missing' ELSE 'student_existing' END,ARRAY[c.lookup_key_version::text,key,CASE WHEN s.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END]);
      IF s.id IS NOT NULL THEN
        -- Append scalars without an extra record tag; fields follow the approved existing prefix.
        st:=gradebook.tuple('student_existing',ARRAY[c.lookup_key_version::text,key,'EXISTS',s.id::text,s.revision::text,s.class_id::text,encode(s.identity_lookup,'hex'),s.lookup_key_version::text,to_char(s.birth_date,'YYYY-MM-DD'),s.full_name,(s.active::int)::text,s.capability_version::text,s.identity_alg_version::text,s.identity_enc_kid,encode(s.identity_nonce,'hex'),encode(s.identity_ciphertext,'hex'),((s.birth_date=d)::int)::text]);
      END IF;
      students:=students||jsonb_build_object(key,st);
      PERFORM gradebook.require(s.id IS NULL OR (s.birth_date=d AND s.lookup_key_version=c.lookup_key_version),'identity_conflict');
      IF kind='roster' THEN
        errcol:=1; n:=NULL;
        PERFORM gradebook.require(width=3 OR NOT r?'fullName');
        IF r?'fullName' THEN PERFORM gradebook.require(jsonb_typeof(r->'fullName')='string'); n:=gradebook.name(r->>'fullName'); END IF;
        IF s.id IS NULL THEN
          PERFORM gradebook.identity(r,c.lookup_key_version); ins:=ins+1;
          writes:=writes||jsonb_build_array(jsonb_build_object('op','student_insert','row',r,'name',n));
        ELSIF n IS NOT NULL AND n IS DISTINCT FROM s.full_name THEN
          upd:=upd+1; writes:=writes||jsonb_build_array(jsonb_build_object('op','student_update','id',s.id::text,'name',n));
        ELSE unchanged:=unchanged+1; END IF;
      ELSE
        PERFORM gradebook.require(s.id IS NOT NULL AND s.active,'student_unavailable'); errcol:=3;
        PERFORM gradebook.require(jsonb_typeof(r->'subjectName')='string');
        SELECT code INTO sub FROM gradebook.subjects WHERE display_name=r->>'subjectName' AND active;
        PERFORM gradebook.require(FOUND,'subject');
        PERFORM gradebook.require(jsonb_typeof(r->'scores')='array' AND jsonb_array_length(r->'scores')=7,'columns');
        FOR k IN SELECT code,sort_order FROM gradebook.score_columns ORDER BY sort_order LOOP
          PERFORM gradebook.require(k.sort_order BETWEEN 1 AND 7 AND (SELECT active FROM gradebook.score_columns WHERE code=k.code),'catalog');
          errcol:=k.sort_order+3; cell:=r->'scores'->(k.sort_order-1);
          IF cell='null'::jsonb OR cell='""'::jsonb THEN skipped:=skipped+1; CONTINUE; END IF;
          v:=gradebook.score(cell); key:=s.id::text||':'||semester::text||':'||sub||':'||k.code;
          PERFORM gradebook.require(NOT key=ANY(targets),'duplicate_coordinate'); targets:=array_append(targets,key);
          SELECT * INTO x FROM gradebook.student_scores WHERE student_id=s.id AND student_scores.semester=plan.semester AND subject_code=sub AND score_column_code=k.code;
          scores:=scores||jsonb_build_object(key,jsonb_build_object('id',s.id::text,'subject',sub,'col',k.code,'transcript',
            gradebook.tuple(CASE WHEN x.student_id IS NULL THEN 'score_missing' ELSE 'score_existing' END,
              CASE WHEN x.student_id IS NULL THEN ARRAY[s.id::text,semester::text,sub,k.code,'MISSING'] ELSE ARRAY[s.id::text,semester::text,sub,k.code,'EXISTS',x.revision::text,trim_scale(x.score)::text] END)));
          IF x.student_id IS NULL THEN ins:=ins+1;
          ELSIF x.score IS DISTINCT FROM v THEN upd:=upd+1;
          ELSE unchanged:=unchanged+1; CONTINUE; END IF;
          writes:=writes||jsonb_build_array(jsonb_build_object('op','score','id',s.id::text,'subject',sub,'col',k.code,'value',trim_scale(v)::text));
        END LOOP;
      END IF;
    EXCEPTION WHEN SQLSTATE '22023' THEN
      errors:=errors||jsonb_build_array(jsonb_build_object('row',rownum,'column',errcol,'code','invalid'));
    END;
  END LOOP;
  transcript:=gradebook.tuple('context',ARRAY['1',kind,c.id::text,semester::text,c.revision::text,c.name,c.school_year,(c.is_active::int)::text,c.access_version::text,c.lookup_key_version::text,
    (extract(epoch FROM c.semester_1_published_at)*1000000)::bigint::text,(extract(epoch FROM c.semester_2_published_at)*1000000)::bigint::text]);
  transcript:=transcript||gradebook.frame((SELECT count(*)::text FROM gradebook.subjects));
  FOR record_item IN SELECT * FROM gradebook.subjects ORDER BY code COLLATE "C" LOOP transcript:=transcript||gradebook.tuple('subject',ARRAY[record_item.code,record_item.display_name,record_item.sort_order::text,(record_item.active::int)::text]); END LOOP;
  transcript:=transcript||gradebook.frame((SELECT count(*)::text FROM gradebook.score_columns));
  FOR record_item IN SELECT * FROM gradebook.score_columns ORDER BY code COLLATE "C" LOOP transcript:=transcript||gradebook.tuple('column',ARRAY[record_item.code,record_item.display_name,record_item.sort_order::text,(record_item.active::int)::text]); END LOOP;
  transcript:=transcript||gradebook.frame((SELECT count(*)::text FROM jsonb_each(students)));
  FOR record_item IN SELECT j.value FROM jsonb_each_text(students) j ORDER BY j.key COLLATE "C" LOOP transcript:=transcript||record_item.value; END LOOP;
  transcript:=transcript||gradebook.frame((SELECT count(*)::text FROM jsonb_each(scores)));
  FOR record_item IN SELECT value FROM jsonb_each(scores) ORDER BY (value->>'id')::bigint,(value->>'subject') COLLATE "C",(value->>'col') COLLATE "C" LOOP transcript:=transcript||(record_item.value->>'transcript'); END LOOP;
  RETURN jsonb_build_object('counts',jsonb_build_object('insert',ins,'update',upd,'unchanged',unchanged,'error',jsonb_array_length(errors),'skippedBlank',skipped),'errors',errors,
    'internalStateHash',CASE WHEN errors='[]'::jsonb THEN encode(sha256(convert_to(transcript,'UTF8')),'hex') END,'writes',writes);
END;
$$;
CREATE FUNCTION gradebook.import_run(actor UUID, session UUID, cid UUID, kind TEXT, semester SMALLINT, headers JSONB, rows JSONB, applying BOOLEAN, expected TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; p JSONB; w JSONB; r JSONB; changed INTEGER;
BEGIN
  c:=gradebook.lock_admin(actor,session,cid,applying);
  p:=gradebook.plan(c,kind,semester,headers,rows);
  IF NOT applying THEN RETURN p-'writes'; END IF;
  IF expected IS NULL OR expected !~ '^[0-9a-f]{64}$' OR p->>'internalStateHash' IS DISTINCT FROM expected OR (p->'counts'->>'error')::int<>0 THEN
    RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='stale_or_invalid_preview';
  END IF;
  FOR w IN SELECT value FROM jsonb_array_elements(p->'writes') LOOP
    IF w->>'op'='student_insert' THEN
      r:=w->'row';
      INSERT INTO gradebook.students(class_id,full_name,birth_date,identity_ciphertext,identity_nonce,identity_enc_kid,identity_lookup,lookup_key_version)
        VALUES(cid,w->>'name',(r->>'birthDate')::date,decode(r->>'ciphertext','hex'),decode(r->>'nonce','hex'),r->>'encKid',decode(r->>'lookup','hex'),c.lookup_key_version);
    ELSIF w->>'op'='student_update' THEN
      UPDATE gradebook.students SET full_name=w->>'name',revision=revision+1,updated_at=now() WHERE id=(w->>'id')::bigint AND class_id=cid;
    ELSE
      INSERT INTO gradebook.student_scores(student_id,semester,subject_code,score_column_code,score,updated_by)
        VALUES((w->>'id')::bigint,semester,w->>'subject',w->>'col',(w->>'value')::numeric,actor)
        ON CONFLICT ON CONSTRAINT student_scores_pkey DO UPDATE SET score=excluded.score,updated_by=excluded.updated_by,revision=student_scores.revision+1,updated_at=now()
        WHERE student_scores.score IS DISTINCT FROM excluded.score;
    END IF;
  END LOOP;
  changed:=(p->'counts'->>'insert')::int+(p->'counts'->>'update')::int;
  PERFORM gradebook.audit(actor,cid,CASE WHEN kind='roster' THEN 'roster_upsert' ELSE 'scores_upsert' END,changed);
  RETURN (p-'writes'-'internalStateHash')||jsonb_build_object('committed',true);
END;
$$;

CREATE FUNCTION public.gb_roster_preview(actor UUID, session UUID, cid UUID, headers JSONB, rows JSONB) RETURNS JSONB
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
  SELECT gradebook.import_run(actor,session,cid,'roster',NULL::smallint,headers,rows,false,NULL);
$$;

CREATE FUNCTION public.gb_roster_apply(actor UUID, session UUID, cid UUID, headers JSONB, rows JSONB, expected TEXT) RETURNS JSONB
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
  SELECT gradebook.import_run(actor,session,cid,'roster',NULL::smallint,headers,rows,true,expected);
$$;

CREATE FUNCTION public.gb_scores_preview(actor UUID, session UUID, cid UUID, semester SMALLINT, headers JSONB, rows JSONB) RETURNS JSONB
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
  SELECT gradebook.import_run(actor,session,cid,'scores',semester,headers,rows,false,NULL);
$$;

CREATE FUNCTION public.gb_scores_apply(actor UUID, session UUID, cid UUID, semester SMALLINT, headers JSONB, rows JSONB, expected TEXT) RETURNS JSONB
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
  SELECT gradebook.import_run(actor,session,cid,'scores',semester,headers,rows,true,expected);
$$;

CREATE FUNCTION gradebook.lock_student(cid UUID, sid BIGINT, class_epoch BIGINT, student_epoch BIGINT, semester SMALLINT)
RETURNS VOID LANGUAGE plpgsql VOLATILE SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; s gradebook.students;
BEGIN
  PERFORM 1 FROM gradebook.classes WHERE id=cid FOR SHARE;
  SELECT * INTO c FROM gradebook.classes WHERE id=cid;
  SELECT * INTO s FROM gradebook.students WHERE id=sid AND class_id=cid;
  IF semester NOT IN(1,2) OR semester IS NULL OR c.id IS NULL OR s.id IS NULL OR NOT c.is_active OR NOT s.active
    OR c.access_version IS DISTINCT FROM class_epoch OR s.capability_version IS DISTINCT FROM student_epoch
    OR (CASE semester WHEN 1 THEN c.semester_1_published_at ELSE c.semester_2_published_at END) IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='unavailable';
  END IF;
END;
$$;
CREATE FUNCTION public.gb_student_grades(cid UUID, sid BIGINT, class_epoch BIGINT, student_epoch BIGINT, semester SMALLINT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
BEGIN
  PERFORM gradebook.lock_student(cid,sid,class_epoch,student_epoch,semester);
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('subjectCode',subject_code,'columnCode',score_column_code,'rawScore',trim_scale(score)::text) ORDER BY subject_code,score_column_code),'[]')
    FROM gradebook.student_scores WHERE student_id=sid AND student_scores.semester=gb_student_grades.semester);
END;
$$;
CREATE FUNCTION public.gb_histogram(cid UUID, sid BIGINT, class_epoch BIGINT, student_epoch BIGINT, semester SMALLINT, subject TEXT, col TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
BEGIN
  PERFORM gradebook.lock_student(cid,sid,class_epoch,student_epoch,semester);
  PERFORM gradebook.require(EXISTS(SELECT 1 FROM gradebook.subjects WHERE code=subject AND active) AND EXISTS(SELECT 1 FROM gradebook.score_columns WHERE code=col AND active));
  RETURN (SELECT jsonb_agg(jsonb_build_object('scoreBucket',to_char(b.n/10.0,'FM990.0'),'studentCount',coalesce(h.total,0)) ORDER BY b.n)
    FROM generate_series(0,100) b(n) LEFT JOIN (
      SELECT round(x.score,1) bucket,count(*) total FROM gradebook.student_scores x JOIN gradebook.students s ON s.id=x.student_id
      WHERE s.class_id=cid AND s.active AND x.semester=gb_histogram.semester AND subject_code=subject AND score_column_code=col GROUP BY round(x.score,1)
    ) h ON h.bucket=b.n/10.0);
END;
$$;
CREATE FUNCTION public.gb_pair_check(cid UUID, lookup TEXT, birth_date TEXT, key_version INTEGER)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; s gradebook.students; d DATE;
BEGIN
  PERFORM gradebook.require(lookup ~ '^[0-9a-f]{64}$');
  d:=gradebook.dob(birth_date,(statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
  PERFORM 1 FROM gradebook.classes WHERE id=cid FOR SHARE;
  SELECT * INTO c FROM gradebook.classes WHERE id=cid AND is_active AND lookup_key_version=key_version;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO s FROM gradebook.students WHERE class_id=cid AND identity_lookup=decode(lookup,'hex') AND students.birth_date=d AND active AND lookup_key_version=key_version;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('classId',cid,'studentId',s.id::text,'classEpoch',c.access_version::text,'studentEpoch',s.capability_version::text,'class',gradebook.class_dto(c));
END;
$$;
CREATE FUNCTION public.gb_lookup_context() RETURNS JSONB
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
  SELECT jsonb_build_object('classId',id,'lookupKeyVersion',lookup_key_version,
    'subjects',(SELECT jsonb_agg(jsonb_build_object('code',code,'displayName',display_name,'sortOrder',sort_order,'active',active) ORDER BY sort_order) FROM gradebook.subjects),
    'scoreColumns',(SELECT jsonb_agg(jsonb_build_object('code',code,'displayName',display_name,'sortOrder',sort_order,'active',active) ORDER BY sort_order) FROM gradebook.score_columns)) FROM gradebook.classes WHERE is_active;
$$;
CREATE FUNCTION public.gb_scores_read(actor UUID, session UUID, cid UUID, semester SMALLINT, after_id BIGINT DEFAULT 0, page_size INTEGER DEFAULT 100)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
BEGIN
  PERFORM gradebook.lock_admin(actor,session,cid,false);
  PERFORM gradebook.require(semester IN(1,2) AND after_id>=0 AND page_size BETWEEN 1 AND 200);
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('studentId',s.id::text,'scores',(SELECT coalesce(jsonb_agg(jsonb_build_object('subjectCode',x.subject_code,'columnCode',x.score_column_code,'rawScore',trim_scale(x.score)::text,'revision',x.revision::text)),'[]') FROM gradebook.student_scores x WHERE x.student_id=s.id AND x.semester=gb_scores_read.semester)) ORDER BY s.id),'[]')
    FROM (SELECT id FROM gradebook.students WHERE class_id=cid AND id>after_id ORDER BY id LIMIT page_size) s);
END;
$$;
-- Call and complete this RPC BEFORE the separate pair/read RPC. Denial is data, never an exception.
CREATE FUNCTION public.gb_limit(reading BOOLEAN, identity_lookup TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE t TIMESTAMPTZ:=statement_timestamp(); start_min TIMESTAMPTZ; start_window TIMESTAMPTZ;
  scopes TEXT[]; scope_name TEXT; key_bytes BYTEA; start_time TIMESTAMPTZ; cap INTEGER; duration INTERVAL;
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
    INSERT INTO gradebook.lookup_attempts(scope,key,window_start,attempts,expires_at) VALUES(scope_name,''::bytea,start_time,1,start_time+duration+interval '30 minutes')
      ON CONFLICT(scope,key,window_start) DO UPDATE SET attempts=least(lookup_attempts.attempts+1,cap+1) RETURNING attempts INTO charged;
    IF charged>cap THEN allowed:=false; retry:=greatest(retry,ceil(extract(epoch FROM start_time+duration-t))::int); END IF;
  END LOOP;
  IF allowed AND NOT reading AND identity_lookup IS NOT NULL THEN
    INSERT INTO gradebook.lookup_attempts(scope,key,window_start,attempts,expires_at) VALUES('pair_identity_window',decode(identity_lookup,'hex'),start_window,1,start_window+interval '45 minutes')
      ON CONFLICT(scope,key,window_start) DO UPDATE SET attempts=least(lookup_attempts.attempts+1,6) RETURNING attempts INTO charged;
    IF charged>5 THEN allowed:=false; retry:=greatest(1,ceil(extract(epoch FROM start_window+interval '15 minutes'-t))::int); END IF;
  END IF;
  -- The selected global row serializes this scope; SKIP LOCKED avoids cross-scope cleanup deadlocks.
  DELETE FROM gradebook.lookup_attempts WHERE (scope,key,window_start) IN
    (SELECT scope,key,window_start FROM gradebook.lookup_attempts WHERE expires_at<t ORDER BY expires_at,scope,key,window_start LIMIT 500 FOR UPDATE SKIP LOCKED);
  RETURN jsonb_build_object('allowed',allowed,'retryAfter',CASE WHEN allowed THEN 0 ELSE retry END);
END;
$$;

REVOKE ALL ON FUNCTION gradebook.frame(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.frame(TEXT) TO service_role;

REVOKE ALL ON FUNCTION gradebook.tuple(TEXT,TEXT[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.tuple(TEXT,TEXT[]) TO service_role;

REVOKE ALL ON FUNCTION gradebook.require(BOOLEAN,TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.require(BOOLEAN,TEXT) TO service_role;

REVOKE ALL ON FUNCTION gradebook.fields(JSONB,TEXT[],TEXT[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.fields(JSONB,TEXT[],TEXT[]) TO service_role;

REVOKE ALL ON FUNCTION gradebook.score(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.score(JSONB) TO service_role;

REVOKE ALL ON FUNCTION gradebook.dob(TEXT,DATE) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.dob(TEXT,DATE) TO service_role;

REVOKE ALL ON FUNCTION gradebook.name(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.name(TEXT) TO service_role;

REVOKE ALL ON FUNCTION gradebook.lock_admin(UUID,UUID,UUID,BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.lock_admin(UUID,UUID,UUID,BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION gradebook.audit(UUID,UUID,TEXT,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.audit(UUID,UUID,TEXT,INTEGER) TO service_role;

REVOKE ALL ON FUNCTION gradebook.student_dto(gradebook.students) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.student_dto(gradebook.students) TO service_role;

REVOKE ALL ON FUNCTION gradebook.class_dto(gradebook.classes) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.class_dto(gradebook.classes) TO service_role;

REVOKE ALL ON FUNCTION public.gb_class_create(UUID,UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_class_create(UUID,UUID,TEXT,TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.gb_class_read(UUID,UUID,UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_class_read(UUID,UUID,UUID) TO service_role;

REVOKE ALL ON FUNCTION public.gb_class_patch(UUID,UUID,UUID,BIGINT,TEXT,TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_class_patch(UUID,UUID,UUID,BIGINT,TEXT,TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.gb_semester_set(UUID,UUID,UUID,SMALLINT,BOOLEAN,BIGINT,BOOLEAN,BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_semester_set(UUID,UUID,UUID,SMALLINT,BOOLEAN,BIGINT,BOOLEAN,BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION gradebook.identity(JSONB,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.identity(JSONB,INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.gb_student_create(UUID,UUID,UUID,JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_student_create(UUID,UUID,UUID,JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.gb_students_list(UUID,UUID,UUID,BIGINT,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_students_list(UUID,UUID,UUID,BIGINT,INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.gb_student_read(UUID,UUID,UUID,BIGINT,BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_student_read(UUID,UUID,UUID,BIGINT,BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION public.gb_student_patch(UUID,UUID,UUID,BIGINT,BIGINT,JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_student_patch(UUID,UUID,UUID,BIGINT,BIGINT,JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.gb_student_status(UUID,UUID,UUID,BIGINT,BIGINT,BOOLEAN,BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_student_status(UUID,UUID,UUID,BIGINT,BIGINT,BOOLEAN,BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION public.gb_student_delete(UUID,UUID,UUID,BIGINT,BIGINT,BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_student_delete(UUID,UUID,UUID,BIGINT,BIGINT,BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION public.gb_score_put(UUID,UUID,UUID,BIGINT,SMALLINT,TEXT,TEXT,BIGINT,JSONB,BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_score_put(UUID,UUID,UUID,BIGINT,SMALLINT,TEXT,TEXT,BIGINT,JSONB,BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION public.gb_score_delete(UUID,UUID,UUID,BIGINT,SMALLINT,TEXT,TEXT,BIGINT,BOOLEAN,BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_score_delete(UUID,UUID,UUID,BIGINT,SMALLINT,TEXT,TEXT,BIGINT,BOOLEAN,BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION gradebook.plan(gradebook.classes,TEXT,SMALLINT,JSONB,JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.plan(gradebook.classes,TEXT,SMALLINT,JSONB,JSONB) TO service_role;

REVOKE ALL ON FUNCTION gradebook.import_run(UUID,UUID,UUID,TEXT,SMALLINT,JSONB,JSONB,BOOLEAN,TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.import_run(UUID,UUID,UUID,TEXT,SMALLINT,JSONB,JSONB,BOOLEAN,TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.gb_roster_preview(UUID,UUID,UUID,JSONB,JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_roster_preview(UUID,UUID,UUID,JSONB,JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.gb_roster_apply(UUID,UUID,UUID,JSONB,JSONB,TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_roster_apply(UUID,UUID,UUID,JSONB,JSONB,TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.gb_scores_preview(UUID,UUID,UUID,SMALLINT,JSONB,JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_scores_preview(UUID,UUID,UUID,SMALLINT,JSONB,JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.gb_scores_apply(UUID,UUID,UUID,SMALLINT,JSONB,JSONB,TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_scores_apply(UUID,UUID,UUID,SMALLINT,JSONB,JSONB,TEXT) TO service_role;

REVOKE ALL ON FUNCTION gradebook.lock_student(UUID,BIGINT,BIGINT,BIGINT,SMALLINT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION gradebook.lock_student(UUID,BIGINT,BIGINT,BIGINT,SMALLINT) TO service_role;

REVOKE ALL ON FUNCTION public.gb_student_grades(UUID,BIGINT,BIGINT,BIGINT,SMALLINT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_student_grades(UUID,BIGINT,BIGINT,BIGINT,SMALLINT) TO service_role;

REVOKE ALL ON FUNCTION public.gb_histogram(UUID,BIGINT,BIGINT,BIGINT,SMALLINT,TEXT,TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_histogram(UUID,BIGINT,BIGINT,BIGINT,SMALLINT,TEXT,TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.gb_pair_check(UUID,TEXT,TEXT,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_pair_check(UUID,TEXT,TEXT,INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.gb_lookup_context() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_lookup_context() TO service_role;

REVOKE ALL ON FUNCTION public.gb_scores_read(UUID,UUID,UUID,SMALLINT,BIGINT,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_scores_read(UUID,UUID,UUID,SMALLINT,BIGINT,INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.gb_limit(BOOLEAN,TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_limit(BOOLEAN,TEXT) TO service_role;

COMMIT;
