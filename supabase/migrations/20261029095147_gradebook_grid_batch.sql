-- Grid batch: additive, server-only, one class/semester transaction; never apply automatically.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

CREATE FUNCTION gradebook.score_batch_plan(c gradebook.classes, target_semester SMALLINT, changes JSONB)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE
  item JSONB;
  pupil gradebook.students;
  previous gradebook.student_scores;
  sid BIGINT;
  sub TEXT;
  col TEXT;
  expected_revision TEXT;
  value NUMERIC;
  coordinate TEXT;
  seen TEXT[] := ARRAY[]::text[];
  writes JSONB := '[]'::jsonb;
  transcript TEXT;
  inserts INTEGER := 0;
  updates INTEGER := 0;
  unchanged INTEGER := 0;
BEGIN
  PERFORM gradebook.require(target_semester IN (1, 2)
    AND jsonb_typeof(changes) = 'array'
    AND jsonb_array_length(changes) BETWEEN 1 AND 140
    AND octet_length(changes::text) <= 65536);
  PERFORM gradebook.require(
    (CASE target_semester WHEN 1 THEN c.semester_1_published_at ELSE c.semester_2_published_at END) IS NULL,
    'published');
  transcript := gradebook.tuple('grid_batch_state_v1', ARRAY[
    c.id::text, c.revision::text, target_semester::text,
    c.is_active::text, c.access_version::text, c.lookup_key_version::text
  ]);
  FOR item IN SELECT e.value FROM jsonb_array_elements(changes) AS e(value) LOOP
    PERFORM gradebook.fields(item,
      ARRAY['studentId','subjectCode','columnCode','expectedRevision','score'],
      ARRAY['studentId','subjectCode','columnCode','expectedRevision','score']);
    PERFORM gradebook.require(
      jsonb_typeof(item->'studentId') = 'string'
      AND (item->>'studentId') ~ '^[1-9][0-9]{0,18}$'
      AND jsonb_typeof(item->'subjectCode') = 'string'
      AND jsonb_typeof(item->'columnCode') = 'string'
      AND (item->>'subjectCode') ~ '^[a-z][a-z0-9_]{0,31}$'
      AND (item->>'columnCode') ~ '^[a-z][a-z0-9_]{0,31}$'
      AND (item->'expectedRevision' = 'null'::jsonb
        OR (jsonb_typeof(item->'expectedRevision') = 'string'
          AND (item->>'expectedRevision') ~ '^[1-9][0-9]{0,18}$')));
    sid := (item->>'studentId')::bigint;
    sub := item->>'subjectCode';
    col := item->>'columnCode';
    expected_revision := item->>'expectedRevision';
    coordinate := gradebook.tuple('cell', ARRAY[sid::text,sub,col]);
    PERFORM gradebook.require(NOT coordinate = ANY(seen), 'duplicate_coordinate');
    seen := array_append(seen, coordinate);
    PERFORM gradebook.require(
      EXISTS(SELECT 1 FROM gradebook.subjects WHERE code=sub AND active)
      AND EXISTS(SELECT 1 FROM gradebook.score_columns WHERE code=col AND active),
      'catalog');
    SELECT * INTO pupil FROM gradebook.students WHERE id=sid AND class_id=c.id AND active;
    PERFORM gradebook.require(FOUND, 'student_unavailable');
    value := gradebook.score(item->'score');
    SELECT * INTO previous FROM gradebook.student_scores
      WHERE student_id=sid AND semester=target_semester
        AND subject_code=sub AND score_column_code=col;
    IF previous.revision::text IS DISTINCT FROM expected_revision THEN
      RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='stale';
    END IF;
    transcript := transcript || gradebook.tuple('grid_cell_state_v1', ARRAY[
      sid::text, pupil.revision::text, sub, col,
      previous.revision::text, trim_scale(previous.score)::text
    ]);
    IF previous.student_id IS NULL THEN
      inserts := inserts + 1;
    ELSIF previous.score IS DISTINCT FROM value THEN
      updates := updates + 1;
    ELSE
      unchanged := unchanged + 1;
      CONTINUE;
    END IF;
    writes := writes || jsonb_build_array(jsonb_build_object(
      'studentId', sid::text, 'subject', sub, 'col', col, 'score', trim_scale(value)::text));
  END LOOP;
  RETURN jsonb_build_object(
    'counts', jsonb_build_object('insert', inserts, 'update', updates,
      'unchanged', unchanged, 'error', 0, 'skippedBlank', 0),
    'errors', '[]'::jsonb,
    'internalStateHash', encode(sha256(convert_to(transcript,'UTF8')),'hex'),
    'writes', writes);
