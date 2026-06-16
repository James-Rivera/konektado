const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.VERIFICATION_EMAIL_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or Supabase service role key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const DEMO_USER_IDS = [
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006',
];
const ACTIVE_JOB_STATUSES = new Set(['open', 'reviewing', 'in_progress']);
const PRIVATE_OR_DOCUMENT_PHOTO_PATTERN =
  /(verification-files|verification_files|credential|certificate|id-front|id-back|passport|license|government|viewer-id|rejected-id)/i;
const CARTOON_AVATAR_PATTERN = /(dicebear|notionists|pixel|cartoon|robohash|bottts|avataaars|adventurer|lorelei|identicon)/i;

async function upsertRows(table, rows, onConflict) {
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict,
  });

  if (error) {
    throw new Error(`${table} upsert failed: ${error.message}`);
  }

  console.log(`Updated ${table}: ${rows.length} rows`);
}

async function main() {
  await upsertRows(
    'user_preferences',
    [
      {
        user_id: '00000000-0000-4000-8000-000000000002',
        intent: 'client',
        offered_services: [],
        needed_services: ['Minor home fix help', 'Cleaning', 'Document formatting'],
        custom_offered_services: [],
        custom_needed_services: ['Urgent errands'],
      },
      {
        user_id: '00000000-0000-4000-8000-000000000003',
        intent: 'provider',
        offered_services: ['Minor home fix help', 'Computer setup', 'Home assistance'],
        needed_services: [],
        custom_offered_services: ['Printer setup'],
        custom_needed_services: [],
      },
      {
        user_id: '00000000-0000-4000-8000-000000000004',
        intent: 'provider',
        offered_services: ['Cleaning', 'Laundry help'],
        needed_services: [],
        custom_offered_services: ['Home assistance'],
        custom_needed_services: [],
      },
      {
        user_id: '00000000-0000-4000-8000-000000000005',
        intent: 'client',
        offered_services: [],
        needed_services: ['Cleaning', 'Minor home fix help'],
        custom_offered_services: [],
        custom_needed_services: [],
      },
      {
        user_id: '00000000-0000-4000-8000-000000000006',
        intent: 'provider',
        offered_services: ['Canva layout'],
        needed_services: [],
        custom_offered_services: [],
        custom_needed_services: [],
      },
    ],
    'user_id',
  );

  await upsertRows(
    'provider_profiles',
    [
      {
        user_id: '00000000-0000-4000-8000-000000000003',
        service_type: 'Minor home fix help, computer setup, home assistance',
        has_certifications: true,
        certification_details: 'Barangay clearance and practical home maintenance references',
        certification_status: 'approved',
        availability: 'Weekdays after 2:00 PM and Saturday mornings',
        rate_text: null,
        rate_min: 500,
        rate_max: 1500,
        rate_type: 'per_project',
      },
      {
        user_id: '00000000-0000-4000-8000-000000000004',
        service_type: 'Cleaning, laundry, organizing',
        has_certifications: true,
        certification_details: 'Barangay clearance and local references',
        certification_status: 'approved',
        availability: 'Unavailable today, back this weekend',
        rate_text: null,
        rate_min: 300,
        rate_max: 600,
        rate_type: 'per_project',
      },
      {
        user_id: '00000000-0000-4000-8000-000000000006',
        service_type: 'Canva layout',
        has_certifications: false,
        certification_details: null,
        certification_status: 'rejected',
        availability: 'Afternoons',
        rate_text: null,
        rate_min: 300,
        rate_max: 800,
        rate_type: 'per_project',
      },
    ],
    'user_id',
  );

  await upsertRows(
    'services',
    [
      {
        id: '00000000-0000-4000-9000-000000002001',
        provider_id: '00000000-0000-4000-8000-000000000003',
        category: 'Minor home fix help',
        title: 'Minor home fix support',
        description: 'Helps with loose hinges, shelves, door handles, and other small non-licensed household maintenance tasks.',
        tags: ['Home & Local Help', 'Minor home fix help', 'Home maintenance'],
        photo_urls: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 6,
        availability_text: 'Weekdays after 2:00 PM and Saturday mornings',
        rate_text: null,
        rate_min: 500,
        rate_max: 1500,
        rate_type: 'per_project',
        experience_level: 'experienced',
        certification_available: true,
        certification_note: 'Barangay clearance and local references available for review.',
        barangay: 'Barangay San Pedro',
        location_text: 'Purok 4, Mabini Road',
        allow_messages: true,
        auto_reply_enabled: false,
        auto_pause_enabled: false,
        is_active: true,
      },
      {
        id: '00000000-0000-4000-9000-000000002002',
        provider_id: '00000000-0000-4000-8000-000000000003',
        category: 'Printer setup',
        title: 'Printer and computer setup help',
        description: 'Helps connect printers, set up laptops, and troubleshoot simple home tech issues.',
        tags: ['Tech & Document Support', 'Printer setup', 'Basic troubleshooting'],
        photo_urls: ['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 4,
        availability_text: 'Saturday mornings',
        rate_text: null,
        rate_min: 300,
        rate_max: 800,
        rate_type: 'per_project',
        experience_level: 'intermediate',
        certification_available: true,
        certification_note: 'Local troubleshooting references available.',
        barangay: 'Barangay San Pedro',
        location_text: 'Purok 4, Mabini Road',
        allow_messages: true,
        auto_reply_enabled: false,
        auto_pause_enabled: false,
        is_active: true,
      },
      {
        id: '00000000-0000-4000-9000-000000002003',
        provider_id: '00000000-0000-4000-8000-000000000004',
        category: 'Cleaning',
        title: 'Home cleaning and organizing',
        description: 'General cleaning, kitchen cleanup, laundry folding, and room organizing.',
        tags: ['Home & Local Help', 'Cleaning', 'Laundry help'],
        photo_urls: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 5,
        availability_text: 'Unavailable today, back this weekend',
        rate_text: null,
        rate_min: 300,
        rate_max: 600,
        rate_type: 'per_project',
        experience_level: 'experienced',
        certification_available: true,
        certification_note: 'Barangay clearance available for review.',
        barangay: 'Barangay San Pedro',
        location_text: 'Purok 1, Rizal Street',
        allow_messages: true,
        auto_reply_enabled: false,
        auto_pause_enabled: false,
        is_active: true,
      },
      {
        id: '00000000-0000-4000-9000-000000002004',
        provider_id: '00000000-0000-4000-8000-000000000004',
        category: 'Laundry help',
        title: 'Laundry washing and ironing',
        description: 'Can help with weekly laundry, folding, ironing, and closet organizing for busy households.',
        tags: ['Home & Local Help', 'Laundry help', 'Ironing'],
        photo_urls: ['https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 4,
        availability_text: 'Saturday and Sunday mornings',
        rate_text: null,
        rate_min: 250,
        rate_max: 500,
        rate_type: 'per_project',
        experience_level: 'intermediate',
        certification_available: false,
        certification_note: null,
        barangay: 'Barangay San Pedro',
        location_text: 'Purok 1, Rizal Street',
        allow_messages: true,
        auto_reply_enabled: false,
        auto_pause_enabled: false,
        is_active: true,
      },
      {
        id: '00000000-0000-4000-9000-000000002005',
        provider_id: '00000000-0000-4000-8000-000000000003',
        category: 'Computer setup',
        title: 'Basic computer setup',
        description: 'Helps with laptop setup, software setup, printer pairing, and beginner troubleshooting.',
        tags: ['Tech & Document Support', 'Computer setup', 'Beginner help'],
        photo_urls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 5,
        availability_text: 'Weekdays after 3:00 PM',
        rate_text: null,
        rate_min: 400,
        rate_max: 1000,
        rate_type: 'per_project',
        experience_level: 'intermediate',
        certification_available: false,
        certification_note: null,
        barangay: 'Barangay San Pedro',
        location_text: 'Purok 4, Mabini Road',
        allow_messages: true,
        auto_reply_enabled: true,
        auto_pause_enabled: false,
        is_active: true,
      },
      {
        id: '00000000-0000-4000-9000-000000002006',
        provider_id: '00000000-0000-4000-8000-000000000003',
        category: 'Canva layout',
        title: 'Canva posters and social posts',
        description: 'Creates simple posters, social posts, and school layouts using Canva templates.',
        tags: ['Digital & Document Help', 'Canva layout', 'Online'],
        photo_urls: ['https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 2,
        availability_text: 'Afternoons and evenings',
        rate_text: null,
        rate_min: 300,
        rate_max: 800,
        rate_type: 'per_project',
        experience_level: 'beginner',
        certification_available: false,
        certification_note: null,
        barangay: 'Barangay San Pedro',
        location_text: 'Online from Brgy. San Pedro',
        allow_messages: true,
        auto_reply_enabled: false,
        auto_pause_enabled: false,
        is_active: true,
      },
      {
        id: '00000000-0000-4000-9000-000000002007',
        provider_id: '00000000-0000-4000-8000-000000000004',
        category: 'Presentation design',
        title: 'Clean slide deck formatting',
        description: 'Formats presentations for school, small business, and barangay reports.',
        tags: ['Digital & Document Help', 'Presentation design', 'Online'],
        photo_urls: ['https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 3,
        availability_text: 'Weeknights',
        rate_text: null,
        rate_min: 400,
        rate_max: 1000,
        rate_type: 'per_project',
        experience_level: 'intermediate',
        certification_available: false,
        certification_note: null,
        barangay: 'Barangay San Pedro',
        location_text: 'Online from Brgy. San Pedro',
        allow_messages: true,
        auto_reply_enabled: true,
        auto_pause_enabled: false,
        is_active: true,
      },
      {
        id: '00000000-0000-4000-9000-000000002008',
        provider_id: '00000000-0000-4000-8000-000000000003',
        category: 'Phone setup',
        title: 'Phone app and account setup',
        description: 'Helps set up new phones, install apps, adjust settings, and guide first-time users.',
        tags: ['Tech Setup Help', 'Phone setup', 'Beginner help'],
        photo_urls: ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 4,
        availability_text: 'Weekends',
        rate_text: null,
        rate_min: 250,
        rate_max: 600,
        rate_type: 'per_project',
        experience_level: 'intermediate',
        certification_available: false,
        certification_note: null,
        barangay: 'Barangay San Pedro',
        location_text: 'Mabini Road',
        allow_messages: true,
        auto_reply_enabled: false,
        auto_pause_enabled: false,
        is_active: true,
      },
      {
        id: '00000000-0000-4000-9000-000000002009',
        provider_id: '00000000-0000-4000-8000-000000000004',
        category: 'Errands',
        title: 'Nearby errands and pickup help',
        description: 'Can help with nearby pickup, light errands, and simple coordination tasks.',
        tags: ['Errands & Assistance', 'Errands', 'Nearby only'],
        photo_urls: ['https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 3,
        availability_text: 'Morning and early afternoon',
        rate_text: null,
        rate_min: 150,
        rate_max: 350,
        rate_type: 'per_project',
        experience_level: 'beginner',
        certification_available: true,
        certification_note: 'Barangay clearance available for review.',
        barangay: 'Barangay San Pedro',
        location_text: 'Rizal Street',
        allow_messages: true,
        auto_reply_enabled: false,
        auto_pause_enabled: false,
        is_active: true,
      },
      {
        id: '00000000-0000-4000-9000-000000002010',
        provider_id: '00000000-0000-4000-8000-000000000003',
        category: 'Document formatting',
        title: 'Document formatting to coordinate',
        description: 'Helps clean up resumes, forms, and school documents. Rate depends on the file.',
        tags: ['Digital & Document Help', 'Document formatting', 'Online'],
        photo_urls: ['https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 2,
        availability_text: 'Afternoons',
        rate_text: null,
        rate_min: null,
        rate_max: null,
        rate_type: 'negotiable',
        experience_level: 'beginner',
        certification_available: false,
        certification_note: null,
        barangay: 'Barangay San Pedro',
        location_text: 'Online from Brgy. San Pedro',
        allow_messages: true,
        auto_reply_enabled: false,
        auto_pause_enabled: false,
        is_active: true,
      },
    ],
    'id',
  );

  await upsertRows(
    'jobs',
    [
      {
        id: '00000000-0000-4000-9000-000000001001',
        owner_id: '00000000-0000-4000-8000-000000000002',
        client_id: '00000000-0000-4000-8000-000000000002',
        title: 'Fix loose shelf bracket',
        description: 'Kitchen shelf bracket is loose. Need someone nearby who can inspect and make a small adjustment.',
        category: 'Home & Local Help',
        service_needed: 'Minor home fix help',
        tags: ['Home & Local Help', 'Kitchen', 'Urgent'],
        photo_urls: ['https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Purok 2, near covered court',
        location_text: 'Purok 2, near covered court',
        budget: 500,
        budget_amount: 500,
        budget_min: 500,
        budget_max: 1500,
        rate_type: 'per_project',
        experience_level: 'intermediate',
        certification_required: false,
        certification_note: null,
        workers_needed: 1,
        schedule_text: 'Today after 4:00 PM',
        status: 'open',
        accepted_provider_id: null,
        allow_messages: true,
        auto_reply_enabled: false,
        auto_close_enabled: false,
        closed_at: null,
      },
      {
        id: '00000000-0000-4000-9000-000000001002',
        owner_id: '00000000-0000-4000-8000-000000000002',
        client_id: '00000000-0000-4000-8000-000000000002',
        title: 'Clean small apartment before visitors arrive',
        description: 'Need help cleaning living room, kitchen, and bathroom. Cleaning supplies are available.',
        category: 'Home & Local Help',
        service_needed: 'Cleaning',
        tags: ['Home & Local Help', 'Morning', 'Supplies ready'],
        photo_urls: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Sampaguita Street',
        location_text: 'Sampaguita Street',
        budget: 300,
        budget_amount: 300,
        budget_min: 300,
        budget_max: 600,
        rate_type: 'per_project',
        experience_level: 'any',
        certification_required: false,
        certification_note: null,
        workers_needed: 1,
        schedule_text: 'Tomorrow morning',
        status: 'reviewing',
        accepted_provider_id: null,
        allow_messages: true,
        auto_reply_enabled: false,
        auto_close_enabled: true,
        closed_at: null,
      },
      {
        id: '00000000-0000-4000-9000-000000001003',
        owner_id: '00000000-0000-4000-8000-000000000002',
        client_id: '00000000-0000-4000-8000-000000000002',
        title: 'Set up printer and laptop',
        description: 'Need help connecting a printer to a laptop and checking basic document printing.',
        category: 'Tech & Document Support',
        service_needed: 'Printer setup',
        tags: ['Tech & Document Support', 'Weekend', 'Document help'],
        photo_urls: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Mabini Road',
        location_text: 'Mabini Road',
        budget: 500,
        budget_amount: 500,
        budget_min: 500,
        budget_max: 1000,
        rate_type: 'per_project',
        experience_level: 'intermediate',
        certification_required: true,
        certification_note: 'Experience with printer setup preferred.',
        workers_needed: 1,
        schedule_text: 'This weekend',
        status: 'in_progress',
        accepted_provider_id: '00000000-0000-4000-8000-000000000003',
        allow_messages: true,
        auto_reply_enabled: false,
        auto_close_enabled: false,
        closed_at: null,
      },
      {
        id: '00000000-0000-4000-9000-000000001004',
        owner_id: '00000000-0000-4000-8000-000000000002',
        client_id: '00000000-0000-4000-8000-000000000002',
        title: 'Adjust loose cabinet hinges',
        description: 'Kitchen cabinet doors were adjusted and aligned.',
        category: 'Home & Local Help',
        service_needed: 'Minor home fix help',
        tags: ['Home & Local Help', 'Cabinet', 'Completed'],
        photo_urls: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Sampaguita Street',
        location_text: 'Sampaguita Street',
        budget: 500,
        budget_amount: 500,
        budget_min: 500,
        budget_max: 900,
        rate_type: 'per_project',
        experience_level: 'intermediate',
        certification_required: false,
        certification_note: null,
        workers_needed: 1,
        schedule_text: 'Completed last week',
        status: 'completed',
        accepted_provider_id: '00000000-0000-4000-8000-000000000003',
        allow_messages: true,
        auto_reply_enabled: false,
        auto_close_enabled: true,
        closed_at: '2026-05-01T00:00:00.000Z',
      },
      {
        id: '00000000-0000-4000-9000-000000001005',
        owner_id: '00000000-0000-4000-8000-000000000002',
        client_id: '00000000-0000-4000-8000-000000000002',
        title: 'Front yard cleanup after rain',
        description: 'Need help clearing leaves, sweeping the path, and bagging garden waste outside the house.',
        category: 'Home & Local Help',
        service_needed: 'Yard or outdoor help',
        tags: ['Home & Local Help', 'Yard cleanup', 'Outdoor'],
        photo_urls: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Narra Street',
        location_text: 'Narra Street',
        budget: 400,
        budget_amount: 400,
        budget_min: 400,
        budget_max: 900,
        rate_type: 'per_project',
        experience_level: 'beginner',
        certification_required: false,
        certification_note: null,
        workers_needed: 1,
        schedule_text: 'Friday morning',
        status: 'open',
        accepted_provider_id: null,
        allow_messages: true,
        auto_reply_enabled: true,
        auto_close_enabled: false,
        closed_at: null,
      },
      {
        id: '00000000-0000-4000-9000-000000001006',
        owner_id: '00000000-0000-4000-8000-000000000002',
        client_id: '00000000-0000-4000-8000-000000000002',
        title: 'Move aparador and bed frame',
        description: 'Looking for two people to move one aparador and a bed frame from the first floor to the next house.',
        category: 'Home & Local Help',
        service_needed: 'Home assistance',
        tags: ['Home & Local Help', 'Furniture', 'Two workers'],
        photo_urls: ['https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Sampaguita Street',
        location_text: 'Sampaguita Street',
        budget: 500,
        budget_amount: 500,
        budget_min: 500,
        budget_max: 1000,
        rate_type: 'per_project',
        experience_level: 'beginner',
        certification_required: false,
        certification_note: null,
        workers_needed: 2,
        schedule_text: 'This Saturday afternoon',
        status: 'open',
        accepted_provider_id: null,
        allow_messages: true,
        auto_reply_enabled: false,
        auto_close_enabled: false,
        closed_at: null,
      },
      {
        id: '00000000-0000-4000-9000-000000001007',
        owner_id: '00000000-0000-4000-8000-000000000002',
        client_id: '00000000-0000-4000-8000-000000000002',
        title: 'Make a birthday poster in Canva',
        description: 'Need a simple birthday poster layout that can be printed and shared online.',
        category: 'Digital & Document Help',
        service_needed: 'Canva layout',
        tags: ['Digital & Document Help', 'Posters', 'Online'],
        photo_urls: ['https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Online from Brgy. San Pedro',
        location_text: 'Online from Brgy. San Pedro',
        budget: 300,
        budget_amount: 300,
        budget_min: 300,
        budget_max: 800,
        rate_type: 'per_project',
        experience_level: 'beginner',
        certification_required: false,
        certification_note: null,
        workers_needed: 1,
        schedule_text: 'Needed by Friday',
        status: 'open',
        accepted_provider_id: null,
        allow_messages: true,
        auto_reply_enabled: false,
        auto_close_enabled: false,
        closed_at: null,
      },
      {
        id: '00000000-0000-4000-9000-000000001008',
        owner_id: '00000000-0000-4000-8000-000000000002',
        client_id: '00000000-0000-4000-8000-000000000002',
        title: 'Grade school math tutoring',
        description: 'Looking for patient help with fractions and word problems for one afternoon.',
        category: 'Learning & Tutoring',
        service_needed: 'Tutoring',
        tags: ['Learning & Tutoring', 'Grade school', 'In person'],
        photo_urls: ['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Near San Pedro chapel',
        location_text: 'Near San Pedro chapel',
        budget: 150,
        budget_amount: 150,
        budget_min: 150,
        budget_max: 300,
        rate_type: 'hourly',
        experience_level: 'intermediate',
        certification_required: false,
        certification_note: null,
        workers_needed: 1,
        schedule_text: 'Saturday afternoon',
        status: 'open',
        accepted_provider_id: null,
        allow_messages: true,
        auto_reply_enabled: false,
        auto_close_enabled: false,
        closed_at: null,
      },
      {
        id: '00000000-0000-4000-9000-000000001009',
        owner_id: '00000000-0000-4000-8000-000000000002',
        client_id: '00000000-0000-4000-8000-000000000002',
        title: 'Help with nearby medicine pickup',
        description: 'Need someone available nearby to help pick up prepaid medicine and deliver it within the barangay.',
        category: 'Errands & Assistance',
        service_needed: 'Errands',
        tags: ['Errands & Assistance', 'Nearby only', 'Same day'],
        photo_urls: [],
        barangay: 'Barangay San Pedro',
        location: 'Brgy. San Pedro',
        location_text: 'Brgy. San Pedro',
        budget: null,
        budget_amount: null,
        budget_min: null,
        budget_max: null,
        rate_type: 'negotiable',
        experience_level: 'any',
        certification_required: false,
        certification_note: null,
        workers_needed: 1,
        schedule_text: 'Today',
        status: 'open',
        accepted_provider_id: null,
        allow_messages: true,
        auto_reply_enabled: true,
        auto_close_enabled: false,
        closed_at: null,
      },
      {
        id: '00000000-0000-4000-9000-000000001010',
        owner_id: '00000000-0000-4000-8000-000000000002',
        client_id: '00000000-0000-4000-8000-000000000002',
        title: 'Monthly social media post set',
        description: 'Need help preparing a small set of social media captions and basic layouts for a sari-sari store.',
        category: 'Digital & Document Help',
        service_needed: 'Social media help',
        tags: ['Digital & Document Help', 'Small business', 'Online'],
        photo_urls: ['https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Online from Brgy. San Pedro',
        location_text: 'Online from Brgy. San Pedro',
        budget: 2000,
        budget_amount: 2000,
        budget_min: 2000,
        budget_max: 3500,
        rate_type: 'per_project',
        experience_level: 'experienced',
        certification_required: false,
        certification_note: null,
        workers_needed: 1,
        schedule_text: 'Next week',
        status: 'open',
        accepted_provider_id: null,
        allow_messages: true,
        auto_reply_enabled: false,
        auto_close_enabled: false,
        closed_at: null,
      },
    ],
    'id',
  );

  await assertDemoSeedConsistency();

  const { data: refreshedServices, error: serviceCheckError } = await supabase
    .from('services')
    .select('id, category, title, tags')
    .order('created_at', { ascending: true });

  if (serviceCheckError) {
    throw new Error(`verification query failed: ${serviceCheckError.message}`);
  }

  console.log('Hosted demo taxonomy now includes:');
  for (const row of refreshedServices ?? []) {
    console.log(`- ${row.title} [${row.category}]`);
  }
}

async function assertDemoSeedConsistency() {
  const [profilesResult, verificationsResult, jobsResult, servicesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, avatar_url, verified_at, barangay_verified_at')
      .in('id', DEMO_USER_IDS),
    supabase
      .from('verifications')
      .select('id, user_id, status, created_at')
      .in('user_id', DEMO_USER_IDS),
    supabase
      .from('jobs')
      .select('id, owner_id, client_id, status, photo_urls')
      .or(`owner_id.in.(${DEMO_USER_IDS.join(',')}),client_id.in.(${DEMO_USER_IDS.join(',')})`),
    supabase
      .from('services')
      .select('id, provider_id, is_active, photo_urls')
      .in('provider_id', DEMO_USER_IDS),
  ]);

  const error =
    profilesResult.error ??
    verificationsResult.error ??
    jobsResult.error ??
    servicesResult.error;
  if (error) {
    throw new Error(`seed validation query failed: ${error.message}`);
  }

  const profiles = profilesResult.data ?? [];
  const statuses = getCanonicalDemoStatuses(profiles, verificationsResult.data ?? []);
  const invalidJobs = (jobsResult.data ?? []).filter((job) => {
    const ownerId = job.client_id ?? job.owner_id;
    return ACTIVE_JOB_STATUSES.has(job.status) && statuses.get(ownerId) !== 'verified';
  });
  const invalidServices = (servicesResult.data ?? []).filter(
    (service) => service.is_active && statuses.get(service.provider_id) !== 'verified',
  );
  const invalidProfilePhotos = profiles.filter((profile) => {
    const avatarUrl = String(profile.avatar_url ?? '');
    return !avatarUrl || PRIVATE_OR_DOCUMENT_PHOTO_PATTERN.test(avatarUrl) || CARTOON_AVATAR_PATTERN.test(avatarUrl);
  });
  const invalidJobPhotos = (jobsResult.data ?? []).filter((job) => {
    const ownerId = job.client_id ?? job.owner_id;
    return (job.photo_urls ?? []).some((url) =>
      PRIVATE_OR_DOCUMENT_PHOTO_PATTERN.test(String(url)) || statuses.get(ownerId) !== 'verified',
    );
  });
  const invalidServicePhotos = (servicesResult.data ?? []).filter((service) =>
    (service.photo_urls ?? []).some((url) =>
      PRIVATE_OR_DOCUMENT_PHOTO_PATTERN.test(String(url)) || statuses.get(service.provider_id) !== 'verified',
    ),
  );

  if (
    invalidJobs.length ||
    invalidServices.length ||
    invalidProfilePhotos.length ||
    invalidJobPhotos.length ||
    invalidServicePhotos.length
  ) {
    throw new Error(
      [
        'Hosted demo seed validation failed.',
        `invalid active jobs: ${invalidJobs.map((job) => job.id).join(', ') || 'none'}`,
        `invalid active services: ${invalidServices.map((service) => service.id).join(', ') || 'none'}`,
        `invalid profile photos: ${invalidProfilePhotos.map((profile) => profile.id).join(', ') || 'none'}`,
        `invalid job photos: ${invalidJobPhotos.map((job) => job.id).join(', ') || 'none'}`,
        `invalid service photos: ${invalidServicePhotos.map((service) => service.id).join(', ') || 'none'}`,
      ].join('\n'),
    );
  }
}

function getCanonicalDemoStatuses(profiles, verifications) {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const statuses = new Map();

  for (const userId of DEMO_USER_IDS) {
    const profile = profileById.get(userId);
    const userVerifications = verifications
      .filter((verification) => verification.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const request =
      userVerifications.find((verification) => verification.status === 'pending') ??
      userVerifications[0] ??
      null;

    if (request?.status === 'pending') {
      statuses.set(userId, 'pending');
    } else if (request?.status === 'approved') {
      statuses.set(userId, 'verified');
    } else if (request?.status === 'rejected') {
      statuses.set(userId, 'rejected');
    } else if (profile?.barangay_verified_at || profile?.verified_at) {
      statuses.set(userId, 'verified');
    } else {
      statuses.set(userId, 'unverified');
    }
  }

  return statuses;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = line.split('=');
    const keyName = key.trim();
    if (!keyName || process.env[keyName]) {
      continue;
    }

    process.env[keyName] = valueParts.join('=').trim();
  }
}
