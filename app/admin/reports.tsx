import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminEmptyState, AdminErrorState, AdminFilterTabs, AdminInfoRow, AdminListCard, AdminLoadingState, AdminPanel, AdminScreenShell, AdminStatusBadge, type AdminTone } from '@/components/admin/AdminShell';
import { BottomSheet } from '@/components/BottomSheet';
import { useFeedback } from '@/components/FeedbackProvider';
import { PrimaryButton } from '@/components/PrimaryButton';
import { color, radius, space, typography } from '@/constants/theme';
import { getAdminReportDetail, getAdminReportPage, updateReportStatus, type ReportStatus, type ReportSummary } from '@/services/report.service';
import { getReportPageRequest, prepareReportReview, REPORT_PAGE_SIZE, type ReportFilter, type ReportReviewDraft } from '@/utils/report-review';

const labels: Record<ReportFilter, string> = { open: 'Open', reviewing: 'Reviewing', received: 'Received', resolved: 'Resolved', dismissed: 'Dismissed' };
const filters: ReportFilter[] = ['open', 'reviewing', 'received', 'resolved', 'dismissed'];
type Page = NonNullable<Awaited<ReturnType<typeof getAdminReportPage>>['data']>;

export default function AdminReportsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reportId?: string | string[] }>();
  const linkedReportId = Array.isArray(params.reportId) ? params.reportId[0] : params.reportId;
  const { showSuccessToast } = useFeedback();
  const [filter, setFilter] = useState<ReportFilter>('open');
  const [page, setPage] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [result, setResult] = useState<{ key: string; data: Page | null; error: string | null } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ id: string; data: ReportSummary | null; error: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [consumedLink, setConsumedLink] = useState<string | undefined>();
  const [detailRefresh, setDetailRefresh] = useState(0);
  if (linkedReportId !== consumedLink) {
    setConsumedLink(linkedReportId);
    if (linkedReportId) { setSelectedId(linkedReportId); setDetail(null); setSaveError(null); }
  }
  const pendingSave = useRef(false);
  const requestKey = `${filter}:${page}:${refreshVersion}`;
  const loading = result?.key !== requestKey;
  const refresh = () => setRefreshVersion((value) => value + 1);

  useEffect(() => {
    if (linkedReportId) router.setParams({ reportId: undefined });
  }, [linkedReportId, router]);

  useEffect(() => {
    let active = true;
    void getAdminReportPage(getReportPageRequest(filter, page)).then((response) => {
      if (!active) return;
      if (response.data && page > 0 && page * REPORT_PAGE_SIZE >= response.data.total) {
        setPage(Math.max(0, Math.ceil(response.data.total / REPORT_PAGE_SIZE) - 1));
        return;
      }
      setResult({ key: requestKey, data: response.data, error: response.error });
    }).catch(() => {
      if (active) setResult({ key: requestKey, data: null, error: 'Could not load reports. Please try again.' });
    });
    return () => { active = false; };
  }, [filter, page, refreshVersion, requestKey]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void getAdminReportDetail(selectedId).then((response) => {
      if (active) setDetail({ id: selectedId, data: response.data, error: response.error });
    }).catch(() => {
      if (active) setDetail({ id: selectedId, data: null, error: 'Could not load complaint evidence.' });
    });
    return () => { active = false; };
  }, [selectedId, detailRefresh]);

  const currentDetail = detail?.id === selectedId ? detail : null;
  const closeDetail = () => { if (!saving) { setSelectedId(null); setDetail(null); setSaveError(null); } };
  const save = async (report: ReportSummary, draft: ReportReviewDraft) => {
    if (pendingSave.current) return;
    const decision = prepareReportReview(draft);
    if (!decision.data) { setSaveError(decision.error); return; }
    pendingSave.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await updateReportStatus({ reportId: report.id, ...decision.data });
      if (response.error || !response.data) {
        setSaveError(response.error ?? 'Could not save this decision.');
        return;
      }
      setSelectedId(null);
      setDetail(null);
      refresh();
      showSuccessToast('Complaint decision saved');
    } catch {
      setSaveError('Could not save this decision. Please try again.');
    } finally { pendingSave.current = false; setSaving(false); }
  };

  const openSubject = (report: ReportSummary) => {
    closeDetail();
    if (report.targetType === 'conversation' && report.conversationId) router.push({ pathname: '/conversation/[conversationId]', params: { conversationId: report.conversationId } });
    else if (report.targetType === 'job' && report.jobId) router.push({ pathname: '/job/[jobId]', params: { jobId: report.jobId, adminView: 'true' } });
    else if (report.targetType === 'service' && report.serviceId) router.push({ pathname: '/services/[serviceId]', params: { serviceId: report.serviceId, adminView: 'true' } });
    else if (report.reportedUserId) router.push('/admin/users');
  };

  const rows = loading ? [] : result?.data?.reports ?? [];
  return (
    <AdminScreenShell activeSection="reports" loading={loading} onRefresh={refresh} refreshing={loading} subtitle="Investigate complaints and record outcomes" title="Reports">
      <AdminPanel>
        <AdminFilterTabs options={filters.map((value) => ({ value, label: labels[value], count: result?.data?.counts[value] ?? 0 }))} value={filter} onChange={(value) => { setFilter(value); setPage(0); }} />
        {loading ? <AdminLoadingState label="Loading reports..." /> : result?.error ? <AdminErrorState message={result.error} onRetry={refresh} /> : rows.length ? (
          <View>
            {rows.map((report) => (
              <AdminListCard key={report.id}>
                <View style={styles.header}>
                  <Text style={styles.title}>{report.reason}</Text>
                  <AdminStatusBadge label={report.status} tone={tone(report.status)} />
                </View>
                <Text style={styles.body} numberOfLines={3}>{report.details || 'No additional details provided.'}</Text>
                <AdminInfoRow icon="person-outline" label="Submitted by" value={report.reporterName ?? report.reporterId} />
                <AdminInfoRow icon="category" label="Content" value={report.targetLabel} />
                <PrimaryButton label="Open complaint" variant="outline" onPress={() => { setSaveError(null); setSelectedId(report.id); }} />
              </AdminListCard>
            ))}
            <Text style={styles.caption} accessibilityLiveRegion="polite">{page * REPORT_PAGE_SIZE + 1}–{page * REPORT_PAGE_SIZE + rows.length} of {result?.data?.total ?? 0} {labels[filter].toLowerCase()} reports</Text>
            <View style={styles.pagination}>
              <PrimaryButton label="Previous page" variant="outline" disabled={page === 0} onPress={() => setPage((value) => value - 1)} />
              <PrimaryButton label="Next page" variant="outline" disabled={(page + 1) * REPORT_PAGE_SIZE >= (result?.data?.total ?? 0)} onPress={() => setPage((value) => value + 1)} />
            </View>
          </View>
        ) : <AdminEmptyState title={`No ${labels[filter].toLowerCase()} reports`} description="Complaints in this queue will appear here." icon="flag" />}
      </AdminPanel>
      <BottomSheet avoidKeyboard maxHeight="90%" visible={Boolean(selectedId)} onClose={closeDetail}>
        {!currentDetail ? <AdminLoadingState label="Loading complaint evidence..." /> : currentDetail.error || !currentDetail.data ? <><AdminErrorState message={currentDetail.error ?? 'Complaint unavailable.'} onRetry={() => { setDetail(null); setDetailRefresh((value) => value + 1); }} /><PrimaryButton label="Close" variant="outline" onPress={closeDetail} /></> : (
          <ReportEditor key={`${currentDetail.data.id}:${currentDetail.data.updatedAt}`} report={currentDetail.data} saving={saving} error={saveError} onClose={closeDetail} onOpenSubject={openSubject} onSave={save} />
        )}
      </BottomSheet>
    </AdminScreenShell>
  );
}

