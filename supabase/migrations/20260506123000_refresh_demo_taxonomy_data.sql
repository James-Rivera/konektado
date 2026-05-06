-- Cloud demo data patch for the controlled taxonomy MVP.
-- This updates already-seeded demo rows so the hosted project matches the
-- current local taxonomy without changing schema.

update public.provider_profiles
set
  service_type = 'Basic home repair, computer setup, home assistance',
  has_certifications = true,
  certification_details = 'Barangay clearance and practical home maintenance references',
  certification_status = 'approved',
  availability = 'Weekdays after 2:00 PM and Saturday mornings',
  rate_text = 'Starts at PHP 600',
  updated_at = now()
where user_id = '00000000-0000-4000-8000-000000000003';

update public.provider_profiles
set
  service_type = 'Cleaning, laundry, organizing',
  has_certifications = true,
  certification_details = 'Barangay clearance and local references',
  certification_status = 'approved',
  availability = 'Unavailable today, back this weekend',
  rate_text = 'Starts at PHP 450',
  updated_at = now()
where user_id = '00000000-0000-4000-8000-000000000004';

update public.provider_profiles
set
  service_type = 'Canva layout',
  has_certifications = false,
  certification_details = null,
  certification_status = 'rejected',
  availability = 'Afternoons',
  rate_text = 'Starts at PHP 500',
  updated_at = now()
where user_id = '00000000-0000-4000-8000-000000000006';

update public.user_preferences
set
  intent = 'client',
  offered_services = '{}',
  needed_services = array['Basic home repair', 'Cleaning', 'Document formatting'],
  custom_offered_services = '{}',
  custom_needed_services = array['Urgent errands'],
  updated_at = now()
where user_id = '00000000-0000-4000-8000-000000000002';

update public.user_preferences
set
  intent = 'provider',
  offered_services = array['Basic home repair', 'Computer setup', 'Home assistance'],
  needed_services = '{}',
  custom_offered_services = array['Printer setup'],
  custom_needed_services = '{}',
  updated_at = now()
where user_id = '00000000-0000-4000-8000-000000000003';

update public.user_preferences
set
  intent = 'provider',
  offered_services = array['Cleaning', 'Laundry help'],
  needed_services = '{}',
  custom_offered_services = array['Home assistance'],
  custom_needed_services = '{}',
  updated_at = now()
where user_id = '00000000-0000-4000-8000-000000000004';

update public.user_preferences
set
  intent = 'client',
  offered_services = '{}',
  needed_services = array['Cleaning', 'Basic home repair'],
  custom_offered_services = '{}',
  custom_needed_services = '{}',
  updated_at = now()
where user_id = '00000000-0000-4000-8000-000000000005';

update public.user_preferences
set
  intent = 'provider',
  offered_services = array['Canva layout'],
  needed_services = '{}',
  custom_offered_services = '{}',
  custom_needed_services = '{}',
  updated_at = now()
where user_id = '00000000-0000-4000-8000-000000000006';

update public.services
set
  category = 'Basic home repair',
  title = 'Basic home repair help',
  description = 'Helps with loose hinges, shelves, door handles, and small household maintenance tasks.',
  tags = array['Home & Local Help', 'Basic home repair', 'Home maintenance'],
  photo_urls = array['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'],
  years_experience = 6,
  availability_text = 'Weekdays after 2:00 PM and Saturday mornings',
  rate_text = 'Starts at PHP 600',
  barangay = 'Barangay San Pedro',
  location_text = 'Purok 4, Mabini Road',
  allow_messages = true,
  auto_reply_enabled = false,
  auto_pause_enabled = false,
  is_active = true,
  updated_at = now()
where id = '00000000-0000-4000-9000-000000002001';

