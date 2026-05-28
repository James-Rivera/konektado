import type { ServiceResult } from '@/services/auth.service';
import {
  applyPublicPhotoVisibilityToRows,
  getVisibleProfileAvatarUrl,
} from '@/services/content-visibility.service';
import {
  compactText,
  formatPublicLocation,
  loadPublicProfiles,
  mapService,
  type ServiceRow,
} from '@/services/marketplace.helpers';
import type { PublicWorkerProfile } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const SERVICE_COLUMNS =
  'id, provider_id, category, title, description, tags, photo_urls, years_experience, availability_text, rate_text, rate_min, rate_max, rate_type, rate_negotiable, experience_level, certification_available, certification_note, custom_category, custom_category_review_status, barangay, location_text, allow_messages, auto_reply_enabled, auto_pause_enabled, is_active, created_at, updated_at';

type WorkerStats = {
  averageRating: number | null;
  completedJobsCount: number;
  reviewCount: number;
};

async function loadWorkerStats(workerId: string): Promise<WorkerStats> {
  const [{ data: reviews }, { data: completedJobs }] = await Promise.all([
    supabase.from('reviews').select('rating').eq('reviewee_id', workerId),
    supabase
      .from('jobs')
      .select('id')
      .eq('accepted_provider_id', workerId)
      .in('status', ['completed', 'closed']),
  ]);

  const reviewRows = ((reviews as { rating: number }[] | null) ?? []).filter((row) =>
    Number.isFinite(row.rating),
  );
  const reviewCount = reviewRows.length;

  return {
    averageRating: reviewCount
      ? reviewRows.reduce((total, row) => total + row.rating, 0) / reviewCount
      : null,
    completedJobsCount: ((completedJobs as { id: string }[] | null) ?? []).length,
    reviewCount,
  };
}

export async function getPublicWorkerProfile(
  workerId: string,
  options: { sourceServiceId?: string | null } = {},
): Promise<ServiceResult<PublicWorkerProfile | null>> {
  const id = compactText(workerId);
  if (!id) return { data: null, error: 'Worker profile not found.' };

  const sourceServiceId = compactText(options.sourceServiceId) || null;
  const [profiles, servicesResult, selectedServiceResult, stats] = await Promise.all([
    loadPublicProfiles([id]),
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
    loadWorkerStats(id),
  ]);

  if (servicesResult.error) return { data: null, error: servicesResult.error.message };
  if (selectedServiceResult.error) return { data: null, error: selectedServiceResult.error.message };

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
      about: compactText(profile.about) || null,
      availability: compactText(profile.availability) || null,
      barangayVerifiedAt: profile.barangayVerifiedAt,
      verifiedAt: profile.verifiedAt,
      completedJobsCount: stats.completedJobsCount,
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
      selectedService,
      services,
    },
    error: null,
  };
}
