import type { ServiceResult } from '@/services/auth.service';
import { getCurrentUserId } from '@/services/marketplace.helpers';
import { supabase } from '@/utils/supabase';

type DraftTable = 'job_drafts' | 'service_drafts';

type DraftRow = {
  id: string;
  user_id: string;
};

type SaveOwnDraftArgs = {
  table: DraftTable;
  columns: string;
  draftId?: string | null;
  payload: Record<string, unknown>;
};

export async function listOwnDraftRows<Row extends DraftRow>(
  table: DraftTable,
  columns: string,
): Promise<ServiceResult<Row[]>> {
  const user = await getCurrentUserId();
  if (user.error || !user.data) return { data: null, error: user.error ?? 'Please sign in again.' };

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq('user_id', user.data)
    .order('updated_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as unknown as Row[], error: null };
}

export async function getOwnDraftRow<Row extends DraftRow>(
  table: DraftTable,
  columns: string,
  draftId: string,
): Promise<ServiceResult<Row>> {
  const user = await getCurrentUserId();
  if (user.error || !user.data) return { data: null, error: user.error ?? 'Please sign in again.' };

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq('id', draftId)
    .eq('user_id', user.data)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Draft not found.' };
  return { data: data as unknown as Row, error: null };
}

export async function saveOwnDraftRow<Row extends DraftRow>({
  table,
  columns,
  draftId,
  payload,
}: SaveOwnDraftArgs): Promise<ServiceResult<Row>> {
  const user = await getCurrentUserId();
  if (user.error || !user.data) return { data: null, error: user.error ?? 'Please sign in again.' };

  const updatedAt = new Date().toISOString();

  if (draftId) {
    const { data, error } = await supabase
      .from(table)
      .update({ ...payload, updated_at: updatedAt })
      .eq('id', draftId)
      .eq('user_id', user.data)
      .select(columns)
      .maybeSingle();

    if (error) return { data: null, error: getFriendlyDraftSaveError(error.message) };
    if (!data) return { data: null, error: 'We could not save your draft. Please try again.' };
    return { data: data as unknown as Row, error: null };
  }

  const { data, error } = await supabase
    .from(table)
    .insert({ ...payload, user_id: user.data, updated_at: updatedAt })
    .select(columns)
    .maybeSingle();

  if (error) return { data: null, error: getFriendlyDraftSaveError(error.message) };
  if (!data) return { data: null, error: 'We could not save your draft. Please try again.' };
  return { data: data as unknown as Row, error: null };
}

export async function deleteOwnDraftRow(
  table: DraftTable,
  draftId: string,
): Promise<ServiceResult<true>> {
  const user = await getCurrentUserId();
  if (user.error || !user.data) return { data: null, error: user.error ?? 'Please sign in again.' };

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', draftId)
    .eq('user_id', user.data);

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

function getFriendlyDraftSaveError(message: string) {
  if (__DEV__) {
    console.warn('Draft save failed', message);
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes('cannot coerce') ||
    normalized.includes('single json object') ||
    normalized.includes('multiple (or no) rows')
  ) {
    return 'We could not save your draft. Please try again.';
  }

  return message;
}
