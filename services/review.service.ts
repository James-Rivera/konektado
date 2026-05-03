import type { ServiceResult } from '@/services/auth.service';
import {
  compactText,
  loadPublicProfiles,
  mapProfile,
  requireVerifiedUser,
  type ProfileRow,
} from '@/services/marketplace.helpers';
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

export async function createReview(input: CreateReviewInput): Promise<ServiceResult<Review>> {
  const user = await requireVerifiedUser();
  if (user.error) return user;

  if (!input.jobId || !input.revieweeId) {
    return { data: null, error: 'Choose a completed job and profile to review.' };
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { data: null, error: 'Choose a rating from 1 to 5.' };
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

  if (error) return { data: null, error: error.message };

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
