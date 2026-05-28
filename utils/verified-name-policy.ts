import type { LegalNameEditPolicy } from '@/types/legal-name.types';
import type { VerificationStatus } from '@/types/verification.types';

export const NAME_SUBMISSION_WARNING =
  "Make sure your full name matches your valid ID or barangay record. You won't be able to change it after submitting for verification.";
export const NAME_PENDING_MESSAGE =
  'Your name is under barangay review and cannot be changed right now.';
export const NAME_VERIFIED_MESSAGE =
  'This name was verified by Barangay San Pedro. To protect trust and prevent impersonation, verified names cannot be changed directly.';
export const NAME_CORRECTION_MESSAGE =
  'The name on your profile must match your submitted ID or barangay record. Please correct your full name and resubmit your verification.';
export const NAME_REJECTED_MESSAGE =
  'Your last verification was rejected. Your verified/legal name cannot be changed silently from profile editing.';
export const NAME_CORRECTION_REQUEST_EXPLANATION =
  'Use this only for typos, legal name updates, or incorrect registration details. Barangay staff will review the request before your verified name changes.';
export const NAME_LOCKED_SERVICE_ERROR =
  'Your verified/legal name is locked after barangay verification submission. Barangay staff must return the request for name correction before you can change it.';

export const NAME_MISMATCH_REASON = 'Name does not match submitted ID';

export const NEEDS_CORRECTION_REASONS = [
  NAME_MISMATCH_REASON,
  'Document is unreadable',
  'Missing required document',
  'Wrong document uploaded',
  'Other',
] as const;

export type NeedsCorrectionReason = (typeof NEEDS_CORRECTION_REASONS)[number];

export function isNameMismatchCorrectionReason(note: string | null | undefined) {
  const normalized = note?.trim().toLowerCase() ?? '';
  if (!normalized) return false;

  return (
    normalized.includes('name does not match') ||
    normalized.includes('name mismatch') ||
    normalized.includes('name correction') ||
    normalized.includes('legal name')
  );
}

export function getLegalNameEditPolicy({
  isVerified,
  reviewerNote,
  status,
}: {
  isVerified?: boolean;
  reviewerNote?: string | null;
  status?: VerificationStatus | null;
}): LegalNameEditPolicy {
  if (status === 'pending') {
    return {
      canEdit: false,
      canRequestCorrection: false,
      message: NAME_PENDING_MESSAGE,
      state: 'pending',
    };
  }

  if (status === 'needs_more_info') {
    if (isNameMismatchCorrectionReason(reviewerNote)) {
      return {
        canEdit: true,
        canRequestCorrection: false,
        message: NAME_CORRECTION_MESSAGE,
        state: 'needs_name_correction',
      };
    }

    return {
      canEdit: false,
      canRequestCorrection: false,
      message: NAME_PENDING_MESSAGE,
      state: 'needs_other_correction',
    };
  }

  if (status === 'approved' || isVerified) {
    return {
      canEdit: false,
      canRequestCorrection: true,
      message: NAME_VERIFIED_MESSAGE,
      state: 'verified',
    };
  }

  if (status === 'rejected') {
    return {
      canEdit: false,
      canRequestCorrection: false,
      message: NAME_REJECTED_MESSAGE,
      state: 'rejected',
    };
  }

  return {
    canEdit: true,
    canRequestCorrection: false,
    message: NAME_SUBMISSION_WARNING,
    state: 'draft',
  };
}

export function formatReviewerNoteWithReason({
  note,
  reason,
}: {
  note?: string | null;
  reason?: string | null;
}) {
  const cleanReason = reason?.trim();
  const cleanNote = note?.trim();

  if (cleanReason && cleanNote) return `${cleanReason}: ${cleanNote}`;
  return cleanReason || cleanNote || null;
}