function ReportEditor({ report, saving, error, onClose, onOpenSubject, onSave }: {
  report: ReportSummary;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onOpenSubject: (report: ReportSummary) => void;
  onSave: (report: ReportSummary, draft: ReportReviewDraft) => void;
}) {
  const [status, setStatus] = useState(report.status);
  const [notes, setNotes] = useState(report.adminNotes ?? '');
  const [outcome, setOutcome] = useState(report.resolutionMessage ?? '');
  const [reviewAction, setReviewAction] = useState<ReportReviewDraft['reviewAction']>(null);
  const evidence = report.targetDetails;
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.editor} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.header}>
        <Text style={styles.title}>Complaint details</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close complaint" disabled={saving} onPress={onClose} style={styles.iconButton}><MaterialIcons name="close" size={24} color={color.text} /></Pressable>
      </View>
      <Text style={styles.label}>Reason</Text><Text selectable style={styles.body}>{report.reason}</Text>
      <Text style={styles.label}>Full complaint</Text><Text selectable style={styles.body}>{report.details || 'No additional details provided.'}</Text>
      <AdminInfoRow icon="person-outline" label="Submitted by" value={report.reporterName ?? report.reporterId} />
      <AdminInfoRow icon="event" label="Submitted" value={new Date(report.createdAt).toLocaleString()} />
      <Text style={styles.label}>Reported content</Text>
      <Text selectable style={styles.body}>{evidence?.title ?? report.targetLabel}</Text>
      {evidence?.rating !== undefined ? <Text style={styles.body}>Rating: {evidence.rating}/5 · {report.reviewHidden ? 'Hidden from public profiles' : 'Publicly visible'}</Text> : null}
      {evidence?.body ? <Text selectable style={styles.evidence}>{evidence.body}</Text> : null}
      {evidence?.messages?.length ? <View style={styles.messages}><Text style={styles.caption}>Latest 50 messages in this reported conversation</Text>{evidence.messages.map((message) => <View key={message.id} style={styles.message}><Text style={styles.caption}>{message.senderId} · {new Date(message.createdAt).toLocaleString()}</Text><Text selectable style={styles.body}>{message.body || '[Image message — attachment not shown here]'}</Text></View>)}</View> : null}
      {report.targetType === 'conversation' && !evidence?.messages?.length ? <Text style={styles.caption}>No message text available for this complaint.</Text> : null}
      {report.targetType === 'conversation' && report.conversationId ? <PrimaryButton label="Open reported conversation" variant="outline" onPress={() => onOpenSubject(report)} disabled={saving} /> : null}
      {report.targetType !== 'conversation' && report.targetType !== 'review' ? <PrimaryButton label={report.targetType === 'user' ? 'Open users directory' : 'Inspect reported content'} variant="outline" onPress={() => onOpenSubject(report)} disabled={saving} /> : null}
      <Text style={styles.label}>Internal investigation notes</Text>
      <Text style={styles.caption}>Only authorized barangay staff can read these notes. Explain any review visibility decision here.</Text>
      <TextInput accessibilityLabel="Internal investigation notes" editable={!saving} multiline maxLength={5000} value={notes} onChangeText={setNotes} textAlignVertical="top" style={styles.input} placeholder="Evidence checked, action taken, and rationale" placeholderTextColor={color.textSubtle} />
      <Text style={styles.label}>Outcome for the reporter</Text>
      <Text style={styles.caption}>Shared with the reporter. Required when resolving or dismissing; keep private evidence and personal information out.</Text>
      <TextInput accessibilityLabel="Outcome for the reporter" editable={!saving} multiline maxLength={2000} value={outcome} onChangeText={setOutcome} textAlignVertical="top" style={styles.input} placeholder="Explain the decision and any next steps" placeholderTextColor={color.textSubtle} />
      <Text style={styles.label}>Status</Text>
      <View style={styles.choices}>{(['open', 'reviewing', 'resolved', 'dismissed'] as ReportStatus[]).map((value) => <Choice key={value} label={labels[value]} selected={status === value} disabled={saving} onPress={() => setStatus(value)} />)}</View>
      {report.reviewId ? <><Text style={styles.label}>Review visibility</Text><Text style={styles.caption}>Hiding removes this review from public text and rating summaries. Restoring makes it public again. Every decision is recorded.</Text><View style={styles.choices}><Choice label="Keep current visibility" selected={!reviewAction} disabled={saving} onPress={() => setReviewAction(null)} /><Choice label={report.reviewHidden ? 'Restore review' : 'Hide review'} selected={Boolean(reviewAction)} disabled={saving} onPress={() => setReviewAction(report.reviewHidden ? 'restore' : 'hide')} /></View></> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Save decision" loading={saving} onPress={() => onSave(report, { status, adminNotes: notes, resolutionMessage: outcome, reviewAction })} />
      <PrimaryButton label="Cancel" variant="ghost" disabled={saving} onPress={onClose} />
    </ScrollView>
  );
}

