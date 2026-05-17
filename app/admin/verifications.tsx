import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { color, radius, space, typography } from '@/constants/theme';
import {
  listVerificationRequests,
  reviewVerificationRequest,
  type VerificationRequestDetail,
} from '@/services/admin.service';
import type { VerificationStatus } from '@/types/verification.types';
import { supabase } from '@/utils/supabase';

type QueueFilter = 'pending' | 'reviewed' | 'all';
type ReviewSheetState = 'collapsed' | 'half' | 'full';
type VerificationFilePreview = VerificationRequestDetail['files'][number];
type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

type SubmissionDetails = {
  birthdate: string | null;
  city: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  firstName: string | null;
  idType: string | null;
  lastName: string | null;
  servicesOrPurpose: string | null;
  streetAddress: string | null;
  submittedNote: string | null;
};

const reviewedStatuses: VerificationStatus[] = [
  'approved',
  'needs_more_info',
  'rejected',
  'cancelled',
  'skipped',
];

const filterTabs: { icon: MaterialIconName; label: string; value: QueueFilter }[] = [
  { icon: 'pending-actions', label: 'Pending', value: 'pending' },
  { icon: 'fact-check', label: 'Reviewed', value: 'reviewed' },
  { icon: 'inventory-2', label: 'All', value: 'all' },
];

const adminPalette = {
  canvas: '#F5F6F8',
  canvasSoft: '#FAFBFC',
  surfaceRaised: color.background,
  surfaceMuted: '#F4F7FA',
  line: '#E6EAF0',
  lineStrong: '#CFE3FB',
  trust: color.primary,
  trustDeep: color.verificationBlue,
  trustSoft: color.primarySoft,
  successDeep: '#31945A',
  successSoft: '#EAF7EF',
  warningDeep: '#9A650E',
  warningSoft: '#FFF5DC',
  dangerDeep: color.danger,
  dangerSoft: '#FFF1F1',
  ink: color.text,
  muted: color.textMuted,
  faint: color.textSubtle,
  shadow: '#0F172A',
} as const;

