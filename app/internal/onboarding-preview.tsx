import { Redirect } from 'expo-router';

import { OnboardingServicesPreview } from '@/components/onboarding/OnboardingServicesPreview';

export default function OnboardingPreviewRoute() {
  return __DEV__ ? <OnboardingServicesPreview /> : <Redirect href="/" />;
}
