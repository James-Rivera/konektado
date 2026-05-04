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
  const [passwordVisible, setPasswordVisible] = useState(false);
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
          <View style={styles.passwordField}>
            <OnboardingTextInput
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!passwordVisible}
              style={styles.passwordInput}
              textContentType="password"
              value={password}
            />
            <Pressable
              accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setPasswordVisible((visible) => !visible)}
              style={styles.passwordToggle}
            >
              <Text style={styles.passwordToggleText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
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
  passwordField: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 68,
  },
  passwordToggle: {
    alignItems: 'center',
    height: 46,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 0,
  },
  passwordToggleText: {
    color: '#3A90F8',
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 20,
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
