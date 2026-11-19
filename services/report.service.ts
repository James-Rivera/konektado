import type { ServiceResult } from '@/services/auth.service';
import { compactText, getCurrentUserId, isCurrentUserAdmin, loadPublicProfiles } from '@/services/marketplace.helpers';
import type { PublicProfileSummary } from '@/types/marketplace.types';
import type { AdminReportCounts, AdminReportPage, AdminReportPageInput, CreateReportInput, ListReportsInput, ReportStatus, ReportSummary, ReportTargetDetails, ReportTargetType, ReviewReportInput } from '@/types/report.types';
import { supabase } from '@/utils/supabase';

export type { AdminReportCounts, AdminReportPage, AdminReportPageInput, CreateReportInput, ListReportsInput, ReportStatus, ReportSummary, ReportTargetDetails, ReportTargetType, ReviewReportInput } from '@/types/report.types';

type ReportRow = {
  id: string; reporter_id: string; reported_user_id: string | null; job_id: string | null;
  service_id: string | null; conversation_id: string | null; review_id: string | null;
  reason: string; details: string | null; status: string; created_at: string; updated_at: string;
  reviewed_by?: string | null; reviewed_at: string | null; admin_notes?: string | null;
  resolution_message: string | null; review_hidden?: boolean; target_details?: ReportTargetDetails | null;
};

// Database grants protect these columns even when a caller bypasses the service.
const REPORTER_COLUMNS = 'id, reporter_id, reported_user_id, job_id, service_id, conversation_id, review_id, reason, details, status, created_at, updated_at, reviewed_at, resolution_message';
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
  const reviewId = compactText(input.reviewId) || null;
  if (!reason) return { data: null, error: 'Choose a report reason before submitting.' };
  if (reason.length > 200 || (details?.length ?? 0) > 10000) return { data: null, error: 'Keep the reason within 200 characters and details within 10,000 characters.' };
  if (!reportedUserId && !jobId && !serviceId && !conversationId && !reviewId) return { data: null, error: 'Choose what you want to report before submitting.' };
  const { data, error } = await supabase.from('reports').insert({
    reporter_id: user.data, reported_user_id: reportedUserId, job_id: jobId,
    service_id: serviceId, conversation_id: conversationId, review_id: reviewId, reason, details,
  }).select(REPORTER_COLUMNS).single<ReportRow>();
  if (error) return { data: null, error: toReportError(error.message) };
  const [report] = await mapReportRows([data]);
  return { data: report, error: null };
}

export async function getMyReports({ limit = 50, statuses }: ListReportsInput = {}): Promise<ServiceResult<ReportSummary[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };
  let query = supabase.from('reports').select(REPORTER_COLUMNS).eq('reporter_id', user.data)
    .order('created_at', { ascending: false }).limit(normalizeLimit(limit));
  if (statuses?.length) query = query.in('status', statuses);
  const { data, error } = await query;
  if (error) return { data: null, error: toReportError(error.message) };
  return { data: await mapReportRows((data as ReportRow[] | null) ?? []), error: null };
}

export async function getAdminReportPage({ limit = 30, offset = 0, statuses, receivedOnly = false }: AdminReportPageInput = {}): Promise<ServiceResult<AdminReportPage>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;
  const { data, error } = await supabase.rpc('get_admin_report_page', {
    p_limit: normalizeLimit(limit, 100), p_offset: Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0,
    p_statuses: statuses?.length ? statuses : null, p_received_only: receivedOnly,
  });
  if (error) return { data: null, error: toReportError(error.message) };
  const payload = data as { reports?: ReportRow[]; total?: number; counts?: Partial<AdminReportCounts> } | null;
  return { data: { reports: await mapReportRows(payload?.reports ?? []), total: Number(payload?.total ?? 0),
    counts: { open: Number(payload?.counts?.open ?? 0), reviewing: Number(payload?.counts?.reviewing ?? 0), resolved: Number(payload?.counts?.resolved ?? 0), dismissed: Number(payload?.counts?.dismissed ?? 0), received: Number(payload?.counts?.received ?? 0) } }, error: null };
}

/** Bounded legacy wrapper; queues use getAdminReportPage for pagination/counts. */
export async function getAdminReports(input: ListReportsInput = {}): Promise<ServiceResult<ReportSummary[]>> {
  const result = await getAdminReportPage(input);
  return result.error || !result.data ? { data: null, error: result.error } : { data: result.data.reports, error: null };
}

