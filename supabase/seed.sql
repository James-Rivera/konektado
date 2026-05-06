-- Konektado demo/test seed.
-- Password for every demo account: Test12345!
--
-- Accounts:
-- admin@konektado.test        Barangay admin, can approve verification requests
-- client@konektado.test       Verified client with jobs and conversations
-- worker@konektado.test       Verified provider with services and hired history
-- worker2@konektado.test      Verified provider with active services
-- viewer@konektado.test       Unverified viewer with a pending verification request
-- rejected@konektado.test     Unverified viewer with a rejected verification request

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  admin_id uuid := '00000000-0000-4000-8000-000000000001';
  client_id uuid := '00000000-0000-4000-8000-000000000002';
  worker_id uuid := '00000000-0000-4000-8000-000000000003';
  worker2_id uuid := '00000000-0000-4000-8000-000000000004';
  viewer_id uuid := '00000000-0000-4000-8000-000000000005';
  rejected_id uuid := '00000000-0000-4000-8000-000000000006';
  demo_user_ids uuid[] := array[admin_id, client_id, worker_id, worker2_id, viewer_id, rejected_id];
begin
  delete from auth.identities where user_id = any(demo_user_ids);
  delete from auth.users where id = any(demo_user_ids);
end $$;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  email_change_token_current,
  email_change_confirm_status,
  reauthentication_token,
  is_sso_user,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin@konektado.test',
    extensions.crypt('Test12345!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"barangay_admin","app_role":"barangay_admin"}'::jsonb,
    false,
    now() - interval '20 days',
    now() - interval '20 days',
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'client@konektado.test',
    extensions.crypt('Test12345!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"client","app_role":"client"}'::jsonb,
    false,
    now() - interval '18 days',
    now() - interval '18 days',
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'worker@konektado.test',
    extensions.crypt('Test12345!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"provider","app_role":"provider"}'::jsonb,
    false,
    now() - interval '17 days',
    now() - interval '17 days',
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'worker2@konektado.test',
    extensions.crypt('Test12345!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"provider","app_role":"provider"}'::jsonb,
    false,
    now() - interval '15 days',
    now() - interval '15 days',
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000005',
    'authenticated',
    'authenticated',
    'viewer@konektado.test',
    extensions.crypt('Test12345!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"client","app_role":"client"}'::jsonb,
    false,
    now() - interval '4 days',
    now() - interval '4 days',
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000006',
    'authenticated',
    'authenticated',
    'rejected@konektado.test',
    extensions.crypt('Test12345!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"provider","app_role":"provider"}'::jsonb,
    false,
    now() - interval '6 days',
    now() - interval '6 days',
    '',
    0,
    '',
    false,
    false
  );

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  id::text,
  id,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true, 'phone_verified', false),
  'email',
  now(),
  created_at,
  updated_at
from auth.users
where id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006'
);

insert into public.profiles (
  id,
  email,
  role,
  active_role,
  first_name,
  last_name,
  full_name,
  birthdate,
  barangay,
  street_address,
  city,
  phone,
  avatar_url,
  about,
  availability,
  verified_at,
  barangay_verified_at,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'admin@konektado.test',
    'barangay_admin',
    'barangay_admin',
    'Alma',
    'Dizon',
    'Alma Dizon',
    '1986-02-14',
    'Barangay San Pedro',
    'Barangay Hall',
    'Sto. Tomas',
    '+63 917 000 0001',
    'https://i.pravatar.cc/300?img=47',
    'Barangay verification reviewer for Konektado demos.',
    'Weekdays',
    now() - interval '19 days',
    now() - interval '19 days',
    now() - interval '20 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'client@konektado.test',
    'client',
    'client',
    'Maria',
    'Santos',
    'Maria Santos',
    '1991-08-20',
    'Barangay San Pedro',
    'Purok 2, Sampaguita Street',
    'Sto. Tomas',
    '+63 917 000 0002',
    'https://i.pravatar.cc/300?img=32',
    'Local homeowner who hires trusted workers for selected home, digital, and tech support services.',
    'Usually replies in the evening',
    now() - interval '16 days',
    now() - interval '16 days',
    now() - interval '18 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'worker@konektado.test',
    'provider',
    'provider',
    'Juan',
    'Reyes',
    'Juan Reyes',
    '1988-05-12',
    'Barangay San Pedro',
    'Purok 4, Mabini Road',
    'Sto. Tomas',
    '+63 917 000 0003',
    'https://i.pravatar.cc/300?img=12',
    'Experienced helper for minor home fix support, setup help, and household maintenance.',
    'Weekdays after 2:00 PM and Saturday mornings',
    now() - interval '15 days',
    now() - interval '15 days',
    now() - interval '17 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'worker2@konektado.test',
    'provider',
    'provider',
    'Leah',
    'Cruz',
    'Leah Cruz',
    '1994-11-03',
    'Barangay San Pedro',
    'Purok 1, Rizal Street',
    'Sto. Tomas',
    '+63 917 000 0004',
    'https://i.pravatar.cc/300?img=44',
    'Reliable cleaner and laundry helper for homes near Barangay San Pedro.',
    'Unavailable today, back this weekend',
    now() - interval '12 days',
    now() - interval '12 days',
    now() - interval '15 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'viewer@konektado.test',
    'client',
    'client',
    'Paolo',
    'Garcia',
    'Paolo Garcia',
    '1998-04-09',
    'Barangay San Pedro',
    'Purok 5, Narra Street',
    'Sto. Tomas',
    '+63 917 000 0005',
    'https://i.pravatar.cc/300?img=15',
    'New resident browsing workers before completing verification.',
    null,
    null,
    null,
    now() - interval '4 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'rejected@konektado.test',
    'provider',
    'provider',
    'Liza',
    'Ramos',
    'Liza Ramos',
    '1995-01-26',
    'Barangay San Pedro',
    'Purok 3, Bonifacio Street',
    'Sto. Tomas',
    '+63 917 000 0006',
    'https://i.pravatar.cc/300?img=25',
    'Provider account for testing rejected verification correction states.',
    'Afternoons',
    null,
    null,
    now() - interval '6 days',
    now()
  );

insert into public.user_roles (user_id, role, is_active)
values
  ('00000000-0000-4000-8000-000000000001', 'barangay_admin', true),
  ('00000000-0000-4000-8000-000000000002', 'client', true),
  ('00000000-0000-4000-8000-000000000002', 'provider', false),
  ('00000000-0000-4000-8000-000000000003', 'provider', true),
  ('00000000-0000-4000-8000-000000000003', 'client', false),
  ('00000000-0000-4000-8000-000000000004', 'provider', true),
  ('00000000-0000-4000-8000-000000000005', 'client', true),
  ('00000000-0000-4000-8000-000000000006', 'provider', true);

insert into public.provider_profiles (
  user_id,
  service_type,
  has_certifications,
  certification_details,
  certification_status,
  availability,
  rate_text,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000003',
    'Basic home repair, computer setup, home assistance',
    true,
    'Barangay clearance and practical home maintenance references',
    'approved',
    'Weekdays after 2:00 PM and Saturday mornings',
    'Starts at PHP 600',
    now() - interval '17 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'Cleaning, laundry, organizing',
    true,
    'Barangay clearance and local references',
    'approved',
    'Unavailable today, back this weekend',
    'Starts at PHP 450',
    now() - interval '15 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'Canva layout',
    false,
    null,
    'rejected',
    'Afternoons',
    'Starts at PHP 500',
    now() - interval '6 days',
    now()
  );

insert into public.client_profiles (user_id, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000002', now() - interval '18 days', now()),
  ('00000000-0000-4000-8000-000000000003', now() - interval '17 days', now()),
  ('00000000-0000-4000-8000-000000000005', now() - interval '4 days', now());

insert into public.user_preferences (
  user_id,
  intent,
  offered_services,
  needed_services,
  custom_offered_services,
  custom_needed_services,
  onboarding_completed_at,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000002',
    'client',
    '{}',
    array['Basic home repair', 'Cleaning', 'Document formatting'],
    '{}',
    array['Urgent errands'],
    now() - interval '18 days',
    now() - interval '18 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'provider',
    array['Basic home repair', 'Computer setup', 'Home assistance'],
    '{}',
    array['Printer setup'],
    '{}',
    now() - interval '17 days',
    now() - interval '17 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'provider',
    array['Cleaning', 'Laundry help'],
    '{}',
    array['Home assistance'],
    '{}',
    now() - interval '15 days',
    now() - interval '15 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'client',
    '{}',
    array['Cleaning', 'Basic home repair'],
    '{}',
    '{}',
    now() - interval '4 days',
    now() - interval '4 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'provider',
    array['Canva layout'],
    '{}',
    '{}',
    '{}',
    now() - interval '6 days',
    now() - interval '6 days',
    now()
  );

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
  barangay,
  location_text,
  allow_messages,
  auto_reply_enabled,
  auto_pause_enabled,
  is_active,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-9000-000000002001',
    '00000000-0000-4000-8000-000000000003',
    'Basic home repair',
    'Minor home fix support',
    'Helps with loose hinges, shelves, door handles, and other small non-licensed household maintenance tasks.',
    array['Home & Local Help', 'Basic home repair', 'Home maintenance'],
    array['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'],
    6,
    'Weekdays after 2:00 PM and Saturday mornings',
    'Starts at PHP 600',
    'Barangay San Pedro',
    'Purok 4, Mabini Road',
    true,
    false,
    false,
    true,
    now() - interval '14 days',
    now()
  ),
  (
    '00000000-0000-4000-9000-000000002002',
    '00000000-0000-4000-8000-000000000003',
    'Printer setup',
    'Printer and computer setup help',
    'Helps connect printers, set up laptops, and troubleshoot simple home tech issues.',
    array['Tech & Document Support', 'Printer setup', 'Basic troubleshooting'],
    array['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80'],
    4,
    'Saturday mornings',
    'PHP 500-800 per setup visit',
    'Barangay San Pedro',
    'Purok 4, Mabini Road',
    true,
    false,
    false,
    true,
    now() - interval '13 days',
    now()
  ),
  (
    '00000000-0000-4000-9000-000000002003',
    '00000000-0000-4000-8000-000000000004',
    'Cleaning',
    'Home cleaning and organizing',
    'General cleaning, kitchen cleanup, laundry folding, and room organizing.',
    array['Home & Local Help', 'Cleaning', 'Laundry help'],
    array['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80'],
    5,
    'Unavailable today, back this weekend',
    'Starts at PHP 450',
    'Barangay San Pedro',
    'Purok 1, Rizal Street',
    true,
    false,
    false,
    true,
    now() - interval '11 days',
    now()
  ),
  (
    '00000000-0000-4000-9000-000000002004',
    '00000000-0000-4000-8000-000000000004',
    'Laundry help',
    'Laundry washing and ironing',
    'Can help with weekly laundry, folding, ironing, and closet organizing for busy households.',
    array['Home & Local Help', 'Laundry help', 'Ironing'],
    array['https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80'],
    4,
    'Saturday and Sunday mornings',
    'PHP 350-700 per batch',
    'Barangay San Pedro',
    'Purok 1, Rizal Street',
    true,
    false,
    false,
    true,
    now() - interval '8 days',
    now()
  ),
  (
    '00000000-0000-4000-9000-000000002005',
    '00000000-0000-4000-8000-000000000003',
    'Computer setup',
    'Basic computer setup',
    'Helps with laptop setup, software setup, printer pairing, and beginner troubleshooting.',
    array['Tech & Document Support', 'Computer setup', 'Beginner help'],
    array['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80'],
    5,
    'Weekdays after 3:00 PM',
    'PHP 500 per setup visit',
    'Barangay San Pedro',
    'Purok 4, Mabini Road',
    true,
    true,
    false,
    true,
    now() - interval '6 days',
    now()
  );

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
  budget,
  budget_amount,
  workers_needed,
  schedule_text,
  status,
  accepted_provider_id,
  allow_messages,
  auto_reply_enabled,
  auto_close_enabled,
  created_at,
  updated_at,
  closed_at
)
values
  (
    '00000000-0000-4000-9000-000000001001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Fix loose shelf bracket',
    'Kitchen shelf bracket is loose. Need someone nearby who can inspect and do a basic repair.',
    'Home & Local Help',
    'Basic home repair',
    array['Home & Local Help', 'Kitchen', 'Urgent'],
    array['https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80'],
    'Barangay San Pedro',
    'Purok 2, near covered court',
    'Purok 2, near covered court',
    1200,
    1200,
    1,
    'Today after 4:00 PM',
    'open',
    null,
    true,
    false,
    false,
    now() - interval '3 hours',
    now() - interval '3 hours',
    null
  ),
  (
    '00000000-0000-4000-9000-000000001002',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Clean small apartment before visitors arrive',
    'Need help cleaning living room, kitchen, and bathroom. Cleaning supplies are available.',
    'Home & Local Help',
    'Cleaning',
    array['Home & Local Help', 'Morning', 'Supplies ready'],
    array['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'],
    'Barangay San Pedro',
    'Sampaguita Street',
    'Sampaguita Street',
    900,
    900,
    1,
    'Tomorrow morning',
    'reviewing',
    null,
    true,
    false,
    true,
    now() - interval '1 day',
    now() - interval '1 day',
    null
  ),
  (
    '00000000-0000-4000-9000-000000001003',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Set up printer and laptop',
    'Need help connecting a printer to a laptop and checking basic document printing.',
    'Tech & Document Support',
    'Printer setup',
    array['Tech & Document Support', 'Weekend', 'Document help'],
    array['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'],
    'Barangay San Pedro',
    'Mabini Road',
    'Mabini Road',
    1800,
    1800,
    1,
    'This weekend',
    'in_progress',
    '00000000-0000-4000-8000-000000000003',
    true,
    false,
    false,
    now() - interval '5 days',
    now() - interval '2 days',
    null
  ),
  (
    '00000000-0000-4000-9000-000000001004',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Repair loose cabinet hinges',
    'Kitchen cabinet doors were repaired and aligned.',
    'Home & Local Help',
    'Basic home repair',
    array['Home & Local Help', 'Cabinet', 'Completed'],
    array['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'],
    'Barangay San Pedro',
    'Sampaguita Street',
    'Sampaguita Street',
    700,
    700,
    1,
    'Completed last week',
    'completed',
    '00000000-0000-4000-8000-000000000003',
    true,
    false,
    true,
    now() - interval '12 days',
    now() - interval '7 days',
    now() - interval '7 days'
  ),
  (
    '00000000-0000-4000-9000-000000001005',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Front yard cleanup after rain',
    'Need help clearing leaves, sweeping the path, and bagging garden waste outside the house.',
    'Home & Local Help',
    'Yard or outdoor help',
    array['Home & Local Help', 'Yard cleanup', 'Outdoor'],
    array['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80'],
    'Barangay San Pedro',
    'Narra Street',
    'Narra Street',
    600,
    600,
    1,
    'Friday morning',
    'open',
    null,
    true,
    true,
    false,
    now() - interval '6 hours',
    now() - interval '6 hours',
    null
  ),
  (
    '00000000-0000-4000-9000-000000001006',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Move aparador and bed frame',
    'Looking for two people to move one aparador and a bed frame from the first floor to the next house.',
    'Home & Local Help',
    'Home assistance',
    array['Home & Local Help', 'Furniture', 'Two workers'],
    array['https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=80'],
    'Barangay San Pedro',
    'Sampaguita Street',
    'Sampaguita Street',
    1000,
    1000,
    2,
    'This Saturday afternoon',
    'open',
    null,
    true,
    false,
    false,
    now() - interval '30 minutes',
    now() - interval '30 minutes',
    null
  );

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
values
  (
    '00000000-0000-4000-9000-000000003001',
    '00000000-0000-4000-9000-000000001001',
    null,
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000003',
    'active',
    null,
    now() - interval '2 hours',
    now() - interval '1 hour'
  ),
  (
    '00000000-0000-4000-9000-000000003002',
    '00000000-0000-4000-9000-000000001003',
    null,
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000003',
    'hired',
    now() - interval '2 days',
    now() - interval '5 days',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-9000-000000003003',
    '00000000-0000-4000-9000-000000001002',
    null,
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000004',
    'active',
    null,
    now() - interval '20 hours',
    now() - interval '18 hours'
  );

insert into public.messages (
  id,
  conversation_id,
  sender_id,
  body,
  created_at
)
values
  (
    '00000000-0000-4000-9000-000000004001',
    '00000000-0000-4000-9000-000000003001',
    '00000000-0000-4000-8000-000000000003',
    'Hi Maria, I can check the faucet today after 4 PM.',
    now() - interval '2 hours'
  ),
  (
    '00000000-0000-4000-9000-000000004002',
    '00000000-0000-4000-9000-000000003001',
    '00000000-0000-4000-8000-000000000002',
    'Thanks Juan. Please bring tools for the sink valve.',
    now() - interval '1 hour'
  ),
  (
    '00000000-0000-4000-9000-000000004003',
    '00000000-0000-4000-9000-000000003002',
    '00000000-0000-4000-8000-000000000003',
    'I can install both fixtures this Saturday morning.',
    now() - interval '5 days'
  ),
  (
    '00000000-0000-4000-9000-000000004004',
    '00000000-0000-4000-9000-000000003002',
    '00000000-0000-4000-8000-000000000002',
    'Marked you hired. See you Saturday.',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-9000-000000004005',
    '00000000-0000-4000-9000-000000003003',
    '00000000-0000-4000-8000-000000000004',
    'Good morning. I can clean the apartment tomorrow at 8 AM.',
    now() - interval '20 hours'
  );

insert into public.verifications (
  id,
  user_id,
  status,
  notes,
  reviewer_id,
  reviewer_note,
  reviewed_at,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-9000-000000005001',
    '00000000-0000-4000-8000-000000000002',
    'approved',
    '{"submittedNote":"Seed approved client","document":{"idType":"national_id"},"servicesOrPurpose":"Hire verified local workers"}',
    '00000000-0000-4000-8000-000000000001',
    'Approved for demo testing.',
    now() - interval '16 days',
    now() - interval '17 days',
    now() - interval '16 days'
  ),
  (
    '00000000-0000-4000-9000-000000005002',
    '00000000-0000-4000-8000-000000000003',
    'approved',
    '{"submittedNote":"Seed approved worker","document":{"idType":"barangay_certificate"},"servicesOrPurpose":"Offer handyman services"}',
    '00000000-0000-4000-8000-000000000001',
    'Approved for demo testing.',
    now() - interval '15 days',
    now() - interval '16 days',
    now() - interval '15 days'
  ),
  (
    '00000000-0000-4000-9000-000000005003',
    '00000000-0000-4000-8000-000000000004',
    'approved',
    '{"submittedNote":"Seed approved cleaner","document":{"idType":"national_id"},"servicesOrPurpose":"Offer cleaning services"}',
    '00000000-0000-4000-8000-000000000001',
    'Approved for demo testing.',
    now() - interval '12 days',
    now() - interval '13 days',
    now() - interval '12 days'
  ),
  (
    '00000000-0000-4000-9000-000000005004',
    '00000000-0000-4000-8000-000000000005',
    'pending',
    '{"submittedNote":"Please verify my barangay residency.","document":{"idType":"national_id"},"servicesOrPurpose":"Browse and hire nearby workers"}',
    null,
    null,
    null,
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-9000-000000005005',
    '00000000-0000-4000-8000-000000000006',
    'rejected',
    '{"submittedNote":"First submission for digital layout help provider.","document":{"idType":"national_id"},"servicesOrPurpose":"Offer Canva layout help"}',
    '00000000-0000-4000-8000-000000000001',
    'Please upload a clearer face photo and an ID with matching address.',
    now() - interval '3 days',
    now() - interval '5 days',
    now() - interval '3 days'
  );

insert into public.verification_files (
  id,
  verification_id,
  file_type,
  url,
  created_at
)
values
  (
    '00000000-0000-4000-9000-000000006001',
    '00000000-0000-4000-9000-000000005004',
    'id_front',
    'https://example.com/konektado-demo/viewer-id-front.jpg',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-9000-000000006002',
    '00000000-0000-4000-9000-000000005004',
    'id_back',
    'https://example.com/konektado-demo/viewer-id-back.jpg',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-9000-000000006003',
    '00000000-0000-4000-9000-000000005004',
    'other',
    'https://example.com/konektado-demo/viewer-face.jpg',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-9000-000000006004',
    '00000000-0000-4000-9000-000000005005',
    'id_front',
    'https://example.com/konektado-demo/rejected-id-front.jpg',
    now() - interval '5 days'
  );

insert into public.saved_items (
  id,
  user_id,
  item_type,
  item_id,
  created_at
)
values
  (
    '00000000-0000-4000-9000-000000007001',
    '00000000-0000-4000-8000-000000000002',
    'provider',
    '00000000-0000-4000-8000-000000000003',
    now() - interval '6 days'
  ),
  (
    '00000000-0000-4000-9000-000000007002',
    '00000000-0000-4000-8000-000000000003',
    'job',
    '00000000-0000-4000-9000-000000001001',
    now() - interval '2 hours'
  );

insert into public.reviews (
  id,
  job_id,
  reviewer_id,
  reviewee_id,
  rating,
  comment,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-9000-000000008001',
    '00000000-0000-4000-9000-000000001004',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    5,
    'Juan arrived on time and fixed the cabinet hinges cleanly.',
    now() - interval '6 days',
    now() - interval '6 days'
  ),
  (
    '00000000-0000-4000-9000-000000008002',
    '00000000-0000-4000-9000-000000001004',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000002',
    5,
    'Maria gave clear instructions and paid as agreed outside the app.',
    now() - interval '6 days',
    now() - interval '6 days'
  );

notify pgrst, 'reload schema';
