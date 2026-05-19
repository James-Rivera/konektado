-- Konektado presentation content reseed that preserves login accounts.
--
-- This script keeps Supabase Auth users and identities intact, then refreshes
-- visible Konektado app data for selected non-admin prototype accounts.
--
-- Preserved:
--   auth.users, auth.identities, schema migrations, storage buckets,
--   verification files, credential files, and account IDs.
--
-- Refreshed:
--   selected non-admin profile display fields, role-profile display fields,
--   services, jobs, conversations, messages, reviews, saved items,
--   notifications, reports, and job drafts.
--
-- Run only against prototype or sample environments. Replace this fictional
-- marketplace content before official launch.

begin;

drop table if exists _seed_profile_templates;
drop table if exists _seed_excluded_accounts;
drop table if exists _seed_people;
drop table if exists _seed_account_before;
drop table if exists _seed_account_change_log;
drop table if exists _seed_updated_profiles;
drop table if exists _seed_service_rows;
drop table if exists _seed_inserted_services;
drop table if exists _seed_job_rows;
drop table if exists _seed_inserted_jobs;
drop table if exists _seed_conversations;
drop table if exists _seed_message_rows;

create temp table _seed_profile_templates (
  slot integer primary key,
  first_name text not null,
  last_name text not null,
  public_area text not null,
  active_role public.app_role not null,
  about text not null,
  availability text not null,
  provider_headline text not null,
  provider_bio text not null,
  provider_services text[] not null,
  provider_rate_min numeric not null,
  provider_rate_max numeric not null,
  provider_rate_type text not null,
  client_headline text not null,
  client_bio text not null,
  needed_services text[] not null,
  preferred_schedule text not null,
  avatar_url text
);

insert into _seed_profile_templates (
  slot,
  first_name,
  last_name,
  public_area,
  active_role,
  about,
  availability,
  provider_headline,
  provider_bio,
  provider_services,
  provider_rate_min,
  provider_rate_max,
  provider_rate_type,
  client_headline,
  client_bio,
  needed_services,
  preferred_schedule,
  avatar_url
)
values
  (1, 'Althea', 'Ramos', 'Purok 1, Barangay San Pedro', 'provider',
   'Fictional resident profile for local cleaning, laundry, and household coordination around Barangay San Pedro.',
   'Usually replies in the evening. Available weekdays after 3 PM and Saturday mornings.',
   'Reliable cleaning and laundry help',
   'Offers careful home cleaning and laundry help for small households, uniforms, towels, and weekly upkeep.',
   array['Cleaning', 'Laundry help', 'Home assistance'], 150, 800, 'per_visit',
   'Needs occasional home and document help',
   'Coordinates small household errands and school-related tasks through Konektado messages.',
   array['Cleaning', 'Laundry help', 'Document formatting'], 'Evenings and weekends',
   'https://api.dicebear.com/9.x/notionists/png?seed=althea-ramos&backgroundColor=f9d978'),
  (2, 'Miguel', 'Santos', 'Purok 2, Barangay San Pedro', 'provider',
   'Fictional resident profile for minor home fixes and tech setup support near the covered court area.',
   'Available after 5 PM on weekdays and most Sunday afternoons.',
   'Minor home fix and setup helper',
   'Handles simple fixture checks, cabinet hinges, small shelves, phone setup, and basic computer setup.',
   array['Basic home repair', 'Computer setup', 'Phone setup'], 300, 1500, 'per_job',
   'Hires trusted help for family tasks',
   'Looks for nearby help with cleaning, device setup, and short household tasks.',
   array['Cleaning', 'Phone setup', 'Yard or outdoor help'], 'Weekday evenings',
   'https://api.dicebear.com/9.x/notionists/png?seed=miguel-santos&backgroundColor=8ed1c6'),
  (3, 'Clarisse', 'Dela Cruz', 'Purok 3, Barangay San Pedro', 'client',
   'Fictional resident profile for tutoring, school project planning, and online document work.',
   'Available for online coordination after class hours and Sunday mornings.',
   'Tutor and school project guide',
   'Helps grade school learners with reading, math review, project outlines, and presentation practice.',
   array['Tutoring', 'School project guidance', 'Presentation design'], 150, 700, 'per_session',
   'Coordinates school and home support',
   'Books tutors, layout help, and short home assistance for a busy household schedule.',
   array['Tutoring', 'Canva layout', 'Home assistance'], 'After 6 PM or Sunday morning',
   'https://api.dicebear.com/9.x/notionists/png?seed=clarisse-dela-cruz&backgroundColor=b8d8ff'),
  (4, 'Jomar', 'Bautista', 'Purok 4, Barangay San Pedro', 'provider',
   'Fictional resident profile focused on errands, delivery help, and outdoor cleanup within nearby areas.',
   'Usually available mornings and early afternoons when scheduled ahead.',
   'Errands, pickup, and outdoor help',
   'Helps with nearby pickup tasks, queue assistance, light delivery, yard sweeping, and simple outdoor cleanup.',
   array['Errands', 'Delivery help', 'Yard or outdoor help'], 100, 900, 'per_service',
   'Needs help for home upkeep',
   'Looks for local support for laundry, basic troubleshooting, and occasional cleaning.',
   array['Laundry help', 'Basic troubleshooting', 'Cleaning'], 'Morning or early afternoon',
   null),
  (5, 'Liza', 'Mercado', 'Purok 5, Barangay San Pedro', 'client',
   'Fictional resident profile for small business layouts, forms, and local household bookings.',
   'Responds during lunch break and after 7 PM.',
   'Canva and document layout helper',
   'Creates clean Canva posts, simple tarpaulin layouts, resumes, certificates, and print-ready documents.',
   array['Canva layout', 'Document formatting', 'Resume or form assistance'], 250, 1500, 'per_project',
   'Books digital and home services',
   'Hires help for layout work, printer setup, cleaning, and occasional delivery tasks.',
   array['Canva layout', 'Printer setup', 'Delivery help'], 'Evenings',
   'https://api.dicebear.com/9.x/notionists/png?seed=liza-mercado&backgroundColor=d7c5ff'),
  (6, 'Paolo', 'Reyes', 'Purok 6, Barangay San Pedro', 'provider',
   'Fictional resident profile for WiFi/router help, printer setup, and beginner computer lessons.',
   'Available Saturday afternoon and weekday evenings by schedule.',
   'Friendly tech setup support',
   'Guides residents through router setup, printer pairing, phone settings, and basic computer lessons.',
   array['WiFi/router help', 'Printer setup', 'Basic computer lessons'], 200, 900, 'per_visit',
   'Needs help with home and errands',
   'Coordinates short household jobs and service bookings around Barangay San Pedro.',
   array['Errands', 'Home assistance', 'Laundry help'], 'Weekends',
   'https://api.dicebear.com/9.x/notionists/png?seed=paolo-reyes&backgroundColor=a8e6a3'),
  (7, 'Marinel', 'Garcia', 'Purok 1, Barangay San Pedro', 'provider',
   'Fictional resident profile for laundry, cleaning, and light home organization.',
   'Available Tuesday, Thursday, and Saturday mornings.',
   'Laundry and organizing helper',
   'Helps with wash-and-fold laundry, ironing, room organization, and regular cleaning support.',
   array['Laundry help', 'Cleaning', 'Home assistance'], 150, 700, 'per_load',
   'Looks for trusted family support',
   'Books nearby help for tutoring, computer setup, and delivery errands when needed.',
   array['Tutoring', 'Computer setup', 'Delivery help'], 'Morning appointments',
   'https://api.dicebear.com/9.x/notionists/png?seed=marinel-garcia&backgroundColor=ffd6a5'),
  (8, 'Rodel', 'Villanueva', 'Purok 2, Barangay San Pedro', 'client',
   'Fictional resident profile for practical home assistance and maintenance coordination.',
   'Usually checks messages before work and after dinner.',
   'Small repair and yard helper',
   'Assists with basic home repair, light carpentry checks, yard cleanup, and home setup tasks.',
   array['Basic home repair', 'Yard or outdoor help', 'Home assistance'], 350, 1800, 'per_job',
   'Coordinates repairs and digital help',
   'Looks for clear rates and reliable schedules for household and document tasks.',
   array['Basic home repair', 'Document formatting', 'Cleaning'], 'After 6 PM',
   'https://api.dicebear.com/9.x/notionists/png?seed=rodel-villanueva&backgroundColor=cde7b0'),
  (9, 'Bea', 'Navarro', 'Purok 3, Barangay San Pedro', 'provider',
   'Fictional resident profile for tutoring, reading practice, and beginner computer guidance.',
   'Available Monday, Wednesday, Friday evenings, and Sunday afternoon.',
   'Patient tutor for young learners',
   'Supports reading practice, basic math, homework routines, and simple computer lessons for beginners.',
   array['Tutoring', 'Basic computer lessons', 'School project guidance'], 150, 500, 'hourly',
   'Needs occasional household services',
   'Books cleaning, laundry, and printer setup through message-based coordination.',
   array['Cleaning', 'Laundry help', 'Printer setup'], 'Weeknights',
   null),
  (10, 'Noel', 'Castillo', 'Purok 4, Barangay San Pedro', 'provider',
   'Fictional resident profile for document formatting, encoding, and resume assistance.',
   'Accepts online work during evenings and short in-person coordination on weekends.',
   'Encoding and forms assistant',
   'Formats resumes, encodes lists, cleans up forms, and prepares print-ready school or work documents.',
   array['Encoding', 'Document formatting', 'Resume or form assistance'], 100, 1000, 'per_project',
   'Books reliable tech and home help',
   'Looks for nearby help with router setup, cleaning, and small errands.',
   array['WiFi/router help', 'Cleaning', 'Errands'], 'Evenings',
   'https://api.dicebear.com/9.x/notionists/png?seed=noel-castillo&backgroundColor=f4e285'),
  (11, 'Aira', 'Mendoza', 'Purok 5, Barangay San Pedro', 'client',
   'Fictional resident profile for social media posts, Canva layout, and small business coordination.',
   'Available for chat after 4 PM and most Saturdays.',
   'Small business social media helper',
   'Creates simple captions, Canva posts, content calendars, and presentation cleanup for home sellers.',
   array['Social media help', 'Canva layout', 'Presentation design'], 300, 1500, 'weekly',
   'Books household and design help',
   'Coordinates local help for cleaning, delivery, layouts, and beginner tech setup.',
   array['Cleaning', 'Delivery help', 'Canva layout'], 'Afternoons',
   'https://api.dicebear.com/9.x/notionists/png?seed=aira-mendoza&backgroundColor=a0ced9'),
  (12, 'Renzo', 'Flores', 'Purok 6, Barangay San Pedro', 'provider',
   'Fictional resident profile for device checks, phone setup, and practical troubleshooting.',
   'Available Sunday morning and weekday evenings with one day notice.',
   'Device setup and troubleshooting help',
   'Checks common phone, printer, laptop, and small device setup issues before referral when needed.',
   array['Basic troubleshooting', 'Phone setup', 'Printer setup'], 200, 800, 'per_visit',
   'Needs organized home support',
   'Books yard cleanup, laundry, and occasional tutoring through Konektado.',
   array['Yard or outdoor help', 'Laundry help', 'Tutoring'], 'Sunday or weekday evening',
   'https://api.dicebear.com/9.x/notionists/png?seed=renzo-flores&backgroundColor=f7b267');

