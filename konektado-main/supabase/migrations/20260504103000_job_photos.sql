-- Public job photos for draft previews and published job posts.

alter table public.jobs
  add column if not exists photo_urls text[] not null default '{}';

alter table public.job_drafts
  add column if not exists photo_urls text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "job_photos_storage_select_own" on storage.objects;
create policy "job_photos_storage_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "job_photos_storage_insert_own" on storage.objects;
create policy "job_photos_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
