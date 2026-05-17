import type { ServiceResult } from '@/services/auth.service';
import { compactText, formatBarangayDisplay, loadPublicProfiles, mapJob, type JobRow } from '@/services/marketplace.helpers';
import type { PublicClientProfile } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const PUBLIC_CLIENT_PROFILE_COLUMNS =
  'id, full_name, first_name, last_name, barangay, city, avatar_url, verified_at, barangay_verified_at';
const PUBLIC_JOB_COLUMNS =
  'id, owner_id, client_id, title, description, category, service_needed, tags, photo_urls, barangay, location, location_text, budget, budget_amount, budget_min, budget_max, rate_type, budget_negotiable, workers_needed, schedule_text, experience_level, certification_required, certification_note, status, accepted_provider_id, allow_messages, auto_reply_enabled, auto_close_enabled, created_at, updated_at, closed_at';

type PublicClientProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  barangay: string | null;
  city: string | null;
  avatar_url: string | null;
  verified_at: string | null;
  barangay_verified_at: string | null;
};

export async function getPublicClientProfile(
  clientId: string,
): Promise<ServiceResult<PublicClientProfile | null>> {
  const id = compactText(clientId);
  if (!id) return { data: null, error: 'Client profile not found.' };

  const [{ data: profile, error: profileError }, jobsResult, reviewsResult, jobsCountResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(PUBLIC_CLIENT_PROFILE_COLUMNS)
        .eq('id', id)
        .maybeSingle<PublicClientProfileRow>(),
      supabase
        .from('jobs')
        .select(PUBLIC_JOB_COLUMNS)
        .or(`owner_id.eq.${id},client_id.eq.${id}`)
        .in('status', ['open', 'reviewing'])
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('reviews').select('rating').eq('reviewee_id', id),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .or(`owner_id.eq.${id},client_id.eq.${id}`),
    ]);

  if (profileError) return { data: null, error: profileError.message };
  if (!profile) return { data: null, error: null };
  if (jobsResult.error) return { data: null, error: jobsResult.error.message };
  if (reviewsResult.error) return { data: null, error: reviewsResult.error.message };
  if (jobsCountResult.error) return { data: null, error: jobsCountResult.error.message };

  const jobs = ((jobsResult.data as JobRow[] | null) ?? []).filter(
    (job) => (job.client_id ?? job.owner_id) === id,
  );
  const publicProfiles = await loadPublicProfiles([id]);
  const activeJobs = jobs.map((job) => mapJob(job, publicProfiles));
  const reviewRows = ((reviewsResult.data as { rating: number }[] | null) ?? []).filter(
    (review) => Number.isFinite(review.rating),
  );
  const reviewCount = reviewRows.length;
  const averageRating = reviewCount
    ? reviewRows.reduce((total, review) => total + review.rating, 0) / reviewCount
    : null;
  const displayName =
    compactText(profile.full_name) ||
    `${compactText(profile.first_name)} ${compactText(profile.last_name)}`.trim() ||
    'Konektado resident';

  return {
    data: {
      id: profile.id,
      fullName: displayName,
      avatarUrl: compactText(profile.avatar_url) || null,
      publicLocation: formatPublicClientLocation(profile),
      barangayVerifiedAt: profile.barangay_verified_at,
      verifiedAt: profile.verified_at,
      jobsPostedCount: jobsCountResult.count ?? 0,
      averageRating,
      reviewCount,
      activeJobs,
    },
    error: null,
  };
}

function formatPublicClientLocation(profile: Pick<PublicClientProfileRow, 'barangay' | 'city'>) {
  const barangay = formatBarangayDisplay(profile.barangay);
  const city = compactText(profile.city);

  if (barangay && city) return `${barangay}, ${city}`;
  return barangay || city || 'Barangay unavailable';
}