export default function AdminVerificationQueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<VerificationRequestDetail[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>('pending');
  const [reviewSheetState, setReviewSheetState] = useState<ReviewSheetState>('collapsed');
  const [previewFile, setPreviewFile] = useState<VerificationFilePreview | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const setReviewSheetStateAnimated = (nextState: ReviewSheetState) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReviewSheetState(nextState);
  };

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await listVerificationRequests({ limit: 75 });

    if (result.error || !result.data) {
      Alert.alert('Admin verifications', result.error ?? 'Could not load verification requests.');
    } else {
      setRequests(result.data);
      setSelectedId((current) => {
        if (current && result.data?.some((request) => request.id === current)) return current;
        return result.data?.find((request) => request.status === 'pending')?.id ?? result.data?.[0]?.id ?? null;
      });
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const pending = requests.filter((request) => request.status === 'pending').length;
    const approved = requests.filter((request) => request.status === 'approved').length;
    const rejected = requests.filter((request) => request.status === 'rejected').length;
    const files = requests.reduce((total, request) => total + request.files.length, 0);

    return { approved, files, pending, rejected };
  }, [requests]);

  const visibleRequests = useMemo(() => {
    if (filter === 'pending') return requests.filter((request) => request.status === 'pending');
    if (filter === 'reviewed') return requests.filter((request) => reviewedStatuses.includes(request.status));
    return requests;
  }, [filter, requests]);

  const selectedRequest =
    visibleRequests.find((request) => request.id === selectedId) ?? visibleRequests[0] ?? null;

  const review = async (requestId: string, decision: 'approved' | 'rejected' | 'needs_more_info') => {
    const note = notes[requestId]?.trim() ?? '';

    if (decision !== 'approved' && !note) {
      Alert.alert('Reviewer note required', 'Add a clear correction reason before saving this review.');
      return;
    }

    setReviewingId(requestId);
    const result = await reviewVerificationRequest({
      requestId,
      decision,
      note,
    });
    setReviewingId(null);

    if (result.error) {
      Alert.alert('Review request', result.error);
      return;
    }

    setRequests((current) =>
      current.map((request) => (request.id === requestId && result.data ? result.data : request)),
    );
    setSelectedId(result.data?.id ?? requestId);
  };

  const openFile = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Open file', 'Could not open this uploaded file.');
    }
  };

  const previewOrOpenFile = (file: VerificationFilePreview) => {
    if (isImageUrl(file.url)) {
      setPreviewFile(file);
      return;
    }

    openFile(file.url);
  };

  const signOut = () => {
    Alert.alert('Log out', 'End this barangay admin session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert('Log out', error.message);
            return;
          }

          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.adminIdentity}>
              <View style={styles.adminMark}>
                <MaterialIcons color={color.primary} name="admin-panel-settings" size={22} />
              </View>
              <Text style={styles.eyebrow}>Barangay admin</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Open reports"
                accessibilityRole="button"
                onPress={() => router.push('/admin/reports' as never)}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <MaterialIcons color={color.primary} name="flag" size={26} />
              </Pressable>
              <Pressable
                accessibilityLabel="Refresh dashboard"
                accessibilityRole="button"
                onPress={() => load({ silent: true })}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <MaterialIcons color={color.primary} name="refresh" size={28} />
              </Pressable>
              <Pressable
                accessibilityLabel="Log out"
                accessibilityRole="button"
                onPress={signOut}
                style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
                <MaterialIcons color={color.danger} name="logout" size={18} />
                <Text style={styles.logoutText}>Log out</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Verification Dashboard</Text>
            <Text style={styles.subtitle}>Review resident identity requests and unlock trusted actions.</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                getSheetOffset(selectedRequest, reviewSheetState) + Math.max(insets.bottom, space.sm),
            },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ silent: true })} />}
          showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            <MetricCard icon="pending-actions" label="Pending" tone="warning" value={stats.pending} />
            <MetricCard icon="verified-user" label="Approved" tone="success" value={stats.approved} />
            <MetricCard icon="shield" label="Rejected" tone="danger" value={stats.rejected} />
            <MetricCard icon="attach-file" label="Files" tone="primary" value={stats.files} />
          </View>

          <View style={styles.dashboardGrid}>
            <View style={styles.queueColumn}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.sectionIcon}>
                      <MaterialIcons color={color.primary} name="filter-list" size={20} />
                    </View>
                    <Text style={styles.sectionTitle}>Review Queue</Text>
                  </View>
                  <Text style={styles.sectionCaption}>
                    {loading ? 'Loading requests' : `${visibleRequests.length} shown from ${requests.length} requests`}
                  </Text>
                </View>
                <View style={[styles.queueStatusBadge, getStatusChipStyle(getFilterBadgeTone(filter))]}>
                  <Text style={[styles.queueStatusBadgeText, getStatusTextStyle(getFilterBadgeTone(filter))]}>
                    {getFilterBadgeLabel(filter)}
                  </Text>
                </View>
              </View>

              <View style={styles.filterSegment}>
                {filterTabs.map((tab) => (
                  <FilterChip
                    active={filter === tab.value}
                    icon={tab.icon}
                    key={tab.value}
                    label={tab.label}
                    onPress={() => setFilter(tab.value)}
                  />
                ))}
              </View>

              {selectedRequest ? (
                <View style={styles.selectedBanner}>
                  <View style={styles.selectedBannerIcon}>
                    <MaterialIcons color={color.primary} name="person-search" size={22} />
                  </View>
                  <View style={styles.selectedBannerCopy}>
                    <Text numberOfLines={1} style={styles.selectedBannerTitle}>
                      Reviewing {selectedRequest.profile?.fullName ?? 'Resident'}
                    </Text>
                    <Text style={styles.selectedBannerText}>Use the bottom sheet for details and actions.</Text>
                  </View>
                </View>
              ) : null}

              {!loading && !visibleRequests.length ? (
                <View style={styles.emptyCard}>
                  <MaterialIcons color={color.textSubtle} name="inventory-2" size={22} />
                  <View style={styles.emptyCopy}>
                    <Text style={styles.emptyTitle}>No requests here</Text>
                    <Text style={styles.body}>New barangay verification submissions will appear in this queue.</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.queueList}>
                {visibleRequests.map((request) => (
                  <RequestQueueCard
                    active={selectedRequest?.id === request.id}
                    key={request.id}
                    request={request}
                    onPress={() => {
                      setSelectedId(request.id);
                      setReviewSheetStateAnimated('half');
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {selectedRequest ? (
          <BottomReviewSheet
            bottomInset={insets.bottom}
            note={notes[selectedRequest.id] ?? ''}
            request={selectedRequest}
            reviewing={reviewingId === selectedRequest.id}
            state={reviewSheetState}
            onChangeNote={(value) =>
              setNotes((current) => ({
                ...current,
                [selectedRequest.id]: value,
              }))
            }
            onOpenFile={previewOrOpenFile}
            onReview={review}
            onSetState={setReviewSheetStateAnimated}
          />
        ) : null}

        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onOpenExternally={(url) => openFile(url)}
        />
      </View>
    </SafeAreaView>
  );
}

function MetricCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  tone: 'danger' | 'primary' | 'success' | 'warning';
  value: number;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <View style={[styles.metricIcon, styles[`${tone}Soft`]]}>
          <MaterialIcons color={getToneColor(tone)} name={icon} size={24} />
        </View>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.pressed,
      ]}>
      <MaterialIcons color={active ? adminPalette.trustDeep : adminPalette.faint} name={icon} size={18} />
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function AdminActionButton({
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  variant,
}: {
  disabled?: boolean;
  icon: MaterialIconName;
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant: 'approve' | 'reject' | 'secondary';
}) {
  const foreground = disabled
    ? adminPalette.faint
    : variant === 'approve'
      ? color.white
      : variant === 'reject'
        ? adminPalette.dangerDeep
        : adminPalette.trustDeep;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.adminAction,
        styles[`${variant}Action`],
        disabled && styles.adminActionDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <MaterialIcons color={foreground} name={loading ? 'hourglass-empty' : icon} size={16} />
      <Text style={[styles.adminActionText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

function RequestQueueCard({
  active,
  request,
  onPress,
}: {
  active: boolean;
  request: VerificationRequestDetail;
  onPress: () => void;
}) {
  const details = parseSubmissionDetails(request.notes);
  const subtitle = [request.profile?.barangay, request.profile?.city].filter(Boolean).join(', ') || 'No location';
  const servicePreview = formatServicePreview(details.servicesOrPurpose || details.submittedNote || '');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.queueCard,
        active && styles.queueCardActive,
        pressed && styles.pressed,
      ]}>
      <View style={styles.queueTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(request.profile?.fullName ?? 'Resident')}</Text>
        </View>
        <View style={styles.queueCopy}>
          <Text numberOfLines={1} style={styles.queueName}>
            {request.profile?.fullName ?? 'Resident'}
          </Text>
          <Text numberOfLines={1} style={styles.queueMeta}>
            {subtitle}
          </Text>
        </View>
        <StatusPill status={request.status} />
      </View>
      <Text numberOfLines={1} style={styles.queuePurpose}>
        {servicePreview || 'No submitted purpose'}
      </Text>
      <View style={styles.queueFooter}>
        <IconText icon="event" text={formatDate(request.createdAt)} />
        <IconText icon="attach-file" text={`${request.files.length} files`} />
      </View>
    </Pressable>
  );
}

function BottomReviewSheet({
  bottomInset,
  note,
  request,
  reviewing,
  state,
  onChangeNote,
  onOpenFile,
  onReview,
  onSetState,
}: {
  bottomInset: number;
  note: string;
  request: VerificationRequestDetail;
  reviewing: boolean;
  state: ReviewSheetState;
  onChangeNote: (value: string) => void;
  onOpenFile: (file: VerificationFilePreview) => void;
  onReview: (requestId: string, decision: 'approved' | 'rejected' | 'needs_more_info') => void;
  onSetState: (state: ReviewSheetState) => void;
}) {
  const details = parseSubmissionDetails(request.notes);
  const canReview = request.status === 'pending';
  const collapsed = state === 'collapsed';
  const half = state === 'half';
  const sheetStyle =
    state === 'full' ? styles.reviewSheetFull : half ? styles.reviewSheetHalf : styles.reviewSheetCollapsed;

  const toggleSheetState = () => {
    onSetState(collapsed ? 'half' : half ? 'full' : 'collapsed');
  };

  const handleReject = () => {
    if (!note.trim()) {
      onSetState('full');
      return;
    }

    onReview(request.id, 'rejected');
  };

  return (
    <View style={[styles.reviewSheet, sheetStyle, { paddingBottom: Math.max(bottomInset, space.sm) + space.md }]}>
      <Pressable accessibilityRole="button" onPress={toggleSheetState} style={styles.sheetHandleArea}>
        <View style={styles.sheetHandle} />
      </Pressable>

      <View style={styles.sheetHeader}>
        <View style={styles.sheetResident}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>{getInitials(request.profile?.fullName ?? 'Resident')}</Text>
          </View>
          <View style={styles.sheetTitleCopy}>
            <Text numberOfLines={1} style={styles.workspaceTitle}>
              {request.profile?.fullName ?? 'Resident'}
            </Text>
            <Text style={styles.workspaceSubtitle}>
              {request.files.length} files - submitted {formatDate(request.createdAt)}
            </Text>
          </View>
        </View>
        <StatusPill status={request.status} />
      </View>

      {!collapsed ? (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
          <View style={styles.reviewCard}>
            <ReviewField label="Full name" value={fullNameFromDetails(details, request)} />
            <ReviewField
              label="Address"
              value={[
                details.streetAddress,
                request.profile?.barangay ?? details.city,
                request.profile?.city ?? details.city,
              ]
                .filter(Boolean)
                .join('\n')}
              multiline
            />
            <ReviewField label="Birthdate" value={details.birthdate} />
          </View>

          <View style={styles.infoGrid}>
            <InfoTile icon="badge" label="Document" value={formatFileType(details.idType ?? 'not provided')} />
            <InfoTile icon="call" label="Phone" value={details.contactPhone || 'Not provided'} />
            <InfoTile icon="mail" label="Email" value={details.contactEmail || 'Not provided'} />
            <InfoTile icon="handyman" label="Services" value={formatServicePreview(details.servicesOrPurpose ?? '')} />
          </View>

          {details.submittedNote ? (
            <View style={styles.notePanel}>
              <Text style={styles.detailLabel}>Resident note</Text>
              <Text style={styles.body}>{details.submittedNote}</Text>
            </View>
          ) : null}

          <View style={styles.filesPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.detailLabel}>Uploaded files</Text>
              <Pill label={`${request.files.length} files`} />
            </View>
            {request.files.length ? (
              <View style={styles.files}>
                {request.files.map((file) => (
                  <Pressable
                    accessibilityRole="link"
                    key={file.id}
                    onPress={() => onOpenFile(file)}
                    style={({ pressed }) => [styles.fileButton, pressed && styles.pressed]}>
                    <View style={styles.fileIcon}>
                      <MaterialIcons color={color.primary} name="attach-file" size={18} />
                    </View>
                    <View style={styles.fileCopy}>
                      <Text style={styles.fileTitle}>{formatFileType(file.fileType)}</Text>
                      <Text numberOfLines={1} style={styles.fileUrl}>
                        {file.url}
                      </Text>
                    </View>
                    <MaterialIcons color={color.textSubtle} name="open-in-new" size={16} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.body}>No uploaded files are attached to this request.</Text>
            )}
          </View>

          {state === 'full' ? (
            <View style={styles.decisionPanel}>
              <Text style={styles.detailLabel}>Reviewer note</Text>
              <TextInput
                multiline
                onChangeText={onChangeNote}
                placeholder="Add approval note or correction reason"
                placeholderTextColor={color.textSubtle}
                style={styles.input}
                value={note}
              />
              {request.reviewerNote && request.status !== 'pending' ? (
                <Text style={styles.previousNote}>Previous note: {request.reviewerNote}</Text>
              ) : null}
              <View style={styles.actions}>
                <AdminActionButton
                  disabled={!canReview || reviewing || !note.trim()}
                  icon="upload-file"
                  label="Request reupload"
                  onPress={() => onReview(request.id, 'needs_more_info')}
                  variant="secondary"
                />
                <AdminActionButton
                  disabled={!canReview || reviewing || !note.trim()}
                  icon="close"
                  label="Reject"
                  onPress={() => onReview(request.id, 'rejected')}
                  variant="reject"
                />
                <AdminActionButton
                  disabled={!canReview || reviewing}
                  icon="check-circle"
                  label="Approve"
                  loading={reviewing}
                  onPress={() => onReview(request.id, 'approved')}
                  variant="approve"
                />
              </View>
            </View>
          ) : (
            <View style={styles.sheetHint}>
              <Text style={styles.sheetHintText}>Tap the handle for full review notes and final actions.</Text>
            </View>
          )}
        </ScrollView>
      ) : null}

      <View style={styles.quickActions}>
        <AdminActionButton
          disabled={!canReview || reviewing}
          icon="check-circle"
          label="Approve"
          loading={reviewing}
          onPress={() => onReview(request.id, 'approved')}
          variant="approve"
        />
        <AdminActionButton
          disabled={!canReview || reviewing}
          icon="close"
          label="Reject"
          onPress={handleReject}
          variant="reject"
        />
      </View>
    </View>
  );
}

function FilePreviewModal({
  file,
  onClose,
  onOpenExternally,
}: {
  file: VerificationFilePreview | null;
  onClose: () => void;
  onOpenExternally: (url: string) => void;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={Boolean(file)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.previewSheet}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={styles.previewTitle}>{formatFileType(file?.fileType ?? 'Uploaded file')}</Text>
              <Text style={styles.previewSubtitle}>Verification document</Text>
            </View>
            <Pressable
              accessibilityLabel="Close preview"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <MaterialIcons color={color.text} name="close" size={22} />
            </Pressable>
          </View>

          {file ? (
            <Image resizeMode="contain" source={{ uri: file.url }} style={styles.previewImage} />
          ) : null}

          {file ? (
            <View style={styles.previewActions}>
              <PrimaryButton label="Close" onPress={onClose} variant="secondary" />
              <PrimaryButton
                icon="open-in-new"
                label="Open full file"
                onPress={() => onOpenExternally(file.url)}
                variant="outline"
              />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function ReviewField({
  label,
  multiline,
  value,
}: {
  label: string;
  multiline?: boolean;
  value: string | null | undefined;
}) {
  return (
    <View style={styles.reviewField}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={[styles.reviewValue, multiline && styles.reviewValueMultiline]}>
        {value || 'Not provided'}
      </Text>
    </View>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoTile}>
      <MaterialIcons color={color.primary} name={icon} size={17} />
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function IconText({
  icon,
  text,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  text: string;
}) {
  return (
    <View style={styles.iconText}>
      <MaterialIcons color={color.textSubtle} name={icon} size={14} />
      <Text style={styles.iconTextLabel}>{text}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: VerificationStatus }) {
  const tone = getStatusTone(status);
  return (
    <View style={[styles.statusChip, getStatusChipStyle(tone)]}>
      <Text style={[styles.statusChipText, getStatusTextStyle(tone)]}>{formatStatusLabel(status)}</Text>
    </View>
  );
}

function parseSubmissionDetails(notes: string | null): SubmissionDetails {
  if (!notes) return emptySubmissionDetails();

  try {
    const parsed = JSON.parse(notes) as {
      contact?: { email?: string | null; phone?: string | null };
      document?: { idType?: string | null };
      identity?: {
        birthdate?: string | null;
        city?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        streetAddress?: string | null;
      };
      servicesOrPurpose?: string | null;
      submittedNote?: string | null;
    };

    return {
      birthdate: parsed.identity?.birthdate ?? null,
      city: parsed.identity?.city ?? null,
      contactEmail: parsed.contact?.email ?? null,
      contactPhone: parsed.contact?.phone ?? null,
      firstName: parsed.identity?.firstName ?? null,
      idType: parsed.document?.idType ?? null,
      lastName: parsed.identity?.lastName ?? null,
      servicesOrPurpose: parsed.servicesOrPurpose ?? null,
      streetAddress: parsed.identity?.streetAddress ?? null,
      submittedNote: parsed.submittedNote ?? null,
    };
  } catch {
    return {
      ...emptySubmissionDetails(),
      submittedNote: notes,
    };
  }
}

function emptySubmissionDetails(): SubmissionDetails {
  return {
    birthdate: null,
    city: null,
    contactEmail: null,
    contactPhone: null,
    firstName: null,
    idType: null,
    lastName: null,
    servicesOrPurpose: null,
    streetAddress: null,
    submittedNote: null,
  };
}

function fullNameFromDetails(details: SubmissionDetails, request: VerificationRequestDetail) {
  return (
    [details.firstName, details.lastName].filter(Boolean).join(' ') ||
    request.profile?.fullName ||
    'Not provided'
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFileType(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function formatServicePreview(value: string) {
  const services = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!services.length) return '';

  const shown = services.slice(0, 3).join(' · ');
  const hiddenCount = services.length - 3;

  return hiddenCount > 0 ? `${shown} +${hiddenCount}` : shown;
}

function getSheetOffset(request: VerificationRequestDetail | null, state: ReviewSheetState) {
  if (!request) return space.xl;
  if (state === 'full') return 520;
  if (state === 'half') return 360;
  return adminContentBottomPadding;
}

function isImageUrl(value: string) {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getStatusTone(status: VerificationStatus): StatusTone {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'needs_more_info') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

function getStatusChipStyle(tone: StatusTone) {
  if (tone === 'primary') return styles.primaryStatusChip;
  if (tone === 'success') return styles.successStatusChip;
  if (tone === 'warning') return styles.warningStatusChip;
  if (tone === 'danger') return styles.dangerStatusChip;
  return styles.neutralStatusChip;
}

function getStatusTextStyle(tone: StatusTone) {
  if (tone === 'primary') return styles.primaryStatusText;
  if (tone === 'success') return styles.successStatusText;
  if (tone === 'warning') return styles.warningStatusText;
  if (tone === 'danger') return styles.dangerStatusText;
  return styles.neutralStatusText;
}

function formatStatusLabel(status: VerificationStatus) {
  if (status === 'needs_more_info') return 'Needs more info';
  return status.replace(/_/g, ' ');
}

function getToneColor(tone: 'danger' | 'primary' | 'success' | 'warning') {
  if (tone === 'danger') return adminPalette.dangerDeep;
  if (tone === 'success') return adminPalette.successDeep;
  if (tone === 'warning') return adminPalette.warningDeep;
  return adminPalette.trustDeep;
}

function getFilterBadgeTone(filter: QueueFilter): StatusTone {
  if (filter === 'pending') return 'warning';
  if (filter === 'reviewed') return 'success';
  return 'primary';
}

function getFilterBadgeLabel(filter: QueueFilter) {
  if (filter === 'pending') return 'pending';
  if (filter === 'reviewed') return 'reviewed';
  return 'all';
}

const adminContentBottomPadding = 150;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: adminPalette.canvas,
    flex: 1,
  },
  screen: {
    backgroundColor: adminPalette.canvas,
    flex: 1,
  },
  header: {
    backgroundColor: adminPalette.surfaceRaised,
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    gap: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  adminIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  adminMark: {
    alignItems: 'center',
    backgroundColor: adminPalette.trustSoft,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerCopy: {
    gap: space.xs,
    maxWidth: 460,
  },
  eyebrow: {
    color: adminPalette.trustDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    ...typography.caption,
    color: adminPalette.muted,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.trustSoft,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.dangerSoft,
    borderColor: '#F8DCDC',
    borderWidth: 1,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 42,
    paddingHorizontal: 14,
  },
  logoutText: {
    ...typography.captionMedium,
    color: color.danger,
  },
  content: {
    backgroundColor: adminPalette.canvas,
    gap: 16,
    paddingBottom: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    backgroundColor: adminPalette.surfaceRaised,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '46%',
    flexGrow: 1,
    gap: 10,
    minHeight: 86,
    minWidth: 144,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: adminPalette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  metricTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  metricValue: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 25,
    lineHeight: 30,
  },
  metricLabel: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 15,
  },
  primarySoft: {
    backgroundColor: adminPalette.trustSoft,
  },
  successSoft: {
    backgroundColor: adminPalette.successSoft,
  },
  warningSoft: {
    backgroundColor: adminPalette.warningSoft,
  },
  dangerSoft: {
    backgroundColor: adminPalette.dangerSoft,
  },
  dashboardGrid: {
    backgroundColor: adminPalette.surfaceRaised,
    borderColor: adminPalette.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 16,
    padding: 14,
  },
  queueColumn: {
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: space.xs,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  sectionIcon: {
    alignItems: 'center',
    backgroundColor: adminPalette.trustSoft,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sectionTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 25,
  },
  sectionCaption: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 15,
  },
  queueStatusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  queueStatusBadgeText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 15,
    textTransform: 'lowercase',
  },
  filterSegment: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: adminPalette.canvasSoft,
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: adminPalette.trustSoft,
    borderColor: adminPalette.lineStrong,
    borderWidth: 1,
    shadowColor: adminPalette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  filterChipText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 15,
  },
  filterChipTextActive: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
  },
  selectedBanner: {
    alignItems: 'center',
    backgroundColor: '#FBFDFF',
    borderColor: adminPalette.lineStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedBannerCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  selectedBannerIcon: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  selectedBannerTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  selectedBannerText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  neutralStatusChip: {
    backgroundColor: adminPalette.surfaceMuted,
    borderColor: adminPalette.line,
  },
  primaryStatusChip: {
    backgroundColor: adminPalette.trustSoft,
    borderColor: adminPalette.lineStrong,
  },
  successStatusChip: {
    backgroundColor: adminPalette.successSoft,
    borderColor: '#D9EED8',
  },
  warningStatusChip: {
    backgroundColor: adminPalette.warningSoft,
    borderColor: '#F5E6BC',
  },
  dangerStatusChip: {
    backgroundColor: adminPalette.dangerSoft,
    borderColor: '#F5D3D3',
  },
  statusChipText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
    textTransform: 'capitalize',
  },
  neutralStatusText: {
    color: adminPalette.muted,
  },
  primaryStatusText: {
    color: adminPalette.trustDeep,
  },
  successStatusText: {
    color: adminPalette.successDeep,
  },
  warningStatusText: {
    color: adminPalette.warningDeep,
  },
  dangerStatusText: {
    color: adminPalette.dangerDeep,
  },
  queueList: {
    gap: 8,
  },
  queueCard: {
    backgroundColor: adminPalette.surfaceRaised,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  queueCardActive: {
    backgroundColor: '#FBFDFF',
    borderColor: adminPalette.trust,
    borderWidth: 1.5,
    shadowColor: adminPalette.trustDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 2,
  },
  queueTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: adminPalette.trustSoft,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: adminPalette.trustDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  queueCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  queueName: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  queueMeta: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 17,
  },
  queuePurpose: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 19,
  },
  queueFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingTop: space['2xs'],
  },
  iconText: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  iconTextLabel: {
    color: adminPalette.faint,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 14,
  },
  emptyCard: {
    alignItems: 'flex-start',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  emptyCopy: {
    flex: 1,
    gap: space.xs,
  },
  emptyTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  workspaceEmpty: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.sm,
    padding: space.xl,
  },
  workspace: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.lg,
    padding: space.lg,
  },
  reviewSheet: {
    backgroundColor: adminPalette.surfaceRaised,
    borderColor: adminPalette.line,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    bottom: 0,
    gap: 10,
    left: 0,
    paddingHorizontal: 16,
    paddingTop: 6,
    position: 'absolute',
    right: 0,
    shadowColor: adminPalette.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 12,
  },
  reviewSheetCollapsed: {
    maxHeight: 154,
    minHeight: 140,
  },
  reviewSheetHalf: {
    maxHeight: '52%',
    minHeight: 328,
  },
  reviewSheetFull: {
    maxHeight: '94%',
    minHeight: '90%',
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingBottom: 2,
    paddingTop: 4,
  },
  sheetHandle: {
    backgroundColor: '#9AA8B8',
    borderRadius: radius.pill,
    height: 4,
    width: 50,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  sheetResident: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    minWidth: 0,
  },
  avatarSmall: {
    alignItems: 'center',
    backgroundColor: adminPalette.surfaceMuted,
    borderColor: adminPalette.line,
    borderWidth: 1,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sheetTitleCopy: {
    flex: 1,
    gap: space['2xs'],
    minWidth: 0,
  },
  sheetMetaRail: {
    alignItems: 'center',
    backgroundColor: adminPalette.surfaceMuted,
    borderRadius: radius.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  quickActions: {
    backgroundColor: adminPalette.surfaceRaised,
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    paddingTop: 12,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetHint: {
    backgroundColor: adminPalette.surfaceMuted,
    borderRadius: radius.sm,
    marginTop: 10,
    padding: 8,
  },
  sheetHintText: {
    ...typography.caption,
    color: color.textMuted,
    textAlign: 'center',
  },
  workspaceHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  workspaceTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  workspaceSubtitle: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 14,
    marginTop: space['2xs'],
  },
  reviewCard: {
    backgroundColor: adminPalette.surfaceRaised,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  reviewField: {
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reviewLabel: {
    color: adminPalette.faint,
    fontFamily: 'Satoshi-Medium',
    fontSize: 10,
    lineHeight: 13,
  },
  reviewValue: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  reviewValueMultiline: {
    minHeight: 44,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
  infoTile: {
    alignItems: 'flex-start',
    backgroundColor: adminPalette.surfaceMuted,
    borderRadius: radius.sm,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: space.xs,
    minWidth: 145,
    padding: 9,
  },
  infoCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  infoLabel: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  infoValue: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  notePanel: {
    backgroundColor: adminPalette.surfaceMuted,
    borderRadius: radius.sm,
    gap: 6,
    marginTop: space.sm,
    padding: 10,
  },
  filesPanel: {
    gap: space.sm,
    marginTop: space.sm,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 15,
  },
  files: {
    gap: space.sm,
  },
  fileButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.canvasSoft,
    borderColor: adminPalette.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.sm,
  },
  fileIcon: {
    alignItems: 'center',
    backgroundColor: adminPalette.trustSoft,
    borderRadius: radius.sm,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  fileCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  fileTitle: {
    ...typography.captionMedium,
    color: color.text,
  },
  fileUrl: {
    ...typography.caption,
    color: color.textSubtle,
  },
  decisionPanel: {
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
  },
  input: {
    backgroundColor: adminPalette.canvasSoft,
    borderColor: adminPalette.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    minHeight: 82,
    padding: space.sm,
    textAlignVertical: 'top',
  },
  previousNote: {
    ...typography.caption,
    color: color.textMuted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'flex-end',
  },
  adminAction: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 112,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  approveAction: {
    backgroundColor: adminPalette.trustDeep,
    borderColor: adminPalette.trustDeep,
  },
  rejectAction: {
    backgroundColor: adminPalette.dangerSoft,
    borderColor: '#F5D3D3',
  },
  secondaryAction: {
    backgroundColor: adminPalette.surfaceMuted,
    borderColor: adminPalette.line,
  },
  adminActionDisabled: {
    backgroundColor: adminPalette.surfaceMuted,
    borderColor: adminPalette.line,
  },
  adminActionText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 15,
  },
  body: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(17, 17, 17, 0.46)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  previewSheet: {
    backgroundColor: color.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: space.lg,
    maxHeight: '88%',
    padding: space.lg,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  previewSubtitle: {
    ...typography.caption,
    color: color.textMuted,
    marginTop: space['2xs'],
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  previewImage: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    height: 440,
    width: '100%',
  },
  previewActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'flex-end',
  },
  pressed: {
    opacity: 0.72,
  },
});
