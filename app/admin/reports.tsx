import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AdminEmptyState,
  AdminErrorState,
  AdminFilterTabs,
  AdminInfoRow,
  AdminListCard,
  AdminLoadingState,
  AdminPanel,
  AdminScreenShell,
  AdminStatusBadge,
  adminPalette,
  type AdminTone,
} from '@/components/admin/AdminShell';
import { useFeedback } from '@/components/FeedbackProvider';
import { color, radius, space, typography } from '@/constants/theme';
import {
  getAdminReports,
  updateReportStatus,
  type ReportStatus,
  type ReportSummary,
} from '@/services/report.service';

type ReportFilter = ReportStatus | 'received';
type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const filterLabels: Record<ReportFilter, string> = {
  dismissed: 'Dismissed',
  open: 'Open',
  received: 'Received',
  resolved: 'Resolved',
  reviewing: 'Reviewing',
};

const filterOrder: ReportFilter[] = ['open', 'reviewing', 'received', 'resolved', 'dismissed'];

export default function AdminReportsScreen() {
  const { showSuccessToast } = useFeedback();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [filter, setFilter] = useState<ReportFilter>('open');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    setErrorMessage(null);
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await getAdminReports({ limit: 120 });

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load reports.');
    } else {
      setReports(result.data);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      dismissed: reports.filter((report) => report.status === 'dismissed').length,
      open: reports.filter((report) => report.status === 'open').length,
      received: reports.filter(isReceivedReport).length,
      resolved: reports.filter((report) => report.status === 'resolved').length,
      reviewing: reports.filter((report) => report.status === 'reviewing').length,
    }),
    [reports],
  );

  const filterOptions = useMemo(
    () =>
      filterOrder.map((value) => ({
        count: counts[value],
        label: filterLabels[value],
        value,
      })),
    [counts],
  );

  const visibleReports = useMemo(() => {
    if (filter === 'received') return reports.filter(isReceivedReport);
    return reports.filter((report) => report.status === filter);
  }, [filter, reports]);

  const review = async (report: ReportSummary, status: ReportStatus) => {
    setUpdatingId(report.id);
    const result = await updateReportStatus({
      adminNotes: report.adminNotes,
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

  const emptyState = emptyStateForFilter(filter);

  return (
    <AdminScreenShell
      activeSection="reports"
      loading={loading}
      onRefresh={() => load({ silent: true })}
      refreshing={refreshing}
      subtitle="Review submitted user reports"
      title="Reports">
      <AdminPanel>
        <AdminFilterTabs options={filterOptions} value={filter} onChange={setFilter} />

        {loading ? (
          <AdminLoadingState label="Loading reports..." />
        ) : errorMessage ? (
          <AdminErrorState message={errorMessage} onRetry={() => load()} />
        ) : visibleReports.length ? (
          <View style={styles.list}>
            {visibleReports.map((report) => (
              <ReportCard
                key={report.id}
                onReview={(status) => review(report, status)}
                report={report}
                updating={updatingId === report.id}
              />
            ))}
          </View>
        ) : (
          <AdminEmptyState
            description={emptyState.description}
            icon="flag"
            title={emptyState.title}
          />
        )}
      </AdminPanel>
    </AdminScreenShell>
  );
}

function ReportCard({
  onReview,
  report,
  updating,
}: {
  onReview: (status: ReportStatus) => void;
  report: ReportSummary;
  updating: boolean;
}) {
  const reportTitle = titleForReport(report);
  const canStartReview = report.status === 'open';
  const summary = report.details?.trim() || report.reason;

  return (
    <AdminListCard>
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleWrap}>
          <View style={styles.reportTypeRow}>
            <MaterialIcons color={adminPalette.blue} name={iconForTarget(report.targetType)} size={20} />
            <Text numberOfLines={2} style={styles.reportTitle}>{reportTitle}</Text>
          </View>
          <Text style={styles.reportMeta}>{formatTargetType(report.targetType)}</Text>
        </View>
        <AdminStatusBadge label={report.status} tone={toneForStatus(report.status)} />
      </View>

      <Text numberOfLines={3} style={styles.reportSummary}>{summary}</Text>

      <View style={styles.infoRows}>
        <AdminInfoRow icon="person-outline" label="Submitted by" value={report.reporterName ?? shortId(report.reporterId)} />
        <AdminInfoRow icon="event" label="Submitted" value={formatDate(report.createdAt)} />
        <AdminInfoRow icon="category" label="Content" value={report.targetLabel} />
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: updating || !canStartReview }}
          disabled={updating || !canStartReview}
          onPress={() => onReview('reviewing')}
          style={({ pressed }) => [
            styles.reviewButton,
            !canStartReview && styles.reviewButtonDisabled,
            pressed && canStartReview && !updating && styles.pressed,
          ]}>
          <MaterialIcons color={canStartReview ? color.white : adminPalette.faint} name="rate-review" size={18} />
          <Text style={[styles.reviewButtonText, !canStartReview && styles.reviewButtonTextDisabled]}>
            {canStartReview ? 'Review Report' : 'Under review'}
          </Text>
        </Pressable>

        <StatusButton
          disabled={updating || report.status === 'resolved'}
          icon="done-all"
          label="Resolve"
          onPress={() => onReview('resolved')}
          tone="success"
        />
        <StatusButton
          disabled={updating || report.status === 'dismissed'}
          icon="block"
          label="Dismiss"
          onPress={() => onReview('dismissed')}
          tone="danger"
        />
      </View>
    </AdminListCard>
  );
}

