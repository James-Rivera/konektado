import type { ServiceResult } from '@/services/auth.service';
import { getCurrentUserId } from '@/services/marketplace.helpers';
import type {
  HiredJobCancellationAction,
  HiredJobCancellationState,
  UnfilledJobCancellationReason,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

export async function cancelUnfilledJob(jobId: string, reason: UnfilledJobCancellationReason): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.rpc('cancel_unfilled_job', { p_job_id: jobId, p_reason: reason });
  return error ? { data: null, error: error.message } : { data: data as string, error: null };
}

export async function getHiredJobConversationId(jobId: string): Promise<ServiceResult<string>> {
  const user = await getCurrentUserId();
  if (user.error || !user.data) return { data: null, error: user.error ?? 'Sign in to continue.' };
  const { data, error } = await supabase.from('conversations').select('id')
    .eq('job_id', jobId).eq('client_id', user.data).eq('status', 'hired').maybeSingle<{ id: string }>();
  return data && !error
    ? { data: data.id, error: null }
    : { data: null, error: error?.message ?? 'The hired conversation is unavailable.' };
}

export async function getHiredJobCancellation(conversationId: string): Promise<ServiceResult<HiredJobCancellationState>> {
  const { data, error } = await supabase.rpc('get_hired_job_cancellation', { p_conversation_id: conversationId });
  return error ? { data: null, error: error.message } : { data: data as HiredJobCancellationState, error: null };
}

export async function changeHiredJobCancellation(input: {
  conversationId: string;
  action: HiredJobCancellationAction;
  expectedId: string | null;
  reason?: string;
}): Promise<ServiceResult<HiredJobCancellationState>> {
  const { data, error } = await supabase.rpc('change_hired_job_cancellation', {
    p_conversation_id: input.conversationId,
    p_action: input.action,
    p_expected_id: input.expectedId,
    p_reason: input.reason ?? null,
  });
  return error ? { data: null, error: error.message } : { data: data as HiredJobCancellationState, error: null };
}