function Choice({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Text style={[styles.body, selected && styles.selectedText]}>{label}</Text></Pressable>;
}

function tone(status: ReportStatus): AdminTone { return status === 'resolved' ? 'success' : status === 'dismissed' ? 'danger' : status === 'reviewing' ? 'primary' : 'warning'; }

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm },
  title: { ...typography.sectionTitle, flex: 1, color: color.text },
  body: { ...typography.body, color: color.text, flexShrink: 1 },
  caption: { ...typography.caption, color: color.textMuted },
  label: { ...typography.bodyMedium, color: color.text },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingTop: space.md },
  scroll: { flexShrink: 1, minHeight: 0 },
  editor: { gap: space.md, paddingBottom: space.sm },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  input: { ...typography.body, color: color.text, borderWidth: 1, borderColor: color.border, borderRadius: radius.md, padding: space.md, minHeight: 100 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: { minHeight: 44, paddingHorizontal: space.md, paddingVertical: space.sm, justifyContent: 'center', borderWidth: 1, borderColor: color.border, borderRadius: radius.md },
  choiceSelected: { borderColor: color.primaryText, backgroundColor: color.primarySoft },
  selectedText: { color: color.primaryText },
  error: { ...typography.body, color: color.danger },
  evidence: { ...typography.body, color: color.text, padding: space.md, backgroundColor: color.surfaceAlt, borderRadius: radius.md },
  messages: { gap: space.sm },
  message: { gap: space.xs, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
});
