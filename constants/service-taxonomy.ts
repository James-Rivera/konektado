import type { UserPreferences } from '@/types/onboarding.types';

export const MVP_SERVICE_CATEGORIES = [
  'Home & Local Help',
  'Learning & Digital Help',
  'Tech & Document Support',
  'Food & Personal Services',
] as const;

export type MvpServiceCategory = (typeof MVP_SERVICE_CATEGORIES)[number];

/**
 * The controlled canonical service vocabulary, grouped by the category that is
 * stored in `jobs.category` / `services.category`.
 *
 * `as const satisfies` is load-bearing: a plain `Record<MvpServiceCategory,
 * string[]>` annotation widens every literal to `string`, which silently turns
 * `MvpServiceOption` into `string` and makes every `Record<MvpServiceOption,
 * ...>` map below non-exhaustive. Adding a service must be a compile error
 * until its metadata is filled in, so the literals have to survive.
 */
export const MVP_SERVICES_BY_CATEGORY = {
  'Home & Local Help': [
    'Cleaning',
    'Laundry help',
    'Errands',
    'Delivery help',
    'Home assistance',
    'Minor home fix help',
    'Yard or outdoor help',
    'Carpentry',
    'Painting',
    'Furniture repair or assembly',
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
    'Phone or computer repair',
  ],
  'Food & Personal Services': [
    'Baking',
    'Home-cooked meals',
    'Party food trays',
    'Sewing',
    'Clothing alteration or repair',
    'Manicure or pedicure',
    'Haircut',
    'Makeup',
    'Massage',
  ],
} as const satisfies Record<MvpServiceCategory, readonly string[]>;

export type MvpServiceOption =
  (typeof MVP_SERVICES_BY_CATEGORY)[MvpServiceCategory][number];

export const MVP_SERVICE_OPTIONS: readonly MvpServiceOption[] = MVP_SERVICE_CATEGORIES.flatMap(
  (category) => [...MVP_SERVICES_BY_CATEGORY[category]],
);

/** Onboarding/preference sentinel for "my service is not on this list". */
export const OTHER_SERVICE_OPTION = 'Others / Specify' as const;

/**
 * Listing sentinel stored in `services.category` when a resident published a
 * genuinely unknown service. Their own wording lives in
 * `services.custom_category`. This is deliberately NOT a canonical service:
 * it must never appear in a taxonomy picker, but it must stay discoverable,
 * so `getDiscoveryGroupForService` maps it to the `More services` group.
 */
export const OTHER_SERVICE_CATEGORY_VALUE = 'Other service' as const;

export type ServiceSelectionValue = MvpServiceOption | typeof OTHER_SERVICE_OPTION;

export const OFFERED_DELIVERY_MODES = ['on_site', 'online', 'both'] as const;

export type OfferedDeliveryMode = (typeof OFFERED_DELIVERY_MODES)[number];

export const OFFERED_DELIVERY_MODE_LABELS: Record<OfferedDeliveryMode, string> = {
  on_site: 'On-site',
  online: 'Online',
  both: 'Both',
};

export const OFFERED_DELIVERY_MODE_HELPERS: Record<OfferedDeliveryMode, string> = {
  on_site: 'Help in person within nearby areas.',
  online: 'Help remotely through chat, call, or files.',
  both: 'Offer both on-site and online services.',
};

export type SearchWorkType = 'physical' | 'digital' | 'either';

/**
 * The eight primary discovery groups rendered by the Home "Explore Services"
 * grid. These are display-only: they are never written to the database, so the
 * labels can change without a data migration.
 */
export const HOME_DISCOVERY_GROUPS = [
  'Home & Errands',
  'Beauty & Personal Care',
  'Food & Baking',
  'Sewing & Tailoring',
  'Home Repair & Carpentry',
  'Tutoring & Lessons',
  'Documents & Design',
  'Computer & Phone Help',
] as const;

export type HomeDiscoveryGroupKey = (typeof HOME_DISCOVERY_GROUPS)[number];

