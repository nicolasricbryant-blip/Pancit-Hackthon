-- TAMBAYAN — private Storage bucket for rank-verification screenshots.
-- Players read/write only their own folder (name prefixed with their uid); admins read all.
-- Idempotent.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rank-proofs', 'rank-proofs', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists rank_proofs_insert_own on storage.objects;
create policy rank_proofs_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'rank-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists rank_proofs_read_own on storage.objects;
create policy rank_proofs_read_own on storage.objects for select to authenticated
  using (bucket_id = 'rank-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists rank_proofs_delete_own on storage.objects;
create policy rank_proofs_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'rank-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