function StatusButton({
  disabled,
  icon,
  label,
  onPress,
  tone,
}: {
  disabled?: boolean;
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
  tone: 'success' | 'danger';
}) {
  const foreground = tone === 'danger' ? color.danger : color.success;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusButton,
        tone === 'success' && styles.statusButtonSuccess,
        tone === 'danger' && styles.statusButtonDanger,
        disabled && styles.statusButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <MaterialIcons color={foreground} name={icon} size={16} />
      <Text style={[styles.statusButtonText, tone === 'danger' && styles.statusButtonTextDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

function isReceivedReport(report: ReportSummary) {
  return report.status === 'open' && !report.reviewedAt;
}

function titleForReport(report: ReportSummary) {
  const reason = report.reason.trim();
  if (reason) return reason;
  return `${formatTargetType(report.targetType)} report`;
}

function formatTargetType(targetType: ReportSummary['targetType']) {
  if (targetType === 'job') return 'Job report';
  if (targetType === 'service') return 'Service report';
  if (targetType === 'conversation') return 'Conversation report';
  return 'User report';
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toneForStatus(status: ReportStatus): AdminTone {
  if (status === 'resolved') return 'success';
  if (status === 'dismissed') return 'danger';
  if (status === 'reviewing') return 'primary';
  return 'warning';
}

function iconForTarget(targetType: ReportSummary['targetType']): MaterialIconName {
  if (targetType === 'job') return 'work-outline';
  if (targetType === 'service') return 'handyman';
  if (targetType === 'conversation') return 'forum';
  return 'person-outline';
}

function emptyStateForFilter(filter: ReportFilter) {
  if (filter === 'reviewing') {
    return {
      title: 'No reports under review',
      description: 'Reports being checked will appear here',
    };
  }
  if (filter === 'received') {
    return {
      title: 'No received reports',
      description: 'Newly submitted reports will appear here',
    };
  }
  if (filter === 'resolved') {
    return {
      title: 'No resolved reports',
      description: 'Completed reports will appear here',
    };
  }
  if (filter === 'dismissed') {
    return {
      title: 'No dismissed reports',
      description: 'Dismissed reports will appear here',
    };
  }

  return {
    title: 'No open reports',
    description: 'Submitted user reports will appear here',
  };
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  reportHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  reportTitleWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  reportTypeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  reportTitle: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  reportMeta: {
    ...typography.caption,
    color: adminPalette.faint,
  },
  reportSummary: {
    ...typography.body,
    color: adminPalette.muted,
  },
  infoRows: {
    gap: 0,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  reviewButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    flexGrow: 1,
    gap: space.xs,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 150,
    paddingHorizontal: space.lg,
  },
  reviewButtonDisabled: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderWidth: 1,
  },
  reviewButtonText: {
    ...typography.button,
    color: color.white,
  },
  reviewButtonTextDisabled: {
    color: adminPalette.faint,
  },
  statusButton: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    flexGrow: 1,
    gap: space.xs,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: space.md,
  },
  statusButtonSuccess: {
    backgroundColor: color.successSoft,
  },
  statusButtonDanger: {
    backgroundColor: color.dangerSoft,
  },
  statusButtonDisabled: {
    opacity: 0.55,
  },
  statusButtonText: {
    ...typography.captionMedium,
    color: color.success,
    fontFamily: 'Satoshi-Bold',
  },
  statusButtonTextDanger: {
    color: color.danger,
  },
  pressed: {
    opacity: 0.74,
  },
});
