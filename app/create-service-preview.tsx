import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { NoticeBanner } from '@/components/NoticeBanner';
import { restartListingEdit } from '@/services/listing-edit.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import { PostingReviewDetails } from '@/components/PostingReviewDetails';
import { serviceDraftToReview } from '@/services/posting-review';
import { publishServiceDraft } from '@/services/posting-publish.service';
import { CachedRemoteImage } from '@/components/CachedRemoteImage';
import { Skeleton } from '@/components/Skeleton';
import { useFeedback } from '@/components/FeedbackProvider';
import { getProfileDisplayName } from '@/components/profile/CurrentUserIdentity';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useVerificationGate } from '@/hooks/use-verification-gate';
import {
  formatServicePostTitle,
  formatServiceRate,
  isPresenceActive,
} from '@/services/marketplace.helpers';
import {
  addServiceToWorkProfile,
  getCompletionModeForError,
  getCompletionTitleForMode,
  getMyProfileCompletion,
  getProfileSetupGateMessage,
  isProfileCompletionRequiredError,
} from '@/services/profile-completion.service';
import { shouldSuggestAddingToWorkProfile } from '@/services/service-classification';
import { getServiceDraft } from '@/services/service-draft.service';
import type { ExperienceLevel, RateType } from '@/types/marketplace.types';
import { getAvatarDisplayUrl, getCardImageUrl } from '@/utils/image-processing';
import { showAlert } from '@/utils/alert';

type ServiceDraft = {
  revision?: number;
  sourceListingId?: string | null;
  allowMessages: boolean;
  autoPauseEnabled: boolean;
  autoReplyEnabled: boolean;
  availability: string;
  category: string;
  customCategory: string;
  description: string;
  experienceLevel: ExperienceLevel;
  certificationAvailable: boolean;
  certificationNote: string;
  serviceGroup?: string | null;
  tags: string[];
  locationText?: string;
  photoUrls?: string[];
  rate: string;
  rateMin: string;
  rateMax: string;
  rateType: RateType;
  rateNegotiable: boolean;
  title: string;
};

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getStatusLine(draft: ServiceDraft) {
  const availability = draft.availability.trim();
  if (!availability) return 'Available nearby';
  if (/^(available|unavailable|availability)\b/i.test(availability)) return availability;
  return availability;
}

function getRateLine(draft: ServiceDraft) {
  const rate = formatServiceRate({
    rateText: draft.rate,
    rateMin: parseNumber(draft.rateMin),
    rateMax: parseNumber(draft.rateMax),
    rateType: draft.rateType,
    rateNegotiable: draft.rateNegotiable,
  });
  return rate;
}

function parseNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function getPreviewTags(draft: ServiceDraft) {
  return Array.from(
    new Set(
      [draft.serviceGroup, draft.category, ...draft.tags].filter(
        (value): value is string => Boolean(value?.trim()),
      ),
    ),
  );
}

