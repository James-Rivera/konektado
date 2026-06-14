-- Read-only diagnostics for the marketplace workflow stabilization migration.

select
  'duplicate_job_conversations' as check_name,
  count(*) as issue_count
from (
  select job_id, provider_id
  from public.conversations
  where job_id is not null
  group by job_id, provider_id
  having count(*) > 1
) duplicates;

select
  'duplicate_service_conversations' as check_name,
  count(*) as issue_count
from (
  select service_id, client_id, provider_id
  from public.conversations
  where service_id is not null
  group by service_id, client_id, provider_id
  having count(*) > 1
) duplicates;

select
  'legacy_global_archives' as check_name,
  count(*) as issue_count
from public.conversations
where status = 'archived';

select
  'invalid_saved_post_types' as check_name,
  count(*) as issue_count
from public.saved_items
where item_type not in ('job', 'service');

select
  'duplicate_saved_posts' as check_name,
  count(*) as issue_count
from (
  select user_id, item_type, item_id
  from public.saved_items
  group by user_id, item_type, item_id
  having count(*) > 1
) duplicates;

select
  'invalid_conversation_read_owners' as check_name,
  count(*) as issue_count
from public.conversation_reads reads
join public.conversations conversations
  on conversations.id = reads.conversation_id
where reads.user_id not in (conversations.client_id, conversations.provider_id);
