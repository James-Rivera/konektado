import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { listMyJobDrafts } from '@/services/job-draft.service';
import { listMyJobs } from '@/services/job.service';
import { listMyServices } from '@/services/service-profile.service';
import type { JobDraftSummary, JobSummary, ProviderService } from '@/types/marketplace.types';

export default function PostScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const profileId = profile?.id ?? null;
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [drafts, setDrafts] = useState<JobDraftSummary[]>([]);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (profileLoading || !profileId) {
        return () => {
          active = false;
        };
      }

      if (!hasLoadedOnce) {
        setLoading(true);
      }

      void (async () => {
        try {
          const [jobResult, draftResult, serviceResult] = await Promise.all([
            listMyJobs(),
            listMyJobDrafts(),
            listMyServices(),
          ]);

          if (!active) return;

          if (jobResult.error || !jobResult.data) {
            Alert.alert('Posts', jobResult.error ?? 'Could not load jobs.');
          } else {
            setJobs(jobResult.data);
          }

          if (draftResult.error || !draftResult.data) {
            Alert.alert('Drafts', draftResult.error ?? 'Could not load drafts.');
          } else {
            setDrafts(draftResult.data);
          }

          if (serviceResult.error || !serviceResult.data) {
            setServices([]);
          } else {
            setServices(serviceResult.data);
          }
        } catch {
          if (active) {
            Alert.alert('Posts', 'Could not refresh your posts right now.');
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
    }, [hasLoadedOnce, profileId, profileLoading]),
  );

  const activeJobs = jobs.filter((job) => ['open', 'reviewing', 'in_progress'].includes(job.status));
  const activeServices = services.filter((service) => service.isActive);

  const openCreateSheet = () => {
    setSheetOpen(true);
  };

  const handleCreateJob = () => {
    setSheetOpen(false);
    router.push('/create-job');
  };

  const handleCreateService = () => {
    setSheetOpen(false);
    router.push('/create-service');
  };

  if (!hasLoadedOnce && (profileLoading || loading)) {
    return (
      <View style={styles.screen}>
        <TopLogoHeader />
        <View style={styles.subHeader}>
          <View style={styles.subHeaderTitle}>
            <View style={{ width: 24, height: 24 }} />
            <Skeleton height={20} width={140} />
          </View>
          <View style={{ width: 24, height: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PostDashboardSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopLogoHeader />
      <View style={styles.subHeader}>
        <View style={styles.subHeaderTitle}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <MaterialIcons color={color.text} name="chevron-left" size={28} />
          </Pressable>
          <Text style={styles.pageTitle}>Create a post</Text>
        </View>
        <MaterialIcons color={color.verificationBlue} name="more-vert" size={24} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.composer}>
          <View style={styles.composerRow}>
            <View style={styles.composerAvatar}>
              <MaterialIcons color={color.verificationBlue} name="person" size={22} />
            </View>
            <View style={styles.composerCopy}>
              <Text style={styles.composerTitle}>What do you want to post?</Text>
              <Text style={styles.composerText}>Choose whether you need help or want to offer a service.</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={openCreateSheet}
            style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
            <MaterialIcons color={color.white} name="edit-square" size={18} />
            <Text style={styles.createButtonText}>Create a post</Text>
          </Pressable>
        </View>

        {!isVerified ? (
          <View style={styles.verificationNotice}>
            <MaterialIcons color={color.verificationBlue} name="shield" size={24} />
            <View style={styles.verificationCopy}>
              <Text style={styles.verificationTitle}>Draft now, verify before publishing</Text>
              <Text style={styles.verificationText}>
                You can write job posts and keep them as drafts. Barangay verification is required before a post becomes visible.
              </Text>
            </View>
          </View>
        ) : null}

        {jobs.length === 0 && services.length === 0 && drafts.length === 0 ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Your Posts</Text>
            <Text style={styles.sectionSubtext}>Manage your active posts and drafts.</Text>
            <View style={styles.emptyCard}>
              <MaterialIcons color={color.brandYellow} name="business-center" size={44} />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>{"You haven't created any posts yet."}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Job Posts</Text>
            <View style={styles.statGrid}>
              <StatBox icon="forum" label="Needs reply" value="0" />
              <StatBox
                icon="business-center"
                label="Active"
                onPress={() => router.push('/post/active')}
                value={String(activeJobs.length)}
              />
              <StatBox icon="description" label="Drafts" value={String(drafts.length)} />
              <StatBox icon="arrow-circle-up" label="To renew" onPress={() => router.push('/post/renew')} value="0" />
            </View>

            {drafts.length ? (
              <>
                <Text style={styles.sectionTitle}>Drafts</Text>
                {drafts.map((draft) => (
                  <DraftCard
                    draft={draft}
                    key={draft.id}
                    onPress={() => router.push({ pathname: '/create-job', params: { draftId: draft.id } })}
                  />
                ))}
              </>
            ) : null}

            {isVerified ? (
              <>
                <Text style={styles.sectionTitle}>Service posts</Text>
                <View style={styles.serviceStats}>
                  <InlineStat icon="forum" label="Inquires" value="0" />
                  <InlineStat icon="description" label="Drafts" value="0" />
                  <InlineStat icon="pause" label="Inactive" value={String(services.length - activeServices.length)} />
                </View>

                <View style={styles.activeServicesRow}>
                  <Text style={styles.activeServicesText}>Active services: {activeServices.length}</Text>
                  <MaterialIcons color={color.verificationBlue} name="keyboard-arrow-down" size={22} />
                </View>
              </>
            ) : null}

            {jobs.slice(0, 2).map((job) => (
              <RecentPostCard
                key={job.id}
                label={formatDate(job.createdAt)}
                onEdit={() => router.push({ pathname: '/job/[jobId]', params: { jobId: job.id } })}
                title={job.title}
              />
            ))}

            <Text style={styles.sectionTitle}>Recent posts</Text>
            {jobs.slice(0, 1).map((job) => (
              <MiniPostCard
                key={job.id}
                onPress={() => router.push({ pathname: '/job/[jobId]', params: { jobId: job.id } })}
                status="Visible"
                subtitle="Updated today"
                title={job.title}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ChoosePostTypeSheet
        onClose={() => setSheetOpen(false)}
        onCreateJob={handleCreateJob}
        onCreateService={handleCreateService}
        visible={sheetOpen}
      />
    </View>
  );
}

function TopLogoHeader() {
  return (
    <View style={styles.logoHeader}>
      <KonektadoWordmark size="small" />
      <MaterialIcons color={color.verificationBlue} name="notifications" size={24} />
    </View>
  );
}

function PostDashboardSkeleton() {
  return (
    <>
      <View style={styles.composer}>
        <View style={styles.composerRow}>
          <Skeleton height={46} width={46} borderRadius={radius.pill} />
          <View style={styles.composerCopy}>
            <Skeleton height={17} width="68%" />
            <Skeleton height={12} width="92%" />
          </View>
        </View>
        <Skeleton height={38} width="100%" borderRadius={radius.pill} />
      </View>

      <View style={styles.verificationNotice}>
        <Skeleton height={24} width={24} borderRadius={radius.pill} />
        <View style={styles.verificationCopy}>
          <Skeleton height={15} width="78%" />
          <Skeleton height={12} width="100%" />
          <Skeleton height={12} width="76%" />
        </View>
      </View>

      <View style={styles.panel}>
        <Skeleton height={16} width={86} />
        <View style={styles.statGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={styles.statBox}>
              <Skeleton height={32} width={32} borderRadius={radius.sm} />
              <View style={styles.statCopy}>
                <Skeleton height={16} width={18} />
                <Skeleton height={11} width={62} />
              </View>
            </View>
          ))}
        </View>

        <Skeleton height={16} width={58} />
        {Array.from({ length: 2 }).map((_, index) => (
          <View key={index} style={styles.draftCard}>
            <Skeleton height={44} width={44} borderRadius={radius.sm} />
            <View style={styles.draftCopy}>
              <Skeleton height={14} width="74%" />
              <Skeleton height={11} width="42%" />
              <Skeleton height={11} width="88%" />
            </View>
            <Skeleton height={22} width={48} borderRadius={radius.pill} />
          </View>
        ))}

        <Skeleton height={16} width={86} />
        <View style={styles.recentCard}>
          <View style={styles.recentCopy}>
            <Skeleton height={14} width="78%" />
            <Skeleton height={11} width={60} />
          </View>
          <Skeleton height={28} width={48} borderRadius={14} />
        </View>
      </View>
    </>
  );
}

function StatBox({
  icon,
  label,
  onPress,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress?: () => void;
  value: string;
}) {
  const Content = (
    <>
      <MaterialIcons color={color.verificationBlue} name={icon} size={32} />
      <View style={styles.statCopy}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.statBox, pressed && styles.pressed]}>
        {Content}
      </Pressable>
    );
  }

  return <View style={styles.statBox}>{Content}</View>;
}

function InlineStat({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.inlineStat}>
      <MaterialIcons color={color.verificationBlue} name={icon} size={16} />
      <Text style={styles.inlineStatText}>
        <Text style={styles.inlineStatStrong}>{label}</Text>: {value}
      </Text>
    </View>
  );
}

