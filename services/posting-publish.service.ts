import { getJobDetail } from '@/services/job.service';
import { getMyService } from '@/services/service-profile.service';
import { requireVerifiedCompleteProfile } from '@/services/profile-completion.service';
import { supabase } from '@/utils/supabase';

/** The server owns validation, locking, publication identity, and draft consumption. */
export async function publishJobDraft(draftId: string, revision?: number) {
  const ready = await requireVerifiedCompleteProfile('client');
  if (ready.error) return { data: null, error: ready.error };
  const result = await supabase.rpc(revision === undefined ? 'publish_job_draft' : 'commit_job_draft', { p_draft_id: draftId, ...(revision === undefined ? {} : { p_expected_revision: revision }) });
  if (result.error) return { data: null, error: result.error.code === 'PGRST202' ? 'Publishing is temporarily unavailable. Please try again later.' : result.error.message };
  return getJobDetail(String(result.data));
}
export async function publishServiceDraft(draftId: string, revision?: number) {
  const ready = await requireVerifiedCompleteProfile('provider');
  if (ready.error) return { data: null, error: ready.error };
  const result = await supabase.rpc(revision === undefined ? 'publish_service_draft' : 'commit_service_draft', { p_draft_id: draftId, ...(revision === undefined ? {} : { p_expected_revision: revision }) });
  if (result.error) return { data: null, error: result.error.code === 'PGRST202' ? 'Publishing is temporarily unavailable. Please try again later.' : result.error.message };
  return getMyService(String(result.data));
}
