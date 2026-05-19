import type { ServiceResult } from '@/services/auth.service';
import type { JobCardProps } from '@/components/JobCard';
import type { WorkerCardProps } from '@/components/WorkerCard';
import type {
    CustomServiceReviewStatus,
    ExperienceLevel,
    JobSummary,
    ProviderService,
    PublicProfileSummary,
    RateType,
    ServiceSearchResult,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

export type ProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  barangay: string | null;
  purok_sitio: string | null;
  street: string | null;
  subdivision_area: string | null;
  city: string | null;
  about: string | null;
  avatar_url: string | null;
  availability: string | null;
  verified_at: string | null;
  barangay_verified_at: string | null;
};

export type JobRow = {
  id: string;
  owner_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  service_needed: string | null;
  tags?: string[] | null;
  photo_urls: string[] | null;
  barangay: string | null;
  location: string | null;
  location_text: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  rate_type?: string | null;
  budget_negotiable?: boolean | null;
  private_location_notes?: string | null;
  workers_needed: number | null;
  schedule_text: string | null;
  experience_level?: string | null;
  certification_required?: boolean | null;
  certification_note?: string | null;
  status: JobSummary['status'];
  accepted_provider_id: string | null;
  allow_messages: boolean | null;
  auto_reply_enabled: boolean | null;
  auto_close_enabled: boolean | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
};

