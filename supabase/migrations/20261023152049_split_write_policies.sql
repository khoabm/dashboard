-- Avoid evaluating redundant SELECT policies for authenticated clients.
drop policy boards_write on public.boards;
create policy boards_insert on public.boards for insert to authenticated with check((select private.is_admin()));
create policy boards_update on public.boards for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy boards_delete on public.boards for delete to authenticated using((select private.is_admin())) ;
drop policy sections_write on public.sections;
create policy sections_insert on public.sections for insert to authenticated with check((select private.is_admin()));
create policy sections_update on public.sections for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy sections_delete on public.sections for delete to authenticated using((select private.is_admin())) ;
drop policy posts_write on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check((select private.is_admin()));
create policy posts_update on public.posts for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
drop policy attachments_write on public.attachments;
create policy attachments_insert on public.attachments for insert to authenticated with check((select private.is_admin()));
create policy attachments_update on public.attachments for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy attachments_delete on public.attachments for delete to authenticated using((select private.is_admin())) ;
