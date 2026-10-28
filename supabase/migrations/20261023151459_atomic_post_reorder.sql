create function public.reorder_posts(p_ids uuid[],p_versions integer[]) returns void
language plpgsql security invoker set search_path='' as $$
declare sid uuid; expected_count integer;
begin
 if not private.is_admin() then raise exception 'Không có quyền quản trị' using errcode='42501'; end if;
 if coalesce(cardinality(p_ids),0)=0 or cardinality(p_ids)<>cardinality(p_versions) then raise exception 'Danh sách thứ tự không hợp lệ';end if;
 if (select count(distinct id) from unnest(p_ids) id)<>cardinality(p_ids) then raise exception 'Trùng bài';end if;
 select section_id into sid from public.posts where id=p_ids[1];
 perform 1 from public.posts where section_id=sid and status<>'deleted' order by id for update;
 select count(*) into expected_count from public.posts where section_id=sid and status<>'deleted';
 if expected_count<>cardinality(p_ids) or exists(
  select 1 from unnest(p_ids,p_versions) as input(id,version) left join public.posts p on p.id=input.id
  where p.id is null or p.section_id<>sid or p.status='deleted' or p.version<>input.version
 ) then raise exception 'Danh sách đã thay đổi. Hãy tải lại trước khi sắp xếp.' using errcode='40001';end if;
 update public.posts p set sort_order=input.position::integer-1
 from unnest(p_ids) with ordinality input(id,position) where p.id=input.id;
end $$;
revoke all on function public.reorder_posts(uuid[],integer[]) from public,anon;
grant execute on function public.reorder_posts(uuid[],integer[]) to authenticated;
