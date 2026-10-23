-- KHTN8 Board. All runtime writes are authorized in PostgreSQL.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create table public.admin_profiles (
 user_id uuid primary key references auth.users(id), role text not null default 'admin' check(role='admin'),
 active boolean not null default true
);
create unique index one_active_admin on public.admin_profiles(active) where active;
alter table public.admin_profiles enable row level security;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_profiles where user_id=(select auth.uid()) and active and role='admin');
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;
create table public.boards (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 1 and 160),
 description text not null default '' check(char_length(description)<=2000), settings jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.sections (
 id uuid primary key default gen_random_uuid(), board_id uuid not null references public.boards(id) on delete restrict,
 title text not null check(char_length(title) between 1 and 100), description text not null default '' check(char_length(description)<=1000),
 color text not null default '#dcece5' check(color ~ '^#[0-9a-fA-F]{6}$'), sort_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.posts (
 id uuid primary key default gen_random_uuid(), section_id uuid not null references public.sections(id) on delete restrict,
 title text not null check(char_length(title) between 1 and 200), body text not null default '' check(char_length(body)<=20000),
 status text not null default 'draft' check(status in ('draft','published','hidden','deleted')), sort_order integer not null default 0,
 version integer not null default 1, thumbnail_id uuid, placeholder_kind text check(placeholder_kind in ('text','image','document','youtube','link')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 check((status='deleted') = (deleted_at is not null))
);
create table public.attachments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete restrict,
 type text not null check(type in ('image','document','link','youtube')),
 storage_path text unique, external_url text, file_name text not null default '' check(char_length(file_name)<=255),
 mime_type text, size_bytes bigint check(size_bytes>0 and size_bytes<2000000), sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 check((storage_path is not null and external_url is null and type in ('image','document') and size_bytes is not null and mime_type is not null)
    or (storage_path is null and external_url ~ '^https://[^[:space:]]+$' and type in ('link','youtube'))),
 check(storage_path is null or storage_path like post_id::text || '/%'),
 check(storage_path is null or mime_type in ('image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))
);
create table public.audit_logs (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
 action text not null, target_id uuid not null, created_at timestamptz not null default now()
);
create index sections_board_order on public.sections(board_id,sort_order);
create index posts_section_order on public.posts(section_id,sort_order);
create index posts_published on public.posts(section_id,sort_order) where status='published';
create index attachments_post_order on public.attachments(post_id,sort_order);
create index audit_actor on public.audit_logs(actor_id);
create function private.stamp() returns trigger language plpgsql set search_path='' as $$
begin
 new.updated_at=now();
 if tg_table_name='posts' then
   new.version=old.version+1;
   if old.status='deleted' and new.status<>'deleted' and old.deleted_at<now()-interval '30 days' then
     raise exception 'Thời hạn khôi phục 30 ngày đã hết';
   end if;
 end if;
 return new;
end $$;
create trigger board_stamp before update on public.boards for each row execute function private.stamp();
create trigger section_stamp before update on public.sections for each row execute function private.stamp();
create trigger post_stamp before update on public.posts for each row execute function private.stamp();
-- Only this trigger writes audit rows, with actor derived from the authenticated JWT.
create function private.audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(actor_id,action,target_id) values(auth.uid(),tg_table_name||':'||tg_op,coalesce(new.id,old.id));
 return coalesce(new,old);
end $$;
create trigger audit_posts after insert or update or delete on public.posts for each row execute function private.audit();
create trigger audit_sections after insert or update or delete on public.sections for each row execute function private.audit();
create function private.attachment_limit() returns trigger language plpgsql set search_path='' as $$
begin
 perform 1 from public.posts where id=new.post_id for update;
 if (select count(*) from public.attachments where post_id=new.post_id and id<>new.id)>=10 then
  raise exception 'Tối đa 10 tài nguyên mỗi bài';
 end if;
 return new;
end $$;
create trigger attachment_limit before insert or update on public.attachments for each row execute function private.attachment_limit();
alter table public.boards enable row level security;
alter table public.sections enable row level security;
alter table public.posts enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;
revoke all on public.boards, public.sections, public.posts, public.attachments, public.admin_profiles, public.audit_logs from anon, authenticated;
grant select on public.boards, public.sections, public.posts, public.attachments to anon, authenticated;
grant insert, update, delete on public.boards, public.sections, public.attachments to authenticated;
grant insert, update on public.posts to authenticated;
grant select on public.admin_profiles, public.audit_logs to authenticated;
create policy profile_self on public.admin_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy audit_admin on public.audit_logs for select to authenticated using((select private.is_admin()));
create policy boards_read on public.boards for select to anon, authenticated using(true);
create policy boards_write on public.boards for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy sections_read on public.sections for select to anon, authenticated using(true);
create policy sections_write on public.sections for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy posts_read on public.posts for select to anon, authenticated using(status='published' or (select private.is_admin()));
create policy posts_write on public.posts for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy attachments_read on public.attachments for select to anon, authenticated using(
 (select private.is_admin()) or exists(select 1 from public.posts p where p.id=post_id and p.status='published')
);
create policy attachments_write on public.attachments for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
-- Atomic optimistic save: metadata and publication become visible together.
create function public.save_post(p_post jsonb, p_attachments jsonb, p_expected_version integer default null)
returns public.posts language plpgsql security invoker set search_path='' as $$
declare saved public.posts; pid uuid=(p_post->>'id')::uuid; old_version integer;
begin
 if not private.is_admin() then raise exception 'Không có quyền quản trị' using errcode='42501'; end if;
 if jsonb_typeof(p_attachments)<>'array' or jsonb_array_length(p_attachments)>10 then raise exception 'Tối đa 10 tài nguyên'; end if;
 select version into old_version from public.posts where id=pid for update;
 if found then
  if p_expected_version is null or old_version<>p_expected_version then raise exception 'Bài đã thay đổi ở tab khác. Hãy tải lại trước khi lưu.' using errcode='40001'; end if;
  update public.posts set title=p_post->>'title',body=coalesce(p_post->>'body',''),section_id=(p_post->>'section_id')::uuid,
   placeholder_kind=nullif(p_post->>'placeholder_kind',''),status=p_post->>'status',sort_order=(p_post->>'sort_order')::integer,
   thumbnail_id=nullif(p_post->>'thumbnail_id','')::uuid,
   deleted_at=case when p_post->>'status'='deleted' then now() else null end where id=pid returning * into saved;
 else
  if p_expected_version is not null then raise exception 'Bài không tồn tại' using errcode='40001'; end if;
  insert into public.posts(id,section_id,title,body,status,sort_order,thumbnail_id,deleted_at) values(pid,(p_post->>'section_id')::uuid,
   p_post->>'title',coalesce(p_post->>'body',''),p_post->>'status',(p_post->>'sort_order')::integer,nullif(p_post->>'thumbnail_id','')::uuid,
   case when p_post->>'status'='deleted' then now() else null end) returning * into saved;
 end if;
 delete from public.attachments where post_id=pid;
 insert into public.attachments(id,post_id,type,storage_path,external_url,file_name,mime_type,size_bytes,sort_order)
 select (a->>'id')::uuid,pid,a->>'type',nullif(a->>'storage_path',''),nullif(a->>'external_url',''),coalesce(a->>'file_name',''),
  nullif(a->>'mime_type',''),nullif(a->>'size_bytes','')::bigint,ord::integer-1 from jsonb_array_elements(p_attachments) with ordinality as t(a,ord);
 if saved.thumbnail_id is not null and not exists(select 1 from public.attachments where id=saved.thumbnail_id and post_id=pid and type='image') then
  raise exception 'Thumbnail phải là ảnh thuộc bài này';
 end if;
 return saved;
end $$;
revoke all on function public.save_post(jsonb,jsonb,integer) from public, anon;
grant execute on function public.save_post(jsonb,jsonb,integer) to authenticated;
-- Exact decimal MB: reject >=2,000,000 bytes both in UI and at provider boundary.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('learning-resources','learning-resources',false,1999999,array['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
create policy resources_read on storage.objects for select to anon, authenticated using(bucket_id='learning-resources' and (
 (select private.is_admin()) or exists(select 1 from public.attachments a join public.posts p on p.id=a.post_id where a.storage_path=name and p.status='published')
));
create policy resources_insert on storage.objects for insert to authenticated with check(bucket_id='learning-resources' and (select private.is_admin()));
create policy resources_delete on storage.objects for delete to authenticated using(bucket_id='learning-resources' and (select private.is_admin()));
-- No upsert/update: immutable random object paths prevent cache/version collisions.
revoke all on function private.stamp(),private.audit(),private.attachment_limit() from public, anon, authenticated;