export type ServiceRow = {
  id: string;
  provider_id: string;
  category: string;
  title: string;
  description: string | null;
  tags?: string[] | null;
  photo_urls?: string[] | null;
  years_experience: number | null;
  availability_text: string | null;
  rate_text: string | null;
  rate_min?: number | null;
  rate_max?: number | null;
  rate_type?: string | null;
  rate_negotiable?: boolean | null;
  experience_level?: string | null;
  certification_available?: boolean | null;
  certification_note?: string | null;
  custom_category?: string | null;
  custom_category_review_status?: string | null;
  barangay?: string | null;
  location_text?: string | null;
  allow_messages?: boolean | null;
  auto_reply_enabled?: boolean | null;
  auto_pause_enabled?: boolean | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function compactText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function normalizeBarangayName(value: string | null | undefined) {
  return compactText(value)
    .replace(/^(barangay|brgy\.?)\s+/i, '')
    .trim();
}

export function formatBarangayDisplay(value: string | null | undefined) {
  const barangay = normalizeBarangayName(value);
  return barangay ? `Brgy. ${barangay}` : '';
}

export function normalizeRateType(value: string | null | undefined): RateType {
  if (
    value === 'per_service' ||
    value === 'hourly' ||
    value === 'daily' ||
    value === 'weekly' ||
    value === 'per_project'
  ) {
    return value;
  }

  if (value === 'per_visit' || value === 'service') return 'per_service';

  return 'per_project';
}

export function normalizeExperienceLevel(value: string | null | undefined): ExperienceLevel {
  if (value === 'beginner' || value === 'intermediate' || value === 'experienced' || value === 'any') {
    return value;
  }

  return 'any';
}

export function normalizeCustomServiceReviewStatus(
  value: string | null | undefined,
): CustomServiceReviewStatus {
  if (value === 'pending' || value === 'approved' || value === 'rejected' || value === 'none') {
    return value;
  }

  return 'none';
}

export function formatApproximateLocation({
  barangay,
  street,
  subdivisionArea,
  city,
}: {
  barangay?: string | null;
  purokSitio?: string | null;
  street?: string | null;
  subdivisionArea?: string | null;
  city?: string | null;
}) {
  return formatPublicLocation({ barangay, street, subdivisionArea, city });
}

export function formatPublicLocation({
  barangay,
  street,
  subdivisionArea,
  city,
}: {
  barangay?: string | null;
  street?: string | null;
  subdivisionArea?: string | null;
  city?: string | null;
}) {
  const barangayText = formatBarangayDisplay(barangay);
  const cityText = compactText(city);
  const publicDetail = compactText(street) || compactText(subdivisionArea);

  if (publicDetail && barangayText) return `${publicDetail}, ${barangayText}`;
  if (publicDetail) return publicDetail;
  if (barangayText && cityText) return `${barangayText}, ${cityText}`;
  if (barangayText) return barangayText;

  return cityText || 'Brgy. San Pedro, Santo Tomas';
}

export function formatPrivateLocation({
  province,
  city,
  barangay,
  street,
  subdivisionArea,
  blockLot,
  houseNumber,
  landmarkNote,
}: {
  province?: string | null;
  city?: string | null;
  barangay?: string | null;
  street?: string | null;
  subdivisionArea?: string | null;
  blockLot?: string | null;
  houseNumber?: string | null;
  landmarkNote?: string | null;
}) {
  const parts = [
    houseNumber,
    blockLot,
    street,
    subdivisionArea,
    landmarkNote,
    formatBarangayDisplay(barangay),
    city,
    province,
  ]
    .map(compactText)
    .filter(Boolean);

  if (parts.length) return parts.join(', ');

  return '';
}

function normalizeAmount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function getRateTypeSuffix(rateType: RateType) {
  if (rateType === 'per_service') return ' / service';
  if (rateType === 'hourly') return ' / hour';
  if (rateType === 'daily') return ' / day';
  if (rateType === 'weekly') return ' / week';
  if (rateType === 'per_project') return ' / project';
  return '';
}

function formatCurrency(value: number) {
  return `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

function getDisplayRateType({
  rateType,
}: {
  rateType?: RateType | string | null;
}) {
  const normalizedRateType = normalizeRateType(rateType);
  return normalizedRateType;
}

function getStructuredRateBounds({
  min,
  max,
}: {
  min?: number | null;
  max?: number | null;
}) {
  return {
    min: normalizeAmount(min),
    max: normalizeAmount(max),
  };
}

export function formatRateRange({
  min,
  max,
  rateType,
  negotiable,
  fallback = 'Rate not specified',
}: {
  min?: number | null;
  max?: number | null;
  rateType?: RateType | string | null;
  negotiable?: boolean | null;
  fallback?: string;
}) {
  const bounds = getStructuredRateBounds({ min, max });
  const normalizedMin = bounds.min;
  const normalizedMax = bounds.max;
  const normalizedRateType = getDisplayRateType({ rateType });
  const negotiableSuffix = negotiable ? ' · Negotiable' : '';

  if (normalizedMin && normalizedMax) {
    const orderedMin = Math.min(normalizedMin, normalizedMax);
    const orderedMax = Math.max(normalizedMin, normalizedMax);

    if (orderedMin === orderedMax) {
      return `${formatCurrency(orderedMin)}${getRateTypeSuffix(normalizedRateType)}${negotiableSuffix}`;
    }

    return `${formatCurrency(orderedMin)}–${formatCurrency(orderedMax)}${getRateTypeSuffix(normalizedRateType)}${negotiableSuffix}`;
  }

  if (normalizedMin) {
    return `From ${formatCurrency(normalizedMin)}${getRateTypeSuffix(normalizedRateType)}${negotiableSuffix}`;
  }

  if (normalizedMax) {
    return `Up to ${formatCurrency(normalizedMax)}${getRateTypeSuffix(normalizedRateType)}${negotiableSuffix}`;
  }

  return fallback;
}

export function formatJobBudget(job: {
  budgetMin?: number | null;
  budgetMax?: number | null;
  rateType?: RateType | string | null;
  budgetNegotiable?: boolean | null;
}) {
  return formatRateRange({
    min: job.budgetMin ?? null,
    max: job.budgetMax ?? null,
    rateType: job.rateType,
    negotiable: job.budgetNegotiable,
    fallback: 'Budget to coordinate',
  });
}

export function formatServiceRate(service: {
  rateText?: string | null;
  rateMin?: number | null;
  rateMax?: number | null;
  rateType?: RateType | string | null;
  rateNegotiable?: boolean | null;
}) {
  return formatRateRange({
    min: service.rateMin,
    max: service.rateMax,
    rateType: service.rateType,
    negotiable: service.rateNegotiable,
    fallback: 'Rate not specified',
  });
}

export function doesRateOverlap({
  itemMin,
  itemMax,
  filterMin,
  filterMax,
}: {
  itemMin?: number | null;
  itemMax?: number | null;
  filterMin?: number | null;
  filterMax?: number | null;
}) {
  const requestedMin = normalizeAmount(filterMin);
  const requestedMax = normalizeAmount(filterMax);
  if (!requestedMin && !requestedMax) return true;

  const bounds = getStructuredRateBounds({ min: itemMin, max: itemMax });
  const normalizedItemMin = bounds.min;
  const normalizedItemMax = bounds.max ?? normalizedItemMin;
  if (!normalizedItemMin && !normalizedItemMax) return false;

  const low = normalizedItemMin ?? normalizedItemMax ?? 0;
  const high = normalizedItemMax ?? normalizedItemMin ?? Number.MAX_SAFE_INTEGER;
  const filterLow = requestedMin ?? 0;
  const filterHigh = requestedMax ?? Number.MAX_SAFE_INTEGER;

  return low <= filterHigh && high >= filterLow;
}

export const MARKETPLACE_RATE_TYPE_OPTIONS: { value: RateType; label: string }[] = [
  { value: 'per_service', label: 'Per service' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'per_project', label: 'Project-based' },
];

export function rangesOverlap(
  rangeA: { min?: number | null; max?: number | null },
  rangeB: { min?: number | null; max?: number | null },
) {
  const aMin = normalizeAmount(rangeA.min);
  const aMax = normalizeAmount(rangeA.max);
  const bMin = normalizeAmount(rangeB.min);
  const bMax = normalizeAmount(rangeB.max);

  if (!aMin || !aMax || !bMin || !bMax) return false;
  return aMin <= bMax && aMax >= bMin;
}

export function validateRateRange({
  min,
  max,
  rateType,
}: {
  min?: number | null;
  max?: number | null;
  rateType?: RateType | string | null;
}) {
  const normalizedMin = normalizeAmount(min);
  const normalizedMax = normalizeAmount(max);
  const normalizedRateType = normalizeRateType(rateType);

  if (!normalizedMin || !normalizedMax) {
    return {
      valid: false,
      error: 'Enter both minimum and maximum amounts.',
      min: normalizedMin,
      max: normalizedMax,
      rateType: normalizedRateType,
    };
  }

  if (normalizedMax < normalizedMin) {
    return {
      valid: false,
      error: 'Maximum amount must be at least the minimum.',
      min: normalizedMin,
      max: normalizedMax,
      rateType: normalizedRateType,
    };
  }

  return {
    valid: true,
    error: null,
    min: normalizedMin,
    max: normalizedMax,
    rateType: normalizedRateType,
  };
}

export function getExperienceLabel(value: ExperienceLevel | string | null | undefined) {
  const level = normalizeExperienceLevel(value);
  if (level === 'beginner') return 'Beginner friendly';
  if (level === 'intermediate') return 'Intermediate';
  if (level === 'experienced') return 'Experienced';
  return 'Any experience';
}

type JobPostCue = 'lookingFor' | 'needHelpWith' | 'hiringFor';
type ServicePostCue = 'availableFor' | 'canHelpWith' | 'offers';

const jobCueText: Record<JobPostCue, string> = {
  lookingFor: 'Looking for',
  needHelpWith: 'Need help with',
  hiringFor: 'Hiring for',
};

const serviceCueText: Record<ServicePostCue, string> = {
  availableFor: 'Available for',
  canHelpWith: 'Can help with',
  offers: 'Offers',
};

const postCuePattern = /^(looking for|need help with|hiring for|available for|can help with|offers|i offer)\b/i;

function lowerFirst(value: string) {
  if (!value) return value;
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function formatPostTitleWithCue(cue: string, subject: string) {
  const cleanSubject = compactText(subject);
  if (!cleanSubject) return cue;
  if (postCuePattern.test(cleanSubject)) return cleanSubject.replace(/^i offer\b/i, 'Offers');
  return `${cue} ${lowerFirst(cleanSubject)}`;
}

export function formatJobPostTitle({
  title,
  serviceNeeded,
  category,
  cue = 'needHelpWith',
}: {
  title?: string | null;
  serviceNeeded?: string | null;
  category?: string | null;
  cue?: JobPostCue;
}) {
  const subject = compactText(title) || compactText(serviceNeeded) || compactText(category) || 'local help';
  return formatPostTitleWithCue(jobCueText[cue], subject);
}

export function formatServicePostTitle({
  title,
  category,
  cue = 'availableFor',
}: {
  title?: string | null;
  category?: string | null;
  cue?: ServicePostCue;
}) {
  const subject = compactText(title) || compactText(category) || 'local services';
  return formatPostTitleWithCue(serviceCueText[cue], subject);
}

export function isPresenceActive(value: string | boolean | null | undefined) {
  if (typeof value === 'boolean') return value;
  const cleanValue = compactText(value).toLowerCase();
  if (!cleanValue) return false;
  return !/(inactive|offline|away|unavailable|not available|paused|closed)/i.test(cleanValue);
}

export async function getCurrentUserId(): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { data: null, error: 'Please sign in again to continue.' };
  }

  return { data: data.user.id, error: null };
}

export async function requireVerifiedUser(): Promise<ServiceResult<string>> {
  const user = await getCurrentUserId();

  if (user.error) return user;

  const { data, error } = await supabase
    .from('profiles')
    .select('verified_at, barangay_verified_at')
    .eq('id', user.data)
    .maybeSingle<{ verified_at: string | null; barangay_verified_at: string | null }>();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data?.barangay_verified_at && !data?.verified_at) {
    return { data: null, error: 'Complete barangay verification to use this feature.' };
  }

  return user;
}

export async function isCurrentUserAdmin() {
  const user = await getCurrentUserId();
  if (user.error) return false;

  const { data } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', user.data)
    .eq('role', 'barangay_admin')
    .limit(1)
    .maybeSingle<{ id: string }>();

  return Boolean(data);
}

export function mapProfile(row: ProfileRow | null | undefined): PublicProfileSummary | null {
  if (!row) return null;

  const displayName =
    compactText(row.full_name) ||
    `${compactText(row.first_name)} ${compactText(row.last_name)}`.trim() ||
    'Konektado resident';

  return {
    id: row.id,
    fullName: displayName,
    firstName: row.first_name,
    lastName: row.last_name,
    barangay: row.barangay,
    purokSitio: row.purok_sitio,
    street: row.street,
    subdivisionArea: row.subdivision_area,
    city: row.city,
    approximateLocation: formatApproximateLocation({
      barangay: row.barangay,
      purokSitio: row.purok_sitio,
      street: row.street,
      subdivisionArea: row.subdivision_area,
      city: row.city,
    }),
    about: row.about,
    avatarUrl: row.avatar_url,
    availability: row.availability,
    barangayVerifiedAt: row.barangay_verified_at,
    verifiedAt: row.verified_at,
  };
}

export function getPublicProfileAvatarUrl(profile: PublicProfileSummary | null | undefined) {
  return compactText(profile?.avatarUrl) || null;
}

export async function loadPublicProfiles(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map<string, PublicProfileSummary>();

  const { data } = await supabase
    .from('profiles')
    .select(
      'id, full_name, first_name, last_name, barangay, purok_sitio, street, subdivision_area, city, about, avatar_url, availability, verified_at, barangay_verified_at',
    )
    .in('id', ids);

  return new Map(
    ((data as ProfileRow[] | null) ?? [])
      .map(mapProfile)
      .filter((profile): profile is PublicProfileSummary => Boolean(profile))
      .map((profile) => [profile.id, profile]),
  );
}

export function mapJob(row: JobRow, profiles: Map<string, PublicProfileSummary>): JobSummary {
  const clientId = row.client_id ?? row.owner_id;

  return {
    id: row.id,
    clientId,
    title: row.title,
    description: row.description,
    category: row.category,
    serviceNeeded: row.service_needed ?? null,
    tags: row.tags ?? [],
    photoUrls: row.photo_urls ?? [],
    barangay: row.barangay,
    locationText: row.location_text ?? row.location,
    budgetMin: row.budget_min ?? null,
    budgetMax: row.budget_max ?? null,
    rateType: normalizeRateType(row.rate_type),
    budgetNegotiable: row.budget_negotiable ?? false,
    workersNeeded: row.workers_needed ?? null,
    scheduleText: row.schedule_text,
    experienceLevel: normalizeExperienceLevel(row.experience_level),
    certificationRequired: row.certification_required ?? false,
    certificationNote: row.certification_note ?? null,
    status: row.status,
    acceptedProviderId: row.accepted_provider_id,
    allowMessages: row.allow_messages ?? true,
    autoReplyEnabled: row.auto_reply_enabled ?? false,
    autoCloseEnabled: row.auto_close_enabled ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    client: profiles.get(clientId) ?? null,
    clientAverageRating: null,
    clientReviewCount: 0,
    clientJobsPostedCount: 0,
  };
}

export function mapService(row: ServiceRow): ProviderService {
  return {
    id: row.id,
    providerId: row.provider_id,
    category: row.category,
    title: row.title,
    description: row.description,
    tags: row.tags ?? [],
    photoUrls: row.photo_urls ?? [],
    yearsExperience: row.years_experience,
    availabilityText: row.availability_text,
    rateText: row.rate_text,
    rateMin: row.rate_min ?? null,
    rateMax: row.rate_max ?? null,
    rateType: normalizeRateType(row.rate_type),
    rateNegotiable: row.rate_negotiable ?? false,
    experienceLevel: normalizeExperienceLevel(row.experience_level),
    certificationAvailable: row.certification_available ?? false,
    certificationNote: row.certification_note ?? null,
    customCategory: row.custom_category ?? null,
    customCategoryReviewStatus: normalizeCustomServiceReviewStatus(row.custom_category_review_status),
    barangay: row.barangay ?? null,
    locationText: row.location_text ?? row.barangay ?? null,
    allowMessages: row.allow_messages ?? true,
    autoReplyEnabled: row.auto_reply_enabled ?? false,
    autoPauseEnabled: row.auto_pause_enabled ?? false,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getMarketplaceLocation({
  locationText,
  barangay,
}: {
  locationText?: string | null;
  barangay?: string | null;
}) {
  return compactText(locationText) || compactText(barangay) || 'Barangay San Pedro';
}

export function formatRelativeMarketplaceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Posted recently';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'Posted just now';
  if (diffMinutes < 60) return `Posted ${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Posted ${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Posted ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return `Posted ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function formatJobSubtitle(job: JobSummary) {
  const budget = formatJobBudget(job);
  const schedule = compactText(job.scheduleText) || 'Schedule to coordinate';

  return `${budget} - ${schedule}`;
}

export function formatServiceRatingText(service: ServiceSearchResult) {
  if (service.averageRating && service.reviewCount > 0) {
    return `${service.averageRating.toFixed(1)} rating`;
  }

  return 'No reviews yet';
}

export function formatServiceJobsDoneText(service: ServiceSearchResult, completedJobsCount = 0) {
  if (completedJobsCount > 0) {
    return `${completedJobsCount} job${completedJobsCount === 1 ? '' : 's'} done`;
  }

  if (service.reviewCount > 0) {
    return `${service.reviewCount} review${service.reviewCount === 1 ? '' : 's'}`;
  }

  return 'No completed Konektado jobs yet';
}

export function formatClientRatingText(job: JobSummary) {
  if (job.clientAverageRating && job.clientReviewCount > 0) {
    return `${job.clientAverageRating.toFixed(1)} rating`;
  }

  return 'No reviews yet';
}

export function formatClientJobsPostedText(job: JobSummary) {
  if (job.clientJobsPostedCount > 0) {
    return `${job.clientJobsPostedCount} job${job.clientJobsPostedCount === 1 ? '' : 's'} posted`;
  }

  return 'No posted-job history yet';
}

export function adaptJobToCardProps(job: JobSummary): JobCardProps {
  const category = compactText(job.category) || 'Job';
  const serviceNeeded = compactText(job.serviceNeeded);

  return {
    postedAt: formatRelativeMarketplaceDate(job.createdAt),
    title: formatJobPostTitle({
      title: job.title,
      serviceNeeded: job.serviceNeeded,
      category: job.category,
      cue: serviceNeeded ? 'needHelpWith' : 'lookingFor',
    }),
    subtitle: formatJobSubtitle(job),
    description: job.description || 'No description provided yet.',
    tags: Array.from(new Set([category, serviceNeeded, ...job.tags].filter(Boolean))),
    clientRatingText: formatClientRatingText(job),
    jobsPostedText: formatClientJobsPostedText(job),
    location: getMarketplaceLocation(job),
    imageUrl: job.photoUrls[0],
    showActionRow: false,
  };
}

export function adaptServiceToCardProps(
  service: ServiceSearchResult,
): WorkerCardProps {
  const providerName = compactText(service.provider?.fullName) || 'Konektado resident';
  const category = compactText(service.category) || 'Service';
  const availability = compactText(service.availabilityText);

  return {
    name: providerName,
    statusLine: availability
      ? `${availability} near your barangay`
      : 'Available near your barangay',
    rateLine: formatServiceRate(service),
    headline: formatServicePostTitle({
      title: service.title,
      category: service.category,
      cue: service.isActive ? 'availableFor' : 'offers',
    }),
    tags: Array.from(new Set([category, ...service.tags].filter(Boolean))),
    ratingText: formatServiceRatingText(service),
    jobsDoneText: formatServiceJobsDoneText(service, service.completedJobsCount),
    location: getMarketplaceLocation(service),
    imageUrl: service.photoUrls[0],
    isActive: isPresenceActive(service.isActive && (service.availabilityText || service.provider?.availability || true)),
  };
}
