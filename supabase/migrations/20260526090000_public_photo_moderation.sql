-- Backend-backed moderation for public-facing profile, job, and service photos.

create extension if not exists pgcrypto;

create table if not exists public.admin_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('photo', 'user', 'job', 'service', 'report')),
  target_id text not null,
  source_type text check (
    source_type is null
    or source_type in ('profile_photo', 'job_photo', 'service_photo')
  ),
  source_id uuid,
  owner_id uuid references public.profiles(id) on delete set null,
  image_url text,
  image_path text,
  action text not null check (action in ('flag', 'hide', 'clear')),
  reason text,
  note text,
  status text not null check (status in ('flagged', 'hidden', 'cleared')),
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_moderation_actions_target_idx
on public.admin_moderation_actions(target_type, target_id);

create index if not exists admin_moderation_actions_source_idx
on public.admin_moderation_actions(source_type, source_id);

create index if not exists admin_moderation_actions_owner_id_idx
on public.admin_moderation_actions(owner_id);

create index if not exists admin_moderation_actions_status_idx
on public.admin_moderation_actions(status);

create index if not exists admin_moderation_actions_reviewed_at_idx
on public.admin_moderation_actions(reviewed_at desc);

drop trigger if exists set_admin_moderation_actions_updated_at on public.admin_moderation_actions;
create trigger set_admin_moderation_actions_updated_at
before update on public.admin_moderation_actions
for each row execute function public.set_updated_at();

create table if not exists public.content_visibility (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('profile_photo', 'job_photo', 'service_photo')),
  content_id text not null,
  source_id uuid,
  owner_id uuid references public.profiles(id) on delete set null,
  image_url text,
  visibility text not null default 'visible' check (visibility in ('visible', 'hidden')),
  hidden_reason text,
  hidden_by uuid references public.profiles(id) on delete set null,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, content_id)
);

create index if not exists content_visibility_content_idx
on public.content_visibility(content_type, content_id);

create index if not exists content_visibility_source_idx
on public.content_visibility(source_id);

create index if not exists content_visibility_owner_id_idx
on public.content_visibility(owner_id);

create index if not exists content_visibility_visibility_idx
on public.content_visibility(visibility);

drop trigger if exists set_content_visibility_updated_at on public.content_visibility;
create trigger set_content_visibility_updated_at
before update on public.content_visibility
for each row execute function public.set_updated_at();

create or replace view public.public_content_visibility as
select
  content_type,
  content_id,
  source_id,
  owner_id,
  image_url,
  visibility
from public.content_visibility;

alter table public.admin_moderation_actions enable row level security;
alter table public.content_visibility enable row level security;

drop policy if exists "admin_moderation_actions_select_admin" on public.admin_moderation_actions;
create policy "admin_moderation_actions_select_admin"
on public.admin_moderation_actions for select
to authenticated
using (public.is_barangay_admin());

drop policy if exists "admin_moderation_actions_insert_admin" on public.admin_moderation_actions;
create policy "admin_moderation_actions_insert_admin"
on public.admin_moderation_actions for insert
to authenticated
with check (public.is_barangay_admin() and reviewed_by = auth.uid());

drop policy if exists "admin_moderation_actions_update_admin" on public.admin_moderation_actions;
create policy "admin_moderation_actions_update_admin"
on public.admin_moderation_actions for update
to authenticated
using (public.is_barangay_admin())
with check (public.is_barangay_admin());

drop policy if exists "content_visibility_select_admin" on public.content_visibility;
create policy "content_visibility_select_admin"
on public.content_visibility for select
to authenticated
using (public.is_barangay_admin());

drop policy if exists "content_visibility_insert_admin" on public.content_visibility;
create policy "content_visibility_insert_admin"
on public.content_visibility for insert
to authenticated
with check (public.is_barangay_admin());

drop policy if exists "content_visibility_update_admin" on public.content_visibility;
create policy "content_visibility_update_admin"
on public.content_visibility for update
to authenticated
using (public.is_barangay_admin())
with check (public.is_barangay_admin());

grant select on public.public_content_visibility to authenticated;

notify pgrst, 'reload schema';
