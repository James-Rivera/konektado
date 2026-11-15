import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { NoticeBanner } from '@/components/NoticeBanner';
import { restartListingEdit } from '@/services/listing-edit.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import { PostingReviewDetails } from '@/components/PostingReviewDetails';
import { jobDraftToReview } from '@/services/posting-review';
import { publishJobDraft } from '@/services/posting-publish.service';
import { useFeedback } from '@/components/FeedbackProvider';
import { JobCard } from '@/components/JobCard';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useVerificationGate } from '@/hooks/use-verification-gate';
import { getJobDraft } from '@/services/job-draft.service';
import { formatJobBudget, formatJobPostTitle } from '@/services/marketplace.helpers';
import {
    getCompletionModeForError,
    getCompletionTitleForMode,
    getProfileSetupGateMessage,
    isProfileCompletionRequiredError,
} from '@/services/profile-completion.service';
import type { ExperienceLevel, RateType } from '@/types/marketplace.types';
import { getCardImageUrl } from '@/utils/image-processing';
import { showAlert } from '@/utils/alert';

type JobDraft = {
  revision?: number;
  sourceListingId?: string | null;
  title: string;
  description: string;
  category: string;
  serviceNeeded: string;
  tags: string[];
  photoUrls: string[];
  barangay: string;
  locationText: string;
  privateLocationNotes: string;
  budgetMin: string;
  budgetMax: string;
  rateType: RateType;
  budgetNegotiable: boolean;
  workersNeeded: string;
  scheduleText: string;
  experienceLevel: ExperienceLevel;
  certificationRequired: boolean;
  certificationNote: string;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoCloseEnabled: boolean;
};

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseDraft(value: string | undefined): JobDraft | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as JobDraft;
    if (!parsed.title || !parsed.description || !parsed.category || !parsed.serviceNeeded) return null;
    return {
      ...parsed,
      privateLocationNotes: parsed.privateLocationNotes ?? '',
      budgetMin: parsed.budgetMin ?? '',
      budgetMax: parsed.budgetMax ?? '',
      rateType: parsed.rateType ?? 'per_project',
      budgetNegotiable: parsed.budgetNegotiable ?? false,
      experienceLevel: parsed.experienceLevel ?? 'any',
      certificationRequired: parsed.certificationRequired ?? false,
      certificationNote: parsed.certificationNote ?? '',
      serviceNeeded: parsed.serviceNeeded ?? '',
      photoUrls: Array.isArray(parsed.photoUrls) ? parsed.photoUrls : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch {
    return null;
  }
}

function parseNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function CreateJobPreviewScreen() {
  const router = useRouter();
  const { showSuccessToast } = useFeedback();
  const params = useLocalSearchParams<{
    revision?: string | string[];
    draftId?: string | string[];
    jobId?: string | string[];
    returnTo?: string | string[];
  }>();
  const { loading, refresh } = useProfile();
  const { isPending: isVerificationPending, isVerified } = useVerificationGate();
  const [draft, setDraft] = useState<JobDraft | null>(null);
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
      const result = id ? await getJobDraft(id).then(result => ({ data:result.data ? parseDraft(JSON.stringify(jobDraftToReview(result.data))) : null, error:result.error })) : {data:null,error:null};
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
  const jobId = draft?.sourceListingId ?? null;
  const returnTo = getParamValue(params.returnTo);
  const [publishing, setPublishing] = useState(false);
  const editDraft = () => {
    if (draftId) router.dismissTo({pathname:'/create-job',params:{draftId,returnTo,reloadDraft:String(Date.now())}});
    else router.back();
  };
  const [commitError, setCommitError] = useState<string | null>(null);
  const [replaceConfirmation,setReplaceConfirmation] = useState(false);
  const loadLatestListing = () => setReplaceConfirmation(true);
  const replaceDraft = async () => {
    if (!draftId || draft?.revision === undefined) return;
    setPublishing(true);
    try {
      const result=await restartListingEdit('job',draftId,draft.revision);
      if (result.error) {setCommitError(result.error);return;}
      setReplaceConfirmation(false);
      editDraft();
    } finally {setPublishing(false);}
  };
  const [gateVisible, setGateVisible] = useState(false);
  const budgetMin = draft ? parseNumber(draft.budgetMin) : null;
  const budgetMax = draft ? parseNumber(draft.budgetMax) : null;
  const workersNeeded = draft ? parseNumber(draft.workersNeeded) : null;

  const publishVerifiedJob = async () => {
    if (!draft) return;

    const result = await publishJobDraft(draftId!,draft.revision);

    if (result.error || !result.data) {
      setCommitError(result.error ?? 'Could not save this post.');
      if (isProfileCompletionRequiredError(result.error)) {
        const mode = getCompletionModeForError(result.error) ?? 'hiring';
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

    showSuccessToast(jobId ? 'Job updated' : 'Job posted');

    await refresh();
    if (returnTo === 'post') {
      router.replace('/post/active');
      return;
    }

    router.replace({
      pathname: '/job/[jobId]',
      params: { jobId: result.data.id },
    });
  };

  const onPublish = async () => {
    if (!draft || publishing) return;

    setPublishing(true);
    if (!draftId || draft.revision === undefined) {
      setPublishing(false);
      showAlert('Draft', 'Reopen this draft before publishing.');
      return;
    }

    if (!isVerified) {
      setPublishing(false);
      setGateVisible(true);
      return;
    }

    try { await publishVerifiedJob(); }
    catch { showAlert('Could not save post', 'Check your connection and try again.'); }
    finally { setPublishing(false); }
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
            <Skeleton height={20} width={72} />
            <Skeleton height={18} width={52} />
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
          <Header actionLabel="" title="Preview" onBack={() => editDraft()} />
          <View style={styles.centered}>
            <Text style={styles.title}>Preview unavailable</Text>
            <Text style={styles.bodyMuted}>{reviewError || 'Go back and complete the job post details.'}</Text>
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
          actionLabel={publishing ? (jobId ? 'Saving...' : 'Publishing...') : (jobId ? 'Save changes' : 'Publish')}
          disabled={publishing}
          onAction={onPublish}
          onBack={editDraft}
          title="Preview"
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {commitError ? <NoticeBanner title="Changes have not been published" message={commitError} variant="warning" actionLabel={commitError.includes('listing changed') ? 'Load latest listing' : 'Edit draft'} onActionPress={commitError.includes('listing changed') ? loadLatestListing : () => editDraft()} /> : null}
          <View style={styles.safetyBox}>
            <Text style={styles.safetyTitle}>{jobId ? 'Before saving' : 'Before publishing'}</Text>
            <SafetyLine text="No phone number in public text" />
            <SafetyLine text="Private notes stay with you; share meeting details in Messages" />
            <SafetyLine text="Workers must verify before messaging" />
          </View>

          <View style={styles.previewHeader}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <Text style={styles.smallMuted}>Review how your post will appear before {jobId ? 'saving' : 'publishing'}.</Text>
          </View>

          {!isVerified ? (
            <Text style={styles.previewNotice}>
              {isVerificationPending
                ? 'Verification in review. You can publish once approved.'
                : 'Verification required to publish'}
            </Text>
          ) : null}

          <View style={styles.previewFrame}>
            <JobCard
              clientRatingText="Preview listing"
              description={draft.description}
              imageUrl={getCardImageUrl({ imageUrl: draft.photoUrls[0] })}
              jobsPostedText={workersNeeded ? `${workersNeeded} worker${workersNeeded === 1 ? '' : 's'} needed` : 'Workers to coordinate'}
              location={draft.barangay || 'Barangay San Pedro'}
              postedAt="Posted just now"
              showSaveButton={false}
              subtitle={`${formatJobBudget({
                budgetMin,
                budgetMax,
                rateType: draft.rateType,
                budgetNegotiable: draft.budgetNegotiable,
              })} - ${draft.scheduleText || 'Schedule to coordinate'}`}
              tags={[draft.category, draft.serviceNeeded, ...draft.tags].filter(Boolean).slice(0, 4)}
              title={formatJobPostTitle({
                title: draft.title,
                serviceNeeded: draft.serviceNeeded,
                category: draft.category,
              })}
              onPress={() => {}}
              onViewJob={() => {}}
            />
          </View>

          <PostingReviewDetails items={[
            { label: 'Description', value: draft.description },
            { label: 'Budget', value: formatJobBudget({ budgetMin, budgetMax, rateType: draft.rateType, budgetNegotiable: draft.budgetNegotiable }) },
            { label: 'Schedule', value: draft.scheduleText },
            { label: 'Location', value: draft.locationText },
            { label: 'Private notes (only you and barangay staff)', value: draft.privateLocationNotes },
          ]} />
          <View style={styles.optionsHeader}>
            <Text style={styles.optionsTitle}>Listing Options</Text>
            <Pressable accessibilityRole="button" onPress={editDraft}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
          <OptionReadout label="Allow messages before hiring" value={draft.allowMessages ? 'On' : 'Off'} />
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

function VerificationGateModal({
  onClose,
  onStartVerification,
  pending,
  visible,
}: {
  onClose: () => void;
  onStartVerification: () => void;
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
            To keep jobs and workers trusted, posting requires <Text style={styles.gateStrong}>barangay verification.</Text>
          </Text>
        )}
        <Pressable accessibilityRole="button" onPress={onStartVerification} style={styles.gatePrimary}>
          <Text style={styles.gatePrimaryText}>{pending ? 'View status' : 'Start Verification'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.gateSecondary}>
          <Text style={styles.gateSecondaryText}>Keep Editing Draft</Text>
        </Pressable>
        <Text style={styles.gateFootnote}>You can still save drafts and continue later.</Text>
      </View>
    </BottomSheet>
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
      <Skeleton height={12} width={172} />

      <View style={styles.feedCard}>
        <Skeleton height={10} width={78} />
        <View style={styles.cardTitleRow}>
          <View style={styles.flex}>
            <Skeleton height={18} width="76%" />
            <Skeleton height={12} width="92%" style={{ marginTop: space.xs }} />
          </View>
          <Skeleton height={30} width={30} borderRadius={radius.sm} />
        </View>
        <Skeleton height={14} width="100%" />
        <Skeleton height={14} width="72%" />
        <View style={styles.pillRow}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={27} width={index === 0 ? 86 : 68} borderRadius={13} />
          ))}
        </View>
        <View style={styles.metaRow}>
          <Skeleton height={16} width={112} />
          <Skeleton height={16} width={132} />
        </View>
      </View>

      <View style={styles.optionsHeader}>
        <Skeleton height={14} width={96} />
        <Skeleton height={14} width={28} />
      </View>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.optionRow}>
          <Skeleton height={13} width={index === 0 ? '58%' : '34%'} />
          <Skeleton height={13} width={24} />
        </View>
      ))}
    </>
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
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.safetyText}>{text}</Text>
    </View>
  );
}