create temp table _seed_excluded_accounts as
select distinct
  p.id as profile_id,
  au.id as auth_user_id,
  au.email as auth_email
from public.profiles p
join auth.users au on au.id = p.id
where exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p.id
      and ur.role = 'barangay_admin'
  )
  or coalesce(p.role::text, '') = 'barangay_admin'
  or coalesce(p.active_role::text, '') = 'barangay_admin';

create temp table _seed_people as
select
  row_number() over (order by p.created_at nulls last, p.id) as slot,
  p.id as user_id
from public.profiles p
join auth.users au on au.id = p.id
where not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p.id
      and ur.role = 'barangay_admin'
  )
  and coalesce(p.role::text, '') <> 'barangay_admin'
  and coalesce(p.active_role::text, '') <> 'barangay_admin'
order by p.created_at nulls last, p.id
limit 12;

create temp table _seed_account_before as
select
  sp.slot,
  au.id as auth_user_id,
  au.email as auth_email,
  p.id as profile_id,
  p.full_name as old_display_name,
  null::text as old_username,
  case when nullif(p.avatar_url, '') is not null then 'has_image' else 'initials_fallback' end as old_avatar_status,
  coalesce(nullif(p.purok_sitio, ''), nullif(p.subdivision_area, ''), nullif(p.barangay, ''), nullif(p.city, '')) as old_location,
  p.about as old_about,
  case when coalesce(p.barangay_verified_at, p.verified_at) is not null then 'verified' else 'unverified' end as old_verification_status
from _seed_people sp
join public.profiles p on p.id = sp.user_id
join auth.users au on au.id = p.id;

do $$
declare
  seed_people_count integer;
begin
  select count(*) into seed_people_count from _seed_people;

  if seed_people_count < 6 then
    raise exception 'Need at least 6 existing non-admin sample accounts before reseeding presentation content. Found %.', seed_people_count;
  end if;
end $$;

create temp table _seed_updated_profiles (
  user_id uuid primary key
);

delete from public.notifications;
delete from public.reports;
delete from public.reviews;
delete from public.saved_items;
delete from public.messages;
delete from public.conversations;
delete from public.job_drafts;
delete from public.services;
delete from public.jobs;

insert into public.user_roles (user_id, role, is_active)
select p.user_id, 'provider', t.active_role = 'provider'
from _seed_people p
join _seed_profile_templates t on t.slot = p.slot
on conflict (user_id, role) do update
set is_active = excluded.is_active;

