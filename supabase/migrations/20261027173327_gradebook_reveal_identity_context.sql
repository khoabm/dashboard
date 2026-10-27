-- Server-only reveal context for CP01-A AES-GCM AAD and generation-specific HMAC.
-- Audit still denotes an authorized DB reveal request, not successful Edge decryption.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
DO $$
DECLARE
  object_id OID;
  original RECORD;
  corrected RECORD;
  body_hash TEXT;
  old_hash CONSTANT TEXT := '91d74b47b239794722720ea8b6414a7cfeb126e8e08fcbbf8f3720ffa2517b9d';
  new_hash CONSTANT TEXT := 'dc1f1791ac02db7ec9af9db81f5c35dd57be9648a2516267f7fa608b166adddc';
BEGIN
  object_id := pg_catalog.to_regprocedure('public.gb_student_read(uuid,uuid,uuid,bigint,boolean)');
  IF object_id IS NULL THEN
    RAISE EXCEPTION 'Missing Gradebook reveal target';
  END IF;
  SELECT p.*, pg_catalog.to_jsonb(p) - 'prosrc' AS metadata INTO original
    FROM pg_catalog.pg_proc AS p WHERE p.oid = object_id;
  body_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(original.prosrc, 'UTF8')), 'hex');
  IF body_hash NOT IN (old_hash, new_hash)
    OR original.prokind <> 'f' OR original.prosecdef OR original.provolatile <> 'v'
    OR original.proretset OR original.prorettype <> 'pg_catalog.jsonb'::pg_catalog.regtype
    OR original.prolang <> (SELECT oid FROM pg_catalog.pg_language WHERE lanname = 'plpgsql')
    OR original.proargnames IS DISTINCT FROM ARRAY['actor', 'session', 'cid', 'sid', 'reveal']
    OR original.pronargdefaults <> 1
    OR pg_catalog.pg_get_expr(original.proargdefaults, 0) IS DISTINCT FROM 'false'
    OR original.proconfig IS DISTINCT FROM ARRAY['search_path=""', 'lock_timeout=3s']
    OR pg_catalog.has_function_privilege('anon', object_id, 'EXECUTE')
    OR pg_catalog.has_function_privilege('authenticated', object_id, 'EXECUTE')
    OR NOT pg_catalog.has_function_privilege('service_role', object_id, 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected Gradebook reveal definition or privileges';
  END IF;
  IF body_hash = old_hash THEN
    -- CREATE OR REPLACE on this one reviewed definition retains ownership and ACL.
    EXECUTE pg_catalog.replace(pg_catalog.pg_get_functiondef(object_id),
      '''algVersion'',s.identity_alg_version)',
      '''algVersion'',s.identity_alg_version,''identityLookup'',encode(s.identity_lookup,''hex''),''lookupKeyVersion'',s.lookup_key_version)');
  END IF;
  SELECT p.*, pg_catalog.to_jsonb(p) - 'prosrc' AS metadata INTO corrected
    FROM pg_catalog.pg_proc AS p WHERE p.oid = object_id;
  IF corrected.metadata IS DISTINCT FROM original.metadata
    OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(corrected.prosrc, 'UTF8')), 'hex') <> new_hash THEN
    RAISE EXCEPTION 'Gradebook reveal correction invariant failed';
  END IF;
END;
$$;
COMMIT;
