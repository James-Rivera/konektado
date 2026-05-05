import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Skeleton, SkeletonCircle, SkeletonText } from '@/components/Skeleton';
import { color, radius, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { startServiceConversation } from '@/services/conversation.service';
import {
  formatServiceJobsDoneText,
  formatServiceRatingText,
  getMarketplaceLocation,
} from '@/services/marketplace.helpers';
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

export default function WorkerDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  const params = useLocalSearchParams<{
    workerId?: string | string[]; // service id for the public worker/service card
    variant?: string | string[];
  }>();
  const serviceId = getParamValue(params.workerId);
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

  const handleSave = () => {
    if (!isVerified) {
      router.push('/verification');
      return;
    }

    showPlaceholder('Save');
  };

  const handleMessage = () => {
    if (!isVerified) {
      router.push('/verification');
      return;
    }

    if (!detail) return;

    setMessaging(true);
    startServiceConversation({
      serviceId: detail.id,
      message: `Hi, I am interested in your ${detail.category.toLowerCase()} service. Are you available?`,
    }).then((result) => {
      setMessaging(false);

      if (result.error || !result.data) {
        Alert.alert('Message', result.error ?? 'Could not open the conversation.');
        return;
      }

      router.push({
        pathname: '/conversation/[conversationId]',
        params: { conversationId: result.data.id },
      });
    });
  };

  if (loading) {
    return <WorkerDetailSkeleton />;
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
  const serviceTags = Array.from(new Set([detail.category, ...detail.tags].filter(Boolean)));
  const serviceLabels = Array.from(
    new Set(detail.providerServices.map((service) => service.category || service.title).filter(Boolean)),
  );
  const ratingText = formatServiceRatingText(detail);
  const jobsDoneText = formatServiceJobsDoneText(detail, detail.completedJobsCount);
  const jobsCompletedValue = detail.completedJobsCount
    ? String(detail.completedJobsCount)
    : String(getFallbackCount(detail.id, 3, 14));
  const hoursWorkedText = `${Number(jobsCompletedValue) * 4} hrs`;
  const serviceImageUrl = detail.photoUrls?.[0] ?? null;

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
            serviceTitle={detail.title || detail.category}
          />

          {variant === 'match' ? (
            <SectionBand style={styles.matchSection}>
              <MatchNoticeCard
                body={`Matches your search for ${detail.category.toLowerCase()} help near ${location}.`}
                title="Why this worker fits"
              />
            </SectionBand>
          ) : null}

          <SectionBand style={styles.skillsSection}>
            <Text style={styles.sectionTitle}>Services and rate</Text>
            <View style={styles.serviceRateRow}>
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
            <Text style={styles.sectionTitle}>Worker details</Text>
            <WorkerMetricGrid
              metrics={[
                { label: 'Location', value: location },
                { label: 'Jobs completed', value: jobsCompletedValue },
                { label: 'Availability', value: detail.availabilityText || 'Schedule to coordinate' },
                { label: 'Hours worked', value: hoursWorkedText },
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
            <Text style={styles.bodyText}>{detail.description || detail.title}</Text>
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
                  : 'Reviews will show here after completed jobs'}
              </Text>
              <Text style={styles.reviewBody}>
                Full public review history stays minimal in this MVP slice, but the real provider and service record are now live.
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
          messaging={messaging}
          onMessage={handleMessage}
          onSave={handleSave}
        />
      </View>
    </SafeAreaView>
  );
}

function WorkerDetailSkeleton() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Skeleton height={24} width={24} borderRadius={12} />
          <Skeleton height={20} width={120} />
          <Skeleton height={24} width={24} borderRadius={12} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SectionBand style={styles.workerInfoSection}>
            <View style={styles.heroRow}>
              <SkeletonCircle size={44} />
              <View style={styles.heroCopy}>
                <Skeleton height={16} width="60%" />
                <Skeleton height={12} width="46%" />
              </View>
              <Skeleton height={28} width={110} borderRadius={radius.pill} />
            </View>
          </SectionBand>
          <SectionBand style={styles.skillsSection}>
            <Skeleton height={16} width={120} />
            <SkeletonText lines={3} />
          </SectionBand>
          <SectionBand style={styles.detailsSection}>
            <Skeleton height={16} width={110} />
            <SkeletonText lines={4} />
          </SectionBand>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function DetailHeader({ onBack, onMore }: { onBack: () => void; onMore: () => void }) {
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
}: {
  availabilityText: string;
  jobsDoneText: string;
  name: string;
  location: string;
  ratingText: string;
  serviceTitle: string;
}) {
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

function MatchNoticeCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.matchCard}>
      <Text style={styles.matchTitle}>{title}</Text>
      <Text style={styles.matchBody}>{body}</Text>
    </View>
  );
}

function WorkerMetricGrid({ metrics }: { metrics: { label: string; value: string }[] }) {
  return (
    <View style={styles.metricGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricCell}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text style={styles.metricValue}>{metric.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ServicePreviewCard({ service }: { service: ProviderService }) {
  return (
    <View style={styles.servicePreviewCard}>
      <Text style={styles.servicePreviewTitle}>{service.title}</Text>
      <Text style={styles.servicePreviewBody}>{service.description || service.category}</Text>
      <View style={styles.servicePreviewMeta}>
        <BadgePill icon="construction" label={service.category} />
        <BadgePill icon="location-on" label={getMarketplaceLocation(service)} />
      </View>
    </View>
  );
}

function DetailActionRow({
  bottomInset,
  messaging,
  onMessage,
  onSave,
}: {
  bottomInset: number;
  messaging: boolean;
  onMessage: () => void;
  onSave: () => void;
}) {
  return (
    <View style={[styles.actionRow, { paddingBottom: 12 + Math.max(bottomInset, 12) }]}>
      <Pressable
        accessibilityRole="button"
        disabled={messaging}
        onPress={onMessage}
        style={({ pressed }) => [styles.messageButton, pressed && styles.pressed, messaging && styles.disabled]}>
        <MaterialIcons color={color.verificationBlue} name="chat-bubble" size={18} />
        <Text style={styles.messageButtonText}>{messaging ? 'Opening...' : 'Message'}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onSave}
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.textSubtle} name="bookmark-border" size={18} />
        <Text style={styles.saveButtonText}>Save</Text>
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
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getFallbackCount(seed: string, min: number, max: number) {
  const stableNumber = Array.from(seed).reduce((total, character) => total + character.charCodeAt(0), 0);
  return min + (stableNumber % (max - min + 1));
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
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 13,
  },
  messageButton: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flex: 1,
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
  saveButton: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 34,
  },
  saveButtonText: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
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
