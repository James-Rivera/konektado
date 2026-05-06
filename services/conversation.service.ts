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
import { getServiceDetail } from '@/services/service-profile.service';
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
  'id, owner_id, client_id, title, description, category, service_needed, tags, photo_urls, barangay, location, location_text, budget, budget_amount, workers_needed, schedule_text, status, accepted_provider_id, allow_messages, auto_reply_enabled, auto_close_enabled, created_at, updated_at, closed_at';
const SERVICE_COLUMNS =
  'id, provider_id, category, title, description, tags, photo_urls, years_experience, availability_text, rate_text, barangay, location_text, allow_messages, auto_reply_enabled, auto_pause_enabled, is_active, created_at, updated_at';

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

type ConversationInboxRow = {
  conversation_id: string;
  job_id: string | null;
  service_id: string | null;
  client_id: string;
  provider_id: string;
  started_by: string;
  status: ConversationStatus;
  hired_at: string | null;
  conversation_created_at: string;
  conversation_updated_at: string;
  job_title: string | null;
  service_title: string | null;
  client_full_name: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
  client_barangay: string | null;
  client_city: string | null;
  client_about: string | null;
  client_avatar_url: string | null;
  client_availability: string | null;
  client_verified_at: string | null;
  client_barangay_verified_at: string | null;
  provider_full_name: string | null;
  provider_first_name: string | null;
  provider_last_name: string | null;
  provider_barangay: string | null;
  provider_city: string | null;
  provider_about: string | null;
  provider_avatar_url: string | null;
  provider_availability: string | null;
  provider_verified_at: string | null;
  provider_barangay_verified_at: string | null;
  last_message_id: string | null;
  last_message_sender_id: string | null;
  last_message_body: string | null;
  last_message_created_at: string | null;
};

