import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { managedPosts, postStats } from '@/constants/demo-data';
import { color, radius, space, typography } from '@/constants/theme';

export default function PostScreen() {
  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon="pending-actions"
        actionLabel="Drafts"
        eyebrow="Manage posts"
        title="Post"
        subtitle="Create jobs or show the services you offer."
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <NoticeBanner
          message="Only verified residents can post jobs, create public service posts, and message workers."
          title="Posting is verification-gated"
          variant="warning"
        />

        <View style={styles.statsRow}>
          {postStats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionGrid}>
          <PostAction
            description="Describe the task, location, budget, and schedule."
            icon="work-outline"
            label="Post a job"
          />
          <PostAction
            description="Make your services visible to nearby residents."
            icon="handyman"
            label="Offer service"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your posts</Text>
          <Pill label="Demo data" tone="primary" />
        </View>

        <View style={styles.stack}>
          {managedPosts.map((post) => (
            <View key={post.title} style={styles.postCard}>
              <View style={styles.postIcon}>
                <MaterialIcons color={color.primary} name="article" size={20} />
              </View>
              <View style={styles.postCopy}>
                <View style={styles.postTitleRow}>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  <Pill label={post.status} tone={post.status === 'Draft' ? 'warning' : 'success'} />
                </View>
                <Text style={styles.postDetail}>{post.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <EmptyState
          description="Saved drafts and paused posts will appear here when the database flow is added."
          icon="inventory-2"
          title="No more posts to manage"
        />
      </ScrollView>
    </View>
  );
}

function PostAction({
  label,
  description,
  icon,
}: {
  label: string;
  description: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
}) {
  return (
    <View style={styles.actionCard}>
      <View style={styles.actionIcon}>
        <MaterialIcons color={color.primary} name={icon} size={24} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{label}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <PrimaryButton disabled label={label} variant="secondary" />
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
  statsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  statCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: space['2xs'],
    padding: space.md,
  },
  statValue: {
    ...typography.screenTitle,
    color: color.text,
  },
  statLabel: {
    ...typography.caption,
    color: color.textMuted,
  },
  actionGrid: {
    gap: space.md,
  },
  actionCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actionCopy: {
    gap: space.xs,
  },
  actionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  actionDescription: {
    ...typography.body,
    color: color.textMuted,
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
  stack: {
    gap: space.md,
  },
  postCard: {
    alignItems: 'flex-start',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  postIcon: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  postCopy: {
    flex: 1,
    gap: space.xs,
  },
  postTitleRow: {
    alignItems: 'flex-start',
    gap: space.sm,
  },
  postTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  postDetail: {
    ...typography.caption,
    color: color.textMuted,
  },
});
