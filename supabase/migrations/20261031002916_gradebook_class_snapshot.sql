-- Source-only draft. Do not apply without separate owner authorization.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

CREATE FUNCTION public.gb_class_snapshot(actor UUID, session UUID, cid UUID, exporting BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = '' SET lock_timeout = '3s' SET statement_timeout = '15s' AS $$
DECLARE
  c gradebook.classes;
  result JSONB;
  student_count INTEGER;
BEGIN
  -- Every Gradebook mutation takes the same class lock before changing rows.
  c := gradebook.lock_admin(actor, session, cid, false);
  PERFORM gradebook.require(exporting IS NOT NULL);
  SELECT count(*) INTO student_count FROM gradebook.students WHERE class_id = cid;
  IF student_count > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = 'PT413', MESSAGE = 'snapshot_size';
  END IF;

  SELECT coalesce(jsonb_agg(
    gradebook.student_dto(s) || jsonb_build_object(
      'ciphertext', encode(s.identity_ciphertext, 'hex'),
      'nonce', encode(s.identity_nonce, 'hex'),
      'encKid', s.identity_enc_kid,
      'algVersion', s.identity_alg_version,
      'identityLookup', encode(s.identity_lookup, 'hex'),
      'lookupKeyVersion', s.lookup_key_version,
      'scores1', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'subjectCode', x.subject_code, 'columnCode', x.score_column_code,
          'rawScore', trim_scale(x.score)::text, 'revision', x.revision::text
        ) ORDER BY x.subject_code, x.score_column_code), '[]'::jsonb)
        FROM gradebook.student_scores x WHERE x.student_id = s.id AND x.semester = 1
      ),
      'scores2', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'subjectCode', x.subject_code, 'columnCode', x.score_column_code,
          'rawScore', trim_scale(x.score)::text, 'revision', x.revision::text
        ) ORDER BY x.subject_code, x.score_column_code), '[]'::jsonb)
        FROM gradebook.student_scores x WHERE x.student_id = s.id AND x.semester = 2
      )
    ) ORDER BY s.id
  ), '[]'::jsonb) INTO result
  FROM gradebook.students s WHERE s.class_id = cid;

  -- Record only actor, class and aggregate count, including rank-only identity access.
  INSERT INTO public.audit_logs(actor_id, target_id, action)
  VALUES (actor, cid, 'gradebook:' || CASE WHEN exporting THEN 'class_export' ELSE 'class_sort' END || ':count=' || student_count::text);
  RETURN jsonb_build_object('class', gradebook.class_dto(c), 'students', result);
END;
$$;

REVOKE ALL ON FUNCTION public.gb_class_snapshot(UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gb_class_snapshot(UUID, UUID, UUID, BOOLEAN) TO service_role;
COMMIT;
