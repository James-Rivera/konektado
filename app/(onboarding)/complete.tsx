import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color } from '@/constants/theme';
import { useProfileStatus } from '@/hooks/use-profile-status';

/**
 * You're all set! (Figma 1501:3503). The last screen of joining.
 *
 * Reached two ways: after submitting verification (the request is now waiting
 * on barangay staff) or via "Do this later" (`?verification=later`). Either way
 * the resident enters Home in browse-only mode, and the copy says which one
 * applies so nobody is surprised when messaging is still locked.
 *
 * The scene and confetti are the Figma vectors, bundled as SVG assets and
 * rendered with expo-image, so they scale to any width.
 */
export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const status = useProfileStatus();
  const params = useLocalSearchParams<{ verification?: string | string[] }>();
  const verificationParam = Array.isArray(params.verification) ? params.verification[0] : params.verification;
  const deferredVerification = verificationParam === 'later';
  const canStart =
    !status.loading && status.authenticated && !status.needsRole && !status.needsProfile;

  const proceed = () => {
    if (!canStart) return;
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.stage}>
          <Image
            accessibilityIgnoresInvertColors
            contentFit="cover"
            contentPosition="top"
            source={require('../../assets/images/all-set-scene.svg')}
            style={styles.scene}
          />
          <Image
            accessibilityIgnoresInvertColors
            contentFit="contain"
            source={require('../../assets/images/all-set-confetti.svg')}
            style={styles.confetti}
          />
          <View style={styles.copy}>
            <Text style={styles.title}>You’re all set!</Text>
            <Text style={styles.subtitle}>
              {deferredVerification
                ? 'Browse jobs and services now. Verify anytime from your Profile to message, post, and save.'
                : 'Let’s build a more connected community'}
            </Text>
            {!deferredVerification ? (
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Verification under review</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: status.loading, disabled: !canStart }}
            disabled={!canStart}
            onPress={proceed}
            style={({ pressed }) => [styles.button, !canStart && styles.buttonDisabled, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Proceed</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
  },
  // Figma: scene 390x520, 111px below the status bar. Anchored to the top and
  // cropped at the bottom on short screens, where it fades out anyway.
  scene: {
    aspectRatio: 390 / 520,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 111,
    width: '100%',
  },
  // Figma: confetti 386x151 at (4, 7) below the status bar.
  confetti: {
    aspectRatio: 386 / 151,
    left: 4,
    position: 'absolute',
    right: 0,
    top: 7,
  },
  copy: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: 14,
    marginTop: 122,
    maxWidth: 300,
    paddingHorizontal: 16,
  },
  title: {
    color: '#000000',
    fontFamily: 'Satoshi-Black',
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  subtitle: {
    color: '#000000',
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: color.warningSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusDot: {
    backgroundColor: color.accentYellow,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusText: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  button: {
    alignItems: 'center',
    backgroundColor: color.accentYellow,
    borderRadius: 24,
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  buttonDisabled: {
    backgroundColor: '#E5EAF1',
  },
  buttonText: {
    color: '#000000',
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.82,
  },
});
