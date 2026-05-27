-- Internal demo editor helpers for development-team content curation.
-- These RPCs intentionally require barangay admin access and verified target users.

create or replace function public.internal_demo_create_job(
  p_owner_id uuid,
  p_payload jsonb
)
returns table (
  id uuid,
  owner_id uuid,
  client_id uuid,
  title text,
  description text,
  category text,
  service_needed text,
  barangay text,
  location_text text,
  budget_min numeric,
  budget_max numeric,
  rate_type text,
  status text,
  photo_urls text[],
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.jobs%rowtype;
  v_status text := nullif(trim(coalesce(p_payload->>'status', 'open')), '');
  v_location text := nullif(trim(coalesce(p_payload->>'locationText', p_payload->>'barangay', 'Barangay San Pedro')), '');
begin
  if not public.is_barangay_admin() then
    raise exception 'Barangay admin access is required.';
  end if;

  if auth.uid() is null then
    raise exception 'Please sign in again to continue.';
  end if;

  if p_owner_id is null then
    raise exception 'Choose a resident before creating a job.';
  end if;

  if not public.is_verified_profile(p_owner_id) and v_status in ('open', 'reviewing', 'in_progress') then
    raise exception 'Pending, rejected, or unverified users cannot have active public jobs.';
  end if;

  insert into public.jobs (
    owner_id,
    client_id,
    title,
    description,
    category,
    service_needed,
    tags,
    photo_urls,
    barangay,
    location,
    location_text,
    public_location_text,
    budget,
    budget_amount,
    budget_min,
    budget_max,
    rate_type,
    budget_negotiable,
    workers_needed,
    schedule_text,
    experience_level,
    certification_required,
    certification_note,
    allow_messages,
    auto_reply_enabled,
    auto_close_enabled,
    status
  )
  values (
    p_owner_id,
    p_owner_id,
    nullif(trim(coalesce(p_payload->>'title', '')), ''),
    nullif(trim(coalesce(p_payload->>'description', '')), ''),
    nullif(trim(coalesce(p_payload->>'category', '')), ''),
    nullif(trim(coalesce(p_payload->>'serviceNeeded', '')), ''),
    array[]::text[],
    coalesce(
      array(select jsonb_array_elements_text(coalesce(p_payload->'photoUrls', '[]'::jsonb))),
      array[]::text[]
    ),
    nullif(trim(coalesce(p_payload->>'barangay', 'Barangay San Pedro')), ''),
    v_location,
    v_location,
    v_location,
    null,
    null,
    nullif(trim(coalesce(p_payload->>'budgetMin', '')), '')::numeric,
    nullif(trim(coalesce(p_payload->>'budgetMax', '')), '')::numeric,
    nullif(trim(coalesce(p_payload->>'rateType', 'per_service')), ''),
    false,
    null,
    null,
    'any',
    false,
    null,
    true,
    false,
    false,
    v_status
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_row.owner_id,
    v_row.client_id,
    v_row.title,
    v_row.description,
    v_row.category,
    v_row.service_needed,
    v_row.barangay,
    v_row.location_text,
    v_row.budget_min,
    v_row.budget_max,
    v_row.rate_type,
    v_row.status,
    v_row.photo_urls,
    v_row.created_at,
    v_row.updated_at;
end;
$$;

create or replace function public.internal_demo_create_service(
  p_provider_id uuid,
  p_payload jsonb
)
returns table (
  id uuid,
  provider_id uuid,
  title text,
  description text,
  category text,
  barangay text,
  location_text text,
  rate_min numeric,
  rate_max numeric,
  rate_type text,
  is_active boolean,
  photo_urls text[],
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.services%rowtype;
  v_active boolean := coalesce((p_payload->>'isActive')::boolean, true);
begin
  if not public.is_barangay_admin() then
    raise exception 'Barangay admin access is required.';
  end if;

  if auth.uid() is null then
    raise exception 'Please sign in again to continue.';
  end if;

  if p_provider_id is null then
    raise exception 'Choose a worker before creating a service.';
  end if;

  if not public.is_verified_profile(p_provider_id) and v_active then
    raise exception 'Pending, rejected, or unverified users cannot have active public services.';
  end if;

  insert into public.services (
    provider_id,
    title,
    description,
    category,
    tags,
    photo_urls,
    years_experience,
    availability_text,
    rate_text,
    rate_min,
    rate_max,
    rate_type,
    rate_negotiable,
    experience_level,
    certification_available,
    certification_note,
    custom_category,
    custom_category_review_status,
    barangay,
    location_text,
    allow_messages,
    auto_reply_enabled,
    auto_pause_enabled,
    is_active
  )
  values (
    p_provider_id,
    nullif(trim(coalesce(p_payload->>'title', '')), ''),
    nullif(trim(coalesce(p_payload->>'description', '')), ''),
    nullif(trim(coalesce(p_payload->>'category', '')), ''),
    array[]::text[],
    coalesce(
      array(select jsonb_array_elements_text(coalesce(p_payload->'photoUrls', '[]'::jsonb))),
      array[]::text[]
    ),
    null,
    null,
    null,
    nullif(trim(coalesce(p_payload->>'rateMin', '')), '')::numeric,
    nullif(trim(coalesce(p_payload->>'rateMax', '')), '')::numeric,
    nullif(trim(coalesce(p_payload->>'rateType', 'per_service')), ''),
    false,
    'any',
    false,
    null,
    null,
    'none',
    nullif(trim(coalesce(p_payload->>'barangay', 'Barangay San Pedro')), ''),
    nullif(trim(coalesce(p_payload->>'locationText', p_payload->>'barangay', 'Barangay San Pedro')), ''),
    true,
    false,
    false,
    v_active
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_row.provider_id,
    v_row.title,
    v_row.description,
    v_row.category,
    v_row.barangay,
    v_row.location_text,
    v_row.rate_min,
    v_row.rate_max,
    v_row.rate_type,
    v_row.is_active,
    v_row.photo_urls,
    v_row.created_at,
    v_row.updated_at;
end;
$$;

revoke all on function public.internal_demo_create_job(uuid, jsonb) from public;
revoke all on function public.internal_demo_create_service(uuid, jsonb) from public;
grant execute on function public.internal_demo_create_job(uuid, jsonb) to authenticated;
grant execute on function public.internal_demo_create_service(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
