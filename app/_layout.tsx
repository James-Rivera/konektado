import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useSupabaseAuth();
  const [fontsLoaded] = useFonts({
    AvantGarde: require('../assets/images/fonts/ITC Avant Garde Gothic CE Demi.otf'),
    'Satoshi-Black': require('../assets/images/fonts/Satoshi-Black.otf'),
    'Satoshi-BlackItalic': require('../assets/images/fonts/Satoshi-BlackItalic.otf'),
    'Satoshi-Bold': require('../assets/images/fonts/Satoshi-Bold.otf'),
    'Satoshi-BoldItalic': require('../assets/images/fonts/Satoshi-BoldItalic.otf'),
    'Satoshi-Italic': require('../assets/images/fonts/Satoshi-Italic.otf'),
    'Satoshi-Light': require('../assets/images/fonts/Satoshi-Light.otf'),
    'Satoshi-LightItalic': require('../assets/images/fonts/Satoshi-LightItalic.otf'),
    'Satoshi-Medium': require('../assets/images/fonts/Satoshi-Medium.otf'),
    'Satoshi-MediumItalic': require('../assets/images/fonts/Satoshi-MediumItalic.otf'),
    'Satoshi-Regular': require('../assets/images/fonts/Satoshi-Regular.otf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        initialRouteName={session ? '(tabs)' : '(auth)'}
        screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
