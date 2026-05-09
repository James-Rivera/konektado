import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Skeleton, SkeletonAvatar, SkeletonChip, SkeletonImage, SkeletonText } from '@/components/Skeleton';
import { getDisplayLabelForMvpService } from '@/constants/service-taxonomy';
import { color, radius, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { startServiceConversation } from '@/services/conversation.service';
import { emitConversationPreviewUpdate } from '@/services/conversation-preview-events';
import {
  formatServiceJobsDoneText,
  formatServiceRatingText,
  getMarketplaceLocation,
} from '@/services/marketplace.helpers';
import {
  getCompletionModeForError,
  getCompletionTitleForMode,
  isProfileCompletionRequiredError,
} from '@/services/profile-completion.service';
import { getServiceDetail } from '@/services/service-profile.service';
import type { ProviderService, ServiceDetail } from '@/types/marketplace.types';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type DetailVariant = 'default' | 'match';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getVariant(value: string | string[] | undefined): DetailVariant {
  return getParamValue(value) === 'match' ? 'match' : 'default';
}

export default function ServiceDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  const params = useLocalSearchParams<{
    serviceId?: string | string[];
    variant?: string | string[];
  }>();
  const serviceId = getParamValue(params.serviceId);
  const variant = getVariant(params.variant);
  const [detail, setDetail] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    let active = true;

    if (!serviceId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    getServiceDetail(serviceId).then((result) => {
      if (!active) return;

      if (result.error) {
        Alert.alert('Worker profile', result.error);
      } else {
        setDetail(result.data);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [serviceId]);

  const showPlaceholder = (label: string) => {
    Alert.alert(label, 'This will open from Worker Profile in a later slice.');
  };

  const handleMessage = () => {
    if (messageCta.disabled && messageCta.reason !== 'verification') {
      return;
    }

    if (!isVerified) {
      router.push('/verification');
      return;
    }

    if (!detail) return;

    setMessaging(true);
    startServiceConversation({
      serviceId: detail.id,
      message: `Hi, I am interested in your ${(getDisplayLabelForMvpService(detail.category) || detail.category).toLowerCase()} service. Are you available?`,
    }).then((result) => {
      setMessaging(false);

      if (result.error || !result.data) {
        if (isProfileCompletionRequiredError(result.error)) {
          const mode = getCompletionModeForError(result.error) ?? 'hiring';
          Alert.alert(getCompletionTitleForMode(mode), result.error ?? 'Complete your profile first.', [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Complete profile',
              onPress: () => router.push({ pathname: '/profile/complete' as never, params: { mode } }),
            },
          ]);
          return;
        }

        Alert.alert('Message', result.error ?? 'Could not open the conversation.');
        return;
      }

      emitConversationPreviewUpdate({
        conversationId: result.data.id,
        conversation: result.data,
        userId: profile?.id,
      });

      router.push({
        pathname: '/conversation/[conversationId]',
        params: { conversationId: result.data.id },
      });
    });
  };

  if (loading) {
    return <WorkerDetailSkeleton bottomInset={insets.bottom} variant={variant} />;
  }

  if (!detail) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.screen}>
          <DetailHeader onBack={() => router.back()} onMore={() => showPlaceholder('Options')} />
          <View style={styles.emptyWrap}>
            <EmptyState
              actionLabel="Go back"
              description="This worker profile is no longer available."
              icon="person-search"
              onActionPress={() => router.back()}
              title="Worker not found"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const providerName = detail.provider?.fullName || 'Konektado resident';
  const location = getMarketplaceLocation(detail);
  const displayCategory = getDisplayLabelForMvpService(detail.category) || detail.category;
  const selectedServiceTitle =
    detail.category === 'Basic home repair' && detail.title === 'Basic home repair help'
      ? 'Minor home fix support'
      : detail.title || displayCategory;
  const serviceTags = Array.from(
    new Set([displayCategory, ...detail.tags.map((tag) => getDisplayLabelForMvpService(tag) || tag)].filter(Boolean)),
  );
  const serviceLabels = Array.from(
    new Set(
      detail.providerServices
        .map((service) => getDisplayLabelForMvpService(service.category) || service.category || service.title)
        .filter(Boolean),
    ),
  );
  const ratingText = formatServiceRatingText(detail);
  const jobsDoneText = formatServiceJobsDoneText(detail, detail.completedJobsCount);
  const serviceImageUrl = detail.photoUrls?.[0] ?? null;
  const messageCta = getWorkerMessageCta({
    allowMessages: detail.allowMessages,
    availabilityText: detail.availabilityText,
    isActive: detail.isActive,
    isOwnService: profile?.id === detail.providerId,
    isVerified,
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <DetailHeader onBack={() => router.back()} onMore={() => showPlaceholder('Options')} />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 24 + Math.max(insets.bottom, 12) },
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}>
          <WorkerProfileHero
            availabilityText={detail.availabilityText || 'Availability to coordinate'}
            jobsDoneText={jobsDoneText}
            location={location}
            name={providerName}
            ratingText={ratingText}
            serviceTitle={selectedServiceTitle}
          />

          {variant === 'match' ? (
            <SectionBand style={styles.matchSection}>
              <MatchNoticeCard
                body={`Matches your search for ${displayCategory.toLowerCase()} help near ${location}.`}
                title="Why this worker fits"
              />
            </SectionBand>
          ) : null}

          <SectionBand style={styles.skillsSection}>
            <Text style={styles.sectionTitle}>Selected service</Text>
            <View style={styles.serviceRateRow}>
              <Text style={styles.selectedServiceTitle}>{selectedServiceTitle}</Text>
              <View style={styles.servicesWrap}>
                {serviceLabels.map((serviceLabel) => (
                  <View key={serviceLabel} style={styles.servicePill}>
                    <Text style={styles.servicePillText}>{serviceLabel}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.ratePill}>
                <MaterialIcons color={color.primary} name="payments" size={16} />
                <Text style={styles.ratePillText}>{detail.rateText || 'Rate to coordinate'}</Text>
              </View>
            </View>
          </SectionBand>

          <SectionBand style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Service details</Text>
            <WorkerMetricGrid
              metrics={[
                { label: 'Rate', value: detail.rateText || 'Rate to coordinate' },
                { label: 'Availability', value: detail.availabilityText || 'Schedule to coordinate' },
                { label: 'Service area', value: location },
                {
                  label: 'Experience',
                  value: detail.yearsExperience
                    ? `${detail.yearsExperience} year${detail.yearsExperience === 1 ? '' : 's'}`
                    : 'Experience to coordinate',
                },
              ]}
            />
          </SectionBand>

          {serviceImageUrl ? (
            <SectionBand style={styles.photoSection}>
              <Text style={styles.sectionTitle}>Work photos</Text>
              <Image resizeMode="cover" source={{ uri: serviceImageUrl }} style={styles.detailPhoto} />
            </SectionBand>
          ) : null}

          <SectionBand style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>About this service</Text>
            <Text style={styles.bodyText}>{detail.description || selectedServiceTitle}</Text>
          </SectionBand>

          {serviceTags.length ? (
            <SectionBand style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Service tags</Text>
              <View style={styles.tagRow}>
                {serviceTags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </SectionBand>
          ) : null}

          <SectionBand style={styles.historySection}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>
                {detail.reviewCount > 0 && detail.averageRating
                  ? `${detail.averageRating.toFixed(1)} average from ${detail.reviewCount} review${detail.reviewCount === 1 ? '' : 's'}`
                  : 'No reviews yet'}
              </Text>
              <Text style={styles.reviewBody}>
                Reviews appear after completed Konektado jobs.
              </Text>
            </View>
          </SectionBand>

          {detail.providerServices.length > 1 ? (
            <SectionBand style={styles.historySection}>
              <Text style={styles.sectionTitle}>More services from this worker</Text>
              <View style={styles.serviceList}>
                {detail.providerServices
                  .filter((service) => service.id !== detail.id)
                  .map((service) => (
                    <ServicePreviewCard key={service.id} service={service} />
                  ))}
              </View>
            </SectionBand>
          ) : null}
        </ScrollView>

        <DetailActionRow
          bottomInset={insets.bottom}
          cta={messageCta}
          messaging={messaging}
          onMessage={handleMessage}
        />
      </View>
    </SafeAreaView>
  );
}

function WorkerDetailSkeleton({
  bottomInset,
  variant,
}: {
  bottomInset: number;
  variant: DetailVariant;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <DetailHeader isLoading onBack={() => undefined} onMore={() => undefined} />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 24 + Math.max(bottomInset, 12) },
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}>
          <WorkerProfileHero
            availabilityText=""
            isLoading
            jobsDoneText=""
            location=""
            name=""
            ratingText=""
            serviceTitle=""
          />
          {variant === 'match' ? (
            <SectionBand style={styles.matchSection}>
              <MatchNoticeCard body="" isLoading title="" />
            </SectionBand>
          ) : null}
          <SectionBand style={styles.skillsSection}>
            <Skeleton height={16} width={120} />
            <View style={styles.serviceRateRow}>
              <Skeleton height={20} width="58%" />
              <View style={styles.servicesWrap}>
                <SkeletonChip height={28} width={92} />
                <SkeletonChip height={28} width={104} />
              </View>
              <SkeletonChip height={32} width={148} />
            </View>
          </SectionBand>
          <SectionBand style={styles.detailsSection}>
            <Skeleton height={16} width={110} />
            <WorkerMetricGrid isLoading metrics={[]} />
          </SectionBand>
          <SectionBand style={styles.photoSection}>
            <Skeleton height={16} width={92} />
            <SkeletonImage borderRadius={radius.lg} height={220} style={styles.detailPhoto} />
          </SectionBand>
          <SectionBand style={styles.aboutSection}>
            <Skeleton height={16} width={132} />
            <SkeletonText lastLineWidth="68%" lines={4} />
          </SectionBand>
          <SectionBand style={styles.tagsSection}>
            <Skeleton height={16} width={98} />
            <View style={styles.tagRow}>
              <SkeletonChip height={32} width={92} />
              <SkeletonChip height={32} width={110} />
              <SkeletonChip height={32} width={84} />
            </View>
          </SectionBand>
          <SectionBand style={styles.historySection}>
            <Skeleton height={16} width={76} />
            <View style={styles.reviewCard}>
              <Skeleton height={16} width="62%" />
              <Skeleton height={12} width="78%" />
            </View>
          </SectionBand>
          <SectionBand style={styles.historySection}>
            <Skeleton height={16} width={188} />
            <View style={styles.serviceList}>
              {Array.from({ length: 2 }).map((_, index) => (
                <View key={index} style={styles.servicePreviewCard}>
                  <Skeleton height={16} width="64%" />
                  <SkeletonText lastLineWidth="72%" lineHeight={12} lines={2} />
                  <View style={styles.servicePreviewMeta}>
                    <SkeletonChip height={32} width={92} />
                    <SkeletonChip height={32} width={112} />
                  </View>
                </View>
              ))}
            </View>
          </SectionBand>
        </ScrollView>
        <DetailActionRow
          bottomInset={bottomInset}
          cta={{ disabled: false, helper: null, label: 'Message worker', reason: 'available' }}
          isLoading
          messaging={false}
          onMessage={() => undefined}
        />
      </View>
    </SafeAreaView>
  );
}

function DetailHeader({
  onBack,
  onMore,
  isLoading = false,
}: {
  onBack: () => void;
  onMore: () => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.header}>
        <Skeleton height={24} width={24} borderRadius={12} />
        <Skeleton height={20} width={120} />
        <Skeleton height={24} width={24} borderRadius={12} />
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
      </Pressable>
      <Text style={styles.headerTitle}>Worker Profile</Text>
      <Pressable
        accessibilityLabel="More options"
        accessibilityRole="button"
        onPress={onMore}
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.textSubtle} name="more-horiz" size={20} />
      </Pressable>
    </View>
  );
}

