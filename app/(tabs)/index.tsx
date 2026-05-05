import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    HomeFilterPill,
    HomeFilterTabs,
    HomeSearchBar,
    HomeSectionHeader,
    HomeSetupChecklist,
    HomeTopHeader,
} from '@/components/home/HomeDashboardUI';
import { JobCard } from '@/components/JobCard';
import { WorkerCard } from '@/components/WorkerCard';
import { Skeleton, SkeletonCircle } from '@/components/Skeleton';
import { homeFilters, type HomeFilter } from '@/constants/demo-data';
import { color, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useSafeTopInset } from '@/hooks/use-safe-top-inset';
import {
  adaptJobToCardProps,
  adaptServiceToCardProps,
} from '@/services/marketplace.helpers';
import { searchJobs } from '@/services/job.service';
import { getMyUserPreferences } from '@/services/onboarding.service';
import { searchServices } from '@/services/service-profile.service';
import { getMyVerificationPrefill } from '@/services/verification.service';
import type { UserPreferences } from '@/types/onboarding.types';
import type { JobCardProps } from '@/components/JobCard';
import type { WorkerCardProps } from '@/components/WorkerCard';

type HomeFeedItem =
  | {
      key: string;
      type: 'worker';
      itemId: string;
      cardProps: WorkerCardProps;
      createdAt: string;
      scoreText: string;
    }
  | {
      key: string;
      type: 'job';
      itemId: string;
      cardProps: JobCardProps;
      createdAt: string;
      scoreText: string;
    };

