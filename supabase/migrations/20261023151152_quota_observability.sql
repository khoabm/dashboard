-- Uses caller RLS to measure our private bucket; no privileged function.
create function public.app_usage() returns jsonb language plpgsql security invoker set search_path='' as $$
declare used_bytes bigint; database_bytes bigint;
begin
 if not private.is_admin() then raise exception 'Chỉ admin được xem quota' using errcode='42501'; end if;
 select coalesce(sum((metadata->>'size')::bigint),0) into used_bytes from storage.objects where bucket_id='learning-resources';
 select pg_database_size(current_database()) into database_bytes;
 return jsonb_build_object('storage_bytes',used_bytes,'database_bytes_estimate',database_bytes,'egress_bytes',null);
end $$;
revoke all on function public.app_usage() from public,anon;
grant execute on function public.app_usage() to authenticated;