update public.services
set
  category = 'Printer setup',
  title = 'Printer and computer setup help',
  description = 'Helps connect printers, set up laptops, and troubleshoot simple home tech issues.',
  tags = array['Tech & Document Support', 'Printer setup', 'Basic troubleshooting'],
  photo_urls = array['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80'],
  years_experience = 4,
  availability_text = 'Saturday mornings',
  rate_text = 'PHP 500-800 per setup visit',
  barangay = 'Barangay San Pedro',
  location_text = 'Purok 4, Mabini Road',
  allow_messages = true,
  auto_reply_enabled = false,
  auto_pause_enabled = false,
  is_active = true,
  updated_at = now()
where id = '00000000-0000-4000-9000-000000002002';

update public.services
set
  category = 'Cleaning',
  title = 'Home cleaning and organizing',
  description = 'General cleaning, kitchen cleanup, laundry folding, and room organizing.',
  tags = array['Home & Local Help', 'Cleaning', 'Laundry help'],
  photo_urls = array['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80'],
  years_experience = 5,
  availability_text = 'Unavailable today, back this weekend',
  rate_text = 'Starts at PHP 450',
  barangay = 'Barangay San Pedro',
  location_text = 'Purok 1, Rizal Street',
  allow_messages = true,
  auto_reply_enabled = false,
  auto_pause_enabled = false,
  is_active = true,
  updated_at = now()
where id = '00000000-0000-4000-9000-000000002003';

update public.services
set
  category = 'Laundry help',
  title = 'Laundry washing and ironing',
  description = 'Can help with weekly laundry, folding, ironing, and closet organizing for busy households.',
  tags = array['Home & Local Help', 'Laundry help', 'Ironing'],
  photo_urls = array['https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80'],
  years_experience = 4,
  availability_text = 'Saturday and Sunday mornings',
  rate_text = 'PHP 350-700 per batch',
  barangay = 'Barangay San Pedro',
  location_text = 'Purok 1, Rizal Street',
  allow_messages = true,
  auto_reply_enabled = false,
  auto_pause_enabled = false,
  is_active = true,
  updated_at = now()
where id = '00000000-0000-4000-9000-000000002004';

update public.services
set
  category = 'Computer setup',
  title = 'Basic computer setup',
  description = 'Helps with laptop setup, software setup, printer pairing, and beginner troubleshooting.',
  tags = array['Tech & Document Support', 'Computer setup', 'Beginner help'],
  photo_urls = array['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80'],
  years_experience = 5,
  availability_text = 'Weekdays after 3:00 PM',
  rate_text = 'PHP 500 per setup visit',
  barangay = 'Barangay San Pedro',
  location_text = 'Purok 4, Mabini Road',
  allow_messages = true,
  auto_reply_enabled = true,
  auto_pause_enabled = false,
  is_active = true,
  updated_at = now()
where id = '00000000-0000-4000-9000-000000002005';

update public.jobs
set
  title = 'Fix loose shelf bracket',
  description = 'Kitchen shelf bracket is loose. Need someone nearby who can inspect and do a basic repair.',
  category = 'Home & Local Help',
  service_needed = 'Basic home repair',
  tags = array['Home & Local Help', 'Kitchen', 'Urgent'],
  photo_urls = array['https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80'],
  barangay = 'Barangay San Pedro',
  location = 'Purok 2, near covered court',
  location_text = 'Purok 2, near covered court',
  budget = 1200,
  budget_amount = 1200,
  workers_needed = 1,
  schedule_text = 'Today after 4:00 PM',
  status = 'open',
  accepted_provider_id = null,
  allow_messages = true,
  auto_reply_enabled = false,
  auto_close_enabled = false,
  updated_at = now(),
  closed_at = null
where id = '00000000-0000-4000-9000-000000001001';

