import type { ServiceResult } from '@/services/auth.service';
import { getJobDetail } from '@/services/job.service';
import {
  compactText,
  getCurrentUserId,
  loadPublicProfiles,
  mapJob,
  mapService,
  requireVerifiedUser,
  type JobRow,
  type ServiceRow,
} from '@/services/marketplace.helpers';
import type {
  ConversationDetail,
  ConversationMessage,
  ConversationStatus,
  ConversationSummary,
  JobSummary,
  ProviderService,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const CONVERSATION_COLUMNS =
  'id, job_id, service_id, client_id, provider_id, started_by, status, hired_at, created_at, updated_at';
const MESSAGE_COLUMNS = 'id, conversation_id, sender_id, body, created_at';
const JOB_COLUMNS =
  'id, owner_id, client_id, title, description, category, barangay, location, location_text, budget, budget_amount, schedule_text, status, accepted_provider_id, created_at, updated_at, closed_at';
const SERVICE_COLUMNS =
  'id, provider_id, category, title, description, years_experience, availability_text, rate_text, is_active, created_at, updated_at';

type ConversationRow = {
  id: string;
  job_id: string | null;
  service_id: string | null;
  client_id: string;
  provider_id: string;
  started_by: string;
  status: ConversationStatus;
  hired_at: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function mapMessage(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

async function loadJobs(jobIds: string[]) {
  const ids = Array.from(new Set(jobIds.filter(Boolean)));
  if (!ids.length) return new Map<string, JobSummary>();

  const { data } = await supabase.from('jobs').select(JOB_COLUMNS).in('id', ids);
  const rows = (data as JobRow[] | null) ?? [];
  const profiles = await loadPublicProfiles(rows.map((row) => row.client_id ?? row.owner_id));

  return new Map(rows.map((row) => [row.id, mapJob(row, profiles)]));
}

async function loadServices(serviceIds: string[]) {
  const ids = Array.from(new Set(serviceIds.filter(Boolean)));
  if (!ids.length) return new Map<string, ProviderService>();

  const { data } = await supabase.from('services').select(SERVICE_COLUMNS).in('id', ids);
  const rows = (data as ServiceRow[] | null) ?? [];

  return new Map(rows.map((row) => [row.id, mapService(row)]));
}

async function loadLatestMessages(conversationIds: string[]) {
  const ids = Array.from(new Set(conversationIds.filter(Boolean)));
  if (!ids.length) return new Map<string, ConversationMessage>();

  const { data } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .in('conversation_id', ids)
    .order('created_at', { ascending: false });

  const messages = new Map<string, ConversationMessage>();

  for (const row of ((data as MessageRow[] | null) ?? []).map(mapMessage)) {
    if (!messages.has(row.conversationId)) {
      messages.set(row.conversationId, row);
    }
  }

  return messages;
}

async function mapConversationRows(
  rows: ConversationRow[],
): Promise<ConversationSummary[]> {
  const profiles = await loadPublicProfiles(
    rows.flatMap((row) => [row.client_id, row.provider_id]),
  );
  const jobs = await loadJobs(rows.map((row) => row.job_id).filter(Boolean) as string[]);
  const services = await loadServices(rows.map((row) => row.service_id).filter(Boolean) as string[]);
  const latestMessages = await loadLatestMessages(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    serviceId: row.service_id,
    clientId: row.client_id,
    providerId: row.provider_id,
    startedBy: row.started_by,
    status: row.status,
    hiredAt: row.hired_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    job: row.job_id ? jobs.get(row.job_id) ?? null : null,
    service: row.service_id ? services.get(row.service_id) ?? null : null,
    client: profiles.get(row.client_id) ?? null,
    provider: profiles.get(row.provider_id) ?? null,
    lastMessage: latestMessages.get(row.id) ?? null,
  }));
}

export async function listMyConversations(): Promise<ServiceResult<ConversationSummary[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .or(`client_id.eq.${user.data},provider_id.eq.${user.data}`)
    .order('updated_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: await mapConversationRows((data as ConversationRow[] | null) ?? []), error: null };
}

export async function getConversation(conversationId: string): Promise<ServiceResult<ConversationDetail>> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .maybeSingle<ConversationRow>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Conversation not found.' };

  const [summary] = await mapConversationRows([data]);
  const { data: messages, error: messageError } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messageError) return { data: null, error: messageError.message };

  return {
    data: {
      ...summary,
      messages: ((messages as MessageRow[] | null) ?? []).map(mapMessage),
    },
    error: null,
  };
}

export async function startJobConversation({
  jobId,
  message,
}: {
  jobId: string;
  message?: string;
}): Promise<ServiceResult<ConversationDetail>> {
  const user = await requireVerifiedUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const job = await getJobDetail(jobId);
  if (job.error || !job.data) {
    return { data: null, error: job.error ?? 'Job not found.' };
  }

  if (job.data.clientId === user.data) {
    return { data: null, error: 'You cannot message yourself about your own job.' };
  }

  if (!['open', 'reviewing'].includes(job.data.status)) {
    return { data: null, error: 'This job is no longer accepting messages.' };
  }

  const { data: existing } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('job_id', jobId)
    .eq('provider_id', user.data)
    .maybeSingle<ConversationRow>();

  let conversationId = existing?.id ?? null;

  if (!conversationId) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        job_id: jobId,
        client_id: job.data.clientId,
        provider_id: user.data,
        started_by: user.data,
        status: 'active',
      })
      .select(CONVERSATION_COLUMNS)
      .single<ConversationRow>();

    if (error) {
      return { data: null, error: error.message };
    }

    conversationId = data.id;
  }

  if (compactText(message)) {
    const sent = await sendMessage({ conversationId, body: message ?? '' });
    if (sent.error) return { data: null, error: sent.error };
  }

  return getConversation(conversationId);
}

export async function sendMessage({
  conversationId,
  body,
}: {
  conversationId: string;
  body: string;
}): Promise<ServiceResult<ConversationMessage>> {
  const user = await requireVerifiedUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const text = compactText(body);
  if (!text) {
    return { data: null, error: 'Enter a message.' };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.data,
      body: text,
    })
    .select(MESSAGE_COLUMNS)
    .single<MessageRow>();

  if (error) return { data: null, error: error.message };

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return { data: mapMessage(data), error: null };
}

export async function markWorkerHired({
  conversationId,
}: {
  conversationId: string;
}): Promise<ServiceResult<ConversationDetail>> {
  const user = await requireVerifiedUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const conversation = await getConversation(conversationId);
  if (conversation.error || !conversation.data) {
    return { data: null, error: conversation.error ?? 'Conversation not found.' };
  }

  if (conversation.data.clientId !== user.data) {
    return { data: null, error: 'Only the client who posted the job can mark a worker hired.' };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('conversations')
    .update({ status: 'hired', hired_at: now })
    .eq('id', conversationId);

  if (error) return { data: null, error: error.message };

  if (conversation.data.jobId) {
    await supabase
      .from('jobs')
      .update({
        status: 'in_progress',
        accepted_provider_id: conversation.data.providerId,
      })
      .eq('id', conversation.data.jobId);
  }

  return getConversation(conversationId);
}
