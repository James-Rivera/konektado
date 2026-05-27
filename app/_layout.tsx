import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";

import { AppSplashScreen } from "@/components/app-splash-screen";
import { FeedbackProvider } from "@/components/FeedbackProvider";
import { color } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ProfileProvider } from "@/hooks/use-profile";
import { useProfileStatus } from "@/hooks/use-profile-status";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    "Satoshi-Black": require("../assets/images/fonts/Satoshi-Black.otf"),
    "Satoshi-BlackItalic": require("../assets/images/fonts/Satoshi-BlackItalic.otf"),
    "Satoshi-Bold": require("../assets/images/fonts/Satoshi-Bold.otf"),
    "Satoshi-BoldItalic": require("../assets/images/fonts/Satoshi-BoldItalic.otf"),
    "Satoshi-Italic": require("../assets/images/fonts/Satoshi-Italic.otf"),
    "Satoshi-Light": require("../assets/images/fonts/Satoshi-Light.otf"),
    "Satoshi-LightItalic": require("../assets/images/fonts/Satoshi-LightItalic.otf"),
    "Satoshi-Medium": require("../assets/images/fonts/Satoshi-Medium.otf"),
    "Satoshi-MediumItalic": require("../assets/images/fonts/Satoshi-MediumItalic.otf"),
    "Satoshi-Regular": require("../assets/images/fonts/Satoshi-Regular.otf"),
  });

  useEffect(() => {
    if (Platform.OS === "android") {
      SystemUI.setBackgroundColorAsync("#000000").catch(() => {
        // Non-critical; Android system UI support varies by shell/device.
      });
    }
  }, []);

  if (!fontsLoaded) {
    return <AppSplashScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <FeedbackProvider>
          <ProfileProvider>
            <RootNavigator />
            <StatusBar backgroundColor={color.background} style="dark" translucent={false} />
          </ProfileProvider>
        </FeedbackProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { loading, authenticated, needsRole, needsProfile, needsSignupPassword, isAdmin } =
    useProfileStatus();
  const [hasResolvedInitialStatus, setHasResolvedInitialStatus] = useState(false);

  useEffect(() => {
    if (!loading) {
      setHasResolvedInitialStatus(true);
    }
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const activeGroup = segments[0];
    const isInternalRoute = activeGroup === "internal";
    const targetGroup = !authenticated
      ? "(auth)"
      : needsSignupPassword
        ? "(auth)"
      : needsRole
        ? "(auth)"
        : needsProfile
          ? "(onboarding)"
          : isAdmin
            ? "admin"
          : "(tabs)";

    const targetPath = !authenticated
      ? "/(auth)"
      : needsSignupPassword
        ? "/(auth)/create-password"
      : needsRole
        ? "/(auth)/role"
        : needsProfile
          ? "/(onboarding)"
          : isAdmin
            ? "/admin/verifications"
          : "/(tabs)";

    const isOnboardingComplete =
      activeGroup === "(onboarding)" && segments[1] === "complete";
    const isCompletingAuthRegistration =
      authenticated &&
      activeGroup === "(auth)" &&
      (segments[1] === "register" || segments[1] === "create-password") &&
      (needsRole || needsProfile);
    const isRecoveringPassword =
      activeGroup === "(auth)" && segments[1] === "forgot-password";
    const isMissingSignupPasswordRoute =
      needsSignupPassword &&
      !(activeGroup === "(auth)" && segments[1] === "create-password");
    const isMainAppRootRoute =
      targetGroup === "(tabs)" &&
      [
        "client",
        "conversation",
        "create-job",
        "create-job-preview",
        "create-service",
        "create-service-preview",
        "job",
        "notifications",
        "post",
        "profile",
        "services",
        "verification",
        "worker",
      ].includes(String(activeGroup));
    const isAdminInspectionRoute =
      isAdmin &&
      ["client", "job", "services", "worker"].includes(String(activeGroup));

    if (
      (!isInternalRoute && isMissingSignupPasswordRoute) ||
      (
        !isInternalRoute &&
        activeGroup !== targetGroup &&
        !isMainAppRootRoute &&
        !isAdminInspectionRoute &&
        !(targetGroup === "(tabs)" && isOnboardingComplete) &&
        !isCompletingAuthRegistration &&
        !isRecoveringPassword
      )
    ) {
      router.replace(targetPath);
    }
  }, [authenticated, isAdmin, loading, needsProfile, needsRole, needsSignupPassword, router, segments]);

  if (loading && !hasResolvedInitialStatus) {
    return <AppSplashScreen />;
  }

  if (segments[0] === "admin" && !isAdmin) {
    return <AppSplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="admin/photos/[photoId]" options={{ headerShown: false }} />
      <Stack.Screen name="admin/photos" options={{ headerShown: false }} />
      <Stack.Screen name="admin/reports" options={{ headerShown: false }} />
      <Stack.Screen name="admin/settings" options={{ headerShown: false }} />
      <Stack.Screen name="admin/users/[userId]" options={{ headerShown: false }} />
      <Stack.Screen name="admin/users" options={{ headerShown: false }} />
      <Stack.Screen name="admin/verifications/[requestId]" options={{ headerShown: false }} />
      <Stack.Screen name="admin/verifications" options={{ headerShown: false }} />
      <Stack.Screen name="client/[clientId]" options={{ headerShown: false }} />
      <Stack.Screen name="conversation/[conversationId]" options={{ headerShown: false }} />
      <Stack.Screen name="conversation/[conversationId]/details" options={{ headerShown: false }} />
      <Stack.Screen name="create-job" options={{ headerShown: false }} />
      <Stack.Screen name="create-job-preview" options={{ headerShown: false }} />
      <Stack.Screen name="create-service" options={{ headerShown: false }} />
      <Stack.Screen name="create-service-preview" options={{ headerShown: false }} />
      <Stack.Screen name="job/[jobId]" options={{ headerShown: false }} />
      <Stack.Screen name="internal/demo-editor" options={{ headerShown: false }} />
      <Stack.Screen name="internal/login" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="post/active" options={{ headerShown: false }} />
      <Stack.Screen name="post/renew" options={{ headerShown: false }} />
      <Stack.Screen name="profile/complete" options={{ headerShown: false }} />
      <Stack.Screen name="profile/credentials" options={{ headerShown: false }} />
      <Stack.Screen name="profile/settings" options={{ headerShown: false }} />
      <Stack.Screen name="services/[serviceId]" options={{ headerShown: false }} />
      <Stack.Screen name="verification" options={{ headerShown: false }} />
      <Stack.Screen name="worker/[workerId]" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Modal" }}
      />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}