update public.jobs
set
  title = 'Clean small apartment before visitors arrive',
  description = 'Need help cleaning living room, kitchen, and bathroom. Cleaning supplies are available.',
  category = 'Home & Local Help',
  service_needed = 'Cleaning',
  tags = array['Home & Local Help', 'Morning', 'Supplies ready'],
  photo_urls = array['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'],
  barangay = 'Barangay San Pedro',
  location = 'Sampaguita Street',
  location_text = 'Sampaguita Street',
  budget = 900,
  budget_amount = 900,
  workers_needed = 1,
  schedule_text = 'Tomorrow morning',
  status = 'reviewing',
  accepted_provider_id = null,
  allow_messages = true,
  auto_reply_enabled = false,
  auto_close_enabled = true,
  updated_at = now(),
  closed_at = null
where id = '00000000-0000-4000-9000-000000001002';

update public.jobs
set
  title = 'Set up printer and laptop',
  description = 'Need help connecting a printer to a laptop and checking basic document printing.',
  category = 'Tech & Document Support',
  service_needed = 'Printer setup',
  tags = array['Tech & Document Support', 'Weekend', 'Document help'],
  photo_urls = array['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'],
  barangay = 'Barangay San Pedro',
  location = 'Mabini Road',
  location_text = 'Mabini Road',
  budget = 1800,
  budget_amount = 1800,
  workers_needed = 1,
  schedule_text = 'This weekend',
  status = 'in_progress',
  accepted_provider_id = '00000000-0000-4000-8000-000000000003',
  allow_messages = true,
  auto_reply_enabled = false,
  auto_close_enabled = false,
  updated_at = now(),
  closed_at = null
where id = '00000000-0000-4000-9000-000000001003';

update public.jobs
set
  title = 'Repair loose cabinet hinges',
  description = 'Kitchen cabinet doors were repaired and aligned.',
  category = 'Home & Local Help',
  service_needed = 'Basic home repair',
  tags = array['Home & Local Help', 'Cabinet', 'Completed'],
  photo_urls = array['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'],
  barangay = 'Barangay San Pedro',
  location = 'Sampaguita Street',
  location_text = 'Sampaguita Street',
  budget = 700,
  budget_amount = 700,
  workers_needed = 1,
  schedule_text = 'Completed last week',
  status = 'completed',
  accepted_provider_id = '00000000-0000-4000-8000-000000000003',
  allow_messages = true,
  auto_reply_enabled = false,
  auto_close_enabled = true,
  updated_at = now(),
  closed_at = now() - interval '7 days'
where id = '00000000-0000-4000-9000-000000001004';

update public.jobs
set
  title = 'Front yard cleanup after rain',
  description = 'Need help clearing leaves, sweeping the path, and bagging garden waste outside the house.',
  category = 'Home & Local Help',
  service_needed = 'Yard or outdoor help',
  tags = array['Home & Local Help', 'Yard cleanup', 'Outdoor'],
  photo_urls = array['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80'],
  barangay = 'Barangay San Pedro',
  location = 'Narra Street',
  location_text = 'Narra Street',
  budget = 600,
  budget_amount = 600,
  workers_needed = 1,
  schedule_text = 'Friday morning',
  status = 'open',
  accepted_provider_id = null,
  allow_messages = true,
  auto_reply_enabled = true,
  auto_close_enabled = false,
  updated_at = now(),
  closed_at = null
where id = '00000000-0000-4000-9000-000000001005';

update public.jobs
set
  title = 'Move aparador and bed frame',
  description = 'Looking for two people to move one aparador and a bed frame from the first floor to the next house.',
  category = 'Home & Local Help',
  service_needed = 'Home assistance',
  tags = array['Home & Local Help', 'Furniture', 'Two workers'],
  photo_urls = array['https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=80'],
  barangay = 'Barangay San Pedro',
  location = 'Sampaguita Street',
  location_text = 'Sampaguita Street',
  budget = 1000,
  budget_amount = 1000,
  workers_needed = 2,
  schedule_text = 'This Saturday afternoon',
  status = 'open',
  accepted_provider_id = null,
  allow_messages = true,
  auto_reply_enabled = false,
  auto_close_enabled = false,
  updated_at = now(),
  closed_at = null
where id = '00000000-0000-4000-9000-000000001006';

notify pgrst, 'reload schema';
