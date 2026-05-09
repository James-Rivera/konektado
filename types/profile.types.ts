export type ProfileCompletionMode = 'core' | 'work' | 'hiring';

export type ProfileActionRole = 'provider' | 'client';

export type CoreProfileInput = {
  firstName: string;
  lastName: string;
  barangay: string;
  city: string;
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
};

export type HiringProfileInput = {
  headline: string;
  bio: string;
  neededServices: string[];
  preferredSchedule: string;
  budgetPreference: string;
};

export type ProfileCompletionStatus = {
  userId: string;
  isVerified: boolean;
  coreComplete: boolean;
  workComplete: boolean;
  hiringComplete: boolean;
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