END;
$$;

CREATE FUNCTION gradebook.score_batch_run(
  actor UUID, admin_session UUID, cid UUID, target_semester SMALLINT,
  changes JSONB, applying BOOLEAN, expected TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; plan JSONB; item JSONB; affected INTEGER;
BEGIN
  c := gradebook.lock_admin(actor,admin_session,cid,applying);
  plan := gradebook.score_batch_plan(c,target_semester,changes);
  IF NOT applying THEN RETURN plan - 'writes'; END IF;
  IF expected IS NULL OR expected !~ '^[0-9a-f]{64}$'
    OR expected IS DISTINCT FROM plan->>'internalStateHash' THEN
    RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='stale_preview';
  END IF;
  FOR item IN SELECT e.value FROM jsonb_array_elements(plan->'writes') AS e(value) LOOP
    INSERT INTO gradebook.student_scores(
      student_id,semester,subject_code,score_column_code,score,updated_by)
    VALUES ((item->>'studentId')::bigint,target_semester,item->>'subject',
      item->>'col',(item->>'score')::numeric,actor)
    ON CONFLICT ON CONSTRAINT student_scores_pkey
    DO UPDATE SET score=EXCLUDED.score,updated_by=EXCLUDED.updated_by,
      revision=student_scores.revision+1,updated_at=now()
    WHERE student_scores.score IS DISTINCT FROM EXCLUDED.score;
  END LOOP;
  affected := (plan->'counts'->>'insert')::int + (plan->'counts'->>'update')::int;
  IF affected > 0 THEN PERFORM gradebook.audit(actor,cid,'scores_upsert',affected); END IF;
  RETURN (plan - 'writes' - 'internalStateHash') || jsonb_build_object('committed',true);
END;
$$;

CREATE FUNCTION public.gb_score_batch_preview(
  actor UUID, session UUID, cid UUID, semester SMALLINT, changes JSONB)
RETURNS JSONB LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
  SELECT gradebook.score_batch_run(actor,session,cid,semester,changes,false,NULL);
$$;
CREATE FUNCTION public.gb_score_batch_apply(
  actor UUID, session UUID, cid UUID, semester SMALLINT, changes JSONB, expected TEXT)
RETURNS JSONB LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' SET lock_timeout = '3s' AS $$
  SELECT gradebook.score_batch_run(actor,session,cid,semester,changes,true,expected);
$$;

REVOKE ALL ON FUNCTION gradebook.score_batch_plan(gradebook.classes,SMALLINT,JSONB)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION gradebook.score_batch_plan(gradebook.classes,SMALLINT,JSONB) TO service_role;
REVOKE ALL ON FUNCTION gradebook.score_batch_run(UUID,UUID,UUID,SMALLINT,JSONB,BOOLEAN,TEXT)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION gradebook.score_batch_run(UUID,UUID,UUID,SMALLINT,JSONB,BOOLEAN,TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.gb_score_batch_preview(UUID,UUID,UUID,SMALLINT,JSONB)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.gb_score_batch_preview(UUID,UUID,UUID,SMALLINT,JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.gb_score_batch_apply(UUID,UUID,UUID,SMALLINT,JSONB,TEXT)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.gb_score_batch_apply(UUID,UUID,UUID,SMALLINT,JSONB,TEXT) TO service_role;
COMMIT;
