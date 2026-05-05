import type { ServiceResult } from '@/services/auth.service';
import {
    compactText,
    getCurrentUserId,
    loadPublicProfiles,
    mapJob,
    requireVerifiedUser,
    type JobRow,
} from '@/services/marketplace.helpers';
import type {
    CreateJobInput,
    JobDetail,
    JobSearchFilters,
    JobStatus,
    JobSummary,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const JOB_COLUMNS =
  'id, owner_id, client_id, title, description, category, service_needed, tags, photo_urls, barangay, location, location_text, budget, budget_amount, workers_needed, schedule_text, status, accepted_provider_id, allow_messages, auto_reply_enabled, auto_close_enabled, created_at, updated_at, closed_at';

type ClientStats = {
  averageRating: number | null;
  reviewCount: number;
  jobsPostedCount: number;
};

function formatSupabaseError(message: string) {
  if (message.toLowerCase().includes('row-level security')) {
    return 'Complete barangay verification before posting or changing jobs.';
  }

  return message;
}

async function loadClientStats(clientIds: string[]) {
  const ids = Array.from(new Set(clientIds.filter(Boolean)));
  const stats = new Map<string, ClientStats>();

  for (const id of ids) {
    stats.set(id, {
      averageRating: null,
      reviewCount: 0,
      jobsPostedCount: 0,
    });
  }

  if (!ids.length) {
    return stats;
  }

  const [{ data: reviews }, { data: ownedJobs }, { data: clientJobs }] = await Promise.all([
    supabase.from('reviews').select('reviewee_id, rating').in('reviewee_id', ids),
    supabase.from('jobs').select('id, owner_id, client_id').in('owner_id', ids),
    supabase.from('jobs').select('id, owner_id, client_id').in('client_id', ids),
  ]);

  const reviewRows = ((reviews as { reviewee_id: string; rating: number }[] | null) ?? []).filter(
    (row) => ids.includes(row.reviewee_id),
  );

  for (const id of ids) {
    const clientReviews = reviewRows.filter((row) => row.reviewee_id === id);
    const reviewCount = clientReviews.length;
    const averageRating = reviewCount
      ? clientReviews.reduce((total, row) => total + row.rating, 0) / reviewCount
      : null;

    stats.set(id, {
      ...(stats.get(id) ?? { jobsPostedCount: 0 }),
      averageRating,
      reviewCount,
    });
  }

  const jobsByClient = new Map<string, Set<string>>();
  const jobRows = [
    ...((ownedJobs as { id: string; owner_id: string; client_id: string | null }[] | null) ?? []),
    ...((clientJobs as { id: string; owner_id: string; client_id: string | null }[] | null) ?? []),
  ];

  for (const row of jobRows) {
    const matchingClientIds = [row.owner_id, row.client_id].filter(
      (value): value is string => Boolean(value && ids.includes(value)),
    );

    for (const clientId of matchingClientIds) {
      const current = jobsByClient.get(clientId) ?? new Set<string>();
      current.add(row.id);
      jobsByClient.set(clientId, current);
    }
  }

  for (const [id, jobs] of jobsByClient) {
    const current = stats.get(id) ?? {
      averageRating: null,
      reviewCount: 0,
      jobsPostedCount: 0,
    };

    stats.set(id, {
      ...current,
      jobsPostedCount: jobs.size,
    });
  }

  return stats;
}

function applyClientStats(job: JobSummary, stats: Map<string, ClientStats>): JobSummary {
  const clientStats = stats.get(job.clientId);

  return {
    ...job,
    clientAverageRating: clientStats?.averageRating ?? null,
    clientReviewCount: clientStats?.reviewCount ?? 0,
    clientJobsPostedCount: clientStats?.jobsPostedCount ?? 0,
  };
}

export async function createJob(input: CreateJobInput): Promise<ServiceResult<JobSummary>> {
  const user = await requireVerifiedUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };
  const userId = user.data;

  const title = compactText(input.title);
  const description = compactText(input.description);
  const category = compactText(input.category);
  const tags = Array.from(new Set((input.tags ?? []).map(compactText).filter(Boolean))).slice(0, 4);
  const photoUrls = Array.from(new Set((input.photoUrls ?? []).map(compactText).filter(Boolean)));
  const workersNeeded = input.workersNeeded ?? null;
  const serviceNeeded = compactText(input.serviceNeeded) || null;

  if (!title) {
    return { data: null, error: 'Enter a job title.' };
  }

  if (!description) {
    return { data: null, error: 'Describe the work so nearby workers know what to expect.' };
  }

  if (!category) {
    return { data: null, error: 'Choose a job category.' };
  }

  if (!serviceNeeded) {
    return { data: null, error: 'Choose the service needed.' };
  }

  if (workersNeeded !== null && (!Number.isFinite(workersNeeded) || workersNeeded < 1)) {
    return { data: null, error: 'Workers needed must be at least 1.' };
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      owner_id: userId,
      client_id: userId,
      title,
      description,
      category,
      service_needed: serviceNeeded,
      tags,
      photo_urls: photoUrls,
      barangay: compactText(input.barangay) || 'Barangay San Pedro',
      location: compactText(input.locationText) || null,
      location_text: compactText(input.locationText) || null,
      budget: input.budgetAmount ?? null,
      budget_amount: input.budgetAmount ?? null,
      workers_needed: workersNeeded,
      schedule_text: compactText(input.scheduleText) || null,
      allow_messages: input.allowMessages ?? true,
      auto_reply_enabled: input.autoReplyEnabled ?? false,
      auto_close_enabled: input.autoCloseEnabled ?? false,
      status: 'open',
    })
    .select(JOB_COLUMNS)
    .single<JobRow>();

  if (error) {
    return { data: null, error: formatSupabaseError(error.message) };
  }

  const profiles = await loadPublicProfiles([userId]);
  return { data: mapJob(data, profiles), error: null };
}

