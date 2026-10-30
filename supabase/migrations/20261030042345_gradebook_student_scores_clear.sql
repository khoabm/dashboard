-- Atomic, confirmed clear of one student's scores across both semesters.
-- Additive: preserve FK RESTRICT, existing student identity, other students and class publication.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

CREATE FUNCTION gradebook.student_scores_snapshot(sid BIGINT)
RETURNS JSONB LANGUAGE sql STABLE SET search_path = '' AS $$
  WITH scores AS (
    SELECT semester, subject_code, score_column_code,
           trim_scale(score)::text AS raw_score, revision::text AS score_revision
    FROM gradebook.student_scores WHERE student_id = sid
  ), aggregate AS (
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE semester = 1)::int AS first_count,
           count(*) FILTER (WHERE semester = 2)::int AS second_count,
           coalesce(jsonb_agg(
             jsonb_build_array(semester, subject_code, score_column_code, raw_score, score_revision)
             ORDER BY semester, subject_code COLLATE "C", score_column_code COLLATE "C"
           ), '[]'::jsonb)::text AS snapshot_text
    FROM scores
  )
  SELECT jsonb_build_object(
    'semester1Count', first_count,
    'semester2Count', second_count,
    'totalCount', total,
    'fingerprint', encode(sha256(convert_to(snapshot_text,'UTF8')),'hex')
  ) FROM aggregate;
$$;

CREATE FUNCTION public.gb_student_scores_summary(
  actor UUID, session UUID, cid UUID, sid BIGINT, expected BIGINT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; s gradebook.students;
BEGIN
  c := gradebook.lock_admin(actor,session,cid,false);
  SELECT * INTO s FROM gradebook.students
    WHERE id=sid AND class_id=cid FOR SHARE;
  IF NOT FOUND OR s.revision IS DISTINCT FROM expected THEN
    RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='stale';
  END IF;
  RETURN gradebook.student_scores_snapshot(sid) || jsonb_build_object(
    'semester1Published', c.semester_1_published_at IS NOT NULL,
    'semester2Published', c.semester_2_published_at IS NOT NULL
  );
END;
$$;

CREATE FUNCTION public.gb_student_scores_clear(
  actor UUID, session UUID, cid UUID, sid BIGINT, expected BIGINT,
  expected_fingerprint TEXT, confirmed BOOLEAN, acknowledged BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE c gradebook.classes; s gradebook.students; current_snapshot JSONB; removed INTEGER;
BEGIN
  c := gradebook.lock_admin(actor,session,cid,true);
  PERFORM gradebook.require(confirmed = true);
  SELECT * INTO s FROM gradebook.students
    WHERE id=sid AND class_id=cid FOR UPDATE;
  IF NOT FOUND OR s.revision IS DISTINCT FROM expected THEN
    RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='stale';
  END IF;
  current_snapshot := gradebook.student_scores_snapshot(sid);
  IF expected_fingerprint IS NULL OR expected_fingerprint !~ '^[0-9a-f]{64}$'
     OR expected_fingerprint IS DISTINCT FROM current_snapshot->>'fingerprint' THEN
    RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='stale_preview';
  END IF;
  PERFORM gradebook.require(
    (c.semester_1_published_at IS NULL AND c.semester_2_published_at IS NULL)
    OR acknowledged = true, 'published_acknowledgement');
  DELETE FROM gradebook.student_scores WHERE student_id=sid;
  GET DIAGNOSTICS removed = ROW_COUNT;
  IF removed IS DISTINCT FROM (current_snapshot->>'totalCount')::int THEN
    RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='stale_preview';
  END IF;
  IF removed > 0 THEN
    PERFORM gradebook.audit(actor,cid,'score_delete',removed);
  END IF;
  RETURN jsonb_build_object('deletedCount',removed);
END;
$$;

REVOKE ALL ON FUNCTION gradebook.student_scores_snapshot(BIGINT)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION gradebook.student_scores_snapshot(BIGINT) TO service_role;
REVOKE ALL ON FUNCTION public.gb_student_scores_summary(UUID,UUID,UUID,BIGINT,BIGINT)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.gb_student_scores_summary(UUID,UUID,UUID,BIGINT,BIGINT)
  TO service_role;
REVOKE ALL ON FUNCTION public.gb_student_scores_clear(UUID,UUID,UUID,BIGINT,BIGINT,TEXT,BOOLEAN,BOOLEAN)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.gb_student_scores_clear(UUID,UUID,UUID,BIGINT,BIGINT,TEXT,BOOLEAN,BOOLEAN)
  TO service_role;
COMMIT;
