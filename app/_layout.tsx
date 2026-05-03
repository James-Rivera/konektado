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
import { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";

import { AppSplashScreen } from "@/components/app-splash-screen";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProfileStatus } from "@/hooks/use-profile-status";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { loading, authenticated, needsRole, needsProfile } =
    useProfileStatus();
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

  useEffect(() => {
    if (loading) return;

    const activeGroup = segments[0];
    const targetGroup = !authenticated
      ? "(auth)"
      : needsRole
        ? "(auth)"
        : needsProfile
          ? "(onboarding)"
          : "(tabs)";

    const targetPath = !authenticated
      ? "/(auth)"
      : needsRole
        ? "/(auth)/role"
        : needsProfile
          ? "/(onboarding)"
          : "/(tabs)";

    const isOnboardingComplete =
      activeGroup === "(onboarding)" && segments[1] === "complete";
    const isCompletingAuthRegistration =
      authenticated &&
      activeGroup === "(auth)" &&
      segments[1] === "register" &&
      (needsRole || needsProfile);

    if (
      activeGroup !== targetGroup &&
      !(targetGroup === "(tabs)" && isOnboardingComplete) &&
      !isCompletingAuthRegistration
    ) {
      router.replace(targetPath);
    }
  }, [authenticated, loading, needsProfile, needsRole, router, segments]);

  if (!fontsLoaded) {
    return <AppSplashScreen />;
  }

  if (loading) {
    return <AppSplashScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
