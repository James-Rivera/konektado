import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AdminPrivacyNotice,
  AdminStatusBadge,
  AdminTopHeader,
  adminPalette,
  type AdminTone,
} from '@/components/admin/AdminShell';
import { color, radius, space, typography } from '@/constants/theme';
import {
  getVerificationRequest,
  reviewVerificationRequest,
  type VerificationRequestDetail,
} from '@/services/admin.service';
import type { VerificationStatus } from '@/types/verification.types';
import { supabase } from '@/utils/supabase';
import {
  NEEDS_CORRECTION_REASONS,
  NAME_MISMATCH_REASON,
  type NeedsCorrectionReason,
} from '@/utils/verified-name-policy';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type VerificationFile = VerificationRequestDetail['files'][number];

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

export default function AdminVerificationReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const [request, setRequest] = useState<VerificationRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionModal, setDecisionModal] = useState<'needs_more_info' | 'rejected' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [correctionReason, setCorrectionReason] = useState<NeedsCorrectionReason>(NAME_MISMATCH_REASON);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!requestId) {
      setErrorMessage('Choose a verification request to review.');
      setLoading(false);
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    const result = await getVerificationRequest(requestId);

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load this verification request.');
    } else {
      setRequest(result.data);
    }

    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const details = useMemo(() => parseSubmissionDetails(request?.notes ?? null), [request?.notes]);
  const residentName = request ? fullNameFromDetails(details, request) || 'Konektado resident' : 'Review resident request';
  const canReview = request?.status === 'pending';
  const selectedFile = viewerIndex === null ? null : request?.files[viewerIndex] ?? null;

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

  const goBack = () => {
    router.replace('/admin/verifications');
  };

  const approve = () => {
    if (!request || !canReview) return;

    Alert.alert(
      'Approve verification?',
      'This will mark the resident as Barangay Verified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => submitDecision('approved'),
        },
      ],
    );
  };

  const submitReviewNote = () => {
    if (!decisionModal) return;

    if (decisionModal === 'rejected' && !decisionNote.trim()) {
      Alert.alert('Rejection reason required', 'Provide a reason so the resident knows what to fix.');
      return;
    }

    submitDecision(
      decisionModal,
      decisionModal === 'needs_more_info' ? decisionNote.trim() : decisionNote.trim(),
      decisionModal === 'needs_more_info' ? correctionReason : undefined,
    );
  };

  const submitDecision = async (
    decision: 'approved' | 'rejected' | 'needs_more_info',
    note?: string,
    reason?: NeedsCorrectionReason,
  ) => {
    if (!request || submittingDecision) return;

    setSubmittingDecision(true);
    const result = await reviewVerificationRequest({
      requestId: request.id,
      decision,
      note,
      reason,
    });
    setSubmittingDecision(false);

    if (result.error || !result.data) {
      Alert.alert('Review request', result.error ?? 'Could not save this review.');
      return;
    }

    setRequest(result.data);
    setDecisionModal(null);
    setDecisionNote('');
    setCorrectionReason(NAME_MISMATCH_REASON);
    Alert.alert(
      decision === 'approved'
        ? 'Verification approved'
        : decision === 'needs_more_info'
          ? 'Correction requested'
          : 'Verification rejected',
      decision === 'approved'
        ? 'The resident is now Barangay Verified.'
        : decision === 'needs_more_info'
          ? 'The resident will see the correction reason and can resubmit.'
          : 'The resident will see the rejection reason.',
      [{ text: 'Done', onPress: goBack }],
    );
  };

  const openSecurely = async (file: VerificationFile | null) => {
    if (!file?.url) {
      Alert.alert('Open file', 'A secure file link could not be prepared.');
      return;
    }

    try {
      await Linking.openURL(file.url);
    } catch {
      Alert.alert('Open file', 'Could not open this uploaded file.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <AdminTopHeader onLogout={signOut} />

        <View style={styles.reviewHeader}>
          <Pressable
            accessibilityLabel="Back to verifications"
            accessibilityRole="button"
            onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <MaterialIcons color={adminPalette.ink} name="arrow-back" size={22} />
          </Pressable>
          <View style={styles.reviewHeaderCopy}>
            <Text style={styles.reviewTitle}>Verification Review</Text>
            <Text numberOfLines={1} style={styles.reviewSubtitle}>{residentName}</Text>
          </View>
          {request ? <AdminStatusBadge label={formatStatusLabel(request.status)} tone={toneForStatus(request.status)} /> : null}
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <Text style={styles.centerTitle}>Preparing secure review</Text>
            <Text style={styles.centerText}>Loading resident details and private document links...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerState}>
            <MaterialIcons color={color.danger} name="error-outline" size={34} />
            <Text style={styles.centerTitle}>Could not load review</Text>
            <Text style={styles.centerText}>{errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={load}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : request ? (
          <>
            <ScrollView
              contentContainerStyle={[
                styles.content,
                { paddingBottom: 110 + Math.max(insets.bottom, 12) },
              ]}
              showsVerticalScrollIndicator={false}>
              <ResidentSummary request={request} details={details} />

              <Section title="Resident information">
                <InfoRow label="Full name" value={residentName} />
                <InfoRow label="Address" value={formatAddress(details, request)} multiline />
                <InfoRow label="Birthdate" value={details.birthdate ?? 'Not provided'} />
                <InfoRow label="Phone" value={details.contactPhone ?? 'Not provided'} />
                <InfoRow label="Email" value={details.contactEmail ?? 'Not provided'} />
                <InfoRow label="Document type" value={formatFileType(details.idType ?? 'not provided')} />
                <InfoRow label="Services/profile role" value={formatServicePreview(details.servicesOrPurpose ?? '') || 'Not provided'} />
              </Section>

              {details.submittedNote ? (
                <Section title="Resident note">
                  <Text style={styles.body}>{details.submittedNote}</Text>
                </Section>
              ) : null}

              <Section title="Private documents">
                <AdminPrivacyNotice>
                  These documents are private and visible only to authorized barangay admins.
                </AdminPrivacyNotice>
                {request.files.length ? (
                  <View style={styles.filesList}>
                    {request.files.map((file, index) => (
                      <DocumentRow
                        file={file}
                        index={index}
                        key={file.id}
                        total={request.files.length}
                        onOpen={() => setViewerIndex(index)}
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.body}>No uploaded files are attached to this request.</Text>
                )}
              </Section>
            </ScrollView>

            {canReview ? (
              <View style={[styles.stickyActions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submittingDecision }}
                  disabled={submittingDecision}
                  onPress={() => setDecisionModal('rejected')}
                  style={({ pressed }) => [
                    styles.rejectButton,
                    submittingDecision && styles.disabled,
                    pressed && !submittingDecision && styles.pressed,
                  ]}>
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submittingDecision }}
                  disabled={submittingDecision}
                  onPress={() => setDecisionModal('needs_more_info')}
                  style={({ pressed }) => [
                    styles.correctionButton,
                    submittingDecision && styles.disabled,
                    pressed && !submittingDecision && styles.pressed,
                  ]}>
                  <Text style={styles.correctionButtonText}>Needs Correction</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submittingDecision }}
                  disabled={submittingDecision}
                  onPress={approve}
                  style={({ pressed }) => [
                    styles.approveButton,
                    submittingDecision && styles.disabled,
                    pressed && !submittingDecision && styles.pressed,
                  ]}>
                  <Text style={styles.approveButtonText}>
                    {submittingDecision ? 'Saving...' : 'Approve'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}

        <DocumentViewerModal
          file={selectedFile}
          index={viewerIndex ?? 0}
          total={request?.files.length ?? 0}
          onClose={() => setViewerIndex(null)}
          onNext={() => setViewerIndex((current) => nextDocumentIndex(current, request?.files.length ?? 0))}
          onOpenSecurely={() => openSecurely(selectedFile)}
          onPrevious={() => setViewerIndex((current) => previousDocumentIndex(current, request?.files.length ?? 0))}
        />

        <ReviewDecisionModal
          correctionReason={correctionReason}
          decision={decisionModal}
          loading={submittingDecision}
          note={decisionNote}
          onCancel={() => setDecisionModal(null)}
          onChangeNote={setDecisionNote}
          onChangeReason={setCorrectionReason}
          onSubmit={submitReviewNote}
          visible={Boolean(decisionModal)}
        />
      </View>
    </SafeAreaView>
  );
}

function ResidentSummary({
  details,
  request,
}: {
  details: SubmissionDetails;
  request: VerificationRequestDetail;
}) {
  const name = fullNameFromDetails(details, request) || 'Konektado resident';
  const location = [request.profile?.barangay, request.profile?.city].filter(Boolean).join(', ') || details.city || 'Location not provided';

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <ResidentAvatar avatarUrl={request.profile?.avatarUrl ?? null} name={name} />
        <View style={styles.summaryCopy}>
          <Text numberOfLines={2} style={styles.summaryName}>{name}</Text>
          <View style={styles.inlineMeta}>
            <MaterialIcons color={adminPalette.faint} name="place" size={16} />
            <Text numberOfLines={2} style={styles.summaryLocation}>{location}</Text>
          </View>
        </View>
        <AdminStatusBadge label={formatStatusLabel(request.status)} tone={toneForStatus(request.status)} />
      </View>
      <View style={styles.summaryMeta}>
        <SummaryMeta icon="event" label="Submitted" value={formatDate(request.createdAt)} />
        <SummaryMeta icon="folder" label="Files" value={`${request.files.length} uploaded`} />
      </View>
    </View>
  );
}

function ResidentAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarText}>{getInitials(name) || 'KR'}</Text>
    </View>
  );
}