function OptionReadout({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.optionRow}>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionValue}>{value}</Text>
    </View>
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
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    minHeight: 55,
    paddingHorizontal: space.xl,
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
    width: 52,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    gap: space.md,
    padding: space.xl,
    paddingBottom: space['3xl'],
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
  sectionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  smallMuted: {
    ...typography.tiny,
    color: color.textMuted,
  },
  feedCard: {
    borderColor: color.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  postedText: {
    ...typography.tiny,
    color: color.text,
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  flex: {
    flex: 1,
  },
  jobTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
    color: color.text,
  },
  jobMeta: {
    ...typography.caption,
    color: color.textMuted,
  },
  description: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: color.text,
  },
  photoSection: {
    gap: space.sm,
  },
  photoHero: {
    backgroundColor: color.cardTint,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 238,
    overflow: 'hidden',
    width: '100%',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  pill: {
    backgroundColor: color.primarySoft,
    borderRadius: 13,
    minHeight: 27,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  pillText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
    color: '#42474C',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
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
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    width: '100%',
  },
  gatePrimaryText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    color: color.white,
  },
  gateSecondary: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: radius.md,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    width: '100%',
  },
  gateSecondaryText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    color: color.primary,
  },
  gateFootnote: {
    fontFamily: 'Satoshi-Light',
    fontSize: 10,
    lineHeight: 19,
    color: color.textMuted,
    textAlign: 'center',
  },
  section: {
    gap: space.md,
    marginTop: space.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
