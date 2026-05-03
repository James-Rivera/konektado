import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { listProfileReviews } from '@/services/review.service';
import { searchServices } from '@/services/service-profile.service';
import type { Review, ServiceSearchResult } from '@/types/marketplace.types';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function WorkerDetailScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  const params = useLocalSearchParams<{ workerId?: string | string[] }>();
  const rawWorkerId = getParamValue(params.workerId);
  const [workerServices, setWorkerServices] = useState<ServiceSearchResult[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!rawWorkerId) {
      setLoading(false);
      return;
    }

    Promise.all([searchServices(), listProfileReviews(rawWorkerId)]).then(
      ([serviceResult, reviewResult]) => {
        if (!active) return;

        if (serviceResult.error || !serviceResult.data) {
          Alert.alert('Worker profile', serviceResult.error ?? 'Could not load worker services.');
        } else {
          setWorkerServices(serviceResult.data.filter((service) => service.providerId === rawWorkerId));
        }

        if (!reviewResult.error && reviewResult.data) {
          setReviews(reviewResult.data);
        }

        setLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [rawWorkerId]);

  const worker = workerServices[0] ?? null;

  const showComingSoon = (label: string) => {
    Alert.alert(label, 'This will open from Worker Profile in a later slice.');
  };

  const handleMessage = () => {
    if (!isVerified) {
      router.push('/verification');
      return;
    }

    showComingSoon('Message');
  };

  const handleSave = () => {
    if (!isVerified) {
      router.push('/verification');
      return;
    }

    showComingSoon('Save');
  };

  if (!worker) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.screen}>
          <Header onBack={() => router.back()} onMore={() => showComingSoon('Options')} />
          <View style={styles.emptyWrap}>
            <EmptyState
              actionLabel="Go back"
              description={loading ? 'Loading worker details.' : 'This worker profile is no longer available.'}
              icon="person-search"
              onActionPress={() => router.back()}
              title={loading ? 'Loading worker' : 'Worker not found'}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <Header onBack={() => router.back()} onMore={() => showComingSoon('Options')} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(worker.provider?.fullName ?? 'Worker')}</Text>
              {worker.provider?.barangayVerifiedAt || worker.provider?.verifiedAt ? <View style={styles.avatarBadge} /> : null}
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.name}>{worker.provider?.fullName ?? 'Konektado worker'}</Text>
              <Text style={styles.service}>{worker.title}</Text>
              <Text style={styles.location}>
                {[worker.provider?.barangay, worker.provider?.city].filter(Boolean).join(', ') || 'Nearby'}
              </Text>
            </View>

            <View style={styles.pillRow}>
              {worker.provider?.barangayVerifiedAt || worker.provider?.verifiedAt ? (
                <BadgePill icon="verified" label="Verified resident" tone="success" />
              ) : null}
              {reviews.length ? <BadgePill icon="star" label={`${averageRating(reviews)} rating`} /> : null}
              {reviews.length ? (
                <BadgePill icon="check-circle" label={`${reviews.length} reviews`} />
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <MetaRow icon="schedule" text={worker.availabilityText ?? 'Availability to coordinate'} />
            {worker.rateText ? (
              <MetaRow icon="payments" text={worker.rateText} tint="primary" />
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this worker</Text>
            <Text style={styles.bodyText}>{worker.provider?.about ?? worker.title}</Text>
            {worker.description ? <Text style={styles.bodyText}>{worker.description}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.tagWrap}>
              {workerServices.map((service) => (
                <View key={service.id} style={styles.tagPill}>
                  <Text style={styles.tagText}>{service.title}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work history</Text>
            {reviews.length ? (
              reviews.map((review) => (
                <HistoryRow
                  detail={review.comment ?? `${review.rating} star review`}
                  key={review.id}
                  title={review.reviewer?.fullName ?? 'Konektado resident'}
                />
              ))
            ) : (
              <HistoryRow detail="Reviews appear after completed jobs." title="No reviews yet" />
            )}
          </View>
        </ScrollView>

        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button"
            onPress={handleMessage}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
            <MaterialIcons color={color.primary} name="chat-bubble" size={16} />
            <Text style={styles.primaryActionText}>Message</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleSave}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
            <MaterialIcons color={color.textSubtle} name="bookmark-border" size={18} />
            <Text style={styles.secondaryActionText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Header({ onBack, onMore }: { onBack: () => void; onMore: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={styles.headerIcon}>
        <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
      </Pressable>
      <Text style={styles.headerTitle}>Worker Profile</Text>
      <Pressable
        accessibilityLabel="More options"
        accessibilityRole="button"
        onPress={onMore}
        style={styles.headerIcon}>
        <MaterialIcons color={color.textSubtle} name="more-vert" size={20} />
      </Pressable>
    </View>
  );
}

function MetaRow({
  icon,
  text,
  tint = 'subtle',
}: {
  icon: MaterialIconName;
  text: string;
  tint?: 'subtle' | 'primary';
}) {
  return (
    <View style={styles.metaRow}>
      <MaterialIcons color={color.primary} name={icon} size={16} />
      <Text style={[styles.metaText, tint === 'primary' && styles.metaTextPrimary]}>{text}</Text>
    </View>
  );
}

function BadgePill({
  icon,
  label,
  tone = 'primary',
}: {
  icon: MaterialIconName;
  label: string;
  tone?: 'primary' | 'success';
}) {
  const iconColor = tone === 'success' ? color.success : color.primary;

  return (
    <View style={[styles.badgePill, tone === 'success' && styles.badgePillSuccess]}>
      <MaterialIcons color={iconColor} name={icon} size={14} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function HistoryRow({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyIcon}>
        <MaterialIcons color={color.textMuted} name="work-outline" size={18} />
      </View>
      <View style={styles.historyCopy}>
        <Text style={styles.historyTitle}>{title}</Text>
        <Text style={styles.historyDetail}>{detail}</Text>
      </View>
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

function averageRating(reviews: Review[]) {
  const value = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
  return value.toFixed(1);
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
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space['2xl'],
    paddingVertical: space.md,
  },
  headerIcon: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  headerTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
    color: color.text,
  },
  content: {
    paddingBottom: space['3xl'],
  },
  heroSection: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space['2xl'],
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 78,
    justifyContent: 'center',
    width: 78,
  },
  avatarText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 24,
    lineHeight: 30,
    color: color.primary,
  },
  avatarBadge: {
    backgroundColor: color.success,
    borderColor: color.background,
    borderRadius: radius.pill,
    borderWidth: 3,
    bottom: 4,
    height: 18,
    position: 'absolute',
    right: 4,
    width: 18,
  },
  heroCopy: {
    alignItems: 'center',
    gap: space.xs,
  },
  name: {
    ...typography.screenTitle,
    color: color.text,
    textAlign: 'center',
  },
  service: {
    ...typography.bodyMedium,
    color: color.textMuted,
    textAlign: 'center',
  },
  location: {
    ...typography.caption,
    color: color.textSubtle,
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'center',
  },
  section: {
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  bodyText: {
    ...typography.body,
    color: color.textMuted,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  metaText: {
    ...typography.caption,
    color: color.textSubtle,
  },
  metaTextPrimary: {
    fontFamily: 'Satoshi-Bold',
    color: color.primary,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  tagPill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: space.md,
  },
  tagText: {
    ...typography.captionMedium,
    color: color.textSubtle,
  },
  badgePill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: '#D6E8FF',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 24,
    paddingHorizontal: space.sm,
  },
  badgePillSuccess: {
    backgroundColor: color.successSoft,
    borderColor: color.success,
  },
  badgeText: {
    ...typography.captionMedium,
    color: color.text,
  },
  historyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  historyIcon: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  historyCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  historyTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  historyDetail: {
    ...typography.caption,
    color: color.textMuted,
  },
  actionBar: {
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    paddingBottom: space.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.lg,
  },
  primaryActionText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.lg,
  },
  secondaryActionText: {
    ...typography.captionMedium,
    color: color.textSubtle,
  },
  pressed: {
    opacity: 0.72,
  },
  emptyWrap: {
    flex: 1,
    padding: space.lg,
  },
});