export default function CreateServicePreviewScreen() {
  const router = useRouter();
  const { showErrorToast, showSuccessToast } = useFeedback();
  const params = useLocalSearchParams<{
    revision?: string | string[];
    draftId?: string | string[];
    returnTo?: string | string[];
    serviceId?: string | string[];
  }>();
  const { profile, loading, refresh } = useProfile();
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [retryReview, setRetryReview] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      if (!active) return;
      setReviewLoading(true);
      setReviewError(null);
      const id = getParamValue(params.draftId);
      const result = id ? await getServiceDraft(id).then(result => ({ data:result.data ? serviceDraftToReview(result.data) : null, error:result.error })) : {data:null,error:null};
      const requested = getParamValue(params.revision);
      if (result.data && requested && result.data.revision !== Number(requested)) { result.data=null; result.error='This draft changed after review. Go back to review the latest saved changes.'; }
      if (!active) return;
      setDraft(result.data);
      setReviewError(result.error);
      setReviewLoading(false);
    };
    void load().catch(() => { if (active) { setDraft(null); setReviewError('Could not load your review. Check your connection and retry.'); setReviewLoading(false); } });
    return () => { active = false; };
  }, [params.draftId, params.revision, retryReview]);
  const draftId = getParamValue(params.draftId);
  const returnTo = getParamValue(params.returnTo);
  const serviceId = draft?.sourceListingId ?? null;
  const [publishing, setPublishing] = useState(false);
  const editDraft = () => {
    if (draftId) router.dismissTo({pathname:'/create-service',params:{draftId,returnTo,reloadDraft:String(Date.now())}});
    else router.back();
  };
  const [commitError, setCommitError] = useState<string | null>(null);
  const [replaceConfirmation,setReplaceConfirmation] = useState(false);
  const loadLatestListing = () => setReplaceConfirmation(true);
  const replaceDraft = async () => {
    if (!draftId || draft?.revision === undefined) return;
    setPublishing(true);
    try {
      const result=await restartListingEdit('service',draftId,draft.revision);
      if (result.error) {setCommitError(result.error);return;}
      setReplaceConfirmation(false);
      editDraft();
    } finally {setPublishing(false);}
  };
  const [gateVisible, setGateVisible] = useState(false);
  const { isPending: isVerificationPending, isVerified } = useVerificationGate();

  const publishService = async () => {
    try { await publishServiceReview(); }
    catch { showAlert('Could not save service', 'Check your connection and try again.'); }
    finally { setPublishing(false); }
  };

  const publishServiceReview = async () => {
    if (!draft || publishing) return;

    setPublishing(true);
    if (!draftId || draft.revision === undefined) {
      setPublishing(false);
      showDraftSaveAlert('Reopen this draft before publishing.');
      return;
    }

    if (!isVerified) {
      setPublishing(false);
      setGateVisible(true);
      return;
    }

    const result = await publishServiceDraft(draftId!,draft.revision);

    if (result.error || !result.data) {
      setCommitError(result.error ?? 'Could not save this post.');
      setPublishing(false);
      if (isProfileCompletionRequiredError(result.error)) {
        const mode = getCompletionModeForError(result.error) ?? 'work';
        showAlert(getCompletionTitleForMode(mode), getProfileSetupGateMessage(), [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Complete profile',
            onPress: () => router.push({ pathname: '/profile/complete' as never, params: { mode } }),
          },
        ]);
        return;
      }


      return;
    }

    showSuccessToast(serviceId ? 'Service updated' : 'Service posted');
    await refresh();

    // Only after a confirmed publish, and never as a gate on navigation.
    await offerToAddServiceToWorkProfile(draft.category);

    router.replace(returnTo === 'profile' ? '/(tabs)/profile' : '/(tabs)/post');
  };

  /**
   * Offers to add the published service to the resident's Work Profile so
   * clients can find them for it. The profile is only ever changed when the
   * resident explicitly accepts; dismissing leaves it untouched, and a failure
   * here must not affect the listing that was already published.
   */
  const offerToAddServiceToWorkProfile = async (publishedCategory: string) => {
    const completion = await getMyProfileCompletion();
    if (completion.error || !completion.data) return;

    const serviceToAdd = shouldSuggestAddingToWorkProfile({
      publishedCategory,
      workProfileSkills: [
        ...completion.data.work.offeredServices,
        ...completion.data.work.customOfferedServices,
      ],
    });

    if (!serviceToAdd) return;

    await new Promise<void>((resolve) => {
      showAlert(
        'Add this to your Work Profile?',
        `You listed this under ${serviceToAdd}. Adding it to your Work Profile helps clients find you for it.`,
        [
          { text: 'Not now', style: 'cancel', onPress: () => resolve() },
          {
            text: 'Add to profile',
            onPress: () => {
              void addServiceToWorkProfile(serviceToAdd)
                .then(async (result) => {
                  if (result.error) {
                    showErrorToast('Could not update your Work Profile.');
                    return;
                  }

                  showSuccessToast(`${serviceToAdd} added to your Work Profile`);
                  await refresh();
                })
                .finally(() => resolve());
            },
          },
        ],
      );
    });
  };

  const startVerification = async () => {
    setGateVisible(false);
    router.push('/verification');
  };

  if (loading || reviewLoading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}><ConfirmationDialog visible={replaceConfirmation} title="Replace this edit draft?" message="This loads the latest published details. Keep a copy of any edits you want to reapply." confirmLabel="Load latest listing" cancelLabel="Keep draft" busy={publishing} onCancel={() => setReplaceConfirmation(false)} onConfirm={() => {void replaceDraft();}} />
        <View style={styles.screen}>
          <View style={styles.header}>
            <Skeleton height={32} width={32} borderRadius={radius.pill} />
            <Skeleton height={20} width={144} />
            <Skeleton height={18} width={56} />
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <PreviewSkeleton />
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (!draft) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}><ConfirmationDialog visible={replaceConfirmation} title="Replace this edit draft?" message="This loads the latest published details. Keep a copy of any edits you want to reapply." confirmLabel="Load latest listing" cancelLabel="Keep draft" busy={publishing} onCancel={() => setReplaceConfirmation(false)} onConfirm={() => {void replaceDraft();}} />
        <View style={styles.screen}>
          <Header actionLabel="" onBack={() => editDraft()} title="Preview" />
          <View style={styles.centered}>
            <Text style={styles.title}>Preview unavailable</Text>
            <Text style={styles.bodyMuted}>{reviewError || 'Go back and complete the service details first.'}</Text>
            {reviewError ? <Pressable accessibilityRole="button" onPress={() => setRetryReview(value => value + 1)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={styles.title}>Retry</Text></Pressable> : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}><ConfirmationDialog visible={replaceConfirmation} title="Replace this edit draft?" message="This loads the latest published details. Keep a copy of any edits you want to reapply." confirmLabel="Load latest listing" cancelLabel="Keep draft" busy={publishing} onCancel={() => setReplaceConfirmation(false)} onConfirm={() => {void replaceDraft();}} />
      <View style={styles.screen}>
        <Header
          actionLabel={publishing ? 'Saving...' : serviceId ? 'Save changes' : 'Publish'}
          disabled={publishing}
          onAction={publishService}
          onBack={editDraft}
          title="Preview"
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {commitError ? <NoticeBanner title="Changes have not been published" message={commitError} variant="warning" actionLabel={commitError.includes('listing changed') ? 'Load latest listing' : 'Edit draft'} onActionPress={commitError.includes('listing changed') ? loadLatestListing : () => editDraft()} /> : null}
          <View style={styles.safetyBox}>
            <Text style={styles.safetyTitle}>{serviceId ? 'Before saving' : 'Before publishing'}</Text>
            <SafetyLine text="No phone number in public text" />
            <SafetyLine text="Only your barangay is shown publicly" />
            <SafetyLine text="Clients must verify before messaging" />
          </View>

          <View style={styles.previewHeader}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <Text style={styles.smallMuted}>Review how your post will appear before publishing.</Text>
          </View>

          {!isVerified ? (
            <Text style={styles.previewNotice}>
              {isVerificationPending
                ? 'Verification in review. You can publish once approved.'
                : 'Verification required to publish'}
            </Text>
          ) : null}

          <View style={styles.previewFrame}>
            <PreviewServiceCard
              avatarUrl={getAvatarDisplayUrl({ avatarUrl: profile?.avatar_url })}
              headline={formatServicePostTitle({
                title: draft.title,
                category: draft.category,
                cue: 'offers',
              })}
              imageUrl={getCardImageUrl({ imageUrl: draft.photoUrls?.[0] })}
              isActive={isPresenceActive(draft.availability || profile?.availability)}
              jobsDoneText="Jobs after publish"
              location={draft.locationText || profile?.barangay || 'Barangay San Pedro'}
              name={getProfileDisplayName(profile)}
              ratingText="Preview listing"
              rateLine={getRateLine(draft)}
              statusLine={getStatusLine(draft)}
              tags={getPreviewTags(draft).slice(0, 6)}
            />
          </View>

          <PostingReviewDetails items={[
            { label: 'Description', value: draft.description },
            { label: 'Price', value: getRateLine(draft) },
            { label: 'What is included / price note', value: draft.rate },
            { label: 'Availability', value: draft.availability },
            { label: 'Location', value: draft.locationText },
          ]} />
          <View style={styles.optionsHeader}>
            <Text style={styles.optionsTitle}>Listing Options</Text>
            <Pressable accessibilityRole="button" onPress={editDraft}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
          <OptionReadout label="Allow messages" value={draft.allowMessages ? 'On' : 'Off'} />
        </ScrollView>

        <VerificationGateModal
          onClose={() => setGateVisible(false)}
          onStartVerification={startVerification}
          pending={isVerificationPending}
          visible={gateVisible}
        />
      </View>
    </SafeAreaView>
  );
}

