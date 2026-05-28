-- Public-safe profile summaries for marketplace/profile surfaces.
-- Keep this RPC in place before tightening direct profiles reads.

create or replace function public.get_public_profile_summaries(p_user_ids uuid[])
returns table (
  id uuid,
  full_name text,
  first_name text,
  last_name text,
  barangay text,
  city text,
  province text,
  public_location_label text,
  about text,
  avatar_url text,
  availability text,
  verified_at timestamptz,
  barangay_verified_at timestamptz,
  is_verified boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.barangay,
    p.city,
    p.province,
    case
      when nullif(trim(coalesce(p.barangay, '')), '') is not null
        and nullif(trim(coalesce(p.city, '')), '') is not null then
          concat(
            'Brgy. ',
            nullif(trim(regexp_replace(p.barangay, '^(barangay|brgy\.?)\s+', '', 'i')), ''),
            ', ',
            trim(p.city)
          )
      when nullif(trim(coalesce(p.barangay, '')), '') is not null then
          concat(
            'Brgy. ',
            nullif(trim(regexp_replace(p.barangay, '^(barangay|brgy\.?)\s+', '', 'i')), '')
          )
      when nullif(trim(coalesce(p.city, '')), '') is not null
        and nullif(trim(coalesce(p.province, '')), '') is not null then
          concat(trim(p.city), ', ', trim(p.province))
      when nullif(trim(coalesce(p.city, '')), '') is not null then trim(p.city)
      when nullif(trim(coalesce(p.province, '')), '') is not null then trim(p.province)
      else 'Brgy. San Pedro, Santo Tomas'
    end as public_location_label,
    p.about,
    p.avatar_url,
    p.availability,
    p.verified_at,
    p.barangay_verified_at,
    coalesce(p.barangay_verified_at, p.verified_at) is not null as is_verified
  from public.profiles p
  where p_user_ids is not null
    and p.id = any(p_user_ids)
    and (
      p.id = auth.uid()
      or coalesce(p.barangay_verified_at, p.verified_at) is not null
      or public.is_barangay_admin()
    );
$$;

comment on function public.get_public_profile_summaries(uuid[]) is
  'Returns public-safe profile fields for verified public profiles, the caller profile, or admin callers. Does not expose email, phone, birthdate, raw street/subdivision/purok fields, exact address, verification files, or admin notes.';

revoke all on function public.get_public_profile_summaries(uuid[]) from public;
grant execute on function public.get_public_profile_summaries(uuid[]) to anon, authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles for select
to authenticated
using (public.is_barangay_admin());

drop policy if exists "profiles_select_public_or_admin" on public.profiles;

notify pgrst, 'reload schema';
