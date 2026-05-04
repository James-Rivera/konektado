-- Public service-post fields used by Home cards, search, and service previews.

alter table public.services
  add column if not exists tags text[] not null default '{}',
  add column if not exists photo_urls text[] not null default '{}',
  add column if not exists barangay text,
  add column if not exists location_text text,
  add column if not exists allow_messages boolean not null default true,
  add column if not exists auto_reply_enabled boolean not null default false,
  add column if not exists auto_pause_enabled boolean not null default false;

insert into storage.buckets (id, name, public)
values ('service-photos', 'service-photos', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "service_photos_storage_select_own" on storage.objects;
create policy "service_photos_storage_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'service-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "service_photos_storage_insert_own" on storage.objects;
create policy "service_photos_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'service-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
