import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import { Skeleton } from '@/components/Skeleton';
import { useFeedback } from '@/components/FeedbackProvider';
import { getProfileDisplayName } from '@/components/profile/CurrentUserIdentity';
import { WorkerCard } from '@/components/WorkerCard';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import {
  formatServicePostTitle,
  formatServiceRate,
  isPresenceActive,
} from '@/services/marketplace.helpers';
import {
  getCompletionModeForError,
  getCompletionTitleForMode,
  getProfileSetupGateMessage,
  isProfileCompletionRequiredError,
} from '@/services/profile-completion.service';
import { createService } from '@/services/service-profile.service';
import type { ExperienceLevel, RateType } from '@/types/marketplace.types';
import { getAvatarDisplayUrl, getCardImageUrl } from '@/utils/image-processing';

type ServiceDraft = {
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

function parseDraft(value: string | undefined): ServiceDraft | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<ServiceDraft>;
    if (!parsed.category || !parsed.title) return null;

    return {
      allowMessages: parsed.allowMessages ?? true,
      autoPauseEnabled: parsed.autoPauseEnabled ?? false,
      autoReplyEnabled: parsed.autoReplyEnabled ?? false,
      availability: parsed.availability ?? '',
      category: parsed.category,
      customCategory: parsed.customCategory ?? '',
      description: parsed.description ?? '',
      experienceLevel: parsed.experienceLevel ?? 'any',
      certificationAvailable: parsed.certificationAvailable ?? false,
      certificationNote: parsed.certificationNote ?? '',
      serviceGroup: parsed.serviceGroup ?? null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      locationText: parsed.locationText ?? '',
      photoUrls: Array.isArray(parsed.photoUrls) ? parsed.photoUrls : [],
      rate: parsed.rate ?? '',
      rateMin: parsed.rateMin ?? '',
      rateMax: parsed.rateMax ?? '',
      rateType: parsed.rateType ?? 'per_project',
      rateNegotiable: parsed.rateNegotiable ?? false,
      title: parsed.title,
    };
  } catch {
    return null;
  }
}

function getStatusLine(draft: ServiceDraft) {
  return draft.availability.trim() ? `Available ${draft.availability.trim()}` : 'Available nearby';
}

