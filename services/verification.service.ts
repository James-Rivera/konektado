import { File } from 'expo-file-system';
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import type { ServiceResult } from '@/services/auth.service';
import type { VerificationUpload } from '@/types/onboarding.types';
import type {
  CreateVerificationRequestInput,
  CreatedVerificationRequest,
  ContactOtpSendResult,
  VerificationIdType,
  VerificationPrefill,
  VerificationStatus,
  VerificationSummary,
} from '@/types/verification.types';
import { sendVerificationSubmittedEmail } from '@/services/verification-email.service';
import { supabase } from '@/utils/supabase';
import {
  getLegalNameEditPolicy,
  NAME_LOCKED_SERVICE_ERROR,
} from '@/utils/verified-name-policy';

const VERIFICATION_BUCKET = 'verification-files';

type ProfileRow = {
  birthdate: string | null;
  barangay_verified_at?: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  street_address: string | null;
  city: string | null;
  barangay: string | null;
  verified_at?: string | null;
};

type PreferencesRow = {
  custom_needed_services: string[] | null;
  custom_offered_services: string[] | null;
  needed_services: string[] | null;
  offered_services: string[] | null;
};

type VerificationRow = {
  id: string;
  status: VerificationStatus;
  notes: string | null;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
};

function compactText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function compactValues(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.map(compactText).filter(Boolean)));
}

function mapVerification(row: VerificationRow): VerificationSummary {
  return {
    id: row.id,
    idType: getVerificationIdTypeFromNotes(row.notes),
    status: row.status,
    notes: row.notes,
    reviewerNote: row.reviewer_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getVerificationIdTypeFromNotes(notes: string | null): VerificationIdType | null {
  if (!notes) return null;

  try {
    const parsed = JSON.parse(notes) as { document?: { idType?: unknown } };
    const idType = parsed.document?.idType;
    return isVerificationIdType(idType) ? idType : null;
  } catch {
    return null;
  }
}

function isVerificationIdType(value: unknown): value is VerificationIdType {
  return (
    value === 'barangay_certificate' ||
    value === 'national_id' ||
    value === 'drivers_license' ||
    value === 'passport'
  );
}

function getFileName(file: VerificationUpload, index: number) {
  const fallback = `${file.fileType}-${index}`;
  return (file.name || fallback).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 90);
}

async function uploadVerificationFile({
  file,
  index,
  userId,
  verificationId,
}: {
  file: VerificationUpload;
  index: number;
  userId: string;
  verificationId: string;
}): Promise<ServiceResult<string>> {
  try {
    const localFile = new File(file.uri);
    const fileBuffer = await localFile.arrayBuffer();
    const path = `${userId}/${verificationId}/${Date.now()}-${index}-${getFileName(file, index)}`;

    const { error: uploadError } = await supabase.storage
      .from(VERIFICATION_BUCKET)
      .upload(path, fileBuffer, {
        contentType: file.mimeType ?? 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return { data: null, error: uploadError.message };
    }

    return { data: path, error: null };
  } catch {
    return { data: null, error: `Could not upload ${file.name || file.fileType}.` };
  }
}

function validateInput(input: CreateVerificationRequestInput): string | null {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return 'Enter your first and last name as shown on your ID.';
  }

  if (!input.birthdate.trim()) {
    return 'Enter your date of birth as shown on your ID.';
  }

  if (!input.city.trim() || !input.barangay.trim()) {
    return 'Confirm your city and barangay.';
  }

  if (!input.phone.trim()) {
    return 'Enter a contact number for verification updates.';
  }

  if (!input.contactOtpChallengeId) {
    return 'Confirm your contact number before submitting verification.';
  }

  const hasCertificate = input.files.some((file) => file.fileType === 'certification');
  const hasIdFront = input.files.some((file) => file.fileType === 'id_front');
  const hasIdBack = input.files.some((file) => file.fileType === 'id_back');
  const hasFacePhoto = input.files.some((file) => file.fileType === 'other');

  if (input.idType === 'barangay_certificate' && !hasCertificate) {
    return 'Upload your barangay certificate.';
  }

  if (input.idType !== 'barangay_certificate' && (!hasIdFront || !hasIdBack)) {
    return 'Upload both ID front and ID back.';
  }

  if (!hasFacePhoto) {
    return 'Upload a clear face photo.';
  }

  return null;
}

function buildNotesPayload(input: CreateVerificationRequestInput) {
  return JSON.stringify({
    submittedNote: compactText(input.note) || null,
    contact: {
      email: input.email,
      phone: compactText(input.phone),
    },
    document: {
      idType: input.idType,
      hasCertificate: input.files.some((file) => file.fileType === 'certification'),
      hasFacePhoto: input.files.some((file) => file.fileType === 'other'),
    },
    identity: {
      birthdate: compactText(input.birthdate),
      firstName: compactText(input.firstName),
      lastName: compactText(input.lastName),
      streetAddress: compactText(input.streetAddress),
      city: compactText(input.city),
      barangay: compactText(input.barangay),
    },
    servicesOrPurpose: compactText(input.servicesOrPurpose),
    submittedAt: new Date().toISOString(),
  });
}

function hasProfileNameChanged({
  current,
  nextFirstName,
  nextFullName,
  nextLastName,
}: {
  current: Pick<ProfileRow, 'first_name' | 'full_name' | 'last_name'> | null;
  nextFirstName: string;
  nextFullName: string;
  nextLastName: string;
}) {
  if (!current) return true;

  const currentFirstName = compactText(current.first_name);
  const currentLastName = compactText(current.last_name);
  const currentFullName = compactText(current.full_name) || `${currentFirstName} ${currentLastName}`.trim();

  return (
    nextFirstName !== currentFirstName ||
    nextLastName !== currentLastName ||
    nextFullName !== currentFullName
  );
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { user: null, error: 'Please sign in again to continue.' };
  }

  return { user: data.user, error: null };
}

