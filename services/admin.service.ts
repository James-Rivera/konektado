import type { ServiceResult } from '@/services/auth.service';
import {
  isCurrentUserAdmin,
  loadPublicProfiles,
  mapProfile,
  type ProfileRow,
} from '@/services/marketplace.helpers';
import type { PublicProfileSummary } from '@/types/marketplace.types';
import type { VerificationStatus } from '@/types/verification.types';
import { supabase } from '@/utils/supabase';

export type VerificationRequestDetail = {
  id: string;
  userId: string;
  status: VerificationStatus;
  notes: string | null;
  reviewerId: string | null;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: PublicProfileSummary | null;
  files: {
    id: string;
    fileType: string;
    url: string;
    createdAt: string;
  }[];
};

type ListVerificationRequestsInput = {
  limit?: number;
  statuses?: VerificationStatus[];
};

type VerificationRow = {
  id: string;
  user_id: string;
  status: VerificationStatus;
  notes: string | null;
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type VerificationFileRow = {
  id: string;
  verification_id: string;
  file_type: string;
  url: string;
  created_at: string;
};

async function requireAdmin(): Promise<ServiceResult<void>> {
  if (!(await isCurrentUserAdmin())) {
    return { data: null, error: 'Barangay admin access is required.' };
  }

  return { data: undefined, error: null };
}

async function mapVerificationRows(rows: VerificationRow[]) {
  if (!rows.length) return [];

  const profiles = await loadPublicProfiles(rows.map((row) => row.user_id));
  const { data: files } = await supabase
    .from('verification_files')
    .select('id, verification_id, file_type, url, created_at')
    .in('verification_id', rows.map((row) => row.id));

  const fileRows = (files as VerificationFileRow[] | null) ?? [];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    status: row.status,
    notes: row.notes,
    reviewerId: row.reviewer_id,
    reviewerNote: row.reviewer_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: profiles.get(row.user_id) ?? null,
    files: fileRows
      .filter((file) => file.verification_id === row.id)
      .map((file) => ({
        id: file.id,
        fileType: file.file_type,
        url: file.url,
        createdAt: file.created_at,
      })),
  }));
}

export async function listVerificationRequests({
  limit = 50,
  statuses,
}: ListVerificationRequestsInput = {}): Promise<
  ServiceResult<VerificationRequestDetail[]>
> {
  const admin = await requireAdmin();
  if (admin.error) return admin;

  let query = supabase
    .from('verifications')
    .select('id, user_id, status, notes, reviewer_id, reviewer_note, reviewed_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (statuses?.length) {
    query = query.in('status', statuses);
  }

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };

  return { data: await mapVerificationRows((data as VerificationRow[] | null) ?? []), error: null };
}

export async function listPendingVerificationRequests(): Promise<
  ServiceResult<VerificationRequestDetail[]>
> {
  return listVerificationRequests({ statuses: ['pending'] });
}

export async function reviewVerificationRequest({
  requestId,
  decision,
  note,
}: {
  requestId: string;
  decision: 'approved' | 'rejected';
  note?: string;
}): Promise<ServiceResult<VerificationRequestDetail>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;

  const reviewerNote = note?.trim() || null;

  if (decision === 'rejected' && !reviewerNote) {
    return { data: null, error: 'Enter a reviewer note before rejecting this request.' };
  }

  const { data: userData } = await supabase.auth.getUser();
  const reviewerId = userData.user?.id;

  if (!reviewerId) {
    return { data: null, error: 'Please sign in again to continue.' };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('verifications')
    .update({
      status: decision,
      reviewer_id: reviewerId,
      reviewer_note: reviewerNote,
      reviewed_at: now,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id, user_id, status, notes, reviewer_id, reviewer_note, reviewed_at, created_at, updated_at')
    .single<VerificationRow>();

  if (error) {
    return { data: null, error: error.message || 'This request is no longer pending.' };
  }

  if (decision === 'approved') {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ barangay_verified_at: now, verified_at: now })
      .eq('id', data.user_id)
      .select('id')
      .single();

    if (profileError) {
      return { data: null, error: profileError.message };
    }
  }

  const [mapped] = await mapVerificationRows([data]);
  return { data: mapped, error: null };
}

export async function getAdminProfile(): Promise<ServiceResult<PublicProfileSummary>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, first_name, last_name, barangay, city, about, avatar_url, availability, verified_at, barangay_verified_at',
    )
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) return { data: null, error: error.message };

  const profile = mapProfile(data);
  if (!profile) return { data: null, error: 'Admin profile not found.' };

  return { data: profile, error: null };
}
