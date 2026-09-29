import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  AccountFlowButton,
  AccountFlowFrame,
  AccountFlowInput,
  AccountFlowIntro,
  accountFlowStyles,
} from '@/components/onboarding/AccountFlowUI';
import { PasswordRequirementRow } from '@/components/onboarding/FigmaOnboarding';
import { getCurrentAuthUser, getCurrentSignupRole, setSignupPassword } from '@/services/auth.service';
import { showAlert } from '@/utils/alert';
import { normalizePhilippineMobile } from '@/utils/phone';
import { saveUserRole, type OnboardingIntent } from '@/utils/save-role';

function normalizeRole(raw: unknown): OnboardingIntent | null {
  if (raw === 'client' || raw === 'provider') return raw;
  if (Array.isArray(raw) && (raw[0] === 'client' || raw[0] === 'provider')) {
    return raw[0];
  }
  return null;
}

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function hasSpecialCharacter(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

/**
 * Create a password after the email or SMS code. Not in the new Figma set, so
 * it uses the same account-flow chrome as "Create your Account". A password
 * lets residents log back in without waiting for another code.
 */
export default function CreatePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedRole = useMemo(() => normalizeRole(params.role), [params.role]);
  const email = getParamValue(params.email as string | string[] | undefined) ?? null;
  const phone = normalizePhilippineMobile(getParamValue(params.phone as string | string[] | undefined));

  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordHasLength = password.length >= 8 && password.length <= 20;
  const passwordHasSpecial = hasSpecialCharacter(password);

  const savePassword = async () => {
    if (loading) return;

    if (!passwordHasLength || !passwordHasSpecial) {
      showAlert('Password requirements', 'Use 8 to 20 characters and include at least one special character.');
      return;
    }

    setLoading(true);
    const roleResult = selectedRole
      ? ({ data: selectedRole, error: null } as const)
      : await getCurrentSignupRole();

    if (roleResult.error) {
      setLoading(false);
      showAlert('Session expired', roleResult.error);
      router.replace('/(auth)/role');
      return;
    }

    const roleForSignup = roleResult.data;
    const passwordResult = await setSignupPassword({ password, role: roleForSignup });

    if (passwordResult.error) {
      setLoading(false);
      showAlert('Could not save password', passwordResult.error);
      return;
    }

    const userResult = await getCurrentAuthUser();

    if (userResult.error || !userResult.data) {
      setLoading(false);
      showAlert('Session expired', userResult.error ?? 'Please verify your account again to continue.');
      router.replace('/(auth)/role');
      return;
    }

    const currentUser = userResult.data;

    if (roleForSignup) {
      const saveRoleError = await saveUserRole({
        email: currentUser.email ?? email,
        phone,
        role: roleForSignup,
        userId: currentUser.id,
      });

      if (saveRoleError) {
        setLoading(false);
        showAlert('Could not save role', saveRoleError.message);
        return;
      }
    }

    setLoading(false);
    router.replace(roleForSignup ? '/(onboarding)' : '/(auth)/role');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <AccountFlowFrame
        footer={<AccountFlowButton label="Continue" loading={loading} onPress={savePassword} />}
        onBack={() => showAlert('Create password', 'Create a password before continuing.')}
        step={1}>
        <AccountFlowIntro
          subtitle="You will use this with your mobile number or email to log in."
          title="Create a password"
        />

        <View>
          <AccountFlowInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!passwordVisible}
            style={styles.passwordInput}
            textContentType="newPassword"
            value={password}
          />
          <Pressable
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.visibilityToggle}>
            <MaterialIcons color="#46576C" name={passwordVisible ? 'visibility' : 'visibility-off'} size={22} />
          </Pressable>
        </View>

        <View style={styles.checklist}>
          <Text style={accountFlowStyles.body}>Your password must have:</Text>
          <PasswordRequirementRow checked={passwordHasLength}>8 to 20 characters</PasswordRequirementRow>
          <PasswordRequirementRow checked={passwordHasSpecial}>at least one special character</PasswordRequirementRow>
        </View>
      </AccountFlowFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  passwordInput: {
    paddingRight: 40,
  },
  visibilityToggle: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 0,
  },
  checklist: {
    gap: 7,
  },
});
