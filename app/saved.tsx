import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { useFeedback } from '@/components/FeedbackProvider';
import { PublicProfileHeader } from '@/components/public-profile/PublicProfiles';
import { SavedPostCard } from '@/components/saved/SavedPostCard';
import { color, radius, space, typography } from '@/constants/theme';
import {
  listSavedPosts,
  unsavePost,
  type SavedPost,
  type SavedPostType,
} from '@/services/saved-posts.service';

type SavedFilter = 'all' | SavedPostType;

const FILTERS: { label: string; value: SavedFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Jobs', value: 'job' },
  { label: 'Services', value: 'service' },
];

export default function SavedPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showErrorToast, showSuccessToast } = useFeedback();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [filter, setFilter] = useState<SavedFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listSavedPosts().then((result) => {
      if (!active) return;
      if (result.error || !result.data) {
        setError(result.error ?? 'Could not load saved posts.');
      } else {
        setPosts(result.data);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(load);

  const visiblePosts = useMemo(
    () => posts.filter((post) => filter === 'all' || post.postType === filter),
    [filter, posts],
  );

  const removePost = useCallback(async (post: SavedPost) => {
    setPosts((current) => current.filter((item) => item.id !== post.id));
    setRemovingIds((current) => new Set(current).add(post.id));

    const result = await unsavePost({ postType: post.postType, postId: post.postId });

    setRemovingIds((current) => {
      const next = new Set(current);
      next.delete(post.id);
      return next;
    });

    if (result.error) {
      setPosts((current) => current.some((item) => item.id === post.id)
        ? current
        : [...current, post].sort(
            (left, right) =>
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          ));
      showErrorToast(result.error);
      return;
    }

    showSuccessToast('Removed from saved');
  }, [showErrorToast, showSuccessToast]);

  const openPost = useCallback((post: SavedPost) => {
    if (post.postType === 'job' && post.job) {
      router.push({ pathname: '/job/[jobId]', params: { jobId: post.postId } });
      return;
    }

    if (post.postType === 'service' && post.service) {
      router.push({ pathname: '/services/[serviceId]', params: { serviceId: post.postId } });
    }
  }, [router]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <PublicProfileHeader onBack={() => router.back()} title="Saved posts" />
        <FlatList
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, space.md) + space.xl },
          ]}
          data={visiblePosts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={(
            <View style={styles.filterRow}>
              {FILTERS.map((item) => {
                const selected = filter === item.value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={item.value}
                    onPress={() => setFilter(item.value)}
                    style={({ pressed }) => [
                      styles.filterPill,
                      selected && styles.filterPillActive,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.filterText, selected && styles.filterTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={color.primary} />
              </View>
            ) : error ? (
              <EmptyState
                actionLabel="Try again"
                description={error}
                icon="bookmark-border"
                onActionPress={() => {
                  load();
                }}
                title="Could not load saved posts"
              />
            ) : (
              <EmptyState
                description={filter === 'all'
                  ? 'Bookmark jobs and services to find them here later.'
                  : `No saved ${filter === 'job' ? 'jobs' : 'services'} yet.`}
                icon="bookmark-border"
                title="Nothing saved yet"
              />
            )
          }
          renderItem={({ item }) => (
            <SavedPostCard
              onOpen={() => openPost(item)}
              onRemove={() => void removePost(item)}
              post={item}
              removing={removingIds.has(item.id)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
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
  content: {
    flexGrow: 1,
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingBottom: space.sm,
  },
  filterPill: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.lg,
  },
  filterPillActive: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  filterText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  filterTextActive: {
    color: color.primary,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 320,
  },
  pressed: {
    opacity: 0.72,
  },
});