function getDefaultFilter(preferences: UserPreferences | null): HomeFilter {
  if (preferences?.intent === 'provider') return 'Jobs';
  if (preferences?.intent === 'client') return 'Workers';
  return 'For you';
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getPreferenceTerms(preferences: UserPreferences | null) {
  if (!preferences) return [];

  return Array.from(
    new Set(
      [
        ...preferences.offeredServices,
        ...preferences.customOfferedServices,
        ...preferences.neededServices,
        ...preferences.customNeededServices,
      ]
        .map(normalizeSearchText)
        .filter(Boolean),
    ),
  );
}

function getFreshnessScore(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return 0;

  const ageHours = Math.max(0, (Date.now() - createdTime) / 3600000);
  return Math.max(0, 3 - Math.min(3, ageHours / 24));
}

function scoreFeedItem(item: HomeFeedItem, preferences: UserPreferences | null) {
  const terms = getPreferenceTerms(preferences);
  const haystack = normalizeSearchText(item.scoreText);
  const intentBoost =
    preferences?.intent === 'provider'
      ? item.type === 'job'
        ? 4
        : 1
      : preferences?.intent === 'client'
        ? item.type === 'worker'
          ? 4
          : 1
        : 2;

  const matchScore = terms.reduce((score, term) => {
    if (haystack.includes(term)) return score + 8;

    const words = term.split(' ').filter((word) => word.length >= 4);
    return score + words.filter((word) => haystack.includes(word)).length * 3;
  }, 0);

  const localScore = haystack.includes('barangay san pedro') || haystack.includes('near your barangay') ? 2 : 0;

  return intentBoost + matchScore + localScore + getFreshnessScore(item.createdAt);
}

function sortByFeedScore(items: HomeFeedItem[], preferences: UserPreferences | null) {
  return [...items].sort((left, right) => {
    const scoreDiff = scoreFeedItem(right, preferences) - scoreFeedItem(left, preferences);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function getOptionalScore(item: HomeFeedItem | undefined, preferences: UserPreferences | null) {
  return item ? scoreFeedItem(item, preferences) : Number.NEGATIVE_INFINITY;
}

function buildForYouFeed(
  jobs: HomeFeedItem[],
  workers: HomeFeedItem[],
  preferences: UserPreferences | null,
) {
  const jobQueue = sortByFeedScore(jobs, preferences);
  const workerQueue = sortByFeedScore(workers, preferences);
  const mixed: HomeFeedItem[] = [];
  let nextType: HomeFeedItem['type'] =
    getOptionalScore(workerQueue[0], preferences) > getOptionalScore(jobQueue[0], preferences)
      ? 'worker'
      : 'job';

  while (jobQueue.length || workerQueue.length) {
    const preferredQueue = nextType === 'job' ? jobQueue : workerQueue;
    const fallbackQueue = nextType === 'job' ? workerQueue : jobQueue;
    const nextItem = preferredQueue.shift() ?? fallbackQueue.shift();

    if (!nextItem) break;

    mixed.push(nextItem);
    nextType = nextItem.type === 'job' ? 'worker' : 'job';
  }

  return mixed;
}

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { profile } = useProfile();
  const topInset = useSafeTopInset();
  const [selectedFilter, setSelectedFilter] = useState<HomeFilter>('For you');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [feed, setFeed] = useState<HomeFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<
    'none' | 'pending' | 'rejected' | 'needs_more_info' | 'approved'
  >('none');
  const [verificationNote, setVerificationNote] = useState<string | null>(null);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerHeightRef = useRef(0);
  const headerVisibleRef = useRef(true);
  const lastScrollOffset = useRef(0);

  useEffect(() => {
    let active = true;

    getMyUserPreferences().then((result) => {
      if (!active || result.error) return;
      setPreferences(result.data);
      setSelectedFilter(getDefaultFilter(result.data));
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getMyVerificationPrefill().then((result) => {
      if (!active || result.error || !result.data) return;

      const latest = result.data.latestRequest;
      if (!latest) {
        setVerificationStatus('none');
        setVerificationNote(null);
        return;
      }

      if (
        latest.status === 'pending' ||
        latest.status === 'approved' ||
        latest.status === 'rejected' ||
        latest.status === 'needs_more_info'
      ) {
        setVerificationStatus(latest.status);
      } else {
        setVerificationStatus('none');
      }
      setVerificationNote(latest.reviewerNote ?? null);
    });

    return () => {
      active = false;
    };
  }, [isVerified]);

  const showSetupBanner = !isVerified && verificationStatus !== 'approved' && !bannerDismissed;

  useEffect(() => {
    let active = true;

    if (!isFocused) {
      return () => {
        active = false;
      };
    }

    setFeedLoading(true);

    Promise.all([searchJobs(), searchServices()]).then(([jobsResult, servicesResult]) => {
      if (!active) return;

      const jobs =
        jobsResult.data?.map((job) => ({
          key: `job-${job.id}`,
          type: 'job' as const,
          itemId: job.id,
          cardProps: adaptJobToCardProps(job),
          createdAt: job.createdAt,
          scoreText: [
            job.title,
            job.description,
            job.category,
            job.serviceNeeded,
            job.scheduleText,
            job.locationText,
            job.barangay,
            ...job.tags,
          ]
            .filter(Boolean)
            .join(' '),
        })) ?? [];

      const workers =
        servicesResult.data?.map((service) => ({
          key: `service-${service.id}`,
          type: 'worker' as const,
          itemId: service.id,
          cardProps: adaptServiceToCardProps(service),
          createdAt: service.createdAt,
          scoreText: [
            service.title,
            service.description,
            service.category,
            service.availabilityText,
            service.rateText,
            service.locationText,
            service.barangay,
            service.provider?.availability,
            ...service.tags,
          ]
            .filter(Boolean)
            .join(' '),
        })) ?? [];

      if (selectedFilter === 'Jobs') {
        setFeed(sortByFeedScore(jobs, preferences));
      } else if (selectedFilter === 'Workers') {
        setFeed(sortByFeedScore(workers, preferences));
      } else {
        setFeed(buildForYouFeed(jobs, workers, preferences));
      }

      setFeedLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isFocused, preferences, selectedFilter]);

  const setHeaderVisible = (visible: boolean) => {
    if (!headerHeightRef.current) return;
    if (headerVisibleRef.current === visible) return;
    headerVisibleRef.current = visible;

    Animated.timing(headerTranslateY, {
      toValue: visible ? 0 : -headerHeightRef.current,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleHeaderLayout = (event: { nativeEvent: { layout: { height: number } } }) => {
    const height = Math.round(event.nativeEvent.layout.height);
    if (!height || height === headerHeightRef.current) return;
    headerHeightRef.current = height;
    setHeaderHeight(height);
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offset = event.nativeEvent.contentOffset.y;
    const delta = offset - lastScrollOffset.current;

    if (offset <= 0 || offset < 24) {
      setHeaderVisible(true);
      lastScrollOffset.current = offset;
      return;
    }

    if (Math.abs(delta) < 6) {
      lastScrollOffset.current = offset;
      return;
    }

    setHeaderVisible(delta < 0);
    lastScrollOffset.current = offset;
  };

  const openVerification = () => {
    router.push('/verification');
  };

  const openJob = (jobId: string) => {
    router.push({ pathname: '/job/[jobId]', params: { jobId } });
  };

  const openWorker = (workerId: string, variant: 'default' | 'match') => {
    router.push({ pathname: '/worker/[workerId]', params: { workerId, variant } });
  };

  const showPlaceholder = (label: string) => {
    Alert.alert(label, 'This part of Home will be connected in a later slice.');
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <Animated.View
          onLayout={handleHeaderLayout}
          style={[styles.headerStack, { transform: [{ translateY: headerTranslateY }] }]}>
          <HomeTopHeader onNotifications={() => showPlaceholder('Notifications')} topInset={topInset} />
          <HomeSearchBar
            onPress={() =>
              router.push({
                pathname: '/(tabs)/search',
                params: { filter: selectedFilter },
              })
            }
          />
          <HomeFilterTabs>
            {homeFilters.map((filter) => (
              <HomeFilterPill
                key={filter}
                label={filter}
                onPress={() => setSelectedFilter(filter)}
                selected={selectedFilter === filter}
              />
            ))}
          </HomeFilterTabs>
        </Animated.View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: headerHeight }]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          {showSetupBanner ? (
            <HomeSetupChecklist
              status={verificationStatus}
              note={verificationNote}
              onAddPhoto={() => showPlaceholder('Add photo')}
              onAddServices={() => showPlaceholder('Add services')}
              onDismiss={() => setBannerDismissed(true)}
              onVerify={openVerification}
            />
          ) : null}
          <HomeSectionHeader onFilterPress={() => showPlaceholder('Filters')} />
          <View style={styles.feed}>
            {feed.map((feedItem) => (
              <FeedCard
                key={feedItem.key}
                feedItem={feedItem}
                isVerified={isVerified}
                onOpenJob={openJob}
                onOpenWorker={openWorker}
                onOpenVerification={openVerification}
                workerVariant={selectedFilter === 'Workers' ? 'default' : 'match'}
              />
            ))}
          </View>
          {feedLoading ? (
            <View style={styles.skeletonFeed}>
              {selectedFilter === 'Workers' ? (
                <>
                  <WorkerCardSkeleton />
                  <WorkerCardSkeleton />
                </>
              ) : selectedFilter === 'Jobs' ? (
                <>
                  <JobCardSkeleton />
                  <JobCardSkeleton />
                </>
              ) : (
                <>
                  <WorkerCardSkeleton />
                  <JobCardSkeleton />
                  <JobCardSkeleton />
                </>
              )}
            </View>
          ) : null}
          {!feedLoading && !feed.length ? <Text style={styles.emptyText}>No posts to show yet.</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function FeedCard({
  feedItem,
  isVerified,
  onOpenJob,
  onOpenWorker,
  onOpenVerification,
  workerVariant,
}: {
  feedItem: HomeFeedItem;
  isVerified: boolean;
  onOpenJob: (jobId: string) => void;
  onOpenWorker: (workerId: string, variant: 'default' | 'match') => void;
  onOpenVerification: () => void;
  workerVariant: 'default' | 'match';
}) {
  if (feedItem.type === 'worker') {
    return (
      <WorkerCard
        {...feedItem.cardProps}
        onPress={() => onOpenWorker(feedItem.itemId, workerVariant)}
        onSave={isVerified ? undefined : onOpenVerification}
        onViewProfile={() => onOpenWorker(feedItem.itemId, workerVariant)}
      />
    );
  }

  return (
    <JobCard
      {...feedItem.cardProps}
      onMessage={isVerified ? undefined : onOpenVerification}
      onPress={() => onOpenJob(feedItem.itemId)}
      onSave={isVerified ? undefined : onOpenVerification}
      onViewJob={() => onOpenJob(feedItem.itemId)}
    />
  );
}

function WorkerCardSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.workerSkeletonHeader}>
        <View style={styles.workerSkeletonIdentity}>
          <SkeletonCircle size={44} />
          <View style={styles.workerSkeletonCopy}>
            <Skeleton height={16} width="58%" />
            <Skeleton height={12} width="76%" />
          </View>
        </View>
        <Skeleton height={28} width={28} borderRadius={14} />
      </View>
      <Skeleton height={12} width="46%" />
      <Skeleton height={18} width="88%" />
      <View style={styles.skeletonTagRow}>
        <Skeleton height={27} width={76} borderRadius={13} />
        <Skeleton height={27} width={84} borderRadius={13} />
        <Skeleton height={27} width={68} borderRadius={13} />
      </View>
      <View style={styles.skeletonMetaRow}>
        <Skeleton height={12} width={76} />
        <Skeleton height={12} width={84} />
        <Skeleton height={12} width={96} />
      </View>
    </View>
  );
}

function JobCardSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <Skeleton height={12} width="22%" />
      <View style={styles.jobSkeletonHeader}>
        <View style={styles.jobSkeletonCopy}>
          <Skeleton height={16} width="72%" />
          <Skeleton height={12} width="66%" />
        </View>
        <Skeleton height={28} width={28} borderRadius={14} />
      </View>
      <Skeleton height={18} width="92%" />
      <View style={styles.skeletonTagRow}>
        <Skeleton height={27} width={72} borderRadius={13} />
        <Skeleton height={27} width={90} borderRadius={13} />
        <Skeleton height={27} width={78} borderRadius={13} />
      </View>
      <View style={styles.skeletonMetaRow}>
        <Skeleton height={12} width={78} />
        <Skeleton height={12} width={88} />
        <Skeleton height={12} width={102} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  safeArea: {
    backgroundColor: color.screenBackground,
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
  content: {
    paddingBottom: space.md,
  },
  feed: {
    backgroundColor: color.screenBackground,
    gap: 2,
  },
  skeletonFeed: {
    gap: 2,
  },
  skeletonCard: {
    backgroundColor: color.background,
    gap: 18,
    padding: 16,
  },
  workerSkeletonHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workerSkeletonIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  workerSkeletonCopy: {
    flex: 1,
    gap: 6,
  },
  jobSkeletonHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jobSkeletonCopy: {
    flex: 1,
    gap: 6,
  },
  skeletonTagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyText: {
    ...typography.body,
    color: color.textMuted,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
});
