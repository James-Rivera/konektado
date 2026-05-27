-- Manual checks for presentation seed consistency.
-- Run after supabase/reseed_presentation_content_preserve_auth.sql or supabase/seed.sql.

with prioritized_verifications as (
  select
    v.*,
    row_number() over (
      partition by v.user_id
      order by (v.status = 'pending') desc, v.created_at desc, v.id
    ) as rn
  from public.verifications v
),
canonical_status as (
  select
    p.id as user_id,
    p.full_name,
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
    from public.user_roles ur
    where ur.user_id = p.id
      and ur.role = 'barangay_admin'
  )
)
select
  'pending_rejected_unverified_users_with_active_jobs' as check_name,
  status.full_name,
  status.verification_status,
  j.id,
  j.status,
  j.title
from public.jobs j
join canonical_status status on status.user_id = coalesce(j.client_id, j.owner_id)
where status.verification_status <> 'verified'
  and j.status in ('open', 'reviewing', 'in_progress')
order by status.full_name, j.created_at desc;

with prioritized_verifications as (
  select v.*, row_number() over (partition by v.user_id order by (v.status = 'pending') desc, v.created_at desc, v.id) as rn
  from public.verifications v
),
canonical_status as (
  select p.id as user_id, p.full_name,
    case
      when pv.status = 'pending' then 'pending'
      when pv.status = 'approved' then 'verified'
      when pv.status = 'rejected' then 'rejected'
      when coalesce(p.barangay_verified_at, p.verified_at) is not null then 'verified'
      else 'unverified'
    end as verification_status
  from public.profiles p
  left join prioritized_verifications pv on pv.user_id = p.id and pv.rn = 1
)
select
  'pending_rejected_unverified_users_with_active_services' as check_name,
  status.full_name,
  status.verification_status,
  s.id,
  s.title
from public.services s
join canonical_status status on status.user_id = s.provider_id
where status.verification_status <> 'verified'
  and s.is_active = true
order by status.full_name, s.created_at desc;

with prioritized_verifications as (
  select v.*, row_number() over (partition by v.user_id order by (v.status = 'pending') desc, v.created_at desc, v.id) as rn
  from public.verifications v
),
canonical_status as (
  select p.id as user_id, p.full_name,
    case
      when pv.status = 'pending' then 'pending'
      when pv.status = 'approved' then 'verified'
      when pv.status = 'rejected' then 'rejected'
      when coalesce(p.barangay_verified_at, p.verified_at) is not null then 'verified'
      else 'unverified'
    end as verification_status
  from public.profiles p
  left join prioritized_verifications pv on pv.user_id = p.id and pv.rn = 1
)
select
  'pending_rejected_unverified_users_with_conversations' as check_name,
  c.id,
  client.full_name as client_name,
  client.verification_status as client_status,
  provider.full_name as provider_name,
  provider.verification_status as provider_status,
  c.status
from public.conversations c
join canonical_status client on client.user_id = c.client_id
join canonical_status provider on provider.user_id = c.provider_id
where client.verification_status <> 'verified'
   or provider.verification_status <> 'verified'
order by c.updated_at desc;

with prioritized_verifications as (
  select v.*, row_number() over (partition by v.user_id order by (v.status = 'pending') desc, v.created_at desc, v.id) as rn
  from public.verifications v
),
canonical_status as (
  select p.id as user_id, p.full_name,
    case
      when pv.status = 'pending' then 'pending'
      when pv.status = 'approved' then 'verified'
      when pv.status = 'rejected' then 'rejected'
      when coalesce(p.barangay_verified_at, p.verified_at) is not null then 'verified'
      else 'unverified'
    end as verification_status
  from public.profiles p
  left join prioritized_verifications pv on pv.user_id = p.id and pv.rn = 1
)
select
  'pending_rejected_unverified_users_with_reviews' as check_name,
  r.id,
  reviewer.full_name as reviewer_name,
  reviewer.verification_status as reviewer_status,
  reviewee.full_name as reviewee_name,
  reviewee.verification_status as reviewee_status,
  r.rating,
  r.comment
from public.reviews r
join canonical_status reviewer on reviewer.user_id = r.reviewer_id
join canonical_status reviewee on reviewee.user_id = r.reviewee_id
where reviewer.verification_status <> 'verified'
   or reviewee.verification_status <> 'verified'
