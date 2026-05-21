-- Phase 5: lightweight in-app notifications with server-side event creation.

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  route text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_at_idx
on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_read_at_idx
on public.notifications(user_id, read_at);

create or replace function public.protect_notification_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.type is distinct from old.type
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.route is distinct from old.route
    or new.metadata is distinct from old.metadata
    or new.created_at is distinct from old.created_at then
    raise exception 'Only notification read state can be changed after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_notifications_immutable_fields on public.notifications;
create trigger protect_notifications_immutable_fields
before update on public.notifications
for each row execute function public.protect_notification_immutable_fields();

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
begin
  select case
    when c.client_id = new.sender_id then c.provider_id
    else c.client_id
  end
  into recipient_id
  from public.conversations c
  where c.id = new.conversation_id
    and (c.client_id = new.sender_id or c.provider_id = new.sender_id);

  if recipient_id is null or recipient_id = new.sender_id then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    route,
    metadata
  )
  values (
    recipient_id,
    'message_received',
    'New message',
    'You received a new message in Konektado.',
    '/conversation/' || new.conversation_id::text,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'sender_id', new.sender_id,
      'message_id', new.id
    )
  );

  return new;
end;
$$;

drop trigger if exists notify_message_recipient_after_insert on public.messages;
create trigger notify_message_recipient_after_insert
after insert on public.messages
for each row execute function public.notify_message_recipient();

create or replace function public.notify_verification_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status
    or new.status not in ('approved', 'rejected', 'needs_more_info') then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    route,
    metadata
  )
  values (
    new.user_id,
    case new.status
      when 'approved' then 'verification_approved'
      when 'rejected' then 'verification_rejected'
      else 'verification_needs_more_info'
    end,
    case new.status
      when 'approved' then 'Verification approved'
      when 'rejected' then 'Verification rejected'
      else 'Verification needs attention'
    end,
    case new.status
      when 'approved' then 'Your barangay verification has been approved.'
      when 'rejected' then 'Your barangay verification was rejected. Review the note and try again.'
      else 'Your barangay verification needs more information.'
    end,
    '/verification',
    jsonb_build_object(
      'verification_id', new.id,
      'status', new.status
    )
  );

  return new;
end;
$$;

drop trigger if exists notify_verification_status_after_update on public.verifications;
create trigger notify_verification_status_after_update
after update of status on public.verifications
for each row execute function public.notify_verification_status_change();

create or replace function public.notify_job_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status
    or new.status <> 'completed'
    or new.accepted_provider_id is null then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    route,
    metadata
  )
  values (
    new.accepted_provider_id,
    'job_completed',
    'Job completed',
    'A client marked your hired job as completed.',
    '/job/' || new.id::text,
    jsonb_build_object(
      'job_id', new.id,
      'client_id', coalesce(new.client_id, new.owner_id)
    )
  );

  return new;
end;
$$;

drop trigger if exists notify_job_completed_after_update on public.jobs;
create trigger notify_job_completed_after_update
after update of status on public.jobs
for each row execute function public.notify_job_completed();

create or replace function public.notify_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    route,
    metadata
  )
  values (
    new.reporter_id,
    'report_status_updated',
    'Report updated',
    'Your report is now marked as ' || replace(new.status, '_', ' ') || '.',
    null,
    jsonb_build_object(
      'report_id', new.id,
      'status', new.status
    )
  );

  return new;
end;
$$;

drop trigger if exists notify_report_status_after_update on public.reports;
create trigger notify_report_status_after_update
after update of status on public.reports
for each row execute function public.notify_report_status_change();

notify pgrst, 'reload schema';