/**
 * Search fallback bucket for published listings whose service is genuinely
 * outside the controlled taxonomy (`services.category = 'Other service'`).
 * Deliberately excluded from `HOME_DISCOVERY_GROUPS`: the Figma Home grid is
 * eight primary shortcuts, and this must stay reachable through Search and
 * "See all" instead of becoming a ninth tile.
 */
export const MORE_SERVICES_GROUP = 'More services' as const;

export const SEARCH_DISCOVERY_GROUPS = [
  ...HOME_DISCOVERY_GROUPS,
  MORE_SERVICES_GROUP,
] as const;

export type DiscoveryGroupKey = (typeof SEARCH_DISCOVERY_GROUPS)[number];

export const SEARCH_DISCOVERY_SERVICES_BY_GROUP = {
  'Home & Errands': [
    'Cleaning',
    'Laundry help',
    'Errands',
    'Delivery help',
    'Home assistance',
    'Yard or outdoor help',
  ],
  'Beauty & Personal Care': ['Manicure or pedicure', 'Haircut', 'Makeup', 'Massage'],
  'Food & Baking': ['Baking', 'Home-cooked meals', 'Party food trays'],
  'Sewing & Tailoring': ['Sewing', 'Clothing alteration or repair'],
  'Home Repair & Carpentry': [
    'Minor home fix help',
    'Carpentry',
    'Painting',
    'Furniture repair or assembly',
  ],
  'Tutoring & Lessons': ['Tutoring', 'Basic computer lessons', 'School project guidance'],
  'Documents & Design': [
    'Encoding',
    'Canva layout',
    'Presentation design',
    'Social media help',
    'Document formatting',
    'Resume or form assistance',
  ],
  'Computer & Phone Help': [
    'Computer setup',
    'Phone setup',
    'WiFi/router help',
    'Printer setup',
    'Basic troubleshooting',
    'Phone or computer repair',
  ],
  // Holds no canonical service on purpose: it matches the `Other service`
  // sentinel, not taxonomy members.
  [MORE_SERVICES_GROUP]: [],
} as const satisfies Record<DiscoveryGroupKey, readonly MvpServiceOption[]>;

export const SEARCH_WORK_TYPE_BY_SERVICE = {
  Cleaning: 'physical',
  'Laundry help': 'physical',
  Errands: 'physical',
  'Delivery help': 'physical',
  'Home assistance': 'physical',
  'Minor home fix help': 'physical',
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
  Carpentry: 'physical',
  Painting: 'physical',
  'Furniture repair or assembly': 'physical',
  'Phone or computer repair': 'either',
  Baking: 'physical',
  'Home-cooked meals': 'physical',
  'Party food trays': 'physical',
  Sewing: 'physical',
  'Clothing alteration or repair': 'physical',
  'Manicure or pedicure': 'physical',
  Haircut: 'physical',
  Makeup: 'physical',
  Massage: 'physical',
} as const satisfies Record<MvpServiceOption, SearchWorkType>;

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
  'Basic home repair': 'Minor home fix help',
  'Basic home repair help': 'Minor home fix help',
  'Minor home repair': 'Minor home fix help',
  'Minor home fix support': 'Minor home fix help',
  'Home repair': 'Minor home fix help',
  'Small fix': 'Minor home fix help',
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

  // Repair and carpentry (DEC-106 widened this scope beyond `Minor home fix help`).
  Karpintero: 'Carpentry',
  Carpintero: 'Carpentry',
  'Carpentry work': 'Carpentry',
  Woodwork: 'Carpentry',
  Pintor: 'Painting',
  'House painting': 'Painting',
  'Furniture assembly': 'Furniture repair or assembly',
  'Furniture repair': 'Furniture repair or assembly',

  // Food.
  Cake: 'Baking',
  Cakes: 'Baking',
  'Birthday cake': 'Baking',
  'Birthday cakes': 'Baking',
  Pastry: 'Baking',
  Pastries: 'Baking',
  Bread: 'Baking',
  Cupcakes: 'Baking',
  'Lutong bahay': 'Home-cooked meals',
  'Lutong-bahay': 'Home-cooked meals',
  Ulam: 'Home-cooked meals',
  'Packed meals': 'Home-cooked meals',
  Cooking: 'Home-cooked meals',
  'Food trays': 'Party food trays',
  Bilao: 'Party food trays',

  // Sewing.
  Panahi: 'Sewing',
  Mananahi: 'Sewing',
  Patahi: 'Sewing',
  Tailoring: 'Sewing',
  Dressmaking: 'Sewing',
  Alterations: 'Clothing alteration or repair',
  'Clothing repair': 'Clothing alteration or repair',
  Hemming: 'Clothing alteration or repair',

  // Beauty and personal care.
  Manicure: 'Manicure or pedicure',
  Pedicure: 'Manicure or pedicure',
  Gupit: 'Haircut',
  Barbero: 'Haircut',
  Haircutting: 'Haircut',
  'Makeup artist': 'Makeup',
  'Make-up': 'Makeup',
  Masahe: 'Massage',

  // Errands.
  Pabili: 'Errands',

  // Device repair.
  'Computer repair': 'Phone or computer repair',
  'Laptop repair': 'Phone or computer repair',
  'Phone repair': 'Phone or computer repair',
  'Cellphone repair': 'Phone or computer repair',
  'Device repair': 'Phone or computer repair',
};

