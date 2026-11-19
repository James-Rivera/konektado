import { validateServicePayload } from '@/services/listing-validation';
import {
  getStoredMvpServiceOption,
  getServiceSearchValues,
  getServiceSearchValuesForOptions,
} from '@/constants/service-taxonomy';
import type { ServiceResult } from '@/services/auth.service';
import { applyPublicPhotoVisibilityToRows } from '@/services/content-visibility.service';
import {
  compactText,
  doesRateOverlap,
  loadPublicProfiles,
  getCurrentUserId,
  isPublicProfileVerified,
  mapService,
  normalizeExperienceLevel,
  normalizeRateType,
  validateRateRange,
  type ServiceRow,
} from '@/services/marketplace.helpers';
import { requireVerifiedCompleteProfile } from '@/services/profile-completion.service';
import type {
  CreateServiceInput,
  ProviderService,
  PublicProfileSummary,
  ServiceSearchFilters,
  ServiceDetail,
  ServiceSearchResult,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const SERVICE_COLUMNS =
  'id, provider_id, category, title, description, tags, photo_urls, years_experience, availability_text, rate_text, rate_min, rate_max, rate_type, rate_negotiable, experience_level, certification_available, certification_note, custom_category, custom_category_review_status, barangay, location_text, allow_messages, auto_reply_enabled, auto_pause_enabled, is_active, created_at, updated_at';

type ProviderStats = {
  averageRating: number | null;
  reviewCount: number;
  completedJobsCount: number;
};

async function loadProviderStats(providerIds: string[], requireCounts = false) {
  const ids = Array.from(new Set(providerIds.filter(Boolean)));
  const stats = new Map<string, ProviderStats>();

  if (!ids.length) {
    return stats;
  }

  const { data, error } = await supabase.rpc('get_provider_reputation_counts', { p_provider_ids: ids });
  if (error) {
    if (requireCounts) throw new Error('Provider rankings are unavailable. Try again.');
    return stats;
  }
  const rows = (data ?? []) as {
    provider_id: string;
    average_rating: number | null;
    review_count: number;
    completed_jobs_count: number;
  }[];
  for (const row of rows) {
    stats.set(row.provider_id, {
      averageRating: row.average_rating,
      reviewCount: row.review_count,
      completedJobsCount: row.completed_jobs_count,
    });
  }

  return stats;
}

function mapServiceSearchResult(
  row: ServiceRow,
  profiles: Map<string, PublicProfileSummary>,
  stats: Map<string, ProviderStats>,
): ServiceSearchResult {
  const provider = profiles.get(row.provider_id) ?? null;
  const providerStats = stats.get(row.provider_id);

  return {
    ...mapService(row),
    provider,
    averageRating: providerStats?.averageRating ?? null,
    reviewCount: providerStats?.reviewCount ?? 0,
    completedJobsCount: providerStats?.completedJobsCount ?? 0,
  };
}

export async function createService(
  input: CreateServiceInput,
): Promise<ServiceResult<ProviderService>> {
  const user = await requireVerifiedCompleteProfile('provider');
  if (user.error) return user;

  const payloadError = validateServicePayload(input);
  if (payloadError) return { data: null, error: payloadError };

  const category = getStoredMvpServiceOption(input.category) ?? compactText(input.category);
  const title = compactText(input.title);
  const tags = Array.from(new Set((input.tags ?? []).map(compactText).filter(Boolean))).slice(0, 4);
  const rateMin = input.rateMin ?? null;
  const rateMax = input.rateMax ?? null;
  const rateType = normalizeRateType(input.rateType);
  const rateRange = validateRateRange({ min: rateMin, max: rateMax, rateType });
  const experienceLevel = normalizeExperienceLevel(input.experienceLevel);
  const customCategory = compactText(input.customCategory) || null;

  if (!category || !title) {
    return { data: null, error: 'Enter a service category and title.' };
  }

  if (!rateRange.valid) {
    return { data: null, error: `Rate range: ${rateRange.error ?? 'Enter a valid rate range.'}` };
  }

  const { data, error } = await supabase
    .from('services')
    .insert({
      provider_id: user.data,
      category,
      title,
      description: compactText(input.description) || null,
      tags,
      photo_urls: input.photoUrls ?? [],
      years_experience: input.yearsExperience ?? null,
      availability_text: compactText(input.availabilityText) || null,
      rate_text: compactText(input.rateText) || null,
      rate_min: rateRange.min,
      rate_max: rateRange.max,
      rate_type: rateRange.rateType,
      rate_negotiable: input.rateNegotiable ?? false,
      experience_level: experienceLevel,
      certification_available: input.certificationAvailable ?? false,
      certification_note: compactText(input.certificationNote) || null,
      custom_category: customCategory,
      custom_category_review_status: category === 'Other service' ? 'pending' : 'none',
      barangay: compactText(input.barangay) || null,
      location_text: compactText(input.locationText) || compactText(input.barangay) || null,
      allow_messages: input.allowMessages ?? true,
      auto_reply_enabled: false,
      auto_pause_enabled: false,
      is_active: true,
    })
    .select(SERVICE_COLUMNS)
    .single<ServiceRow>();

  if (error) {
    return {
      data: null,
      error: error.message.toLowerCase().includes('row-level security')
        ? 'Complete barangay verification before creating services.'
        : error.message,
    };
  }

  return { data: mapService(data), error: null };
}

export async function getMyService(serviceId: string): Promise<ServiceResult<ProviderService>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('id', serviceId)
    .eq('provider_id', user.data)
    .maybeSingle<ServiceRow>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Service not found.' };

  return { data: mapService(data), error: null };
}

