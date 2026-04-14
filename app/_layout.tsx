import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
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
    AvantGarde: require("../assets/images/fonts/ITC Avant Garde Gothic CE Demi.otf"),
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

    if (activeGroup !== targetGroup) {
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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
