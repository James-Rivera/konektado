export const MVP_SERVICE_CATEGORIES = [
  'Home & Local Help',
  'Learning & Digital Help',
  'Tech & Document Support',
] as const;

export type MvpServiceCategory = (typeof MVP_SERVICE_CATEGORIES)[number];

export const MVP_SERVICES_BY_CATEGORY: Record<MvpServiceCategory, string[]> = {
  'Home & Local Help': [
    'Cleaning',
    'Laundry help',
    'Errands',
    'Delivery help',
    'Home assistance',
    'Basic home repair',
    'Yard or outdoor help',
  ],
  'Learning & Digital Help': [
    'Tutoring',
    'Encoding',
    'Canva layout',
    'Presentation design',
    'Social media help',
    'Basic computer lessons',
    'School project guidance',
  ],
  'Tech & Document Support': [
    'Computer setup',
    'Phone setup',
    'WiFi/router help',
    'Printer setup',
    'Basic troubleshooting',
    'Document formatting',
    'Resume or form assistance',
  ],
};

export const MVP_SERVICE_OPTIONS = MVP_SERVICE_CATEGORIES.flatMap(
  (category) => MVP_SERVICES_BY_CATEGORY[category],
);

export type MvpServiceOption = (typeof MVP_SERVICE_OPTIONS)[number];

export const POPULAR_MVP_SERVICES = [
  'Cleaning',
  'Laundry help',
  'Tutoring',
  'Canva layout',
  'Computer setup',
  'Phone setup',
  'Document formatting',
  'Delivery help',
] as const satisfies readonly MvpServiceOption[];

export const MVP_CATEGORY_CONTEXT_TAGS: Record<MvpServiceCategory, string[]> = {
  'Home & Local Help': [
    'Nearby',
    'Same day',
    'Short task',
    'Home visit',
    'Supplies ready',
    'Weekly',
    'Outdoor',
  ],
  'Learning & Digital Help': [
    'Online',
    'In person',
    'Student-friendly',
    'Homework guidance',
    'Weekend',
    'Short task',
    'Beginner help',
  ],
  'Tech & Document Support': [
    'Setup help',
    'Troubleshooting',
    'Senior help',
    'Online',
    'Home visit',
    'Document help',
    'Short task',
  ],
};

export const MVP_SERVICE_TAGS: Record<MvpServiceOption, string[]> = {
  Cleaning: ['Regular cleaning', 'Deep clean', 'Indoor', 'Same day', 'Supplies ready', 'Weekly'],
  'Laundry help': ['Wash and fold', 'Ironing', 'Pickup available', 'Rush', 'Blankets', 'Weekly'],
  Errands: ['Nearby only', 'Same day', 'Short task', 'Pickup help', 'Senior help'],
  'Delivery help': ['Small delivery', 'Nearby only', 'Pickup available', 'Same day', 'Light items'],
  'Home assistance': ['General help', 'Home visit', 'Senior help', 'Weekly', 'Short task'],
  'Basic home repair': ['Small fix', 'Home maintenance', 'Tools ready', 'Indoor', 'Outdoor'],
  'Yard or outdoor help': ['Yard cleanup', 'Outdoor', 'Plant care', 'Sweeping', 'Weekly'],
  Tutoring: ['Grade school', 'High school', 'Online', 'In person', 'Exam review', 'Weekend'],
  Encoding: ['Typing', 'Data entry', 'Document help', 'Online', 'Short task'],
  'Canva layout': ['Posters', 'Social posts', 'Presentations', 'School project', 'Online'],
  'Presentation design': ['Slides', 'School project', 'Business deck', 'Online', 'Rush'],
  'Social media help': ['Captions', 'Posting help', 'Basic layout', 'Online', 'Small business'],
  'Basic computer lessons': ['Beginner help', 'Senior help', 'Online', 'In person', 'Weekend'],
  'School project guidance': ['Planning help', 'Research guidance', 'Formatting', 'Online', 'Weekend'],
  'Computer setup': ['Laptop setup', 'Software setup', 'Home visit', 'Senior help', 'Beginner help'],
  'Phone setup': ['App setup', 'Account setup', 'Senior help', 'Home visit', 'Beginner help'],
  'WiFi/router help': ['Router setup', 'Signal check', 'Home visit', 'Troubleshooting'],
  'Printer setup': ['Printer pairing', 'Basic setup', 'Home visit', 'Troubleshooting'],
  'Basic troubleshooting': ['Device check', 'Setup help', 'Home visit', 'Short task'],
  'Document formatting': ['Forms', 'Resume', 'School document', 'Online', 'Printing-ready'],
  'Resume or form assistance': ['Resume', 'Forms', 'Encoding', 'Online', 'Document help'],
};

export function isMvpServiceCategory(value: string | null | undefined): value is MvpServiceCategory {
  return MVP_SERVICE_CATEGORIES.includes(value as MvpServiceCategory);
}

export function isMvpServiceOption(value: string | null | undefined): value is MvpServiceOption {
  return MVP_SERVICE_OPTIONS.includes(value as MvpServiceOption);
}

export function getServicesForMvpCategory(category: string | null | undefined) {
  return isMvpServiceCategory(category) ? MVP_SERVICES_BY_CATEGORY[category] : [];
}

export function getTagsForMvpCategory(category: string | null | undefined) {
  return isMvpServiceCategory(category) ? MVP_CATEGORY_CONTEXT_TAGS[category] : [];
}

export function getTagsForMvpService(service: string | null | undefined) {
  return isMvpServiceOption(service) ? MVP_SERVICE_TAGS[service] : [];
}

export function getCategoryForMvpService(service: string | null | undefined): MvpServiceCategory | null {
  if (!isMvpServiceOption(service)) return null;

  return (
    MVP_SERVICE_CATEGORIES.find((category) => MVP_SERVICES_BY_CATEGORY[category].includes(service)) ??
    null
  );
}