function getRateLine(draft: ServiceDraft) {
  const rate = formatServiceRate({
    rateText: draft.rate,
    rateMin: parseNumber(draft.rateMin),
    rateMax: parseNumber(draft.rateMax),
    rateType: draft.rateType,
    rateNegotiable: draft.rateNegotiable,
  });
  const availability = draft.availability.trim() || 'Availability to coordinate';
  return `${rate} - ${availability}`;
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
  const { showSuccessToast } = useFeedback();
  const params = useLocalSearchParams<{
    draft?: string | string[];
    returnTo?: string | string[];
  }>();
  const { profile, loading, refresh } = useProfile();
  const draft = useMemo(() => parseDraft(getParamValue(params.draft)), [params.draft]);
  const returnTo = getParamValue(params.returnTo);
  const [publishing, setPublishing] = useState(false);
  const [gateVisible, setGateVisible] = useState(false);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  const publishService = async () => {
    if (!draft || publishing) return;

    if (!isVerified) {
      setGateVisible(true);
      return;
    }

    setPublishing(true);
    const result = await createService({
      category: draft.category,
      customCategory: draft.customCategory,
      title: draft.title,
      description: draft.description,
      tags: getPreviewTags(draft),
      photoUrls: draft.photoUrls,
      availabilityText: draft.availability,
      rateText: draft.rate,
      rateMin: parseNumber(draft.rateMin),
      rateMax: parseNumber(draft.rateMax),
      rateType: draft.rateType,
      rateNegotiable: draft.rateNegotiable,
      experienceLevel: draft.experienceLevel,
      certificationAvailable: draft.certificationAvailable,
      certificationNote: draft.certificationNote,
      barangay: draft.locationText,
      locationText: draft.locationText,
      allowMessages: draft.allowMessages,
      autoReplyEnabled: draft.autoReplyEnabled,
      autoPauseEnabled: draft.autoPauseEnabled,
    });
    setPublishing(false);

    if (result.error || !result.data) {
      if (isProfileCompletionRequiredError(result.error)) {
        const mode = getCompletionModeForError(result.error) ?? 'work';
        Alert.alert(getCompletionTitleForMode(mode), getProfileSetupGateMessage(), [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Complete profile',
            onPress: () => router.push({ pathname: '/profile/complete' as never, params: { mode } }),
          },
        ]);
        return;
      }

      Alert.alert('Could not publish service', result.error ?? 'Please try again.');
      return;
    }

    showSuccessToast('Service posted');
    await refresh();
    router.replace(returnTo === 'profile' ? '/(tabs)/profile' : '/(tabs)/post');
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
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
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.screen}>
          <Header actionLabel="" onBack={() => router.back()} title="Preview" />
          <View style={styles.centered}>
            <Text style={styles.title}>Preview unavailable</Text>
            <Text style={styles.bodyMuted}>Go back and complete the service details first.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <Header
          actionLabel={publishing ? 'Publishing...' : 'Publish'}
          disabled={publishing}
          onAction={publishService}
          onBack={() => router.back()}
          title="Preview"
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.safetyBox}>
            <Text style={styles.safetyTitle}>Before publishing</Text>
            <SafetyLine text="No phone number in public text" />
            <SafetyLine text="Only your barangay is shown publicly" />
            <SafetyLine text="Clients must verify before messaging" />
          </View>

          <View style={styles.previewHeader}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <Text style={styles.smallMuted}>Review how your post will appear before publishing.</Text>
          </View>

          {!isVerified ? <Text style={styles.previewNotice}>Verification required to publish</Text> : null}

          <View style={styles.previewFrame}>
            <WorkerCard
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
              onPress={() => {}}
              ratingText="Preview listing"
              rateLine={getRateLine(draft)}
              showSaveButton={false}
              statusLine={getStatusLine(draft)}
              tags={getPreviewTags(draft).slice(0, 4)}
            />
          </View>

          <View style={styles.optionsHeader}>
            <Text style={styles.optionsTitle}>Listing Options</Text>
            <Pressable accessibilityRole="button" onPress={() => router.back()}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
          <OptionReadout label="Allow messages" value={draft.allowMessages ? 'On' : 'Off'} />
          <OptionReadout label="Auto-reply" value={draft.autoReplyEnabled ? 'On' : 'Off'} />
          <OptionReadout label="Pause listing when unavailable" value={draft.autoPauseEnabled ? 'On' : 'Off'} />
        </ScrollView>

        <VerificationGateModal
          onClose={() => setGateVisible(false)}
          onStartVerification={() => {
            setGateVisible(false);
            router.push('/verification');
          }}
          visible={gateVisible}
        />
      </View>
    </SafeAreaView>
  );
}

function VerificationGateModal({
  onClose,
  onStartVerification,
  visible,
}: {
  onClose: () => void;
  onStartVerification: () => void;
  visible: boolean;
}) {
  return (
    <BottomSheet maxHeight="48%" onClose={onClose} visible={visible}>
      <View style={styles.gateContent}>
        <MaterialIcons color={color.verificationBlue} name="shield" size={46} />
        <Text style={styles.gateTitle}>Barangay Verification Required</Text>
        <Text style={styles.gateText}>
          To keep services and clients trusted, posting requires <Text style={styles.gateStrong}>barangay verification.</Text>
        </Text>
        <Pressable accessibilityRole="button" onPress={onStartVerification} style={styles.gatePrimary}>
          <Text style={styles.gatePrimaryText}>Start Verification</Text>
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
    width: 56,
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
