import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AccountFlowButton,
  AccountFlowDivider,
  AccountFlowError,
  AccountFlowFrame,
  AccountFlowInput,
  AccountFlowIntro,
  AccountFlowOutlineButton,
  accountFlowStyles,
} from '@/components/onboarding/AccountFlowUI';
import { OtpCodeInput } from '@/components/onboarding/FigmaOnboarding';
import { PHONE_AUTH_ENABLED } from '@/constants/auth-config';
import {
  ACCOUNT_EXISTS_PHONE_SIGNUP_MESSAGE,
  ACCOUNT_EXISTS_SIGNUP_MESSAGE,
  requestSignupEmailOtp,
  requestSignupPhoneOtp,
  resendSignupEmailOtp,
  resendSignupPhoneOtp,
  verifySignupEmailOtp,
  verifySignupPhoneOtp,
} from '@/services/auth.service';
import { formatPhilippineMobile, normalizePhilippineMobile } from '@/utils/phone';
import type { OnboardingIntent } from '@/utils/save-role';

type AccountStep = 'identifier' | 'code';
type AccountMethod = 'email' | 'phone';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeRole(raw: unknown): OnboardingIntent | null {
  if (raw === 'client' || raw === 'provider') return raw;
  if (Array.isArray(raw) && (raw[0] === 'client' || raw[0] === 'provider')) {
    return raw[0];
  }
  return null;
}

