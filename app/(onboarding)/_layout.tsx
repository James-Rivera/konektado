import { Redirect, Stack } from 'expo-router';

import { AppSplashScreen } from '@/components/app-splash-screen';
import { useProfileStatus } from '@/hooks/use-profile-status';
import { OnboardingProvider } from './onboarding-context';

export default function OnboardingLayout() {
  const status = useProfileStatus();

  if (status.loading) {
    return <AppSplashScreen />;
  }

  if (!status.authenticated) {
    return <Redirect href="/(auth)" />;
  }

  if (status.isAdmin) {
    return <Redirect href="/admin/verifications" />;
  }

  if (!status.needsRole && !status.needsProfile) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="location" />
        <Stack.Screen name="job" />
        <Stack.Screen name="certifications" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="review" />
        <Stack.Screen name="complete" />
      </Stack>
    </OnboardingProvider>
  );
}
