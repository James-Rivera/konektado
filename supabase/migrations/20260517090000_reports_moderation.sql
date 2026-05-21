-- Durable moderation reports for jobs, services, users, and conversations.

create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  admin_notes text,
  constraint reports_status_check check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint reports_target_check check (
    reported_user_id is not null
    or job_id is not null
    or service_id is not null
    or conversation_id is not null
  )
);

create index if not exists reports_reporter_id_idx on public.reports(reporter_id);
create index if not exists reports_reported_user_id_idx on public.reports(reported_user_id);
create index if not exists reports_job_id_idx on public.reports(job_id);
create index if not exists reports_service_id_idx on public.reports(service_id);
create index if not exists reports_conversation_id_idx on public.reports(conversation_id);
create index if not exists reports_status_created_at_idx on public.reports(status, created_at desc);

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

create or replace function public.protect_report_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.reporter_id is distinct from old.reporter_id
    or new.reported_user_id is distinct from old.reported_user_id
    or new.job_id is distinct from old.job_id
    or new.service_id is distinct from old.service_id
    or new.conversation_id is distinct from old.conversation_id
    or new.reason is distinct from old.reason
    or new.details is distinct from old.details
    or new.created_at is distinct from old.created_at then
    raise exception 'Report target and content fields cannot be changed after submission.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_reports_immutable_fields on public.reports;
create trigger protect_reports_immutable_fields
before update on public.reports
for each row execute function public.protect_report_immutable_fields();

alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports for select
to authenticated
using (reporter_id = auth.uid());

drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin"
on public.reports for select
to authenticated
using (public.is_barangay_admin());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
on public.reports for update
to authenticated
using (public.is_barangay_admin())
with check (public.is_barangay_admin());

notify pgrst, 'reload schema';
