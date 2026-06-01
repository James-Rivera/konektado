-- Private service drafts let residents compose service posts before verification.

create table if not exists public.service_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text,
  custom_category text,
  title text,
  description text,
  tags text[] not null default '{}',
  photo_urls text[] not null default '{}',
  years_experience numeric,
  availability_text text,
  rate_text text,
  rate_min numeric,
  rate_max numeric,
  rate_type text not null default 'per_service',
  rate_negotiable boolean not null default false,
  experience_level text not null default 'any',
  certification_available boolean not null default false,
  certification_note text,
  barangay text default 'Barangay San Pedro',
  location_text text,
  allow_messages boolean not null default true,
  auto_reply_enabled boolean not null default false,
  auto_pause_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_drafts_rate_range_valid check (
    (rate_min is null or rate_min >= 0)
    and (rate_max is null or rate_max >= 0)
    and (rate_min is null or rate_max is null or rate_min <= rate_max)
  ),
  constraint service_drafts_rate_type_supported check (
    rate_type in (
      'per_service',
      'hourly',
      'daily',
      'weekly',
      'per_project',
      'per_job',
      'per_visit',
      'per_load',
      'per_order',
      'per_meal',
      'per_session'
    )
  ),
  constraint service_drafts_experience_level_supported check (
    experience_level in ('any', 'beginner', 'intermediate', 'experienced')
  )
);

create index if not exists service_drafts_user_id_idx
  on public.service_drafts(user_id);

create index if not exists service_drafts_updated_at_idx
  on public.service_drafts(updated_at desc);

drop trigger if exists set_service_drafts_updated_at on public.service_drafts;
create trigger set_service_drafts_updated_at
before update on public.service_drafts
for each row execute function public.set_updated_at();

alter table public.service_drafts enable row level security;

drop policy if exists "service_drafts_select_own" on public.service_drafts;
create policy "service_drafts_select_own"
on public.service_drafts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "service_drafts_insert_own" on public.service_drafts;
create policy "service_drafts_insert_own"
on public.service_drafts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "service_drafts_update_own" on public.service_drafts;
create policy "service_drafts_update_own"
on public.service_drafts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "service_drafts_delete_own" on public.service_drafts;
create policy "service_drafts_delete_own"
on public.service_drafts
for delete
to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';
