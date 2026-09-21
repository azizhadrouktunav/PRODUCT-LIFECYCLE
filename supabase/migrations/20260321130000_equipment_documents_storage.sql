-- Equipment PDF documents in Supabase Storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'equipment-documents',
  'equipment-documents',
  true,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Signed-in users read equipment documents" on storage.objects;
drop policy if exists "manage_equipment upload equipment documents" on storage.objects;
drop policy if exists "manage_equipment update equipment documents" on storage.objects;
drop policy if exists "manage_equipment delete equipment documents" on storage.objects;

create policy "Signed-in users read equipment documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'equipment-documents');

create policy "manage_equipment upload equipment documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'equipment-documents'
    and public.app_has('manage_equipment')
  );

create policy "manage_equipment update equipment documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'equipment-documents'
    and public.app_has('manage_equipment')
  )
  with check (
    bucket_id = 'equipment-documents'
    and public.app_has('manage_equipment')
  );

create policy "manage_equipment delete equipment documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'equipment-documents'
    and public.app_has('manage_equipment')
  );
