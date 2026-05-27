-- Safe cleanup for demo data that violates verification-gated public visibility.
-- This does not delete auth users, profiles, admin accounts, or verification requests.
-- It marks invalid public services inactive, cancels invalid public jobs,
-- removes invalid work conversations/messages, and removes invalid reviews.

begin;

create temp table _cleanup_canonical_verification_status as
with prioritized_verifications as (
  select
    v.*,
    row_number() over (
      partition by v.user_id
      order by (v.status = 'pending') desc, v.created_at desc, v.id
    ) as rn
  from public.verifications v
),
admin_users as (
  select distinct ur.user_id
  from public.user_roles ur
  where ur.role = 'barangay_admin'
)
select
  p.id as user_id,
  case
    when pv.status = 'pending' then 'pending'
    when pv.status = 'approved' then 'verified'
    when pv.status = 'rejected' then 'rejected'
    when coalesce(p.barangay_verified_at, p.verified_at) is not null then 'verified'
    else 'unverified'
  end as verification_status
from public.profiles p
left join prioritized_verifications pv
  on pv.user_id = p.id
 and pv.rn = 1
where not exists (
  select 1
  from admin_users admin
  where admin.user_id = p.id
);

select
  'invalid_active_jobs_before_cleanup' as check_name,
  j.id,
  coalesce(j.client_id, j.owner_id) as owner_id,
  status.verification_status,
  j.status,
  j.title
from public.jobs j
join _cleanup_canonical_verification_status status
  on status.user_id = coalesce(j.client_id, j.owner_id)
where j.status in ('open', 'reviewing', 'in_progress')
  and status.verification_status <> 'verified'
order by j.created_at desc;

select
  'invalid_active_services_before_cleanup' as check_name,
  s.id,
  s.provider_id as owner_id,
  status.verification_status,
  case when s.is_active then 'active' else 'inactive' end as status,
  s.title
from public.services s
join _cleanup_canonical_verification_status status
  on status.user_id = s.provider_id
where s.is_active = true
  and status.verification_status <> 'verified'
order by s.created_at desc;

update public.jobs j
set
  status = 'cancelled',
  photo_urls = '{}'::text[],
  closed_at = coalesce(j.closed_at, now()),
  updated_at = now()
from _cleanup_canonical_verification_status status
where status.user_id = coalesce(j.client_id, j.owner_id)
  and status.verification_status <> 'verified'
  and (
    j.status in ('open', 'reviewing', 'in_progress')
    or cardinality(coalesce(j.photo_urls, '{}'::text[])) > 0
  );

update public.services s
set
  is_active = false,
  photo_urls = '{}'::text[],
  updated_at = now()
from _cleanup_canonical_verification_status status
where status.user_id = s.provider_id
  and status.verification_status <> 'verified'
  and (
    s.is_active = true
    or cardinality(coalesce(s.photo_urls, '{}'::text[])) > 0
  );

delete from public.messages m
using public.conversations c
join _cleanup_canonical_verification_status client_status
  on client_status.user_id = c.client_id
join _cleanup_canonical_verification_status provider_status
  on provider_status.user_id = c.provider_id
where m.conversation_id = c.id
  and (
    client_status.verification_status <> 'verified'
    or provider_status.verification_status <> 'verified'
  );

delete from public.conversations c
using _cleanup_canonical_verification_status client_status,
      _cleanup_canonical_verification_status provider_status
where client_status.user_id = c.client_id
  and provider_status.user_id = c.provider_id
  and (
    client_status.verification_status <> 'verified'
    or provider_status.verification_status <> 'verified'
  );

delete from public.reviews r
using _cleanup_canonical_verification_status reviewer_status,
      _cleanup_canonical_verification_status reviewee_status
where reviewer_status.user_id = r.reviewer_id
  and reviewee_status.user_id = r.reviewee_id
  and (
    reviewer_status.verification_status <> 'verified'
    or reviewee_status.verification_status <> 'verified'
  );

select
  'invalid_active_jobs_after_cleanup' as check_name,
  count(*)::integer as invalid_count
from public.jobs j
join _cleanup_canonical_verification_status status
  on status.user_id = coalesce(j.client_id, j.owner_id)
where j.status in ('open', 'reviewing', 'in_progress')
  and status.verification_status <> 'verified';

select
  'invalid_active_services_after_cleanup' as check_name,
  count(*)::integer as invalid_count
from public.services s
join _cleanup_canonical_verification_status status
  on status.user_id = s.provider_id
where s.is_active = true
  and status.verification_status <> 'verified';

select
  'invalid_conversations_after_cleanup' as check_name,
  count(*)::integer as invalid_count
from public.conversations c
join _cleanup_canonical_verification_status client_status
  on client_status.user_id = c.client_id
join _cleanup_canonical_verification_status provider_status
  on provider_status.user_id = c.provider_id
where client_status.verification_status <> 'verified'
   or provider_status.verification_status <> 'verified';

select
  'invalid_reviews_after_cleanup' as check_name,
  count(*)::integer as invalid_count
from public.reviews r
join _cleanup_canonical_verification_status reviewer_status
  on reviewer_status.user_id = r.reviewer_id
join _cleanup_canonical_verification_status reviewee_status
  on reviewee_status.user_id = r.reviewee_id
where reviewer_status.verification_status <> 'verified'
   or reviewee_status.verification_status <> 'verified';

select
  'invalid_job_service_photos_after_cleanup' as check_name,
  (
    select count(*)
    from public.jobs j
    join _cleanup_canonical_verification_status status
      on status.user_id = coalesce(j.client_id, j.owner_id)
    where status.verification_status <> 'verified'
      and cardinality(coalesce(j.photo_urls, '{}'::text[])) > 0
  ) + (
    select count(*)
    from public.services s
    join _cleanup_canonical_verification_status status
      on status.user_id = s.provider_id
    where status.verification_status <> 'verified'
      and cardinality(coalesce(s.photo_urls, '{}'::text[])) > 0
  ) as invalid_count;

commit;
