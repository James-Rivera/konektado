import type { UserPreferences } from '@/types/onboarding.types';

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

export const OTHER_SERVICE_OPTION = 'Others / Specify' as const;

export type ServiceSelectionValue = MvpServiceOption | typeof OTHER_SERVICE_OPTION;

export type SearchWorkType = 'physical' | 'digital' | 'either';

export const SEARCH_DISCOVERY_GROUPS = [
  'Home & Local Help',
  'Errands & Assistance',
  'Learning & Tutoring',
  'Digital & Document Help',
  'Tech Setup Help',
] as const;

export type DiscoveryGroupKey = (typeof SEARCH_DISCOVERY_GROUPS)[number];

export const SEARCH_DISCOVERY_SERVICES_BY_GROUP: Record<DiscoveryGroupKey, MvpServiceOption[]> = {
  'Home & Local Help': [
    'Cleaning',
    'Laundry help',
    'Home assistance',
    'Basic home repair',
    'Yard or outdoor help',
  ],
  'Errands & Assistance': ['Errands', 'Delivery help'],
  'Learning & Tutoring': ['Tutoring', 'Basic computer lessons', 'School project guidance'],
  'Digital & Document Help': [
    'Encoding',
    'Canva layout',
    'Presentation design',
    'Social media help',
    'Document formatting',
    'Resume or form assistance',
  ],
  'Tech Setup Help': [
    'Computer setup',
    'Phone setup',
    'WiFi/router help',
    'Printer setup',
    'Basic troubleshooting',
  ],
};

export const SEARCH_WORK_TYPE_BY_SERVICE: Record<MvpServiceOption, SearchWorkType> = {
  Cleaning: 'physical',
  'Laundry help': 'physical',
  Errands: 'physical',
  'Delivery help': 'physical',
  'Home assistance': 'physical',
  'Basic home repair': 'physical',
  'Yard or outdoor help': 'physical',
  Tutoring: 'either',
  Encoding: 'digital',
  'Canva layout': 'digital',
  'Presentation design': 'digital',
  'Social media help': 'digital',
  'Basic computer lessons': 'either',
  'School project guidance': 'either',
  'Computer setup': 'either',
  'Phone setup': 'either',
  'WiFi/router help': 'either',
  'Printer setup': 'either',
  'Basic troubleshooting': 'either',
  'Document formatting': 'digital',
  'Resume or form assistance': 'digital',
};

export const SEARCH_SERVICE_DISPLAY_LABELS: Partial<Record<MvpServiceOption, string>> = {
  'Basic home repair': 'Minor home fix help',
};

function normalizeServiceLookupKey(value: string | null | undefined) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export const LEGACY_MVP_SERVICE_ALIASES: Record<string, MvpServiceOption> = {
  'House cleaning': 'Cleaning',
  'Home cleaning': 'Cleaning',
  Housekeeping: 'Cleaning',
  'Whole-house cleaning': 'Cleaning',
  'Laundry service': 'Laundry help',
  'Pickup errands': 'Errands',
  'Small delivery': 'Delivery help',
  'General home help': 'Home assistance',
  'Minor home fix help': 'Basic home repair',
  'Home repair': 'Basic home repair',
  'Small fix': 'Basic home repair',
  'Yard sweeping': 'Yard or outdoor help',
  'Yard cleanup': 'Yard or outdoor help',
  'Garden help': 'Yard or outdoor help',
  Typing: 'Encoding',
  'Data entry': 'Encoding',
  'Document help': 'Document formatting',
  'Computer lessons': 'Basic computer lessons',
  'Laptop setup': 'Computer setup',
  'Phone assistance': 'Phone setup',
  'Wi-Fi setup': 'WiFi/router help',
  'Wifi setup': 'WiFi/router help',
  'Router setup': 'WiFi/router help',
  'Printer pairing': 'Printer setup',
  Troubleshooting: 'Basic troubleshooting',
  Resume: 'Resume or form assistance',
  Forms: 'Resume or form assistance',
};