export async function updateService({
  serviceId,
  input,
}: {
  serviceId: string;
  input: CreateServiceInput;
}): Promise<ServiceResult<ProviderService>> {
  const user = await requireVerifiedCompleteProfile('provider');
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const payloadError = validateServicePayload(input);
  if (payloadError) return { data: null, error: payloadError };

  const category = getStoredMvpServiceOption(input.category) ?? compactText(input.category);
  const title = compactText(input.title);
  const tags = Array.from(new Set((input.tags ?? []).map(compactText).filter(Boolean))).slice(0, 4);
  const rateType = normalizeRateType(input.rateType);
  const rateRange = validateRateRange({
    min: input.rateMin ?? null,
    max: input.rateMax ?? null,
    rateType,
  });
  const customCategory = compactText(input.customCategory) || null;

  if (!category || !title) {
    return { data: null, error: 'Enter a service category and title.' };
  }

  if (!rateRange.valid) {
    return { data: null, error: `Rate range: ${rateRange.error ?? 'Enter a valid rate range.'}` };
  }

  const { data, error } = await supabase
    .from('services')
    .update({
      category,
      title,
      description: compactText(input.description) || null,
      tags,
      photo_urls: input.photoUrls ?? [],
      years_experience: input.yearsExperience ?? null,
      availability_text: compactText(input.availabilityText) || null,
      rate_text: compactText(input.rateText) || null,
      rate_min: rateRange.min,
      rate_max: rateRange.max,
      rate_type: rateRange.rateType,
      rate_negotiable: input.rateNegotiable ?? false,
      experience_level: normalizeExperienceLevel(input.experienceLevel),
      certification_available: input.certificationAvailable ?? false,
      certification_note: compactText(input.certificationNote) || null,
      custom_category: customCategory,
      custom_category_review_status: category === 'Other service' ? 'pending' : 'none',
      barangay: compactText(input.barangay) || null,
      location_text: compactText(input.locationText) || compactText(input.barangay) || null,
      allow_messages: input.allowMessages ?? true,
      auto_reply_enabled: false,
      auto_pause_enabled: false,
    })
    .eq('id', serviceId)
    .eq('provider_id', user.data)
    .select(SERVICE_COLUMNS)
    .maybeSingle<ServiceRow>();

  if (error) {
    return {
      data: null,
      error: error.message.toLowerCase().includes('row-level security')
        ? 'Complete barangay verification before changing services.'
        : error.message,
    };
  }

  if (!data) {
    return { data: null, error: 'Service not found.' };
  }

  return { data: mapService(data), error: null };
}

export async function updateServiceAvailability({
  isActive,
  serviceId,
}: {
  isActive: boolean;
  serviceId: string;
}): Promise<ServiceResult<ProviderService>> {
  const user = await requireVerifiedCompleteProfile('provider');
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', serviceId)
    .eq('provider_id', user.data)
    .select(SERVICE_COLUMNS)
    .maybeSingle<ServiceRow>();

  if (error) {
    return {
      data: null,
      error: error.message.toLowerCase().includes('row-level security')
        ? 'Complete barangay verification before changing services.'
        : error.message,
    };
  }

  if (!data) {
    return { data: null, error: 'Only the service owner can change this post.' };
  }

  return { data: mapService(data), error: null };
}

export async function listMyServices(): Promise<ServiceResult<ProviderService[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;

  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('provider_id', user.data)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: ((data as ServiceRow[] | null) ?? []).map(mapService), error: null };
}

export async function searchServices(filters: ServiceSearchFilters = {}): Promise<
  ServiceResult<ServiceSearchResult[]>
