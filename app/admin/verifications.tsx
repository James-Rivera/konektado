import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
type VerificationFilePreview = VerificationRequestDetail['files'][number];

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

export default function AdminVerificationQueueScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequestDetail[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>('pending');
  const [previewFile, setPreviewFile] = useState<VerificationFilePreview | null>(null);

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
    requests.find((request) => request.id === selectedId) ?? visibleRequests[0] ?? null;

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
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.adminIdentity}>
              <View style={styles.adminMark}>
                <MaterialIcons color={color.primary} name="admin-panel-settings" size={18} />
              </View>
              <Text style={styles.eyebrow}>Barangay admin</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Refresh dashboard"
                accessibilityRole="button"
                onPress={() => load({ silent: true })}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <MaterialIcons color={color.primary} name="refresh" size={20} />
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
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ silent: true })} />}
          showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            <MetricCard icon="pending-actions" label="Pending" tone="warning" value={stats.pending} />
            <MetricCard icon="verified" label="Approved" tone="success" value={stats.approved} />
            <MetricCard icon="rule" label="Rejected" tone="danger" value={stats.rejected} />
            <MetricCard icon="attach-file" label="Files" tone="primary" value={stats.files} />
          </View>

          <View style={styles.dashboardGrid}>
            <View style={styles.queueColumn}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Review queue</Text>
                  <Text style={styles.sectionCaption}>
                    {loading ? 'Loading requests' : `${visibleRequests.length} shown from ${requests.length} requests`}
                  </Text>
                </View>
                <Pill label={filter} tone={filter === 'pending' ? 'warning' : 'neutral'} />
              </View>

              <View style={styles.segmented}>
                <SegmentButton active={filter === 'pending'} label="Pending" onPress={() => setFilter('pending')} />
                <SegmentButton active={filter === 'reviewed'} label="Reviewed" onPress={() => setFilter('reviewed')} />
                <SegmentButton active={filter === 'all'} label="All" onPress={() => setFilter('all')} />
              </View>

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
                    onPress={() => setSelectedId(request.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.reviewColumn}>
              {selectedRequest ? (
                <ReviewWorkspace
                  note={notes[selectedRequest.id] ?? ''}
                  request={selectedRequest}
                  reviewing={reviewingId === selectedRequest.id}
                  onChangeNote={(value) =>
                    setNotes((current) => ({
                      ...current,
                      [selectedRequest.id]: value,
                    }))
                  }
                  onOpenFile={previewOrOpenFile}
                  onReview={review}
                />
              ) : (
                <View style={styles.workspaceEmpty}>
                  <MaterialIcons color={color.textSubtle} name="fact-check" size={26} />
                  <Text style={styles.emptyTitle}>Select a request</Text>
                  <Text style={styles.body}>Choose a resident from the queue to inspect their submitted details.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

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
      <View style={[styles.metricIcon, styles[`${tone}Soft`]]}>
        <MaterialIcons color={getToneColor(tone)} name={icon} size={20} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        active && styles.segmentButtonActive,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
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
      <Text numberOfLines={2} style={styles.queuePurpose}>
        {details.servicesOrPurpose || details.submittedNote || 'No submitted purpose'}
      </Text>
      <View style={styles.queueFooter}>
        <IconText icon="event" text={formatDate(request.createdAt)} />
        <IconText icon="attach-file" text={`${request.files.length} files`} />
      </View>
    </Pressable>
  );
}

function ReviewWorkspace({
  note,
  request,
  reviewing,
  onChangeNote,
  onOpenFile,
  onReview,
}: {
  note: string;
  request: VerificationRequestDetail;
  reviewing: boolean;
  onChangeNote: (value: string) => void;
  onOpenFile: (file: VerificationFilePreview) => void;
  onReview: (requestId: string, decision: 'approved' | 'rejected' | 'needs_more_info') => void;
}) {
  const details = parseSubmissionDetails(request.notes);
  const canReview = request.status === 'pending';

  return (
    <View style={styles.workspace}>
      <View style={styles.workspaceHeader}>
        <View>
          <Text style={styles.workspaceTitle}>{request.profile?.fullName ?? 'Resident'}</Text>
          <Text style={styles.workspaceSubtitle}>
            Submitted {formatDate(request.createdAt)} - {request.files.length} files
          </Text>
        </View>
        <StatusPill status={request.status} />
      </View>

      <View style={styles.reviewCard}>
        <ReviewField label="Full Name" value={fullNameFromDetails(details, request)} />
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
        <InfoTile icon="handyman" label="Purpose" value={details.servicesOrPurpose || 'Not provided'} />
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
          <PrimaryButton
            disabled={!canReview || reviewing || !note.trim()}
            label="Needs more info"
            onPress={() => onReview(request.id, 'needs_more_info')}
            variant="outline"
            compact
          />
          <PrimaryButton
            disabled={!canReview || reviewing || !note.trim()}
            label="Reject"
            onPress={() => onReview(request.id, 'rejected')}
            variant="danger"
            compact
          />
          <PrimaryButton
            disabled={!canReview || reviewing}
            icon="verified"
            label="Approve"
            loading={reviewing}
            onPress={() => onReview(request.id, 'approved')}
            compact
          />
        </View>
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
  return <Pill label={formatStatusLabel(status)} tone={tone} />;
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

function getStatusTone(status: VerificationStatus): ComponentProps<typeof Pill>['tone'] {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'needs_more_info') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

function formatStatusLabel(status: VerificationStatus) {
  if (status === 'needs_more_info') return 'Needs more info';
  return status.replace(/_/g, ' ');
}

function getToneColor(tone: 'danger' | 'primary' | 'success' | 'warning') {
  if (tone === 'danger') return color.danger;
  if (tone === 'success') return color.success;
  if (tone === 'warning') return color.warning;
  return color.primary;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.background,
    flex: 1,
  },
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  header: {
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  adminIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  adminMark: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
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
    ...typography.captionMedium,
    color: color.primary,
    textTransform: 'uppercase',
  },
  title: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: color.dangerSoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 40,
    paddingHorizontal: space.md,
  },
  logoutText: {
    ...typography.captionMedium,
    color: color.danger,
  },
  content: {
    backgroundColor: color.background,
    gap: space.lg,
    padding: space.xl,
    paddingBottom: space['3xl'],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  metricCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: space.xs,
    minWidth: 150,
    padding: space.md,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  metricValue: {
    ...typography.screenTitle,
    color: color.text,
  },
  metricLabel: {
    ...typography.caption,
    color: color.textMuted,
  },
  primarySoft: {
    backgroundColor: color.primarySoft,
  },
  successSoft: {
    backgroundColor: color.successSoft,
  },
  warningSoft: {
    backgroundColor: color.warningSoft,
  },
  dangerSoft: {
    backgroundColor: color.dangerSoft,
  },
  dashboardGrid: {
    gap: space.lg,
  },
  queueColumn: {
    gap: space.md,
  },
  reviewColumn: {
    gap: space.md,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  sectionCaption: {
    ...typography.caption,
    color: color.textMuted,
  },
  segmented: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.xs,
    padding: space.xs,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  segmentButtonActive: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderWidth: 1,
  },
  segmentText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  segmentTextActive: {
    color: color.text,
  },
  queueList: {
    gap: space.md,
  },
  queueCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.md,
    padding: space.md,
  },
  queueCardActive: {
    borderColor: color.primary,
    borderWidth: 1.5,
  },
  queueTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  queueCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  queueName: {
    ...typography.bodyMedium,
    color: color.text,
  },
  queueMeta: {
    ...typography.caption,
    color: color.textMuted,
  },
  queuePurpose: {
    ...typography.body,
    color: color.textMuted,
  },
  queueFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  iconText: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  iconTextLabel: {
    ...typography.caption,
    color: color.textSubtle,
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
  workspaceHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  workspaceTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  workspaceSubtitle: {
    ...typography.caption,
    color: color.textMuted,
    marginTop: space['2xs'],
  },
  reviewCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  reviewField: {
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    gap: space['2xs'],
    padding: space.sm,
  },
  reviewLabel: {
    color: '#AFAFAF',
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 12,
  },
  reviewValue: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  reviewValueMultiline: {
    minHeight: 56,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  infoTile: {
    alignItems: 'flex-start',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.sm,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: space.sm,
    minWidth: 145,
    padding: space.md,
  },
  infoCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  infoLabel: {
    ...typography.captionMedium,
    color: color.textSubtle,
  },
  infoValue: {
    ...typography.caption,
    color: color.text,
  },
  notePanel: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.sm,
    gap: space.sm,
    padding: space.md,
  },
  filesPanel: {
    gap: space.sm,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...typography.captionMedium,
    color: color.text,
  },
  files: {
    gap: space.sm,
  },
  fileButton: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
  },
  fileIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
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
    borderTopColor: color.border,
    borderTopWidth: 1,
    gap: space.md,
    paddingTop: space.lg,
  },
  input: {
    ...typography.body,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: color.text,
    minHeight: 92,
    padding: space.md,
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
  body: {
    ...typography.body,
    color: color.textMuted,
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
