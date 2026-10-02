import { Redirect, Stack, useSegments } from 'expo-router';

import { AppSplashScreen } from '@/components/app-splash-screen';
import { useProfileStatus } from '@/hooks/use-profile-status';
import { OnboardingProvider } from './onboarding-context';

export default function OnboardingLayout() {
  const status = useProfileStatus();
  const segments = useSegments();
  const routeSegments = [...segments] as string[];
  // `verify` and `complete` run after the profile is saved (needsProfile is
  // false by then), so they must not be redirected to Home.
  const isPostProfileRoute =
    routeSegments[0] === '(onboarding)' &&
    (routeSegments[1] === 'verify' || routeSegments[1] === 'complete');

  if (status.loading) {
    return <AppSplashScreen />;
  }

  if (!status.authenticated) {
    return <Redirect href="/(auth)" />;
  }

  if (status.isAdmin) {
    return <Redirect href="/admin/verifications" />;
  }

  if (status.needsRole) {
    const currentPath =
      routeSegments[0] === '(onboarding)' && routeSegments[1]
        ? `/(onboarding)/${routeSegments[1]}`
        : '/(onboarding)';

    return (
      <Redirect
        href={{
          pathname: '/(auth)/role',
          params: { returnTo: currentPath },
        }}
      />
    );
  }

  if (!status.needsRole && !status.needsProfile && !isPostProfileRoute) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="location" />
        <Stack.Screen name="job" />
        <Stack.Screen name="review" />
        <Stack.Screen name="verify" options={{ gestureEnabled: false }} />
        <Stack.Screen name="complete" />
      </Stack>
    </OnboardingProvider>
  );
}
