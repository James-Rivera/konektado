import type { ServiceResult } from '@/services/auth.service';
import {
  isCurrentUserAdmin,
  loadPublicProfiles,
  mapProfile,
  type ProfileRow,
} from '@/services/marketplace.helpers';
import {
  sendVerificationApprovedEmail,
  sendVerificationNeedsInfoEmail,
  sendVerificationRejectedEmail,
} from '@/services/verification-email.service';
import type { PublicProfileSummary } from '@/types/marketplace.types';
import type { VerificationStatus } from '@/types/verification.types';
import { supabase } from '@/utils/supabase';

const VERIFICATION_BUCKET = 'verification-files';
const VERIFICATION_FILE_SIGNED_URL_SECONDS = 10 * 60;

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
    filePath: string | null;
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
  file_path: string | null;
  url: string | null;
  created_at: string;
};

async function requireAdmin(): Promise<ServiceResult<void>> {
  if (!(await isCurrentUserAdmin())) {
    return { data: null, error: 'Barangay admin access is required.' };
  }

  return { data: undefined, error: null };
}

function getLegacyVerificationFilePath(url: string | null | undefined) {
  if (!url) return null;

  const marker = `/storage/v1/object/public/${VERIFICATION_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex >= 0) {
    return decodeURIComponent(url.slice(markerIndex + marker.length).split('?')[0] ?? '');
  }

  if (!/^https?:\/\//i.test(url)) {
    return url;
  }

  return null;
}

async function getSignedVerificationFileUrl(file: VerificationFileRow) {
  const filePath = file.file_path ?? getLegacyVerificationFilePath(file.url);

  if (!filePath) {
    return '';
  }

  const { data, error } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrl(filePath, VERIFICATION_FILE_SIGNED_URL_SECONDS);

  if (error || !data?.signedUrl) {
    return '';
  }

  return data.signedUrl;
}

async function mapVerificationRows(rows: VerificationRow[]) {
  if (!rows.length) return [];

  const profiles = await loadPublicProfiles(rows.map((row) => row.user_id));
  const { data: files } = await supabase
    .from('verification_files')
    .select('id, verification_id, file_type, file_path, url, created_at')
    .in('verification_id', rows.map((row) => row.id));

  const fileRows = (files as VerificationFileRow[] | null) ?? [];
  const mappedFiles = await Promise.all(
    fileRows.map(async (file) => ({
      id: file.id,
      verificationId: file.verification_id,
      fileType: file.file_type,
      filePath: file.file_path ?? getLegacyVerificationFilePath(file.url),
      url: await getSignedVerificationFileUrl(file),
      createdAt: file.created_at,
    })),
  );

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
    files: mappedFiles
      .filter((file) => file.verificationId === row.id)
      .map(({ verificationId, ...file }) => file),
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
  decision: 'approved' | 'rejected' | 'needs_more_info';
  note?: string;
}): Promise<ServiceResult<VerificationRequestDetail>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;

  const reviewerNote = note?.trim() || null;

  if (decision !== 'approved' && !reviewerNote) {
    return { data: null, error: 'Enter a reviewer note before saving this review.' };
  }

  const { data, error } = await supabase
    .rpc('review_verification_request_atomic', {
      p_decision: decision,
      p_request_id: requestId,
      p_reviewer_note: reviewerNote,
    })
    .single<VerificationRow>();

  if (error) {
    return { data: null, error: error.message || 'This request is no longer pending.' };
  }

  const [mapped] = await mapVerificationRows([data]);

  if (decision === 'approved') {
    void sendVerificationApprovedEmail({
      ctaUrl: 'konektado://verification',
      requestId: data.id,
    });
  } else if (decision === 'needs_more_info') {
    void sendVerificationNeedsInfoEmail({
      ctaUrl: 'konektado://verification',
      requestId: data.id,
    });
  } else {
    void sendVerificationRejectedEmail({
      ctaUrl: 'konektado://verification',
      requestId: data.id,
    });
  }

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
      'id, full_name, first_name, last_name, barangay, purok_sitio, street, subdivision_area, city, about, avatar_url, availability, verified_at, barangay_verified_at',
    )
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) return { data: null, error: error.message };

  const profile = mapProfile(data);
  if (!profile) return { data: null, error: 'Admin profile not found.' };

  return { data: profile, error: null };
}