export function mapMessage(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function mapRealtimeMessage(row: unknown): ConversationMessage | null {
  if (!row || typeof row !== 'object') return null;
  const value = row as Partial<MessageRow>;
  if (
    typeof value.id !== 'string' ||
    typeof value.conversation_id !== 'string' ||
    typeof value.sender_id !== 'string' ||
    typeof value.body !== 'string' ||
    typeof value.created_at !== 'string'
  ) {
    return null;
  }

  return mapMessage(value as MessageRow);
}

function mapInboxProfile(
  row: ConversationInboxRow,
  role: 'client' | 'provider',
) {
  const fullName = compactText(row[`${role}_full_name`]) ||
    `${compactText(row[`${role}_first_name`])} ${compactText(row[`${role}_last_name`])}`.trim() ||
    'Konektado resident';

  return {
    id: role === 'client' ? row.client_id : row.provider_id,
    fullName,
    firstName: row[`${role}_first_name`],
    lastName: row[`${role}_last_name`],
    barangay: row[`${role}_barangay`],
    city: row[`${role}_city`],
    about: row[`${role}_about`],
    avatarUrl: row[`${role}_avatar_url`],
    availability: row[`${role}_availability`],
    barangayVerifiedAt: row[`${role}_barangay_verified_at`],
    verifiedAt: row[`${role}_verified_at`],
  };
}

function mapInboxJob(row: ConversationInboxRow): JobSummary | null {
  if (!row.job_id) return null;

  return {
    id: row.job_id,
    clientId: row.client_id,
    title: row.job_title ?? 'Job post',
    description: null,
    category: null,
    serviceNeeded: null,
    tags: [],
    photoUrls: [],
    barangay: null,
    locationText: null,
    budgetAmount: null,
    workersNeeded: null,
    scheduleText: null,
    status: 'open',
    acceptedProviderId: null,
    allowMessages: true,
    autoReplyEnabled: false,
    autoCloseEnabled: false,
    createdAt: row.conversation_created_at,
    updatedAt: row.conversation_updated_at,
    client: mapInboxProfile(row, 'client'),
    clientAverageRating: null,
    clientReviewCount: 0,
    clientJobsPostedCount: 0,
  };
}

function mapInboxService(row: ConversationInboxRow): ProviderService | null {
  if (!row.service_id) return null;

  return {
    id: row.service_id,
    providerId: row.provider_id,
    category: 'Service',
    title: row.service_title ?? 'Service post',
    description: null,
    tags: [],
    photoUrls: [],
    yearsExperience: null,
    availabilityText: null,
    rateText: null,
    barangay: null,
    locationText: null,
    allowMessages: true,
    autoReplyEnabled: false,
    autoPauseEnabled: false,
    isActive: true,
    createdAt: row.conversation_created_at,
    updatedAt: row.conversation_updated_at,
  };
}

function mapInboxRow(row: ConversationInboxRow): ConversationSummary {
  return {
    id: row.conversation_id,
    jobId: row.job_id,
    serviceId: row.service_id,
    clientId: row.client_id,
    providerId: row.provider_id,
    startedBy: row.started_by,
    status: row.status,
    hiredAt: row.hired_at,
    createdAt: row.conversation_created_at,
    updatedAt: row.last_message_created_at ?? row.conversation_updated_at,
    job: mapInboxJob(row),
    service: mapInboxService(row),
    client: mapInboxProfile(row, 'client'),
    provider: mapInboxProfile(row, 'provider'),
    lastMessage:
      row.last_message_id && row.last_message_sender_id && row.last_message_body && row.last_message_created_at
        ? {
            id: row.last_message_id,
            conversationId: row.conversation_id,
            senderId: row.last_message_sender_id,
            body: row.last_message_body,
            createdAt: row.last_message_created_at,
          }
        : null,
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

export async function listMyConversations(filters: {
  kind?: 'all' | 'jobs' | 'services' | 'unread';
  includeArchived?: boolean;
} = {}): Promise<ServiceResult<ConversationSummary[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data: inboxRows, error: inboxError } = await supabase.rpc(
    'get_my_conversation_inbox',
    { p_include_archived: filters.includeArchived ?? false },
  );

  if (!inboxError) {
    return {
      data: filterConversationSummaries(
        ((inboxRows as ConversationInboxRow[] | null) ?? []).map(mapInboxRow),
        filters,
        user.data,
      ),
      error: null,
    };
  }

  const shouldFallback =
    inboxError.code === 'PGRST202' ||
    inboxError.message.toLowerCase().includes('get_my_conversation_inbox');

  if (!shouldFallback) {
    return { data: null, error: inboxError.message };
  }

  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .or(`client_id.eq.${user.data},provider_id.eq.${user.data}`)
    .order('updated_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  let conversations = await mapConversationRows((data as ConversationRow[] | null) ?? []);

  return {
    data: filterConversationSummaries(conversations, filters, user.data),
    error: null,
  };
}

function filterConversationSummaries(
  conversations: ConversationSummary[],
  filters: {
    kind?: 'all' | 'jobs' | 'services' | 'unread';
    includeArchived?: boolean;
  },
  userId: string,
) {
  if (!filters.includeArchived) {
    conversations = conversations.filter((conversation) => conversation.status !== 'archived');
  }

  if (filters.kind === 'jobs') {
    conversations = conversations.filter((conversation) => Boolean(conversation.jobId));
  }

  if (filters.kind === 'services') {
    conversations = conversations.filter((conversation) => Boolean(conversation.serviceId));
  }

  if (filters.kind === 'unread') {
    conversations = conversations.filter(
      (conversation) =>
        Boolean(conversation.lastMessage) && conversation.lastMessage?.senderId !== userId,
    );
  }

  return conversations;
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

export async function getConversationSummary(conversationId: string): Promise<ServiceResult<ConversationSummary>> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .maybeSingle<ConversationRow>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Conversation not found.' };

  const [summary] = await mapConversationRows([data]);
  return { data: summary, error: null };
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

export async function startServiceConversation({
  serviceId,
  message,
}: {
  serviceId: string;
  message?: string;
}): Promise<ServiceResult<ConversationDetail>> {
  const user = await requireVerifiedUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const service = await getServiceDetail(serviceId);
  if (service.error || !service.data) {
    return { data: null, error: service.error ?? 'Service not found.' };
  }

  if (service.data.providerId === user.data) {
    return { data: null, error: 'You cannot message yourself about your own service.' };
  }

  if (!service.data.isActive || !service.data.allowMessages) {
    return { data: null, error: 'This service is not accepting messages right now.' };
  }

  const { data: existing } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('service_id', serviceId)
    .eq('client_id', user.data)
    .eq('provider_id', service.data.providerId)
    .maybeSingle<ConversationRow>();

  let conversationId = existing?.id ?? null;

  if (!conversationId) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        service_id: serviceId,
        client_id: user.data,
        provider_id: service.data.providerId,
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

export async function updateConversationStatus({
  conversationId,
  status,
}: {
  conversationId: string;
  status: Extract<ConversationStatus, 'active' | 'declined' | 'archived' | 'reported'>;
}): Promise<ServiceResult<ConversationDetail>> {
  const user = await requireVerifiedUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const conversation = await getConversation(conversationId);
  if (conversation.error || !conversation.data) {
    return { data: null, error: conversation.error ?? 'Conversation not found.' };
  }

  if (![conversation.data.clientId, conversation.data.providerId].includes(user.data)) {
    return { data: null, error: 'Only conversation participants can update this chat.' };
  }

  const { error } = await supabase
    .from('conversations')
    .update({ status })
    .eq('id', conversationId);

  if (error) return { data: null, error: error.message };

  return getConversation(conversationId);
}

export function archiveConversation(input: { conversationId: string }) {
  return updateConversationStatus({ ...input, status: 'archived' });
}

export function reportConversation(input: { conversationId: string }) {
  return updateConversationStatus({ ...input, status: 'reported' });
}
