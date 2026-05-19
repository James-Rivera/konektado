-- Konektado demo content reseed that preserves auth users and account records.
--
-- What this clears:
--   notifications, reports, reviews, saved_items, messages, conversations,
--   job_drafts, services, and jobs.
--
-- What this preserves:
--   auth.users, profiles, user_roles, provider_profiles, client_profiles,
--   user_preferences, verifications, verification_files, credentials,
--   storage buckets, and migrations.
--
-- Requirements:
--   1. Run migrations first so expanded rate_type units are available.
--   2. Have at least two non-admin verified profiles. This script does not
--      approve users or create auth accounts.

begin;

create temporary table _demo_people on commit drop as
select
  row_number() over (order by p.created_at nulls last, p.id) as slot,
  p.id as user_id
from public.profiles p
where coalesce(p.barangay_verified_at, p.verified_at) is not null
  and not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p.id
      and ur.role = 'barangay_admin'
  )
order by p.created_at nulls last, p.id
limit 8;

do $$
declare
  verified_people_count integer;
begin
  select count(*) into verified_people_count from _demo_people;

  if verified_people_count < 2 then
    raise exception 'Reseed needs at least two non-admin verified profiles. Auth users were not changed.';
  end if;
end $$;

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
select user_id, 'provider', true from _demo_people
on conflict (user_id, role) do update
set is_active = excluded.is_active;

insert into public.user_roles (user_id, role, is_active)
select user_id, 'client', true from _demo_people
on conflict (user_id, role) do update
set is_active = excluded.is_active;

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
  profile_completed_at,
  created_at,
  updated_at
)
select
  user_id,
  'Cleaning, Laundry help, Basic home repair, Tutoring, Encoding, Canva layout',
  'Available for trusted Barangay San Pedro help',
  'Demo-ready Konektado profile for local service matching and external agreements.',
  'Barangay San Pedro and nearby Sto. Tomas areas',
  'Weekdays after 3:00 PM and weekends by schedule',
  null,
  150,
  1500,
  'per_job',
  true,
  '{}',
  'none',
  now() - interval '12 days',
  now() - interval '14 days',
  now()
from _demo_people
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
  user_id,
  'Hiring trusted help around Barangay San Pedro',
  'Demo-ready Konektado hiring profile for small local jobs and service coordination.',
  array['Cleaning', 'Laundry help', 'Basic home repair', 'Tutoring', 'Encoding', 'Canva layout'],
  '{}',
  'Evenings and weekends',
  'Prefers clear rate ranges before confirming work.',
  now() - interval '12 days',
  now() - interval '14 days',
  now()
from _demo_people
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

create temporary table _demo_service_rows (
  id uuid primary key default gen_random_uuid(),
  idx integer not null,
  category text not null,
  title text not null,
  description text,
  tags text[] not null,
  photo_urls text[] not null,
  years_experience numeric,
  availability_text text,
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
) on commit drop;

