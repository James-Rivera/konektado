import type { VerificationStatus } from '@/types/verification.types';

export type AdminCanonicalVerificationStatus = 'verified' | 'pending' | 'unverified';

export type AdminVerificationStatusProfile = {
  barangay_verified_at?: string | null;
  verified_at?: string | null;
};

export type AdminVerificationStatusRow = {
  id: string;
  notes?: string | null;
  status: VerificationStatus;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type AdminCanonicalVerificationRequest = {
  id: string;
  notes: string | null;
  status: VerificationStatus;
  createdAt: string;
  updatedAt: string;
};

export function getCanonicalVerificationRequest(
  userId: string,
  verifications: AdminVerificationStatusRow[],
): AdminCanonicalVerificationRequest | null {
  const rows = verifications
    .filter((verification) => verification.user_id === userId)
    .sort(sortVerificationRows);
  const row = rows.find((verification) => verification.status === 'pending') ?? rows[0];
  if (!row) return null;

  return {
    id: row.id,
    notes: row.notes ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getCanonicalAdminVerificationStatus(
  profile: AdminVerificationStatusProfile | null | undefined,
  request: Pick<AdminCanonicalVerificationRequest, 'status'> | null,
): AdminCanonicalVerificationStatus {
  if (request?.status === 'pending') return 'pending';
  if (request?.status === 'approved') return 'verified';
  if (request?.status === 'rejected') return 'unverified';
  if (profile?.barangay_verified_at || profile?.verified_at) return 'verified';
  return 'unverified';
}

export function formatCanonicalAdminVerificationLabel(status: AdminCanonicalVerificationStatus) {
  if (status === 'verified') return 'Verified';
  if (status === 'pending') return 'Pending';
  return 'Unverified';
}

export function canShowActivePublicContentForAdmin(status: AdminCanonicalVerificationStatus) {
  return status === 'verified';
}

function sortVerificationRows(a: AdminVerificationStatusRow, b: AdminVerificationStatusRow) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}
