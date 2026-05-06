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
        needed_services: ['Basic home repair', 'Cleaning', 'Document formatting'],
        custom_offered_services: [],
        custom_needed_services: ['Urgent errands'],
      },
      {
        user_id: '00000000-0000-4000-8000-000000000003',
        intent: 'provider',
        offered_services: ['Basic home repair', 'Computer setup', 'Home assistance'],
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
        needed_services: ['Cleaning', 'Basic home repair'],
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
        service_type: 'Basic home repair, computer setup, home assistance',
        has_certifications: true,
        certification_details: 'Barangay clearance and practical home maintenance references',
        certification_status: 'approved',
        availability: 'Weekdays after 2:00 PM and Saturday mornings',
        rate_text: 'Starts at PHP 600',
      },
      {
        user_id: '00000000-0000-4000-8000-000000000004',
        service_type: 'Cleaning, laundry, organizing',
        has_certifications: true,
        certification_details: 'Barangay clearance and local references',
        certification_status: 'approved',
        availability: 'Unavailable today, back this weekend',
        rate_text: 'Starts at PHP 450',
      },
      {
        user_id: '00000000-0000-4000-8000-000000000006',
        service_type: 'Canva layout',
        has_certifications: false,
        certification_details: null,
        certification_status: 'rejected',
        availability: 'Afternoons',
        rate_text: 'Starts at PHP 500',
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
        category: 'Basic home repair',
        title: 'Basic home repair help',
        description: 'Helps with loose hinges, shelves, door handles, and small household maintenance tasks.',
        tags: ['Home & Local Help', 'Basic home repair', 'Home maintenance'],
        photo_urls: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'],
        years_experience: 6,
        availability_text: 'Weekdays after 2:00 PM and Saturday mornings',
        rate_text: 'Starts at PHP 600',
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
        rate_text: 'PHP 500-800 per setup visit',
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
        rate_text: 'Starts at PHP 450',
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
        rate_text: 'PHP 350-700 per batch',
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
        rate_text: 'PHP 500 per setup visit',
        barangay: 'Barangay San Pedro',
        location_text: 'Purok 4, Mabini Road',
        allow_messages: true,
        auto_reply_enabled: true,
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
        description: 'Kitchen shelf bracket is loose. Need someone nearby who can inspect and do a basic repair.',
        category: 'Home & Local Help',
        service_needed: 'Basic home repair',
        tags: ['Home & Local Help', 'Kitchen', 'Urgent'],
        photo_urls: ['https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Purok 2, near covered court',
        location_text: 'Purok 2, near covered court',
        budget: 1200,
        budget_amount: 1200,
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
        budget: 900,
        budget_amount: 900,
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
        budget: 1800,
        budget_amount: 1800,
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
        title: 'Repair loose cabinet hinges',
        description: 'Kitchen cabinet doors were repaired and aligned.',
        category: 'Home & Local Help',
        service_needed: 'Basic home repair',
        tags: ['Home & Local Help', 'Cabinet', 'Completed'],
        photo_urls: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'],
        barangay: 'Barangay San Pedro',
        location: 'Sampaguita Street',
        location_text: 'Sampaguita Street',
        budget: 700,
        budget_amount: 700,
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
        budget: 600,
        budget_amount: 600,
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
        budget: 1000,
        budget_amount: 1000,
        workers_needed: 2,
        schedule_text: 'This Saturday afternoon',
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