export async function listMyJobs(): Promise<ServiceResult<JobSummary[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };
  const userId = user.data;

  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_COLUMNS)
    .or(`owner_id.eq.${userId},client_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const rows = (data as JobRow[] | null) ?? [];
  const profiles = await loadPublicProfiles(rows.map((row) => row.client_id ?? row.owner_id));
  const jobs = rows.map((row) => mapJob(row, profiles));
  const stats = await loadClientStats(jobs.map((job) => job.clientId));
  return { data: jobs.map((job) => applyClientStats(job, stats)), error: null };
}

export async function searchJobs(filters: JobSearchFilters = {}): Promise<ServiceResult<JobSummary[]>> {
  let query = supabase
    .from('jobs')
    .select(JOB_COLUMNS)
    .in('status', ['open', 'reviewing'])
    .order('created_at', { ascending: false });

  if (filters.category) {
    query = query.ilike('category', `%${filters.category}%`);
  }

  if (filters.barangay) {
    query = query.ilike('barangay', `%${filters.barangay}%`);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  const text = compactText(filters.text).toLowerCase();
  const rows = ((data as JobRow[] | null) ?? []).filter((row) => {
    if (!text) return true;
    return [row.title, row.description, row.category, row.service_needed, row.barangay, row.location_text, row.location]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(text));
  });
  const profiles = await loadPublicProfiles(rows.map((row) => row.client_id ?? row.owner_id));
  const jobs = rows.map((row) => mapJob(row, profiles));
  const stats = await loadClientStats(jobs.map((job) => job.clientId));

  return { data: jobs.map((job) => applyClientStats(job, stats)), error: null };
}

export async function getJobDetail(jobId: string): Promise<ServiceResult<JobDetail>> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_COLUMNS)
    .eq('id', jobId)
    .maybeSingle<JobRow>();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: 'Job not found.' };
  }

  const profiles = await loadPublicProfiles([data.client_id ?? data.owner_id]);
  const job = mapJob(data, profiles);
  const stats = await loadClientStats([job.clientId]);

  return {
    data: {
      ...applyClientStats(job, stats),
      closedAt: data.closed_at ?? null,
    },
    error: null,
  };
}

export async function updateJobStatus({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}): Promise<ServiceResult<JobSummary>> {
  const user = await requireVerifiedUser();
  if (user.error) return user;

  const { data, error } = await supabase
    .from('jobs')
    .update({
      status,
      closed_at: ['completed', 'closed', 'cancelled'].includes(status) ? new Date().toISOString() : null,
    })
    .eq('id', jobId)
    .select(JOB_COLUMNS)
    .single<JobRow>();

  if (error) {
    return { data: null, error: formatSupabaseError(error.message) };
  }

  const profiles = await loadPublicProfiles([data.client_id ?? data.owner_id]);
  return { data: mapJob(data, profiles), error: null };
}
