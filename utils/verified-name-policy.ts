import type { LegalNameEditPolicy } from '@/types/legal-name.types';
import type { VerificationStatus } from '@/types/verification.types';

export const NAME_SUBMISSION_WARNING =
  "Make sure your full name matches your barangay certificate. You won't be able to change it after submitting for verification.";
export const NAME_PENDING_MESSAGE =
  'Your name is under review and cannot be changed right now.';
export const NAME_VERIFIED_MESSAGE =
  'Changes require barangay review.';
export const NAME_CORRECTION_MESSAGE =
  'The name on your profile must match your submitted barangay certificate. Please correct it and resubmit.';
export const NAME_REJECTED_MESSAGE =
  'Your verified name cannot be changed from profile editing.';
export const NAME_CORRECTION_REQUEST_EXPLANATION =
  'Use this for typos, legal name updates, or incorrect registration details. Barangay staff will review the request before your verified name changes. Please contact barangay staff to request a verified name correction.';
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