const NORMALIZED_MVP_SERVICE_LOOKUP = new Map<string, MvpServiceOption>([
  ...MVP_SERVICE_OPTIONS.map((service) => [normalizeServiceLookupKey(service), service] as const),
  ...Object.entries(SEARCH_SERVICE_DISPLAY_LABELS).flatMap(([service, label]) =>
    label ? [[normalizeServiceLookupKey(label), service as MvpServiceOption] as const] : [],
  ),
  ...Object.entries(LEGACY_MVP_SERVICE_ALIASES).map(
    ([legacyLabel, service]) => [normalizeServiceLookupKey(legacyLabel), service] as const,
  ),
]);

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

export function isOtherServiceOption(
  value: string | null | undefined,
): value is typeof OTHER_SERVICE_OPTION {
  return value === OTHER_SERVICE_OPTION;
}

export function isDiscoveryGroupKey(value: string | null | undefined): value is DiscoveryGroupKey {
  return SEARCH_DISCOVERY_GROUPS.includes(value as DiscoveryGroupKey);
}

export function isSearchWorkType(value: string | null | undefined): value is SearchWorkType {
  return value === 'physical' || value === 'digital' || value === 'either';
}

export function getStoredMvpServiceOption(value: string | null | undefined): MvpServiceOption | null {
  if (isMvpServiceOption(value)) return value;

  return NORMALIZED_MVP_SERVICE_LOOKUP.get(normalizeServiceLookupKey(value)) ?? null;
}

export function splitOfficialAndCustomServices(values: Array<string | null | undefined>) {
  const official = new Set<MvpServiceOption>();
  const custom = new Set<string>();

  values.forEach((value) => {
    const cleanValue = value?.trim();
    if (!cleanValue || isOtherServiceOption(cleanValue)) return;

    const storedValue = getStoredMvpServiceOption(cleanValue);
    if (storedValue) {
      official.add(storedValue);
      return;
    }

    custom.add(cleanValue);
  });

  return {
    official: [...official],
    custom: [...custom],
  };
}

export function getServiceSearchValues(value: string | null | undefined) {
  const storedValue = getStoredMvpServiceOption(value);
  const values = new Set<string>();
  const rawValue = value?.trim();

  if (rawValue) values.add(rawValue);
  if (!storedValue) return [...values];

  values.add(storedValue);

  const displayLabel = SEARCH_SERVICE_DISPLAY_LABELS[storedValue];
  if (displayLabel) values.add(displayLabel);

  Object.entries(LEGACY_MVP_SERVICE_ALIASES).forEach(([legacyLabel, service]) => {
    if (service === storedValue) values.add(legacyLabel);
  });

  return [...values];
}

export function getServiceSearchValuesForOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.flatMap((value) => getServiceSearchValues(value))));
}

export function getDisplayLabelForMvpService(value: string | null | undefined) {
  const storedValue = getStoredMvpServiceOption(value);
  if (!storedValue) return value ?? '';
  return SEARCH_SERVICE_DISPLAY_LABELS[storedValue] ?? storedValue;
}

export function getDisplayServiceLabels(values: Array<string | null | undefined>) {
  return values.map((value) => getDisplayLabelForMvpService(value));
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
  const storedService = getStoredMvpServiceOption(service);
  if (!storedService) return null;

  return (
    MVP_SERVICE_CATEGORIES.find((category) => MVP_SERVICES_BY_CATEGORY[category].includes(storedService)) ??
    null
  );
}

export function getDiscoveryGroupForService(service: string | null | undefined): DiscoveryGroupKey | null {
  const storedService = getStoredMvpServiceOption(service);
  if (!storedService) return null;

  return (
    SEARCH_DISCOVERY_GROUPS.find((group) =>
      SEARCH_DISCOVERY_SERVICES_BY_GROUP[group].includes(storedService),
    ) ?? null
  );
}

export function getServicesForDiscoveryGroup(group: DiscoveryGroupKey | 'all') {
  if (group === 'all') return [...MVP_SERVICE_OPTIONS];
  return [...SEARCH_DISCOVERY_SERVICES_BY_GROUP[group]];
}

export function getWorkTypeForMvpService(service: string | null | undefined): SearchWorkType | null {
  const storedService = getStoredMvpServiceOption(service);
  return storedService ? SEARCH_WORK_TYPE_BY_SERVICE[storedService] : null;
}