insert into _demo_service_rows (
  idx, category, title, description, tags, photo_urls, years_experience,
  availability_text, rate_text, rate_min, rate_max, rate_type, rate_negotiable,
  experience_level, certification_available, certification_note, barangay,
  location_text, created_at
)
values
  (1, 'Laundry help', 'Laundry help per load', 'Wash-and-fold help for everyday clothes, towels, and small household laundry.', array['Home & Local Help','Laundry help','Wash and fold'], array['https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80'], 3, 'Pickup available Saturday morning', null, 150, 300, 'per_load', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 1, Rizal Street', now() - interval '30 days'),
  (2, 'Laundry help', 'Laundry washing and ironing', 'Laundry washing, drying assistance, folding, and ironing for uniforms or office clothes.', array['Home & Local Help','Laundry help','Ironing'], array['https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=1200&q=80'], 4, 'Sunday morning and Monday afternoon', null, 250, 500, 'per_load', false, 'intermediate', false, null, 'Barangay San Pedro', 'Sampaguita Street', now() - interval '29 days'),
  (3, 'Cleaning', 'House cleaning for small homes', 'General sweeping, mopping, kitchen cleanup, and bathroom cleaning for small houses or apartments.', array['Home & Local Help','Cleaning','Regular cleaning'], array['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80'], 5, 'Weekdays after lunch', null, 400, 800, 'per_visit', true, 'intermediate', true, 'Barangay clearance available for review.', 'Barangay San Pedro', 'Purok 2 near covered court', now() - interval '28 days'),
  (4, 'Cleaning', 'Deep cleaning for move-in or guests', 'Deep cleaning for bedrooms, kitchen corners, cabinets, and dusty spaces before visitors or move-in.', array['Home & Local Help','Cleaning','Deep clean'], array['https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80'], 6, 'Needs one day notice', null, 800, 1500, 'per_job', true, 'experienced', true, 'Local references available.', 'Barangay San Pedro', 'Purok 5, Narra Street', now() - interval '27 days'),
  (5, 'Basic home repair', 'Minor home repair', 'Small household fixes such as loose handles, cabinet hinges, shelves, curtain rods, and light carpentry.', array['Home & Local Help','Basic home repair','Small fix'], array['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80'], 6, 'Weekdays after 4:00 PM', null, 500, 1200, 'per_job', true, 'experienced', true, 'Barangay clearance and local repair references.', 'Barangay San Pedro', 'Mabini Road', now() - interval '26 days'),
  (6, 'Basic home repair', 'Minor electrical fixture check', 'Checks switches, bulbs, outlets, and simple fixture issues before recommending a licensed electrician for major work.', array['Home & Local Help','Basic home repair','Home maintenance'], array['https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=80'], 5, 'Saturday afternoon', 'Simple checks only; no high-risk electrical work.', 700, 1500, 'per_job', false, 'experienced', true, 'Basic electrical safety training noted.', 'Barangay San Pedro', 'Purok 4, Mabini Road', now() - interval '25 days'),
  (7, 'Basic home repair', 'Kitchen sink leak and basic plumbing help', 'Helps with simple sink leaks, loose fittings, clogged strainers, and referral if licensed plumbing is needed.', array['Home & Local Help','Basic home repair','Kitchen'], array['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'], 4, 'Morning visits by schedule', null, 600, 1300, 'per_job', true, 'intermediate', false, null, 'Barangay San Pedro', 'Bonifacio Street', now() - interval '24 days'),
  (8, 'Basic troubleshooting', 'Appliance checkup and basic troubleshooting', 'Checks common issues with fans, rice cookers, phone chargers, and small appliances before repair shop referral.', array['Tech & Document Support','Basic troubleshooting','Device check'], array['https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80'], 4, 'Evenings and weekends', null, 300, 700, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Near barangay hall', now() - interval '23 days'),
  (9, 'Basic home repair', 'Carpentry repair for small fixtures', 'Repairs small wood fixtures, loose cabinet doors, light shelves, and simple furniture reinforcement.', array['Home & Local Help','Basic home repair','Carpentry'], array['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'], 7, 'Weekends only', null, 700, 2000, 'per_job', true, 'experienced', true, 'Local carpentry references available.', 'Barangay San Pedro', 'Purok 3, Bonifacio Street', now() - interval '22 days'),
  (10, 'Tutoring', 'Grade school tutoring', 'Patient tutoring for grade school reading, math review, homework guidance, and exam preparation.', array['Learning & Digital Help','Tutoring','Grade school'], array['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80'], 3, 'Weeknights and Sunday afternoon', null, 150, 300, 'hourly', false, 'intermediate', false, null, 'Barangay San Pedro', 'Online or Purok 2 meetups', now() - interval '21 days'),
  (11, 'Tutoring', 'Grade 6 math tutoring', 'Focused help for fractions, word problems, and basic algebra preparation.', array['Learning & Digital Help','Tutoring','Math'], array['https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=1200&q=80'], 4, 'Monday, Wednesday, Friday evenings', null, 180, 350, 'hourly', false, 'experienced', false, null, 'Barangay San Pedro', 'Near San Pedro chapel', now() - interval '20 days'),
  (12, 'Tutoring', 'Reading tutorial for young learners', 'Reading practice, phonics, short story comprehension, and gentle homework support.', array['Learning & Digital Help','Tutoring','Reading'], array['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80'], 2, 'Saturday mornings', null, 150, 250, 'hourly', false, 'beginner', false, null, 'Barangay San Pedro', 'Purok 1, Rizal Street', now() - interval '19 days'),
  (13, 'Encoding', 'Encoding and data entry help', 'Encodes handwritten notes, attendance sheets, inventory lists, and simple survey results.', array['Learning & Digital Help','Encoding','Data entry'], array['https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80'], 3, 'Remote work during evenings', null, 100, 250, 'hourly', true, 'intermediate', false, null, 'Barangay San Pedro', 'Online from Brgy. San Pedro', now() - interval '18 days'),
  (14, 'Resume or form assistance', 'Resume and layout design', 'Formats resumes, application letters, simple forms, and clean PDF copies for local job applications.', array['Tech & Document Support','Resume or form assistance','Resume'], array['https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80'], 3, 'Weeknights', null, 300, 1000, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Online or near barangay hall', now() - interval '17 days'),
  (15, 'Canva layout', 'Tarpaulin and event layout design', 'Canva layouts for tarpaulins, birthday banners, barangay announcements, and simple posters.', array['Learning & Digital Help','Canva layout','Tarpaulin'], array['https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=1200&q=80'], 3, 'Afternoons and evenings', null, 300, 1500, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Online from Brgy. San Pedro', now() - interval '16 days'),
  (16, 'Presentation design', 'Presentation cleanup and slide design', 'Formats school, work, and barangay report slides with clean layouts and readable text.', array['Learning & Digital Help','Presentation design','Slides'], array['https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80'], 4, 'Weeknights', null, 400, 1200, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Online from Brgy. San Pedro', now() - interval '15 days'),
  (17, 'Social media help', 'Small business social media help', 'Prepares captions, post schedules, and simple Canva posts for sari-sari stores and home sellers.', array['Learning & Digital Help','Social media help','Small business'], array['https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=1200&q=80'], 2, 'Remote coordination twice a week', null, 500, 1500, 'weekly', true, 'beginner', false, null, 'Barangay San Pedro', 'Online from Brgy. San Pedro', now() - interval '14 days'),
  (18, 'Document formatting', 'Document formatting and print-ready cleanup', 'Cleans up certificates, forms, school documents, minutes, and printable reports.', array['Tech & Document Support','Document formatting','Printing-ready'], array['https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80'], 3, 'Evenings', null, 250, 700, 'per_project', true, 'intermediate', false, null, 'Barangay San Pedro', 'Online coordination', now() - interval '13 days'),
  (19, 'Computer setup', 'Laptop and computer setup', 'Sets up user accounts, browsers, basic apps, folders, and printer connection for new computers.', array['Tech & Document Support','Computer setup','Laptop setup'], array['https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80'], 5, 'Saturday mornings', null, 400, 900, 'per_visit', false, 'intermediate', true, 'Local tech references available.', 'Barangay San Pedro', 'Mabini Road', now() - interval '12 days'),
  (20, 'Phone setup', 'Phone app and account setup', 'Sets up new phones, installs apps, adjusts accessibility settings, and guides first-time users.', array['Tech & Document Support','Phone setup','Senior help'], array['https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1200&q=80'], 4, 'Weekends by appointment', null, 200, 500, 'per_visit', false, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 2 near covered court', now() - interval '11 days'),
  (21, 'WiFi/router help', 'WiFi router setup and signal check', 'Sets up router names and passwords, checks signal, and explains basic home internet troubleshooting.', array['Tech & Document Support','WiFi/router help','Router setup'], array['https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80'], 4, 'Weekdays after 5:00 PM', null, 300, 900, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Purok 4, Mabini Road', now() - interval '10 days'),
  (22, 'Printer setup', 'Printer pairing and print test', 'Connects printers to laptops or phones, checks ink status, and runs document print tests.', array['Tech & Document Support','Printer setup','Printer pairing'], array['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'], 4, 'Saturday morning', null, 300, 800, 'per_visit', true, 'intermediate', false, null, 'Barangay San Pedro', 'Near barangay hall', now() - interval '9 days'),
  (23, 'Delivery help', 'Nearby pickup and delivery help', 'Small parcel, prepaid medicine, document, and market-item pickup within nearby Sto. Tomas areas.', array['Home & Local Help','Delivery help','Nearby only'], array['https://images.unsplash.com/photo-1605902711622-cfb43c4437d5?auto=format&fit=crop&w=1200&q=80'], 2, 'Morning and early afternoon', null, 100, 300, 'per_service', true, 'beginner', false, null, 'Barangay San Pedro', 'Rizal Street and nearby subdivisions', now() - interval '8 days'),
  (24, 'Errands', 'Nearby errands and queue assistance', 'Helps with short errands, queueing, pickup coordination, and simple barangay-to-barangay tasks.', array['Home & Local Help','Errands','Same day'], array['https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=1200&q=80'], 3, 'Same-day tasks when available', null, 150, 350, 'per_service', true, 'beginner', true, 'Barangay clearance available for review.', 'Barangay San Pedro', 'Purok 5, Narra Street', now() - interval '7 days'),
  (25, 'Home assistance', 'Light household assistance', 'Assists with moving light items, organizing rooms, party setup, and simple household support.', array['Home & Local Help','Home assistance','General help'], array['https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=80'], 3, 'Saturday afternoon', null, 300, 800, 'per_job', true, 'beginner', false, null, 'Barangay San Pedro', 'Purok 3, Bonifacio Street', now() - interval '6 days'),
  (26, 'Yard or outdoor help', 'Yard cleanup and outdoor sweeping', 'Clears leaves, sweeps paths, bags garden waste, and helps tidy small outdoor areas.', array['Home & Local Help','Yard or outdoor help','Outdoor'], array['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80'], 4, 'Early mornings', null, 350, 900, 'per_job', false, 'intermediate', false, null, 'Barangay San Pedro', 'Narra Street area', now() - interval '5 days'),
  (27, 'Basic computer lessons', 'Basic computer lessons for beginners', 'Teaches email, file folders, video calls, document editing, and safe basic computer use.', array['Learning & Digital Help','Basic computer lessons','Beginner help'], array['https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80'], 4, 'Sunday afternoons', null, 200, 500, 'hourly', false, 'intermediate', true, 'Experience helping senior neighbors.', 'Barangay San Pedro', 'Mabini Road', now() - interval '4 days'),
  (28, 'School project guidance', 'School project planning guidance', 'Guides students on outlines, research organization, display flow, and presentation practice.', array['Learning & Digital Help','School project guidance','Student support'], array['https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80'], 2, 'Weeknights and Sunday morning', null, 250, 700, 'per_session', false, 'beginner', false, null, 'Barangay San Pedro', 'Online from Brgy. San Pedro', now() - interval '3 days'),
  (29, 'Canva layout', 'Canva invitations and birthday layouts', 'Creates birthday invitations, simple certificates, thank-you cards, and social-ready event posts.', array['Learning & Digital Help','Canva layout','Posters'], array['https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80'], 2, 'Evenings, remote only', null, 250, 700, 'per_project', true, 'beginner', false, null, 'Barangay San Pedro', 'Online from Brgy. San Pedro', now() - interval '2 days'),
  (30, 'Resume or form assistance', 'Online form assistance with privacy care', 'Helps fill public forms while the client keeps passwords and private account details in their own control.', array['Tech & Document Support','Resume or form assistance','Forms'], array['https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80'], 3, 'Weeknights', 'Client keeps passwords private.', 250, 700, 'per_job', false, 'intermediate', false, null, 'Barangay San Pedro', 'Online or near barangay hall', now() - interval '1 day');

create temporary table _demo_inserted_services on commit drop as
select
  r.id,
  r.idx,
  p.user_id as provider_id
from _demo_service_rows r
join _demo_people p
  on p.slot = ((r.idx - 1) % (select count(*) from _demo_people)) + 1;

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
  r.barangay,
  r.location_text,
  true,
  r.idx % 5 = 0,
  false,
  true,
  r.created_at,
  now()
from _demo_service_rows r
join _demo_inserted_services s on s.id = r.id;

create temporary table _demo_job_rows (
  id uuid primary key default gen_random_uuid(),
  idx integer not null,
  title text not null,
  description text,
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
  workers_needed integer,
  schedule_text text,
  status text not null,
  created_at timestamptz not null
) on commit drop;

insert into _demo_job_rows (
  idx, title, description, category, service_needed, tags, photo_urls, barangay,
  location_text, budget_min, budget_max, rate_type, budget_negotiable,
  experience_level, certification_required, certification_note, workers_needed,
  schedule_text, status, created_at
)
values
  (1, 'Need help cleaning a small apartment', 'Small apartment needs kitchen, bathroom, and floor cleaning before visitors arrive.', 'Home & Local Help', 'Cleaning', array['Home & Local Help','Cleaning','Supplies ready'], array['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Purok 2 near covered court', 400, 800, 'per_visit', true, 'any', false, null, 1, 'Today after 4:00 PM', 'open', now() - interval '5 hours'),
  (2, 'Looking for laundry help this weekend', 'Need wash, fold, and ironing support for school uniforms and regular clothes.', 'Home & Local Help', 'Laundry help', array['Home & Local Help','Laundry help','Weekend'], array['https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Sampaguita Street', 200, 450, 'per_load', true, 'any', false, null, 1, 'Sunday morning', 'open', now() - interval '7 hours'),
  (3, 'Need tutor for Grade 6 Math', 'Looking for patient math tutoring for fractions, decimals, and word problems.', 'Learning & Digital Help', 'Tutoring', array['Learning & Digital Help','Tutoring','Grade school'], array['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Near San Pedro chapel', 180, 350, 'hourly', false, 'intermediate', false, null, 1, 'Two weekday evenings', 'open', now() - interval '9 hours'),
  (4, 'Hiring helper for birthday setup preparation', 'Need help arranging chairs, decorations, and cleanup support for a small family birthday.', 'Home & Local Help', 'Home assistance', array['Home & Local Help','Home assistance','Event setup'], array['https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Purok 3, Bonifacio Street', 500, 1200, 'per_job', true, 'beginner', false, null, 2, 'Saturday afternoon', 'open', now() - interval '11 hours'),
  (5, 'Need minor electrical fixture check', 'One light switch is loose and a bulb holder needs checking. Simple check only.', 'Home & Local Help', 'Basic home repair', array['Home & Local Help','Basic home repair','Fixture check'], array['https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Mabini Road', 700, 1500, 'per_job', false, 'experienced', true, 'Basic electrical safety preferred.', 1, 'Friday after 5:00 PM', 'reviewing', now() - interval '14 hours'),
  (6, 'Looking for help with kitchen sink leak', 'Kitchen sink has a slow leak under the basin and needs a basic check.', 'Home & Local Help', 'Basic home repair', array['Home & Local Help','Basic home repair','Kitchen'], array['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Rizal Street', 600, 1300, 'per_job', true, 'intermediate', false, null, 1, 'Tomorrow morning', 'open', now() - interval '1 day'),
  (7, 'Need someone to encode documents', 'Attendance sheets and handwritten notes need encoding into a clean spreadsheet.', 'Learning & Digital Help', 'Encoding', array['Learning & Digital Help','Encoding','Spreadsheet'], array['https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Online from Brgy. San Pedro', 100, 250, 'hourly', true, 'any', false, null, 1, 'Due in three days', 'open', now() - interval '1 day 3 hours'),
  (8, 'Need tarpaulin layout for barangay event', 'Need a printable tarpaulin layout for a small barangay activity announcement.', 'Learning & Digital Help', 'Canva layout', array['Learning & Digital Help','Canva layout','Tarpaulin'], array['https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Online coordination', 300, 1500, 'per_project', true, 'intermediate', false, null, 1, 'Before Friday noon', 'open', now() - interval '1 day 6 hours'),
  (9, 'Looking for house repainting assistant', 'Need help preparing and painting a small exterior wall section. Paint is already available.', 'Home & Local Help', 'Basic home repair', array['Home & Local Help','Basic home repair','Outdoor'], array['https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Purok 5, Narra Street', 700, 1800, 'per_job', true, 'intermediate', false, null, 1, 'Next weekend', 'open', now() - interval '1 day 9 hours'),
  (10, 'Need helper for sari-sari store inventory', 'Need a simple stock list encoded from notebook records into a spreadsheet.', 'Learning & Digital Help', 'Encoding', array['Learning & Digital Help','Encoding','Inventory'], array['https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Purok 1, Rizal Street', 300, 800, 'per_project', true, 'any', false, null, 1, 'This week', 'open', now() - interval '2 days'),
  (11, 'Need someone to assemble furniture', 'Small shelf and table need assembly. Screws and manual are available.', 'Home & Local Help', 'Home assistance', array['Home & Local Help','Home assistance','Assembly'], array['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Bonifacio Street', 400, 900, 'per_job', false, 'beginner', false, null, 1, 'Saturday morning', 'open', now() - interval '2 days 3 hours'),
  (12, 'Need nearby medicine pickup', 'Medicine is already paid. Need pickup and delivery within Barangay San Pedro.', 'Home & Local Help', 'Delivery help', array['Home & Local Help','Delivery help','Same day'], array['https://images.unsplash.com/photo-1583912267550-3f7249ae401b?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Near barangay hall', 100, 250, 'per_service', false, 'any', false, null, 1, 'Today before 6:00 PM', 'open', now() - interval '2 days 6 hours'),
  (13, 'Need appliance checkup', 'Electric fan and rice cooker need basic checking before bringing to a repair shop.', 'Tech & Document Support', 'Basic troubleshooting', array['Tech & Document Support','Basic troubleshooting','Device check'], array['https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Mabini Road', 300, 700, 'per_visit', true, 'intermediate', false, null, 1, 'Sunday afternoon', 'completed', now() - interval '10 days'),
  (14, 'Need resume formatting help', 'Resume needs cleaner layout and PDF export for a local job application.', 'Tech & Document Support', 'Resume or form assistance', array['Tech & Document Support','Resume or form assistance','Resume'], array['https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Online from Brgy. San Pedro', 300, 1000, 'per_project', true, 'intermediate', false, null, 1, 'Before Monday', 'open', now() - interval '3 days'),
  (15, 'Need printer setup for school documents', 'Printer needs to connect to a laptop and print a test page.', 'Tech & Document Support', 'Printer setup', array['Tech & Document Support','Printer setup','Home visit'], array['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Sampaguita Street', 300, 800, 'per_visit', false, 'intermediate', false, null, 1, 'This weekend', 'open', now() - interval '3 days 4 hours'),
  (16, 'Need WiFi router password changed', 'Router needs a safer password and signal check in two rooms.', 'Tech & Document Support', 'WiFi/router help', array['Tech & Document Support','WiFi/router help','Home internet'], array['https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Purok 4, Mabini Road', 300, 900, 'per_visit', true, 'intermediate', false, null, 1, 'Weekday evening', 'open', now() - interval '4 days'),
  (17, 'Need school project guidance', 'Grade school project needs outline guidance and presentation flow planning.', 'Learning & Digital Help', 'School project guidance', array['Learning & Digital Help','School project guidance','Student support'], array['https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Online or near barangay hall', 250, 700, 'per_session', false, 'any', false, null, 1, 'Saturday morning', 'open', now() - interval '4 days 2 hours'),
  (18, 'Need basic phone setup for parent', 'New Android phone needs contact transfer, font size setup, and basic app installation.', 'Tech & Document Support', 'Phone setup', array['Tech & Document Support','Phone setup','Senior help'], array['https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Purok 2 covered court area', 200, 500, 'per_visit', false, 'beginner', false, null, 1, 'Friday after 5:00 PM', 'open', now() - interval '5 days'),
  (19, 'Need slide deck formatted', 'Community update slides need cleaner layout, readable fonts, and consistent spacing.', 'Learning & Digital Help', 'Presentation design', array['Learning & Digital Help','Presentation design','Slides'], array['https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Online coordination', 400, 1200, 'per_project', true, 'intermediate', false, null, 1, 'Before Friday', 'open', now() - interval '5 days 4 hours'),
  (20, 'Need yard cleanup after rain', 'Need leaves cleared, pathway swept, and garden waste bagged outside the house.', 'Home & Local Help', 'Yard or outdoor help', array['Home & Local Help','Yard or outdoor help','Outdoor'], array['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80'], 'Barangay San Pedro', 'Narra Street', 350, 900, 'per_job', false, 'beginner', false, null, 1, 'Friday morning', 'open', now() - interval '6 days');

create temporary table _demo_inserted_jobs on commit drop as
select
  r.id,
  r.idx,
  client.user_id as client_id,
  provider.user_id as provider_id,
  r.status
from _demo_job_rows r
join _demo_people client
  on client.slot = ((r.idx - 1) % (select count(*) from _demo_people)) + 1
join _demo_people provider
  on provider.slot = (r.idx % (select count(*) from _demo_people)) + 1;

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
  case when r.status in ('in_progress', 'completed', 'closed') then j.provider_id else null end,
  true,
  r.idx % 4 = 0,
  false,
  r.created_at,
  now(),
  case when r.status in ('completed', 'closed') then r.created_at + interval '2 days' else null end
from _demo_job_rows r
join _demo_inserted_jobs j on j.id = r.id;

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
  5,
  'Arrived on time, explained the issue clearly, and kept the rate within the agreed range.',
  now() - interval '7 days',
  now() - interval '7 days'
from _demo_inserted_jobs j
where j.status = 'completed'
limit 1;

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
  'Clear instructions and easy coordination through Konektado messages.',
  now() - interval '7 days',
  now() - interval '7 days'
from _demo_inserted_jobs j
where j.status = 'completed'
limit 1;

create temporary table _demo_conversations on commit drop as
select
  gen_random_uuid() as id,
  j.id as job_id,
  null::uuid as service_id,
  j.client_id,
  j.provider_id,
  j.client_id as started_by,
  case when j.status = 'completed' then 'hired' else 'active' end as status,
  case when j.status = 'completed' then now() - interval '8 days' else null end as hired_at,
  now() - ((j.idx + 1)::text || ' hours')::interval as created_at
from _demo_inserted_jobs j
where j.idx in (1, 3, 8, 13)
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
from _demo_inserted_services s
join _demo_people client
  on client.slot = (s.idx % (select count(*) from _demo_people)) + 1
where s.idx in (2, 5, 15, 23);

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
from _demo_conversations
where client_id <> provider_id;

insert into public.messages (conversation_id, sender_id, body, created_at)
select id, client_id, 'Hello, available po ba for this task?', created_at + interval '5 minutes'
from _demo_conversations
where client_id <> provider_id
union all
select id, provider_id, 'Available po. I can work within the posted rate range after checking the details.', created_at + interval '12 minutes'
from _demo_conversations
where client_id <> provider_id;

insert into public.saved_items (user_id, item_type, item_id, created_at)
select
  p.user_id,
  'provider',
  s.provider_id,
  now() - (s.idx::text || ' hours')::interval
from _demo_inserted_services s
join _demo_people p on p.slot = 1
where s.idx in (1, 5, 10, 15, 21)
  and p.user_id <> s.provider_id
on conflict (user_id, item_type, item_id) do nothing;

insert into public.saved_items (user_id, item_type, item_id, created_at)
select
  p.user_id,
  'job',
  j.id,
  now() - (j.idx::text || ' hours')::interval
from _demo_inserted_jobs j
join _demo_people p on p.slot = 2
where j.idx in (1, 3, 7, 11, 16)
  and p.user_id <> j.client_id
on conflict (user_id, item_type, item_id) do nothing;

commit;

select 'service_listings' as metric, count(*)::text as value
from public.services;

select 'job_posts' as metric, count(*)::text as value
from public.jobs;

select 'services_valid_rate_ranges' as metric, count(*)::text as value
from public.services
where rate_min is not null
  and rate_max is not null
  and rate_min > 0
  and rate_max >= rate_min;

select 'jobs_valid_budget_ranges' as metric, count(*)::text as value
from public.jobs
where budget_min is not null
  and budget_max is not null
  and budget_min > 0
  and budget_max >= budget_min;

select 'services_missing_rates' as metric, count(*)::text as value
from public.services
where rate_min is null
  or rate_max is null
  or rate_min <= 0
  or rate_max < rate_min;

select 'jobs_missing_budget_ranges' as metric, count(*)::text as value
from public.jobs
where budget_min is null
  or budget_max is null
  or budget_min <= 0
  or budget_max < budget_min;

select 'visible_home_feed_rows' as metric, count(*)::text as value
from (
  select id from public.services where is_active = true
  union all
  select id from public.jobs where status in ('open', 'reviewing')
) feed_rows;

select 'visible_search_rows' as metric, count(*)::text as value
from (
  select id from public.services where is_active = true
  union all
  select id from public.jobs where status in ('open', 'reviewing')
) search_rows;

select
  kind,
  title,
  rate_min,
  rate_max,
  rate_type,
  status
from (
  select
    'service' as kind,
    title,
    rate_min,
    rate_max,
    rate_type,
    case when is_active then 'active' else 'inactive' end as status,
    created_at
  from public.services
  union all
  select
    'job',
    title,
    budget_min,
    budget_max,
    rate_type,
    status,
    created_at
  from public.jobs
) sample_rows
order by created_at desc
limit 5;
