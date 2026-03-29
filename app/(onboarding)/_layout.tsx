import { Stack } from 'expo-router';

import { OnboardingProvider } from './onboarding-context';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="location" />
        <Stack.Screen name="job" />
        <Stack.Screen name="certifications" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="review" />
      </Stack>
    </OnboardingProvider>
  );
}
