import type { ServiceResult } from '@/services/auth.service';
import { compactText, getCurrentUserId } from '@/services/marketplace.helpers';
import type { JobDraftSummary, UpsertJobDraftInput } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const JOB_DRAFT_COLUMNS =
  'id, user_id, title, description, category, service_needed, tags, photo_urls, barangay, location_text, budget_amount, workers_needed, schedule_text, allow_messages, auto_reply_enabled, auto_close_enabled, created_at, updated_at';

type JobDraftRow = {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  service_needed: string | null;
  tags: string[] | null;
  photo_urls: string[] | null;
  barangay: string | null;
  location_text: string | null;
  budget_amount: number | null;
  workers_needed: number | null;
  schedule_text: string | null;
  allow_messages: boolean | null;
  auto_reply_enabled: boolean | null;
  auto_close_enabled: boolean | null;
  created_at: string;
  updated_at: string;
};

function mapDraft(row: JobDraftRow): JobDraftSummary {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    serviceNeeded: row.service_needed ?? null,
    tags: row.tags ?? [],
    photoUrls: row.photo_urls ?? [],
    barangay: row.barangay,
    locationText: row.location_text,
    budgetAmount: row.budget_amount,
    workersNeeded: row.workers_needed,
    scheduleText: row.schedule_text,
    allowMessages: row.allow_messages ?? true,
    autoReplyEnabled: row.auto_reply_enabled ?? false,
    autoCloseEnabled: row.auto_close_enabled ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeDraftPayload(input: UpsertJobDraftInput) {
  const tags = Array.from(new Set((input.tags ?? []).map(compactText).filter(Boolean))).slice(0, 4);
  const photoUrls = Array.from(new Set((input.photoUrls ?? []).map(compactText).filter(Boolean)));

  return {
    title: compactText(input.title) || null,
    description: compactText(input.description) || null,
    category: compactText(input.category) || null,
    service_needed: compactText(input.serviceNeeded) || null,
    tags,
    photo_urls: photoUrls,
    barangay: compactText(input.barangay) || 'Barangay San Pedro',
    location_text: compactText(input.locationText) || null,
    budget_amount: input.budgetAmount ?? null,
    workers_needed: input.workersNeeded ?? null,
    schedule_text: compactText(input.scheduleText) || null,
    allow_messages: input.allowMessages ?? true,
    auto_reply_enabled: input.autoReplyEnabled ?? false,
    auto_close_enabled: input.autoCloseEnabled ?? false,
  };
}

export async function listMyJobDrafts(): Promise<ServiceResult<JobDraftSummary[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('job_drafts')
    .select(JOB_DRAFT_COLUMNS)
    .eq('user_id', user.data)
    .order('updated_at', { ascending: false });

  if (error) return { data: null, error: error.message };

  return { data: ((data as JobDraftRow[] | null) ?? []).map(mapDraft), error: null };
}

export async function getJobDraft(draftId: string): Promise<ServiceResult<JobDraftSummary>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('job_drafts')
    .select(JOB_DRAFT_COLUMNS)
    .eq('id', draftId)
    .eq('user_id', user.data)
    .maybeSingle<JobDraftRow>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Draft not found.' };

  return { data: mapDraft(data), error: null };
}

export async function saveJobDraft({
  draftId,
  input,
}: {
  draftId?: string | null;
  input: UpsertJobDraftInput;
}): Promise<ServiceResult<JobDraftSummary>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const payload = {
    ...normalizeDraftPayload(input),
    updated_at: new Date().toISOString(),
  };

  if (draftId) {
    const { data, error } = await supabase
      .from('job_drafts')
      .update(payload)
      .eq('id', draftId)
      .eq('user_id', user.data)
      .select(JOB_DRAFT_COLUMNS)
      .single<JobDraftRow>();

    if (error) return { data: null, error: error.message };
    return { data: mapDraft(data), error: null };
  }

  const { data, error } = await supabase
    .from('job_drafts')
    .insert({
      ...payload,
      user_id: user.data,
    })
    .select(JOB_DRAFT_COLUMNS)
    .single<JobDraftRow>();

  if (error) return { data: null, error: error.message };
  return { data: mapDraft(data), error: null };
}

export async function deleteJobDraft(draftId: string): Promise<ServiceResult<void>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { error } = await supabase
    .from('job_drafts')
    .delete()
    .eq('id', draftId)
    .eq('user_id', user.data);

  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}
