import type { ServiceResult } from '@/services/auth.service';
import {
  compactText,
  getCurrentUserId,
  isCurrentUserAdmin,
  loadPublicProfiles,
} from '@/services/marketplace.helpers';
import type { PublicProfileSummary } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type ReportTargetType = 'job' | 'service' | 'conversation' | 'user';

export type CreateReportInput = {
  reportedUserId?: string | null;
  jobId?: string | null;
  serviceId?: string | null;
  conversationId?: string | null;
  reason: string;
  details?: string | null;
};

export type ReportSummary = {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  jobId: string | null;
  serviceId: string | null;
  conversationId: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  reporterName: string | null;
  reportedUserName: string | null;
  targetType: ReportTargetType;
  targetLabel: string;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  job_id: string | null;
  service_id: string | null;
  conversation_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
};

type ListReportsInput = {
  limit?: number;
  statuses?: ReportStatus[];
};

const REPORT_COLUMNS =
  'id, reporter_id, reported_user_id, job_id, service_id, conversation_id, reason, details, status, created_at, updated_at, reviewed_by, reviewed_at, admin_notes';

const REPORT_STATUSES: ReportStatus[] = ['open', 'reviewing', 'resolved', 'dismissed'];

export async function createReport(input: CreateReportInput): Promise<ServiceResult<ReportSummary>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const reason = compactText(input.reason);
  const details = compactText(input.details) || null;
  const reportedUserId = compactText(input.reportedUserId) || null;
  const jobId = compactText(input.jobId) || null;
  const serviceId = compactText(input.serviceId) || null;
  const conversationId = compactText(input.conversationId) || null;

  if (!reason) {
    return { data: null, error: 'Choose a report reason before submitting.' };
  }

  if (!reportedUserId && !jobId && !serviceId && !conversationId) {
    return { data: null, error: 'Choose what you want to report before submitting.' };
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.data,
      reported_user_id: reportedUserId,
      job_id: jobId,
      service_id: serviceId,
      conversation_id: conversationId,
      reason,
      details,
    })
    .select(REPORT_COLUMNS)
    .single<ReportRow>();

  if (error) return { data: null, error: toReportError(error.message) };

  const [mapped] = await mapReportRows([data]);
  return { data: mapped, error: null };
}

export async function getMyReports({
  limit = 50,
  statuses,
}: ListReportsInput = {}): Promise<ServiceResult<ReportSummary[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  let query = supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .eq('reporter_id', user.data)
    .order('created_at', { ascending: false })
    .limit(normalizeLimit(limit));

  if (statuses?.length) {
    query = query.in('status', statuses);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: toReportError(error.message) };

  return { data: await mapReportRows((data as ReportRow[] | null) ?? []), error: null };
}

export async function getAdminReports({
  limit = 100,
  statuses,
}: ListReportsInput = {}): Promise<ServiceResult<ReportSummary[]>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;

  let query = supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(normalizeLimit(limit, 150));

  if (statuses?.length) {
    query = query.in('status', statuses);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: toReportError(error.message) };

  return { data: await mapReportRows((data as ReportRow[] | null) ?? []), error: null };
}

export async function updateReportStatus({
  adminNotes,
  reportId,
  status,
}: {
  adminNotes?: string | null;
  reportId: string;
  status: ReportStatus;
}): Promise<ServiceResult<ReportSummary>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;

  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const cleanReportId = compactText(reportId);
  if (!cleanReportId) return { data: null, error: 'Choose a report to review.' };
  if (!REPORT_STATUSES.includes(status)) return { data: null, error: 'Choose a valid report status.' };

  const { data, error } = await supabase
    .from('reports')
    .update({
      admin_notes: compactText(adminNotes) || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.data,
      status,
    })
    .eq('id', cleanReportId)
    .select(REPORT_COLUMNS)
    .single<ReportRow>();

  if (error) return { data: null, error: toReportError(error.message) };

  const [mapped] = await mapReportRows([data]);
  return { data: mapped, error: null };
}

async function requireAdmin(): Promise<ServiceResult<void>> {
  if (!(await isCurrentUserAdmin())) {
    return { data: null, error: 'Barangay admin access is required.' };
  }

  return { data: undefined, error: null };
}

async function mapReportRows(rows: ReportRow[]): Promise<ReportSummary[]> {
  if (!rows.length) return [];

  const profileIds = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.reporter_id, row.reported_user_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const profiles = await loadPublicProfiles(profileIds);

  return rows.map((row) => mapReportRow(row, profiles));
}

function mapReportRow(row: ReportRow, profiles: Map<string, PublicProfileSummary>): ReportSummary {
  const reporter = profiles.get(row.reporter_id) ?? null;
  const reportedUser = row.reported_user_id ? profiles.get(row.reported_user_id) ?? null : null;
  const targetType = getTargetType(row);

  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportedUserId: row.reported_user_id,
    jobId: row.job_id,
    serviceId: row.service_id,
    conversationId: row.conversation_id,
    reason: row.reason,
    details: row.details,
    status: normalizeReportStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    adminNotes: row.admin_notes,
    reporterName: reporter?.fullName ?? null,
    reportedUserName: reportedUser?.fullName ?? null,
    targetType,
    targetLabel: getTargetLabel(row, targetType, reportedUser),
  };
}

function getTargetType(row: ReportRow): ReportTargetType {
  if (row.job_id) return 'job';
  if (row.service_id) return 'service';
  if (row.conversation_id) return 'conversation';
  return 'user';
}

function getTargetLabel(
  row: ReportRow,
  targetType: ReportTargetType,
  reportedUser: PublicProfileSummary | null,
) {
  if (targetType === 'job' && row.job_id) return `Job ${shortId(row.job_id)}`;
  if (targetType === 'service' && row.service_id) return `Service ${shortId(row.service_id)}`;
  if (targetType === 'conversation' && row.conversation_id) {
    return `Conversation ${shortId(row.conversation_id)}`;
  }

  return reportedUser?.fullName ?? (row.reported_user_id ? `User ${shortId(row.reported_user_id)}` : 'Reported item');
}

function normalizeReportStatus(value: string): ReportStatus {
  return REPORT_STATUSES.includes(value as ReportStatus) ? (value as ReportStatus) : 'open';
}

function normalizeLimit(value: number, max = 100) {
  if (!Number.isFinite(value)) return Math.min(50, max);
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function toReportError(message: string) {
  if (message.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to access these reports.';
  }

  return message;
}
