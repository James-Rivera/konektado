import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobCard } from '@/components/JobCard';
import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import { WorkerCard } from '@/components/WorkerCard';
import { homeFilters } from '@/constants/demo-data';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { searchJobs } from '@/services/job.service';
import { getMyUserPreferences } from '@/services/onboarding.service';
import { searchServices } from '@/services/service-profile.service';
import type { JobSummary, ServiceSearchResult } from '@/types/marketplace.types';
import type { UserPreferences } from '@/types/onboarding.types';

type FeedItem =
  | { key: string; type: 'job'; item: JobSummary }
  | { key: string; type: 'worker'; item: ServiceSearchResult };

function scoreText(values: (string | null | undefined)[], preferences: UserPreferences | null) {
  if (!preferences) return 0;

  const preferenceTerms = [
    ...preferences.neededServices,
    ...preferences.offeredServices,
    ...preferences.customNeededServices,
    ...preferences.customOfferedServices,
  ].map((value) => value.toLowerCase());

  return values.reduce((score, value) => {
    const normalizedTag = value?.toLowerCase() ?? '';
    return preferenceTerms.some(
      (term) => normalizedTag.includes(term) || term.includes(normalizedTag),
    )
      ? score + 1
      : score;
  }, 0);
}

function getDefaultFilter(preferences: UserPreferences | null) {
  if (preferences?.intent === 'provider') return 'Jobs';
  if (preferences?.intent === 'client') return 'Workers';
  return 'For you';
}

