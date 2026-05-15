import { File } from 'expo-file-system';

import type { ServiceResult } from '@/services/auth.service';
import { compactText } from '@/services/marketplace.helpers';
import type {
  CreateCredentialInput,
  CredentialStatus,
  CredentialSummary,
  CredentialType,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const CREDENTIAL_BUCKET = 'credential-files';

type CredentialRow = {
  id: string;
  provider_id: string;
  service_id: string | null;
  credential_type: string;
  title: string;
  issuer: string | null;
  issued_at: string | null;
  status: string | null;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
};

const CREDENTIAL_COLUMNS =
  'id, provider_id, service_id, credential_type, title, issuer, issued_at, status, reviewer_note, created_at, updated_at';

function normalizeCredentialType(value: string | null | undefined): CredentialType {
  if (
    value === 'tesda' ||
    value === 'training_certificate' ||
    value === 'barangay_certificate' ||
    value === 'work_proof' ||
    value === 'portfolio' ||
    value === 'other'
  ) {
    return value;
  }

  return 'other';
}

function normalizeCredentialStatus(value: string | null | undefined): CredentialStatus {
  if (value === 'approved' || value === 'rejected' || value === 'pending') return value;
  return 'pending';
}

function mapCredential(row: CredentialRow): CredentialSummary {
  return {
    id: row.id,
    providerId: row.provider_id,
    serviceId: row.service_id,
    type: normalizeCredentialType(row.credential_type),
    title: row.title,
    issuer: row.issuer,
    issuedAt: row.issued_at,
    status: normalizeCredentialStatus(row.status),
    reviewerNote: row.reviewer_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeFileName(name: string | null | undefined) {
  return (compactText(name) || 'credential-file')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(0, 90);
}

async function getCurrentUserId(): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { data: null, error: 'Please sign in again to continue.' };
  }

  return { data: data.user.id, error: null };
}

async function uploadCredentialFile({
  input,
  providerId,
}: {
  input: NonNullable<CreateCredentialInput['file']>;
  providerId: string;
}) {
  try {
    const localFile = new File(input.uri);
    const fileBuffer = await localFile.arrayBuffer();
    const path = `${providerId}/${Date.now()}-${safeFileName(input.name)}`;

    const { error } = await supabase.storage
      .from(CREDENTIAL_BUCKET)
      .upload(path, fileBuffer, {
        contentType: input.mimeType ?? 'application/octet-stream',
        upsert: false,
      });

    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch {
    return { path: null, error: 'Could not upload this credential file.' };
  }
}

export async function listMyCredentials(): Promise<ServiceResult<CredentialSummary[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('credentials')
    .select(CREDENTIAL_COLUMNS)
    .eq('provider_id', user.data)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: ((data as CredentialRow[] | null) ?? []).map(mapCredential), error: null };
}

export async function createCredential(
  input: CreateCredentialInput,
): Promise<ServiceResult<CredentialSummary>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const title = compactText(input.title);
  if (!title) return { data: null, error: 'Enter a credential title.' };

  const upload = input.file
    ? await uploadCredentialFile({ input: input.file, providerId: user.data })
    : { path: null, error: null };

  if (upload.error) return { data: null, error: upload.error };

  const { data, error } = await supabase
    .from('credentials')
    .insert({
      provider_id: user.data,
      service_id: input.serviceId ?? null,
      credential_type: normalizeCredentialType(input.type),
      title,
      issuer: compactText(input.issuer) || null,
      issued_at: compactText(input.issuedAt) || null,
      file_path: upload.path,
      status: 'pending',
    })
    .select(CREDENTIAL_COLUMNS)
    .single<CredentialRow>();

  if (error) return { data: null, error: error.message };
  return { data: mapCredential(data), error: null };
}
