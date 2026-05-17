import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { getPublicClientProfile } from '@/services/client-profile.service';
import {
  formatJobBudget,
  getMarketplaceLocation,
} from '@/services/marketplace.helpers';
import type { JobSummary, PublicClientProfile } from '@/types/marketplace.types';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function PublicClientProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string | string[] }>();
  const clientId = getParamValue(params.clientId);
  const [profile, setProfile] = useState<PublicClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!clientId) {
      setLoading(false);
      setError('Client profile not found.');
      return;
    }

    setLoading(true);
    setError(null);
    getPublicClientProfile(clientId).then((result) => {
      if (!active) return;

      if (result.error) {
        setError(result.error);
        setProfile(null);
      } else {
        setProfile(result.data);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [clientId]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <Text style={styles.headerTitle}>Client Profile</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? <PublicClientProfileSkeleton /> : null}

          {!loading && error ? (
            <EmptyState
              description={error}
              icon="person-search"
              title="Could not load client profile"
            />
          ) : null}

          {!loading && !error && !profile ? (
            <EmptyState
              description="This client profile is no longer available."
              icon="person-search"
              title="Client not found"
            />
          ) : null}

          {profile ? (
            <>
              <ClientHero profile={profile} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Client activity</Text>
                <View style={styles.metricGrid}>
                  <Metric
                    icon="work"
                    label="Jobs posted"
                    value={formatJobsPostedText(profile.jobsPostedCount)}
                  />
                  <Metric
                    icon="star-border"
                    label="Reviews"
                    value={formatRatingText(profile.averageRating, profile.reviewCount)}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active job posts</Text>
                {profile.activeJobs.length ? (
                  <View style={styles.jobList}>
                    {profile.activeJobs.map((job) => (
                      <PublicJobRow
                        job={job}
                        key={job.id}
                        onPress={() =>
                          router.push({ pathname: '/job/[jobId]', params: { jobId: job.id } })
                        }
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.helperText}>No active public job posts right now.</Text>
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ClientHero({ profile }: { profile: PublicClientProfile }) {
  const verified = Boolean(profile.barangayVerifiedAt || profile.verifiedAt);

  return (
    <View style={styles.hero}>
      <View style={styles.avatar}>
        {profile.avatarUrl ? (
          <Image resizeMode="cover" source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{getInitials(profile.fullName)}</Text>
        )}
      </View>
      <View style={styles.heroCopy}>
        <Text style={styles.name}>{profile.fullName}</Text>
        <View style={styles.locationRow}>
          <MaterialIcons color={color.textMuted} name="location-on" size={16} />
          <Text style={styles.locationText}>{profile.publicLocation}</Text>
        </View>
      </View>
      {verified ? (
        <View style={styles.verifiedPill}>
          <MaterialIcons color={color.primary} name="verified" size={16} />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      ) : null}
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <MaterialIcons color={icon === 'star-border' ? color.brandYellow : color.primary} name={icon} size={18} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function PublicJobRow({ job, onPress }: { job: JobSummary; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.jobRow, pressed && styles.pressed]}>
      <View style={styles.jobCopy}>
        <Text numberOfLines={2} style={styles.jobTitle}>
          {job.title}
        </Text>
        <Text numberOfLines={1} style={styles.jobMeta}>
          {formatJobBudget(job)} · {getMarketplaceLocation(job)}
        </Text>
      </View>
      <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} />
    </Pressable>
  );
}

function PublicClientProfileSkeleton() {
  return (
    <View style={styles.skeletonStack}>
      <View style={styles.hero}>
        <Skeleton borderRadius={32} height={64} width={64} />
        <View style={styles.heroCopy}>
          <Skeleton height={18} width="48%" />
          <Skeleton height={14} width="58%" />
        </View>
      </View>
      <Skeleton height={18} width={120} />
      <View style={styles.metricGrid}>
        <Skeleton borderRadius={radius.lg} height={92} width="48%" />
        <Skeleton borderRadius={radius.lg} height={92} width="48%" />
      </View>
      <Skeleton height={18} width={136} />
      <Skeleton borderRadius={radius.lg} height={76} width="100%" />
      <Skeleton borderRadius={radius.lg} height={76} width="100%" />
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

function formatJobsPostedText(count: number) {
  if (count > 0) return `${count} job${count === 1 ? '' : 's'} posted`;
  return 'No posted-job history yet';
}

function formatRatingText(averageRating: number | null, reviewCount: number) {
  if (averageRating && reviewCount > 0) return `${averageRating.toFixed(1)} rating`;
  return 'No reviews yet';
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
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: space.lg,
  },
  headerIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  content: {
    gap: space.xl,
    padding: space.xl,
    paddingBottom: 120,
  },
  hero: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 64,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 22,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  name: {
    ...typography.screenTitle,
    color: color.text,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  locationText: {
    ...typography.body,
    color: color.textMuted,
    flexShrink: 1,
  },
  verifiedPill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
  },
  verifiedText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  section: {
    gap: space.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: space.md,
  },
  metricCard: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 92,
    padding: space.md,
  },
  metricLabel: {
    ...typography.caption,
    color: color.textMuted,
  },
  metricValue: {
    ...typography.bodyMedium,
    color: color.text,
  },
  jobList: {
    gap: space.sm,
  },
  jobRow: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
  },
  jobCopy: {
    flex: 1,
    gap: 4,
  },
  jobTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  jobMeta: {
    ...typography.caption,
    color: color.textMuted,
  },
  helperText: {
    ...typography.body,
    color: color.textMuted,
  },
  pressed: {
    opacity: 0.78,
  },
  skeletonStack: {
    gap: space.md,
  },
});
