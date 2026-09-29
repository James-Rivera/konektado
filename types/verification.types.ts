import type { VerificationUpload } from '@/types/onboarding.types';
import type { LegalNameEditPolicy } from '@/types/legal-name.types';

export type VerificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_more_info'
  | 'cancelled'
  | 'skipped';
export type VerificationIdType =
  | 'barangay_certificate'
  | 'national_id'
  | 'drivers_license'
  | 'passport';

export type VerificationSummary = {
  id: string;
  idType: VerificationIdType | null;
  status: VerificationStatus;
  /** Set for pending requests after checking uploaded files in storage. */
  uploadComplete?: boolean;
  notes: string | null;
  reviewerNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VerificationPrefill = {
  birthdate: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  streetAddress: string;
  city: string;
  barangay: string;
  servicesOrPurpose: string;
  legalNameEdit: LegalNameEditPolicy;
  latestRequest: VerificationSummary | null;
};

export type CreateVerificationRequestInput = {
  birthdate: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  streetAddress: string;
  city: string;
  barangay: string;
  idType: VerificationIdType;
  servicesOrPurpose: string;
  note: string;
  files: VerificationUpload[];
  contactOtpChallengeId: string | null;
};

export type CreatedVerificationRequest = {
  id: string;
  status: VerificationStatus;
};

export type ContactOtpDeliveryStatus =
  | 'sent'
  | 'failed'
  | 'simulated'
  | 'already_sent'
  | 'rate_limited_existing_challenge'
  // Mobile signups: Supabase Auth already confirmed this number, so no SMS is
  // sent and the returned challenge is pre-verified (skip the code step).
  | 'auth_phone_confirmed';

export type ContactOtpStatusType = 'success' | 'info' | 'warning' | 'error';

export type ContactOtpSendResult = {
  success: boolean;
  canVerify: boolean;
  challengeId: string;
  expiresIn: number;
  resendAfter: number;
  retryAfterSeconds: number;
  simulated: boolean;
  deliveryStatus: ContactOtpDeliveryStatus;
  /** Present and true when the challenge needs no code (`auth_phone_confirmed`). */
  verified?: boolean;
  deliveryError?:
    | 'sms_provider_unauthenticated'
    | 'sms_sender_rejected'
    | 'sms_balance_error'
    | 'sms_request_rejected'
    | 'sms_delivery_failed';
  message?: string;
};
