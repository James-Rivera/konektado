import type { RateType } from '@/types/marketplace.types';
import type { LegalNameEditPolicy } from '@/types/legal-name.types';

export type ProfileCompletionMode = 'core' | 'work' | 'hiring';

export type ProfileActionRole = 'provider' | 'client';

export type MarketplaceSetupState = 'unverified' | 'verified_setup_incomplete' | 'ready';

export type ProfileModeCompletionState = 'not_set_up' | 'incomplete' | 'ready';

export type VerificationDisplayStatus =
  | 'approved'
  | 'pending'
  | 'needs_more_info'
  | 'rejected'
  | 'unverified';

export type ProfileCompletionActionKind =
  | 'edit_shared_profile'
  | 'add_profile_photo'
  | 'edit_contact_preference'
  | 'create_service'
  | 'edit_service_rate'
  | 'edit_availability'
  | 'edit_service_area'
  | 'open_verification'
  | 'add_credential'
  | 'edit_hiring_preferences'
  | 'create_job'
  | 'open_job_builder';

export type ProfileCompletionAction = {
  id: string;
  kind: ProfileCompletionActionKind;
  label: string;
  description?: string;
  mode: ProfileCompletionMode;
  targetId?: string | null;
  optional?: boolean;
};

export type ProfileModeCompletion = {
  state: ProfileModeCompletionState;
  statusLabel: string;
  percent: number;
  completedSteps: number;
  totalSteps: number;
  missingItems: ProfileCompletionAction[];
  optionalItems: ProfileCompletionAction[];
  nextRecommendedAction: ProfileCompletionAction | null;
};

export type ProfileVerificationStatus = {
  status: VerificationDisplayStatus;
  label: string;
  description: string;
  reviewerNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  action: ProfileCompletionAction | null;
};

export type CoreProfileInput = {
  firstName: string;
  lastName: string;
  province: string;
  barangay: string;
  purokSitio: string;
  street: string;
  subdivisionArea: string;
  blockLot: string;
  houseNumber: string;
  landmarkNote: string;
  city: string;
  preferredContactMethod: string;
  about: string;
  availability: string;
};

export type WorkProfileInput = {
  headline: string;
  bio: string;
  offeredServices: string[];
  serviceArea: string;
  availability: string;
  rateText: string;
  rateMin: string;
  rateMax: string;
  rateType: RateType;
  rateNegotiable: boolean;
  customOfferedServices: string[];
};

export type HiringProfileInput = {
  headline: string;
  bio: string;
  neededServices: string[];
  customNeededServices: string[];
  preferredSchedule: string;
  budgetPreference: string;
};

export type ProfileCompletionStatus = {
  userId: string;
  isVerified: boolean;
  coreComplete: boolean;
  workComplete: boolean;
  hiringComplete: boolean;
  marketplaceSetupState: MarketplaceSetupState;
  coreCompletion: ProfileModeCompletion;
  workCompletion: ProfileModeCompletion;
  hiringCompletion: ProfileModeCompletion;
  verification: ProfileVerificationStatus;
  legalNameEdit: LegalNameEditPolicy;
  photoRecommended: boolean;
  missingCore: string[];
  missingWork: string[];
  missingHiring: string[];
  core: CoreProfileInput & {
    avatarUrl: string | null;
  };
  work: WorkProfileInput & {
    completedAt: string | null;
  };
  hiring: HiringProfileInput & {
    completedAt: string | null;
  };
};
