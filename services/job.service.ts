import {
  getServiceSearchValues,
  getServiceSearchValuesForOptions,
} from '@/constants/service-taxonomy';
import type { ServiceResult } from '@/services/auth.service';
import { applyPublicPhotoVisibilityToRows } from '@/services/content-visibility.service';
import {
    compactText,
    doesRateOverlap,
    getCurrentUserId,
    isPublicProfileVerified,
    loadPublicProfiles,
    mapJob,
    normalizeExperienceLevel,
    normalizeRateType,
    requireVerifiedUser,
    validateRateRange,
    type JobRow,
} from '@/services/marketplace.helpers';
import { requireVerifiedCompleteProfile } from '@/services/profile-completion.service';
import type {
  CreateJobInput,
  ExperienceLevel,
  JobDetail,
  JobDraftSummary,
  JobSearchFilters,
  JobStatus,
  JobSummary,
  RateType,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const JOB_COLUMNS =
  'id, owner_id, client_id, title, description, category, service_needed, tags, photo_urls, barangay, location, location_text, budget_min, budget_max, rate_type, budget_negotiable, workers_needed, schedule_text, experience_level, certification_required, certification_note, status, accepted_provider_id, allow_messages, auto_reply_enabled, auto_close_enabled, created_at, updated_at, closed_at';

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

  const [{ data: ownedJobs }, { data: clientJobs }] = await Promise.all([
    supabase.from('jobs').select('id, owner_id, client_id').in('owner_id', ids),
    supabase.from('jobs').select('id, owner_id, client_id').in('client_id', ids),
  ]);

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

  const allJobIds = Array.from(new Set(jobRows.map((job) => job.id)));
  if (allJobIds.length) {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('job_id, reviewee_id, rating')
      .in('job_id', allJobIds)
      .in('reviewee_id', ids);

    const reviewRows = ((reviews as { job_id: string; reviewee_id: string; rating: number }[] | null) ?? [])
      .filter((row) => ids.includes(row.reviewee_id));

    for (const id of ids) {
      const clientJobIds = jobsByClient.get(id) ?? new Set<string>();
      const clientReviews = reviewRows.filter((row) => row.reviewee_id === id && clientJobIds.has(row.job_id));
      const reviewCount = clientReviews.length;
      const averageRating = reviewCount
        ? clientReviews.reduce((total, row) => total + row.rating, 0) / reviewCount
        : null;
      const current = stats.get(id) ?? { jobsPostedCount: 0, averageRating: null, reviewCount: 0 };

      stats.set(id, {
        ...current,
        averageRating,
        reviewCount,
      });
    }
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
  const user = await requireVerifiedCompleteProfile('client');
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
  const budgetMin = input.budgetMin ?? null;
  const budgetMax = input.budgetMax ?? null;
  const rateType = normalizeRateType(input.rateType);
  const budgetRange = validateRateRange({ min: budgetMin, max: budgetMax, rateType });
  const experienceLevel = normalizeExperienceLevel(input.experienceLevel);

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

  if (!budgetRange.valid) {
    return { data: null, error: `Budget range: ${budgetRange.error ?? 'Enter a valid budget range.'}` };
  }

  const publicLocation = compactText(input.locationText) || compactText(input.barangay) || 'Barangay San Pedro';

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
      location: publicLocation,
      location_text: publicLocation,
      public_location_text: publicLocation,
      private_location_notes: compactText(input.privateLocationNotes) || null,
      budget: null,
      budget_amount: null,
      budget_min: budgetRange.min,
      budget_max: budgetRange.max,
      rate_type: budgetRange.rateType,
      budget_negotiable: input.budgetNegotiable ?? false,
      workers_needed: workersNeeded,
      schedule_text: compactText(input.scheduleText) || null,
      experience_level: experienceLevel,
      certification_required: input.certificationRequired ?? false,
      certification_note: compactText(input.certificationNote) || null,
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
  const text = compactText(filters.text).toLowerCase();
  const limit = normalizeLimit(filters.limit);
  let excludeUserId = compactText(filters.excludeUserId) || null;

  if (!excludeUserId && filters.excludeCurrentUser !== false) {
    const currentUser = await getCurrentUserId();
    excludeUserId = currentUser.data ?? null;
  }

  let query = supabase
    .from('jobs')
    .select(JOB_COLUMNS)
    .in('status', ['open', 'reviewing'])
    .order('created_at', { ascending: false });

  if (filters.category) {
    query = query.ilike('category', `%${filters.category}%`);
  }

  if (filters.serviceNeeded) {
    query = query.in('service_needed', getServiceSearchValues(filters.serviceNeeded));
  } else if (filters.serviceNeededIn?.length) {
    query = query.in('service_needed', getServiceSearchValuesForOptions(filters.serviceNeededIn));
  }

  if (filters.barangay) {
    query = query.ilike('barangay', `%${filters.barangay}%`);
  }

  if (excludeUserId) {
    query = query.neq('owner_id', excludeUserId);
  }

  if (filters.rateType && filters.rateType !== 'any') {
    query = query.eq('rate_type', filters.rateType);
  }

  if (filters.experienceLevel && filters.experienceLevel !== 'all') {
    query = query.eq('experience_level', filters.experienceLevel);
  }

  if (filters.certificationRequired !== undefined) {
    query = query.eq('certification_required', filters.certificationRequired);
  }

  if (text) {
    const escapedText = escapePostgrestFilterValue(text);
    query = query.or(
      [
        `title.ilike.%${escapedText}%`,
        `description.ilike.%${escapedText}%`,
        `category.ilike.%${escapedText}%`,
        `service_needed.ilike.%${escapedText}%`,
        `barangay.ilike.%${escapedText}%`,
        `location_text.ilike.%${escapedText}%`,
        `location.ilike.%${escapedText}%`,
      ].join(','),
    );
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  const rows = ((data as JobRow[] | null) ?? []).filter((row) => {
    if (excludeUserId && [row.owner_id, row.client_id].includes(excludeUserId)) return false;
    if (
      !doesRateOverlap({
        itemMin: row.budget_min,
        itemMax: row.budget_max,
        filterMin: filters.budgetMin,
        filterMax: filters.budgetMax,
      })
    ) {
      return false;
    }
    if (!text) return true;
    return [row.title, row.description, row.category, row.service_needed, row.barangay, row.location_text, row.location, ...(row.tags ?? [])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(text));
  });
  const visibleRows = await applyPublicPhotoVisibilityToRows(rows, 'job_photo');
  const profiles = await loadPublicProfiles(visibleRows.map((row) => row.client_id ?? row.owner_id));
  const jobs = visibleRows
    .map((row) => mapJob(row, profiles))
    .filter((job) => isPublicProfileVerified(job.client));
  const stats = await loadClientStats(jobs.map((job) => job.clientId));

  return { data: jobs.map((job) => applyClientStats(job, stats)), error: null };
}

export async function getOwnedJobForEdit(
  jobId: string,
): Promise<ServiceResult<JobDraftSummary>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('jobs')
    .select(
      'id, owner_id, client_id, title, description, category, service_needed, tags, photo_urls, barangay, location_text, private_location_notes, budget_min, budget_max, rate_type, budget_negotiable, workers_needed, schedule_text, experience_level, certification_required, certification_note, allow_messages, auto_reply_enabled, auto_close_enabled, status, created_at, updated_at',
    )
    .eq('id', jobId)
    .or(`owner_id.eq.${user.data},client_id.eq.${user.data}`)
    .maybeSingle<Record<string, unknown>>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Only the job owner can edit this post.' };
  if (!['open', 'reviewing', 'cancelled'].includes(String(data.status))) {
    return { data: null, error: 'Hired, completed, and closed jobs cannot be edited.' };
  }

  return {
    data: {
      id: String(data.id),
      userId: user.data,
      title: data.title ? String(data.title) : null,
      description: data.description ? String(data.description) : null,
      category: data.category ? String(data.category) : null,
      serviceNeeded: data.service_needed ? String(data.service_needed) : null,
      tags: (data.tags as string[] | null) ?? [],
      photoUrls: (data.photo_urls as string[] | null) ?? [],
      barangay: data.barangay ? String(data.barangay) : null,
      locationText: data.location_text ? String(data.location_text) : null,
      privateLocationNotes: data.private_location_notes ? String(data.private_location_notes) : null,
      budgetMin: data.budget_min === null ? null : Number(data.budget_min),
      budgetMax: data.budget_max === null ? null : Number(data.budget_max),
      rateType: normalizeRateType(data.rate_type as RateType),
      budgetNegotiable: Boolean(data.budget_negotiable),
      workersNeeded: data.workers_needed === null ? null : Number(data.workers_needed),
      scheduleText: data.schedule_text ? String(data.schedule_text) : null,
      experienceLevel: normalizeExperienceLevel(data.experience_level as ExperienceLevel),
      certificationRequired: Boolean(data.certification_required),
      certificationNote: data.certification_note ? String(data.certification_note) : null,
      allowMessages: data.allow_messages !== false,
      autoReplyEnabled: Boolean(data.auto_reply_enabled),
      autoCloseEnabled: Boolean(data.auto_close_enabled),
      createdAt: String(data.created_at),
      updatedAt: String(data.updated_at),
    },
    error: null,
  };
}

export async function updateJob(
  jobId: string,
  input: CreateJobInput,
): Promise<ServiceResult<JobSummary>> {
  const user = await requireVerifiedCompleteProfile('client');
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const editable = await getOwnedJobForEdit(jobId);
  if (editable.error || !editable.data) {
    return { data: null, error: editable.error ?? 'This job cannot be edited.' };
  }

  const title = compactText(input.title);
  const description = compactText(input.description);
  const category = compactText(input.category);
  const serviceNeeded = compactText(input.serviceNeeded);
  const rateType = normalizeRateType(input.rateType);
  const budgetRange = validateRateRange({
    min: input.budgetMin ?? null,
    max: input.budgetMax ?? null,
    rateType,
  });
  if (!title || !description || !category || !serviceNeeded) {
    return { data: null, error: 'Complete the job title, description, category, and service.' };
  }
  if (!budgetRange.valid) {
    return { data: null, error: `Budget range: ${budgetRange.error ?? 'Enter a valid budget range.'}` };
  }

  const publicLocation =
    compactText(input.locationText) || compactText(input.barangay) || 'Barangay San Pedro';
  const { data, error } = await supabase
    .from('jobs')
    .update({
      title,
      description,
      category,
      service_needed: serviceNeeded,
      tags: Array.from(new Set((input.tags ?? []).map(compactText).filter(Boolean))).slice(0, 4),
      photo_urls: Array.from(new Set((input.photoUrls ?? []).map(compactText).filter(Boolean))),
      barangay: compactText(input.barangay) || 'Barangay San Pedro',
      location: publicLocation,
      location_text: publicLocation,
      public_location_text: publicLocation,
      private_location_notes: compactText(input.privateLocationNotes) || null,
      budget_min: budgetRange.min,
      budget_max: budgetRange.max,
      rate_type: budgetRange.rateType,
      budget_negotiable: input.budgetNegotiable ?? false,
      workers_needed: input.workersNeeded ?? null,
      schedule_text: compactText(input.scheduleText) || null,
      experience_level: normalizeExperienceLevel(input.experienceLevel),
      certification_required: input.certificationRequired ?? false,
      certification_note: compactText(input.certificationNote) || null,
      allow_messages: input.allowMessages ?? true,
      auto_reply_enabled: input.autoReplyEnabled ?? false,
      auto_close_enabled: input.autoCloseEnabled ?? false,
    })
    .eq('id', jobId)
    .or(`owner_id.eq.${user.data},client_id.eq.${user.data}`)
    .in('status', ['open', 'reviewing', 'cancelled'])
    .select(JOB_COLUMNS)
    .maybeSingle<JobRow>();

  if (error) return { data: null, error: formatSupabaseError(error.message) };
  if (!data) return { data: null, error: 'This job is no longer editable.' };
  const profiles = await loadPublicProfiles([data.client_id ?? data.owner_id]);
  return { data: mapJob(data, profiles), error: null };
}

function normalizeLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return 40;
  return Math.max(1, Math.min(80, Math.floor(value)));
}