function RecentPostCard({
  label,
  onEdit,
  title,
}: {
  label: string;
  onEdit: () => void;
  title: string;
}) {
  return (
    <View style={styles.recentCard}>
      <View style={styles.recentCopy}>
        <Text numberOfLines={1} style={styles.recentTitle}>
          {title}
        </Text>
        <Text style={styles.recentLabel}>{label}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onEdit} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
        <Text style={styles.editButtonText}>Edit</Text>
      </Pressable>
    </View>
  );
}

function DraftCard({ draft, onPress }: { draft: JobDraftSummary; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.draftCard, pressed && styles.pressed]}>
      <View style={styles.draftIcon}>
        <MaterialIcons color={color.verificationBlue} name="description" size={24} />
      </View>
      <View style={styles.draftCopy}>
        <Text numberOfLines={1} style={styles.draftTitle}>
          {draft.title || 'Untitled job draft'}
        </Text>
        <Text style={styles.draftMeta}>Saved {formatDate(draft.updatedAt)}</Text>
        <Text numberOfLines={1} style={styles.draftDescription}>
          {draft.category || 'Add category'} - {draft.locationText || draft.barangay || 'Add location'}
        </Text>
      </View>
      <View style={styles.draftBadge}>
        <Text style={styles.draftBadgeText}>Draft</Text>
      </View>
    </Pressable>
  );
}

