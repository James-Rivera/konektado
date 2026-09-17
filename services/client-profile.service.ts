import type { ServiceResult } from '@/services/auth.service';
import { applyPublicPhotoVisibilityToRows } from '@/services/content-visibility.service';
import { compactText, loadPublicProfiles, mapJob, type JobRow } from '@/services/marketplace.helpers';
import { getPublicProfileTrustSummary } from '@/services/review.service';
import type { PublicClientProfile, PublicProfileHistoryItem } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const PUBLIC_JOB_COLUMNS =
  'id, owner_id, client_id, title, description, category, service_needed, tags, photo_urls, barangay, location, location_text, budget_min, budget_max, rate_type, budget_negotiable, workers_needed, schedule_text, experience_level, certification_required, certification_note, status, accepted_provider_id, allow_messages, auto_reply_enabled, auto_close_enabled, created_at, updated_at, closed_at';

type ClientProfileRow = {
  user_id: string;
  headline: string | null;
  bio: string | null;
  needed_services: string[] | null;
  custom_needed_services: string[] | null;
  coordination_style: string | null;
  preferred_schedule: string | null;
};

export async function listClientHiringHistory(clientId: string): Promise<ServiceResult<PublicProfileHistoryItem[]>> {
  const id = compactText(clientId);
  if (!id) return { data: [], error: null };
  const result = await getPublicProfileTrustSummary(id, 'client');
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

export async function getPublicClientProfile(
  clientId: string,
  options: { sourceJobId?: string | null } = {},
): Promise<ServiceResult<PublicClientProfile | null>> {
  const id = compactText(clientId);
  if (!id) return { data: null, error: 'Client profile not found.' };
  const sourceJobId = compactText(options.sourceJobId) || null;

  const [
    publicProfiles,
    clientProfileResult,
    jobsResult,
    selectedJobResult,
    trustResult,
  ] =
    await Promise.all([
      loadPublicProfiles([id]),
      supabase
        .rpc('get_public_client_profile_summaries', { p_user_ids: [id] }),
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
      getPublicProfileTrustSummary(id, 'client'),
    ]);

  const profile = publicProfiles.get(id) ?? null;
  if (!profile) return { data: null, error: null };
  if (clientProfileResult.error) return { data: null, error: clientProfileResult.error.message };
  if (jobsResult.error) return { data: null, error: jobsResult.error.message };
  if (selectedJobResult.error) return { data: null, error: selectedJobResult.error.message };
  if (trustResult.error) return { data: null, error: trustResult.error };

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
  const clientProfile = ((clientProfileResult.data as ClientProfileRow[] | null) ?? [])[0] ?? null;
  const trust = trustResult.data;
  const commonNeeds = uniqueList([
    ...(clientProfile?.needed_services ?? []),
    ...(clientProfile?.custom_needed_services ?? []),
  ]);

  return {
    data: {
      id: profile.id,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      publicLocation: compactText(profile.approximateLocation) || 'Barangay unavailable',
      about: compactText(clientProfile?.bio) || compactText(profile.about) || null,
      coordinationStyle: compactText(clientProfile?.coordination_style) || null,
      preferredSchedule: compactText(clientProfile?.preferred_schedule) || null,
      commonNeeds,
      barangayVerifiedAt: profile.barangayVerifiedAt,
      verifiedAt: profile.verifiedAt,
      jobsPostedCount: trust?.jobsPostedCount ?? 0,
      completedHiresCount: trust?.completedJobsCount ?? 0,
      averageRating: trust?.averageRating ?? null,
      reviewCount: trust?.reviewCount ?? 0,
      reviews: trust?.reviews ?? [],
      hiringHistory: (trust?.history ?? []).map((item) => ({
        ...item,
        category: null,
        locationText: null,
      })),
      selectedJob,
      activeJobs,
    },
    error: null,
  };
}

function uniqueList(values: (string | null | undefined)[]) {
  return Array.from(
    new Set(values.map((value) => compactText(value)).filter(Boolean)),
  );
}