function SummaryMeta({
  icon,
  label,
  value,
}: {
  icon: MaterialIconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryMetaItem}>
      <MaterialIcons color={adminPalette.blue} name={icon} size={18} />
      <View style={styles.summaryMetaCopy}>
        <Text style={styles.summaryMetaLabel}>{label}</Text>
        <Text style={styles.summaryMetaValue}>{value}</Text>
      </View>
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  multiline,
  value,
}: {
  label: string;
  multiline?: boolean;
  value: string;
}) {
  return (
    <View style={[styles.infoRow, multiline && styles.infoRowMultiline]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, multiline && styles.infoValueMultiline]}>{value || 'Not provided'}</Text>
    </View>
  );
}

function DocumentRow({
  file,
  index,
  onOpen,
  total,
}: {
  file: VerificationFile;
  index: number;
  onOpen: () => void;
  total: number;
}) {
  return (
    <View style={styles.documentRow}>
      <View style={styles.documentIcon}>
        <MaterialIcons color={adminPalette.blue} name={isImageFile(file) ? 'image' : 'insert-drive-file'} size={22} />
      </View>
      <View style={styles.documentCopy}>
        <Text style={styles.documentTitle}>{formatFileType(file.fileType)}</Text>
        <Text numberOfLines={1} style={styles.documentMeta}>
          Document {index + 1} of {total}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.viewFileButton, pressed && styles.pressed]}>
        <Text style={styles.viewFileText}>{isImageFile(file) ? 'View' : 'Open'}</Text>
      </Pressable>
    </View>
  );
}

