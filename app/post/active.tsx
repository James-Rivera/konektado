import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { listMyJobs } from '@/services/job.service';
import type { JobSummary } from '@/types/marketplace.types';

export default function ActivePostsScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!profileLoading && !isVerified) {
        router.replace('/verification');
        return () => {
          active = false;
        };
      }

      if (profileLoading) {
        return () => {
          active = false;
        };
      }

      if (!hasLoadedOnce) {
        setLoading(true);
      }

      void (async () => {
        try {
          const result = await listMyJobs();
          if (!active) return;
          if (result.error || !result.data) {
            Alert.alert('Active posts', result.error ?? 'Could not load your posts.');
          } else {
            setJobs(result.data.filter((job) => ['open', 'reviewing', 'in_progress'].includes(job.status)));
          }
        } catch {
          if (active) {
            Alert.alert('Active posts', 'Could not refresh your active posts right now.');
          }
        } finally {
          if (active) {
            setHasLoadedOnce(true);
            setLoading(false);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, [hasLoadedOnce, isVerified, profileLoading, router]),
  );

  const filteredJobs = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return jobs;
    return jobs.filter((job) =>
      [job.title, job.description, job.category, job.locationText]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text)),
    );
  }, [jobs, query]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="chevron-left" size={28} />
          </Pressable>
          <Text style={styles.headerTitle}>Your Posts</Text>
          <MaterialIcons color={color.verificationBlue} name="more-vert" size={24} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/create-job')}
            style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
            <MaterialIcons color={color.white} name="edit-square" size={18} />
            <Text style={styles.createButtonText}>Create a post</Text>
          </Pressable>

          <View style={styles.searchBar}>
            <TextInput
              onChangeText={setQuery}
              placeholder="Search your posts"
              placeholderTextColor={color.textSubtle}
              style={styles.searchInput}
              value={query}
            />
            <MaterialIcons color={color.primary} name="search" size={24} />
          </View>

          <Text style={styles.sectionTitle}>Active Posts</Text>

          {loading ? (
            <View style={styles.skeletonStack}>
              <ActivePostSkeleton />
              <ActivePostSkeleton />
            </View>
          ) : null}

          {!loading && filteredJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No active posts</Text>
              <Text style={styles.emptyText}>Published job posts will appear here.</Text>
            </View>
          ) : null}

          {filteredJobs.map((job) => (
            <ActivePostCard
              job={job}
              key={job.id}
              onManage={() => router.push({ pathname: '/job/[jobId]', params: { jobId: job.id } })}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ActivePostCard({ job, onManage }: { job: JobSummary; onManage: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          <MaterialIcons color={color.verificationBlue} name="assignment" size={28} />
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {job.title}
          </Text>
          <Text style={styles.cardDate}>{formatDate(job.createdAt)}</Text>
          <View style={styles.cardMetaRow}>
            <TinyMeta icon="person" text={`${job.workersNeeded ?? 0} workers`} />
            <TinyMeta icon="inbox" text="0 unread messages" />
          </View>
        </View>
        <MaterialIcons color={color.verificationBlue} name="more-vert" size={24} />
      </View>
      <Pressable accessibilityRole="button" onPress={onManage} style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}>
        <Text style={styles.manageButtonText}>Manage post</Text>
      </Pressable>
    </View>
  );
}

function ActivePostSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Skeleton height={60} width={60} borderRadius={radius.sm} />
        <View style={styles.cardCopy}>
          <Skeleton height={14} width="78%" />
          <Skeleton height={12} width={72} />
          <View style={styles.cardMetaRow}>
            <Skeleton height={14} width={72} />
            <Skeleton height={14} width={112} />
          </View>
        </View>
        <Skeleton height={24} width={24} borderRadius={radius.sm} />
      </View>
      <Skeleton height={36} width="100%" borderRadius={radius.lg} />
    </View>
  );
}

function TinyMeta({ icon, text }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; text: string }) {
  return (
    <View style={styles.tinyMeta}>
      <MaterialIcons color={color.verificationBlue} name={icon} size={14} />
      <Text numberOfLines={1} style={styles.tinyMetaText}>
        {text}
      </Text>
    </View>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Posted Today';
  return `Posted ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
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
    flexDirection: 'row',
    gap: space.md,
    minHeight: 55,
    paddingHorizontal: space.xl,
  },
  headerIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: color.text,
    flex: 1,
  },
  content: {
    gap: space.md,
    padding: space.xl,
    paddingBottom: space['3xl'],
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.sm,
    height: 38,
    justifyContent: 'center',
  },
  createButtonText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    color: color.white,
  },
  searchBar: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: space.md,
  },
  searchInput: {
    ...typography.body,
    color: color.text,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    color: color.text,
  },
  skeletonStack: {
    gap: space.sm,
  },
  emptyCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space.xl,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  emptyText: {
    ...typography.body,
    color: color.textMuted,
    textAlign: 'center',
  },
  card: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space.md,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.sm,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  cardCopy: {
    flex: 1,
    gap: space.xs,
  },
  cardTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    color: color.text,
  },
  cardDate: {
    ...typography.caption,
    color: color.textMuted,
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  tinyMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space['2xs'],
  },
  tinyMetaText: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    color: color.textMuted,
    maxWidth: 120,
  },
  manageButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.lg,
    minHeight: 36,
    justifyContent: 'center',
  },
  manageButtonText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    color: color.white,
  },
  pressed: {
    opacity: 0.72,
  },
});
