import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
    getHomeFeed,
    homeFilters,
    type HomeFeedItem,
    type HomeFilter,
} from '@/constants/demo-data';
import { color, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useSafeTopInset } from '@/hooks/use-safe-top-inset';
import { getMyUserPreferences } from '@/services/onboarding.service';
import type { UserPreferences } from '@/types/onboarding.types';

function getDefaultFilter(preferences: UserPreferences | null): HomeFilter {
  if (preferences?.intent === 'provider') return 'Jobs';
  if (preferences?.intent === 'client') return 'Workers';
  return 'For you';
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const topInset = useSafeTopInset();
  const [selectedFilter, setSelectedFilter] = useState<HomeFilter>('For you');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerHeightRef = useRef(0);
  const headerVisibleRef = useRef(true);
  const lastScrollOffset = useRef(0);

  useEffect(() => {
    let active = true;

    getMyUserPreferences().then((result) => {
      if (!active || result.error) return;
      setSelectedFilter(getDefaultFilter(result.data));
    });

    return () => {
      active = false;
    };
  }, []);

  const feed = useMemo(() => getHomeFeed(selectedFilter), [selectedFilter]);

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
          {!isVerified && !bannerDismissed ? (
            <HomeSetupChecklist
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
          {!feed.length ? <Text style={styles.emptyText}>No posts to show yet.</Text> : null}
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
    const worker = feedItem.item;

    return (
      <WorkerCard
        headline={worker.headline}
        imageUrl={worker.imageUrl}
        jobsDoneText={worker.jobsDoneText}
        location={worker.location}
        name={worker.name}
        rateLine={worker.rateLine}
        ratingText={worker.ratingText}
        statusLine={worker.statusLine}
        tags={worker.tags}
        onPress={() => onOpenWorker(worker.id, workerVariant)}
        onSave={isVerified ? undefined : onOpenVerification}
        onViewProfile={() => onOpenWorker(worker.id, workerVariant)}
      />
    );
  }

  const job = feedItem.item;

  return (
    <JobCard
      clientRatingText={job.clientRatingText}
      description={job.description}
      imageUrl={job.imageUrl}
      jobsPostedText={job.jobsPostedText}
      location={job.location}
      postedAt={job.postedAt}
      showActionRow={job.showActionRow}
      subtitle={job.subtitle}
      tags={job.tags}
      title={job.title}
      onMessage={isVerified ? undefined : onOpenVerification}
      onPress={() => onOpenJob(job.id)}
      onSave={isVerified ? undefined : onOpenVerification}
      onViewJob={() => onOpenJob(job.id)}
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
  emptyText: {
    ...typography.body,
    color: color.textMuted,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
});
