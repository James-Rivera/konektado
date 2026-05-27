-- Allow the hidden internal demo editor to add/replace private verification files.
-- Files remain in the private verification-files bucket and are opened through signed URLs only.

drop policy if exists "verification_files_insert_admin" on public.verification_files;
create policy "verification_files_insert_admin"
on public.verification_files for insert
to authenticated
with check (public.is_barangay_admin());

drop policy if exists "verification_files_update_admin" on public.verification_files;
create policy "verification_files_update_admin"
on public.verification_files for update
to authenticated
using (public.is_barangay_admin())
with check (public.is_barangay_admin());

drop policy if exists "verification_files_storage_insert_admin" on storage.objects;
create policy "verification_files_storage_insert_admin"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'verification-files'
  and public.is_barangay_admin()
);

notify pgrst, 'reload schema';
