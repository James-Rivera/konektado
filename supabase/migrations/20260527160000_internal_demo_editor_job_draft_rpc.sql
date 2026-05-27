-- Internal demo editor draft helper for unverified residents.
-- Normal job draft RLS remains owner-scoped; this RPC lets barangay admins
-- create a private draft when preparing demo data for a selected resident.

drop policy if exists "job_drafts_select_barangay_admin" on public.job_drafts;
create policy "job_drafts_select_barangay_admin"
on public.job_drafts for select
to authenticated
using (public.is_barangay_admin());

create or replace function public.internal_demo_create_job_draft(
  p_owner_id uuid,
  p_payload jsonb
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
  category text,
  service_needed text,
  barangay text,
  location_text text,
  budget_min numeric,
  budget_max numeric,
  rate_type text,
  photo_urls text[],
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location text := nullif(trim(coalesce(p_payload->>'locationText', p_payload->>'barangay', 'Barangay San Pedro')), '');
  v_row public.job_drafts%rowtype;
begin
  if not public.is_barangay_admin() then
    raise exception 'Barangay admin access is required.';
  end if;

  if auth.uid() is null then
    raise exception 'Please sign in again to continue.';
  end if;

  if p_owner_id is null then
    raise exception 'Choose a resident before creating a draft.';
  end if;

  insert into public.job_drafts (
    user_id,
    title,
    description,
    category,
    service_needed,
    tags,
    photo_urls,
    barangay,
    location_text,
    public_location_text,
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
    auto_close_enabled
  )
  values (
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
    null,
    nullif(trim(coalesce(p_payload->>'budgetMin', '')), '')::numeric,
    nullif(trim(coalesce(p_payload->>'budgetMax', '')), '')::numeric,
    nullif(trim(coalesce(p_payload->>'rateType', 'per_project')), ''),
    false,
    null,
    null,
    'any',
    false,
    null,
    true,
    false,
    false
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_row.user_id,
    v_row.title,
    v_row.description,
    v_row.category,
    v_row.service_needed,
    v_row.barangay,
    v_row.location_text,
    v_row.budget_min,
    v_row.budget_max,
    v_row.rate_type,
    v_row.photo_urls,
    v_row.created_at,
    v_row.updated_at;
end;
$$;

revoke all on function public.internal_demo_create_job_draft(uuid, jsonb) from public;
grant execute on function public.internal_demo_create_job_draft(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
