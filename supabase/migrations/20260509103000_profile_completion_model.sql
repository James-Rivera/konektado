-- Profile trust completion model.
-- Barangay verification proves identity; role profile completion proves a user
-- has enough public context to message, publish jobs, or publish services.

alter table public.provider_profiles
  add column if not exists headline text,
  add column if not exists bio text,
  add column if not exists service_area text,
  add column if not exists response_time text,
  add column if not exists profile_completed_at timestamptz;

alter table public.client_profiles
  add column if not exists headline text,
  add column if not exists bio text,
  add column if not exists needed_services text[] not null default '{}',
  add column if not exists preferred_schedule text,
  add column if not exists budget_preference text,
  add column if not exists profile_completed_at timestamptz;

update public.provider_profiles provider
set
  headline = coalesce(nullif(provider.headline, ''), nullif(provider.service_type, '')),
  bio = coalesce(nullif(provider.bio, ''), nullif(profile.about, '')),
  service_area = coalesce(
    nullif(provider.service_area, ''),
    nullif(concat_ws(', ', nullif(profile.barangay, ''), nullif(profile.city, '')), '')
  ),
  availability = coalesce(nullif(provider.availability, ''), nullif(profile.availability, '')),
  response_time = coalesce(nullif(provider.response_time, ''), nullif(profile.availability, ''))
from public.profiles profile
where provider.user_id = profile.id;

update public.client_profiles client
set
  headline = coalesce(nullif(client.headline, ''), 'Hiring local help'),
  bio = coalesce(nullif(client.bio, ''), nullif(profile.about, '')),
  needed_services = case
    when cardinality(client.needed_services) > 0 then client.needed_services
    else coalesce(prefs.needed_services, '{}') || coalesce(prefs.custom_needed_services, '{}')
  end,
  preferred_schedule = coalesce(nullif(client.preferred_schedule, ''), nullif(profile.availability, ''))
from public.profiles profile
left join public.user_preferences prefs on prefs.user_id = profile.id
where client.user_id = profile.id;

update public.provider_profiles
set profile_completed_at = coalesce(profile_completed_at, now())
where
  nullif(service_type, '') is not null
  and nullif(headline, '') is not null
  and nullif(bio, '') is not null
  and nullif(service_area, '') is not null
  and nullif(availability, '') is not null;

update public.client_profiles
set profile_completed_at = coalesce(profile_completed_at, now())
where
  cardinality(needed_services) > 0
  and nullif(headline, '') is not null
  and nullif(bio, '') is not null
  and nullif(preferred_schedule, '') is not null;

notify pgrst, 'reload schema';
