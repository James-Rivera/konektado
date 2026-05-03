import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  KonektadoWordmark,
  OnboardingButton,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';

export default function OnboardingCompleteScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent />
      <Svg height="100%" style={StyleSheet.absoluteFill} width="100%">
        <Defs>
          <LinearGradient id="completeGradient" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#69A4EC" />
            <Stop offset="0.5" stopColor="#4B8BDB" />
            <Stop offset="0.75" stopColor="#3C7FD2" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#completeGradient)" height="100%" width="100%" />
      </Svg>

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.copy}>
          <Text style={styles.congrats}>Congratulations!</Text>
          <Text style={styles.welcome}>Welcome to</Text>
          <KonektadoWordmark color="light" size="large" />
          <Text style={styles.tagline}>Trabaho sa Komunidad. Isang App.</Text>
        </View>

        <View style={styles.imageFrame}>
          <Image
            resizeMode="cover"
            source={require('../../assets/images/onboarding-complete.jpg')}
            style={styles.image}
          />
        </View>

        <View style={styles.footer}>
          <OnboardingButton
            label="Start browsing Konektado"
            onPress={() => router.replace('/(tabs)')}
            variant="yellow"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  copy: {
    gap: 8,
  },
  congrats: {
    color: onboardingColors.brandYellow,
    fontFamily: 'Satoshi-Black',
    fontSize: 26,
    lineHeight: 39,
  },
  welcome: {
    color: onboardingColors.white,
    fontFamily: 'Satoshi-Black',
    fontSize: 26,
    lineHeight: 39,
    marginTop: 18,
  },
  tagline: {
    color: onboardingColors.white,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  imageFrame: {
    borderRadius: 12,
    height: 318,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8.5,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  footer: {
    paddingBottom: 42,
  },
});
