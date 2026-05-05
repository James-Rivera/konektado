export const JOB_CATEGORIES = [
  'Cleaning',
  'Hauling',
  'Repair',
  'Laundry',
  'Tutoring',
  'Food & Cooking',
  'Digital Help',
  'Beauty & Wellness',
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const POPULAR_JOB_CATEGORIES: JobCategory[] = ['Cleaning', 'Repair', 'Laundry', 'Hauling'];

export const JOB_SERVICES_BY_CATEGORY: Record<JobCategory, string[]> = {
  Cleaning: [
    'House cleaning',
    'Deep cleaning',
    'Bathroom cleaning',
    'Kitchen cleaning',
    'Post-renovation cleanup',
    'Yard sweeping',
    'Window cleaning',
  ],
  Hauling: [
    'Moving furniture',
    'Carrying boxes',
    'Small delivery',
    'Event setup',
    'Junk removal',
    'Loading / unloading',
    'Appliance moving',
  ],
  Repair: [
    'Plumbing repair',
    'Electrical repair',
    'Furniture repair',
    'Door or lock repair',
    'Appliance repair',
    'Roof patching',
    'General handyman help',
  ],
  Laundry: [
    'Wash and fold',
    'Ironing clothes',
    'Blanket washing',
    'Curtain washing',
    'Pickup laundry',
    'Rush laundry',
  ],
  Tutoring: [
    'Math tutoring',
    'Reading support',
    'English tutoring',
    'Homework help',
    'Exam review',
    'Computer lessons',
  ],
  'Food & Cooking': [
    'Meal preparation',
    'Party cooking',
    'Packed meals',
    'Baking help',
    'Market errands',
    'Kitchen assistant',
  ],
  'Digital Help': [
    'Phone setup',
    'Computer setup',
    'Online form help',
    'Document typing',
    'Printing assistance',
    'Social media help',
  ],
  'Beauty & Wellness': [
    'Haircut',
    'Hair styling',
    'Makeup service',
    'Manicure / pedicure',
    'Massage',
    'Home wellness visit',
  ],
};

export const JOB_CONTEXT_TAGS_BY_CATEGORY: Record<JobCategory, string[]> = {
  Cleaning: ['Deep clean', 'Indoor', 'Outdoor', 'Same day', 'Supplies needed', 'Short task', 'Weekly'],
  Hauling: ['Moving', 'Lifting', 'Heavy items', 'Event setup', 'Urgent', 'Short task', 'Outdoor'],
  Repair: ['Urgent', 'Tools needed', 'Indoor', 'Outdoor', 'Small fix', 'Leak issue', 'Same day'],
  Laundry: ['Pickup needed', 'Rush', 'Ironing', 'Blankets', 'Delicate items', 'Weekly', 'Fold only'],
  Tutoring: ['Grade school', 'High school', 'Online', 'In person', 'Exam prep', 'Homework', 'Weekend'],
  'Food & Cooking': ['Party', 'Home meal', 'Same day', 'Market needed', 'Packed food', 'Kitchen help', 'Weekend'],
  'Digital Help': ['Phone help', 'Computer help', 'Online form', 'Printing', 'At home', 'Short task', 'Senior help'],
  'Beauty & Wellness': ['Home service', 'Event prep', 'Same day', 'Hair', 'Makeup', 'Nails', 'Weekend'],
};

export function isJobCategory(value: string | null | undefined): value is JobCategory {
  return JOB_CATEGORIES.includes(value as JobCategory);
}

export function getServicesForCategory(category: string | null | undefined) {
  return isJobCategory(category) ? JOB_SERVICES_BY_CATEGORY[category] : [];
}

export function getContextTagsForCategory(category: string | null | undefined) {
  return isJobCategory(category) ? JOB_CONTEXT_TAGS_BY_CATEGORY[category] : [];
}
