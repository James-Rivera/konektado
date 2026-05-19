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
drop table if exists _seed_people;
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
  avatar_url text not null
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
   'https://ui-avatars.com/api/?name=Althea+Ramos&background=F9D978&color=1F2933&size=256&bold=true'),
  (2, 'Miguel', 'Santos', 'Purok 2, Barangay San Pedro', 'provider',
   'Fictional resident profile for minor home fixes and tech setup support near the covered court area.',
   'Available after 5 PM on weekdays and most Sunday afternoons.',
   'Minor home fix and setup helper',
   'Handles simple fixture checks, cabinet hinges, small shelves, phone setup, and basic computer setup.',
   array['Basic home repair', 'Computer setup', 'Phone setup'], 300, 1500, 'per_job',
   'Hires trusted help for family tasks',
   'Looks for nearby help with cleaning, device setup, and short household tasks.',
   array['Cleaning', 'Phone setup', 'Yard or outdoor help'], 'Weekday evenings',
   'https://ui-avatars.com/api/?name=Miguel+Santos&background=8ED1C6&color=1F2933&size=256&bold=true'),
  (3, 'Clarisse', 'Dela Cruz', 'Purok 3, Barangay San Pedro', 'client',
   'Fictional resident profile for tutoring, school project planning, and online document work.',
   'Available for online coordination after class hours and Sunday mornings.',
   'Tutor and school project guide',
   'Helps grade school learners with reading, math review, project outlines, and presentation practice.',
   array['Tutoring', 'School project guidance', 'Presentation design'], 150, 700, 'per_session',
   'Coordinates school and home support',
   'Books tutors, layout help, and short home assistance for a busy household schedule.',
   array['Tutoring', 'Canva layout', 'Home assistance'], 'After 6 PM or Sunday morning',
   'https://ui-avatars.com/api/?name=Clarisse+Dela+Cruz&background=B8D8FF&color=1F2933&size=256&bold=true'),
  (4, 'Jomar', 'Bautista', 'Purok 4, Barangay San Pedro', 'provider',
   'Fictional resident profile focused on errands, delivery help, and outdoor cleanup within nearby areas.',
   'Usually available mornings and early afternoons when scheduled ahead.',
   'Errands, pickup, and outdoor help',
   'Helps with nearby pickup tasks, queue assistance, light delivery, yard sweeping, and simple outdoor cleanup.',
   array['Errands', 'Delivery help', 'Yard or outdoor help'], 100, 900, 'per_service',
   'Needs help for home upkeep',
   'Looks for local support for laundry, basic troubleshooting, and occasional cleaning.',
   array['Laundry help', 'Basic troubleshooting', 'Cleaning'], 'Morning or early afternoon',
   'https://ui-avatars.com/api/?name=Jomar+Bautista&background=F6B8A8&color=1F2933&size=256&bold=true'),
  (5, 'Liza', 'Mercado', 'Purok 5, Barangay San Pedro', 'client',
   'Fictional resident profile for small business layouts, forms, and local household bookings.',
   'Responds during lunch break and after 7 PM.',
   'Canva and document layout helper',
   'Creates clean Canva posts, simple tarpaulin layouts, resumes, certificates, and print-ready documents.',
   array['Canva layout', 'Document formatting', 'Resume or form assistance'], 250, 1500, 'per_project',
   'Books digital and home services',
   'Hires help for layout work, printer setup, cleaning, and occasional delivery tasks.',
   array['Canva layout', 'Printer setup', 'Delivery help'], 'Evenings',
   'https://ui-avatars.com/api/?name=Liza+Mercado&background=D7C5FF&color=1F2933&size=256&bold=true'),
  (6, 'Paolo', 'Reyes', 'Purok 6, Barangay San Pedro', 'provider',
   'Fictional resident profile for WiFi/router help, printer setup, and beginner computer lessons.',
   'Available Saturday afternoon and weekday evenings by schedule.',
   'Friendly tech setup support',
   'Guides residents through router setup, printer pairing, phone settings, and basic computer lessons.',
   array['WiFi/router help', 'Printer setup', 'Basic computer lessons'], 200, 900, 'per_visit',
   'Needs help with home and errands',
   'Coordinates short household jobs and service bookings around Barangay San Pedro.',
   array['Errands', 'Home assistance', 'Laundry help'], 'Weekends',
   'https://ui-avatars.com/api/?name=Paolo+Reyes&background=A8E6A3&color=1F2933&size=256&bold=true'),
  (7, 'Marinel', 'Garcia', 'Purok 1, Barangay San Pedro', 'provider',
   'Fictional resident profile for laundry, cleaning, and light home organization.',
   'Available Tuesday, Thursday, and Saturday mornings.',
   'Laundry and organizing helper',
   'Helps with wash-and-fold laundry, ironing, room organization, and regular cleaning support.',
   array['Laundry help', 'Cleaning', 'Home assistance'], 150, 700, 'per_load',
   'Looks for trusted family support',
   'Books nearby help for tutoring, computer setup, and delivery errands when needed.',
   array['Tutoring', 'Computer setup', 'Delivery help'], 'Morning appointments',
   'https://ui-avatars.com/api/?name=Marinel+Garcia&background=FFD6A5&color=1F2933&size=256&bold=true'),
  (8, 'Rodel', 'Villanueva', 'Purok 2, Barangay San Pedro', 'client',
   'Fictional resident profile for practical home assistance and maintenance coordination.',
   'Usually checks messages before work and after dinner.',
   'Small repair and yard helper',
   'Assists with basic home repair, light carpentry checks, yard cleanup, and home setup tasks.',
   array['Basic home repair', 'Yard or outdoor help', 'Home assistance'], 350, 1800, 'per_job',
   'Coordinates repairs and digital help',
   'Looks for clear rates and reliable schedules for household and document tasks.',
   array['Basic home repair', 'Document formatting', 'Cleaning'], 'After 6 PM',
   'https://ui-avatars.com/api/?name=Rodel+Villanueva&background=CDE7B0&color=1F2933&size=256&bold=true'),
  (9, 'Bea', 'Navarro', 'Purok 3, Barangay San Pedro', 'provider',
   'Fictional resident profile for tutoring, reading practice, and beginner computer guidance.',
   'Available Monday, Wednesday, Friday evenings, and Sunday afternoon.',
   'Patient tutor for young learners',
   'Supports reading practice, basic math, homework routines, and simple computer lessons for beginners.',
   array['Tutoring', 'Basic computer lessons', 'School project guidance'], 150, 500, 'hourly',
   'Needs occasional household services',
   'Books cleaning, laundry, and printer setup through message-based coordination.',
   array['Cleaning', 'Laundry help', 'Printer setup'], 'Weeknights',
   'https://ui-avatars.com/api/?name=Bea+Navarro&background=FFC6D9&color=1F2933&size=256&bold=true'),
  (10, 'Noel', 'Castillo', 'Purok 4, Barangay San Pedro', 'provider',
   'Fictional resident profile for document formatting, encoding, and resume assistance.',
   'Accepts online work during evenings and short in-person coordination on weekends.',
   'Encoding and forms assistant',
   'Formats resumes, encodes lists, cleans up forms, and prepares print-ready school or work documents.',
   array['Encoding', 'Document formatting', 'Resume or form assistance'], 100, 1000, 'per_project',
   'Books reliable tech and home help',
   'Looks for nearby help with router setup, cleaning, and small errands.',
   array['WiFi/router help', 'Cleaning', 'Errands'], 'Evenings',
   'https://ui-avatars.com/api/?name=Noel+Castillo&background=F4E285&color=1F2933&size=256&bold=true'),
  (11, 'Aira', 'Mendoza', 'Purok 5, Barangay San Pedro', 'client',
   'Fictional resident profile for social media posts, Canva layout, and small business coordination.',
   'Available for chat after 4 PM and most Saturdays.',
   'Small business social media helper',
   'Creates simple captions, Canva posts, content calendars, and presentation cleanup for home sellers.',
   array['Social media help', 'Canva layout', 'Presentation design'], 300, 1500, 'weekly',
   'Books household and design help',
   'Coordinates local help for cleaning, delivery, layouts, and beginner tech setup.',
   array['Cleaning', 'Delivery help', 'Canva layout'], 'Afternoons',
   'https://ui-avatars.com/api/?name=Aira+Mendoza&background=A0CED9&color=1F2933&size=256&bold=true'),
  (12, 'Renzo', 'Flores', 'Purok 6, Barangay San Pedro', 'provider',
   'Fictional resident profile for device checks, phone setup, and practical troubleshooting.',
   'Available Sunday morning and weekday evenings with one day notice.',
   'Device setup and troubleshooting help',
   'Checks common phone, printer, laptop, and small device setup issues before referral when needed.',
   array['Basic troubleshooting', 'Phone setup', 'Printer setup'], 200, 800, 'per_visit',
   'Needs organized home support',
   'Books yard cleanup, laundry, and occasional tutoring through Konektado.',
   array['Yard or outdoor help', 'Laundry help', 'Tutoring'], 'Sunday or weekday evening',
   'https://ui-avatars.com/api/?name=Renzo+Flores&background=F7B267&color=1F2933&size=256&bold=true');

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
  (1, 'Cleaning', 'Regular house cleaning for small homes', 'Sweeping, mopping, kitchen wipe-down, bathroom cleaning, and tidy-up for small homes or apartments.', array['Regular cleaning','Indoor','Supplies ready'], array['https://placehold.co/1200x800/F9D978/1F2933/png?text=Cleaning'], 5, 'Weekdays after lunch and Saturday morning', null, 400, 800, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 1, Barangay San Pedro', now() - interval '30 days'),
  (2, 'Cleaning', 'Deep cleaning before visitors', 'Deep cleaning for dusty rooms, kitchen corners, cabinets, and bathrooms before family events or guests arrive.', array['Deep clean','Home visit','Weekend'], array['https://placehold.co/1200x800/B8D8FF/1F2933/png?text=Deep+Cleaning'], 6, 'Needs one day notice', null, 800, 1500, 'per_job', true, 'experienced', true, 'Barangay clearance can be shown during coordination.', 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', now() - interval '29 days'),
  (3, 'Laundry help', 'Wash and fold laundry help', 'Wash-and-fold help for everyday clothes, towels, and school uniforms with pickup coordination nearby.', array['Wash and fold','Pickup available','Weekly'], array['https://placehold.co/1200x800/8ED1C6/1F2933/png?text=Laundry+Help'], 4, 'Saturday morning pickup when available', null, 150, 300, 'per_load', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 1, Barangay San Pedro', now() - interval '28 days'),
  (4, 'Laundry help', 'Laundry washing and ironing', 'Laundry washing, drying assistance, folding, and ironing for uniforms or office clothes.', array['Ironing','Wash and fold','Weekend'], array['https://placehold.co/1200x800/FFD6A5/1F2933/png?text=Ironing'], 5, 'Sunday morning and Monday afternoon', null, 250, 500, 'per_load', false, 'experienced', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '27 days'),
  (5, 'Errands', 'Nearby errands and queue help', 'Short errands, queueing, pickup coordination, and simple barangay-to-barangay tasks.', array['Nearby only','Same day','Short task'], array['https://placehold.co/1200x800/A8E6A3/1F2933/png?text=Errands'], 3, 'Same-day tasks when available', null, 150, 350, 'per_service', true, 'beginner', true, 'Barangay clearance can be shown during coordination.', 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '26 days'),
  (6, 'Delivery help', 'Small pickup and delivery help', 'Small parcel, document, prepaid medicine, and market-item pickup within nearby Santo Tomas areas.', array['Small delivery','Nearby only','Pickup available'], array['https://placehold.co/1200x800/F6B8A8/1F2933/png?text=Delivery+Help'], 2, 'Morning and early afternoon', null, 100, 300, 'per_service', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '25 days'),
  (7, 'Home assistance', 'Light household assistance', 'Help with moving light items, organizing rooms, party setup, and simple household support.', array['General help','Home visit','Short task'], array['https://placehold.co/1200x800/D7C5FF/1F2933/png?text=Home+Assistance'], 3, 'Saturday afternoon', null, 300, 800, 'per_job', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '24 days'),
  (8, 'Basic home repair', 'Minor home repair and small fixes', 'Small household fixes such as loose handles, cabinet hinges, shelves, curtain rods, and light carpentry.', array['Small fix','Home maintenance','Tools ready'], array['https://placehold.co/1200x800/CDE7B0/1F2933/png?text=Minor+Home+Fix'], 7, 'Weekdays after 4 PM', null, 500, 1200, 'per_job', true, 'experienced', true, 'Local repair references available.', 'Barangay San Pedro', 'Purok 2, Barangay San Pedro', now() - interval '23 days'),
  (9, 'Basic home repair', 'Kitchen sink and fixture check', 'Simple sink leak checks, loose fittings, clogged strainers, and referral if licensed plumbing is needed.', array['Small fix','Home visit','Indoor'], array['https://placehold.co/1200x800/FFC6D9/1F2933/png?text=Fixture+Check'], 4, 'Morning visits by schedule', 'Simple checks only.', 600, 1300, 'per_job', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '22 days'),
  (10, 'Yard or outdoor help', 'Yard cleanup and outdoor sweeping', 'Clears leaves, sweeps paths, bags garden waste, and helps tidy small outdoor spaces.', array['Yard cleanup','Outdoor','Sweeping'], array['https://placehold.co/1200x800/A0CED9/1F2933/png?text=Yard+Cleanup'], 4, 'Early mornings', null, 350, 900, 'per_job', false, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '21 days'),
  (11, 'Tutoring', 'Grade school tutoring', 'Patient tutoring for reading, math review, homework guidance, and exam preparation.', array['Grade school','Homework guidance','Weekend'], array['https://placehold.co/1200x800/F4E285/1F2933/png?text=Tutoring'], 3, 'Weeknights and Sunday afternoon', null, 150, 300, 'hourly', false, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '20 days'),
  (12, 'Tutoring', 'Grade 6 math review', 'Focused help for fractions, decimals, word problems, and basic algebra preparation.', array['Grade school','Exam review','Math'], array['https://placehold.co/1200x800/F7B267/1F2933/png?text=Math+Tutor'], 4, 'Monday, Wednesday, Friday evenings', null, 180, 350, 'hourly', false, 'experienced', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '19 days'),
  (13, 'Encoding', 'Encoding and spreadsheet help', 'Encodes handwritten notes, attendance sheets, inventory lists, and simple survey results.', array['Typing','Data entry','Online'], array['https://placehold.co/1200x800/B8D8FF/1F2933/png?text=Encoding'], 3, 'Remote work during evenings', null, 100, 250, 'hourly', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '18 days'),
  (14, 'Canva layout', 'Tarpaulin and event layout design', 'Canva layouts for tarpaulins, birthday banners, announcements, and simple posters.', array['Posters','Online','School project'], array['https://placehold.co/1200x800/D7C5FF/1F2933/png?text=Canva+Layout'], 3, 'Afternoons and evenings', null, 300, 1500, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', now() - interval '17 days'),
  (15, 'Presentation design', 'Presentation cleanup and slide design', 'Formats school, work, and community report slides with clean layouts and readable text.', array['Slides','Online','Rush'], array['https://placehold.co/1200x800/F9D978/1F2933/png?text=Slide+Design'], 4, 'Weeknights', null, 400, 1200, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '16 days'),
  (16, 'Social media help', 'Small business social media help', 'Prepares captions, post schedules, and simple Canva posts for sari-sari stores and home sellers.', array['Captions','Small business','Online'], array['https://placehold.co/1200x800/A8E6A3/1F2933/png?text=Social+Media+Help'], 2, 'Remote coordination twice a week', null, 500, 1500, 'weekly', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', now() - interval '15 days'),
  (17, 'Basic computer lessons', 'Basic computer lessons for beginners', 'Teaches email, file folders, video calls, document editing, and safe basic computer use.', array['Beginner help','Senior help','Weekend'], array['https://placehold.co/1200x800/8ED1C6/1F2933/png?text=Computer+Lessons'], 4, 'Sunday afternoons', null, 200, 500, 'hourly', false, 'intermediate', true, 'Experience helping senior neighbors.', 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '14 days'),
  (18, 'School project guidance', 'School project planning guidance', 'Guides students on outlines, research organization, display flow, and presentation practice.', array['Planning help','Research guidance','Weekend'], array['https://placehold.co/1200x800/FFD6A5/1F2933/png?text=Project+Guidance'], 2, 'Weeknights and Sunday morning', null, 250, 700, 'per_session', false, 'beginner', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '13 days'),
  (19, 'Computer setup', 'Laptop and computer setup', 'Sets up user accounts, browsers, basic apps, folders, and printer connection for new computers.', array['Laptop setup','Home visit','Beginner help'], array['https://placehold.co/1200x800/CDE7B0/1F2933/png?text=Computer+Setup'], 5, 'Saturday mornings', null, 400, 900, 'per_visit', false, 'intermediate', true, 'Local tech references available.', 'Barangay San Pedro', 'Purok 2, Barangay San Pedro', now() - interval '12 days'),
  (20, 'Phone setup', 'Phone app and account setup', 'Sets up new phones, installs apps, adjusts accessibility settings, and guides first-time users.', array['App setup','Senior help','Home visit'], array['https://placehold.co/1200x800/F6B8A8/1F2933/png?text=Phone+Setup'], 4, 'Weekends by appointment', null, 200, 500, 'per_visit', false, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '11 days'),
  (21, 'WiFi/router help', 'WiFi router setup and signal check', 'Sets up router names and passwords, checks signal, and explains basic home internet troubleshooting.', array['Router setup','Signal check','Home visit'], array['https://placehold.co/1200x800/A0CED9/1F2933/png?text=WiFi+Help'], 4, 'Weekdays after 5 PM', null, 300, 900, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '10 days'),
  (22, 'Printer setup', 'Printer pairing and print test', 'Connects printers to laptops or phones, checks ink status, and runs document print tests.', array['Printer pairing','Home visit','Troubleshooting'], array['https://placehold.co/1200x800/F4E285/1F2933/png?text=Printer+Setup'], 4, 'Saturday morning', null, 300, 800, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '9 days'),
  (23, 'Basic troubleshooting', 'Appliance and device checkup', 'Checks common issues with fans, chargers, printers, and small devices before repair-shop referral.', array['Device check','Setup help','Short task'], array['https://placehold.co/1200x800/FFC6D9/1F2933/png?text=Troubleshooting'], 4, 'Evenings and weekends', null, 300, 700, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', now() - interval '8 days'),
  (24, 'Document formatting', 'Document formatting and print cleanup', 'Cleans up certificates, forms, school documents, minutes, and printable reports.', array['Forms','Printing-ready','Online'], array['https://placehold.co/1200x800/F7B267/1F2933/png?text=Document+Formatting'], 3, 'Evenings', null, 250, 700, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '7 days'),
  (25, 'Resume or form assistance', 'Resume and form assistance', 'Formats resumes, application letters, simple forms, and clean PDF copies for local applications.', array['Resume','Forms','Document help'], array['https://placehold.co/1200x800/B8D8FF/1F2933/png?text=Resume+Help'], 3, 'Weeknights', null, 300, 1000, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '6 days'),
  (26, 'Canva layout', 'Canva invitations and birthday layouts', 'Creates birthday invitations, simple certificates, thank-you cards, and event posts.', array['Posters','Social posts','Online'], array['https://placehold.co/1200x800/D7C5FF/1F2933/png?text=Event+Layout'], 2, 'Evenings, remote only', null, 250, 700, 'per_project', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', now() - interval '5 days'),
  (27, 'Home assistance', 'Party setup and light cleanup help', 'Assists with chairs, table setup, light decorations, and simple cleanup for small family gatherings.', array['General help','Home visit','Weekend'], array['https://placehold.co/1200x800/F9D978/1F2933/png?text=Party+Setup'], 3, 'Saturday afternoon', null, 500, 1200, 'per_job', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', now() - interval '4 days'),
  (28, 'Delivery help', 'Market item pickup help', 'Pickup support for prepaid groceries, market items, and documents around nearby Santo Tomas areas.', array['Pickup available','Light items','Same day'], array['https://placehold.co/1200x800/8ED1C6/1F2933/png?text=Market+Pickup'], 2, 'Morning schedule preferred', null, 100, 300, 'per_service', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '3 days'),
  (29, 'Presentation design', 'Report slide cleanup', 'Improves report slides with clear hierarchy, readable text, and consistent spacing.', array['Slides','Online','Business deck'], array['https://placehold.co/1200x800/A8E6A3/1F2933/png?text=Report+Slides'], 4, 'Weeknights', null, 400, 1200, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', now() - interval '2 days'),
  (30, 'Resume or form assistance', 'Online form guidance with privacy care', 'Guides public form completion while clients keep passwords and private account details in their own control.', array['Forms','Online','Document help'], array['https://placehold.co/1200x800/F6B8A8/1F2933/png?text=Form+Guidance'], 3, 'Weeknights', 'Client keeps passwords private.', 250, 700, 'per_job', false, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', now() - interval '1 day');

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
  (1, 'Need help cleaning a small apartment', 'Kitchen, bathroom, and floors need cleaning before visitors arrive. Cleaning supplies are ready.', 'Home & Local Help', 'Cleaning', array['Cleaning','Supplies ready','Short task'], array['https://placehold.co/1200x800/F9D978/1F2933/png?text=Apartment+Cleaning'], 'Barangay San Pedro', 'Purok 2, Barangay San Pedro', 400, 800, 'per_visit', true, 'any', false, null, 1, 'Today after 4 PM', 'open', now() - interval '5 hours'),
  (2, 'Looking for laundry help this weekend', 'Need wash, fold, and ironing support for school uniforms and regular clothes.', 'Home & Local Help', 'Laundry help', array['Laundry help','Weekend','Ironing'], array['https://placehold.co/1200x800/8ED1C6/1F2933/png?text=Laundry+Request'], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 200, 450, 'per_load', true, 'any', false, null, 1, 'Sunday morning', 'open', now() - interval '7 hours'),
  (3, 'Need tutor for Grade 6 math', 'Looking for patient math tutoring for fractions, decimals, and word problems.', 'Learning & Digital Help', 'Tutoring', array['Tutoring','Grade school','Math'], array['https://placehold.co/1200x800/F4E285/1F2933/png?text=Math+Tutor+Needed'], 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', 180, 350, 'hourly', false, 'intermediate', false, null, 1, 'Two weekday evenings', 'open', now() - interval '9 hours'),
  (4, 'Need helper for birthday setup', 'Need help arranging chairs, decorations, and light cleanup for a small family birthday.', 'Home & Local Help', 'Home assistance', array['Home assistance','Event setup','Weekend'], array['https://placehold.co/1200x800/D7C5FF/1F2933/png?text=Birthday+Setup'], 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', 500, 1200, 'per_job', true, 'beginner', false, null, 2, 'Saturday afternoon', 'open', now() - interval '11 hours'),
  (5, 'Need minor fixture check', 'One switch cover is loose and a bulb holder needs a simple safety check. No major electrical work.', 'Home & Local Help', 'Basic home repair', array['Basic home repair','Small fix','Home visit'], array['https://placehold.co/1200x800/CDE7B0/1F2933/png?text=Fixture+Check'], 'Barangay San Pedro', 'Purok 2, Barangay San Pedro', 700, 1500, 'per_job', false, 'experienced', true, 'Basic electrical safety preferred.', 1, 'Friday after 5 PM', 'open', now() - interval '14 hours'),
  (6, 'Need help with kitchen sink leak', 'Kitchen sink has a slow leak under the basin and needs a basic check.', 'Home & Local Help', 'Basic home repair', array['Basic home repair','Kitchen','Home visit'], array['https://placehold.co/1200x800/FFC6D9/1F2933/png?text=Sink+Check'], 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', 600, 1300, 'per_job', true, 'intermediate', false, null, 1, 'Tomorrow morning', 'open', now() - interval '1 day'),
  (7, 'Need someone to encode documents', 'Attendance sheets and handwritten notes need encoding into a clean spreadsheet.', 'Learning & Digital Help', 'Encoding', array['Encoding','Spreadsheet','Online'], array['https://placehold.co/1200x800/B8D8FF/1F2933/png?text=Encoding+Request'], 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', 100, 250, 'hourly', true, 'any', false, null, 1, 'Due in three days', 'open', now() - interval '1 day 3 hours'),
  (8, 'Need tarpaulin layout for local event', 'Need a printable tarpaulin layout for a small community activity announcement.', 'Learning & Digital Help', 'Canva layout', array['Canva layout','Tarpaulin','Online'], array['https://placehold.co/1200x800/D7C5FF/1F2933/png?text=Tarpaulin+Layout'], 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', 300, 1500, 'per_project', true, 'intermediate', false, null, 1, 'Before Friday noon', 'open', now() - interval '1 day 6 hours'),
  (9, 'Need outdoor wall painting assistant', 'Need help preparing and painting a small exterior wall section. Paint is already available.', 'Home & Local Help', 'Basic home repair', array['Basic home repair','Outdoor','Short task'], array['https://placehold.co/1200x800/F6B8A8/1F2933/png?text=Wall+Painting+Help'], 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', 700, 1800, 'per_job', true, 'intermediate', false, null, 1, 'Next weekend', 'open', now() - interval '1 day 9 hours'),
  (10, 'Need sari-sari store inventory encoded', 'Need a simple stock list encoded from notebook records into a spreadsheet.', 'Learning & Digital Help', 'Encoding', array['Encoding','Inventory','Spreadsheet'], array['https://placehold.co/1200x800/F7B267/1F2933/png?text=Inventory+Encoding'], 'Barangay San Pedro', 'Purok 1, Barangay San Pedro', 300, 800, 'per_project', true, 'any', false, null, 1, 'This week', 'open', now() - interval '2 days'),
  (11, 'Need small furniture assembly help', 'Small shelf and table need assembly. Screws and manual are available.', 'Home & Local Help', 'Home assistance', array['Home assistance','Assembly','Home visit'], array['https://placehold.co/1200x800/A8E6A3/1F2933/png?text=Furniture+Assembly'], 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', 400, 900, 'per_job', false, 'beginner', false, null, 1, 'Saturday morning', 'open', now() - interval '2 days 3 hours'),
  (12, 'Need nearby medicine pickup', 'Medicine is already paid. Need pickup and delivery within nearby Santo Tomas area.', 'Home & Local Help', 'Delivery help', array['Delivery help','Same day','Small delivery'], array['https://placehold.co/1200x800/8ED1C6/1F2933/png?text=Medicine+Pickup'], 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', 100, 250, 'per_service', false, 'any', false, null, 1, 'Today before 6 PM', 'open', now() - interval '2 days 6 hours'),
  (13, 'Need appliance checkup', 'Electric fan and rice cooker need basic checking before bringing them to a repair shop.', 'Tech & Document Support', 'Basic troubleshooting', array['Basic troubleshooting','Device check','Short task'], array['https://placehold.co/1200x800/FFC6D9/1F2933/png?text=Device+Check'], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 300, 700, 'per_visit', true, 'intermediate', false, null, 1, 'Sunday afternoon', 'open', now() - interval '3 days'),
  (14, 'Need resume formatting help', 'Resume needs cleaner layout and PDF export for a local job application.', 'Tech & Document Support', 'Resume or form assistance', array['Resume','Forms','Online'], array['https://placehold.co/1200x800/B8D8FF/1F2933/png?text=Resume+Formatting'], 'Barangay San Pedro', 'Purok 4, Barangay San Pedro', 300, 1000, 'per_project', true, 'intermediate', false, null, 1, 'Before Monday', 'open', now() - interval '3 days 4 hours'),
  (15, 'Need printer setup for school documents', 'Printer needs to connect to a laptop and print a test page.', 'Tech & Document Support', 'Printer setup', array['Printer setup','Home visit','School document'], array['https://placehold.co/1200x800/F4E285/1F2933/png?text=Printer+Setup+Needed'], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 300, 800, 'per_visit', false, 'intermediate', false, null, 1, 'This weekend', 'open', now() - interval '3 days 8 hours'),
  (16, 'Need WiFi router password changed', 'Router needs a safer password and a signal check in two rooms.', 'Tech & Document Support', 'WiFi/router help', array['WiFi/router help','Home internet','Home visit'], array['https://placehold.co/1200x800/A0CED9/1F2933/png?text=Router+Help'], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 300, 900, 'per_visit', true, 'intermediate', false, null, 1, 'Weekday evening', 'open', now() - interval '4 days'),
  (17, 'Need school project guidance', 'Grade school project needs outline guidance and presentation flow planning.', 'Learning & Digital Help', 'School project guidance', array['School project guidance','Planning help','Online'], array['https://placehold.co/1200x800/FFD6A5/1F2933/png?text=Project+Help'], 'Barangay San Pedro', 'Purok 3, Barangay San Pedro', 250, 700, 'per_session', false, 'any', false, null, 1, 'Saturday morning', 'open', now() - interval '4 days 2 hours'),
  (18, 'Need basic phone setup for parent', 'New Android phone needs contact transfer, font size setup, and basic app installation.', 'Tech & Document Support', 'Phone setup', array['Phone setup','Senior help','Home visit'], array['https://placehold.co/1200x800/F6B8A8/1F2933/png?text=Phone+Setup+Needed'], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 200, 500, 'per_visit', false, 'beginner', false, null, 1, 'Friday after 5 PM', 'open', now() - interval '5 days'),
  (19, 'Need slide deck formatted', 'Community update slides need cleaner layout, readable fonts, and consistent spacing.', 'Learning & Digital Help', 'Presentation design', array['Presentation design','Slides','Online'], array['https://placehold.co/1200x800/F9D978/1F2933/png?text=Slide+Cleanup'], 'Barangay San Pedro', 'Purok 5, Barangay San Pedro', 400, 1200, 'per_project', true, 'intermediate', false, null, 1, 'Before Friday', 'open', now() - interval '5 days 4 hours'),
  (20, 'Need yard cleanup after rain', 'Need leaves cleared, pathway swept, and garden waste bagged outside the house.', 'Home & Local Help', 'Yard or outdoor help', array['Yard or outdoor help','Outdoor','Sweeping'], array['https://placehold.co/1200x800/A8E6A3/1F2933/png?text=Yard+Cleanup+Needed'], 'Barangay San Pedro', 'Purok 6, Barangay San Pedro', 350, 900, 'per_job', false, 'beginner', false, null, 1, 'Friday morning', 'open', now() - interval '6 days');

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

commit;

select 'selected_account_profile_count' as metric, count(*)::text as value
from _seed_people;

select 'updated_profile_count' as metric, count(*)::text as value
from _seed_updated_profiles;

select 'services_inserted' as metric, count(*)::text as value
from public.services s
join _seed_inserted_services seed on seed.id = s.id;

select 'jobs_inserted' as metric, count(*)::text as value
from public.jobs j
join _seed_inserted_jobs seed on seed.id = j.id;

select 'conversations_inserted' as metric, count(*)::text as value
from public.conversations c
join _seed_conversations seed on seed.id = c.id;

select 'messages_inserted' as metric, count(*)::text as value
from public.messages m
join _seed_message_rows seed
  on seed.conversation_id = m.conversation_id
  and seed.sender_id = m.sender_id
  and seed.body = m.body
  and seed.created_at = m.created_at;

select 'valid_service_rate_range_count' as metric, count(*)::text as value
from public.services s
join _seed_inserted_services seed on seed.id = s.id
where s.rate_min is not null
  and s.rate_max is not null
  and s.rate_min > 0
  and s.rate_max >= s.rate_min
  and s.rate_type is not null;

select 'valid_job_budget_range_count' as metric, count(*)::text as value
from public.jobs j
join _seed_inserted_jobs seed on seed.id = j.id
where j.budget_min is not null
  and j.budget_max is not null
  and j.budget_min > 0
  and j.budget_max >= j.budget_min
  and j.rate_type is not null;

select 'missing_service_rate_count' as metric, count(*)::text as value
from public.services s
join _seed_inserted_services seed on seed.id = s.id
where s.rate_min is null
  or s.rate_max is null
  or s.rate_min <= 0
  or s.rate_max < s.rate_min
  or s.rate_type is null;

select 'missing_job_budget_count' as metric, count(*)::text as value
from public.jobs j
join _seed_inserted_jobs seed on seed.id = j.id
where j.budget_min is null
  or j.budget_max is null
  or j.budget_min <= 0
  or j.budget_max < j.budget_min
  or j.rate_type is null;

select 'visible_home_search_service_count' as metric, count(*)::text as value
from public.services s
join _seed_inserted_services seed on seed.id = s.id
join public.profiles p on p.id = s.provider_id
where s.is_active = true
  and coalesce(p.barangay_verified_at, p.verified_at) is not null;

select 'visible_home_search_job_count' as metric, count(*)::text as value
from public.jobs j
join _seed_inserted_jobs seed on seed.id = j.id
join public.profiles p on p.id = coalesce(j.client_id, j.owner_id)
where j.status in ('open', 'reviewing')
  and coalesce(p.barangay_verified_at, p.verified_at) is not null;

select
  p.full_name,
  p.purok_sitio as public_area,
  p.active_role,
  p.about
from _seed_people seed
join public.profiles p on p.id = seed.user_id
order by seed.slot
limit 5;

select
  owner.full_name as owner,
  s.title,
  s.rate_min,
  s.rate_max,
  s.rate_type
from _seed_inserted_services seed
join public.services s on s.id = seed.id
join public.profiles owner on owner.id = s.provider_id
order by s.created_at desc
limit 5;

select
  owner.full_name as owner,
  j.title,
  j.budget_min,
  j.budget_max,
  j.rate_type as budget_type
from _seed_inserted_jobs seed
join public.jobs j on j.id = seed.id
join public.profiles owner on owner.id = coalesce(j.client_id, j.owner_id)
order by j.created_at desc
limit 5;

select
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
