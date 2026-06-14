-- Stabilize marketplace identity, conversation state, and post-scoped saves.

alter table public.conversation_reads
  add column if not exists archived_at timestamptz;

create index if not exists conversation_reads_user_archive_idx
on public.conversation_reads(user_id, archived_at, conversation_id);

-- Merge any legacy duplicate context threads before reasserting uniqueness.
drop index if exists public.conversations_job_provider_unique_idx;
drop index if exists public.conversations_service_client_provider_unique_idx;

create temporary table conversation_duplicate_map
on commit drop
as
select duplicate_id, canonical_id
from (
  select
    id as duplicate_id,
    first_value(id) over (
      partition by job_id, provider_id
      order by created_at, id
    ) as canonical_id,
    row_number() over (
      partition by job_id, provider_id
      order by created_at, id
    ) as duplicate_rank
  from public.conversations
  where job_id is not null

  union all

  select
    id as duplicate_id,
    first_value(id) over (
      partition by service_id, client_id, provider_id
      order by created_at, id
    ) as canonical_id,
    row_number() over (
      partition by service_id, client_id, provider_id
      order by created_at, id
    ) as duplicate_rank
  from public.conversations
  where service_id is not null
    and job_id is null
) ranked
where duplicate_rank > 1;

insert into public.conversation_reads (
  conversation_id,
  user_id,
  last_read_at,
  archived_at
)
select
  duplicates.canonical_id,
  reads.user_id,
  max(reads.last_read_at),
  max(reads.archived_at)
from conversation_duplicate_map duplicates
join public.conversation_reads reads
  on reads.conversation_id = duplicates.duplicate_id
group by duplicates.canonical_id, reads.user_id
on conflict (conversation_id, user_id)
do update set
  last_read_at = greatest(
    public.conversation_reads.last_read_at,
    excluded.last_read_at
  ),
  archived_at = greatest(
    public.conversation_reads.archived_at,
    excluded.archived_at
  );

update public.messages messages
set conversation_id = duplicates.canonical_id
from conversation_duplicate_map duplicates
where messages.conversation_id = duplicates.duplicate_id;

update public.reports reports
set conversation_id = duplicates.canonical_id
from conversation_duplicate_map duplicates
where reports.conversation_id = duplicates.duplicate_id;

update public.notifications notifications
set
  route = case
    when notifications.route = '/conversation/' || duplicates.duplicate_id::text
      then '/conversation/' || duplicates.canonical_id::text
    else notifications.route
  end,
  metadata = jsonb_set(
    notifications.metadata,
    '{conversation_id}',
    to_jsonb(duplicates.canonical_id),
    true
  )
from conversation_duplicate_map duplicates
where notifications.metadata->>'conversation_id' = duplicates.duplicate_id::text
   or notifications.route = '/conversation/' || duplicates.duplicate_id::text;

with duplicate_state as (
  select
    duplicates.canonical_id,
    max(conversations.updated_at) as updated_at,
    max(conversations.hired_at) as hired_at,
    bool_or(conversations.status = 'hired') as has_hired,
    bool_or(conversations.status = 'reported') as has_reported,
    bool_or(conversations.status = 'declined') as has_declined
  from conversation_duplicate_map duplicates
  join public.conversations conversations
    on conversations.id in (duplicates.canonical_id, duplicates.duplicate_id)
  group by duplicates.canonical_id
)
update public.conversations conversations
set
  updated_at = greatest(conversations.updated_at, duplicate_state.updated_at),
  hired_at = coalesce(conversations.hired_at, duplicate_state.hired_at),
  status = case
    when duplicate_state.has_hired then 'hired'
    when duplicate_state.has_reported then 'reported'
    when duplicate_state.has_declined then 'declined'
    else conversations.status
  end
from duplicate_state
where conversations.id = duplicate_state.canonical_id;

delete from public.conversations conversations
using conversation_duplicate_map duplicates
where conversations.id = duplicates.duplicate_id;

-- Global archive was previously used as a user action. Restore those threads;
-- archive visibility is now stored per participant in conversation_reads.
update public.conversations
set status = 'active'
where status = 'archived';

create unique index conversations_job_provider_unique_idx
on public.conversations(job_id, provider_id)
where job_id is not null;

create unique index conversations_service_client_provider_unique_idx
on public.conversations(service_id, client_id, provider_id)
where service_id is not null;