function WorkerProfileHero({
  availabilityText,
  jobsDoneText,
  name,
  location,
  ratingText,
  serviceTitle,
  isLoading = false,
}: {
  availabilityText: string;
  jobsDoneText: string;
  name: string;
  location: string;
  ratingText: string;
  serviceTitle: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <SectionBand style={styles.workerInfoSection}>
        <View style={styles.heroRow}>
          <SkeletonAvatar dotSize={10} size={56} />

          <View style={styles.heroCopy}>
            <Skeleton height={18} width="54%" />
            <Skeleton height={16} width="72%" />
            <View style={styles.heroLocationRow}>
              <Skeleton height={12} width={14} borderRadius={7} />
              <Skeleton height={12} width="42%" />
            </View>
          </View>
        </View>

        <View style={styles.heroMetrics}>
          <View style={styles.heroMetric}>
            <Skeleton height={12} width="82%" />
          </View>
          <View style={styles.heroMetric}>
            <Skeleton height={12} width="76%" />
          </View>
          <View style={styles.heroMetric}>
            <Skeleton height={12} width="88%" />
          </View>
        </View>
      </SectionBand>
    );
  }

  return (
    <SectionBand style={styles.workerInfoSection}>
      <View style={styles.heroRow}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{getInitials(name)}</Text>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroService} numberOfLines={2}>
            {serviceTitle}
          </Text>
          <View style={styles.heroLocationRow}>
            <MaterialIcons color={color.primary} name="location-on" size={14} />
            <Text style={styles.heroLocationText}>{location}</Text>
          </View>
        </View>
      </View>

      <View style={styles.heroMetrics}>
        <HeroMetric icon="star-border" label={ratingText} tint="yellow" />
        <HeroMetric icon="check-circle" label={jobsDoneText} />
        <HeroMetric icon="schedule" label={availabilityText} />
      </View>
    </SectionBand>
  );
}

