import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
    AuthShell,
    OnboardingButton,
    OnboardingTextInput,
    onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';
import { PHONE_AUTH_ENABLED } from '@/constants/auth-config';
import { signInWithEmailPassword, signInWithPhonePassword } from '@/services/auth.service';
import { showAlert } from '@/utils/alert';
import { looksLikePhoneNumber } from '@/utils/phone';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[]; identifier?: string | string[] }>();
  const rawEmailParam = Array.isArray(params.email) ? params.email[0] : params.email;
  const rawIdentifierParam = Array.isArray(params.identifier) ? params.identifier[0] : params.identifier;
  // One field accepts either a mobile number or an email when phone auth is on.
  const paramEmail = rawIdentifierParam ?? rawEmailParam;
  const [email, setEmail] = useState(paramEmail ?? '');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Seeded from the route param above, then kept in step if the param changes
  // (arriving here from register or forgot-password with a different address).
  // Done during render so the field is never briefly blank.
  const [lastParamEmail, setLastParamEmail] = useState(paramEmail);
  if (paramEmail !== lastParamEmail) {
    setLastParamEmail(paramEmail);
    if (paramEmail) setEmail(paramEmail);
  }

  const onLogin = async () => {
    if (loading) return;

    setLoading(true);
    const usePhone = PHONE_AUTH_ENABLED && looksLikePhoneNumber(email);
    const result = usePhone
      ? await signInWithPhonePassword({ password, phone: email })
      : await signInWithEmailPassword({ email, password });
    setLoading(false);

    if (result.error) {
      showAlert('Sign in failed', result.error);
    }
  };

  const onForgotPassword = () => {
    // A mobile number is only carried over when phone recovery is available.
    if (looksLikePhoneNumber(email)) {
      router.push(
        PHONE_AUTH_ENABLED
          ? { pathname: '/(auth)/forgot-password', params: { identifier: email.trim() } }
          : '/(auth)/forgot-password',
      );
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    router.push(
      normalizedEmail
        ? { pathname: '/(auth)/forgot-password', params: { email: normalizedEmail } }
        : '/(auth)/forgot-password',
    );
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
            autoComplete={PHONE_AUTH_ENABLED ? 'username' : 'email'}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={PHONE_AUTH_ENABLED ? 'Mobile number or email' : 'Email'}
            textContentType={PHONE_AUTH_ENABLED ? 'username' : 'emailAddress'}
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
            onPress={onForgotPassword}
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