insert into public.user_roles (user_id, role, is_active)
select p.user_id, 'client', t.active_role = 'client'
from _seed_people p
join _seed_profile_templates t on t.slot = p.slot
on conflict (user_id, role) do update
set is_active = excluded.is_active;

alter table public.profiles disable trigger protect_profile_verification_fields;

with updated as (
  update public.profiles p
  set
    first_name = t.first_name,
    last_name = t.last_name,
    full_name = t.first_name || ' ' || t.last_name,
    role = t.active_role,
    active_role = t.active_role,
    province = 'Batangas',
    barangay = 'Barangay San Pedro',
    city = 'Santo Tomas',
    purok_sitio = t.public_area,
    subdivision_area = t.public_area,
    street = null,
    about = t.about,
    availability = t.availability,
    preferred_contact_method = 'app_message',
    avatar_url = t.avatar_url,
    verified_at = coalesce(p.verified_at, now() - interval '45 days'),
    barangay_verified_at = coalesce(p.barangay_verified_at, now() - interval '44 days'),
    updated_at = now()
  from _seed_people sp
  join _seed_profile_templates t on t.slot = sp.slot
  where p.id = sp.user_id
  returning p.id
)
insert into _seed_updated_profiles (user_id)
select id from updated;

alter table public.profiles enable trigger protect_profile_verification_fields;

insert into public.provider_profiles (
  user_id,
  service_type,
  headline,
  bio,
  service_area,
  availability,
  rate_text,
  rate_min,
  rate_max,
  rate_type,
  rate_negotiable,
  custom_offered_services,
  custom_service_review_status,
  response_time,
  profile_completed_at,
  created_at,
  updated_at
)
select
  sp.user_id,
  array_to_string(t.provider_services, ', '),
  t.provider_headline,
  t.provider_bio,
  t.public_area,
  t.availability,
  null,
  t.provider_rate_min,
  t.provider_rate_max,
  t.provider_rate_type,
  true,
  '{}'::text[],
  'none',
  'Usually replies within the day',
  now() - interval '40 days',
  now() - interval '45 days',
  now()
from _seed_people sp
join _seed_profile_templates t on t.slot = sp.slot
on conflict (user_id) do update
set
  service_type = excluded.service_type,
  headline = excluded.headline,
  bio = excluded.bio,
  service_area = excluded.service_area,
  availability = excluded.availability,
  rate_text = excluded.rate_text,
  rate_min = excluded.rate_min,
  rate_max = excluded.rate_max,
  rate_type = excluded.rate_type,
  rate_negotiable = excluded.rate_negotiable,
  custom_offered_services = excluded.custom_offered_services,
  custom_service_review_status = excluded.custom_service_review_status,
  response_time = excluded.response_time,
  profile_completed_at = excluded.profile_completed_at,
  updated_at = now();

insert into public.client_profiles (
  user_id,
  headline,
  bio,
  needed_services,
  custom_needed_services,
  preferred_schedule,
  budget_preference,
  profile_completed_at,
  created_at,
  updated_at
)
select
  sp.user_id,
  t.client_headline,
  t.client_bio,
  t.needed_services,
  '{}'::text[],
  t.preferred_schedule,
  'Prefers clear PHP rate ranges before confirming work.',
  now() - interval '40 days',
  now() - interval '45 days',
  now()
from _seed_people sp
join _seed_profile_templates t on t.slot = sp.slot
on conflict (user_id) do update
set
  headline = excluded.headline,
  bio = excluded.bio,
  needed_services = excluded.needed_services,
  custom_needed_services = excluded.custom_needed_services,
  preferred_schedule = excluded.preferred_schedule,
  budget_preference = excluded.budget_preference,
  profile_completed_at = excluded.profile_completed_at,
  updated_at = now();

create temp table _seed_service_rows (
  id uuid primary key default gen_random_uuid(),
  idx integer not null,
  category text not null,
  title text not null,
  description text not null,
  tags text[] not null,
  photo_urls text[] not null,
  years_experience numeric not null,
  availability_text text not null,
  rate_text text,
  rate_min numeric not null,
  rate_max numeric not null,
  rate_type text not null,
  rate_negotiable boolean not null,
  experience_level text not null,
  certification_available boolean not null,
  certification_note text,
  barangay text not null,
  location_text text not null,
  created_at timestamptz not null
);

