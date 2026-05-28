import type { ServiceResult } from '@/services/auth.service';
import { applyPublicPhotoVisibilityToRows } from '@/services/content-visibility.service';
import { compactText, loadPublicProfiles, mapJob, type JobRow } from '@/services/marketplace.helpers';
import type { PublicClientProfile } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const PUBLIC_JOB_COLUMNS =
  'id, owner_id, client_id, title, description, category, service_needed, tags, photo_urls, barangay, location, location_text, budget_min, budget_max, rate_type, budget_negotiable, workers_needed, schedule_text, experience_level, certification_required, certification_note, status, accepted_provider_id, allow_messages, auto_reply_enabled, auto_close_enabled, created_at, updated_at, closed_at';

export async function getPublicClientProfile(
  clientId: string,
  options: { sourceJobId?: string | null } = {},
): Promise<ServiceResult<PublicClientProfile | null>> {
  const id = compactText(clientId);
  if (!id) return { data: null, error: 'Client profile not found.' };
  const sourceJobId = compactText(options.sourceJobId) || null;

  const [publicProfiles, jobsResult, selectedJobResult, reviewsResult, jobsCountResult] =
    await Promise.all([
      loadPublicProfiles([id]),
      supabase
        .from('jobs')
        .select(PUBLIC_JOB_COLUMNS)
        .or(`owner_id.eq.${id},client_id.eq.${id}`)
        .in('status', ['open', 'reviewing'])
        .order('created_at', { ascending: false })
        .limit(8),
      sourceJobId
        ? supabase
            .from('jobs')
            .select(PUBLIC_JOB_COLUMNS)
            .eq('id', sourceJobId)
            .or(`owner_id.eq.${id},client_id.eq.${id}`)
            .maybeSingle<JobRow>()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('reviews').select('rating').eq('reviewee_id', id),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .or(`owner_id.eq.${id},client_id.eq.${id}`),
    ]);

  const profile = publicProfiles.get(id) ?? null;
  if (!profile) return { data: null, error: null };
  if (jobsResult.error) return { data: null, error: jobsResult.error.message };
  if (selectedJobResult.error) return { data: null, error: selectedJobResult.error.message };
  if (reviewsResult.error) return { data: null, error: reviewsResult.error.message };
  if (jobsCountResult.error) return { data: null, error: jobsCountResult.error.message };

  const jobs = ((jobsResult.data as JobRow[] | null) ?? []).filter(
    (job) => (job.client_id ?? job.owner_id) === id,
  );
  const visibleJobs = await applyPublicPhotoVisibilityToRows(jobs, 'job_photo');
  const visibleSelectedJobRows = selectedJobResult.data
    ? await applyPublicPhotoVisibilityToRows([selectedJobResult.data as JobRow], 'job_photo')
    : [];
  const selectedJob = visibleSelectedJobRows[0] ? mapJob(visibleSelectedJobRows[0], publicProfiles) : null;
  const activeJobs = visibleJobs
    .filter((job) => job.id !== selectedJob?.id)
    .map((job) => mapJob(job, publicProfiles));
  const reviewRows = ((reviewsResult.data as { rating: number }[] | null) ?? []).filter(
    (review) => Number.isFinite(review.rating),
  );
  const reviewCount = reviewRows.length;
  const averageRating = reviewCount
    ? reviewRows.reduce((total, review) => total + review.rating, 0) / reviewCount
    : null;

  return {
    data: {
      id: profile.id,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      publicLocation: compactText(profile.approximateLocation) || 'Barangay unavailable',
      about: compactText(profile.about) || null,
      availability: compactText(profile.availability) || null,
      barangayVerifiedAt: profile.barangayVerifiedAt,
      verifiedAt: profile.verifiedAt,
      jobsPostedCount: jobsCountResult.count ?? 0,
      averageRating,
      reviewCount,
      selectedJob,
      activeJobs,
    },
    error: null,
  };
}
