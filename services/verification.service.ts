import type { ServiceResult } from '@/services/auth.service';
import type { VerificationUpload } from '@/types/onboarding.types';
import type {
  CreateVerificationRequestInput,
  CreatedVerificationRequest,
  VerificationPrefill,
  VerificationStatus,
  VerificationSummary,
} from '@/types/verification.types';
import { supabase } from '@/utils/supabase';

const VERIFICATION_BUCKET = 'verification-files';

type ProfileRow = {
  birthdate: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  street_address: string | null;
  city: string | null;
  barangay: string | null;
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
    status: row.status,
    notes: row.notes,
    reviewerNote: row.reviewer_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const path = `${userId}/${verificationId}/${Date.now()}-${index}-${getFileName(file, index)}`;

    const { error: uploadError } = await supabase.storage
      .from(VERIFICATION_BUCKET)
      .upload(path, blob, {
        contentType: file.mimeType ?? 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return { data: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from(VERIFICATION_BUCKET).getPublicUrl(path);
    return { data: data.publicUrl, error: null };
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
    .select('birthdate, email, first_name, last_name, full_name, phone, street_address, city, barangay')
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
      city: profile?.city ?? 'Sto. Tomas',
      barangay: profile?.barangay ?? 'Barangay San Pedro',
      servicesOrPurpose,
      latestRequest: latestRequest ? mapVerification(latestRequest) : null,
    },
    error: null,
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

  const { data: pending, error: pendingError } = await supabase
    .from('verifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (pendingError) {
    return { data: null, error: pendingError.message };
  }

  if (pending) {
    return { data: null, error: 'You already have a pending verification request.' };
  }

  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      full_name: fullName,
      birthdate: input.birthdate.trim() || null,
      phone: input.phone.trim(),
      street_address: input.streetAddress.trim() || null,
      city: input.city.trim(),
      barangay: input.barangay.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  const { data: verification, error: verificationError } = await supabase
    .from('verifications')
    .insert({
      user_id: user.id,
      status: 'pending',
      notes: buildNotesPayload(input),
    })
    .select('id, status')
    .single<{ id: string; status: VerificationStatus }>();

  if (verificationError) {
    return { data: null, error: verificationError.message };
  }

  for (const [index, file] of input.files.entries()) {
    const uploaded = await uploadVerificationFile({
      file,
      index,
      userId: user.id,
      verificationId: verification.id,
    });

    if (uploaded.error) {
      await supabase
        .from('verifications')
        .update({
          status: 'cancelled',
          reviewer_note: 'File upload failed before submission could be completed.',
        })
        .eq('id', verification.id);

      return { data: null, error: uploaded.error };
    }

    const { error: fileError } = await supabase.from('verification_files').insert({
      verification_id: verification.id,
      file_type: file.fileType,
      url: uploaded.data,
    });

    if (fileError) {
      return { data: null, error: fileError.message };
    }
  }

  return {
    data: {
      id: verification.id,
      status: verification.status,
    },
    error: null,
  };
}
