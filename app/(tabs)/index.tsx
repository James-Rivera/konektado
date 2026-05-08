import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    HomeFilterPill,
    HomeFilterTabs,
    HomeSectionHeader,
    HomeSetupChecklist,
    HomeTopHeader,
} from '@/components/home/HomeDashboardUI';
import { HomeFeedCard, type HomeFeedCardProps } from '@/components/home/HomeFeedCard';
import { Skeleton } from '@/components/Skeleton';
import { homeFilters, type HomeFilter } from '@/constants/demo-data';
import { getDisplayLabelForMvpService } from '@/constants/service-taxonomy';
import { color, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useSafeTopInset } from '@/hooks/use-safe-top-inset';
import {
  compactText,
  formatClientJobsPostedText,
  formatClientRatingText,
  formatJobPostTitle,
  formatRelativeMarketplaceDate,
  formatServiceJobsDoneText,
  formatServicePostTitle,
  formatServiceRatingText,
  getPublicProfileAvatarUrl,
  getMarketplaceLocation,
  isPresenceActive,
} from '@/services/marketplace.helpers';
import { searchJobs } from '@/services/job.service';
import { getMyUserPreferences } from '@/services/onboarding.service';
import { searchServices } from '@/services/service-profile.service';
import { getMyVerificationPrefill } from '@/services/verification.service';
import {
  buildHomeForYouFeed,
  getDefaultHomeFilter,
  rankHomeFeedJobs,
  rankHomeFeedWorkers,
} from '@/services/home-feed.service';
import type { JobSummary, ServiceSearchResult } from '@/types/marketplace.types';
import type { UserPreferences } from '@/types/onboarding.types';

type HomeJobFeedItem = {
  key: string;
  type: 'job';
  itemId: string;
  cardProps: HomeFeedCardProps;
  createdAt: string;
  job: JobSummary;
};

type HomeWorkerFeedItem = {
  key: string;
  type: 'worker';
  itemId: string;
  cardProps: HomeFeedCardProps;
  createdAt: string;
  service: ServiceSearchResult;
};

type HomeFeedItem = HomeJobFeedItem | HomeWorkerFeedItem;

const HOME_FEED_LIMIT = 30;

function formatBudgetText(amount: number | null) {
  if (!amount) return 'Budget to coordinate';
  return `PHP ${amount.toLocaleString('en-PH')}`;
}

function mapJobToHomeFeedCard(job: JobSummary): HomeFeedCardProps {
  const category = compactText(job.category) || 'Job';
  const serviceNeeded = compactText(job.serviceNeeded);
  const displayServiceNeeded = compactText(getDisplayLabelForMvpService(job.serviceNeeded));
  const schedule = compactText(job.scheduleText) || 'Schedule to coordinate';
  const posterName = compactText(job.client?.fullName) || 'Konektado resident';
  const displayCategory = displayServiceNeeded || category;

  return {
    kind: 'job',
    name: posterName,
    label: 'Posted a job',
    postedAt: formatRelativeMarketplaceDate(job.createdAt).replace(/^Posted /, ''),
    detailLine: `${formatBudgetText(job.budgetAmount)} - ${schedule}`,
    title: formatJobPostTitle({
      title: job.title,
      serviceNeeded: displayServiceNeeded || job.serviceNeeded,
      category: displayCategory,
      cue: serviceNeeded ? 'needHelpWith' : 'lookingFor',
    }),
    description: job.description || 'No description provided yet.',
    meta: [
      { icon: 'star-border', text: formatClientRatingText(job) },
      { icon: 'work', text: formatClientJobsPostedText(job) },
      { icon: 'location-on', text: getMarketplaceLocation(job) },
    ],
    tags: Array.from(
      new Set(
        [displayCategory, displayServiceNeeded, ...job.tags.map((tag) => getDisplayLabelForMvpService(tag) || tag)].filter(Boolean),
      ),
    ),
    primaryActionLabel: 'View Job',
    avatarUrl: job.client?.avatarUrl,
    imageUrl: job.photoUrls[0],
    isOnline: isPresenceActive(job.client?.availability),
  };
}