function showDraftSaveAlert(error?: string | null) {
  if (__DEV__ && error) {
    console.warn('Service draft save failed', error);
  }

  showAlert('Draft', 'We could not save your draft. Please try again.');
}

function VerificationGateModal({
  onClose,
  onStartVerification,
  pending,
  visible,
}: {
  onClose: () => void;
  onStartVerification: () => void | Promise<void>;
  pending: boolean;
  visible: boolean;
}) {
  return (
    <BottomSheet maxHeight="48%" onClose={onClose} visible={visible}>
      <View style={styles.gateContent}>
        <MaterialIcons color={color.verificationBlue} name="shield" size={46} />
        <Text style={styles.gateTitle}>
          {pending ? 'Your verification is under review' : 'Barangay Verification Required'}
        </Text>
        {pending ? (
          <Text style={styles.gateText}>
            Your post is saved as a draft. You can publish it as soon as barangay staff approve you.
          </Text>
        ) : (
          <Text style={styles.gateText}>
            To keep services and clients trusted, posting requires <Text style={styles.gateStrong}>barangay verification.</Text>
          </Text>
        )}
        <Pressable accessibilityRole="button" onPress={onStartVerification} style={styles.gatePrimary}>
          <Text style={styles.gatePrimaryText}>{pending ? 'View status' : 'Start Verification'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.gateSecondary}>
          <Text style={styles.gateSecondaryText}>Keep Editing Post</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function Header({
  actionLabel,
  disabled,
  onAction,
  onBack,
  title,
}: {
  actionLabel: string;
  disabled?: boolean;
  onAction?: () => void;
  onBack: () => void;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.headerIcon}>
        <MaterialIcons color={color.text} name="chevron-left" size={30} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable accessibilityRole="button" disabled={disabled} onPress={onAction} style={[disabled && styles.disabled]}>
          <Text style={styles.headerAction}>{actionLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

function SafetyLine({ text }: { text: string }) {
  return (
    <View style={styles.safetyLine}>
      <Text style={styles.bullet}>{'\u2022'}</Text>
      <Text style={styles.safetyText}>{text}</Text>
    </View>
  );
}

function PreviewServiceCard({
  avatarUrl,
  headline,
  imageUrl,
  isActive,
  jobsDoneText,
  location,
  name,
  ratingText,
  rateLine,
  statusLine,
  tags,
}: {
  avatarUrl?: string | null;
  headline: string;
  imageUrl?: string;
  isActive?: boolean;
  jobsDoneText: string;
  location: string;
  name: string;
  ratingText: string;
  rateLine: string;
  statusLine: string;
  tags: string[];
}) {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewIdentityRow}>
        <View style={styles.previewAvatar}>
          {avatarUrl ? (
            <CachedRemoteImage uri={avatarUrl} style={styles.previewAvatarImage} />
          ) : (
            <Text style={styles.previewAvatarText}>{getInitials(name)}</Text>
          )}
          <View style={[styles.previewPresenceDot, isActive ? styles.previewPresenceActive : styles.previewPresenceIdle]} />
        </View>
        <View style={styles.previewIdentityCopy}>
          <Text numberOfLines={2} style={styles.previewName}>
            {name}
          </Text>
          <Text style={styles.previewStatus}>{statusLine}</Text>
        </View>
      </View>

      <View style={styles.previewCopyBlock}>
        <Text style={styles.previewRate}>{rateLine}</Text>
        <Text style={styles.previewHeadline}>{headline}</Text>
      </View>

      {imageUrl ? <CachedRemoteImage uri={imageUrl} style={styles.previewImage} /> : null}

      <View style={styles.previewTags}>
        {tags.map((tag) => (
          <View key={tag} style={styles.previewTag}>
            <Text style={styles.previewTagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.previewMetaGrid}>
        <PreviewMeta icon="star-border" text={ratingText} />
        <PreviewMeta icon="check-circle" text={jobsDoneText} />
        <PreviewMeta icon="location-on" text={location} />
      </View>
    </View>
  );
}

function PreviewMeta({
  icon,
  text,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  text: string;
}) {
  return (
    <View style={styles.previewMetaItem}>
      <MaterialIcons color={icon === 'star-border' ? color.brandYellow : color.textSubtle} name={icon} size={15} />
      <Text style={styles.previewMetaText}>{text}</Text>
    </View>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'K';
}

function OptionReadout({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.optionRow}>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionValue}>{value}</Text>
    </View>
  );
}

function PreviewSkeleton() {
  return (
    <>
      <View style={styles.safetyBox}>
        <Skeleton height={15} width={112} />
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.safetyLine}>
            <Skeleton height={10} width={10} borderRadius={radius.pill} />
            <Skeleton height={12} width={index === 0 ? '74%' : '88%'} />
          </View>
        ))}
      </View>

      <View style={styles.previewHeader}>
        <Skeleton height={15} width={58} />
        <Skeleton height={10} width="82%" />
      </View>

      <View style={styles.previewFrame}>
        <Skeleton height={220} width="100%" borderRadius={radius.sm} />
      </View>

      <View style={styles.optionsHeader}>
        <Skeleton height={14} width={96} />
        <Skeleton height={14} width={28} />
      </View>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.optionRow}>
          <Skeleton height={13} width={index === 0 ? '42%' : '56%'} />
          <Skeleton height={13} width={24} />
        </View>
      ))}
    </>
  );
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
    alignItems: 'center',
    backgroundColor: color.background,
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    minHeight: 55,
    paddingHorizontal: space.xl,
    zIndex: 1,
  },
  headerIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: color.text,
    flex: 1,
  },
  headerAction: {
    ...typography.bodyMedium,
    color: color.verificationBlue,
  },
  headerSpacer: {
    width: 56,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    gap: space.md,
    padding: space.xl,
    paddingBottom: space['3xl'],
    paddingTop: space.lg,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: space.sm,
    justifyContent: 'center',
    padding: space.xl,
  },
  title: {
    ...typography.sectionTitle,
    color: color.text,
  },
  bodyMuted: {
    ...typography.body,
    color: color.textMuted,
    textAlign: 'center',
  },
  safetyBox: {
    backgroundColor: color.cardTint,
    borderColor: color.accentYellow,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space.md,
  },
  safetyTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  safetyLine: {
    flexDirection: 'row',
    gap: space.sm,
  },
  bullet: {
    ...typography.caption,
    color: color.textMuted,
    width: 10,
  },
  safetyText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  previewHeader: {
    gap: space['2xs'],
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  smallMuted: {
    ...typography.tiny,
    color: color.textMuted,
  },
  previewNotice: {
    alignSelf: 'flex-start',
    backgroundColor: color.primarySoft,
    borderRadius: radius.sm,
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  previewFrame: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewCard: {
    backgroundColor: color.background,
    gap: space.md,
    padding: space.md,
  },
  previewIdentityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    minWidth: 0,
  },
  previewAvatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  previewAvatarImage: {
    borderRadius: radius.pill,
    height: '100%',
    width: '100%',
  },
  previewAvatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  previewPresenceDot: {
    borderColor: color.background,
    borderRadius: radius.pill,
    borderWidth: 2,
    bottom: 1,
    height: 12,
    position: 'absolute',
    right: 1,
    width: 12,
  },
  previewPresenceActive: {
    backgroundColor: color.success,
  },
  previewPresenceIdle: {
    backgroundColor: color.textSubtle,
  },
  previewIdentityCopy: {
    flex: 1,
    gap: space['2xs'],
    minWidth: 0,
  },
  previewName: {
    ...typography.bodyMedium,
    color: color.text,
    fontFamily: 'Satoshi-Bold',
  },
  previewStatus: {
    ...typography.caption,
    color: color.textMuted,
  },
  previewCopyBlock: {
    gap: space.sm,
  },
  previewRate: {
    ...typography.caption,
    color: color.textMuted,
  },
  previewHeadline: {
    ...typography.bodyMedium,
    color: color.text,
  },
  previewImage: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 214,
    width: '100%',
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  previewTag: {
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 27,
    paddingHorizontal: space.sm,
  },
  previewTagText: {
    color: '#42474C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
  },
  previewMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  previewMetaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space['2xs'],
    maxWidth: '100%',
  },
  previewMetaText: {
    ...typography.caption,
    color: color.textSubtle,
    flexShrink: 1,
  },
  optionsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  optionsTitle: {
    ...typography.captionMedium,
    color: color.text,
    fontFamily: 'Satoshi-Bold',
  },
  editLink: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  optionLabel: {
    ...typography.captionMedium,
    color: color.text,
  },
  optionValue: {
    ...typography.caption,
    color: color.text,
  },
  gateContent: {
    alignItems: 'center',
    gap: space.md,
    width: '100%',
  },
  gateTitle: {
    ...typography.sectionTitle,
    color: color.text,
    textAlign: 'center',
  },
  gateText: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: color.textMuted,
    textAlign: 'center',
  },
  gateStrong: {
    fontFamily: 'Satoshi-Bold',
  },
  gatePrimary: {
    alignItems: 'center',
    backgroundColor: color.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.xl,
    width: '100%',
  },
  gatePrimaryText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  gateSecondary: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.xl,
    width: '100%',
  },
  gateSecondaryText: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
});