export async function getAdminReportDetail(reportId: string): Promise<ServiceResult<ReportSummary>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;
  const { data, error } = await supabase.rpc('get_admin_report_detail', { p_report_id: compactText(reportId) });
  if (error) return { data: null, error: toReportError(error.message) };
  if (!data) return { data: null, error: 'Report not found.' };
  const [report] = await mapReportRows([data as ReportRow]);
  return { data: report, error: null };
}

export async function updateReportStatus({ reportId, status, adminNotes, resolutionMessage, reviewAction }: ReviewReportInput): Promise<ServiceResult<ReportSummary>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;
  const cleanReportId = compactText(reportId);
  if (!cleanReportId) return { data: null, error: 'Choose a report to review.' };
  if (!REPORT_STATUSES.includes(status)) return { data: null, error: 'Choose a valid report status.' };
  const { data, error } = await supabase.rpc('review_report', {
    p_report_id: cleanReportId, p_status: status, p_admin_notes: compactText(adminNotes) || null,
    p_resolution_message: compactText(resolutionMessage) || null, p_review_action: reviewAction ?? null,
  });
  if (error) return { data: null, error: toReportError(error.message) };
  const [report] = await mapReportRows([data as ReportRow]);
  return { data: report, error: null };
}

async function requireAdmin(): Promise<ServiceResult<void>> {
  return await isCurrentUserAdmin() ? { data: undefined, error: null } : { data: null, error: 'Barangay admin access is required.' };
}

async function mapReportRows(rows: ReportRow[]): Promise<ReportSummary[]> {
  if (!rows.length) return [];
  const ids = Array.from(new Set(rows.flatMap(row => [row.reporter_id, row.reported_user_id]).filter((id): id is string => Boolean(id))));
  let profiles = new Map<string, PublicProfileSummary>();
  try { profiles = await loadPublicProfiles(ids); } catch { /* Optional names never invalidate an accepted complaint/decision. */ }
  return rows.map(row => {
    const reportedUser = row.reported_user_id ? profiles.get(row.reported_user_id) : null;
    const targetType = getTargetType(row);
    return {
      id: row.id, reporterId: row.reporter_id, reportedUserId: row.reported_user_id, jobId: row.job_id,
      serviceId: row.service_id, conversationId: row.conversation_id, reviewId: row.review_id ?? null,
      reason: row.reason, details: row.details, status: REPORT_STATUSES.includes(row.status as ReportStatus) ? row.status as ReportStatus : 'open',
      createdAt: row.created_at, updatedAt: row.updated_at, reviewedBy: row.reviewed_by ?? null,
      reviewedAt: row.reviewed_at, adminNotes: row.admin_notes ?? null, resolutionMessage: row.resolution_message ?? null,
      reviewHidden: row.review_hidden ?? false, reporterName: profiles.get(row.reporter_id)?.fullName ?? null,
      reportedUserName: reportedUser?.fullName ?? null, targetType, targetLabel: getTargetLabel(row, targetType, reportedUser),
      ...(row.target_details ? { targetDetails: row.target_details } : {}),
    };
  });
}

function getTargetType(row: ReportRow): ReportTargetType {
  if (row.review_id) return 'review';
  if (row.conversation_id) return 'conversation';
  if (row.job_id) return 'job';
  if (row.service_id) return 'service';
  return 'user';
}
function getTargetLabel(row: ReportRow, type: ReportTargetType, user: PublicProfileSummary | null | undefined) {
  const target = type === 'review' ? row.review_id : type === 'conversation' ? row.conversation_id : type === 'job' ? row.job_id : type === 'service' ? row.service_id : null;
  return target ? `${type[0].toUpperCase()}${type.slice(1)} ${target.slice(0, 8)}` : user?.fullName ?? (row.reported_user_id ? `User ${row.reported_user_id.slice(0, 8)}` : 'Reported item');
}
function normalizeLimit(value: number, max = 100) { return Number.isFinite(value) ? Math.max(1, Math.min(max, Math.floor(value))) : Math.min(50, max); }
function toReportError(message: string) { return message.toLowerCase().includes('row-level security') ? 'You do not have permission to access these reports.' : message; }
