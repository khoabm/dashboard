-- Business conflicts are terminal HTTP409, not retryable serialization failures.
-- Replace only the verified board RPC signatures; preserve ownership and all ACLs.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
DO $$
DECLARE
  signature REGPROCEDURE;
  definition TEXT;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.reorder_posts(uuid[],integer[])'::regprocedure,
    'public.save_post(jsonb,jsonb,integer)'::regprocedure
  ] LOOP
    definition := pg_get_functiondef(signature);
    IF position('errcode=''40001''' IN definition)>0 THEN
      EXECUTE replace(definition, 'errcode=''40001''', 'errcode=''PT409''');
    ELSIF position('errcode=''PT409''' IN definition)=0 THEN
      RAISE EXCEPTION 'Unexpected board conflict definition; inspect before migration';
    END IF;
  END LOOP;
END;
$$;
COMMIT;
