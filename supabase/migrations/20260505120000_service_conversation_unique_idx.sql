-- Prevent duplicate service request chats between the same client and provider.
create unique index if not exists conversations_service_client_provider_unique_idx
on public.conversations(service_id, client_id, provider_id)
where service_id is not null;