export default function HomeScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState(homeFilters[0]);
  const [userSelectedFilter, setUserSelectedFilter] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [services, setServices] = useState<ServiceSearchResult[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [showSetupCard, setShowSetupCard] = useState(true);
  const [headerStackHeight, setHeaderStackHeight] = useState(0);
  const { profile } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const intent = preferences?.intent;
  const needsFinishSetup =
    !isVerified && intent === 'provider' && !profile?.service_type?.trim();
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerStackHeightRef = useRef(0);
  const lastScrollOffset = useRef(0);
  const headerVisibleRef = useRef(true);

  useEffect(() => {
    let active = true;

    getMyUserPreferences().then((result) => {
      if (!active || result.error) return;
      setPreferences(result.data);
      if (!userSelectedFilter) {
        setSelectedFilter(getDefaultFilter(result.data));
      }
    });

    return () => {
      active = false;
    };
  }, [userSelectedFilter]);

  useEffect(() => {
    let active = true;

    Promise.all([searchJobs(), searchServices()]).then(([jobResult, serviceResult]) => {
      if (!active) return;

      if (jobResult.error || !jobResult.data) {
        Alert.alert('Home', jobResult.error);
      } else {
        setJobs(jobResult.data);
      }

      if (serviceResult.error || !serviceResult.data) {
        Alert.alert('Home', serviceResult.error);
      } else {
        setServices(serviceResult.data);
      }

      setLoadingFeed(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const feedItems = useMemo<FeedItem[]>(() => {
    const sortedJobs = [...jobs].sort(
      (left, right) =>
        scoreText([right.title, right.description, right.category], preferences) -
        scoreText([left.title, left.description, left.category], preferences),
    );
    const sortedWorkers = [...services].sort(
      (left, right) =>
        scoreText([right.title, right.description, right.category], preferences) -
        scoreText([left.title, left.description, left.category], preferences),
    );

    if (selectedFilter === 'Jobs') {
      return sortedJobs.map((job) => ({ key: `job-${job.id}`, type: 'job', item: job }));
    }

    if (selectedFilter === 'Workers') {
      return sortedWorkers.map((worker) => ({
        key: `worker-${worker.id}`,
        type: 'worker',
        item: worker,
      }));
    }

    const mixed: FeedItem[] = [];
    const maxItems = Math.max(sortedJobs.length, sortedWorkers.length);

    for (let index = 0; index < maxItems; index += 1) {
      const job = sortedJobs[index];
      const worker = sortedWorkers[index];

      if (job) {
        mixed.push({ key: `job-${job.id}`, type: 'job', item: job });
      }

      if (worker) {
        mixed.push({ key: `worker-${worker.id}`, type: 'worker', item: worker });
      }
    }

    return mixed;
  }, [jobs, preferences, selectedFilter, services]);

  const showVerificationPrompt = () => {
    router.push('/verification');
  };

  const showSetupPrompt = (label: string) => {
    Alert.alert(label, 'This setup step will open from Profile or Verification in a later slice.');
  };

  const openJobDetails = (job: JobSummary) => {
    router.push({ pathname: '/job/[jobId]', params: { jobId: job.id } });
  };

  const openWorkerDetails = (worker: ServiceSearchResult) => {
    router.push({ pathname: '/worker/[workerId]', params: { workerId: worker.providerId } });
  };

  const handleFilterPress = (filter: string) => {
    setUserSelectedFilter(true);
    setSelectedFilter(filter);
  };

  const handleHeaderStackLayout = (event: { nativeEvent: { layout: { height: number } } }) => {
    if (headerStackHeightRef.current) return;
    const height = Math.round(event.nativeEvent.layout.height);
    if (!height) return;
    headerStackHeightRef.current = height;
    setHeaderStackHeight(height);
  };

  const setHeaderVisible = (visible: boolean) => {
    if (!headerStackHeightRef.current) return;
    if (headerVisibleRef.current === visible) return;
    headerVisibleRef.current = visible;
    Animated.timing(headerTranslateY, {
      toValue: visible ? 0 : -headerStackHeightRef.current,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offset = event.nativeEvent.contentOffset.y;
    const delta = offset - lastScrollOffset.current;

    if (offset <= 0) {
      setHeaderVisible(true);
      lastScrollOffset.current = offset;
      return;
    }

    if (offset < 24) {
      setHeaderVisible(true);
      lastScrollOffset.current = offset;
      return;
    }

    if (Math.abs(delta) < 6) {
      lastScrollOffset.current = offset;
      return;
    }

    if (delta > 0) {
      setHeaderVisible(false);
    } else if (delta < 0) {
      setHeaderVisible(true);
    }

    lastScrollOffset.current = offset;
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Animated.View
          onLayout={handleHeaderStackLayout}
          style={[styles.headerStack, { transform: [{ translateY: headerTranslateY }] }]}>
          <View style={styles.topHeader}>
            <View style={styles.headerContent}>
              <KonektadoWordmark color="dark" size="small" />
              <Pressable
                accessibilityLabel="Notifications"
                accessibilityRole="button"
                onPress={() => showSetupPrompt('Notifications')}
                style={styles.notificationButton}>
                <MaterialIcons color={color.primary} name="notifications" size={24} />
              </Pressable>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Pressable
              accessibilityRole="search"
              onPress={() => showSetupPrompt('Search')}
              style={styles.searchBar}>
              <Text style={styles.searchPlaceholder}>Search nearby jobs or workers</Text>
              <MaterialIcons color={color.primary} name="search" size={24} />
            </Pressable>
          </View>

          <View style={styles.filterBand}>
            {homeFilters.map((filter) => (
              <FilterPill
                key={filter}
                label={filter}
                onPress={() => handleFilterPress(filter)}
                selected={selectedFilter === filter}
              />
            ))}
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: headerStackHeight }]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          {!isVerified && showSetupCard ? (
            needsFinishSetup ? (
              <FinishSetupCard
                onAddPhoto={() => showSetupPrompt('Add photo')}
                onAddServices={() => showSetupPrompt('Add Services')}
                onDismiss={() => setShowSetupCard(false)}
                onVerify={showVerificationPrompt}
              />
            ) : (
              <VerificationBanner
                onDismiss={() => setShowSetupCard(false)}
                onVerify={showVerificationPrompt}
              />
            )
          ) : null}

          <SectionHeader onFilterPress={() => showSetupPrompt('Filters')} />

          <View style={styles.stack}>
            {loadingFeed ? <Text style={styles.feedStatus}>Loading nearby posts...</Text> : null}
            {!loadingFeed && !feedItems.length ? (
              <Text style={styles.feedStatus}>No open jobs or active services yet.</Text>
            ) : null}
            {feedItems.map((feedItem) =>
              feedItem.type === 'job' ? (
                <JobCard
                  key={feedItem.key}
                  budget={formatBudget(feedItem.item.budgetAmount)}
                  description={feedItem.item.description ?? 'No description provided yet.'}
                  location={feedItem.item.locationText ?? feedItem.item.barangay ?? 'Nearby'}
                  postedAt={formatDate(feedItem.item.createdAt)}
                  postedBy={feedItem.item.client?.fullName ?? 'Konektado resident'}
                  schedule={feedItem.item.scheduleText ?? 'Schedule to coordinate'}
                  tags={[feedItem.item.category, feedItem.item.barangay].filter(Boolean) as string[]}
                  title={feedItem.item.title}
                  onMessage={isVerified ? () => openJobDetails(feedItem.item) : showVerificationPrompt}
                  onSave={isVerified ? () => showSetupPrompt('Save') : showVerificationPrompt}
                  onViewJob={() => openJobDetails(feedItem.item)}
                />
              ) : (
                <WorkerCard
                  key={feedItem.key}
                  availability={feedItem.item.availabilityText ?? 'Availability to coordinate'}
                  budgetHint={feedItem.item.rateText ?? undefined}
                  completedJobs={
                    feedItem.item.reviewCount ? `${feedItem.item.reviewCount} reviews` : undefined
                  }
                  description={feedItem.item.description ?? undefined}
                  headline={feedItem.item.provider?.about ?? undefined}
                  location={
                    [feedItem.item.provider?.barangay, feedItem.item.provider?.city]
                      .filter(Boolean)
                      .join(', ') || 'Nearby'
                  }
                  name={feedItem.item.provider?.fullName ?? 'Konektado worker'}
                  rating={feedItem.item.averageRating ? `${feedItem.item.averageRating.toFixed(1)} rating` : undefined}
                  serviceTitle={feedItem.item.title}
                  tags={[feedItem.item.category]}
                  verified={Boolean(feedItem.item.provider?.barangayVerifiedAt || feedItem.item.provider?.verifiedAt)}
                  onMessage={
                    isVerified
                      ? () => Alert.alert('Service messages', 'Service request messaging is deferred for this MVP slice.')
                      : showVerificationPrompt
                  }
                  onSave={isVerified ? () => showSetupPrompt('Save') : showVerificationPrompt}
                  onViewProfile={() => openWorkerDetails(feedItem.item)}
                />
              ),
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function formatBudget(value: number | null) {
  if (value === null) return undefined;
  return `PHP ${value.toLocaleString('en-PH')}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function VerificationBanner({
  onDismiss,
  onVerify,
}: {
  onDismiss: () => void;
  onVerify: () => void;
}) {
  return (
    <View style={styles.setupBand}>
      <View style={styles.verificationCard}>
        <Pressable
          accessibilityLabel="Start verification"
          accessibilityRole="button"
          onPress={onVerify}
          style={({ pressed }) => [styles.verificationContent, pressed && styles.pressed]}>
          <MaterialIcons color={color.primary} name="warning-amber" size={22} />
          <View style={styles.verificationCopy}>
            <Text style={styles.verificationTitle}>Complete verification to build trust faster.</Text>
            <Text style={styles.verificationMessage}>
              Submit your barangay information to unlock trust cues.
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityLabel="Dismiss verification reminder"
          accessibilityRole="button"
          onPress={onDismiss}
          style={styles.dismissButton}>
          <Text style={styles.dismissText}>x</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FinishSetupCard({
  onAddPhoto,
  onAddServices,
  onDismiss,
  onVerify,
}: {
  onAddPhoto: () => void;
  onAddServices: () => void;
  onDismiss: () => void;
  onVerify: () => void;
}) {
  return (
    <View style={styles.setupBand}>
      <View style={styles.setupCard}>
        <View style={styles.setupHeader}>
          <View style={styles.setupCopy}>
            <Text style={styles.setupEyebrow}>Build trust faster</Text>
            <Text style={styles.setupTitle}>Finish Setup</Text>
          </View>
          <Pressable
            accessibilityLabel="Dismiss setup card"
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.dismissButton}>
            <Text style={styles.dismissText}>x</Text>
          </Pressable>
        </View>
        <Text style={styles.setupDescription}>
          Complete these so people feel safer contacting you.
        </Text>
        <View style={styles.setupActions}>
          <SetupPill label="Verify Yourself" onPress={onVerify} selected />
          <SetupPill label="Add services" onPress={onAddServices} />
          <SetupPill label="Add photo" onPress={onAddPhoto} />
        </View>
      </View>
    </View>
  );
}

function SetupPill({
  label,
  onPress,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.setupPill,
        selected && styles.setupPillSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.setupPillText, selected && styles.setupPillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function FilterPill({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterPill,
        selected && styles.filterPillSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SectionHeader({ onFilterPress }: { onFilterPress: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Latest in your barangay</Text>
      <Pressable
        accessibilityLabel="Feed filters"
        accessibilityRole="button"
        onPress={onFilterPress}
        style={styles.feedFilterButton}>
        <MaterialIcons color={color.primary} name="tune" size={22} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  safeArea: {
    backgroundColor: color.background,
    flex: 1,
  },
  headerStack: {
    backgroundColor: color.background,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  topHeader: {
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    paddingBottom: space.md,
    paddingHorizontal: space['2xl'],
    paddingTop: space.sm,
  },
  headerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  notificationButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  content: {
    backgroundColor: color.background,
    paddingBottom: space['3xl'],
  },
  searchContainer: {
    backgroundColor: color.background,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: space.md,
  },
  searchPlaceholder: {
    ...typography.caption,
    color: color.textSubtle,
    flex: 1,
  },
  setupBand: {
    backgroundColor: color.background,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  setupCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space.lg,
  },
  setupHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setupCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  setupEyebrow: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 16,
    color: color.text,
  },
  setupTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  verificationCard: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  verificationContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: space.md,
  },
  verificationCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  verificationTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  verificationMessage: {
    ...typography.caption,
    color: color.textMuted,
  },
  dismissButton: {
    alignItems: 'center',
    backgroundColor: color.primary,
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  dismissText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 18,
  },
  setupDescription: {
    ...typography.caption,
    color: color.textMuted,
  },
  setupActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  setupPill: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: space.md,
  },
  setupPillSelected: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  setupPillText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 14,
    color: color.textMuted,
  },
  setupPillTextSelected: {
    color: color.primary,
  },
  filterBand: {
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  filterPill: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 81,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  filterPillSelected: {
    backgroundColor: '#F5F5EF',
    borderColor: color.primary,
  },
  filterText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  filterTextSelected: {
    color: color.primary,
  },
  sectionHeader: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  feedFilterButton: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  stack: {
    gap: 0,
  },
  feedStatus: {
    ...typography.body,
    color: color.textMuted,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
