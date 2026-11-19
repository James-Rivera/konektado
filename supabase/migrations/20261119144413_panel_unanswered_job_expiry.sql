begin;

alter table public.jobs drop constraint jobs_check;
alter table public.jobs add constraint jobs_closure_reason_check
  check (closure_reason is null or (status = 'closed' and closure_reason in
    ('not_needed', 'found_elsewhere', 'no_worker_found', 'mutual_cancellation', 'expired_no_worker')));

create index jobs_unanswered_expiry_candidates on public.jobs(scheduled_date, id)
where status in ('open', 'reviewing') and accepted_provider_id is null and scheduled_date is not null;

create function app_private.job_has_worker_message(p_job_id uuid, p_client_id uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.conversations c join public.messages m on m.conversation_id = c.id
    where c.job_id = p_job_id and c.client_id = p_client_id and c.provider_id <> c.client_id
      and m.sender_id = c.provider_id
  );
$$;

create function app_private.job_is_due_to_expire(j public.jobs, p_now timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select j.status in ('open', 'reviewing') and j.accepted_provider_id is null
    and j.scheduled_date is not null and j.scheduled_date < (p_now at time zone 'Asia/Manila')::date
    and not app_private.job_has_worker_message(j.id, coalesce(j.client_id, j.owner_id));
$$;

create function app_private.expire_unanswered_jobs(p_now timestamptz default statement_timestamp(), p_limit integer default 200)
returns integer language plpgsql security definer set search_path = '' as $$
declare j public.jobs%rowtype; expired integer := 0;
begin
  for j in
    select open_job.* from public.jobs open_job
    where open_job.status in ('open', 'reviewing') and open_job.accepted_provider_id is null
      and open_job.scheduled_date < (p_now at time zone 'Asia/Manila')::date
      and not app_private.job_has_worker_message(open_job.id, coalesce(open_job.client_id, open_job.owner_id))
    order by open_job.scheduled_date, open_job.id
    limit least(greatest(coalesce(p_limit, 200), 1), 500)
    for update skip locked
  loop
    -- Recheck messages after locking the same job row used by the first-reply guard.
    if not app_private.job_is_due_to_expire(j, p_now) then continue; end if;
    update public.jobs set status = 'closed', closure_reason = 'expired_no_worker', closed_at = p_now where id = j.id;
    insert into public.notifications(user_id, type, title, body, route)
    values(coalesce(j.client_id, j.owner_id), 'job_expired', 'Your job request expired',
      'The scheduled day ended without a worker message. You can review it in Your Posts or post a new request.',
      '/job/' || j.id::text);
    expired := expired + 1;
  end loop;
  return expired;
end;
$$;

create function app_private.guard_job_reply_after_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.conversations%rowtype; j public.jobs%rowtype;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if c.job_id is null then return new; end if;
  if new.sender_id = c.provider_id then
    select * into j from public.jobs where id = c.job_id for update;
  else
    select * into j from public.jobs where id = c.job_id;
  end if;
  if j.closure_reason = 'expired_no_worker' or app_private.job_is_due_to_expire(j, statement_timestamp()) then
    raise exception 'This job request expired after its scheduled day. Start a new request to arrange work.';
  end if;
  return new;
end;
$$;
create trigger guard_job_reply_after_deadline before insert on public.messages
for each row execute function app_private.guard_job_reply_after_deadline();

create function app_private.guard_job_status_after_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'in_progress' and old.status in ('open', 'reviewing')
    and app_private.job_is_due_to_expire(old, statement_timestamp()) then
    raise exception 'This job request expired after its scheduled day.';
  end if;
  if old.status = 'cancelled' and new.status in ('open', 'reviewing')
    and app_private.job_is_due_to_expire(new, statement_timestamp()) then
    raise exception 'Edit the scheduled date before reactivating this job.';
  end if;
  return new;
end;
$$;
create trigger guard_job_status_after_deadline before update of status on public.jobs
for each row execute function app_private.guard_job_status_after_deadline();

revoke all on function app_private.job_has_worker_message(uuid, uuid),
  app_private.job_is_due_to_expire(public.jobs, timestamptz),
  app_private.expire_unanswered_jobs(timestamptz, integer),
  app_private.guard_job_reply_after_deadline(), app_private.guard_job_status_after_deadline()
from public, anon, authenticated, service_role;

create function public.get_job_chat_expired(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.conversations c join public.jobs j on j.id = c.job_id
    where c.id = p_conversation_id and auth.uid() in (c.client_id, c.provider_id)
      and (j.closure_reason = 'expired_no_worker' or app_private.job_is_due_to_expire(j, statement_timestamp())));
$$;
revoke all on function public.get_job_chat_expired(uuid) from public, anon;
grant execute on function public.get_job_chat_expired(uuid) to authenticated;

commit;
