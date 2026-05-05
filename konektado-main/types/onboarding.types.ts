export type AppRole = "client" | "provider";

export type OnboardingIntent = AppRole;

export type UserPreferences = {
  customNeededServices: string[];
  customOfferedServices: string[];
  intent: OnboardingIntent;
  neededServices: string[];
  offeredServices: string[];
  onboardingCompletedAt: string | null;
};

export type VerificationUpload = {
  uri: string;
  name: string;
  fileType: "certification" | "experience" | "id_front" | "id_back" | "other";
  mimeType?: string | null;
  size?: number | null;
};

export type OnboardingDraft = {
  firstName: string;
  lastName: string;
  birthdate: string;
  streetAddress: string;
  city: string;
  barangay: string;
  offeredServices: string[];
  neededServices: string[];
  customOfferedServices: string[];
  customNeededServices: string[];
  serviceType: string;
  hasCertifications: boolean | null;
  certificationDetails: string;
  wantsBarangayVerification: boolean;
  verificationNote: string;
  verificationFiles: VerificationUpload[];
};
