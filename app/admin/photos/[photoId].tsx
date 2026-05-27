import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AdminEmptyState,
  AdminErrorState,
  AdminInfoRow,
  AdminListCard,
  AdminLoadingState,
  AdminPanel,
  AdminPrivacyNotice,
  AdminScreenShell,
  AdminStatusBadge,
  adminPalette,
  type AdminTone,
} from '@/components/admin/AdminShell';
import { useFeedback } from '@/components/FeedbackProvider';
import { color, radius, space, typography } from '@/constants/theme';
import {
  clearPhoto,
  flagPhoto,
  getPublicPhotoDetail,
  hidePhoto,
  type AdminPhotoDetail,
  type AdminPhotoModerationStatus,
  type AdminPhotoSource,
  type AdminPublicPhotoItem,
} from '@/services/admin-photo.service';

type ReviewMode = 'clear' | 'flag' | 'hide';

const REASONS = [
  'Contains ID or private document',
  'Contains private information',
  'Inappropriate image',
  'Blurry or unclear',
  'Misleading photo',
  'Not relevant to the profile/listing/service',
  'Other',
];

export default function AdminPhotoReviewScreen() {
  const router = useRouter();
  const { showSuccessToast } = useFeedback();
  const params = useLocalSearchParams<{ fromUserId?: string | string[]; photoId?: string | string[] }>();
  const photoId = Array.isArray(params.photoId) ? params.photoId[0] : params.photoId;
  const fromUserId = Array.isArray(params.fromUserId) ? params.fromUserId[0] : params.fromUserId;
  const [photo, setPhoto] = useState<AdminPhotoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ReviewMode | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!photoId) {
      setErrorMessage('Choose a photo to review.');
      setLoading(false);
      return;
    }

    setErrorMessage(null);
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await getPublicPhotoDetail(photoId);
    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load this photo.');
    } else {
      setPhoto(result.data);
    }

    setLoading(false);
    setRefreshing(false);
  }, [photoId]);

  useEffect(() => {
    load();
  }, [load]);

  const sourceAction = useMemo(() => (photo ? actionForPhoto(photo) : null), [photo]);

  const openModal = (mode: ReviewMode) => {
    setModalMode(mode);
    setSelectedReason('');
    setNote('');
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
  };

  const submitReview = async () => {
    if (!photo || !modalMode || saving) return;

    const needsReason = modalMode === 'flag' || modalMode === 'hide';
    if (needsReason && !selectedReason) return;

    setSaving(true);
    const result =
      modalMode === 'clear'
        ? await clearPhoto(photo, note)
        : modalMode === 'flag'
          ? await flagPhoto(photo, selectedReason, note)
          : await hidePhoto(photo, selectedReason, note);
    setSaving(false);

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not save this review.');
      return;
    }

    setPhoto(result.data);
    setModalMode(null);
    showSuccessToast(
      modalMode === 'clear'
        ? 'Photo cleared'
        : modalMode === 'flag'
          ? 'Photo flagged'
          : 'Photo hidden',
    );
  };

  return (
    <AdminScreenShell
      activeSection="users"
      loading={loading}
      onRefresh={() => load({ silent: true })}
      refreshing={refreshing}
      subtitle="Public-facing image"
      title="Photo Review">
      <AdminPanel>
        <View style={styles.backRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (fromUserId) {
                router.replace({
                  pathname: '/admin/users/[userId]',
                  params: { userId: fromUserId },
                });
                return;
              }

              router.replace('/admin/users');
            }}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <MaterialIcons color={adminPalette.ink} name="arrow-back" size={20} />
            <Text style={styles.backText}>{fromUserId ? 'User Review' : 'Users'}</Text>
          </Pressable>
        </View>

        {loading ? (
          <AdminLoadingState label="Loading photo review..." />
        ) : errorMessage && !photo ? (
          <AdminErrorState message={errorMessage} onRetry={() => load()} />
        ) : photo ? (
          <View style={styles.detailStack}>
            {errorMessage ? (
              <AdminPrivacyNotice icon="error-outline">{errorMessage}</AdminPrivacyNotice>
            ) : null}

            <View style={styles.imageFrame}>
              <Image resizeMode="contain" source={{ uri: photo.imageUrl }} style={styles.imagePreview} />
            </View>

            <View style={styles.summaryHeader}>
              <View style={styles.summaryCopy}>
                <Text style={styles.sourceType}>{sourceLabel(photo.source)}</Text>
                <Text numberOfLines={2} style={styles.photoTitle}>{photo.title}</Text>
                <Text style={styles.photoSubtitle}>{photo.ownerName ?? photo.subtitle}</Text>
              </View>
              <AdminStatusBadge
                label={formatModerationStatus(photo.moderationStatus)}
                tone={toneForModeration(photo.moderationStatus)}
              />
            </View>

            <View style={styles.infoBlock}>
              <AdminInfoRow icon="category" label="Source type" value={sourceLabel(photo.source)} />
              <AdminInfoRow icon="person" label="Owner" value={photo.ownerName ?? 'Unknown resident'} />
              <AdminInfoRow icon="place" label="Location" value={photo.location ?? 'Location unavailable'} />
              <AdminInfoRow icon="visibility" label="Public visibility" value={photo.visibility === 'hidden' ? 'Hidden' : 'Visible'} />
              <AdminInfoRow icon="event" label="Last reviewed" value={photo.latestActionAt ? formatDate(photo.latestActionAt) : 'Not reviewed yet'} />
            </View>

            <AdminPrivacyNotice icon="security">
              Photos should not show IDs, certificates, screenshots, or private information.
            </AdminPrivacyNotice>

            <View style={styles.actionBlock}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openModal('clear')}
                style={({ pressed }) => [styles.actionButton, styles.clearButton, pressed && styles.pressed]}>
                <MaterialIcons color={adminPalette.successDeep} name="task-alt" size={18} />
                <Text style={[styles.actionText, styles.clearText]}>Clear</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => openModal('flag')}
                style={({ pressed }) => [styles.actionButton, styles.flagButton, pressed && styles.pressed]}>
                <MaterialIcons color={adminPalette.ink} name="flag" size={18} />
                <Text style={styles.flagText}>Flag</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => openModal('hide')}
                style={({ pressed }) => [styles.actionButton, styles.hideButton, pressed && styles.pressed]}>
                <MaterialIcons color={adminPalette.dangerDeep} name="visibility-off" size={18} />
                <Text style={[styles.actionText, styles.hideText]}>Hide photo</Text>
              </Pressable>
            </View>

            <AdminListCard style={styles.embeddedCard}>
              <View style={styles.inlineCopy}>
                <Text style={styles.inlineTitle}>Source link</Text>
                <Text style={styles.inlineMeta}>Open the public source without loading private verification files.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !sourceAction?.route }}
                disabled={!sourceAction?.route}
                onPress={() => {
                  if (sourceAction?.route) router.push(sourceAction.route as never);
                }}
                style={({ pressed }) => [
                  styles.sourceButton,
                  !sourceAction?.route && styles.disabledButton,
                  pressed && sourceAction?.route && styles.pressed,
                ]}>
                <MaterialIcons
                  color={sourceAction?.route ? adminPalette.blue : adminPalette.faint}
                  name="open-in-new"
                  size={18}
                />
                <Text style={[styles.sourceButtonText, !sourceAction?.route && styles.disabledText]}>
                  {sourceAction?.label ?? 'Source unavailable'}
                </Text>
              </Pressable>
            </AdminListCard>

            <View style={styles.disabledNotice}>
              <MaterialIcons color={adminPalette.faint} name="lock-outline" size={22} />
              <Text style={styles.disabledNoticeText}>
                User restriction requires a separate enforcement design.
              </Text>
            </View>
          </View>
        ) : (
          <AdminEmptyState
            description="Choose a public-facing photo from the Photos audit list."
            icon="image-search"
            title="No photo selected"
          />
        )}
      </AdminPanel>

      <ReviewModal
        mode={modalMode}
        note={note}
        onChangeNote={setNote}
        onClose={closeModal}
        onSelectReason={setSelectedReason}
        onSubmit={submitReview}
        saving={saving}
        selectedReason={selectedReason}
      />
    </AdminScreenShell>
  );
}

