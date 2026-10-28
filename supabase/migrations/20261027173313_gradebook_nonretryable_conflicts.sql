-- Correct only eight reviewed business conflicts after B2/B3; no runtime calls.
-- Body hashes fail closed on drift. Existing owners, ACLs and execution attributes survive.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
DO $$
DECLARE
  target RECORD;
  object_id OID;
  original RECORD;
  corrected RECORD;
  body_hash TEXT;
BEGIN
  FOR target IN SELECT * FROM (VALUES
    ('public.gb_class_patch(uuid,uuid,uuid,bigint,text,text)','f5ba81fdc057395233eea7412af9d8f0d13928e34a3f90ea0dc3a561823b0ab9','6abdfd8074088ab072205509b6bb26eefef20e00917d41c40761b2cd5e384d13'),
    ('public.gb_semester_set(uuid,uuid,uuid,smallint,boolean,bigint,boolean,boolean)','e1926d8b0fafffa7fbfac8456044a2b3b56e681c36d203e70ef1cf40ae5506c0','62c2ffc54a8f0489681f2545604bf24792cdb3917e24510cd6b61f4634d36ff1'),
    ('public.gb_student_patch(uuid,uuid,uuid,bigint,bigint,jsonb)','d2eda93fa9e741118d78c35a011c43cd03579dc355c9212683af89903271ba51','46c38b130addb9091daa7d161f5ecfef7c318b85ae54f9106a5270f58a2cbdfd'),
    ('public.gb_student_status(uuid,uuid,uuid,bigint,bigint,boolean,boolean)','63c8d97073131313e995352bf9cd9a7737a9aa023fb1b3ab72b281ce86375087','c62025c8036a0e6246981d718d49da93d3f90f0c4f8085140d4a61abd78cc95e'),
    ('public.gb_student_delete(uuid,uuid,uuid,bigint,bigint,boolean)','d11aa16ff0b3e5468c660540b3a35883a39597ee7cc1f11580183d210cf05f6a','312c8110bf106519be3c11be41cd3f8a0063f4271afa298c9ece2b46dc66483e'),
    ('public.gb_score_put(uuid,uuid,uuid,bigint,smallint,text,text,bigint,jsonb,boolean)','033fb0c5f266d70a237e6876d644f1bf045961c5c247e395eb40c339275c7255','d3d83863d87b9cffb202590551b76380a0629faf4defc056297b328bc2245777'),
    ('public.gb_score_delete(uuid,uuid,uuid,bigint,smallint,text,text,bigint,boolean,boolean)','c2c5649d1bd95145fa95aeb7f1df6cc74c2d76d6f46ba17720377e9ac9f6f1f6','79b1cfabe82c63ecc031c306ba86786a52f7ecc5049f266325c3b0558c69d7af'),
    ('gradebook.import_run(uuid,uuid,uuid,text,smallint,jsonb,jsonb,boolean,text)','97483ceaea63fd09adaea863ffa023fb030a15b298e6f647fece4debeb02fc6b','a65985f8b628baef5282a23ed9e708185986050e0574be37d333ec2c921266bc')
  ) AS allowlist(signature, old_hash, new_hash) LOOP
    object_id := pg_catalog.to_regprocedure(target.signature);
    IF object_id IS NULL THEN
      RAISE EXCEPTION 'Missing Gradebook conflict target: %', target.signature;
    END IF;
    SELECT proowner, proacl, provolatile, prosecdef, proconfig, prolang, prosrc INTO original
      FROM pg_catalog.pg_proc WHERE oid=object_id;
    body_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(original.prosrc,'UTF8')),'hex');
    IF body_hash NOT IN (target.old_hash,target.new_hash)
      OR original.prosecdef OR original.provolatile <> 'v'
      OR original.prolang <> (SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql')
      OR original.proconfig IS DISTINCT FROM ARRAY['search_path=""','lock_timeout=3s'] THEN
      RAISE EXCEPTION 'Unexpected Gradebook conflict definition: %', target.signature;
    END IF;
    IF body_hash=target.old_hash THEN
      EXECUTE pg_catalog.replace(pg_catalog.pg_get_functiondef(object_id),
        'ERRCODE=''40001''','ERRCODE=''PT409''');
    END IF;
    SELECT proowner, proacl, provolatile, prosecdef, proconfig, prolang, prosrc INTO corrected
      FROM pg_catalog.pg_proc WHERE oid=object_id;
    IF (corrected.proowner,corrected.proacl,corrected.provolatile,corrected.prosecdef,corrected.proconfig,corrected.prolang)
      IS DISTINCT FROM (original.proowner,original.proacl,original.provolatile,original.prosecdef,original.proconfig,original.prolang)
      OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(corrected.prosrc,'UTF8')),'hex') <> target.new_hash THEN
      RAISE EXCEPTION 'Gradebook conflict correction invariant failed: %', target.signature;
    END IF;
  END LOOP;
END;
$$;
COMMIT;