function HeroMetric({
  icon,
  label,
  tint = 'default',
}: {
  icon: MaterialIconName;
  label: string;
  tint?: 'default' | 'yellow';
}) {
  return (
    <View style={styles.heroMetric}>
      <MaterialIcons color={tint === 'yellow' ? color.brandYellow : color.textSubtle} name={icon} size={16} />
      <Text numberOfLines={1} style={styles.heroMetricText}>
        {label}
      </Text>
    </View>
  );
}

function MatchNoticeCard({
  title,
  body,
  isLoading = false,
}: {
  title: string;
  body: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.matchCard}>
        <Skeleton height={16} width="52%" />
        <SkeletonText lastLineWidth="74%" lineHeight={12} lines={2} />
      </View>
    );
  }

  return (
    <View style={styles.matchCard}>
      <Text style={styles.matchTitle}>{title}</Text>
      <Text style={styles.matchBody}>{body}</Text>
    </View>
  );
}

function WorkerMetricGrid({
  metrics,
  isLoading = false,
}: {
  metrics: { label: string; value: string }[];
  isLoading?: boolean;
}) {
  return (
    <View style={styles.metricGrid}>
      {isLoading
        ? Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={styles.metricCell}>
              <Skeleton height={12} width="42%" />
              <Skeleton height={14} width="74%" />
            </View>
          ))
        : metrics.map((metric) => (
            <View key={metric.label} style={styles.metricCell}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
            </View>
          ))}
    </View>
  );
}

