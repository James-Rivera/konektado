import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AuthShell,
  OnboardingButton,
  OnboardingTextInput,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';
import { type AppRole, saveUserRole } from '@/utils/save-role';
import { supabase } from '@/utils/supabase';

function normalizeRole(raw: unknown): AppRole | null {
  if (raw === 'client' || raw === 'provider') return raw;
  if (Array.isArray(raw) && (raw[0] === 'client' || raw[0] === 'provider')) return raw[0];
  return null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedRole = useMemo(() => normalizeRole(params.role), [params.role]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password is too short', 'Use at least 6 characters.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: selectedRole
        ? {
            data: {
              app_role: selectedRole,
              role: selectedRole,
            },
          }
        : undefined,
    });

    if (error) {
      setLoading(false);
      Alert.alert('Sign up failed', error.message);
      return;
    }

    if (data.session && selectedRole) {
      const saveError = await saveUserRole({
        email: data.user?.email ?? email.trim(),
        role: selectedRole,
        userId: data.session.user.id,
      });

      setLoading(false);

      if (saveError) {
        Alert.alert('Account created', 'Your account was created, but role setup failed. Choose your role again.');
        router.replace('/(auth)/role');
        return;
      }

      router.replace('/(onboarding)');
      return;
    }

    setLoading(false);

    if (data.session) {
      router.replace('/(auth)/role');
      return;
    }

    Alert.alert('Check your email', 'We sent you a confirmation link. After confirming, sign in to continue.');
  };

  return (
    <>
      <StatusBar style="dark" />
      <AuthShell
        onClose={() => router.replace('/(auth)/role')}
        title="Create account"
        footer={
          <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/login')} style={styles.footerLink}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerTextStrong}>Login</Text>
            </Text>
          </Pressable>
        }>
        {selectedRole ? (
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>
              {selectedRole === 'provider' ? 'Find work account' : 'Hire someone account'}
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <OnboardingTextInput
            autoCapitalize="none"
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
            textContentType="newPassword"
            value={password}
          />
        </View>

        <Text style={styles.passwordHint}>Use at least 6 characters. You can add verification details after signing up.</Text>
        <OnboardingButton label="Sign Up" loading={loading} onPress={onRegister} style={styles.submitButton} />
      </AuthShell>
    </>
  );
}

const styles = StyleSheet.create({
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5EF',
    borderColor: onboardingColors.brandYellow,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rolePillText: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  form: {
    gap: 10,
  },
  passwordHint: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  submitButton: {
    marginTop: 22,
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