function MiniPostCard({
  onPress,
  status,
  subtitle,
  title,
}: {
  onPress: () => void;
  status: string;
  subtitle: string;
  title: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.miniCard, pressed && styles.pressed]}>
      <View style={styles.miniIcon}>
        <MaterialIcons color={color.verificationBlue} name="assignment" size={23} />
      </View>
      <View style={styles.miniCopy}>
        <Text numberOfLines={1} style={styles.miniTitle}>
          {title}
        </Text>
        <Text style={styles.miniSubtitle}>{subtitle}</Text>
        <View style={styles.visiblePill}>
          <Text style={styles.visibleText}>{status}</Text>
        </View>
      </View>
      <View style={styles.editButton}>
        <Text style={styles.editButtonText}>Edit</Text>
      </View>
    </Pressable>
  );
}

function ChoosePostTypeSheet({
  onClose,
  onCreateJob,
  onCreateService,
  visible,
}: {
  onClose: () => void;
  onCreateJob: () => void;
  onCreateService: () => void;
  visible: boolean;
}) {
  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Choose post type</Text>
      <SheetOption
        description="Create a job post so nearby workers can message you."
        icon="assignment"
        onPress={onCreateJob}
        title="I need help"
        tone="job"
      />
      <SheetOption
        description="Create or update your service listing so clients can find you."
        icon="build"
        onPress={onCreateService}
        title="I offer a service"
        tone="service"
      />
    </BottomSheet>
  );
}

