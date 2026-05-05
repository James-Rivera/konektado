import type { OnboardingIntent } from "@/utils/save-role";
import { supabase } from "@/utils/supabase";

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type AuthUserSummary = {
  email: string | null;
  id: string;
};

const EMAIL_OTP_LENGTH = 6;
const EMAIL_OTP_TYPE = "email" as const;

function roleMetadata(role: OnboardingIntent | null) {
  return role ? { app_role: role, role } : undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeOtpToken(token: string) {
  return token.replace(/\D/g, "");
}

async function sendOnboardingEmailOtp({
  email,
  role,
}: {
  email: string;
  role: OnboardingIntent | null;
}) {
  const metadata = roleMetadata(role);

  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      ...(metadata ? { data: metadata } : {}),
    },
  });
}

function toAuthMessage(message: string, fallback: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Check your email and password, then try again.";
  }

  if (normalized.includes("token") || normalized.includes("otp")) {
    return "The code is incorrect or has expired. Request a new code and try again.";
  }

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists")
  ) {
    return "This email is already registered. Log in instead, or use a new test email for signup.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Please wait a moment before trying again.";
  }

  return message || fallback;
}

export async function requestSignupEmailOtp({
  email,
  role,
}: {
  email: string;
  role: OnboardingIntent | null;
}): Promise<ServiceResult<void>> {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return { data: null, error: "Enter a valid email address." };
  }

  const { error } = await sendOnboardingEmailOtp({
    email: normalizedEmail,
    role,
  });

  if (error) {
    return {
      data: null,
      error: toAuthMessage(
        error.message,
        "Could not send the email code. Please try again.",
      ),
    };
  }

  return { data: undefined, error: null };
}

export async function verifySignupEmailOtp({
  email,
  token,
}: {
  email: string;
  token: string;
}): Promise<ServiceResult<AuthUserSummary>> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedToken = normalizeOtpToken(token);

  if (!isValidEmail(normalizedEmail)) {
    return {
      data: null,
      error: "Enter a valid email address before verifying the code.",
    };
  }

  if (normalizedToken.length !== EMAIL_OTP_LENGTH) {
    return { data: null, error: "Enter the 6-digit code from your email." };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type: EMAIL_OTP_TYPE,
  });

  if (error) {
    return {
      data: null,
      error: toAuthMessage(
        error.message,
        "Could not verify the email code. Please try again.",
      ),
    };
  }

  if (!data.user) {
    return {
      data: null,
      error: "Could not verify this account. Please request a new code.",
    };
  }

  return {
    data: {
      email: data.user.email ?? normalizedEmail,
      id: data.user.id,
    },
    error: null,
  };
}

export async function resendSignupEmailOtp({
  email,
  role,
}: {
  email: string;
  role?: OnboardingIntent | null;
}): Promise<ServiceResult<void>> {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return { data: null, error: "Enter a valid email address." };
  }

  const { error } = await sendOnboardingEmailOtp({
    email: normalizedEmail,
    role: role ?? null,
  });

  if (error) {
    return {
      data: null,
      error: toAuthMessage(
        error.message,
        "Could not resend the email code. Please try again.",
      ),
    };
  }

  return { data: undefined, error: null };
}

export async function setSignupPassword({
  password,
  role,
}: {
  password: string;
  role: OnboardingIntent | null;
}): Promise<ServiceResult<void>> {
  const metadata = roleMetadata(role);
  const { error } = await supabase.auth.updateUser({
    password,
    ...(metadata ? { data: metadata } : {}),
  });

  if (error) {
    return {
      data: null,
      error: toAuthMessage(
        error.message,
        "Could not save your password. Please try again.",
      ),
    };
  }

  return { data: undefined, error: null };
}

export async function getCurrentAuthUser(): Promise<
  ServiceResult<AuthUserSummary>
> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { data: null, error: "Please verify your email again to continue." };
  }

  return {
    data: {
      email: data.user.email ?? null,
      id: data.user.id,
    },
    error: null,
  };
}

export async function signInWithEmailPassword({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<ServiceResult<void>> {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return { data: null, error: "Enter a valid email address." };
  }

  if (!password) {
    return { data: null, error: "Enter your password." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    return {
      data: null,
      error: toAuthMessage(error.message, "Sign in failed. Please try again."),
    };
  }

  return { data: undefined, error: null };
}
