-- Profile ecosystem ownership cleanup.
-- Profiles keep identity, capability, preference, trust, and reputation.
-- Listings own rates, budgets, schedules, requirements, message options, and inventory.

alter table public.client_profiles
  add column if not exists coordination_style text;

alter table public.provider_profiles
  drop constraint if exists provider_profiles_completed_rate_range_required;

comment on column public.client_profiles.coordination_style is
  'General client coordination and communication style. Job-specific message options, requirements, dates, and schedules belong to job posts.';

comment on column public.provider_profiles.rate_text is
  'DEPRECATED profile-owned pricing field. Preserved for audit/compatibility only; service listings own rate notes.';

comment on column public.provider_profiles.rate_min is
  'DEPRECATED profile-owned pricing field. Preserved for audit/compatibility only; service listings own minimum rates.';

comment on column public.provider_profiles.rate_max is
  'DEPRECATED profile-owned pricing field. Preserved for audit/compatibility only; service listings own maximum rates.';

comment on column public.provider_profiles.rate_type is
  'DEPRECATED profile-owned pricing field. Preserved for audit/compatibility only; service listings own pricing units.';

comment on column public.provider_profiles.rate_negotiable is
  'DEPRECATED profile-owned pricing field. Preserved for audit/compatibility only; service listings own negotiability.';

comment on column public.client_profiles.budget_preference is
  'DEPRECATED profile-owned budget field. Preserved for audit/compatibility only; job posts own budget ranges and negotiability.';

comment on column public.profiles.availability is
  'Legacy general response expectation. Profile UI no longer treats this as marketplace availability; work defaults live on provider_profiles and listing availability lives on services.';

create or replace function public.get_public_provider_profile_summaries(p_user_ids uuid[])
returns table (
  user_id uuid,
  service_type text,
  headline text,
  bio text,
  service_area text,
  availability text,
  custom_offered_services text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pp.user_id,
    pp.service_type,
    pp.headline,
    pp.bio,
    pp.service_area,
    pp.availability,
    pp.custom_offered_services
  from public.provider_profiles pp
  join public.profiles p on p.id = pp.user_id
  where p_user_ids is not null
    and pp.user_id = any(p_user_ids)
    and (
      pp.user_id = auth.uid()
      or coalesce(p.barangay_verified_at, p.verified_at) is not null
      or public.is_barangay_admin()
    );
$$;

comment on function public.get_public_provider_profile_summaries(uuid[]) is
  'Returns public-safe Work Profile fields for verified public worker profiles, the caller profile, or admin callers. Deprecated profile pricing fields are intentionally excluded.';

revoke all on function public.get_public_provider_profile_summaries(uuid[]) from public;
grant execute on function public.get_public_provider_profile_summaries(uuid[]) to anon, authenticated;

create or replace function public.get_public_client_profile_summaries(p_user_ids uuid[])
returns table (
  user_id uuid,
  headline text,
  bio text,
  needed_services text[],
  custom_needed_services text[],
  coordination_style text,
  preferred_schedule text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cp.user_id,
    cp.headline,
    cp.bio,
    cp.needed_services,
    cp.custom_needed_services,
    cp.coordination_style,
    cp.preferred_schedule
  from public.client_profiles cp
  join public.profiles p on p.id = cp.user_id
  where p_user_ids is not null
    and cp.user_id = any(p_user_ids)
    and (
      cp.user_id = auth.uid()
      or coalesce(p.barangay_verified_at, p.verified_at) is not null
      or public.is_barangay_admin()
    );
$$;

comment on function public.get_public_client_profile_summaries(uuid[]) is
  'Returns public-safe Hiring Profile fields for verified public client profiles, the caller profile, or admin callers. Deprecated profile budget fields are intentionally excluded.';

revoke all on function public.get_public_client_profile_summaries(uuid[]) from public;
grant execute on function public.get_public_client_profile_summaries(uuid[]) to anon, authenticated;

drop policy if exists "credentials_select_approved_public" on public.credentials;
create policy "credentials_select_approved_public"
on public.credentials for select
to anon, authenticated
using (status = 'approved');

notify pgrst, 'reload schema';