/**
 * Product-scope guard for the custom-service escape hatch.
 *
 * Konektado excludes licensed/high-risk trades (see DEC-050 and DEC-106). The
 * custom-service field must not become a way around that, and broad repair
 * wording must never quietly absorb electrical or plumbing work. These are
 * normalized word/phrase fragments, not a legal classification.
 */
export const BLOCKED_SERVICE_TERMS: readonly string[] = [
  'electrician',
  'electrical',
  'electrical wiring',
  'electric wiring',
  'kuryente',
  'kuryenteng',
  'wiring',
  'rewiring',
  'plumber',
  'plumbing',
  'tubero',
  'structural construction',
  'house construction',
  'building construction',
  'load bearing',
  'roof framing',
];

const NORMALIZED_MVP_SERVICE_LOOKUP = new Map<string, MvpServiceOption>([
  ...MVP_SERVICE_OPTIONS.map((service) => [normalizeServiceLookupKey(service), service] as const),
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

export const MVP_CATEGORY_CONTEXT_TAGS = {
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
  'Food & Personal Services': [
    'Home service',
    'Pickup',
    'Advance order',
    'By appointment',
    'Same day',
    'Weekend',
    'Custom order',
  ],
} as const satisfies Record<MvpServiceCategory, readonly string[]>;

export const MVP_SERVICE_TAGS = {
  Cleaning: ['Regular cleaning', 'Deep clean', 'Indoor', 'Same day', 'Supplies ready', 'Weekly'],
  'Laundry help': ['Wash and fold', 'Ironing', 'Pickup available', 'Rush', 'Blankets', 'Weekly'],
  Errands: ['Nearby only', 'Same day', 'Short task', 'Pickup help', 'Senior help'],
  'Delivery help': ['Small delivery', 'Nearby only', 'Pickup available', 'Same day', 'Light items'],
  'Home assistance': ['General help', 'Home visit', 'Senior help', 'Weekly', 'Short task'],
  'Minor home fix help': ['Small fix', 'Home maintenance', 'Tools ready', 'Indoor', 'Outdoor'],
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
  Carpentry: ['Shelves', 'Cabinets', 'Doors', 'Wood repair', 'Tools ready', 'Custom build'],
  Painting: ['Interior', 'Exterior', 'Furniture paint', 'Touch-up', 'Materials ready'],
  'Furniture repair or assembly': [
    'Assembly',
    'Wood repair',
    'Refinishing',
    'Home visit',
    'Short task',
  ],
  'Phone or computer repair': [
    'Software fix',
    'Virus removal',
    'Cleaning',
    'Upgrade',
    'Home visit',
    'Diagnosis first',
  ],
  Baking: ['Cakes', 'Pastries', 'Bread', 'Custom order', 'Advance order', 'Pickup'],
  'Home-cooked meals': ['Packed meals', 'Daily orders', 'Pickup', 'Delivery available', 'Ulam'],
  'Party food trays': ['Trays', 'Events', 'Advance order', 'Bulk order', 'Pickup'],
  Sewing: ['Custom fit', 'School uniform', 'Curtains', 'Repairs', 'Pickup available'],
  'Clothing alteration or repair': [
    'Hemming',
    'Resizing',
    'Zipper repair',
    'School uniform',
    'Rush',
  ],
  'Manicure or pedicure': ['Home service', 'Shop-based', 'By appointment', 'Gel', 'Weekend'],
  Haircut: ['Home service', 'Shop-based', 'Kids', 'Adults', 'By appointment'],
  Makeup: ['Events', 'Bridal', 'Home service', 'By appointment', 'Weekend'],
  Massage: ['Home service', 'Shop-based', 'By appointment', 'Adults only', 'Relaxation'],
} as const satisfies Record<MvpServiceOption, readonly string[]>;

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

/** True for the `Other service` sentinel stored on genuinely custom listings. */
export function isOtherServiceCategoryValue(
  value: string | null | undefined,
): value is typeof OTHER_SERVICE_CATEGORY_VALUE {
  return value === OTHER_SERVICE_CATEGORY_VALUE;
}

export function isOfferedDeliveryMode(value: string | null | undefined): value is OfferedDeliveryMode {
  return OFFERED_DELIVERY_MODES.includes(value as OfferedDeliveryMode);
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

export function splitOfficialAndCustomServices(values: (string | null | undefined)[]) {
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

  Object.entries(LEGACY_MVP_SERVICE_ALIASES).forEach(([legacyLabel, service]) => {
    if (service === storedValue) values.add(legacyLabel);
  });

  return [...values];
}

export function getServiceSearchValuesForOptions(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.flatMap((value) => getServiceSearchValues(value))));
}

export function getDisplayLabelForMvpService(value: string | null | undefined) {
  const storedValue = getStoredMvpServiceOption(value);
  if (!storedValue) return value ?? '';
  return storedValue;
}

export function getDisplayTitleForMvpService(
  title: string | null | undefined,
  service: string | null | undefined,
) {
  const cleanTitle = title?.trim() ?? '';
  if (!cleanTitle) return '';

  const storedService = getStoredMvpServiceOption(service);
  const titleService = getStoredMvpServiceOption(
    cleanTitle.replace(/\s+(?:help|support)$/i, '').trim(),
  );

  if (storedService === 'Minor home fix help' && titleService === storedService) {
    return 'Minor home fix support';
  }

  return cleanTitle;
}

export function getDisplayServiceLabels(values: (string | null | undefined)[]) {
  return values.map((value) => getDisplayLabelForMvpService(value));
}

export function getServicesForMvpCategory(category: string | null | undefined): MvpServiceOption[] {
  return isMvpServiceCategory(category) ? [...MVP_SERVICES_BY_CATEGORY[category]] : [];
}

export function getDisplayLabelForOfferedDeliveryMode(value: string | null | undefined) {
  return isOfferedDeliveryMode(value) ? OFFERED_DELIVERY_MODE_LABELS[value] : '';
}

export function getTagsForMvpCategory(category: string | null | undefined): string[] {
  return isMvpServiceCategory(category) ? [...MVP_CATEGORY_CONTEXT_TAGS[category]] : [];
}

export function getTagsForMvpService(service: string | null | undefined): string[] {
  const storedService = getStoredMvpServiceOption(service);
  return storedService ? [...MVP_SERVICE_TAGS[storedService]] : [];
}

export function getCategoryForMvpService(service: string | null | undefined): MvpServiceCategory | null {
  const storedService = getStoredMvpServiceOption(service);
  if (!storedService) return null;

  return (
    MVP_SERVICE_CATEGORIES.find((category) =>
      (MVP_SERVICES_BY_CATEGORY[category] as readonly MvpServiceOption[]).includes(storedService),
    ) ?? null
  );
}

/**
 * The single primary discovery group for a stored service value.
 *
 * The `Other service` sentinel resolves to `More services` so that genuinely
 * custom listings stay reachable from Search instead of falling out of every
 * structured filter.
 */
export function getDiscoveryGroupForService(service: string | null | undefined): DiscoveryGroupKey | null {
  if (isOtherServiceCategoryValue(service?.trim())) return MORE_SERVICES_GROUP;

  const storedService = getStoredMvpServiceOption(service);
  if (!storedService) return null;

  return (
    SEARCH_DISCOVERY_GROUPS.find((group) =>
      (SEARCH_DISCOVERY_SERVICES_BY_GROUP[group] as readonly MvpServiceOption[]).includes(
        storedService,
      ),
    ) ?? null
  );
}

export function getServicesForDiscoveryGroup(group: DiscoveryGroupKey | 'all'): MvpServiceOption[] {
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

function getSearchWorkTypeForOfferedDeliveryMode(mode: OfferedDeliveryMode): SearchWorkType {
  if (mode === 'on_site') return 'physical';
  if (mode === 'online') return 'digital';
  return 'either';
}

export function doesServiceMatchOfferedDeliveryMode(
  service: string | null | undefined,
  mode: OfferedDeliveryMode,
) {
  return doesServiceMatchWorkType(service, getSearchWorkTypeForOfferedDeliveryMode(mode));
}

export function getAllowedServicesForOfferedDeliveryMode(mode: OfferedDeliveryMode) {
  return MVP_SERVICE_OPTIONS.filter((service) => doesServiceMatchOfferedDeliveryMode(service, mode));
}

export function getMvpCategoriesForOfferedDeliveryMode(mode: OfferedDeliveryMode) {
  return MVP_SERVICE_CATEGORIES.filter((category) =>
    MVP_SERVICES_BY_CATEGORY[category].some((service) =>
      doesServiceMatchOfferedDeliveryMode(service, mode),
    ),
  );
}

export function getServicesForMvpCategoryAndOfferedDeliveryMode(
  category: string | null | undefined,
  mode: OfferedDeliveryMode,
) {
  return getServicesForMvpCategory(category).filter((service) =>
    doesServiceMatchOfferedDeliveryMode(service, mode),
  );
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

  return groups.filter((group) => {
    // `More services` holds no canonical service, so a membership test would
    // always drop it. Custom listings can be either work type, so keep the
    // fallback bucket reachable under every filter.
    if (group === MORE_SERVICES_GROUP) return true;

    return (SEARCH_DISCOVERY_SERVICES_BY_GROUP[group] as readonly MvpServiceOption[]).some(
      (service) => doesServiceMatchWorkType(service, workType),
    );
  });
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

/**
 * Orders discovery groups by how well they match the user's stored
 * preferences. Ranking only — every group stays in the returned list, because
 * personalization must change ordering, never access.
 *
 * `groups` lets Home pass `HOME_DISCOVERY_GROUPS` so the eight primary tiles
 * never include the `More services` search fallback.
 */
export function getOrderedDiscoveryGroupsForMode<Group extends DiscoveryGroupKey>({
  groups,
  mode,
  preferences,
}: {
  groups?: readonly Group[];
  mode: 'jobs' | 'workers';
  preferences: UserPreferences | null;
}): Group[] {
  const orderedGroups = (groups ?? SEARCH_DISCOVERY_GROUPS) as readonly Group[];
  const preferredServices = getPreferenceServicesForMode({ mode, preferences });
  const fallbackOrder = new Map<Group, number>(
    orderedGroups.map((group, index) => [group, index]),
  );

  if (!preferredServices.length) {
    return [...orderedGroups];
  }

  const groupScores = new Map<Group, number>(orderedGroups.map((group) => [group, 0]));

  preferredServices.forEach((service) => {
    const group = getDiscoveryGroupForService(service) as Group | null;
    if (!group || !groupScores.has(group)) return;
    groupScores.set(group, (groupScores.get(group) ?? 0) + 1);
  });

  return [...orderedGroups].sort((left, right) => {
    const scoreDiff = (groupScores.get(right) ?? 0) - (groupScores.get(left) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (fallbackOrder.get(left) ?? 0) - (fallbackOrder.get(right) ?? 0);
  });
}
