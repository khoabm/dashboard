-- Run as project owner in SQL Editor. Everything, including test users, rolls back.
begin;
insert into auth.users(id,aud,role,email) values ('90000000-0000-4000-8000-000000000001','authenticated','authenticated','admin-rollback@example.invalid');
insert into public.admin_profiles(user_id) values ('90000000-0000-4000-8000-000000000001');
insert into public.posts(id,section_id,title,status) values
('90000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','ROLLBACK draft','draft'),
('90000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','ROLLBACK hidden','hidden');
insert into public.attachments(id,post_id,type,external_url,file_name) values
('90000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000002','link','https://example.org/draft','Private draft link');
set local role anon;
do $$ begin
 if (select count(*) from public.posts where id::text like '90000000%')<>0 then raise exception 'FAIL: anon reads draft/hidden';end if;
 if exists(select 1 from public.attachments where id='90000000-0000-4000-8000-000000000004') then raise exception 'FAIL: draft attachment leak';end if;
 begin
  insert into public.sections(board_id,title) values('10000000-0000-4000-8000-000000000001','Forbidden');
  raise exception 'FAIL: anon insert allowed';
 exception when insufficient_privilege then null; end;
 begin
  update public.posts set title='Forbidden' where id='30000000-0000-4000-8000-000000000001';
  raise exception 'FAIL: anon update allowed';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.posts where id='30000000-0000-4000-8000-000000000001';
  raise exception 'FAIL: anon delete allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into storage.objects(bucket_id,name) values('learning-resources','rollback-unauthorized.png');
  raise exception 'FAIL: anon storage upload allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$ declare changed integer; begin
 if private.is_admin() then raise exception 'FAIL: non-admin authorized';end if;
 if exists(select 1 from public.posts where status<>'published') then raise exception 'FAIL: non-admin reads draft';end if;
 begin
  insert into public.sections(board_id,title) values('10000000-0000-4000-8000-000000000001','Forbidden');
  raise exception 'FAIL: non-admin insert allowed';
 exception when insufficient_privilege then null; end;
 update public.posts set title='Forbidden' where id='30000000-0000-4000-8000-000000000001'; get diagnostics changed=row_count; if changed<>0 then raise exception 'FAIL: non-admin updates rows';end if;
 delete from public.sections where id='20000000-0000-4000-8000-000000000001'; get diagnostics changed=row_count; if changed<>0 then raise exception 'FAIL: non-admin deletes rows';end if;
 begin
  insert into public.admin_profiles(user_id) values('90000000-0000-4000-8000-000000000099');
  raise exception 'FAIL: self grant allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into storage.objects(bucket_id,name) values('learning-resources','rollback-nonadmin.png');
  raise exception 'FAIL: non-admin storage upload allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.save_post('{"id":"90000000-0000-4000-8000-000000000002"}','[]',1);
  raise exception 'FAIL: non-admin RPC allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare saved public.posts; begin
 if not private.is_admin() then raise exception 'FAIL: admin lookup';end if;
 select * into saved from public.save_post('{"id":"90000000-0000-4000-8000-000000000002","section_id":"20000000-0000-4000-8000-000000000001","title":"Published rollback","body":"safe text","status":"published","sort_order":9}','[]',1);
 if saved.version<>2 or saved.status<>'published' then raise exception 'FAIL: optimistic publish';end if;
 begin
  perform public.save_post('{"id":"90000000-0000-4000-8000-000000000002","section_id":"20000000-0000-4000-8000-000000000001","title":"stale","status":"draft","sort_order":0}','[]',1);
  raise exception 'FAIL: stale save accepted';
 exception when serialization_failure then null; end;
 begin
  delete from public.sections where id='20000000-0000-4000-8000-000000000001';
  raise exception 'FAIL: nonempty section deletion';
 exception when foreign_key_violation then null; end;
 if (public.app_usage()->>'storage_bytes')::bigint<>0 then raise exception 'FAIL: empty storage usage';end if;
 perform public.reorder_posts(
  (select array_agg(id order by id desc) from public.posts where section_id='20000000-0000-4000-8000-000000000001' and status<>'deleted'),
  (select array_agg(version order by id desc) from public.posts where section_id='20000000-0000-4000-8000-000000000001' and status<>'deleted')
 );
 if exists(select 1 from (select sort_order,row_number() over(order by id desc)-1 as expected from public.posts where section_id='20000000-0000-4000-8000-000000000001' and status<>'deleted') ordered where sort_order<>expected) then raise exception 'FAIL: reorder';end if;
 begin
  perform public.reorder_posts(array['90000000-0000-4000-8000-000000000002'::uuid],array[1]);
  raise exception 'FAIL: incomplete/stale order accepted';
 exception when serialization_failure then null;end;
 if not exists(select 1 from public.audit_logs where actor_id='90000000-0000-4000-8000-000000000001' and action='posts:UPDATE') then raise exception 'FAIL: audit actor';end if;
 begin
  insert into public.audit_logs(actor_id,action,target_id) values('90000000-0000-4000-8000-000000000001','fake','90000000-0000-4000-8000-000000000002');
  raise exception 'FAIL: fake audit allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: rollback roles, visibility, writes, storage, admin RPC, conflict, audit, FK, quota, reorder' as result;
