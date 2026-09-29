import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import { onboardingColors } from '@/components/onboarding/FigmaOnboarding';
import { color } from '@/constants/theme';

/**
 * Welcome - Get Started (Figma 1501:4097).
 *
 * One photo, the wordmark, and two actions. This replaces the three-slide
 * auto-advancing carousel: the unified onboarding explains verification in
 * context, so the welcome screen only needs to say what Konektado is.
 *
 * The Figma frame crops a 3:2 photo to its centre-left. `contentPosition`
 * reproduces that crop at any screen width instead of copying the frame's
 * fixed 390px offsets: the visible window starts 390px into a 1266px-wide
 * render, i.e. 390 / (1266 - 390) = 44.5% of the overflow.
 */
const WELCOME_IMAGE_POSITION = { left: '44.5%' as const, top: '0%' as const };

/** Figma: the logo block starts 160px below the status bar on an 844px frame. */
const LOGO_TOP_RATIO = 160 / 844;

export default function WelcomeScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Image
        accessibilityIgnoresInvertColors
        contentFit="cover"
        contentPosition={WELCOME_IMAGE_POSITION}
        source={require('../../assets/images/welcome-get-started-figma.jpg')}
        style={StyleSheet.absoluteFill}
      />
      {/* Figma overlay: 40% blue gradient, #69A4EC -> #4B8BDB -> #3C7FD2. */}
      <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} width="100%">
        <Defs>
          <LinearGradient id="welcomeOverlay" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0.17" stopColor="#69A4EC" stopOpacity="0.4" />
            <Stop offset="0.50125" stopColor="#4B8BDB" stopOpacity="0.4" />
            <Stop offset="0.66687" stopColor="#3C7FD2" stopOpacity="0.4" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#welcomeOverlay)" height="100%" width="100%" />
      </Svg>

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        {/* Percentage padding resolves against width in React Native, so the
            Figma offset is derived from the window height instead. */}
        <View style={[styles.logoArea, { paddingTop: Math.round(height * LOGO_TOP_RATIO) }]}>
          <View style={styles.logoSection}>
            <KonektadoWordmark color="light" size="hero" />
            <Text style={styles.tagline}>Trabaho sa Komunidad. Isang App.</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/role')}
            style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Get Started</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>Log in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    // Solid fallback behind the photo so white text never sits on white.
    backgroundColor: '#3C7FD2',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  logoArea: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    gap: 5,
  },
  tagline: {
    color: onboardingColors.white,
    fontFamily: 'Satoshi-Regular',
    fontSize: 18,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    gap: 4,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  button: {
    alignItems: 'center',
    borderRadius: 24,
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: color.accentYellow,
  },
  secondaryButton: {
    backgroundColor: onboardingColors.white,
    borderColor: '#AFAFAF',
    borderWidth: 1,
  },
  primaryText: {
    color: '#000000',
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  secondaryText: {
    color: '#5C7495',
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.82,
  },
});
