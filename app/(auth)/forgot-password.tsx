import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  AuthShell,
  FloatingOnboardingInput,
  OnboardingBackButton,
  OnboardingButton,
  OnboardingLoadingOverlay,
  OnboardingTextInput,
  OtpCodeInput,
  PasswordRequirementRow,
  ProgressBars,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';
import { useFeedback } from '@/components/FeedbackProvider';
import {
  requestPasswordResetEmailOtp,
  resendPasswordResetEmailOtp,
  setRecoveredPassword,
  verifyPasswordResetEmailOtp,
} from '@/services/auth.service';

type RecoveryStep = 'email' | 'code' | 'password';

const EMAIL_OTP_LENGTH = 6;

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function hasSpecialCharacter(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showSuccessToast } = useFeedback();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const { height } = useWindowDimensions();
  const compactHeight = height < 760;

  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const verifyingCodeRef = useRef(false);

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHasLength = password.length >= 8 && password.length <= 20;
  const passwordHasSpecial = hasSpecialCharacter(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordReady = passwordHasLength && passwordHasSpecial && passwordsMatch;

  const goToLogin = () => {
    if (normalizedEmail) {
      router.replace({ pathname: '/(auth)/login', params: { email: normalizedEmail } });
      return;
    }

    router.replace('/(auth)/login');
  };

  useEffect(() => {
    const nextEmail = getParamValue(params.email);
    if (nextEmail) {
      setEmail(nextEmail);
    }
  }, [params.email]);

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
    const result = await requestPasswordResetEmailOtp({ email: normalizedEmail });
    setLoading(false);

    if (result.error) {
      Alert.alert('Could not send code', result.error);
      return;
    }

    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setResendSeconds(60);
    setStep('code');
  };

  const resendCode = async () => {
    if (resendSeconds > 0 || loading || resendingCode) return;

    setResendingCode(true);
    const result = await resendPasswordResetEmailOtp({ email: normalizedEmail });
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
    const result = await verifyPasswordResetEmailOtp({ email: normalizedEmail, token: code });
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

    if (!passwordReady) {
      Alert.alert('Password requirements', 'Use 8 to 20 characters, include a special character, and confirm the same password.');
      return;
    }

    setLoading(true);
    const result = await setRecoveredPassword({ password });
    setLoading(false);

    if (result.error) {
      Alert.alert('Could not save password', result.error);
      return;
    }

    showSuccessToast('Password updated');
    goToLogin();
  };

  const goBack = () => {
    if (loading) return;

    if (step === 'password') {
      setPassword('');
      setConfirmPassword('');
      setStep('code');
      return;
    }

    if (step === 'code') {
      setStep('email');
      return;
    }

    goToLogin();
  };

  const renderEmailStep = () => (
    <AuthShell
      onClose={() => router.replace('/(auth)/login')}
      title="Forgot Password?"
      footer={
        <Pressable
          accessibilityRole="link"
          onPress={goToLogin}
          style={styles.footerLink}
        >
          <Text style={styles.footerText}>
            Remembered your password? <Text style={styles.footerTextStrong}>Log In</Text>
          </Text>
        </Pressable>
      }
    >
      <View style={styles.emailForm}>
        <Text style={styles.emailHelper}>
          Enter your account email and we&apos;ll send a 6-digit reset code.
        </Text>
        <OnboardingTextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          textContentType="emailAddress"
          value={email}
        />
      </View>

      <OnboardingButton label="Send reset code" loading={loading} onPress={requestCode} style={styles.submitButton} />
    </AuthShell>
  );

  const renderCodeStep = () => (
    <RecoveryStepFrame
      contentStyle={[styles.codeContent, compactHeight ? styles.codeContentCompact : undefined]}
      onBack={goBack}
    >
      <View style={styles.formTitleBlock}>
        <Text style={styles.title}>Enter the code</Text>
        <ProgressBars current={2} total={3} />
      </View>

      <View style={styles.codeDetails}>
        <Text style={styles.descriptionText}>Enter the 6-digit password reset code sent to {normalizedEmail || 'your email'}.</Text>
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
          Enter the code from your <Text style={styles.infoTextStrong}>email</Text>. This lets us confirm the account before changing the password.
        </Text>
      </View>
    </RecoveryStepFrame>
  );

  const renderPasswordStep = () => (
    <RecoveryStepFrame
      contentStyle={[styles.passwordContent, compactHeight ? styles.passwordContentCompact : undefined]}
      footer={<OnboardingButton disabled={!passwordReady} label="Save new password" loading={loading} onPress={savePassword} style={styles.primaryButton} />}
      onBack={goBack}
    >
      <View style={styles.formTitleBlock}>
        <Text style={styles.title}>Create a Password</Text>
        <ProgressBars current={3} total={3} />
      </View>

      <View style={styles.passwordInputs}>
        <FloatingOnboardingInput
          label="New password"
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
          textContentType="newPassword"
          trailingIcon={passwordVisible ? 'visibility' : 'visibility-off'}
          trailingIconLabel={passwordVisible ? 'Hide password' : 'Show password'}
          onTrailingIconPress={() => setPasswordVisible((visible) => !visible)}
          value={password}
        />
        <FloatingOnboardingInput
          label="Confirm password"
          onChangeText={setConfirmPassword}
          secureTextEntry={!confirmPasswordVisible}
          textContentType="newPassword"
          trailingIcon={confirmPasswordVisible ? 'visibility' : 'visibility-off'}
          trailingIconLabel={confirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}
          onTrailingIconPress={() => setConfirmPasswordVisible((visible) => !visible)}
          value={confirmPassword}
        />
      </View>

      <View style={styles.passwordChecklist}>
        <Text style={styles.passwordChecklistTitle}>Your password must have at least:</Text>
        <PasswordRequirementRow checked={passwordHasLength}>must be 8 characters (20 max)</PasswordRequirementRow>
        <PasswordRequirementRow checked={passwordHasSpecial}>password must have special characters</PasswordRequirementRow>
        <PasswordRequirementRow checked={passwordsMatch}>confirmation must match</PasswordRequirementRow>
      </View>
    </RecoveryStepFrame>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {step === 'email' ? renderEmailStep() : step === 'code' ? renderCodeStep() : renderPasswordStep()}
      <OnboardingLoadingOverlay visible={loading} />
    </View>
  );
}

function RecoveryStepFrame({
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
  emailForm: {
    gap: 18,
  },
  emailHelper: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
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
  title: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 24,
    lineHeight: 39,
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
    paddingTop: 68,
  },
  passwordContentCompact: {
    paddingTop: 32,
  },
  passwordInputs: {
    gap: 12,
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
