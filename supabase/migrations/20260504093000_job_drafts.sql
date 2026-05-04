-- Private job drafts let unverified users compose posts before barangay verification.

create table if not exists public.job_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  description text,
  category text,
  tags text[] not null default '{}',
  barangay text default 'Barangay San Pedro',
  location_text text,
  budget_amount numeric,
  workers_needed integer,
  schedule_text text,
  allow_messages boolean not null default true,
  auto_reply_enabled boolean not null default false,
  auto_close_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_drafts_workers_needed_positive
    check (workers_needed is null or workers_needed > 0)
);

create index if not exists job_drafts_user_id_idx on public.job_drafts(user_id);
create index if not exists job_drafts_updated_at_idx on public.job_drafts(updated_at desc);

drop trigger if exists set_job_drafts_updated_at on public.job_drafts;
create trigger set_job_drafts_updated_at
before update on public.job_drafts
for each row execute function public.set_updated_at();

alter table public.job_drafts enable row level security;

drop policy if exists "job_drafts_select_own" on public.job_drafts;
create policy "job_drafts_select_own"
on public.job_drafts for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "job_drafts_insert_own" on public.job_drafts;
create policy "job_drafts_insert_own"
on public.job_drafts for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "job_drafts_update_own" on public.job_drafts;
create policy "job_drafts_update_own"
on public.job_drafts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "job_drafts_delete_own" on public.job_drafts;
create policy "job_drafts_delete_own"
on public.job_drafts for delete
to authenticated
using (user_id = auth.uid());
