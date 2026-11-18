-- Moderation is limited to reports filed by a conversation participant.
create function app_private.can_moderate_reported_conversation(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select auth.uid() is not null and public.is_barangay_admin() and exists (
    select 1 from public.reports r join public.conversations c on c.id = r.conversation_id
    where c.id = p_conversation_id and r.reporter_id in (c.client_id, c.provider_id)
  );
$$;
revoke all on function app_private.can_moderate_reported_conversation(uuid) from public, anon;
grant execute on function app_private.can_moderate_reported_conversation(uuid) to authenticated;

drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant on public.conversations for select to authenticated
using (client_id = auth.uid() or provider_id = auth.uid() or app_private.can_moderate_reported_conversation(id));
drop policy if exists conversations_update_verified_participant on public.conversations;
create policy conversations_update_verified_participant on public.conversations for update to authenticated
using (client_id = auth.uid() or provider_id = auth.uid())
with check (client_id = auth.uid() or provider_id = auth.uid());
drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant on public.messages for select to authenticated
using (exists (select 1 from public.conversations c where c.id = conversation_id
  and (c.client_id = auth.uid() or c.provider_id = auth.uid() or app_private.can_moderate_reported_conversation(c.id))));
drop policy if exists message_attachments_select_participant on storage.objects;
create policy message_attachments_select_participant on storage.objects for select to authenticated
using (bucket_id = 'message-attachments' and exists (select 1 from public.conversations c
  where c.id::text = split_part(name, '/', 2)
  and (c.client_id = auth.uid() or c.provider_id = auth.uid() or app_private.can_moderate_reported_conversation(c.id))));
drop policy if exists conversation_reads_select_own on public.conversation_reads;
create policy conversation_reads_select_own on public.conversation_reads for select to authenticated
using (user_id = auth.uid() or app_private.can_moderate_reported_conversation(conversation_id));
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports for insert to authenticated
with check (reporter_id = auth.uid() and (conversation_id is null or exists (
  select 1 from public.conversations c where c.id = reports.conversation_id
  and (c.client_id = auth.uid() or c.provider_id = auth.uid()))));
create or replace function public.get_my_conversation_inbox(
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
  )
    and (p_include_archived or reads.archived_at is null)
  order by
    coalesce(latest.created_at, conversations.updated_at) desc,
    conversations.updated_at desc;
$$;

revoke all on function public.get_my_conversation_inbox(boolean) from public;
grant execute on function public.get_my_conversation_inbox(boolean) to authenticated;



revoke execute on function public.get_my_conversation_inbox(boolean) from anon;
notify pgrst, 'reload schema';