function DocumentViewerModal({
  file,
  index,
  onClose,
  onNext,
  onOpenSecurely,
  onPrevious,
  total,
}: {
  file: VerificationFile | null;
  index: number;
  onClose: () => void;
  onNext: () => void;
  onOpenSecurely: () => void;
  onPrevious: () => void;
  total: number;
}) {
  const imagePreview = file ? isImageFile(file) : false;

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={Boolean(file)}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.viewerScreen}>
        <View style={styles.viewerHeader}>
          <View>
            <Text style={styles.viewerTitle}>{file ? formatFileType(file.fileType) : 'Verification document'}</Text>
            <Text style={styles.viewerSubtitle}>Document {index + 1} of {total}</Text>
          </View>
          <Pressable
            accessibilityLabel="Close document viewer"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.viewerCloseButton, pressed && styles.pressed]}>
            <MaterialIcons color={color.white} name="close" size={24} />
          </Pressable>
        </View>

        <View style={styles.viewerBody}>
          {file && imagePreview ? (
            <Image resizeMode="contain" source={{ uri: file.url }} style={styles.viewerImage} />
          ) : (
            <View style={styles.unpreviewableCard}>
              <MaterialIcons color={adminPalette.blue} name="insert-drive-file" size={44} />
              <Text style={styles.unpreviewableTitle}>Preview unavailable</Text>
              <Text style={styles.unpreviewableText}>Open this file securely using the signed admin link.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onOpenSecurely}
                style={({ pressed }) => [styles.openSecureButton, pressed && styles.pressed]}>
                <Text style={styles.openSecureButtonText}>Open securely</Text>
              </Pressable>
            </View>
          )}
        </View>

        {total > 1 ? (
          <View style={styles.viewerNav}>
            <Pressable accessibilityRole="button" onPress={onPrevious} style={styles.viewerNavButton}>
              <MaterialIcons color={color.white} name="chevron-left" size={22} />
              <Text style={styles.viewerNavText}>Previous</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onNext} style={styles.viewerNavButton}>
              <Text style={styles.viewerNavText}>Next</Text>
              <MaterialIcons color={color.white} name="chevron-right" size={22} />
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function ReviewDecisionModal({
  correctionReason,
  decision,
  loading,
  onCancel,
  onChangeNote,
  onChangeReason,
  onSubmit,
  note,
  visible,
}: {
  correctionReason: NeedsCorrectionReason;
  decision: 'needs_more_info' | 'rejected' | null;
  loading: boolean;
  onCancel: () => void;
  onChangeNote: (value: string) => void;
  onChangeReason: (value: NeedsCorrectionReason) => void;
  onSubmit: () => void;
  note: string;
  visible: boolean;
}) {
  const needsCorrection = decision === 'needs_more_info';
  const submitDisabled = loading || (!needsCorrection && !note.trim());

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.rejectBackdrop}>
        <View style={styles.rejectDialog}>
          <Text style={styles.rejectTitle}>{needsCorrection ? 'Return for correction?' : 'Reject verification?'}</Text>
          <Text style={styles.rejectBody}>
            {needsCorrection
              ? 'Use Needs Correction for likely honest mistakes, typos, nicknames, missing legal name parts, unreadable files, or fixable document issues.'
              : 'Use Rejected only for suspicious, fake, invalid, or completely unrelated identity documents.'}
          </Text>
          {needsCorrection ? (
            <View style={styles.correctionReasonList}>
              {NEEDS_CORRECTION_REASONS.map((reason) => {
                const selected = reason === correctionReason;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={loading}
                    key={reason}
                    onPress={() => onChangeReason(reason)}
                    style={({ pressed }) => [
                      styles.correctionReasonChip,
                      selected && styles.correctionReasonChipSelected,
                      pressed && !loading && styles.pressed,
                    ]}>
                    <Text style={[styles.correctionReasonText, selected && styles.correctionReasonTextSelected]}>
                      {reason}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <TextInput
            editable={!loading}
            multiline
            onChangeText={onChangeNote}
            placeholder={needsCorrection ? 'Optional details for the resident' : 'Rejection reason'}
            placeholderTextColor={color.textSubtle}
            style={styles.rejectInput}
            textAlignVertical="top"
            value={note}
          />
          <View style={styles.rejectActions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelRejectButton, pressed && !loading && styles.pressed]}>
              <Text style={styles.cancelRejectText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: submitDisabled }}
              disabled={submitDisabled}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.confirmRejectButton,
                needsCorrection && styles.confirmCorrectionButton,
                submitDisabled && styles.disabled,
                pressed && !submitDisabled && styles.pressed,
              ]}>
              <Text style={styles.confirmRejectText}>
                {loading ? 'Saving...' : needsCorrection ? 'Return for Correction' : 'Reject'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function nextDocumentIndex(current: number | null, total: number) {
  if (!total) return null;
  return current === null ? 0 : (current + 1) % total;
}

function previousDocumentIndex(current: number | null, total: number) {
  if (!total) return null;
  return current === null ? 0 : (current - 1 + total) % total;
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
  return [details.firstName, details.lastName].filter(Boolean).join(' ') || request.profile?.fullName || '';
}

function formatAddress(details: SubmissionDetails, request: VerificationRequestDetail) {
  const values = [
    details.streetAddress,
    request.profile?.barangay,
    request.profile?.city ?? details.city,
  ].filter(Boolean);

  return values.length ? values.join('\n') : 'Not provided';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

  const shown = services.slice(0, 4).join(', ');
  const hiddenCount = services.length - 4;

  return hiddenCount > 0 ? `${shown} +${hiddenCount}` : shown;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function isImageFile(file: VerificationFile) {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(file.filePath ?? file.url);
}

function toneForStatus(status: VerificationStatus): AdminTone {
  if (status === 'approved') return 'success';
  if (status === 'pending' || status === 'needs_more_info') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

function formatStatusLabel(status: VerificationStatus) {
  if (status === 'needs_more_info') return 'Needs Correction';
  return status.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: adminPalette.blue,
    flex: 1,
  },
  screen: {
    backgroundColor: color.white,
    flex: 1,
  },
  reviewHeader: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  reviewHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  reviewTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  reviewSubtitle: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: space.sm,
    justifyContent: 'center',
    padding: 28,
  },
  centerTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  centerText: {
    ...typography.body,
    color: adminPalette.muted,
    textAlign: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  secondaryButtonText: {
    ...typography.captionMedium,
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  summaryCard: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  summaryTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  avatarImage: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    width: 48,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: adminPalette.blueDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  summaryCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  summaryName: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  inlineMeta: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 4,
  },
  summaryLocation: {
    color: adminPalette.muted,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  summaryMeta: {
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  summaryMetaItem: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  summaryMetaCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryMetaLabel: {
    color: adminPalette.faint,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  summaryMetaValue: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  sectionBody: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    borderBottomColor: adminPalette.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 3,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  infoRowMultiline: {
    minHeight: 72,
  },
  infoLabel: {
    color: adminPalette.faint,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  infoValue: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  infoValueMultiline: {
    minHeight: 42,
  },
  body: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 19,
    padding: 14,
  },
  filesList: {
    gap: 0,
  },
  documentRow: {
    alignItems: 'center',
    borderTopColor: adminPalette.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  documentIcon: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderRadius: radius.sm,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  documentCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  documentTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 19,
  },
  documentMeta: {
    ...typography.caption,
    color: adminPalette.faint,
  },
  viewFileButton: {
    alignItems: 'center',
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  viewFileText: {
    ...typography.captionMedium,
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  stickyActions: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    left: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
  },
  rejectButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.dangerSoft,
    borderColor: '#F5D3D3',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  rejectButtonText: {
    color: adminPalette.dangerDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  correctionButton: {
    alignItems: 'center',
    backgroundColor: color.warningSoft,
    borderColor: 'rgba(183, 121, 31, 0.35)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  correctionButtonText: {
    color: color.warning,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  approveButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderRadius: radius.pill,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  approveButtonText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  viewerScreen: {
    backgroundColor: '#111111',
    flex: 1,
  },
  viewerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  viewerTitle: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  viewerSubtitle: {
    color: '#C8D1DC',
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  viewerCloseButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  viewerBody: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  viewerImage: {
    height: '100%',
    width: '100%',
  },
  unpreviewableCard: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderRadius: radius.lg,
    gap: 10,
    padding: 24,
    width: '100%',
  },
  unpreviewableTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  unpreviewableText: {
    ...typography.body,
    color: adminPalette.muted,
    textAlign: 'center',
  },
  openSecureButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderRadius: radius.pill,
    minHeight: 42,
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 18,
  },
  openSecureButtonText: {
    ...typography.button,
    color: color.white,
  },
  viewerNav: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  viewerNavButton: {
    alignItems: 'center',
    borderColor: '#46576C',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 42,
  },
  viewerNavText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  rejectBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 17, 17, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  rejectDialog: {
    backgroundColor: color.white,
    borderRadius: radius.lg,
    gap: 12,
    padding: 18,
    width: '100%',
  },
  rejectTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  rejectBody: {
    ...typography.body,
    color: adminPalette.muted,
  },
  correctionReasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  correctionReasonChip: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  correctionReasonChipSelected: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
  },
  correctionReasonText: {
    ...typography.captionMedium,
    color: adminPalette.muted,
  },
  correctionReasonTextSelected: {
    color: adminPalette.blueDeep,
    fontFamily: 'Satoshi-Bold',
  },
  rejectInput: {
    ...typography.body,
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: color.text,
    minHeight: 110,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  rejectActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  cancelRejectButton: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  cancelRejectText: {
    ...typography.button,
    color: adminPalette.muted,
  },
  confirmRejectButton: {
    alignItems: 'center',
    backgroundColor: color.danger,
    borderRadius: radius.pill,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  confirmCorrectionButton: {
    backgroundColor: adminPalette.blue,
  },
  confirmRejectText: {
    ...typography.button,
    color: color.white,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.56,
  },
});
