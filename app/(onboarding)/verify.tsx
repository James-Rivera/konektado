import { VerificationScreen } from '@/components/verification/VerificationScreen';

/**
 * Identity verification as the final phase of joining. The profile basics are
 * already saved when this opens, so "Do this later" leaves a complete account
 * in browse-only mode (DEC-124).
 */
export default function OnboardingVerifyRoute() {
  return <VerificationScreen mode="onboarding" />;
}