export function doesServiceMatchWorkType(
  service: string | null | undefined,
  workType: SearchWorkType,
) {
  if (workType === 'either') return true;

  const storedService = getStoredMvpServiceOption(service);
  if (!storedService) return false;

  const mappedType = SEARCH_WORK_TYPE_BY_SERVICE[storedService];
  return mappedType === workType || mappedType === 'either';
}

export function getAllowedServicesForSearchWorkType(workType: SearchWorkType) {
  if (workType === 'either') {
    return [...MVP_SERVICE_OPTIONS];
  }

  return MVP_SERVICE_OPTIONS.filter((service) => doesServiceMatchWorkType(service, workType));
}

export function getDiscoveryGroupsForWorkType(
  workType: SearchWorkType,
  groups: readonly DiscoveryGroupKey[] = SEARCH_DISCOVERY_GROUPS,
) {
  if (workType === 'either') return [...groups];

  return groups.filter((group) =>
    SEARCH_DISCOVERY_SERVICES_BY_GROUP[group].some((service) =>
      doesServiceMatchWorkType(service, workType),
    ),
  );
}

export function getServicesForDiscoveryGroupAndWorkType(
  group: DiscoveryGroupKey | 'all',
  workType: SearchWorkType,
) {
  return getServicesForDiscoveryGroup(group).filter((service) =>
    doesServiceMatchWorkType(service, workType),
  );
}

function getPreferenceServicesForMode({
  mode,
  preferences,
}: {
  mode: 'jobs' | 'workers';
  preferences: UserPreferences | null;
}) {
  const structuredServices =
    mode === 'jobs' ? preferences?.offeredServices ?? [] : preferences?.neededServices ?? [];

  return structuredServices
    .map((value) => getStoredMvpServiceOption(value))
    .filter((value): value is MvpServiceOption => Boolean(value));
}

export function getDefaultSearchWorkTypeForMode({
  mode,
  preferences,
}: {
  mode: 'jobs' | 'workers';
  preferences: UserPreferences | null;
}) {
  if (!preferences) return 'either' as const;

  const services = getPreferenceServicesForMode({ mode, preferences });

  if (!services.length) return 'either' as const;

  let physicalCount = 0;
  let digitalCount = 0;
  let eitherCount = 0;

  for (const service of services) {
    const workType = SEARCH_WORK_TYPE_BY_SERVICE[service];
    if (workType === 'physical') physicalCount += 1;
    if (workType === 'digital') digitalCount += 1;
    if (workType === 'either') eitherCount += 1;
  }

  if (!physicalCount && !digitalCount && eitherCount) {
    return 'either' as const;
  }

  if (digitalCount > physicalCount) {
    return 'digital' as const;
  }

  if (physicalCount > digitalCount) {
    return 'physical' as const;
  }

  if (eitherCount) {
    return 'either' as const;
  }

  return 'physical' as const;
}

export function getOrderedDiscoveryGroupsForMode({
  mode,
  preferences,
}: {
  mode: 'jobs' | 'workers';
  preferences: UserPreferences | null;
}) {
  const preferredServices = getPreferenceServicesForMode({ mode, preferences });
  const fallbackOrder = new Map<DiscoveryGroupKey, number>(
    SEARCH_DISCOVERY_GROUPS.map((group, index) => [group, index]),
  );

  if (!preferredServices.length) {
    return [...SEARCH_DISCOVERY_GROUPS];
  }

  const groupScores = new Map<DiscoveryGroupKey, number>(
    SEARCH_DISCOVERY_GROUPS.map((group) => [group, 0]),
  );

  preferredServices.forEach((service) => {
    const group = getDiscoveryGroupForService(service);
    if (!group) return;
    groupScores.set(group, (groupScores.get(group) ?? 0) + 1);
  });

  return [...SEARCH_DISCOVERY_GROUPS].sort((left, right) => {
    const scoreDiff = (groupScores.get(right) ?? 0) - (groupScores.get(left) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (fallbackOrder.get(left) ?? 0) - (fallbackOrder.get(right) ?? 0);
  });
}
