import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AuthShell,
  OnboardingButton,
  OnboardingTextInput,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';
import { signInWithEmailPassword } from '@/services/auth.service';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (loading) return;

    setLoading(true);
    const result = await signInWithEmailPassword({ email, password });
    setLoading(false);

    if (result.error) {
      Alert.alert('Sign in failed', result.error);
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <AuthShell
        onClose={() => router.replace('/(auth)')}
        title="Sign in"
        footer={
          <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/role')} style={styles.footerLink}>
            <Text style={styles.footerText}>
              First time to connect? <Text style={styles.footerTextStrong}>Sign Up</Text>
            </Text>
          </Pressable>
        }>
        <View style={styles.form}>
          <OnboardingTextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            textContentType="emailAddress"
            value={email}
          />
          <OnboardingTextInput
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            textContentType="password"
            value={password}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert('Password reset', 'Password reset is not configured yet.')}
            style={styles.forgotLink}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>
        </View>

        <OnboardingButton label="Login" loading={loading} onPress={onLogin} style={styles.submitButton} />
      </AuthShell>
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 10,
  },
  forgotLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
    minHeight: 28,
    justifyContent: 'center',
  },
  forgotText: {
    color: '#3A90F8',
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 42,
  },
  footerLink: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  footerText: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Light',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  footerTextStrong: {
    color: '#3A90F8',
    fontFamily: 'Satoshi-Black',
    textDecorationLine: 'underline',
  },
});
