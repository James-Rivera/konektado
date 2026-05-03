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

create extension if not exists pgcrypto;

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
    crypt('Test12345!', gen_salt('bf')),
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
    crypt('Test12345!', gen_salt('bf')),
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
    crypt('Test12345!', gen_salt('bf')),
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
    crypt('Test12345!', gen_salt('bf')),
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
    crypt('Test12345!', gen_salt('bf')),
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
    crypt('Test12345!', gen_salt('bf')),
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
    'Local homeowner who hires trusted workers for home repairs and errands.',
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
    'Experienced handyman for repairs, light electrical work, and household maintenance.',
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
    'Ana',
    'Cruz',
    'Ana Cruz',
    '1994-11-03',
    'Barangay San Pedro',
    'Purok 1, Rizal Street',
    'Sto. Tomas',
    '+63 917 000 0004',
    'Reliable cleaner and laundry helper for homes near Barangay San Pedro.',
    'Mornings and weekends',
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
    'Repairs, electrical, handyman',
    true,
    'Barangay clearance and practical electrical repair experience',
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
    'Mornings and weekends',
    'Starts at PHP 450',
    now() - interval '15 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'Cooking help',
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
    array['Home repair', 'Cleaning', 'Electrical'],
    '{}',
    array['Urgent errands'],
    now() - interval '18 days',
    now() - interval '18 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'provider',
    array['Repairs', 'Electrical', 'Handyman'],
    '{}',
    array['Light installation'],
    '{}',
    now() - interval '17 days',
    now() - interval '17 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'provider',
    array['Cleaning', 'Laundry'],
    '{}',
    array['Home organizing'],
    '{}',
    now() - interval '15 days',
    now() - interval '15 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'client',
    '{}',
    array['Cleaning', 'Repairs'],
    '{}',
    '{}',
    now() - interval '4 days',
    now() - interval '4 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'provider',
    array['Cooking help'],
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
  years_experience,
  availability_text,
  rate_text,
  is_active,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-9000-000000002001',
    '00000000-0000-4000-8000-000000000003',
    'Repairs',
    'Home repair and handyman help',
    'Fixes doors, faucets, shelves, light carpentry, and small household repairs.',
    6,
    'Weekdays after 2:00 PM and Saturday mornings',
    'Starts at PHP 600',
    true,
    now() - interval '14 days',
    now()
  ),
  (
    '00000000-0000-4000-9000-000000002002',
    '00000000-0000-4000-8000-000000000003',
    'Electrical',
    'Light electrical repair',
    'Switch replacement, light installation, and basic troubleshooting.',
    4,
    'Saturday mornings',
    'PHP 800 inspection and labor estimate',
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
    5,
    'Mornings and weekends',
    'Starts at PHP 450',
    true,
    now() - interval '11 days',
    now()
  );

insert into public.jobs (
  id,
  owner_id,
  client_id,
  title,
  description,
  category,
  barangay,
  location,
  location_text,
  budget,
  budget_amount,
  schedule_text,
  status,
  accepted_provider_id,
  created_at,
  updated_at,
  closed_at
)
values
  (
    '00000000-0000-4000-9000-000000001001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Fix leaking kitchen faucet',
    'Kitchen faucet is leaking under the sink. Need someone nearby who can inspect and repair it.',
    'Repairs',
    'Barangay San Pedro',
    'Purok 2, near covered court',
    'Purok 2, near covered court',
    1200,
    1200,
    'Today after 4:00 PM',
    'open',
    null,
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
    'Cleaning',
    'Barangay San Pedro',
    'Sampaguita Street',
    'Sampaguita Street',
    900,
    900,
    'Tomorrow morning',
    'reviewing',
    null,
    now() - interval '1 day',
    now() - interval '1 day',
    null
  ),
  (
    '00000000-0000-4000-9000-000000001003',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Install two light fixtures',
    'Replace old light fixtures in the dining area and front porch.',
    'Electrical',
    'Barangay San Pedro',
    'Mabini Road',
    'Mabini Road',
    1800,
    1800,
    'This weekend',
    'in_progress',
    '00000000-0000-4000-8000-000000000003',
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
    'Repairs',
    'Barangay San Pedro',
    'Sampaguita Street',
    'Sampaguita Street',
    700,
    700,
    'Completed last week',
    'completed',
    '00000000-0000-4000-8000-000000000003',
    now() - interval '12 days',
    now() - interval '7 days',
    now() - interval '7 days'
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
    '{"submittedNote":"First submission for cooking help provider.","document":{"idType":"national_id"},"servicesOrPurpose":"Offer cooking help"}',
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
