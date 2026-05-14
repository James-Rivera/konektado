import type { RateType } from '@/types/marketplace.types';

export type ProfileCompletionMode = 'core' | 'work' | 'hiring';

export type ProfileActionRole = 'provider' | 'client';

export type MarketplaceSetupState = 'unverified' | 'verified_setup_incomplete' | 'ready';

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