function SheetOption({
  description,
  icon,
  onPress,
  title,
  tone,
}: {
  description: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  title: string;
  tone: 'job' | 'service';
}) {
  const isJob = tone === 'job';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetOption,
        isJob ? styles.sheetOptionJob : styles.sheetOptionService,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.sheetOptionIcon, isJob ? styles.sheetOptionIconJob : styles.sheetOptionIconService]}>
        <MaterialIcons color={isJob ? color.verificationBlue : color.accentYellow} name={icon} size={32} />
      </View>
      <View style={styles.sheetOptionCopy}>
        <Text style={styles.sheetOptionTitle}>{title}</Text>
        <Text style={styles.sheetOptionText}>{description}</Text>
      </View>
    </Pressable>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Posted today';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  logoHeader: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 86,
    paddingHorizontal: space['2xl'],
    paddingTop: space['2xl'],
  },
  subHeader: {
    alignItems: 'center',
    backgroundColor: color.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 55,
    paddingHorizontal: space['2xl'],
  },
  subHeaderTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  backButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  pageTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  content: {
    backgroundColor: color.background,
    paddingBottom: space['3xl'],
  },
  composer: {
    borderColor: color.border,
    borderWidth: 1,
    gap: space.sm,
    padding: 18,
  },
  composerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
  },
  composerAvatar: {
    alignItems: 'center',
    backgroundColor: color.cardTint,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  composerCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  composerTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 21,
    color: color.text,
  },
  composerText: {
    ...typography.caption,
    color: color.textMuted,
  },
  verificationNotice: {
    alignItems: 'flex-start',
    backgroundColor: color.cardTint,
    borderColor: color.accentYellow,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    margin: 18,
    marginBottom: 0,
    padding: space.md,
  },
  verificationCopy: {
    flex: 1,
    gap: space.xs,
  },
  verificationTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  verificationText: {
    ...typography.caption,
    color: color.textMuted,
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
  panel: {
    gap: space.md,
    padding: 18,
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
    color: color.text,
  },
  sectionSubtext: {
    ...typography.caption,
    color: color.textMuted,
    marginTop: -space.sm,
  },
  emptyCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: space.md,
    minHeight: 156,
    justifyContent: 'center',
    padding: space['2xl'],
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: color.text,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: color.textMuted,
    textAlign: 'center',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  statBox: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    gap: space.md,
    minHeight: 55,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  statCopy: {
    gap: space['2xs'],
  },
  statValue: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    color: color.text,
  },
  statLabel: {
    ...typography.caption,
    color: color.text,
  },
  serviceStats: {
    flexDirection: 'row',
    gap: space.sm,
  },
  inlineStat: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  inlineStatText: {
    ...typography.caption,
    color: color.textSubtle,
  },
  inlineStatStrong: {
    fontFamily: 'Satoshi-Bold',
    color: color.text,
  },
  activeServicesRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activeServicesText: {
    ...typography.bodyMedium,
    color: color.text,
  },
  recentCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  recentCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  recentTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
    color: color.text,
  },
  recentLabel: {
    ...typography.caption,
    color: color.textMuted,
  },
  draftCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 76,
    padding: space.md,
  },
  draftIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  draftCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  draftTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    color: color.text,
  },
  draftMeta: {
    ...typography.caption,
    color: color.textMuted,
  },
  draftDescription: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    color: color.textSubtle,
  },
  draftBadge: {
    borderColor: color.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.sm,
    paddingVertical: space['2xs'],
  },
  draftBadgeText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    color: color.primary,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: space.md,
  },
  editButtonText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    color: color.white,
  },
  miniCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 92,
    padding: space.md,
  },
  miniIcon: {
    alignItems: 'center',
    borderColor: color.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 43,
    justifyContent: 'center',
    width: 43,
  },
  miniCopy: {
    flex: 1,
    gap: space.xs,
  },
  miniTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    color: color.text,
  },
  miniSubtitle: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    color: color.textMuted,
  },
  visiblePill: {
    alignSelf: 'flex-start',
    borderColor: color.success,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.sm,
    paddingVertical: space['2xs'],
  },
  visibleText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    color: color.success,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: color.textMuted,
    borderRadius: radius.pill,
    height: 2,
    width: 40,
  },
  sheetTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 21,
    color: color.text,
  },
  sheetOption: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 95,
    padding: space.md,
  },
  sheetOptionJob: {
    backgroundColor: '#EEF6FF',
    borderColor: color.primary,
  },
  sheetOptionService: {
    backgroundColor: color.successSoft,
    borderColor: color.accentYellow,
  },
  sheetOptionIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 63,
    justifyContent: 'center',
    width: 63,
  },
  sheetOptionIconJob: {
    backgroundColor: color.background,
    borderColor: color.primary,
  },
  sheetOptionIconService: {
    backgroundColor: color.background,
    borderColor: '#F2D68A',
  },
  sheetOptionCopy: {
    flex: 1,
    gap: space.xs,
  },
  sheetOptionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    color: color.text,
  },
  sheetOptionText: {
    ...typography.caption,
    color: color.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});
