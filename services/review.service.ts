import type { ServiceResult } from '@/services/auth.service';
import { compactText, loadPublicProfiles } from '@/services/marketplace.helpers';
import type {
  CreateReviewInput,
  JobReviewState,
  PublicProfileTrustSummary,
  Review,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

type ReviewRow = {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at?: string;
  job_title?: string | null;
  service_label?: string | null;
  completed_at?: string | null;
};

type ReviewStatePayload = {
  eligible?: boolean;
  reason?: JobReviewState['reason'];
  revieweeId?: string | null;
  revieweeRole?: JobReviewState['revieweeRole'];
  review?: {
    id?: string;
    rating?: number;
    comment?: string | null;
    createdAt?: string;
  } | null;
};

type TrustPayload = {
  averageRating?: number | string | null;
  reviewCount?: number | string | null;
  completedJobsCount?: number | string | null;
  jobsPostedCount?: number | string | null;
  recentReviews?: ReviewRow[] | null;
  recentHistory?: Array<{
    id: string;
    title: string;
    service_label?: string | null;
    completed_at: string;
  }> | null;
};

async function mapReviewRows(rows: ReviewRow[]): Promise<Review[]> {
  const reviewers = await loadPublicProfiles(rows.map((row) => row.reviewer_id));

  return rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    reviewer: reviewers.get(row.reviewer_id) ?? null,
    jobContext:
      row.job_title && row.completed_at
        ? {
            id: row.job_id,
            title: row.job_title,
            serviceLabel: row.service_label ?? null,
            completedAt: row.completed_at,
          }
        : null,
  }));
}

export async function getMyJobReviewState(
  jobId: string,
): Promise<ServiceResult<JobReviewState>> {
  const { data, error } = await supabase.rpc('get_my_job_review_state', {
    p_job_id: jobId,
  });
  if (error) return { data: null, error: error.message };

  const payload = (data ?? {}) as ReviewStatePayload;
  let review: Review | null = null;
  if (payload.review?.id && payload.revieweeId) {
    const { data: user } = await supabase.auth.getUser();
    review = {
      id: payload.review.id,
      jobId,
      reviewerId: user.user?.id ?? '',
      revieweeId: payload.revieweeId,
      rating: Number(payload.review.rating ?? 0),
      comment: payload.review.comment ?? null,
      createdAt: payload.review.createdAt ?? new Date(0).toISOString(),
      updatedAt: payload.review.createdAt ?? new Date(0).toISOString(),
      reviewer: null,
      jobContext: null,
    };
  }

  return {
    data: {
      eligible: Boolean(payload.eligible),
      reason: payload.reason ?? 'not_found',
      revieweeId: payload.revieweeId ?? null,
      revieweeRole: payload.revieweeRole ?? null,
      review,
    },
    error: null,
  };
}

export async function createReview(input: CreateReviewInput): Promise<ServiceResult<Review>> {
  if (!input.jobId) {
    return { data: null, error: 'Choose a completed job to review.' };
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { data: null, error: 'Choose a rating from 1 to 5.' };
  }

  const { data, error } = await supabase.rpc('create_completed_job_review', {
    p_job_id: input.jobId,
    p_rating: input.rating,
    p_comment: compactText(input.comment) || null,
  });
  if (error) return { data: null, error: toReviewError(error.message) };

  const [review] = await mapReviewRows([data as ReviewRow]);
  return { data: review, error: null };
}

export async function getPublicProfileTrustSummary(
  userId: string,
  role: 'client' | 'worker',
): Promise<ServiceResult<PublicProfileTrustSummary>> {
  const { data, error } = await supabase.rpc('get_public_profile_trust_summary', {
    p_user_id: userId,
    p_role: role,
    p_limit: 6,
  });
  if (error) return { data: null, error: error.message };

  const payload = (data ?? {}) as TrustPayload;
  const reviews = await mapReviewRows(payload.recentReviews ?? []);
  return {
    data: {
      averageRating:
        payload.averageRating === null || payload.averageRating === undefined
          ? null
          : Number(payload.averageRating),
      reviewCount: Number(payload.reviewCount ?? 0),
      completedJobsCount: Number(payload.completedJobsCount ?? 0),
      jobsPostedCount: Number(payload.jobsPostedCount ?? 0),
      reviews,
      history: (payload.recentHistory ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        serviceLabel: item.service_label ?? null,
        completedAt: item.completed_at,
      })),
    },
    error: null,
  };
}

export async function listWorkerReviews(userId: string): Promise<ServiceResult<Review[]>> {
  const result = await getPublicProfileTrustSummary(userId, 'worker');
  return result.error
    ? { data: null, error: result.error }
    : { data: result.data?.reviews ?? [], error: null };
}

export async function listClientReviews(userId: string): Promise<ServiceResult<Review[]>> {
  const result = await getPublicProfileTrustSummary(userId, 'client');
  return result.error
    ? { data: null, error: result.error }
    : { data: result.data?.reviews ?? [], error: null };
}

function toReviewError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('already reviewed') || normalized.includes('duplicate')) {
    return 'You already reviewed this completed job.';
  }
  if (normalized.includes('verified participants') || normalized.includes('completed job')) {
    return 'Reviews are available only to verified participants after a completed job.';
  }
  return message;
}
