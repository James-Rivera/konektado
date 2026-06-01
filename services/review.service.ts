import type { ServiceResult } from '@/services/auth.service';
import {
  compactText,
  getCurrentUserId,
  loadPublicProfiles,
} from '@/services/marketplace.helpers';
import { requireVerifiedCompleteProfile } from '@/services/profile-completion.service';
import type { CreateReviewInput, Review } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const REVIEW_COLUMNS =
  'id, job_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at';

type ReviewRow = {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

async function mapReviewRows(rows: ReviewRow[]): Promise<Review[]> {
  const reviewers = await loadPublicProfiles(rows.map((row) => row.reviewer_id));

  return rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewer: reviewers.get(row.reviewer_id) ?? null,
  }));
}

export async function getMyReviewForJob({
  jobId,
  revieweeId,
}: {
  jobId: string;
  revieweeId: string;
}): Promise<ServiceResult<Review | null>> {
  const currentUser = await getCurrentUserId();
  if (currentUser.error) return currentUser;
  if (!currentUser.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .eq('job_id', jobId)
    .eq('reviewer_id', currentUser.data)
    .eq('reviewee_id', revieweeId)
    .maybeSingle<ReviewRow>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  const [review] = await mapReviewRows([data]);
  return { data: review, error: null };
}

export async function createReview(input: CreateReviewInput): Promise<ServiceResult<Review>> {
  if (!input.jobId || !input.revieweeId) {
    return { data: null, error: 'Choose a completed job and profile to review.' };
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { data: null, error: 'Choose a rating from 1 to 5.' };
  }

  const currentUser = await getCurrentUserId();
  if (currentUser.error) return currentUser;
  if (!currentUser.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('owner_id, client_id, accepted_provider_id, status')
    .eq('id', input.jobId)
    .maybeSingle<{
      owner_id: string;
      client_id: string | null;
      accepted_provider_id: string | null;
      status: string;
    }>();

  if (jobError) return { data: null, error: jobError.message };
  if (!job) return { data: null, error: 'Choose a completed job and profile to review.' };

  const clientId = job.client_id ?? job.owner_id;
  if (currentUser.data !== clientId) {
    return { data: null, error: 'Only the client who posted the job can leave this review.' };
  }

  if (!job.accepted_provider_id || input.revieweeId !== job.accepted_provider_id) {
    return { data: null, error: 'Only the hired worker can be reviewed for this job.' };
  }

  if (input.revieweeId === currentUser.data) {
    return { data: null, error: 'You cannot review yourself.' };
  }

  if (job.status !== 'completed') {
    return { data: null, error: 'Reviews are available only after a confirmed completed interaction.' };
  }

  const user = await requireVerifiedCompleteProfile('client');
  if (user.error) return user;

  const existingReview = await getMyReviewForJob({
    jobId: input.jobId,
    revieweeId: input.revieweeId,
  });
  if (existingReview.error) return { data: null, error: existingReview.error };
  if (existingReview.data) {
    return { data: null, error: 'You already reviewed this completed job.' };
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      job_id: input.jobId,
      reviewer_id: user.data,
      reviewee_id: input.revieweeId,
      rating: input.rating,
      comment: compactText(input.comment) || null,
    })
    .select(REVIEW_COLUMNS)
    .single<ReviewRow>();

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'You already reviewed this completed job.' };
    }

    return { data: null, error: error.message };
  }

  const [review] = await mapReviewRows([data]);
  return { data: review, error: null };
}

export async function listProfileReviews(userId: string): Promise<ServiceResult<Review[]>> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };

  return { data: await mapReviewRows((data as ReviewRow[] | null) ?? []), error: null };
}

export async function listWorkerReviews(userId: string): Promise<ServiceResult<Review[]>> {
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id')
    .eq('accepted_provider_id', userId)
    .in('status', ['completed', 'closed']);

  if (jobsError) return { data: null, error: jobsError.message };

  const jobIds = ((jobs as { id: string }[] | null) ?? []).map((job) => job.id);
  if (!jobIds.length) return { data: [], error: null };

  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .eq('reviewee_id', userId)
    .in('job_id', jobIds)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };

  return { data: await mapReviewRows((data as ReviewRow[] | null) ?? []), error: null };
}

export async function listClientReviews(userId: string): Promise<ServiceResult<Review[]>> {
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id')
    .or(`owner_id.eq.${userId},client_id.eq.${userId}`)
    .in('status', ['completed', 'closed']);

  if (jobsError) return { data: null, error: jobsError.message };

  const jobIds = ((jobs as { id: string }[] | null) ?? []).map((job) => job.id);
  if (!jobIds.length) return { data: [], error: null };

  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .eq('reviewee_id', userId)
    .in('job_id', jobIds)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };

  return { data: await mapReviewRows((data as ReviewRow[] | null) ?? []), error: null };
}