order by r.created_at desc;

with prioritized_verifications as (
  select v.*, row_number() over (partition by v.user_id order by (v.status = 'pending') desc, v.created_at desc, v.id) as rn
  from public.verifications v
),
canonical_status as (
  select p.id as user_id, p.full_name,
    case
      when pv.status = 'pending' then 'pending'
      when pv.status = 'approved' then 'verified'
      when pv.status = 'rejected' then 'rejected'
      when coalesce(p.barangay_verified_at, p.verified_at) is not null then 'verified'
      else 'unverified'
    end as verification_status
  from public.profiles p
  left join prioritized_verifications pv on pv.user_id = p.id and pv.rn = 1
),
invalid_photos as (
  select 'job' as source, j.id, status.full_name, status.verification_status, image_url
  from public.jobs j
  join canonical_status status on status.user_id = coalesce(j.client_id, j.owner_id)
  cross join lateral unnest(coalesce(j.photo_urls, '{}'::text[])) as image_url
  where status.verification_status <> 'verified'
  union all
  select 'service', s.id, status.full_name, status.verification_status, image_url
  from public.services s
  join canonical_status status on status.user_id = s.provider_id
  cross join lateral unnest(coalesce(s.photo_urls, '{}'::text[])) as image_url
  where status.verification_status <> 'verified'
)
select
  'pending_rejected_unverified_users_with_public_job_service_photos' as check_name,
  *
from invalid_photos
order by source, full_name;

with visible_copy as (
  select 'profiles.about' as field_name, id::text as row_id, about as value from public.profiles
  union all select 'profiles.availability', id::text, availability from public.profiles
  union all select 'provider_profiles.headline', user_id::text, headline from public.provider_profiles
  union all select 'provider_profiles.bio', user_id::text, bio from public.provider_profiles
  union all select 'client_profiles.headline', user_id::text, headline from public.client_profiles
  union all select 'client_profiles.bio', user_id::text, bio from public.client_profiles
  union all select 'services.title', id::text, title from public.services
  union all select 'services.description', id::text, description from public.services
  union all select 'jobs.title', id::text, title from public.jobs
  union all select 'jobs.description', id::text, description from public.jobs
  union all select 'messages.body', id::text, body from public.messages
  union all select 'reviews.comment', id::text, comment from public.reviews
)
select
  'visible_content_containing_banned_words' as check_name,
  field_name,
  row_id,
  value
from visible_copy
where coalesce(value, '') ~* '(^|[^a-z])(seed|seeded|demo|test|fake|fictional|sample|placeholder|lorem|mock|dummy|internal|approved client)([^a-z]|$)'
order by field_name, row_id;

with public_images as (
  select 'profile' as source, id::text as row_id, avatar_url as image_url
  from public.profiles
  where nullif(trim(coalesce(avatar_url, '')), '') is not null
  union all
  select 'job', id::text, image_url
  from public.jobs
  cross join lateral unnest(coalesce(photo_urls, '{}'::text[])) as image_url
  union all
  select 'service', id::text, image_url
  from public.services
  cross join lateral unnest(coalesce(photo_urls, '{}'::text[])) as image_url
)
select
  'public_photos_using_cartoon_or_private_sources' as check_name,
  source,
  row_id,
  image_url
from public_images
where coalesce(image_url, '') ~* '(dicebear|notionists|pixel|cartoon|robohash|bottts|avataaars|adventurer|lorelei|identicon|verification-files|verification_files|credential|certificate|id-front|id-back|passport|license|government)'
order by source, row_id;

with public_images as (
  select 'profile' as source, id::text as row_id, avatar_url as image_url
  from public.profiles
  where nullif(trim(coalesce(avatar_url, '')), '') is not null
  union all
  select 'job', id::text, image_url
  from public.jobs
  cross join lateral unnest(coalesce(photo_urls, '{}'::text[])) as image_url
  union all
  select 'service', id::text, image_url
  from public.services
  cross join lateral unnest(coalesce(photo_urls, '{}'::text[])) as image_url
)
select
  'duplicate_public_image_urls' as check_name,
  image_url,
  count(*) as usage_count,
  array_agg(source || ':' || row_id order by source, row_id) as usages
from public_images
where nullif(trim(coalesce(image_url, '')), '') is not null
group by image_url
having count(*) > 1
order by usage_count desc, image_url;