create or replace function public.archive_conversation(p_conversation_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  archive_time timestamptz := now();
begin
  if not exists (
    select 1
    from public.conversations conversations
    where conversations.id = p_conversation_id
      and (
        conversations.client_id = auth.uid()
        or conversations.provider_id = auth.uid()
      )
  ) then
    raise exception 'Only conversation participants can archive this chat.';
  end if;

  insert into public.conversation_reads (
    conversation_id,
    user_id,
    last_read_at,
    archived_at
  )
  values (p_conversation_id, auth.uid(), archive_time, archive_time)
  on conflict (conversation_id, user_id)
  do update set archived_at = excluded.archived_at;

  return archive_time;
end;
$$;

revoke all on function public.archive_conversation(uuid) from public;
grant execute on function public.archive_conversation(uuid) to authenticated;

create or replace function public.restore_conversation_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_reads
  set archived_at = null
  where conversation_id = new.conversation_id
    and archived_at is not null;

  return new;
end;
$$;

drop trigger if exists restore_conversation_on_new_message on public.messages;
create trigger restore_conversation_on_new_message
after insert on public.messages
for each row execute function public.restore_conversation_on_new_message();

drop function if exists public.get_my_conversation_inbox(boolean);
create function public.get_my_conversation_inbox(
  p_include_archived boolean default false
)
returns table (
  conversation_id uuid,
  job_id uuid,
  service_id uuid,
  client_id uuid,
  provider_id uuid,
  started_by uuid,
  status text,
  hired_at timestamptz,
  conversation_created_at timestamptz,
  conversation_updated_at timestamptz,
  archived_at timestamptz,
  job_title text,
  service_title text,
  client_full_name text,
  client_first_name text,
  client_last_name text,
  client_barangay text,
  client_city text,
  client_about text,
  client_avatar_url text,
  client_availability text,
  client_verified_at timestamptz,
  client_barangay_verified_at timestamptz,
  provider_full_name text,
  provider_first_name text,
  provider_last_name text,
  provider_barangay text,
  provider_city text,
  provider_about text,
  provider_avatar_url text,
  provider_availability text,
  provider_verified_at timestamptz,
  provider_barangay_verified_at timestamptz,
  last_message_id uuid,
  last_message_sender_id uuid,
  last_message_body text,
  last_message_attachment_path text,
  last_message_created_at timestamptz,
  unread_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    conversations.id,
    conversations.job_id,
    conversations.service_id,
    conversations.client_id,
    conversations.provider_id,
    conversations.started_by,
    conversations.status,
    conversations.hired_at,
    conversations.created_at,
    conversations.updated_at,
    reads.archived_at,
    jobs.title,
    services.title,
    client.full_name,
    client.first_name,
    client.last_name,
    client.barangay,
    client.city,
    client.about,
    client.avatar_url,
    client.availability,
    client.verified_at,
    client.barangay_verified_at,
    provider.full_name,
    provider.first_name,
    provider.last_name,
    provider.barangay,
    provider.city,
    provider.about,
    provider.avatar_url,
    provider.availability,
    provider.verified_at,
    provider.barangay_verified_at,
    latest.id,
    latest.sender_id,
    latest.body,
    latest.attachment_path,
    latest.created_at,
    (
      select count(*)
      from public.messages unread
      where unread.conversation_id = conversations.id
        and unread.sender_id <> auth.uid()
        and unread.created_at > coalesce(
          reads.last_read_at,
          '-infinity'::timestamptz
        )
    )
  from public.conversations conversations
  left join public.jobs jobs on jobs.id = conversations.job_id
  left join public.services services on services.id = conversations.service_id
  left join public.profiles client on client.id = conversations.client_id
  left join public.profiles provider on provider.id = conversations.provider_id
  left join public.conversation_reads reads
    on reads.conversation_id = conversations.id
    and reads.user_id = auth.uid()
  left join lateral (
    select
      messages.id,
      messages.sender_id,
      messages.body,
      messages.attachment_path,
      messages.created_at
    from public.messages messages
    where messages.conversation_id = conversations.id
    order by messages.created_at desc, messages.id desc
    limit 1
  ) latest on true
  where (
    conversations.client_id = auth.uid()
    or conversations.provider_id = auth.uid()
    or public.is_barangay_admin()
  )
    and (p_include_archived or reads.archived_at is null)
  order by
    coalesce(latest.created_at, conversations.updated_at) desc,
    conversations.updated_at desc;
$$;

revoke all on function public.get_my_conversation_inbox(boolean) from public;
grant execute on function public.get_my_conversation_inbox(boolean) to authenticated;

-- Keep the existing private table while changing its contract from
-- job/provider identities to job/service posts.
alter table public.saved_items
  drop constraint if exists saved_items_item_type_check;

with provider_targets as (
  select
    saved.id,
    (
      select services.id
      from public.services services
      where services.provider_id = saved.item_id
      order by services.is_active desc, services.updated_at desc, services.id
      limit 1
    ) as service_id
  from public.saved_items saved
  where saved.item_type = 'provider'
)
delete from public.saved_items saved
using provider_targets targets
where saved.id = targets.id
  and targets.service_id is null;

with provider_targets as (
  select
    saved.id,
    saved.user_id,
    (
      select services.id
      from public.services services
      where services.provider_id = saved.item_id
      order by services.is_active desc, services.updated_at desc, services.id
      limit 1
    ) as service_id
  from public.saved_items saved
  where saved.item_type = 'provider'
)
delete from public.saved_items saved
using provider_targets targets
where saved.id = targets.id
  and exists (
    select 1
    from public.saved_items existing
    where existing.user_id = targets.user_id
      and existing.item_type = 'service'
      and existing.item_id = targets.service_id
  );

with provider_targets as (
  select
    saved.id,
    (
      select services.id
      from public.services services
      where services.provider_id = saved.item_id
      order by services.is_active desc, services.updated_at desc, services.id
      limit 1
    ) as service_id
  from public.saved_items saved
  where saved.item_type = 'provider'
)
update public.saved_items saved
set
  item_type = 'service',
  item_id = targets.service_id
from provider_targets targets
where saved.id = targets.id
  and targets.service_id is not null;

delete from public.saved_items saved
where saved.item_type not in ('job', 'service');

delete from public.saved_items duplicate
using public.saved_items canonical
where duplicate.user_id = canonical.user_id
  and duplicate.item_type = canonical.item_type
  and duplicate.item_id = canonical.item_id
  and (
    duplicate.created_at > canonical.created_at
    or (
      duplicate.created_at = canonical.created_at
      and duplicate.id > canonical.id
    )
  );

alter table public.saved_items
  add constraint saved_items_item_type_check
  check (item_type in ('job', 'service'));

notify pgrst, 'reload schema';
