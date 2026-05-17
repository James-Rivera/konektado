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

import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
    FloatingOnboardingInput,
    OnboardingBackButton,
    OnboardingButton,
    onboardingColors,
    OnboardingLoadingOverlay,
    OtpCodeInput,
    ProgressBars,
} from '@/components/onboarding/FigmaOnboarding';
import {
    ACCOUNT_EXISTS_SIGNUP_MESSAGE,
    requestSignupEmailOtp,
    resendSignupEmailOtp,
    verifySignupEmailOtp,
} from '@/services/auth.service';
import type { OnboardingIntent } from '@/utils/save-role';

type AccountStep = 'email' | 'code';
const EMAIL_OTP_LENGTH = 6;

function normalizeRole(raw: unknown): OnboardingIntent | null {
  if (raw === 'client' || raw === 'provider') return raw;
  if (Array.isArray(raw) && (raw[0] === 'client' || raw[0] === 'provider')) {
    return raw[0];
  }
  return null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedRole = useMemo(() => normalizeRole(params.role), [params.role]);
  const { height } = useWindowDimensions();

  const [step, setStep] = useState<AccountStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const verifyingCodeRef = useRef(false);

  const compactHeight = height < 760;
  const normalizedEmail = email.trim().toLowerCase();

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
      if (result.error === ACCOUNT_EXISTS_SIGNUP_MESSAGE) {
        showAccountExistsAlert();
        return;
      }

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
      if (result.error === ACCOUNT_EXISTS_SIGNUP_MESSAGE) {
        showAccountExistsAlert();
        return;
      }

      Alert.alert('Invalid code', result.error);
      return;
    }

    router.replace({
      pathname: '/(auth)/create-password',
      params: {
        email: normalizedEmail,
        ...(selectedRole ? { role: selectedRole } : {}),
      },
    });
  };

  const handleOtpChange = (nextValue: string) => {
    setOtp(nextValue);
    if (nextValue.length === EMAIL_OTP_LENGTH) {
      void verifyCode(nextValue);
    }
  };

  const showAccountExistsAlert = () => {
    Alert.alert(
      'Account already exists',
      ACCOUNT_EXISTS_SIGNUP_MESSAGE,
      [
        {
          text: 'Forgot password?',
          onPress: () => {
            router.replace({ pathname: '/(auth)/forgot-password', params: { email: normalizedEmail } });
          },
        },
        {
          text: 'Go to Log In',
          onPress: () => router.replace({ pathname: '/(auth)/login', params: { email: normalizedEmail } }),
        },
      ],
    );
  };

  const goBack = () => {
    if (loading) return;

    if (step === 'code') {
      setStep('email');
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
            <Pressable accessibilityRole="button" onPress={() => setLanguageSheetVisible(true)}>
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

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {step === 'email' ? renderEmailStep() : renderCodeStep()}
      <OnboardingLoadingOverlay visible={loading} />
      <BottomSheet maxHeight="42%" onClose={() => setLanguageSheetVisible(false)} visible={languageSheetVisible}>
        <View style={styles.languageSheetHeader}>
          <Text style={styles.languageSheetTitle}>Language</Text>
          <Pressable accessibilityLabel="Close language selector" accessibilityRole="button" onPress={() => setLanguageSheetVisible(false)}>
            <Text style={styles.languageSheetClose}>Close</Text>
          </Pressable>
        </View>
        <View style={styles.languageOptionSelected}>
          <Text style={styles.languageOptionText}>English (Manila)</Text>
          <Text style={styles.languageOptionMeta}>Current</Text>
        </View>
        <View style={styles.languageOptionDisabled}>
          <Text style={styles.languageOptionTextMuted}>Filipino</Text>
          <Text style={styles.languageOptionMetaMuted}>Not available in this MVP</Text>
        </View>
        <PrimaryButton label="Done" onPress={() => setLanguageSheetVisible(false)} />
      </BottomSheet>
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
  languageSheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  languageSheetTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  languageSheetClose: {
    color: '#69A4EC',
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  languageOptionSelected: {
    backgroundColor: '#EDF5FF',
    borderColor: '#69A4EC',
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    padding: 14,
  },
  languageOptionDisabled: {
    backgroundColor: '#F5F5EF',
    borderRadius: 12,
    gap: 2,
    opacity: 0.78,
    padding: 14,
  },
  languageOptionText: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  languageOptionTextMuted: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  languageOptionMeta: {
    color: '#69A4EC',
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  languageOptionMetaMuted: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
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
