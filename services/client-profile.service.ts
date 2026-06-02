import type { ServiceResult } from '@/services/auth.service';
import { applyPublicPhotoVisibilityToRows } from '@/services/content-visibility.service';
import { compactText, loadPublicProfiles, mapJob, type JobRow } from '@/services/marketplace.helpers';
import { listClientReviews } from '@/services/review.service';
import type { PublicClientProfile, PublicProfileHistoryItem } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const PUBLIC_JOB_COLUMNS =
  'id, owner_id, client_id, title, description, category, service_needed, tags, photo_urls, barangay, location, location_text, budget_min, budget_max, rate_type, budget_negotiable, workers_needed, schedule_text, experience_level, certification_required, certification_note, status, accepted_provider_id, allow_messages, auto_reply_enabled, auto_close_enabled, created_at, updated_at, closed_at';
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

  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_HISTORY_COLUMNS)
    .or(`owner_id.eq.${id},client_id.eq.${id}`)
    .in('status', ['completed', 'closed'])
    .order('closed_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(6);

  if (error) return { data: null, error: error.message };

  return {
    data: ((data as JobHistoryRow[] | null) ?? []).map(mapJobHistoryItem),
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
    reviewResult,
    jobsCountResult,
    completedJobsResult,
    historyResult,
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
      listClientReviews(id),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .or(`owner_id.eq.${id},client_id.eq.${id}`),
      supabase
        .from('jobs')
        .select('id')
        .or(`owner_id.eq.${id},client_id.eq.${id}`)
        .in('status', ['completed', 'closed']),
      listClientHiringHistory(id),
    ]);

  const profile = publicProfiles.get(id) ?? null;
  if (!profile) return { data: null, error: null };
  if (clientProfileResult.error) return { data: null, error: clientProfileResult.error.message };
  if (jobsResult.error) return { data: null, error: jobsResult.error.message };
  if (selectedJobResult.error) return { data: null, error: selectedJobResult.error.message };
  if (reviewResult.error) return { data: null, error: reviewResult.error };
  if (jobsCountResult.error) return { data: null, error: jobsCountResult.error.message };
  if (completedJobsResult.error) return { data: null, error: completedJobsResult.error.message };
  if (historyResult.error) return { data: null, error: historyResult.error };

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
  const reviews = reviewResult.data ?? [];
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviewCount
    : null;
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
      jobsPostedCount: jobsCountResult.count ?? 0,
      completedHiresCount: ((completedJobsResult.data as { id: string }[] | null) ?? []).length,
      averageRating,
      reviewCount,
      reviews,
      hiringHistory: historyResult.data ?? [],
      selectedJob,
      activeJobs,
    },
    error: null,
  };
}

function uniqueList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => compactText(value)).filter(Boolean)),
  );
}

function mapJobHistoryItem(row: JobHistoryRow): PublicProfileHistoryItem {
  return {
    id: row.id,
    title: compactText(row.title) || compactText(row.service_needed) || compactText(row.category) || 'Completed hire',
    serviceLabel: compactText(row.service_needed) || null,
    category: compactText(row.category) || null,
    locationText: compactText(row.location_text) || compactText(row.barangay) || null,
    completedAt: row.closed_at ?? row.updated_at ?? row.created_at,
  };
}