function escapePostgrestFilterValue(value: string) {
  return value.replace(/[,%]/g, '\\$&');
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

  const [visibleData] = await applyPublicPhotoVisibilityToRows([data], 'job_photo');
  const profiles = await loadPublicProfiles([visibleData.client_id ?? visibleData.owner_id]);
  const job = mapJob(visibleData, profiles);
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
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('jobs')
    .update({
      status,
      closed_at: ['completed', 'closed', 'cancelled'].includes(status) ? new Date().toISOString() : null,
    })
    .eq('id', jobId)
    .or(`owner_id.eq.${user.data},client_id.eq.${user.data}`)
    .select(JOB_COLUMNS)
    .maybeSingle<JobRow>();

  if (error) {
    return { data: null, error: formatSupabaseError(error.message) };
  }

  if (!data) {
    return { data: null, error: 'Only the job owner can change this post.' };
  }

  const profiles = await loadPublicProfiles([data.client_id ?? data.owner_id]);
  return { data: mapJob(data, profiles), error: null };
}

export function deactivateJob(jobId: string) {
  return updateJobStatus({ jobId, status: 'cancelled' });
}

export function reactivateJob(jobId: string) {
  return updateJobStatus({ jobId, status: 'open' });
}

export function closeJob(jobId: string) {
  return updateJobStatus({ jobId, status: 'closed' });
}
