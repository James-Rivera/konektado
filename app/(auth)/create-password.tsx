import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FloatingOnboardingInput,
  OnboardingBackButton,
  OnboardingButton,
  OnboardingLoadingOverlay,
  PasswordRequirementRow,
  ProgressBars,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';
import { getCurrentAuthUser, getCurrentSignupRole, setSignupPassword } from '@/services/auth.service';
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

export default function CreatePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedRole = useMemo(() => normalizeRole(params.role), [params.role]);
  const email = getParamValue(params.email) ?? null;
  const { height } = useWindowDimensions();
  const compactHeight = height < 760;

  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordHasLength = password.length >= 8 && password.length <= 20;
  const passwordHasSpecial = hasSpecialCharacter(password);

  const savePassword = async () => {
    if (loading) return;

    if (!passwordHasLength || !passwordHasSpecial) {
      Alert.alert('Password requirements', 'Use 8 to 20 characters and include at least one special character.');
      return;
    }

    setLoading(true);
    const roleResult = selectedRole
      ? ({ data: selectedRole, error: null } as const)
      : await getCurrentSignupRole();

    if (roleResult.error) {
      setLoading(false);
      Alert.alert('Session expired', roleResult.error);
      router.replace('/(auth)/role');
      return;
    }

    const roleForSignup = roleResult.data;
    const passwordResult = await setSignupPassword({ password, role: roleForSignup });

    if (passwordResult.error) {
      setLoading(false);
      Alert.alert('Could not save password', passwordResult.error);
      return;
    }

    const userResult = await getCurrentAuthUser();

    if (userResult.error || !userResult.data) {
      setLoading(false);
      Alert.alert('Session expired', userResult.error ?? 'Please verify your email again to continue.');
      router.replace('/(auth)/role');
      return;
    }

    const currentUser = userResult.data;

    if (roleForSignup) {
      const saveRoleError = await saveUserRole({
        email: currentUser.email ?? email,
        role: roleForSignup,
        userId: currentUser.id,
      });

      if (saveRoleError) {
        setLoading(false);
        Alert.alert('Could not save role', saveRoleError.message);
        return;
      }
    }

    setLoading(false);
    router.replace(roleForSignup ? '/(onboarding)' : '/(auth)/role');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <AccountStepFrame
        contentStyle={[styles.passwordContent, compactHeight ? styles.passwordContentCompact : undefined]}
        footer={<OnboardingButton label="Next" loading={loading} onPress={savePassword} style={styles.primaryButton} />}
        onBack={() => Alert.alert('Create password', 'Create a password before continuing to onboarding.')}
      >
        <View style={styles.formTitleBlock}>
          <Text style={styles.title}>Create a Password</Text>
          <ProgressBars current={3} total={4} />
        </View>

        <FloatingOnboardingInput
          label="Password"
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
          textContentType="newPassword"
          trailingIcon={passwordVisible ? 'visibility' : 'visibility-off'}
          trailingIconLabel={passwordVisible ? 'Hide password' : 'Show password'}
          onTrailingIconPress={() => setPasswordVisible((visible) => !visible)}
          value={password}
        />

        <View style={styles.passwordChecklist}>
          <Text style={styles.passwordChecklistTitle}>Your password must have at least:</Text>
          <PasswordRequirementRow checked={passwordHasLength}>must be 8 characters (20 max)</PasswordRequirementRow>
          <PasswordRequirementRow checked={passwordHasSpecial}>password must have special characters</PasswordRequirementRow>
        </View>
      </AccountStepFrame>
      <OnboardingLoadingOverlay visible={loading} />
    </View>
  );
}

function AccountStepFrame({
  children,
  contentStyle,
  footer,
  onBack,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  onBack: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <View style={styles.topHeader}>
          <OnboardingBackButton onPress={onBack} />
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: onboardingColors.surface,
    flex: 1,
  },
  safeArea: {
    backgroundColor: onboardingColors.surface,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  topHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 55,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerSpacer: {
    height: 24,
    width: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
  },
  formTitleBlock: {
    gap: 10,
  },
  title: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 24,
    lineHeight: 39,
  },
  passwordContent: {
    gap: 28,
    paddingTop: 87,
  },
  passwordContentCompact: {
    paddingTop: 48,
  },
  passwordChecklist: {
    gap: 7,
  },
  passwordChecklistTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 20,
  },
  footer: {
    paddingBottom: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  primaryButton: {
    width: '100%',
  },
});
