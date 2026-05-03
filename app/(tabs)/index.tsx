import { useEffect, useMemo, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobCard } from '@/components/JobCard';
import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import { WorkerCard } from '@/components/WorkerCard';
import { homeFilters, nearbyJobs, nearbyWorkers } from '@/constants/demo-data';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { getMyUserPreferences } from '@/services/onboarding.service';
import type { UserPreferences } from '@/types/onboarding.types';

type FeedItem =
  | { key: string; type: 'job'; item: (typeof nearbyJobs)[number] }
  | { key: string; type: 'worker'; item: (typeof nearbyWorkers)[number] };

function scoreTags(tags: string[] | undefined, preferences: UserPreferences | null) {
  if (!preferences || !tags?.length) return 0;

  const preferenceTerms = [
    ...preferences.neededServices,
    ...preferences.offeredServices,
    ...preferences.customNeededServices,
    ...preferences.customOfferedServices,
  ].map((value) => value.toLowerCase());

  return tags.reduce((score, tag) => {
    const normalizedTag = tag.toLowerCase();
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

function showBrowseOnlyPrompt(label: string) {
  Alert.alert(
    `${label} preview`,
    'Details will open from this card in a later slice. Browsing stays available in viewer mode.',
  );
}

export default function HomeScreen() {
  const [selectedFilter, setSelectedFilter] = useState(homeFilters[0]);
  const [userSelectedFilter, setUserSelectedFilter] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [showSetupCard, setShowSetupCard] = useState(true);
  const { profile } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

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

  const feedItems = useMemo<FeedItem[]>(() => {
    const sortedJobs = [...nearbyJobs].sort(
      (left, right) => scoreTags(right.tags, preferences) - scoreTags(left.tags, preferences),
    );
    const sortedWorkers = [...nearbyWorkers].sort(
      (left, right) => scoreTags(right.tags, preferences) - scoreTags(left.tags, preferences),
    );

    if (selectedFilter === 'Jobs') {
      return sortedJobs.map((job) => ({ key: `job-${job.title}`, type: 'job', item: job }));
    }

    if (selectedFilter === 'Workers') {
      return sortedWorkers.map((worker) => ({
        key: `worker-${worker.name}`,
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
        mixed.push({ key: `job-${job.title}`, type: 'job', item: job });
      }

      if (worker) {
        mixed.push({ key: `worker-${worker.name}`, type: 'worker', item: worker });
      }
    }

    return mixed;
  }, [preferences, selectedFilter]);

  const showVerificationPrompt = () => {
    Alert.alert(
      'Verification required',
      'Barangay verification unlocks messaging, saving, posting, and reviews.',
    );
  };

  const showSetupPrompt = (label: string) => {
    Alert.alert(label, 'This setup step will open from Profile or Verification in a later slice.');
  };

  const handleFilterPress = (filter: string) => {
    setUserSelectedFilter(true);
    setSelectedFilter(filter);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
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

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.searchContainer}>
            <Pressable
              accessibilityRole="search"
              onPress={() => showSetupPrompt('Search')}
              style={styles.searchBar}>
              <Text style={styles.searchPlaceholder}>Search nearby jobs or workers</Text>
              <MaterialIcons color={color.primary} name="search" size={24} />
            </Pressable>
          </View>

          {!isVerified && showSetupCard ? (
            <SetupCard
              onAddPhoto={() => showSetupPrompt('Add photo')}
              onAddServices={() => showSetupPrompt('Add Services')}
              onDismiss={() => setShowSetupCard(false)}
              onVerify={showVerificationPrompt}
            />
          ) : null}

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

          <SectionHeader onFilterPress={() => showSetupPrompt('Filters')} />

          <View style={styles.stack}>
            {feedItems.map((feedItem) =>
              feedItem.type === 'job' ? (
                <JobCard
                  key={feedItem.key}
                  {...feedItem.item}
                  onMessage={isVerified ? undefined : showVerificationPrompt}
                  onSave={isVerified ? undefined : showVerificationPrompt}
                  onViewJob={() => showBrowseOnlyPrompt('Job')}
                />
              ) : (
                <WorkerCard
                  key={feedItem.key}
                  {...feedItem.item}
                  onMessage={isVerified ? undefined : showVerificationPrompt}
                  onSave={isVerified ? undefined : showVerificationPrompt}
                  onViewProfile={() => showBrowseOnlyPrompt('Profile')}
                />
              ),
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SetupCard({
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
          <SetupPill label="Add Services" onPress={onAddServices} />
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
    backgroundColor: color.border,
    flex: 1,
  },
  safeArea: {
    backgroundColor: color.background,
    flex: 1,
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
    backgroundColor: color.screenBackground,
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
  dismissButton: {
    alignItems: 'center',
    backgroundColor: color.primary,
    borderRadius: radius.pill,
    height: 25,
    justifyContent: 'center',
    width: 25,
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
    minHeight: 26,
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
    gap: 2,
  },
  pressed: {
    opacity: 0.72,
  },
});