function ReviewModal({
  mode,
  note,
  onChangeNote,
  onClose,
  onSelectReason,
  onSubmit,
  saving,
  selectedReason,
}: {
  mode: ReviewMode | null;
  note: string;
  onChangeNote: (value: string) => void;
  onClose: () => void;
  onSelectReason: (value: string) => void;
  onSubmit: () => void;
  saving: boolean;
  selectedReason: string;
}) {
  const needsReason = mode === 'flag' || mode === 'hide';
  const title = mode === 'clear' ? 'Clear this photo?' : mode === 'flag' ? 'Flag this photo' : 'Hide this photo?';
  const body =
    mode === 'clear'
      ? 'This records a clear review and makes the image visible in public UI.'
      : mode === 'flag'
        ? 'This records a flagged review. The photo stays visible unless it is hidden.'
        : 'This records a hide action and removes the image from public app screens.';
  const submitLabel = mode === 'clear' ? 'Clear photo' : mode === 'flag' ? 'Flag photo' : 'Hide photo';
  const canSubmit = Boolean(mode && (!needsReason || selectedReason));

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(mode)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalBody}>{body}</Text>

          {needsReason ? (
            <View style={styles.reasonList}>
              {REASONS.map((reason) => {
                const selected = selectedReason === reason;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={reason}
                    onPress={() => onSelectReason(reason)}
                    style={({ pressed }) => [
                      styles.reasonOption,
                      selected && styles.reasonOptionSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{reason}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <TextInput
            multiline
            onChangeText={onChangeNote}
            placeholder="Optional note"
            placeholderTextColor={adminPalette.faint}
            style={styles.noteInput}
            value={note}
          />

          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onClose}
              style={({ pressed }) => [styles.modalCancel, pressed && !saving && styles.pressed]}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit || saving}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.modalSubmit,
                mode === 'hide' && styles.modalSubmitDanger,
                (!canSubmit || saving) && styles.disabledButton,
                pressed && canSubmit && !saving && styles.pressed,
              ]}>
              <Text style={[styles.modalSubmitText, (!canSubmit || saving) && styles.disabledText]}>
                {saving ? 'Saving...' : submitLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function actionForPhoto(photo: AdminPublicPhotoItem) {
  if (photo.source === 'job') {
    return {
      label: 'Open listing',
      route: { pathname: '/job/[jobId]', params: { adminView: '1', jobId: photo.sourceId } },
    };
  }

  if (photo.source === 'service') {
    return {
      label: 'Open service',
      route: { pathname: '/services/[serviceId]', params: { adminView: '1', serviceId: photo.sourceId } },
    };
  }

  if (photo.profileRouteKind === 'client') {
    return {
      label: 'Open profile',
      route: { pathname: '/client/[clientId]', params: { adminView: '1', clientId: photo.ownerId } },
    };
  }

  if (photo.profileRouteKind === 'worker') {
    return {
      label: 'Open profile',
      route: { pathname: '/worker/[workerId]', params: { adminView: '1', workerId: photo.ownerId } },
    };
  }

  return { label: 'Source unavailable', route: null };
}

function sourceLabel(source: AdminPhotoSource) {
  if (source === 'profile') return 'Profile photo';
  if (source === 'job') return 'Job photo';
  return 'Service photo';
}

function formatModerationStatus(status: AdminPhotoModerationStatus) {
  if (status === 'flagged') return 'Flagged';
  if (status === 'hidden') return 'Hidden';
  if (status === 'cleared') return 'Cleared';
  return 'Visible';
}

function toneForModeration(status: AdminPhotoModerationStatus): AdminTone {
  if (status === 'hidden') return 'danger';
  if (status === 'flagged') return 'warning';
  if (status === 'cleared') return 'success';
  return 'neutral';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

const styles = StyleSheet.create({
  backRow: {
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 36,
    paddingHorizontal: space.sm,
  },
  backText: {
    ...typography.captionMedium,
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
  },
  detailStack: {
    gap: 14,
    padding: 16,
  },
  imageFrame: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imagePreview: {
    height: 300,
    width: '100%',
  },
  summaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sourceType: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  photoTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  photoSubtitle: {
    ...typography.caption,
    color: adminPalette.muted,
  },
  infoBlock: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  actionBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: space.lg,
  },
  clearButton: {
    backgroundColor: adminPalette.successSoft,
    borderColor: '#D9EED8',
  },
  flagButton: {
    backgroundColor: adminPalette.orangeSoft,
    borderColor: adminPalette.orange,
  },
  hideButton: {
    backgroundColor: adminPalette.dangerSoft,
    borderColor: '#F5D3D3',
  },
  actionText: {
    ...typography.captionMedium,
    fontFamily: 'Satoshi-Bold',
  },
  clearText: {
    color: adminPalette.successDeep,
  },
  flagText: {
    ...typography.captionMedium,
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
  },
  hideText: {
    color: adminPalette.dangerDeep,
  },
  embeddedCard: {
    borderRadius: radius.md,
    borderWidth: 1,
  },
  inlineCopy: {
    gap: 2,
  },
  inlineTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 19,
  },
  inlineMeta: {
    ...typography.caption,
    color: adminPalette.muted,
  },
  sourceButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 38,
    paddingHorizontal: space.md,
  },
  sourceButtonText: {
    ...typography.captionMedium,
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  disabledNotice: {
    alignItems: 'flex-start',
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: 14,
  },
  disabledNoticeText: {
    ...typography.body,
    color: adminPalette.muted,
    flex: 1,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.44)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: color.white,
    borderRadius: radius.lg,
    gap: space.md,
    maxWidth: 440,
    padding: 18,
    width: '100%',
  },
  modalTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  modalBody: {
    ...typography.body,
    color: adminPalette.muted,
  },
  reasonList: {
    gap: space.xs,
  },
  reasonOption: {
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  reasonOptionSelected: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
  },
  reasonText: {
    ...typography.captionMedium,
    color: adminPalette.ink,
  },
  reasonTextSelected: {
    color: adminPalette.blueDeep,
    fontFamily: 'Satoshi-Bold',
  },
  noteInput: {
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    minHeight: 74,
    padding: space.md,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'flex-end',
  },
  modalCancel: {
    alignItems: 'center',
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: space.lg,
  },
  modalCancelText: {
    ...typography.captionMedium,
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
  },
  modalSubmit: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: space.lg,
  },
  modalSubmitDanger: {
    backgroundColor: adminPalette.dangerDeep,
  },
  modalSubmitText: {
    ...typography.captionMedium,
    color: color.white,
    fontFamily: 'Satoshi-Bold',
  },
  disabledButton: {
    opacity: 0.58,
  },
  disabledText: {
    color: adminPalette.faint,
  },
  pressed: {
    opacity: 0.72,
  },
});
