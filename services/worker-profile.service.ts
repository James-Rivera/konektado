import { splitOfficialAndCustomServices } from '@/constants/service-taxonomy';
import type { ServiceResult } from '@/services/auth.service';
import {
  applyPublicPhotoVisibilityToRows,
  getVisibleProfileAvatarUrl,
} from '@/services/content-visibility.service';
import { listApprovedCredentialsForProvider } from '@/services/credential.service';
import {
  compactText,
  formatPublicLocation,
  loadPublicProfiles,
  mapService,
  type ServiceRow,
} from '@/services/marketplace.helpers';
import { getPublicProfileTrustSummary } from '@/services/review.service';
import type { PublicProfileHistoryItem, PublicWorkerProfile } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const SERVICE_COLUMNS =
  'id, provider_id, category, title, description, tags, photo_urls, years_experience, availability_text, rate_text, rate_min, rate_max, rate_type, rate_negotiable, experience_level, certification_available, certification_note, custom_category, custom_category_review_status, barangay, location_text, allow_messages, auto_reply_enabled, auto_pause_enabled, is_active, created_at, updated_at';
const JOB_HISTORY_COLUMNS =
  'id, title, category, service_needed, barangay, location_text, status, closed_at, updated_at, created_at';

type JobHistoryRow = {
  id: string;
  title: string | null;
  category: string | null;
  service_needed: string | null;
  barangay: string | null;
  location_text: string | null;
  status: string;
  closed_at: string | null;
  updated_at: string;
  created_at: string;
};

type ProviderProfileRow = {
  user_id: string;
  service_type: string | null;
  bio: string | null;
  service_area: string | null;
  availability: string | null;
  custom_offered_services: string[] | null;
};

export async function listWorkerHistory(workerId: string): Promise<ServiceResult<PublicProfileHistoryItem[]>> {
  const id = compactText(workerId);
  if (!id) return { data: [], error: null };
  const result = await getPublicProfileTrustSummary(id, 'worker');
  if (result.error) return { data: null, error: result.error };
  return {
    data: (result.data?.history ?? []).map((item) => ({
      ...item,
      category: null,
      locationText: null,
    })),
    error: null,
  };
}

export async function getPublicWorkerProfile(
  workerId: string,
  options: { sourceServiceId?: string | null } = {},
): Promise<ServiceResult<PublicWorkerProfile | null>> {
  const id = compactText(workerId);
  if (!id) return { data: null, error: 'Worker profile not found.' };

  const sourceServiceId = compactText(options.sourceServiceId) || null;
  const [
    profiles,
    providerResult,
    servicesResult,
    selectedServiceResult,
    credentialResult,
    trustResult,
  ] = await Promise.all([
    loadPublicProfiles([id]),
    supabase
      .rpc('get_public_provider_profile_summaries', { p_user_ids: [id] }),
    supabase
      .from('services')
      .select(SERVICE_COLUMNS)
      .eq('provider_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10),
    sourceServiceId
      ? supabase
          .from('services')
          .select(SERVICE_COLUMNS)
          .eq('id', sourceServiceId)
          .eq('provider_id', id)
          .maybeSingle<ServiceRow>()
      : Promise.resolve({ data: null, error: null }),
    listApprovedCredentialsForProvider(id),
    getPublicProfileTrustSummary(id, 'worker'),
  ]);

  if (providerResult.error) return { data: null, error: providerResult.error.message };
  if (servicesResult.error) return { data: null, error: servicesResult.error.message };
  if (selectedServiceResult.error) return { data: null, error: selectedServiceResult.error.message };
  if (credentialResult.error) return { data: null, error: credentialResult.error };
  if (trustResult.error) return { data: null, error: trustResult.error };

  const profile = profiles.get(id);
  if (!profile) return { data: null, error: null };

  const [visibleSelectedService] = selectedServiceResult.data
    ? await applyPublicPhotoVisibilityToRows([selectedServiceResult.data as ServiceRow], 'service_photo')
    : [null];
  const visibleServices = await applyPublicPhotoVisibilityToRows(
    ((servicesResult.data as ServiceRow[] | null) ?? []),
    'service_photo',
  );
  const selectedService = visibleSelectedService ? mapService(visibleSelectedService) : null;
  const services = visibleServices
    .filter((service) => service.id !== selectedService?.id)
    .map(mapService);
  const avatarUrl = await getVisibleProfileAvatarUrl({
    avatarUrl: profile.avatarUrl,
    profileId: profile.id,
  });
  const providerProfile = ((providerResult.data as ProviderProfileRow[] | null) ?? [])[0] ?? null;
  const capabilitySplit = splitOfficialAndCustomServices([
    ...splitServices(providerProfile?.service_type),
    ...(providerProfile?.custom_offered_services ?? []),
  ]);
  const skills = uniqueList([...capabilitySplit.official, ...capabilitySplit.custom]);
  const trust = trustResult.data;

  return {
    data: {
      id: profile.id,
      fullName: profile.fullName,
      avatarUrl,
      publicLocation:
        compactText(profile.approximateLocation) ||
        formatPublicLocation({
          barangay: profile.barangay,
          city: profile.city,
        }),
      about: compactText(providerProfile?.bio) || compactText(profile.about) || null,
      availability: compactText(providerProfile?.availability) || null,
      capabilities: skills,
      skills,
      serviceArea: compactText(providerProfile?.service_area) || null,
      barangayVerifiedAt: profile.barangayVerifiedAt,
      verifiedAt: profile.verifiedAt,
      completedJobsCount: trust?.completedJobsCount ?? 0,
      averageRating: trust?.averageRating ?? null,
      reviewCount: trust?.reviewCount ?? 0,
      credentials: credentialResult.data ?? [],
      reviews: trust?.reviews ?? [],
      workHistory: (trust?.history ?? []).map((item) => ({
        ...item,
        category: null,
        locationText: null,
      })),
      selectedService,
      services,
    },
    error: null,
  };
}

function splitServices(value: string | null | undefined) {
  return uniqueList((value ?? '').split(','));
}

function mapJobHistoryItem(row: JobHistoryRow): PublicProfileHistoryItem {
  return {
    id: row.id,
    title: compactText(row.title) || compactText(row.service_needed) || compactText(row.category) || 'Completed work',
    serviceLabel: compactText(row.service_needed) || null,
    category: compactText(row.category) || null,
    locationText: compactText(row.location_text) || compactText(row.barangay) || null,
    completedAt: row.closed_at ?? row.updated_at ?? row.created_at,
  };
}

function uniqueList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => compactText(value)).filter(Boolean)),
  );
}
