export const SERVICE_POST_OPTIONS = [
  'Cleaning',
  'Laundry',
  'Carpentry',
  'Repair',
  'Electrical',
  'Cooking',
  'Plumbing',
  'Appliance Repair',
  'PC Repair',
  'Phone Setup',
  'Tutoring',
  'Gardening',
  'Painting',
  'Delivery',
  'House Helper',
  'Construction',
] as const;

export type ServicePostOption = (typeof SERVICE_POST_OPTIONS)[number];

export const POPULAR_SERVICE_POST_OPTIONS: ServicePostOption[] = [
  'Cleaning',
  'Laundry',
  'Carpentry',
  'Repair',
  'Electrical',
  'Cooking',
];

export const SERVICE_TAGS_BY_CATEGORY: Record<ServicePostOption, string[]> = {
  Cleaning: ['Deep clean', 'Regular cleaning', 'Indoor', 'Outdoor', 'Same day', 'Supplies ready', 'Weekly'],
  Laundry: ['Wash and fold', 'Ironing', 'Pickup available', 'Rush', 'Blankets', 'Delicate items', 'Weekly'],
  Carpentry: ['Small repair', 'Furniture', 'Installation', 'Tools ready', 'Indoor', 'Outdoor', 'Custom work'],
  Repair: ['Home repair', 'Small fix', 'Tools ready', 'Same day', 'Indoor', 'Outdoor', 'Maintenance'],
  Electrical: ['Small wiring', 'Light fixtures', 'Appliance check', 'Tools ready', 'Home visit', 'Same day'],
  Cooking: ['Home meal', 'Party cooking', 'Packed meals', 'Market help', 'Weekend', 'Same day'],
  Plumbing: ['Leak repair', 'Drain cleaning', 'Fixture install', 'Same day', 'Tools ready', 'Home visit'],
  'Appliance Repair': ['Appliance check', 'Small parts', 'Home visit', 'Same day', 'Tools ready'],
  'PC Repair': ['Computer setup', 'Troubleshooting', 'Virus cleanup', 'Home visit', 'Senior help'],
  'Phone Setup': ['Phone help', 'App setup', 'Online account help', 'Senior help', 'Home visit'],
  Tutoring: ['Grade school', 'High school', 'Reading', 'Math', 'Weekend', 'In person'],
  Gardening: ['Yard cleanup', 'Plant care', 'Outdoor', 'Weekly', 'Tools ready'],
  Painting: ['Small repaint', 'Indoor', 'Outdoor', 'Tools ready', 'Wall repair'],
  Delivery: ['Small delivery', 'Errands', 'Same day', 'Nearby only', 'Pickup available'],
  'House Helper': ['General help', 'Cleaning', 'Errands', 'Weekly', 'Home visit'],
  Construction: ['Helper', 'Heavy work', 'Outdoor', 'Tools ready', 'Short task'],
};

export function isServicePostOption(value: string | null | undefined): value is ServicePostOption {
  return SERVICE_POST_OPTIONS.includes(value as ServicePostOption);
}

export function getServiceTagsForCategory(category: string | null | undefined) {
  return isServicePostOption(category) ? SERVICE_TAGS_BY_CATEGORY[category] : [];
}
