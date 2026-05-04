import type { ServiceResult } from '@/services/auth.service';
import {
  compactText,
  loadPublicProfiles,
  getCurrentUserId,
  mapService,
  requireVerifiedUser,
  type ServiceRow,
} from '@/services/marketplace.helpers';
import type {
  CreateServiceInput,
  ProviderService,
  PublicProfileSummary,
  ServiceDetail,
  ServiceSearchResult,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const SERVICE_COLUMNS =
  'id, provider_id, category, title, description, tags, photo_urls, years_experience, availability_text, rate_text, barangay, location_text, allow_messages, auto_reply_enabled, auto_pause_enabled, is_active, created_at, updated_at';

type ProviderStats = {
  averageRating: number | null;
  reviewCount: number;
  completedJobsCount: number;
};

async function loadProviderStats(providerIds: string[]) {
  const ids = Array.from(new Set(providerIds.filter(Boolean)));
  const stats = new Map<string, ProviderStats>();

  if (!ids.length) {
    return stats;
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('reviewee_id, rating')
    .in('reviewee_id', ids);

  const reviewRows =
    ((reviews as { reviewee_id: string; rating: number }[] | null) ?? []).filter((row) =>
      ids.includes(row.reviewee_id),
    );

  for (const providerId of ids) {
    const providerReviews = reviewRows.filter((row) => row.reviewee_id === providerId);
    const reviewCount = providerReviews.length;
    const averageRating = reviewCount
      ? providerReviews.reduce((total, row) => total + row.rating, 0) / reviewCount
      : null;

    stats.set(providerId, {
      averageRating,
      reviewCount,
      completedJobsCount: 0,
    });
  }

  const { data: completedJobs } = await supabase
    .from('jobs')
    .select('accepted_provider_id, status')
    .in('accepted_provider_id', ids)
    .in('status', ['completed', 'closed']);

  for (const row of
    ((completedJobs as { accepted_provider_id: string | null; status: string }[] | null) ?? [])) {
    if (!row.accepted_provider_id) continue;

    const current = stats.get(row.accepted_provider_id) ?? {
      averageRating: null,
      reviewCount: 0,
      completedJobsCount: 0,
    };

    current.completedJobsCount += 1;
    stats.set(row.accepted_provider_id, current);
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
  const user = await requireVerifiedUser();
  if (user.error) return user;

  const category = compactText(input.category);
  const title = compactText(input.title);
  const tags = Array.from(new Set((input.tags ?? []).map(compactText).filter(Boolean))).slice(0, 4);

  if (!category || !title) {
    return { data: null, error: 'Enter a service category and title.' };
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
      barangay: compactText(input.barangay) || null,
      location_text: compactText(input.locationText) || compactText(input.barangay) || null,
      allow_messages: input.allowMessages ?? true,
      auto_reply_enabled: input.autoReplyEnabled ?? false,
      auto_pause_enabled: input.autoPauseEnabled ?? false,
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

export async function searchServices(filters: { text?: string } = {}): Promise<
  ServiceResult<ServiceSearchResult[]>
> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const text = compactText(filters.text).toLowerCase();
  const rows = ((data as ServiceRow[] | null) ?? []).filter((row) => {
    if (!text) return true;
    return [
      row.title,
      row.description,
      row.category,
      row.availability_text,
      row.rate_text,
      row.location_text,
      row.barangay,
      ...(row.tags ?? []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(text));
  });
  const profiles = await loadPublicProfiles(rows.map((row) => row.provider_id));
  const stats = await loadProviderStats(rows.map((row) => row.provider_id));

  return {
    data: rows.map((row) => mapServiceSearchResult(row, profiles, stats)),
    error: null,
  };
}

export async function getServiceDetail(serviceId: string): Promise<ServiceResult<ServiceDetail>> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('id', serviceId)
    .eq('is_active', true)
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

  const providerServices = ((providerServicesResult.data as ServiceRow[] | null) ?? []).map(mapService);
  const detail = mapServiceSearchResult(data, profiles, stats);

  return {
    data: {
      ...detail,
      providerServices,
    },
    error: null,
  };
}