insert into _seed_service_rows (
  idx, category, title, description, tags, photo_urls, years_experience,
  availability_text, rate_text, rate_min, rate_max, rate_type, rate_negotiable,
  experience_level, certification_available, certification_note, barangay,
  location_text, created_at
)
values
  (1, 'Cleaning', 'Regular house cleaning for small homes', 'Sweeping, mopping, kitchen wipe-down, bathroom cleaning, and tidy-up for small homes or apartments.', array['Regular cleaning','Indoor','Supplies ready'], '{}'::text[], 5, 'Weekdays after lunch and Saturday morning', null, 400, 800, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 1, Barangay San Pedro', now() - interval '30 days'),
  (2, 'Cleaning', 'Deep cleaning before visitors', 'Deep cleaning for dusty rooms, kitchen corners, cabinets, and bathrooms before family events or guests arrive.', array['Deep clean','Home visit','Weekend'], '{}'::text[], 6, 'Needs one day notice', null, 800, 1500, 'per_job', true, 'experienced', true, 'Barangay clearance can be shown during coordination.', 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', now() - interval '29 days'),
  (3, 'Laundry help', 'Wash and fold laundry help', 'Wash-and-fold help for everyday clothes, towels, and school uniforms with pickup coordination nearby.', array['Wash and fold','Pickup available','Weekly'], '{}'::text[], 4, 'Saturday morning pickup when available', null, 150, 300, 'per_load', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 1, Barangay San Pedro', now() - interval '28 days'),
  (4, 'Laundry help', 'Laundry washing and ironing', 'Laundry washing, drying assistance, folding, and ironing for uniforms or office clothes.', array['Ironing','Wash and fold','Weekend'], '{}'::text[], 5, 'Sunday morning and Monday afternoon', null, 250, 500, 'per_load', false, 'experienced', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '27 days'),
  (5, 'Errands', 'Nearby errands and queue help', 'Short errands, queueing, pickup coordination, and simple barangay-to-barangay tasks.', array['Nearby only','Same day','Short task'], '{}'::text[], 3, 'Same-day tasks when available', null, 150, 350, 'per_service', true, 'beginner', true, 'Barangay clearance can be shown during coordination.', 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '26 days'),
  (6, 'Delivery help', 'Small pickup and delivery help', 'Small parcel, document, prepaid medicine, and market-item pickup within nearby Santo Tomas areas.', array['Small delivery','Nearby only','Pickup available'], '{}'::text[], 2, 'Morning and early afternoon', null, 100, 300, 'per_service', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '25 days'),
  (7, 'Home assistance', 'Light household assistance', 'Help with moving light items, organizing rooms, party setup, and simple household support.', array['General help','Home visit','Short task'], '{}'::text[], 3, 'Saturday afternoon', null, 300, 800, 'per_job', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '24 days'),
  (8, 'Basic home repair', 'Minor home repair and small fixes', 'Small household fixes such as loose handles, cabinet hinges, shelves, curtain rods, and light carpentry.', array['Small fix','Home maintenance','Tools ready'], '{}'::text[], 7, 'Weekdays after 4 PM', null, 500, 1200, 'per_job', true, 'experienced', true, 'Local repair references available.', 'Barangay San Pedro', 'Purok 2, Barangay San Pedro', now() - interval '23 days'),
  (9, 'Basic home repair', 'Kitchen sink and fixture check', 'Simple sink leak checks, loose fittings, clogged strainers, and referral if licensed plumbing is needed.', array['Small fix','Home visit','Indoor'], '{}'::text[], 4, 'Morning visits by schedule', 'Simple checks only.', 600, 1300, 'per_job', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '22 days'),
  (10, 'Yard or outdoor help', 'Yard cleanup and outdoor sweeping', 'Clears leaves, sweeps paths, bags garden waste, and helps tidy small outdoor spaces.', array['Yard cleanup','Outdoor','Sweeping'], '{}'::text[], 4, 'Early mornings', null, 350, 900, 'per_job', false, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '21 days'),
  (11, 'Tutoring', 'Grade school tutoring', 'Patient tutoring for reading, math review, homework guidance, and exam preparation.', array['Grade school','Homework guidance','Weekend'], '{}'::text[], 3, 'Weeknights and Sunday afternoon', null, 150, 300, 'hourly', false, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '20 days'),
  (12, 'Tutoring', 'Grade 6 math review', 'Focused help for fractions, decimals, word problems, and basic algebra preparation.', array['Grade school','Exam review','Math'], '{}'::text[], 4, 'Monday, Wednesday, Friday evenings', null, 180, 350, 'hourly', false, 'experienced', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '19 days'),
  (13, 'Encoding', 'Encoding and spreadsheet help', 'Encodes handwritten notes, attendance sheets, inventory lists, and simple survey results.', array['Typing','Data entry','Online'], '{}'::text[], 3, 'Remote work during evenings', null, 100, 250, 'hourly', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '18 days'),
  (14, 'Canva layout', 'Tarpaulin and event layout design', 'Canva layouts for tarpaulins, birthday banners, announcements, and simple posters.', array['Posters','Online','School project'], '{}'::text[], 3, 'Afternoons and evenings', null, 300, 1500, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', now() - interval '17 days'),
  (15, 'Presentation design', 'Presentation cleanup and slide design', 'Formats school, work, and community report slides with clean layouts and readable text.', array['Slides','Online','Rush'], '{}'::text[], 4, 'Weeknights', null, 400, 1200, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '16 days'),
  (16, 'Social media help', 'Small business social media help', 'Prepares captions, post schedules, and simple Canva posts for sari-sari stores and home sellers.', array['Captions','Small business','Online'], '{}'::text[], 2, 'Remote coordination twice a week', null, 500, 1500, 'weekly', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', now() - interval '15 days'),
  (17, 'Basic computer lessons', 'Basic computer lessons for beginners', 'Teaches email, file folders, video calls, document editing, and safe basic computer use.', array['Beginner help','Senior help','Weekend'], '{}'::text[], 4, 'Sunday afternoons', null, 200, 500, 'hourly', false, 'intermediate', true, 'Experience helping senior neighbors.', 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '14 days'),
  (18, 'School project guidance', 'School project planning guidance', 'Guides students on outlines, research organization, display flow, and presentation practice.', array['Planning help','Research guidance','Weekend'], '{}'::text[], 2, 'Weeknights and Sunday morning', null, 250, 700, 'per_session', false, 'beginner', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '13 days'),
  (19, 'Computer setup', 'Laptop and computer setup', 'Sets up user accounts, browsers, basic apps, folders, and printer connection for new computers.', array['Laptop setup','Home visit','Beginner help'], '{}'::text[], 5, 'Saturday mornings', null, 400, 900, 'per_visit', false, 'intermediate', true, 'Local tech references available.', 'Barangay San Pedro', 'Purok 2, Barangay San Pedro', now() - interval '12 days'),
  (20, 'Phone setup', 'Phone app and account setup', 'Sets up new phones, installs apps, adjusts accessibility settings, and guides first-time users.', array['App setup','Senior help','Home visit'], '{}'::text[], 4, 'Weekends by appointment', null, 200, 500, 'per_visit', false, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '11 days'),
  (21, 'WiFi/router help', 'WiFi router setup and signal check', 'Sets up router names and passwords, checks signal, and explains basic home internet troubleshooting.', array['Router setup','Signal check','Home visit'], '{}'::text[], 4, 'Weekdays after 5 PM', null, 300, 900, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '10 days'),
  (22, 'Printer setup', 'Printer pairing and print test', 'Connects printers to laptops or phones, checks ink status, and runs document print tests.', array['Printer pairing','Home visit','Troubleshooting'], '{}'::text[], 4, 'Saturday morning', null, 300, 800, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '9 days'),
  (23, 'Basic troubleshooting', 'Appliance and device checkup', 'Checks common issues with fans, chargers, printers, and small devices before repair-shop referral.', array['Device check','Setup help','Short task'], '{}'::text[], 4, 'Evenings and weekends', null, 300, 700, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '8 days'),
  (24, 'Document formatting', 'Document formatting and print cleanup', 'Cleans up certificates, forms, school documents, minutes, and printable reports.', array['Forms','Printing-ready','Online'], '{}'::text[], 3, 'Evenings', null, 250, 700, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '7 days'),
  (25, 'Resume or form assistance', 'Resume and form assistance', 'Formats resumes, application letters, simple forms, and clean PDF copies for local applications.', array['Resume','Forms','Document help'], '{}'::text[], 3, 'Weeknights', null, 300, 1000, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '6 days'),
  (26, 'Canva layout', 'Canva invitations and birthday layouts', 'Creates birthday invitations, simple certificates, thank-you cards, and event posts.', array['Posters','Social posts','Online'], '{}'::text[], 2, 'Evenings, remote only', null, 250, 700, 'per_project', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', now() - interval '5 days'),
  (27, 'Home assistance', 'Party setup and light cleanup help', 'Assists with chairs, table setup, light decorations, and simple cleanup for small family gatherings.', array['General help','Home visit','Weekend'], '{}'::text[], 3, 'Saturday afternoon', null, 500, 1200, 'per_job', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '4 days'),
  (28, 'Delivery help', 'Market item pickup help', 'Pickup support for prepaid groceries, market items, and documents around nearby Santo Tomas areas.', array['Pickup available','Light items','Same day'], '{}'::text[], 2, 'Morning schedule preferred', null, 100, 300, 'per_service', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '3 days'),
  (29, 'Presentation design', 'Report slide cleanup', 'Improves report slides with clear hierarchy, readable text, and consistent spacing.', array['Slides','Online','Business deck'], '{}'::text[], 4, 'Weeknights', null, 400, 1200, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', now() - interval '2 days'),
  (30, 'Resume or form assistance', 'Online form guidance with privacy care', 'Guides public form completion while clients keep passwords and private account details in their own control.', array['Forms','Online','Document help'], '{}'::text[], 3, 'Weeknights', 'Client keeps passwords private.', 250, 700, 'per_job', false, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '1 day');

update _seed_service_rows
set photo_urls = '{}'::text[];

update _seed_service_rows
set photo_urls = case idx
  when 1 then array['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80']
  when 2 then array['https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80']
  when 3 then array['https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80']
  when 4 then array['https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=1200&q=80']
  when 5 then array['https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=1200&q=80']
  when 6 then array['https://images.unsplash.com/photo-1605902711622-cfb43c4437d5?auto=format&fit=crop&w=1200&q=80']
  when 8 then array['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80']
  when 9 then array['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80']
  when 10 then array['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80']
  when 14 then array['https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=1200&q=80']
  when 15 then array['https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80']
  when 16 then array['https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=1200&q=80']
  when 19 then array['https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80']
  when 20 then array['https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1200&q=80']
  when 21 then array['https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80']
  when 22 then array['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80']
  when 23 then array['https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80']
  when 27 then array['https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=80']
  else '{}'::text[]
end
where idx in (1, 2, 3, 4, 5, 6, 8, 9, 10, 14, 15, 16, 19, 20, 21, 22, 23, 27);

create temp table _seed_inserted_services as
select
  r.id,
  r.idx,
  p.user_id as provider_id
from _seed_service_rows r
join _seed_people p
  on p.slot = ((r.idx - 1) % (select count(*) from _seed_people)) + 1;

insert into public.services (
  id,
  provider_id,
  category,
  title,
  description,
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
  is_active,
  created_at,
  updated_at
)
select
  r.id,
  s.provider_id,
  r.category,
  r.title,
  r.description,
  r.tags,
  r.photo_urls,
  r.years_experience,
  r.availability_text,
  r.rate_text,
  r.rate_min,
  r.rate_max,
  r.rate_type,
  r.rate_negotiable,
  r.experience_level,
  r.certification_available,
  r.certification_note,
  null,
  'none',
  r.barangay,
  r.location_text,
  true,
  r.idx in (5, 14, 21),
  false,
  true,
  r.created_at,
  now()
from _seed_service_rows r
join _seed_inserted_services s on s.id = r.id;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'rate_currency'
  ) then
    execute 'update public.services set rate_currency = ''PHP'' where id in (select id from _seed_inserted_services)';
  end if;
end $$;

create temp table _seed_job_rows (
  id uuid primary key default gen_random_uuid(),
  idx integer not null,
  title text not null,
  description text not null,
  category text not null,
  service_needed text not null,
  tags text[] not null,
  photo_urls text[] not null,
  barangay text not null,
  location_text text not null,
  budget_min numeric not null,
  budget_max numeric not null,
  rate_type text not null,
  budget_negotiable boolean not null,
  experience_level text not null,
  certification_required boolean not null,
  certification_note text,
  workers_needed integer not null,
  schedule_text text not null,
  status text not null,
  created_at timestamptz not null
);

insert into _seed_job_rows (
  idx, title, description, category, service_needed, tags, photo_urls, barangay,
  location_text, budget_min, budget_max, rate_type, budget_negotiable,
  experience_level, certification_required, certification_note, workers_needed,
  schedule_text, status, created_at
)
values
  (1, 'Need help cleaning a small apartment', 'Kitchen, bathroom, and floors need cleaning before visitors arrive. Cleaning supplies are ready.', 'Home & Local Help', 'Cleaning', array['Cleaning','Supplies ready','Short task'], '{}'::text[], 'Barangay San Pedro', 'Purok 2, Barangay San Pedro', 400, 800, 'per_visit', true, 'any', false, null, 1, 'Today after 4 PM', 'open', now() - interval '5 hours'),
  (2, 'Looking for laundry help this weekend', 'Need wash, fold, and ironing support for school uniforms and regular clothes.', 'Home & Local Help', 'Laundry help', array['Laundry help','Weekend','Ironing'], '{}'::text[], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 200, 450, 'per_load', true, 'any', false, null, 1, 'Sunday morning', 'open', now() - interval '7 hours'),
  (3, 'Need tutor for Grade 6 math', 'Looking for patient math tutoring for fractions, decimals, and word problems.', 'Learning & Digital Help', 'Tutoring', array['Tutoring','Grade school','Math'], '{}'::text[], 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', 180, 350, 'hourly', false, 'intermediate', false, null, 1, 'Two weekday evenings', 'open', now() - interval '9 hours'),
  (4, 'Need helper for birthday setup', 'Need help arranging chairs, decorations, and light cleanup for a small family birthday.', 'Home & Local Help', 'Home assistance', array['Home assistance','Event setup','Weekend'], '{}'::text[], 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', 500, 1200, 'per_job', true, 'beginner', false, null, 2, 'Saturday afternoon', 'open', now() - interval '11 hours'),
  (5, 'Need minor fixture check', 'One switch cover is loose and a bulb holder needs a simple safety check. No major electrical work.', 'Home & Local Help', 'Basic home repair', array['Basic home repair','Small fix','Home visit'], '{}'::text[], 'Barangay San Pedro', 'Purok 2, Barangay San Pedro', 700, 1500, 'per_job', false, 'experienced', true, 'Basic electrical safety preferred.', 1, 'Friday after 5 PM', 'open', now() - interval '14 hours'),
  (6, 'Need help with kitchen sink leak', 'Kitchen sink has a slow leak under the basin and needs a basic check.', 'Home & Local Help', 'Basic home repair', array['Basic home repair','Kitchen','Home visit'], '{}'::text[], 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', 600, 1300, 'per_job', true, 'intermediate', false, null, 1, 'Tomorrow morning', 'open', now() - interval '1 day'),
  (7, 'Need someone to encode documents', 'Attendance sheets and handwritten notes need encoding into a clean spreadsheet.', 'Learning & Digital Help', 'Encoding', array['Encoding','Spreadsheet','Online'], '{}'::text[], 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', 100, 250, 'hourly', true, 'any', false, null, 1, 'Due in three days', 'open', now() - interval '1 day 3 hours'),
  (8, 'Need tarpaulin layout for local event', 'Need a printable tarpaulin layout for a small community activity announcement.', 'Learning & Digital Help', 'Canva layout', array['Canva layout','Tarpaulin','Online'], '{}'::text[], 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', 300, 1500, 'per_project', true, 'intermediate', false, null, 1, 'Before Friday noon', 'open', now() - interval '1 day 6 hours'),
  (9, 'Need outdoor wall painting assistant', 'Need help preparing and painting a small exterior wall section. Paint is already available.', 'Home & Local Help', 'Basic home repair', array['Basic home repair','Outdoor','Short task'], '{}'::text[], 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', 700, 1800, 'per_job', true, 'intermediate', false, null, 1, 'Next weekend', 'open', now() - interval '1 day 9 hours'),
  (10, 'Need sari-sari store inventory encoded', 'Need a simple stock list encoded from notebook records into a spreadsheet.', 'Learning & Digital Help', 'Encoding', array['Encoding','Inventory','Spreadsheet'], '{}'::text[], 'Barangay San Pedro', 'Purok 1, Barangay San Pedro', 300, 800, 'per_project', true, 'any', false, null, 1, 'This week', 'open', now() - interval '2 days'),
  (11, 'Need small furniture assembly help', 'Small shelf and table need assembly. Screws and manual are available.', 'Home & Local Help', 'Home assistance', array['Home assistance','Assembly','Home visit'], '{}'::text[], 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', 400, 900, 'per_job', false, 'beginner', false, null, 1, 'Saturday morning', 'open', now() - interval '2 days 3 hours'),
  (12, 'Need nearby medicine pickup', 'Medicine is already paid. Need pickup and delivery within nearby Santo Tomas area.', 'Home & Local Help', 'Delivery help', array['Delivery help','Same day','Small delivery'], '{}'::text[], 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', 100, 250, 'per_service', false, 'any', false, null, 1, 'Today before 6 PM', 'open', now() - interval '2 days 6 hours'),
  (13, 'Need appliance checkup', 'Electric fan and rice cooker need basic checking before bringing them to a repair shop.', 'Tech & Document Support', 'Basic troubleshooting', array['Basic troubleshooting','Device check','Short task'], '{}'::text[], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 300, 700, 'per_visit', true, 'intermediate', false, null, 1, 'Sunday afternoon', 'open', now() - interval '3 days'),
  (14, 'Need resume formatting help', 'Resume needs cleaner layout and PDF export for a local job application.', 'Tech & Document Support', 'Resume or form assistance', array['Resume','Forms','Online'], '{}'::text[], 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', 300, 1000, 'per_project', true, 'intermediate', false, null, 1, 'Before Monday', 'open', now() - interval '3 days 4 hours'),
  (15, 'Need printer setup for school documents', 'Printer needs to connect to a laptop and print a test page.', 'Tech & Document Support', 'Printer setup', array['Printer setup','Home visit','School document'], '{}'::text[], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 300, 800, 'per_visit', false, 'intermediate', false, null, 1, 'This weekend', 'open', now() - interval '3 days 8 hours'),
  (16, 'Need WiFi router password changed', 'Router needs a safer password and a signal check in two rooms.', 'Tech & Document Support', 'WiFi/router help', array['WiFi/router help','Home internet','Home visit'], '{}'::text[], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 300, 900, 'per_visit', true, 'intermediate', false, null, 1, 'Weekday evening', 'open', now() - interval '4 days'),
  (17, 'Need school project guidance', 'Grade school project needs outline guidance and presentation flow planning.', 'Learning & Digital Help', 'School project guidance', array['School project guidance','Planning help','Online'], '{}'::text[], 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', 250, 700, 'per_session', false, 'any', false, null, 1, 'Saturday morning', 'open', now() - interval '4 days 2 hours'),
  (18, 'Need basic phone setup for parent', 'New Android phone needs contact transfer, font size setup, and basic app installation.', 'Tech & Document Support', 'Phone setup', array['Phone setup','Senior help','Home visit'], '{}'::text[], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 200, 500, 'per_visit', false, 'beginner', false, null, 1, 'Friday after 5 PM', 'open', now() - interval '5 days'),
  (19, 'Need slide deck formatted', 'Community update slides need cleaner layout, readable fonts, and consistent spacing.', 'Learning & Digital Help', 'Presentation design', array['Presentation design','Slides','Online'], '{}'::text[], 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', 400, 1200, 'per_project', true, 'intermediate', false, null, 1, 'Before Friday', 'open', now() - interval '5 days 4 hours'),
  (20, 'Need yard cleanup after rain', 'Need leaves cleared, pathway swept, and garden waste bagged outside the house.', 'Home & Local Help', 'Yard or outdoor help', array['Yard or outdoor help','Outdoor','Sweeping'], '{}'::text[], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 350, 900, 'per_job', false, 'beginner', false, null, 1, 'Friday morning', 'open', now() - interval '6 days');

update _seed_job_rows
set photo_urls = '{}'::text[];

update _seed_job_rows
set photo_urls = case idx
  when 1 then array['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80']
  when 2 then array['https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80']
  when 5 then array['https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80']
  when 6 then array['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80']
  when 9 then array['https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=80']
  when 20 then array['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80']
  else '{}'::text[]
end
where idx in (1, 2, 5, 6, 9, 20);

create temp table _seed_inserted_jobs as
select
  r.id,
  r.idx,
  client.user_id as client_id,
  provider.user_id as provider_id,
  r.status
from _seed_job_rows r
join _seed_people client
  on client.slot = ((r.idx - 1) % (select count(*) from _seed_people)) + 1
join _seed_people provider
  on provider.slot = (r.idx % (select count(*) from _seed_people)) + 1;

insert into public.jobs (
  id,
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
  private_location_notes,
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
  status,
  accepted_provider_id,
  allow_messages,
  auto_reply_enabled,
  auto_close_enabled,
  created_at,
  updated_at,
  closed_at
)
select
  r.id,
  j.client_id,
  j.client_id,
  r.title,
  r.description,
  r.category,
  r.service_needed,
  r.tags,
  r.photo_urls,
  r.barangay,
  r.location_text,
  r.location_text,
  r.location_text,
  null,
  null,
  null,
  r.budget_min,
  r.budget_max,
  r.rate_type,
  r.budget_negotiable,
  r.workers_needed,
  r.schedule_text,
  r.experience_level,
  r.certification_required,
  r.certification_note,
  r.status,
  null,
  true,
  r.idx in (4, 8, 16),
  false,
  r.created_at,
  now(),
  null
from _seed_job_rows r
join _seed_inserted_jobs j on j.id = r.id;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'jobs'
      and column_name = 'budget_currency'
  ) then
    execute 'update public.jobs set budget_currency = ''PHP'' where id in (select id from _seed_inserted_jobs)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'jobs'
      and column_name = 'budget_type'
  ) then
    execute 'update public.jobs set budget_type = rate_type where id in (select id from _seed_inserted_jobs)';
  end if;
end $$;

insert into public.reviews (
  job_id,
  reviewer_id,
  reviewee_id,
  rating,
  comment,
  created_at,
  updated_at
)
select
  j.id,
  j.client_id,
  j.provider_id,
  case when j.idx in (3, 8) then 5 else 4 end,
  case
    when j.idx = 3 then 'Patient and clear during coordination. The rate range was explained before confirming the schedule.'
    when j.idx = 8 then 'Fast response and clean layout suggestions. Very easy to coordinate through messages.'
    else 'Professional conversation and clear next steps.'
  end,
  now() - ((j.idx + 2)::text || ' days')::interval,
  now() - ((j.idx + 2)::text || ' days')::interval
from _seed_inserted_jobs j
where j.idx in (3, 8, 13);

insert into public.reviews (
  job_id,
  reviewer_id,
  reviewee_id,
  rating,
  comment,
  created_at,
  updated_at
)
select
  j.id,
  j.provider_id,
  j.client_id,
  5,
  'Clear task details and respectful coordination. The schedule and budget were easy to confirm.',
  now() - ((j.idx + 1)::text || ' days')::interval,
  now() - ((j.idx + 1)::text || ' days')::interval
from _seed_inserted_jobs j
where j.idx in (3, 8);

create temp table _seed_conversations as
select
  gen_random_uuid() as id,
  j.id as job_id,
  null::uuid as service_id,
  j.client_id,
  j.provider_id,
  j.client_id as started_by,
  'active'::text as status,
  null::timestamptz as hired_at,
  now() - ((j.idx + 1)::text || ' hours')::interval as created_at
from _seed_inserted_jobs j
where j.idx in (1, 3, 5, 8, 12)
union all
select
  gen_random_uuid(),
  null::uuid,
  s.id,
  client.user_id,
  s.provider_id,
  client.user_id,
  'active',
  null,
  now() - ((s.idx + 2)::text || ' hours')::interval
from _seed_inserted_services s
join _seed_people client
  on client.slot = (s.idx % (select count(*) from _seed_people)) + 1
where s.idx in (2, 4, 14, 21, 25);

insert into public.conversations (
  id,
  job_id,
  service_id,
  client_id,
  provider_id,
  started_by,
  status,
  hired_at,
  created_at,
  updated_at
)
select
  id,
  job_id,
  service_id,
  client_id,
  provider_id,
  started_by,
  status,
  hired_at,
  created_at,
  created_at + interval '20 minutes'
from _seed_conversations
where client_id <> provider_id;

create temp table _seed_message_rows (
  conversation_id uuid not null,
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null
);

insert into _seed_message_rows (conversation_id, sender_id, body, created_at)
select id, client_id, 'Good afternoon po, available pa po kayo this Saturday?', created_at + interval '5 minutes'
from _seed_conversations
where client_id <> provider_id
union all
select id, provider_id, 'Yes po, available ako after 2 PM. Send lang po ng exact task details dito sa app.', created_at + interval '12 minutes'
from _seed_conversations
where client_id <> provider_id
union all
select id, client_id, 'Sige po, thank you. I will message again later after checking the schedule.', created_at + interval '19 minutes'
from _seed_conversations
where client_id <> provider_id
union all
select id, provider_id, 'Noted po. I can confirm the final rate within the posted range before starting.', created_at + interval '27 minutes'
from _seed_conversations
where client_id <> provider_id
  and job_id is not null;

insert into public.messages (
  conversation_id,
  sender_id,
  body,
  created_at
)
select
  conversation_id,
  sender_id,
  body,
  created_at
from _seed_message_rows
order by created_at;

insert into public.saved_items (user_id, item_type, item_id, created_at)
select
  p.user_id,
  'provider',
  s.provider_id,
  now() - (s.idx::text || ' hours')::interval
from _seed_inserted_services s
join _seed_people p on p.slot = 1
where s.idx in (1, 5, 10, 15, 21)
  and p.user_id <> s.provider_id
on conflict (user_id, item_type, item_id) do nothing;

insert into public.saved_items (user_id, item_type, item_id, created_at)
select
  p.user_id,
  'job',
  j.id,
  now() - (j.idx::text || ' hours')::interval
from _seed_inserted_jobs j
join _seed_people p on p.slot = 2
where j.idx in (1, 3, 7, 11, 16)
  and p.user_id <> j.client_id
on conflict (user_id, item_type, item_id) do nothing;

create temp table _seed_account_change_log as
select
  b.auth_email,
  b.auth_user_id,
  b.profile_id,
  b.old_display_name,
  p.full_name as new_display_name,
  b.old_username,
  b.old_avatar_status,
  case when nullif(p.avatar_url, '') is not null then 'has_image' else 'initials_fallback' end as new_avatar_status,
  b.old_location,
  coalesce(nullif(p.purok_sitio, ''), nullif(p.subdivision_area, ''), nullif(p.barangay, ''), nullif(p.city, '')) as new_location,
  b.old_verification_status,
  case when coalesce(p.barangay_verified_at, p.verified_at) is not null then 'verified' else 'unverified' end as new_verification_status,
  (
    b.old_display_name is distinct from p.full_name
    or b.old_avatar_status is distinct from case when nullif(p.avatar_url, '') is not null then 'has_image' else 'initials_fallback' end
    or b.old_location is distinct from coalesce(nullif(p.purok_sitio, ''), nullif(p.subdivision_area, ''), nullif(p.barangay, ''), nullif(p.city, ''))
    or b.old_about is distinct from p.about
    or b.old_verification_status is distinct from case when coalesce(p.barangay_verified_at, p.verified_at) is not null then 'verified' else 'unverified' end
  ) as profile_display_fields_changed,
  coalesce(service_counts.services_inserted, 0) as services_inserted,
  coalesce(job_counts.jobs_inserted, 0) as jobs_inserted,
  coalesce(message_counts.messages_sent, 0) as messages_sent,
  coalesce(conversation_counts.conversations_involving_account, 0) as conversations_involving_account
from _seed_account_before b
join public.profiles p on p.id = b.profile_id
left join (
  select provider_id, count(*)::integer as services_inserted
  from public.services s
  join _seed_inserted_services seed on seed.id = s.id
  group by provider_id
) service_counts on service_counts.provider_id = b.profile_id
left join (
  select coalesce(client_id, owner_id) as owner_id, count(*)::integer as jobs_inserted
  from public.jobs j
  join _seed_inserted_jobs seed on seed.id = j.id
  group by coalesce(client_id, owner_id)
) job_counts on job_counts.owner_id = b.profile_id
left join (
  select sender_id, count(*)::integer as messages_sent
  from public.messages m
  join _seed_message_rows seed
    on seed.conversation_id = m.conversation_id
    and seed.sender_id = m.sender_id
    and seed.body = m.body
    and seed.created_at = m.created_at
  group by sender_id
) message_counts on message_counts.sender_id = b.profile_id
left join (
  select account_id, count(*)::integer as conversations_involving_account
  from (
    select c.client_id as account_id, c.id
    from public.conversations c
    join _seed_conversations seed on seed.id = c.id
    union all
    select c.provider_id, c.id
    from public.conversations c
    join _seed_conversations seed on seed.id = c.id
  ) conversation_accounts
  group by account_id
) conversation_counts on conversation_counts.account_id = b.profile_id
order by b.slot;

commit;

select
  'WARNING' as section,
  'auth.users was preserved; auth identities, auth email, auth password, and auth phone were not changed. Only visible app/profile/content data was refreshed.' as message;

select
  'ACCOUNT CHANGE LOG' as section,
  auth_email,
  auth_user_id,
  profile_id,
  old_display_name,
  new_display_name,
  old_username,
  old_avatar_status,
  new_avatar_status,
  old_location,
  new_location,
  old_verification_status,
  new_verification_status,
  profile_display_fields_changed,
  services_inserted,
  jobs_inserted,
  messages_sent,
  conversations_involving_account
from _seed_account_change_log
order by auth_email;

select
  'CONTENT INSERT SUMMARY' as section,
  metric,
  value
from (
  select 'selected_account_profile_count' as metric, count(*)::text as value from _seed_people
  union all
  select 'excluded_admin_barangay_account_count', count(*)::text from _seed_excluded_accounts
  union all
  select 'updated_profile_count', count(*)::text from _seed_updated_profiles
  union all
  select 'services_inserted', count(*)::text from public.services s join _seed_inserted_services seed on seed.id = s.id
  union all
  select 'jobs_inserted', count(*)::text from public.jobs j join _seed_inserted_jobs seed on seed.id = j.id
  union all
  select 'conversations_inserted', count(*)::text from public.conversations c join _seed_conversations seed on seed.id = c.id
  union all
  select 'messages_inserted', count(*)::text
  from public.messages m
  join _seed_message_rows seed
    on seed.conversation_id = m.conversation_id
    and seed.sender_id = m.sender_id
    and seed.body = m.body
    and seed.created_at = m.created_at
  union all
  select 'reviews_inserted', count(*)::text from public.reviews
  union all
  select 'saved_items_inserted', count(*)::text from public.saved_items
) summary_rows;

select
  'IMAGE COVERAGE SUMMARY' as section,
  metric,
  value
from (
  select 'profile_count' as metric, count(*)::text as value
  from _seed_people
  union all
  select 'profiles_with_images', count(*)::text
  from _seed_people seed
  join public.profiles p on p.id = seed.user_id
  where nullif(p.avatar_url, '') is not null
  union all
  select 'profiles_with_initials_fallback', count(*)::text
  from _seed_people seed
  join public.profiles p on p.id = seed.user_id
  where nullif(p.avatar_url, '') is null
  union all
  select 'services_count', count(*)::text
  from public.services s
  join _seed_inserted_services seed on seed.id = s.id
  union all
  select 'services_with_images', count(*)::text
  from public.services s
  join _seed_inserted_services seed on seed.id = s.id
  where cardinality(coalesce(s.photo_urls, '{}'::text[])) > 0
  union all
  select 'services_without_images', count(*)::text
  from public.services s
  join _seed_inserted_services seed on seed.id = s.id
  where cardinality(coalesce(s.photo_urls, '{}'::text[])) = 0
  union all
  select 'jobs_count', count(*)::text
  from public.jobs j
  join _seed_inserted_jobs seed on seed.id = j.id
  union all
  select 'jobs_with_images', count(*)::text
  from public.jobs j
  join _seed_inserted_jobs seed on seed.id = j.id
  where cardinality(coalesce(j.photo_urls, '{}'::text[])) > 0
  union all
  select 'jobs_without_images', count(*)::text
  from public.jobs j
  join _seed_inserted_jobs seed on seed.id = j.id
  where cardinality(coalesce(j.photo_urls, '{}'::text[])) = 0
) image_rows;

select
  'VISIBILITY SUMMARY' as section,
  metric,
  value
from (
  select 'valid_service_rate_range_count' as metric, count(*)::text as value
  from public.services s
  join _seed_inserted_services seed on seed.id = s.id
  where s.rate_min is not null
    and s.rate_max is not null
    and s.rate_min > 0
    and s.rate_max >= s.rate_min
    and s.rate_type is not null
  union all
  select 'valid_job_budget_range_count', count(*)::text
  from public.jobs j
  join _seed_inserted_jobs seed on seed.id = j.id
  where j.budget_min is not null
    and j.budget_max is not null
    and j.budget_min > 0
    and j.budget_max >= j.budget_min
    and j.rate_type is not null
  union all
  select 'missing_service_rate_count', count(*)::text
  from public.services s
  join _seed_inserted_services seed on seed.id = s.id
  where s.rate_min is null
    or s.rate_max is null
    or s.rate_min <= 0
    or s.rate_max < s.rate_min
    or s.rate_type is null
  union all
  select 'missing_job_budget_count', count(*)::text
  from public.jobs j
  join _seed_inserted_jobs seed on seed.id = j.id
  where j.budget_min is null
    or j.budget_max is null
    or j.budget_min <= 0
    or j.budget_max < j.budget_min
    or j.rate_type is null
  union all
  select 'visible_home_search_service_count', count(*)::text
  from public.services s
  join _seed_inserted_services seed on seed.id = s.id
  join public.profiles p on p.id = s.provider_id
  where s.is_active = true
    and coalesce(p.barangay_verified_at, p.verified_at) is not null
  union all
  select 'visible_home_search_job_count', count(*)::text
  from public.jobs j
  join _seed_inserted_jobs seed on seed.id = j.id
  join public.profiles p on p.id = coalesce(j.client_id, j.owner_id)
  where j.status in ('open', 'reviewing')
    and coalesce(p.barangay_verified_at, p.verified_at) is not null
) visibility_rows;

select
  'IMAGE SAMPLE PROFILES' as section,
  p.full_name,
  p.purok_sitio as public_area,
  case when nullif(p.avatar_url, '') is not null then 'has_image' else 'initials_fallback' end as image_status,
  p.avatar_url
from _seed_people seed
join public.profiles p on p.id = seed.user_id
where seed.slot in (1, 4, 9, 10)
order by seed.slot;

select
  'IMAGE SAMPLE SERVICES' as section,
  owner.full_name as owner,
  s.title,
  s.category,
  case when cardinality(coalesce(s.photo_urls, '{}'::text[])) > 0 then 'has_image' else 'no_image' end as image_status,
  s.photo_urls[1] as sample_image_url
from _seed_inserted_services seed
join public.services s on s.id = seed.id
join public.profiles owner on owner.id = s.provider_id
where seed.idx in (1, 7, 14, 18, 21, 30)
order by seed.idx;

select
  'IMAGE SAMPLE JOBS' as section,
  owner.full_name as owner,
  j.title,
  j.service_needed,
  case when cardinality(coalesce(j.photo_urls, '{}'::text[])) > 0 then 'has_image' else 'no_image' end as image_status,
  j.photo_urls[1] as sample_image_url
from _seed_inserted_jobs seed
join public.jobs j on j.id = seed.id
join public.profiles owner on owner.id = coalesce(j.client_id, j.owner_id)
where seed.idx in (1, 3, 5, 7, 9, 20)
order by seed.idx;

select
  'SAMPLE SAFE MESSAGES' as section,
  sender.full_name as sender,
  left(m.body, 120) as body,
  m.created_at
from public.messages m
join _seed_message_rows seed
  on seed.conversation_id = m.conversation_id
  and seed.sender_id = m.sender_id
  and seed.body = m.body
  and seed.created_at = m.created_at
join public.profiles sender on sender.id = m.sender_id
order by m.created_at desc
limit 5;