function mapServiceToHomeFeedCard(service: ServiceSearchResult): HomeFeedCardProps {
  const category = compactText(getDisplayLabelForMvpService(service.category)) || compactText(service.category) || 'Service';
  const serviceTitle =
    service.category === 'Basic home repair' && compactText(service.title) === 'Basic home repair help'
      ? 'Minor home fix support'
      : compactText(service.title) || category;
  const providerName = compactText(service.provider?.fullName) || 'Konektado resident';
  const availability = compactText(service.availabilityText) || 'Available to coordinate';

  return {
    kind: 'worker',
    name: providerName,
    label: 'Posted a service',
    postedAt: formatRelativeMarketplaceDate(service.createdAt).replace(/^Posted /, ''),
    detailLine: `${compactText(service.rateText) || 'Rate to coordinate'} - ${availability}`,
    title: formatServicePostTitle({
      title: serviceTitle,
      category: service.category,
      cue: service.isActive ? 'availableFor' : 'offers',
    }),
    description:
      service.description && compactText(service.description) !== serviceTitle
        ? service.description
        : '',
    meta: [
      { icon: 'star-border', text: formatServiceRatingText(service) },
      { icon: 'check-circle', text: formatServiceJobsDoneText(service, service.completedJobsCount) },
      { icon: 'location-on', text: getMarketplaceLocation(service) },
    ],
    tags: Array.from(new Set([category, ...service.tags.map((tag) => getDisplayLabelForMvpService(tag) || tag)].filter(Boolean))),
    primaryActionLabel: 'View Profile',
    avatarUrl: getPublicProfileAvatarUrl(service.provider),
    imageUrl: service.photoUrls[0],
    isOnline: isPresenceActive(service.isActive && (service.availabilityText || service.provider?.availability || true)),
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { profile, loading: profileLoading } = useProfile();
  const topInset = useSafeTopInset();
  const [selectedFilter, setSelectedFilter] = useState<HomeFilter>('For you');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [feedSources, setFeedSources] = useState<{ jobs: HomeJobFeedItem[]; workers: HomeWorkerFeedItem[] }>({
    jobs: [],
    workers: [],
  });
  const [feedLoading, setFeedLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<
    'none' | 'pending' | 'rejected' | 'needs_more_info' | 'approved'
  >('none');
  const [verificationNote, setVerificationNote] = useState<string | null>(null);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const verificationKnown = !profileLoading;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerHeightRef = useRef(0);
  const headerVisibleRef = useRef(true);
  const lastScrollOffset = useRef(0);
  const feedRequestRef = useRef(0);

  useEffect(() => {
    let active = true;

    getMyUserPreferences().then((result) => {
      if (!active || result.error) return;
      setPreferences(result.data);
      setSelectedFilter(
        getDefaultHomeFilter({
          activeRole: profile?.active_role,
          preferences: result.data,
        }),
      );
    });

    return () => {
      active = false;
    };
  }, [profile?.active_role]);

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

  const showSetupBanner = verificationKnown && !isVerified && verificationStatus !== 'approved' && !bannerDismissed;

  useEffect(() => {
    let active = true;

    if (!isFocused) {
      return () => {
        active = false;
      };
    }

    const requestId = feedRequestRef.current + 1;
    feedRequestRef.current = requestId;
    setFeedLoading(true);

    Promise.all([
      searchJobs({ limit: HOME_FEED_LIMIT }),
      searchServices({ limit: HOME_FEED_LIMIT }),
    ]).then(([jobsResult, servicesResult]) => {
      if (!active || requestId !== feedRequestRef.current) return;

      const jobs =
        jobsResult.data?.map((job) => ({
          key: `job-${job.id}`,
          type: 'job' as const,
          itemId: job.id,
          cardProps: mapJobToHomeFeedCard(job),
          createdAt: job.createdAt,
          job,
        })) ?? [];

      const workers =
        servicesResult.data?.map((service) => ({
          key: `service-${service.id}`,
          type: 'worker' as const,
          itemId: service.id,
          cardProps: mapServiceToHomeFeedCard(service),
          createdAt: service.createdAt,
          service,
        })) ?? [];

      setFeedSources({ jobs, workers });
      setFeedLoading(false);
    }).catch(() => {
      if (!active || requestId !== feedRequestRef.current) return;
      setFeedLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isFocused, profile?.id]);

  const feedVariants = useMemo(() => {
    const rankingContext = {
      activeRole: profile?.active_role,
      city: profile?.city,
      preferences,
      userBarangay: profile?.barangay,
    };
    const jobCandidates = feedSources.jobs.map((item) => ({ item, job: item.job }));
    const workerCandidates = feedSources.workers.map((item) => ({ item, service: item.service }));
    const jobs = rankHomeFeedJobs(jobCandidates, rankingContext);
    const workers = rankHomeFeedWorkers(workerCandidates, rankingContext);

    return {
      Jobs: jobs,
      Workers: workers,
      'For you': buildHomeForYouFeed({
        context: rankingContext,
        jobs: jobCandidates,
        workers: workerCandidates,
      }),
    };
  }, [feedSources, preferences, profile?.active_role, profile?.barangay, profile?.city]);

  const feed = feedVariants[selectedFilter];

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

  const openVerification = useCallback(() => {
    router.push('/verification');
  }, [router]);

  const openJob = useCallback((jobId: string) => {
    router.push({ pathname: '/job/[jobId]', params: { jobId } });
  }, [router]);

  const openService = useCallback((serviceId: string, variant: 'default' | 'match') => {
    router.push({ pathname: '/services/[serviceId]', params: { serviceId, variant } });
  }, [router]);

  const showPlaceholder = useCallback((label: string) => {
    Alert.alert(label, 'This part of Home will be connected in a later slice.');
  }, []);

  const keyExtractor = useCallback((item: HomeFeedItem) => item.key, []);

  const renderFeedItem = useCallback(
    ({ item }: { item: HomeFeedItem }) => (
      <FeedCard
        feedItem={item}
        onOpenJob={openJob}
        onOpenService={openService}
        workerVariant={selectedFilter === 'Workers' ? 'default' : 'match'}
      />
    ),
    [openJob, openService, selectedFilter],
  );

  const renderListHeader = useCallback(
    () => (
      <>
        {!verificationKnown ? (
          <VerificationBannerSkeleton />
        ) : showSetupBanner ? (
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
      </>
    ),
    [
      openVerification,
      showPlaceholder,
      showSetupBanner,
      verificationKnown,
      verificationNote,
      verificationStatus,
    ],
  );

  const renderListFooter = useCallback(
    () => (
      <>
        {feedLoading ? (
          <View style={styles.skeletonFeed}>
            <HomeFeedCardSkeleton kind={selectedFilter === 'Workers' ? 'worker' : 'job'} loadingImage />
            <HomeFeedCardSkeleton kind={selectedFilter === 'Workers' ? 'worker' : 'job'} />
            {selectedFilter === 'For you' ? <HomeFeedCardSkeleton kind="worker" loadingImage /> : null}
          </View>
        ) : null}
        {!feedLoading && !feed.length ? <Text style={styles.emptyText}>No posts to show yet.</Text> : null}
      </>
    ),
    [feed.length, feedLoading, selectedFilter],
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <Animated.View
          onLayout={handleHeaderLayout}
          style={[styles.headerStack, { transform: [{ translateY: headerTranslateY }] }]}>
          <HomeTopHeader onNotifications={() => showPlaceholder('Notifications')} topInset={topInset} />
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

        <FlatList
          contentContainerStyle={[styles.content, { paddingTop: headerHeight }]}
          data={feed}
          ItemSeparatorComponent={FeedSeparator}
          keyExtractor={keyExtractor}
          ListFooterComponent={renderListFooter}
          ListHeaderComponent={renderListHeader}
          onScroll={handleScroll}
          renderItem={renderFeedItem}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}

function FeedSeparator() {
  return <View style={styles.feedSeparator} />;
}

const FeedCard = memo(function FeedCard({
  feedItem,
  onOpenJob,
  onOpenService,
  workerVariant,
}: {
  feedItem: HomeFeedItem;
  onOpenJob: (jobId: string) => void;
  onOpenService: (serviceId: string, variant: 'default' | 'match') => void;
  workerVariant: 'default' | 'match';
}) {
  if (feedItem.type === 'worker') {
    return (
      <HomeFeedCard
        {...feedItem.cardProps}
        onPress={() => onOpenService(feedItem.itemId, workerVariant)}
        onPrimaryAction={() => onOpenService(feedItem.itemId, workerVariant)}
      />
    );
  }

  return (
    <HomeFeedCard
      {...feedItem.cardProps}
      onPress={() => onOpenJob(feedItem.itemId)}
      onPrimaryAction={() => onOpenJob(feedItem.itemId)}
    />
  );
});

function VerificationBannerSkeleton() {
  return (
    <View style={styles.bannerSkeleton}>
      <View style={styles.bannerSkeletonHeader}>
        <Skeleton height={24} width={24} borderRadius={12} />
        <View style={styles.bannerSkeletonCopy}>
          <Skeleton height={15} width="64%" />
          <Skeleton height={12} width="92%" />
        </View>
      </View>
      <Skeleton height={34} width="100%" borderRadius={17} />
    </View>
  );
}

function HomeFeedCardSkeleton({
  kind,
  loadingImage = false,
}: {
  kind: HomeFeedCardProps['kind'];
  loadingImage?: boolean;
}) {
  return (
    <HomeFeedCard
      description=""
      isLoading
      kind={kind}
      label=""
      loadingImage={loadingImage}
      meta={[]}
      name=""
      postedAt=""
      primaryActionLabel={kind === 'worker' ? 'View Profile' : 'View Job'}
      tags={[]}
      title=""
    />
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
  feedSeparator: {
    backgroundColor: color.screenBackground,
    height: 2,
  },
  skeletonFeed: {
    gap: 2,
  },
  bannerSkeleton: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    margin: 18,
    padding: 16,
  },
  bannerSkeletonHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  bannerSkeletonCopy: {
    flex: 1,
    gap: 8,
  },
  emptyText: {
    ...typography.body,
    color: color.textMuted,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
});
