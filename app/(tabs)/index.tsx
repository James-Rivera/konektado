import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { JobCard } from '@/components/JobCard';
import { NoticeBanner } from '@/components/NoticeBanner';
import { Pill } from '@/components/Pill';
import { SearchBar } from '@/components/SearchBar';
import { WorkerCard } from '@/components/WorkerCard';
import { homeFilters, nearbyJobs, nearbyWorkers } from '@/constants/demo-data';
import { color, space, typography } from '@/constants/theme';
import { getMyUserPreferences } from '@/services/onboarding.service';
import type { UserPreferences } from '@/types/onboarding.types';

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

export default function HomeScreen() {
  const [selectedFilter, setSelectedFilter] = useState(homeFilters[0]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    let active = true;

    getMyUserPreferences().then((result) => {
      if (!active || result.error) return;
      setPreferences(result.data);
    });

    return () => {
      active = false;
    };
  }, []);

  const sortedJobs = useMemo(
    () =>
      [...nearbyJobs].sort(
        (left, right) => scoreTags(right.tags, preferences) - scoreTags(left.tags, preferences),
      ),
    [preferences],
  );
  const sortedWorkers = useMemo(
    () =>
      [...nearbyWorkers].sort(
        (left, right) => scoreTags(right.tags, preferences) - scoreTags(left.tags, preferences),
      ),
    [preferences],
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon="notifications-none"
        actionLabel="Notifications"
        eyebrow="Barangay San Pedro"
        title="Konektado"
        subtitle="Find nearby jobs and trusted local services.">
        <SearchBar editable={false} />
      </AppHeader>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <NoticeBanner
          actionLabel="Start verification"
          message="Browse verified jobs and workers. Verify to post, message, and get hired."
          title="Viewer mode"
          variant="warning"
        />

        <View style={styles.filterRow}>
          {homeFilters.map((filter) => (
            <Pill
              key={filter}
              label={filter}
              onPress={() => setSelectedFilter(filter)}
              selected={selectedFilter === filter}
            />
          ))}
        </View>

        <SectionHeader title="Nearby jobs" action="See all" />
        <View style={styles.stack}>
          {sortedJobs.map((job) => (
            <JobCard key={job.title} {...job} />
          ))}
        </View>

        <SectionHeader title="Workers near you" action="See all" />
        <View style={styles.stack}>
          {sortedWorkers.map((worker) => (
            <WorkerCard key={worker.name} {...worker} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  content: {
    gap: space.lg,
    padding: space.xl,
    paddingBottom: space['3xl'],
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  sectionAction: {
    ...typography.captionMedium,
    color: color.primary,
  },
  stack: {
    gap: space.md,
  },
});