function ServicePreviewCard({ service }: { service: ProviderService }) {
  const displayCategory = getDisplayLabelForMvpService(service.category) || service.category;
  const displayTitle =
    service.category === 'Basic home repair' && service.title === 'Basic home repair help'
      ? 'Minor home fix support'
      : service.title;

  return (
    <View style={styles.servicePreviewCard}>
      <Text style={styles.servicePreviewTitle}>{displayTitle}</Text>
      <Text style={styles.servicePreviewBody}>{service.description || displayCategory}</Text>
      <View style={styles.servicePreviewMeta}>
        <BadgePill icon="construction" label={displayCategory} />
        <BadgePill icon="location-on" label={getMarketplaceLocation(service)} />
      </View>
    </View>
  );
}

function DetailActionRow({
  bottomInset,
  cta,
  messaging,
  onMessage,
  isLoading = false,
}: {
  bottomInset: number;
  cta: ReturnType<typeof getWorkerMessageCta>;
  messaging: boolean;
  onMessage: () => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <View style={[styles.actionRow, { paddingBottom: 12 + Math.max(bottomInset, 12) }]}>
        <Skeleton height={12} width="92%" />
        <SkeletonChip height={46} width="100%" />
      </View>
    );
  }

  return (
    <View style={[styles.actionRow, { paddingBottom: 12 + Math.max(bottomInset, 12) }]}>
      <Text style={styles.boundaryNote}>
        Rate is for coordination. Payment and final agreement happen outside Konektado.
      </Text>
      {cta.helper ? <Text style={styles.actionHelper}>{cta.helper}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={messaging || cta.disabled}
        onPress={onMessage}
        style={({ pressed }) => [
          styles.messageButton,
          pressed && !messaging && !cta.disabled && styles.pressed,
          (messaging || cta.disabled) && styles.disabled,
        ]}>
        <MaterialIcons
          color={cta.disabled ? color.textSubtle : color.verificationBlue}
          name="chat-bubble"
          size={18}
        />
        <Text style={[styles.messageButtonText, cta.disabled && styles.disabledButtonText]}>
          {messaging ? 'Opening...' : cta.label}
        </Text>
      </Pressable>
    </View>
  );
}

function SectionBand({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.sectionBand, style]}>{children}</View>;
}

