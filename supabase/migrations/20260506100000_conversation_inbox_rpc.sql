create index if not exists messages_conversation_created_at_desc_idx
on public.messages(conversation_id, created_at desc);

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
  last_message_created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id as conversation_id,
    c.job_id,
    c.service_id,
    c.client_id,
    c.provider_id,
    c.started_by,
    c.status,
    c.hired_at,
    c.created_at as conversation_created_at,
    c.updated_at as conversation_updated_at,
    j.title as job_title,
    s.title as service_title,
    client.full_name as client_full_name,
    client.first_name as client_first_name,
    client.last_name as client_last_name,
    client.barangay as client_barangay,
    client.city as client_city,
    client.about as client_about,
    client.avatar_url as client_avatar_url,
    client.availability as client_availability,
    client.verified_at as client_verified_at,
    client.barangay_verified_at as client_barangay_verified_at,
    provider.full_name as provider_full_name,
    provider.first_name as provider_first_name,
    provider.last_name as provider_last_name,
    provider.barangay as provider_barangay,
    provider.city as provider_city,
    provider.about as provider_about,
    provider.avatar_url as provider_avatar_url,
    provider.availability as provider_availability,
    provider.verified_at as provider_verified_at,
    provider.barangay_verified_at as provider_barangay_verified_at,
    latest.id as last_message_id,
    latest.sender_id as last_message_sender_id,
    latest.body as last_message_body,
    latest.created_at as last_message_created_at
  from public.conversations c
  left join public.jobs j on j.id = c.job_id
  left join public.services s on s.id = c.service_id
  left join public.profiles client on client.id = c.client_id
  left join public.profiles provider on provider.id = c.provider_id
  left join lateral (
    select m.id, m.sender_id, m.body, m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) latest on true
  where (
    c.client_id = auth.uid()
    or c.provider_id = auth.uid()
    or public.is_barangay_admin()
  )
    and (p_include_archived or c.status <> 'archived')
  order by coalesce(latest.created_at, c.updated_at) desc, c.updated_at desc;
$$;

revoke all on function public.get_my_conversation_inbox(boolean) from public;
grant execute on function public.get_my_conversation_inbox(boolean) to authenticated;
