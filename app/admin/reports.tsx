import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFeedback } from '@/components/FeedbackProvider';
import { color, radius, space, typography } from '@/constants/theme';
import {
  getAdminReports,
  updateReportStatus,
  type ReportStatus,
  type ReportSummary,
} from '@/services/report.service';

type ReportFilter = ReportStatus | 'all';

const filterOptions: { label: string; value: ReportFilter }[] = [
  { label: 'Open', value: 'open' },
  { label: 'Reviewing', value: 'reviewing' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Dismissed', value: 'dismissed' },
  { label: 'All', value: 'all' },
];

export default function AdminReportsScreen() {
  const router = useRouter();
  const { showSuccessToast } = useFeedback();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<ReportFilter>('open');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await getAdminReports({ limit: 100 });

    if (result.error || !result.data) {
      Alert.alert('Reports', result.error ?? 'Could not load reports.');
    } else {
      setReports(result.data);
      setNotes((current) => ({
        ...Object.fromEntries(result.data.map((report) => [report.id, report.adminNotes ?? ''])),
        ...current,
      }));
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const visibleReports = useMemo(() => {
    if (filter === 'all') return reports;
    return reports.filter((report) => report.status === filter);
  }, [filter, reports]);

  const review = async (report: ReportSummary, status: ReportStatus) => {
    setUpdatingId(report.id);
    const result = await updateReportStatus({
      adminNotes: notes[report.id] ?? report.adminNotes,
      reportId: report.id,
      status,
    });
    setUpdatingId(null);

    if (result.error || !result.data) {
      Alert.alert('Update report', result.error ?? 'Could not update this report.');
      return;
    }

    setReports((current) =>
      current.map((item) => (item.id === result.data?.id ? result.data : item)),
    );
    showSuccessToast('Report updated');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to verifications"
            accessibilityRole="button"
            onPress={() => router.replace('/admin/verifications' as never)}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Barangay admin</Text>
            <Text style={styles.title}>Reports</Text>
          </View>
          <Pressable
            accessibilityLabel="Refresh reports"
            accessibilityRole="button"
            onPress={() => load({ silent: true })}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
            <MaterialIcons color={color.primary} name="refresh" size={22} />
          </Pressable>
        </View>

        <View style={styles.filters}>
          {filterOptions.map((option) => {
            const active = filter === option.value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={option.value}
                onPress={() => setFilter(option.value)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={color.primary} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ silent: true })} />}
            showsVerticalScrollIndicator={false}>
            {visibleReports.length ? (
              visibleReports.map((report) => (
                <ReportCard
                  key={report.id}
                  notes={notes[report.id] ?? ''}
                  onChangeNotes={(value) => setNotes((current) => ({ ...current, [report.id]: value }))}
                  onReview={(status) => review(report, status)}
                  report={report}
                  updating={updatingId === report.id}
                />
              ))
            ) : (
              <View style={styles.emptyCard}>
                <MaterialIcons color={color.textSubtle} name="flag" size={28} />
                <Text style={styles.emptyTitle}>No reports here</Text>
                <Text style={styles.emptyText}>
                  Submitted user reports will appear here for barangay admin review.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function ReportCard({
  notes,
  onChangeNotes,
  onReview,
  report,
  updating,
}: {
  notes: string;
  onChangeNotes: (value: string) => void;
  onReview: (status: ReportStatus) => void;
  report: ReportSummary;
  updating: boolean;
}) {
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleWrap}>
          <Text style={styles.reportTarget}>{report.targetLabel}</Text>
          <Text style={styles.reportMeta}>{formatDateTime(report.createdAt)}</Text>
        </View>
        <StatusPill status={report.status} />
      </View>

      <View style={styles.metaGrid}>
        <MetaItem label="Reporter" value={report.reporterName ?? shortId(report.reporterId)} />
        <MetaItem
          label="Reported user"
          value={report.reportedUserName ?? (report.reportedUserId ? shortId(report.reportedUserId) : 'Not specified')}
        />
        <MetaItem label="Target" value={formatTargetIds(report)} />
        <MetaItem label="Reason" value={report.reason} />
      </View>

      {report.details ? (
        <View style={styles.detailsBox}>
          <Text style={styles.detailsLabel}>Details</Text>
          <Text style={styles.detailsText}>{report.details}</Text>
        </View>
      ) : null}

      <View style={styles.notesWrap}>
        <Text style={styles.detailsLabel}>Admin notes</Text>
        <TextInput
          editable={!updating}
          multiline
          onChangeText={onChangeNotes}
          placeholder="Optional note for the moderation record"
          placeholderTextColor={color.textSubtle}
          style={styles.notesInput}
          textAlignVertical="top"
          value={notes}
        />
      </View>

      <View style={styles.reviewActions}>
        <StatusButton
          disabled={updating}
          label="Reviewing"
          onPress={() => onReview('reviewing')}
          selected={report.status === 'reviewing'}
        />
        <StatusButton
          disabled={updating}
          label="Resolved"
          onPress={() => onReview('resolved')}
          selected={report.status === 'resolved'}
          tone="success"
        />
        <StatusButton
          disabled={updating}
          label="Dismissed"
          onPress={() => onReview('dismissed')}
          selected={report.status === 'dismissed'}
          tone="danger"
        />
      </View>
    </View>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function StatusButton({
  disabled,
  label,
  onPress,
  selected,
  tone = 'default',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected?: boolean;
  tone?: 'default' | 'success' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusButton,
        selected && styles.statusButtonSelected,
        tone === 'success' && styles.statusButtonSuccess,
        tone === 'danger' && styles.statusButtonDanger,
        disabled && styles.statusButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <Text
        style={[
          styles.statusButtonText,
          selected && styles.statusButtonTextSelected,
          tone === 'success' && styles.statusButtonTextSuccess,
          tone === 'danger' && styles.statusButtonTextDanger,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatusPill({ status }: { status: ReportStatus }) {
  return (
    <View style={[styles.statusPill, styles[`status_${status}`]]}>
      <Text style={styles.statusPillText}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

function formatTargetIds(report: ReportSummary) {
  if (report.jobId) return `Job ${shortId(report.jobId)}`;
  if (report.serviceId) return `Service ${shortId(report.serviceId)}`;
  if (report.conversationId) return `Conversation ${shortId(report.conversationId)}`;
  return report.reportedUserId ? `User ${shortId(report.reportedUserId)}` : 'Reported item';
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.surfaceAlt,
    flex: 1,
  },
  screen: {
    backgroundColor: color.surfaceAlt,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  headerButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    ...typography.captionMedium,
    color: color.primary,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.screenTitle,
    color: color.text,
  },
  filters: {
    backgroundColor: color.background,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  filterChip: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  filterChipActive: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  filterText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  filterTextActive: {
    color: color.primary,
  },
  content: {
    gap: space.md,
    padding: space.lg,
    paddingBottom: space['3xl'],
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    gap: space.sm,
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: color.textMuted,
  },
  reportCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  reportHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  reportTitleWrap: {
    flex: 1,
    gap: space.xs,
  },
  reportTarget: {
    ...typography.sectionTitle,
    color: color.text,
  },
  reportMeta: {
    ...typography.caption,
    color: color.textSubtle,
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  status_open: {
    backgroundColor: color.warningSoft,
  },
  status_reviewing: {
    backgroundColor: color.primarySoft,
  },
  status_resolved: {
    backgroundColor: color.successSoft,
  },
  status_dismissed: {
    backgroundColor: color.dangerSoft,
  },
  statusPillText: {
    ...typography.captionMedium,
    color: color.text,
    textTransform: 'capitalize',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  metaItem: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    flexBasis: '48%',
    flexGrow: 1,
    gap: space.xs,
    padding: space.md,
  },
  metaLabel: {
    ...typography.captionMedium,
    color: color.textSubtle,
  },
  metaValue: {
    ...typography.bodyMedium,
    color: color.text,
  },
  detailsBox: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    gap: space.xs,
    padding: space.md,
  },
  detailsLabel: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  detailsText: {
    ...typography.body,
    color: color.text,
  },
  notesWrap: {
    gap: space.xs,
  },
  notesInput: {
    ...typography.body,
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: color.text,
    minHeight: 78,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  reviewActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  statusButton: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  statusButtonSelected: {
    borderColor: color.primary,
  },
  statusButtonSuccess: {
    backgroundColor: color.successSoft,
  },
  statusButtonDanger: {
    backgroundColor: color.dangerSoft,
  },
  statusButtonDisabled: {
    opacity: 0.6,
  },
  statusButtonText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  statusButtonTextSelected: {
    color: color.primary,
  },
  statusButtonTextSuccess: {
    color: color.success,
  },
  statusButtonTextDanger: {
    color: color.danger,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space['2xl'],
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  emptyText: {
    ...typography.body,
    color: color.textMuted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.74,
  },
});
