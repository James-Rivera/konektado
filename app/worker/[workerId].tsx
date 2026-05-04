import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Skeleton, SkeletonCircle, SkeletonText } from '@/components/Skeleton';
import { color, radius, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { getMarketplaceLocation } from '@/services/marketplace.helpers';
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

  const handleLockedAction = (label: string) => {
    if (!isVerified) {
      router.push('/verification');
      return;
    }

    showPlaceholder(label);
  };

  const serviceMetrics = useMemo(() => {
    if (!detail) return [];

    return [
      { label: 'Availability', value: detail.availabilityText || 'Schedule to coordinate' },
      {
        label: 'Experience',
        value: detail.yearsExperience ? `${detail.yearsExperience} years` : 'Experience to coordinate',
      },
      {
        label: 'Reviews',
        value:
          detail.reviewCount > 0 && detail.averageRating
            ? `${detail.averageRating.toFixed(1)} from ${detail.reviewCount}`
            : 'Reviews coming soon',
      },
      {
        label: 'Jobs completed',
        value: detail.completedJobsCount ? String(detail.completedJobsCount) : '0',
      },
    ];
  }, [detail]);

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
  const verificationText =
    detail.provider?.barangayVerifiedAt || detail.provider?.verifiedAt
      ? 'Verified resident'
      : 'Konektado resident';
  const location = getMarketplaceLocation(detail);
  const serviceTags = Array.from(new Set([detail.category, ...detail.tags].filter(Boolean)));
  const serviceLabels = Array.from(
    new Set(detail.providerServices.map((service) => service.category || service.title).filter(Boolean)),
  );

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
            location={location}
            name={providerName}
            verificationText={verificationText}
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
            <WorkerMetricGrid metrics={serviceMetrics} />
          </SectionBand>

          <SectionBand style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>About this service</Text>
            <Text style={styles.bodyText}>{detail.description || detail.title}</Text>
            <View style={styles.tagRow}>
              {serviceTags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </SectionBand>

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
          onMessage={() => handleLockedAction('Message')}
          onSave={() => handleLockedAction('Save')}
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
  name,
  location,
  verificationText,
}: {
  name: string;
  location: string;
  verificationText: string;
}) {
  return (
    <SectionBand style={styles.workerInfoSection}>
      <View style={styles.heroRow}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{getInitials(name)}</Text>
          <View style={styles.heroAvatarBadge} />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroName}>{name}</Text>
          <View style={styles.heroLocationRow}>
            <MaterialIcons color={color.primary} name="location-on" size={14} />
            <Text style={styles.heroLocationText}>{location}</Text>
          </View>
        </View>

        <BadgePill icon="verified" label={verificationText} tone="success" />
      </View>
    </SectionBand>
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
  onMessage,
  onSave,
}: {
  bottomInset: number;
  onMessage: () => void;
  onSave: () => void;
}) {
  return (
    <View style={[styles.actionRow, { paddingBottom: 12 + Math.max(bottomInset, 12) }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onMessage}
        style={({ pressed }) => [styles.messageButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.verificationBlue} name="chat-bubble" size={18} />
        <Text style={styles.messageButtonText}>Message</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  aboutSection: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  historySection: {
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heroRow: {
    alignItems: 'center',
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
    position: 'relative',
    width: 44,
  },
  heroAvatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  heroAvatarBadge: {
    backgroundColor: color.brandYellow,
    borderColor: color.white,
    borderRadius: radius.pill,
    borderWidth: 2,
    bottom: 0,
    height: 10,
    position: 'absolute',
    right: 0,
    width: 10,
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
});