export async function getMyVerificationPrefill(): Promise<ServiceResult<VerificationPrefill>> {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { data: null, error: userError ?? 'Please sign in again to continue.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('birthdate, email, first_name, last_name, full_name, phone, street_address, city, barangay, verified_at, barangay_verified_at')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('offered_services, needed_services, custom_offered_services, custom_needed_services')
    .eq('user_id', user.id)
    .maybeSingle<PreferencesRow>();

  const { data: providerProfile } = await supabase
    .from('provider_profiles')
    .select('service_type')
    .eq('user_id', user.id)
    .maybeSingle<{ service_type: string | null }>();

  const { data: latestRequest, error: latestError } = await supabase
    .from('verifications')
    .select('id, status, notes, reviewer_note, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<VerificationRow>();

  if (latestError) {
    return { data: null, error: latestError.message };
  }

  const fallbackNameParts = compactText(profile?.full_name).split(' ').filter(Boolean);
  const servicesOrPurpose = compactValues([
    ...(preferences?.offered_services ?? []),
    ...(preferences?.custom_offered_services ?? []),
    ...(preferences?.needed_services ?? []),
    ...(preferences?.custom_needed_services ?? []),
    providerProfile?.service_type,
  ]).join(', ');

  return {
    data: {
      birthdate: profile?.birthdate ?? '',
      email: profile?.email ?? user.email ?? null,
      firstName: profile?.first_name ?? fallbackNameParts[0] ?? '',
      lastName: profile?.last_name ?? fallbackNameParts.slice(1).join(' '),
      phone: profile?.phone ?? '',
      streetAddress: profile?.street_address ?? '',
      city: profile?.city ?? 'Santo Tomas',
      barangay: profile?.barangay ?? 'San Pedro',
      servicesOrPurpose,
      legalNameEdit: getLegalNameEditPolicy({
        isVerified: Boolean(profile?.barangay_verified_at || profile?.verified_at),
        reviewerNote: latestRequest?.reviewer_note ?? null,
        status: latestRequest?.status ?? null,
      }),
      latestRequest: latestRequest ? mapVerification(latestRequest) : null,
    },
    error: null,
  };
}

export async function sendContactVerificationCode(
  phone: string,
): Promise<ContactOtpServiceResult<ContactOtpSendResult>> {
  const session = await getContactOtpSession();
  if (session.error || !session.data) {
    return {
      data: null,
      error: session.error ?? 'Please sign in again to continue.',
      errorCode: 'unauthorized',
      retryAfterSeconds: null,
    };
  }

  const { data, error } = await supabase.functions.invoke('contact-otp', {
    body: { action: 'send', phone },
    headers: { Authorization: `Bearer ${session.data}` },
  });
  if (error || data?.error) {
    const functionError = await getFunctionError(error, data, 'send');
    return {
      data: null,
      error: functionError.message,
      errorCode: functionError.code,
      retryAfterSeconds: functionError.retryAfterSeconds,
    };
  }
  return {
    data: data as ContactOtpSendResult,
    error: null,
    errorCode: null,
    retryAfterSeconds: null,
  };
}

export async function verifyContactVerificationCode({
  challengeId,
  code,
}: {
  challengeId: string;
  code: string;
}): Promise<ContactOtpServiceResult<string>> {
  const session = await getContactOtpSession();
  if (session.error || !session.data) {
    return {
      data: null,
      error: session.error ?? 'Please sign in again to continue.',
      errorCode: 'unauthorized',
      retryAfterSeconds: null,
    };
  }

  const { data, error } = await supabase.functions.invoke('contact-otp', {
    body: { action: 'verify', challengeId, code },
    headers: { Authorization: `Bearer ${session.data}` },
  });
  if (error || data?.error) {
    const functionError = await getFunctionError(error, data, 'verify');
    return {
      data: null,
      error: functionError.message,
      errorCode: functionError.code,
      retryAfterSeconds: functionError.retryAfterSeconds,
    };
  }
  if (!data?.verified) {
    return {
      data: null,
      error: 'Could not confirm this contact code.',
      errorCode: 'verification_failed',
      retryAfterSeconds: null,
    };
  }
  return {
    data: String(data.challengeId ?? challengeId),
    error: null,
    errorCode: null,
    retryAfterSeconds: null,
  };
}

export async function createVerificationRequest(
  input: CreateVerificationRequestInput,
): Promise<ServiceResult<CreatedVerificationRequest>> {
  const validationError = validateInput(input);

  if (validationError) {
    return { data: null, error: validationError };
  }

  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { data: null, error: userError ?? 'Please sign in again to continue.' };
  }

  const [{ data: profile, error: profileError }, { data: latestRequest, error: latestError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, full_name, verified_at, barangay_verified_at')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from('verifications')
      .select('id, status, notes, reviewer_note, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<VerificationRow>(),
  ]);

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  if (latestError) {
    return { data: null, error: latestError.message };
  }

  if (latestRequest?.status === 'pending') {
    return { data: null, error: 'You already have a pending verification request.' };
  }

  if (latestRequest?.status === 'approved') {
    return { data: null, error: 'Your profile is already barangay verified. Request a name correction if your verified name is wrong.' };
  }

  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const legalNameEdit = getLegalNameEditPolicy({
    isVerified: Boolean(profile?.barangay_verified_at || profile?.verified_at),
    reviewerNote: latestRequest?.reviewer_note ?? null,
    status: latestRequest?.status ?? null,
  });
  const nameChanged = hasProfileNameChanged({
    current: profile ?? null,
    nextFirstName: input.firstName.trim(),
    nextFullName: fullName,
    nextLastName: input.lastName.trim(),
  });

  if (nameChanged && !legalNameEdit.canEdit) {
    return { data: null, error: NAME_LOCKED_SERVICE_ERROR };
  }

  const profileUpdate = {
    birthdate: input.birthdate.trim() || null,
    phone: input.phone.trim(),
    street_address: input.streetAddress.trim() || null,
    city: input.city.trim(),
    barangay: input.barangay.trim(),
    updated_at: new Date().toISOString(),
  };

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update(
      legalNameEdit.canEdit
        ? {
            ...profileUpdate,
            first_name: input.firstName.trim(),
            full_name: fullName,
            last_name: input.lastName.trim(),
          }
        : profileUpdate,
    )
    .eq('id', user.id);

  if (profileUpdateError) {
    return { data: null, error: profileUpdateError.message };
  }

  const { data: verification, error: verificationError } = await supabase
    .from('verifications')
    .insert({
      contact_otp_challenge_id: input.contactOtpChallengeId,
      user_id: user.id,
      status: 'pending',
      notes: buildNotesPayload(input),
    })
    .select('id, status')
    .single<{ id: string; status: VerificationStatus }>();

  if (verificationError) {
    return { data: null, error: verificationError.message };
  }

  const uploadedFiles = await Promise.all(
    input.files.map(async (file, index) => {
      const uploaded = await uploadVerificationFile({
        file,
        index,
        userId: user.id,
        verificationId: verification.id,
      });

      return { file, uploaded };
    }),
  );

  const failedUpload = uploadedFiles.find((item) => item.uploaded.error || !item.uploaded.data);

  if (failedUpload) {
    await supabase
      .from('verifications')
      .update({
        status: 'cancelled',
        reviewer_note: 'File upload failed before submission could be completed.',
      })
      .eq('id', verification.id);

    return {
      data: null,
      error: failedUpload.uploaded.error ?? `Could not upload ${failedUpload.file.name || failedUpload.file.fileType}.`,
    };
  }

  const { error: fileError } = await supabase.from('verification_files').insert(
    uploadedFiles.map(({ file, uploaded }) => ({
      verification_id: verification.id,
      file_type: file.fileType,
      file_path: uploaded.data as string,
    })),
  );

  if (fileError) {
    return { data: null, error: fileError.message };
  }

  void sendVerificationSubmittedEmail({
    requestId: verification.id,
    ctaUrl: 'konektado://verification',
  });

  return {
    data: {
      id: verification.id,
      status: verification.status,
    },
    error: null,
  };
}

type ContactOtpOperation = 'send' | 'verify';

type ContactOtpErrorBody = {
  error?: unknown;
  message?: unknown;
  retryAfterSeconds?: unknown;
  retryAfter?: unknown;
};

type ContactOtpServiceResult<T> =
  | { data: T; error: null; errorCode: null; retryAfterSeconds: null }
  | {
      data: null;
      error: string;
      errorCode: string | null;
      retryAfterSeconds: number | null;
    };

async function getContactOtpSession(): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (error || !accessToken) {
    if (__DEV__) {
      console.warn('[contact-otp] Missing authenticated session', {
        hasSession: Boolean(data.session),
        message: error?.message ?? null,
      });
    }
    return { data: null, error: 'Please sign in again to continue.' };
  }

  return { data: accessToken, error: null };
}

async function getFunctionError(
  error: unknown,
  data: unknown,
  operation: ContactOtpOperation,
) {
  let body = toContactOtpErrorBody(data);
  let status: number | null = null;

  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    status = typeof response?.status === 'number' ? response.status : null;
    body = (await readFunctionErrorBody(response)) ?? body;
  }

  const code = typeof body?.error === 'string' ? body.error : null;
  const serverMessage = typeof body?.message === 'string' ? body.message : null;
  const retryAfterSeconds = getRetryAfterSeconds(body);

  if (__DEV__) {
    console.warn('[contact-otp] Edge Function request failed', {
      code,
      errorType:
        error instanceof FunctionsHttpError
          ? 'http'
          : error instanceof FunctionsRelayError
            ? 'relay'
            : error instanceof FunctionsFetchError
              ? 'fetch'
              : error instanceof Error
                ? error.name
                : 'unknown',
      operation,
      serverMessage,
      status,
    });
  }

  if (code === 'unauthorized') {
    return {
      code,
      message: 'Please sign in again to continue.',
      retryAfterSeconds,
    };
  }
  if (code === 'invalid_phone') {
    return {
      code,
      message: 'Enter a valid Philippine mobile number.',
      retryAfterSeconds,
    };
  }
  if (
    code === 'invalid_code' ||
    code === 'code_expired' ||
    code === 'challenge_not_found' ||
    code === 'challenge_consumed' ||
    code === 'attempt_limit_reached' ||
    code === 'rate_limited'
  ) {
    return {
      code,
      message: serverMessage || 'Request a new verification code and try again.',
      retryAfterSeconds,
    };
  }

  if (operation === 'send') {
    return {
      code,
      message: 'We could not send the verification code. Please try again.',
      retryAfterSeconds,
    };
  }

  return {
    code,
    message: 'We could not confirm the verification code. Please try again.',
    retryAfterSeconds,
  };
}

function getRetryAfterSeconds(body: ContactOtpErrorBody | null) {
  const value = body?.retryAfterSeconds ?? body?.retryAfter;
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.ceil(value))
    : null;
}

function toContactOtpErrorBody(value: unknown): ContactOtpErrorBody | null {
  return value && typeof value === 'object' ? value as ContactOtpErrorBody : null;
}

async function readFunctionErrorBody(response: Response | null | undefined) {
  if (!response) return null;

  try {
    return toContactOtpErrorBody(await response.json());
  } catch {
    return null;
  }
}
