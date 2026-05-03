import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  KonektadoWordmark,
  OnboardingBackButton,
  OnboardingButton,
  OnboardingLoadingOverlay,
  OtpCodeInput,
  PasswordRequirementRow,
  ProgressBars,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';
import {
  getCurrentAuthUser,
  requestSignupEmailOtp,
  resendSignupEmailOtp,
  setSignupPassword,
  verifySignupEmailOtp,
} from '@/services/auth.service';
import { saveUserRole, type OnboardingIntent } from '@/utils/save-role';

type AccountStep = 'email' | 'code' | 'password';
const EMAIL_OTP_LENGTH = 6;

function normalizeRole(raw: unknown): OnboardingIntent | null {
  if (raw === 'client' || raw === 'provider' || raw === 'both') return raw;
  if (Array.isArray(raw) && (raw[0] === 'client' || raw[0] === 'provider' || raw[0] === 'both')) {
    return raw[0];
  }
  return null;
}

function hasSpecialCharacter(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedRole = useMemo(() => normalizeRole(params.role), [params.role]);
  const { height } = useWindowDimensions();

  const [step, setStep] = useState<AccountStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const verifyingCodeRef = useRef(false);

  const compactHeight = height < 760;
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHasLength = password.length >= 8 && password.length <= 20;
  const passwordHasSpecial = hasSpecialCharacter(password);

  useEffect(() => {
    if (step !== 'code' || resendSeconds <= 0) return;

    const timer = setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendSeconds, step]);

  const requestCode = async () => {
    if (loading || resendingCode) return;

    setLoading(true);
    const result = await requestSignupEmailOtp({ email: normalizedEmail, role: selectedRole });
    setLoading(false);

    if (result.error) {
      Alert.alert('Could not send code', result.error);
      return;
    }

    setOtp('');
    setResendSeconds(60);
    setStep('code');
  };

  const resendCode = async () => {
    if (resendSeconds > 0 || loading || resendingCode) return;

    setResendingCode(true);
    const result = await resendSignupEmailOtp({ email: normalizedEmail, role: selectedRole });
    setResendingCode(false);

    if (result.error) {
      Alert.alert('Could not resend code', result.error);
      return;
    }

    setOtp('');
    setResendSeconds(60);
  };

  const verifyCode = async (code: string) => {
    if (code.length !== EMAIL_OTP_LENGTH || loading || verifyingCodeRef.current) return;

    verifyingCodeRef.current = true;
    setLoading(true);
    const result = await verifySignupEmailOtp({ email: normalizedEmail, token: code });
    setLoading(false);
    verifyingCodeRef.current = false;

    if (result.error) {
      setOtp('');
      Alert.alert('Invalid code', result.error);
      return;
    }

    setStep('password');
  };

  const handleOtpChange = (nextValue: string) => {
    setOtp(nextValue);
    if (nextValue.length === EMAIL_OTP_LENGTH) {
      void verifyCode(nextValue);
    }
  };

  const savePassword = async () => {
    if (loading) return;

    if (!passwordHasLength || !passwordHasSpecial) {
      Alert.alert('Password requirements', 'Use 8 to 20 characters and include at least one special character.');
      return;
    }

    setLoading(true);
    const passwordResult = await setSignupPassword({ password, role: selectedRole });

    if (passwordResult.error) {
      setLoading(false);
      Alert.alert('Could not save password', passwordResult.error);
      return;
    }

    const userResult = await getCurrentAuthUser();

    if (userResult.error || !userResult.data) {
      setLoading(false);
      Alert.alert('Session expired', userResult.error ?? 'Please verify your email again to continue.');
      setStep('email');
      return;
    }

    const currentUser = userResult.data;

    if (selectedRole) {
      const saveRoleError = await saveUserRole({
        email: currentUser.email,
        role: selectedRole,
        userId: currentUser.id,
      });

      if (saveRoleError) {
        setLoading(false);
        Alert.alert('Could not save role', saveRoleError.message);
        return;
      }
    }

    setLoading(false);
    router.replace(selectedRole ? '/(onboarding)' : '/(auth)/role');
  };

  const goBack = () => {
    if (loading) return;

    if (step === 'code') {
      setStep('email');
      return;
    }

    if (step === 'password') {
      setStep('code');
      return;
    }

    router.replace('/(auth)/role');
  };

  const renderEmailStep = () => (
    <AccountStepFrame
      contentStyle={[
        styles.emailContent,
        { paddingTop: compactHeight ? 74 : Math.min(118, height * 0.15) },
      ]}
      footer={<OnboardingButton label="Next" loading={loading} onPress={requestCode} style={styles.primaryButton} />}
    >
      <View style={styles.logoProgressBlock}>
        <KonektadoWordmark color="dark" size="small" />
        <ProgressBars current={1} total={4} />
      </View>

      <View style={styles.emailMain}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{"Let's get started"}</Text>
          <View style={styles.languageRow}>
            <Text style={styles.languageText}>English (Manila)</Text>
            <Pressable accessibilityRole="button" onPress={() => Alert.alert('Language', 'Language switching is not configured yet.')}>
              <Text style={styles.languageAction}>Change</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <FloatingOnboardingInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            textContentType="emailAddress"
            value={email}
          />
          <Text style={styles.instructionText}>{"We'll send you a code to verify your email."}</Text>
        </View>
      </View>
    </AccountStepFrame>
  );

  const renderCodeStep = () => (
    <AccountStepFrame
      contentStyle={[styles.codeContent, compactHeight ? styles.codeContentCompact : undefined]}
      onBack={goBack}
    >
      <View style={styles.formTitleBlock}>
        <Text style={styles.title}>Enter the code</Text>
        <ProgressBars current={2} total={4} />
      </View>

      <View style={styles.codeDetails}>
        <Text style={styles.descriptionText}>Enter the 6-digit code sent to {normalizedEmail || 'your email'}.</Text>
        <Pressable
          accessibilityRole="button"
          disabled={resendSeconds > 0 || loading || resendingCode}
          onPress={resendCode}
        >
          <Text style={[styles.resendText, resendSeconds > 0 ? styles.resendTextDisabled : undefined]}>
            {resendingCode ? 'Sending...' : resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
          </Text>
        </Pressable>
      </View>

      <OtpCodeInput
        autoFocus
        disabled={loading}
        onChangeText={handleOtpChange}
        value={otp}
      />

      <View style={styles.infoNote}>
        <View style={styles.infoIcon}>
          <Text style={styles.infoIconText}>i</Text>
        </View>
        <Text style={styles.infoText}>
          Enter the code from your <Text style={styles.infoTextStrong}>email</Text>. This helps keep your account secure.
        </Text>
      </View>
    </AccountStepFrame>
  );

  const renderPasswordStep = () => (
    <AccountStepFrame
      contentStyle={[styles.passwordContent, compactHeight ? styles.passwordContentCompact : undefined]}
      footer={<OnboardingButton label="Next" loading={loading} onPress={savePassword} style={styles.primaryButton} />}
      onBack={goBack}
    >
      <View style={styles.formTitleBlock}>
        <Text style={styles.title}>Create a Password</Text>
        <ProgressBars current={2} total={4} />
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
        <Text style={styles.passwordChecklistTitle}>Your password must have atleast:</Text>
        <PasswordRequirementRow checked={passwordHasLength}>must be 8 characters (20 max)</PasswordRequirementRow>
        <PasswordRequirementRow checked={passwordHasSpecial}>password must have special characters</PasswordRequirementRow>
      </View>
    </AccountStepFrame>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {step === 'email' ? renderEmailStep() : step === 'code' ? renderCodeStep() : renderPasswordStep()}
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
  onBack?: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        {onBack ? (
          <View style={styles.topHeader}>
            <OnboardingBackButton onPress={onBack} />
            <View style={styles.headerSpacer} />
          </View>
        ) : null}

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
  emailContent: {
    paddingHorizontal: 24,
  },
  logoProgressBlock: {
    gap: 25,
  },
  emailMain: {
    gap: 28,
    paddingTop: 26,
  },
  titleContainer: {
    gap: 11,
  },
  title: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 24,
    lineHeight: 39,
  },
  languageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 21,
  },
  languageText: {
    color: 'rgba(0, 0, 0, 0.77)',
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  languageAction: {
    color: '#69A4EC',
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 20,
  },
  inputGroup: {
    gap: 24,
  },
  instructionText: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Light',
    fontSize: 13,
    lineHeight: 20,
  },
  codeContent: {
    gap: 20,
    paddingTop: 36,
  },
  codeContentCompact: {
    paddingTop: 18,
  },
  formTitleBlock: {
    gap: 10,
  },
  codeDetails: {
    gap: 14,
  },
  descriptionText: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 20,
  },
  resendText: {
    color: '#69A4EC',
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 20,
  },
  resendTextDisabled: {
    opacity: 1,
  },
  infoNote: {
    alignItems: 'flex-start',
    backgroundColor: '#F5F5EF',
    borderRadius: 13,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 16,
  },
  infoIcon: {
    alignItems: 'center',
    borderColor: onboardingColors.actionBlue,
    borderRadius: 13,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  infoIconText: {
    color: onboardingColors.actionBlue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 16,
  },
  infoText: {
    color: onboardingColors.textMuted,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  infoTextStrong: {
    fontFamily: 'Satoshi-Bold',
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