/**
 * Create your Account (Figma 1493:2702) and Enter the code (1493:2784).
 *
 * Residents sign up with a mobile number or an email. Mobile is the Figma
 * default and the more familiar path locally, but it depends on Supabase phone
 * auth, so it is only offered when PHONE_AUTH_ENABLED is on. Otherwise the
 * screen is email-only and behaves exactly as before (DEC-014/DEC-015).
 *
 * The Figma's Google/Apple buttons are intentionally omitted: neither provider
 * is configured, and a button that cannot work is worse than no button.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedRole = useMemo(() => normalizeRole(params.role), [params.role]);

  const [method, setMethod] = useState<AccountMethod>(PHONE_AUTH_ENABLED ? 'phone' : 'email');
  const [step, setStep] = useState<AccountStep>('identifier');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [formError, setFormError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const verifyingCodeRef = useRef(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isPhone = method === 'phone';
  const destinationLabel = isPhone ? formatPhilippineMobile(phone) : normalizedEmail;

  useEffect(() => {
    if (step !== 'code' || resendSeconds <= 0) return;

    const timer = setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendSeconds, step]);

  /**
   * One error surface: the inline block under the field. It works on web
   * (where Alert is a no-op) and carries the Log In / Forgot password actions.
   * A toast on top of it only repeated the same sentence.
   */
  const reportError = (message: string) => {
    setFormError(message);
    setAccountExists(
      message === ACCOUNT_EXISTS_SIGNUP_MESSAGE || message === ACCOUNT_EXISTS_PHONE_SIGNUP_MESSAGE,
    );
  };

  const clearError = () => {
    setFormError(null);
    setAccountExists(false);
  };

  const switchMethod = () => {
    clearError();
    setMethod((current) => (current === 'phone' ? 'email' : 'phone'));
  };

  const requestCode = async () => {
    if (loading || resendingCode) return;

    if (isPhone && !normalizePhilippineMobile(phone)) {
      reportError('Enter a valid Philippine mobile number, like 0917 123 4567.');
      return;
    }

    if (!isPhone && !isValidEmail(normalizedEmail)) {
      reportError('Enter a valid email address.');
      return;
    }

    clearError();
    setLoading(true);
    const result = isPhone
      ? await requestSignupPhoneOtp({ phone, role: selectedRole })
      : await requestSignupEmailOtp({ email: normalizedEmail, role: selectedRole });
    setLoading(false);

    if (result.error) {
      reportError(result.error);
      return;
    }

    setOtp('');
    setResendSeconds(RESEND_SECONDS);
    setStep('code');
  };

  const resendCode = async () => {
    if (resendSeconds > 0 || loading || resendingCode) return;

    clearError();
    setResendingCode(true);
    const result = isPhone
      ? await resendSignupPhoneOtp({ phone, role: selectedRole })
      : await resendSignupEmailOtp({ email: normalizedEmail, role: selectedRole });
    setResendingCode(false);

    if (result.error) {
      reportError(result.error);
      return;
    }

    setOtp('');
    setResendSeconds(RESEND_SECONDS);
  };

  const verifyCode = async (code: string) => {
    if (code.length !== OTP_LENGTH || loading || verifyingCodeRef.current) return;

    verifyingCodeRef.current = true;
    clearError();
    setLoading(true);
    const result = isPhone
      ? await verifySignupPhoneOtp({ phone, token: code })
      : await verifySignupEmailOtp({ email: normalizedEmail, token: code });
    setLoading(false);
    verifyingCodeRef.current = false;

    if (result.error) {
      setOtp('');
      reportError(result.error);
      return;
    }

    router.replace({
      pathname: '/(auth)/create-password',
      params: {
        ...(isPhone ? { phone: normalizePhilippineMobile(phone) ?? phone } : { email: normalizedEmail }),
        ...(selectedRole ? { role: selectedRole } : {}),
      },
    });
  };

  const handleOtpChange = (nextValue: string) => {
    setOtp(nextValue);
    if (nextValue.length === OTP_LENGTH) {
      void verifyCode(nextValue);
    }
  };

  const goToLogin = () =>
    router.replace({
      pathname: '/(auth)/login',
      params: isPhone ? { identifier: phone.trim() } : { email: normalizedEmail },
    });

  const goToForgotPassword = () =>
    router.replace({ pathname: '/(auth)/forgot-password', params: { email: normalizedEmail } });

  const goBack = () => {
    if (loading) return;

    if (step === 'code') {
      clearError();
      setOtp('');
      setStep('identifier');
      return;
    }

    router.replace('/(auth)/role');
  };

  const errorBlock = formError ? (
    <AccountFlowError>
      <Text style={accountFlowStyles.errorText}>{formError}</Text>
      {accountExists ? (
        <View style={styles.errorActions}>
          <Pressable accessibilityRole="button" onPress={goToLogin}>
            <Text style={accountFlowStyles.link}>Go to Log In</Text>
          </Pressable>
          {!isPhone ? (
            <Pressable accessibilityRole="button" onPress={goToForgotPassword}>
              <Text style={accountFlowStyles.link}>Forgot password?</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </AccountFlowError>
  ) : null;

  const identifierStep = (
    <AccountFlowFrame onBack={goBack} step={1}>
      <AccountFlowIntro
        subtitle={
          isPhone
            ? "Enter your mobile number and we'll send you a verification code."
            : "Enter your email and we'll send you a verification code."
        }
        title="Create your Account"
      />

      {isPhone ? (
        <AccountFlowInput
          accessibilityLabel="Mobile number"
          autoComplete="tel"
          inputMode="tel"
          keyboardType="phone-pad"
          maxLength={16}
          onChangeText={(value) => {
            setPhone(value);
            if (formError) clearError();
          }}
          placeholder="Mobile Number"
          prefix="+63"
          textContentType="telephoneNumber"
          value={phone}
        />
      ) : (
        <AccountFlowInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          keyboardType="email-address"
          onChangeText={(value) => {
            setEmail(value);
            if (formError) clearError();
          }}
          placeholder="Email address"
          textContentType="emailAddress"
          value={email}
        />
      )}

      <AccountFlowButton label="Continue" loading={loading} onPress={requestCode} />

      {errorBlock}

      {PHONE_AUTH_ENABLED ? (
        <>
          <AccountFlowDivider />
          <AccountFlowOutlineButton
            icon={isPhone ? 'mail-outline' : 'phone-iphone'}
            label={isPhone ? 'Use email instead' : 'Use mobile number instead'}
            onPress={switchMethod}
          />
        </>
      ) : null}

      <Text style={accountFlowStyles.legal}>
        By continuing, you agree to our{' '}
        <Text style={accountFlowStyles.legalStrong}>Terms of Service</Text> and{' '}
        <Text style={accountFlowStyles.legalStrong}>Privacy Policy</Text>.
      </Text>
    </AccountFlowFrame>
  );

  const codeStep = (
    <AccountFlowFrame onBack={goBack} step={1}>
      <AccountFlowIntro
        subtitle={`We have sent a 6-digit code to ${destinationLabel || (isPhone ? 'your phone' : 'your email')}.`}
        title="Enter the code"
      />

      <Pressable
        accessibilityRole="button"
        disabled={resendSeconds > 0 || loading || resendingCode}
        onPress={resendCode}>
        <Text style={[accountFlowStyles.link, resendSeconds > 0 && styles.resendDisabled]}>
          {resendingCode ? 'Sending...' : resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
        </Text>
      </Pressable>

      <OtpCodeInput autoFocus disabled={loading} onChangeText={handleOtpChange} value={otp} />

      {errorBlock}

      {/* The code auto-submits on the sixth digit, so there is no button to
          carry a spinner. Show progress inline, in place of the helper line. */}
      {loading ? (
        <View accessibilityLiveRegion="polite" style={styles.checkingRow}>
          <ActivityIndicator color="#46576C" size="small" />
          <Text style={accountFlowStyles.body}>Checking code...</Text>
        </View>
      ) : (
        <Text style={accountFlowStyles.body}>
          {isPhone
            ? 'Enter the code from the SMS. This helps keep your account secure.'
            : 'Enter the code from your email. This helps keep your account secure.'}
        </Text>
      )}
    </AccountFlowFrame>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {step === 'identifier' ? identifierStep : codeStep}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 18,
  },
  resendDisabled: {
    color: '#46576C',
  },
  checkingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
