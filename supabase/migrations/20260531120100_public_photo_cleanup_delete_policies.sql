-- Let owners remove staged public marketplace photos when a save fails or is cancelled.

drop policy if exists "job_photos_storage_delete_own" on storage.objects;
create policy "job_photos_storage_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "service_photos_storage_delete_own" on storage.objects;
create policy "service_photos_storage_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'service-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