> {
  const text = compactText(filters.text).toLowerCase();
  const limit = normalizeLimit(filters.limit);
  let excludeUserId = compactText(filters.excludeUserId) || null;

  if (!excludeUserId && filters.excludeCurrentUser !== false) {
    const currentUser = await getCurrentUserId();
    excludeUserId = currentUser.data ?? null;
  }

  let query = supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters.category) {
    query = query.in('category', getServiceSearchValues(filters.category));
  } else if (filters.categories?.length) {
    query = query.in('category', getServiceSearchValuesForOptions(filters.categories));
  }

  if (filters.barangay) {
    query = query.ilike('barangay', `%${filters.barangay}%`);
  }

  if (excludeUserId) {
    query = query.neq('provider_id', excludeUserId);
  }

  if (filters.rateType && filters.rateType !== 'any') {
    query = query.eq('rate_type', filters.rateType);
  }

  if (filters.experienceLevel && filters.experienceLevel !== 'all') {
    query = query.eq('experience_level', filters.experienceLevel);
  }

  if (filters.certificationAvailable !== undefined) {
    query = query.eq('certification_available', filters.certificationAvailable);
  }

  if (text) {
    const escapedText = escapePostgrestFilterValue(text);
    const clauses = [
      `title.ilike.%${escapedText}%`,
      `description.ilike.%${escapedText}%`,
      `category.ilike.%${escapedText}%`,
      // The resident's own wording for a listing, e.g. "Birthday cakes".
      `custom_category.ilike.%${escapedText}%`,
      `availability_text.ilike.%${escapedText}%`,
      `rate_text.ilike.%${escapedText}%`,
      `barangay.ilike.%${escapedText}%`,
      `location_text.ilike.%${escapedText}%`,
    ];

    // Tags carry bundled extras and specialties, so a search for "makeup"
    // should also reach a Haircut listing that offers it. Arrays only support
    // containment rather than ilike, so this is restricted to plain tokens that
    // cannot break out of the PostgREST filter syntax.
    const tagToken = getSearchableTagToken(text);
    if (tagToken) {
      clauses.push(`tags.cs.{"${tagToken}"}`);
    }

    query = query.or(clauses.join(','));
  }

  if (filters.rateMin !== null && filters.rateMin !== undefined) query = query.gte('rate_max', filters.rateMin);
  if (filters.rateMax !== null && filters.rateMax !== undefined) query = query.lte('rate_min', filters.rateMax);
  const matches = (row: ServiceRow) => {
    if (excludeUserId && row.provider_id === excludeUserId) return false;
    if (
      !doesRateOverlap({
        itemMin: row.rate_min,
        itemMax: row.rate_max,
        filterMin: filters.rateMin,
        filterMax: filters.rateMax,
      })
    ) {
      return false;
    }
    if (!text) return true;
    return [
      row.title,
      row.description,
      row.category,
      row.custom_category,
      row.availability_text,
      row.rate_text,
      row.location_text,
      row.barangay,
      ...(row.tags ?? []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(text));
  };

  if (filters.compareReputation) query = query.order('id', { ascending: true });
  const results: ServiceSearchResult[] = [];
  try {
    // Comparison must reach older offers. The ordinary feed keeps its recent-page behavior.
    for (let offset = 0; ; offset += limit) {
      const { data, error } = await (filters.compareReputation ? query.range(offset, offset + limit - 1) : query.limit(limit));
      if (error) return { data: null, error: error.message };
      const page = (data as ServiceRow[] | null) ?? [];
      const rows = page.filter(matches);
      const providerIds = rows.map((row) => row.provider_id);
      const [visibleRows, profiles, stats] = await Promise.all([
        applyPublicPhotoVisibilityToRows(rows, 'service_photo'),
        loadPublicProfiles(providerIds),
        loadProviderStats(providerIds, filters.compareReputation),
      ]);
      results.push(...visibleRows.map((row) => mapServiceSearchResult(row, profiles, stats))
        .filter((service) => isPublicProfileVerified(service.provider)));
      if (!filters.compareReputation || page.length < limit) break;
    }
    return { data: results, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not load services.' };
  }
}

function normalizeLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return 40;
  return Math.max(1, Math.min(80, Math.floor(value)));
}

/**
 * A tag value safe to embed in a PostgREST `cs.{...}` array-containment filter.
 *
 * Tags are matched whole rather than as substrings, so only simple
 * letter/number/space tokens qualify. Anything containing quotes, braces,
 * commas, or other filter syntax is rejected instead of escaped.
 */
function getSearchableTagToken(value: string) {
  const token = value.trim();
  if (!token || token.length > 40) return null;
  return /^[a-zA-Z0-9 ]+$/.test(token) ? token : null;
}

function escapePostgrestFilterValue(value: string) {
  return value.replace(/[,%]/g, '\\$&');
}

export async function getServiceDetail(serviceId: string): Promise<ServiceResult<ServiceDetail>> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('id', serviceId)
    .maybeSingle<ServiceRow>();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: 'Service not found.' };
  }

  const [profiles, stats, providerServicesResult] = await Promise.all([
    loadPublicProfiles([data.provider_id]),
    loadProviderStats([data.provider_id]),
    supabase
      .from('services')
      .select(SERVICE_COLUMNS)
      .eq('provider_id', data.provider_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ]);

  const [visibleDetail, ...visibleProviderServices] = await applyPublicPhotoVisibilityToRows(
    [data, ...((providerServicesResult.data as ServiceRow[] | null) ?? [])],
    'service_photo',
  );
  const detail = mapServiceSearchResult(visibleDetail, profiles, stats);

  return {
    data: {
      ...detail,
      providerServices: visibleProviderServices.map(mapService),
    },
    error: null,
  };
}