function BadgePill({
  icon,
  label,
  tone = 'default',
}: {
  icon: MaterialIconName;
  label: string;
  tone?: 'default' | 'success';
}) {
  return (
    <View style={[styles.badgePill, tone === 'success' && styles.badgePillSuccess]}>
      <MaterialIcons
        color={tone === 'success' ? color.success : color.textMuted}
        name={icon}
        size={16}
      />
      <Text style={[styles.badgePillText, tone === 'success' && styles.badgePillTextSuccess]}>
        {label}
      </Text>
    </View>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'K';
}

function getWorkerMessageCta({
  allowMessages,
  availabilityText,
  isActive,
  isOwnService,
  isVerified,
}: {
  allowMessages: boolean;
  availabilityText: string | null;
  isActive: boolean;
  isOwnService: boolean;
  isVerified: boolean;
}) {
  if (isOwnService) {
    return {
      disabled: true,
      helper: 'You cannot message yourself from your own service.',
      label: 'This is your service',
      reason: 'own',
    };
  }

  if (!isActive) {
    return {
      disabled: true,
      helper: 'This service is not currently available.',
      label: 'Worker unavailable',
      reason: 'inactive',
    };
  }

  if (!allowMessages) {
    return {
      disabled: true,
      helper: 'This worker is not accepting new messages from this service.',
      label: 'Messages unavailable',
      reason: 'messages_off',
    };
  }

  if (!isVerified) {
    return {
      disabled: false,
      helper: 'Complete barangay verification to message workers and clients.',
      label: 'Verify to message',
      reason: 'verification',
    };
  }

  return {
    disabled: false,
    helper: isUnavailableAvailability(availabilityText) ? 'Ask about next availability in Messages.' : null,
    label: 'Message worker',
    reason: 'available',
  };
}

function isUnavailableAvailability(value: string | null) {
  return Boolean(value?.match(/\b(unavailable|not available|away|paused)\b/i));
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  screen: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 2,
  },
  header: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 55,
    paddingHorizontal: 24,
  },
  headerButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  headerTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  sectionBand: {
    backgroundColor: color.background,
    width: '100%',
  },
  workerInfoSection: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  matchSection: {
    paddingHorizontal: 18,
    paddingVertical: 19,
  },
  skillsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailsSection: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  photoSection: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  aboutSection: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tagsSection: {
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  historySection: {
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heroRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
  },
  heroAvatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  heroAvatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  heroName: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  heroService: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  heroLocationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  heroLocationText: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  heroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroMetric: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    maxWidth: '100%',
  },
  heroMetricText: {
    color: color.textSubtle,
    flexShrink: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  badgePill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
    minHeight: 28,
    paddingHorizontal: 10,
  },
  badgePillSuccess: {
    backgroundColor: color.successSoft,
    borderColor: color.success,
  },
  badgePillText: {
    color: color.text,
    flexShrink: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  badgePillTextSuccess: {
    color: color.text,
  },
  matchCard: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 14,
    width: '100%',
  },
  matchTitle: {
    color: '#050505',
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  matchBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  sectionTitle: {
    color: '#050505',
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  bodyText: {
    ...typography.body,
    color: color.textMuted,
  },
  serviceRateRow: {
    gap: 12,
    marginTop: 12,
  },
  selectedServiceTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  servicePill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  servicePillText: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  ratePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: color.white,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
  },
  ratePillText: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  metricGrid: {
    columnGap: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    rowGap: 12,
  },
  metricCell: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 132,
  },
  metricLabel: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
  },
  metricValue: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  detailPhoto: {
    backgroundColor: color.cardTint,
    borderRadius: radius.lg,
    height: 210,
    width: '100%',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: 13,
    minHeight: 27,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  tagText: {
    color: '#42474C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
  },
  reviewCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  reviewTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  reviewBody: {
    ...typography.body,
    color: color.textMuted,
  },
  serviceList: {
    gap: 10,
  },
  servicePreviewCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  servicePreviewTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  servicePreviewBody: {
    ...typography.body,
    color: color.textMuted,
  },
  servicePreviewMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionRow: {
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 13,
  },
  boundaryNote: {
    ...typography.caption,
    color: color.textMuted,
  },
  actionHelper: {
    ...typography.caption,
    color: color.textSubtle,
  },
  messageButton: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 34,
  },
  messageButtonText: {
    color: color.verificationBlue,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  disabledButtonText: {
    color: color.textSubtle,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.55,
  },
});
