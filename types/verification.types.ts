import type { VerificationUpload } from '@/types/onboarding.types';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'skipped';
export type VerificationIdType =
  | 'barangay_certificate'
  | 'national_id'
  | 'drivers_license'
  | 'passport';

export type VerificationSummary = {
  id: string;
  status: VerificationStatus;
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
};

export type CreatedVerificationRequest = {
  id: string;
  status: VerificationStatus;
};
