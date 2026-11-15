import { getJobDraft } from '@/services/job-draft.service';
import { getServiceDraft } from '@/services/service-draft.service';
import { supabase } from '@/utils/supabase';

/** Resume the owner-private edit; public content changes only through commit. */
export async function startJobEdit(listingId: string) {
  const result = await supabase.rpc('begin_job_edit', { p_listing_id:listingId });
  if (result.error || !result.data) return { data:null, error:result.error?.message ?? 'Could not open this edit.' };
  return getJobDraft(String(result.data));
}
export async function startServiceEdit(listingId: string) {
  const result = await supabase.rpc('begin_service_edit', { p_listing_id:listingId });
  if (result.error || !result.data) return { data:null, error:result.error?.message ?? 'Could not open this edit.' };
  return getServiceDraft(String(result.data));
}
export async function getMyListingRepairs() {
  const result = await supabase.rpc('get_my_listing_repairs');
  return { data:result.error ? null : result.data as {kind:'job'|'service';listing_id:string;issues:string[]}[], error:result.error?.message ?? null };
}

export async function restartListingEdit(kind:'job'|'service',draftId:string,revision:number) {
  const result = await supabase.rpc(`restart_${kind}_edit`,{p_draft_id:draftId,p_expected_revision:revision});
  return { data:result.error ? null : String(result.data), error:result.error?.message ?? null };
}
