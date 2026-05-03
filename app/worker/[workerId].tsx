import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import {
  findDemoWorkerDetailById,
  type DemoWorkHistoryItem,
  type DemoWorkerDetailVariant,
} from '@/constants/marketplace-demo-data';
import { color, radius, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getVariant(value: string | string[] | undefined): DemoWorkerDetailVariant {
  const variant = getParamValue(value);
  return variant === 'match' ? 'match' : 'default';
}

export default function WorkerDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);

  const params = useLocalSearchParams<{
    workerId?: string | string[];
    variant?: string | string[];
  }>();
  const workerId = getParamValue(params.workerId);
  const variant = getVariant(params.variant);
  const worker = workerId ? findDemoWorkerDetailById(workerId) : null;

  const showPlaceholder = (label: string) => {
    Alert.alert(label, 'This will open from Worker Profile in a later slice.');
  };

  const handleLockedAction = (label: string) => {
    if (!isVerified) {
      router.push('/verification');
      return;
    }

    showPlaceholder(label);
  };

  if (!worker) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.screen}>
          <DetailHeader onBack={() => router.back()} onMore={() => showPlaceholder('Options')} />
          <View style={styles.emptyWrap}>
            <EmptyState
              actionLabel="Go back"
              description="This worker profile is no longer available."
              icon="person-search"
              onActionPress={() => router.back()}
              title="Worker not found"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <DetailHeader onBack={() => router.back()} onMore={() => showPlaceholder('Options')} />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 24 + Math.max(insets.bottom, 12) },
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}>
          <WorkerProfileHero
            location={worker.location}
            name={worker.name}
            verificationText={worker.verificationText}
          />

          {variant === 'match' && worker.matchSummary ? (
            <SectionBand style={styles.matchSection}>
              <MatchNoticeCard body={worker.matchSummary.body} title={worker.matchSummary.title} />
            </SectionBand>
          ) : null}

          <SectionBand style={styles.skillsSection}>
            <Text style={styles.sectionTitle}>Services and rate</Text>
            <View style={styles.serviceRateRow}>
              <View style={styles.servicesWrap}>
                {worker.services.map((service) => (
                  <View key={service} style={styles.servicePill}>
                    <Text style={styles.servicePillText}>{service}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.ratePill}>
                <MaterialIcons color={color.primary} name="payments" size={16} />
                <Text style={styles.ratePillText}>{worker.rateLine}</Text>
              </View>
            </View>
          </SectionBand>

          <SectionBand style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Worker details</Text>
            <WorkerMetricGrid metrics={worker.metrics} />
          </SectionBand>

          <SectionBand style={styles.historySection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Work History</Text>
              {variant === 'default' ? (
                <Pressable
                  accessibilityLabel="Work history options"
                  accessibilityRole="button"
                  onPress={() => showPlaceholder('Work History options')}
                  style={({ pressed }) => [styles.utilityButton, pressed && styles.pressed]}>
                  <MaterialIcons color={color.textSubtle} name="tune" size={18} />
                </Pressable>
              ) : null}
            </View>

            {worker.workHistory.length ? (
              <View style={styles.historyList}>
                {worker.workHistory.map((item) => (
                  <WorkHistoryCard
                    item={item}
                    key={item.id}
                    onView={() => showPlaceholder('Work History')}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyHistoryCard}>
                <Text style={styles.emptyHistoryTitle}>No work history yet</Text>
                <Text style={styles.emptyHistoryBody}>
                  Completed jobs will appear here after this worker finishes marketplace work.
                </Text>
              </View>
            )}
          </SectionBand>
        </ScrollView>

        <DetailActionRow
          bottomInset={insets.bottom}
          onMessage={() => handleLockedAction('Message')}
          onSave={() => handleLockedAction('Save')}
        />
      </View>
    </SafeAreaView>
  );
}

function DetailHeader({ onBack, onMore }: { onBack: () => void; onMore: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
      </Pressable>
      <Text style={styles.headerTitle}>Worker Profile</Text>
      <Pressable
        accessibilityLabel="More options"
        accessibilityRole="button"
        onPress={onMore}
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.textSubtle} name="more-horiz" size={20} />
      </Pressable>
    </View>
  );
}

function WorkerProfileHero({
  name,
  location,
  verificationText,
}: {
  name: string;
  location: string;
  verificationText: string;
}) {
  return (
    <SectionBand style={styles.workerInfoSection}>
      <View style={styles.heroRow}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{getInitials(name)}</Text>
          <View style={styles.heroAvatarBadge} />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroName}>{name}</Text>
          <View style={styles.heroLocationRow}>
            <MaterialIcons color={color.primary} name="location-on" size={14} />
            <Text style={styles.heroLocationText}>{location} (2km)</Text>
          </View>
        </View>

        <BadgePill icon="verified" label={verificationText} tone="success" />
      </View>
    </SectionBand>
  );
}

function MatchNoticeCard({ title: _title, body }: { title: string; body: string }) {
  return (
    <View style={styles.matchCard}>
      <Text style={styles.matchTitle}>Good match</Text>
      <Text style={styles.matchBody}>{body}</Text>
    </View>
  );
}

function WorkerMetricGrid({ metrics: _metrics }: { metrics: { label: string; value: string }[] }) {
  const mappedMetrics = [
    { label: 'Location', value: 'Sto. Tomas' },
    { label: 'Jobs completed', value: '3' },
    { label: 'Availability', value: 'Before 3:00 PM' },
    { label: 'Hours worked', value: '12 hrs' },
  ];

  return (
    <View style={styles.metricGrid}>
      {mappedMetrics.map((metric) => (
        <View key={metric.label} style={styles.metricCell}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text style={styles.metricValue}>{metric.value}</Text>
        </View>
      ))}
    </View>
  );
}

function WorkHistoryCard({
  item,
  onView,
}: {
  item: DemoWorkHistoryItem;
  onView: () => void;
}) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTopRow}>
        <View style={styles.historyCopy}>
          <Text style={styles.historyTitle}>{item.title}</Text>
          <View style={styles.historyRatingRow}>
            <MaterialIcons color={color.brandYellow} name="star" size={14} />
            <Text style={styles.historyRatingText}>4.50</Text>
            <View style={styles.historyDot} />
            <Text style={styles.historyTagText}>Konektado job</Text>
          </View>
        </View>
        <Text style={styles.historyDate}>Today</Text>
      </View>

      <Text style={styles.historyBody}>{item.description}</Text>
      <Text style={styles.workedForLabel}>Worked for</Text>

      <View style={styles.posterCard}>
        <View style={styles.historyPoster}>
          <View style={styles.posterTopRow}>
            <View style={styles.posterIdentity}>
              <View style={styles.historyPosterAvatar}>
                <Text style={styles.historyPosterAvatarText}>{getInitials(item.posterName)}</Text>
              </View>
              <View style={styles.historyPosterCopy}>
                <Text style={styles.historyPosterName}>{item.posterName}</Text>
                <Text style={styles.historyPosterMeta}>Verified resident</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={onView}
              style={({ pressed }) => [styles.viewButton, pressed && styles.pressed]}>
              <Text style={styles.viewButtonText}>View</Text>
            </Pressable>
          </View>

          <View style={styles.posterBottomRow}>
            <View style={styles.posterLocationRow}>
              <MaterialIcons color={color.primary} name="location-on" size={14} />
              <Text style={styles.posterLocationText}>Brgy San Pedro</Text>
            </View>
            <Text style={styles.historyEarnings}>Earned  500</Text>
          </View>
        </View>

        <View style={styles.historyPhotoBox}>
          <View style={styles.historyPhotoCircle} />
          <Text style={styles.historyPhotoText}>Work reference photo</Text>
        </View>
      </View>
    </View>
  );
}

function DetailActionRow({
  bottomInset,
  onMessage,
  onSave,
}: {
  bottomInset: number;
  onMessage: () => void;
  onSave: () => void;
}) {
  return (
    <View style={[styles.actionRow, { paddingBottom: 12 + Math.max(bottomInset, 12) }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onMessage}
        style={({ pressed }) => [styles.messageButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.verificationBlue} name="chat-bubble" size={18} />
        <Text style={styles.messageButtonText}>Message</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onSave}
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.textSubtle} name="bookmark-border" size={18} />
        <Text style={styles.saveButtonText}>Save</Text>
      </Pressable>
    </View>
  );
}

function SectionBand({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.sectionBand, style]}>{children}</View>;
}

function BadgePill({
  icon,
  label,
  tone = 'default',
}: {
  icon: MaterialIconName;
  label: string;
  tone?: 'default' | 'success';
}) {
  return (
    <View style={[styles.badgePill, tone === 'success' && styles.badgePillSuccess]}>
      <MaterialIcons
        color={tone === 'success' ? color.success : color.textMuted}
        name={icon}
        size={16}
      />
      <Text style={[styles.badgePillText, tone === 'success' && styles.badgePillTextSuccess]}>
        {label}
      </Text>
    </View>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  screen: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 2,
  },
  header: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 55,
    paddingHorizontal: 24,
  },
  headerButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  headerTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  sectionBand: {
    backgroundColor: color.background,
    width: '100%',
  },
  workerInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  matchSection: {
    paddingHorizontal: 18,
    paddingVertical: 19,
  },
  skillsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailsSection: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  historySection: {
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
  },
  heroAvatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  heroAvatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  heroAvatarBadge: {
    backgroundColor: color.brandYellow,
    borderColor: color.white,
    borderRadius: radius.pill,
    borderWidth: 2,
    bottom: 0,
    position: 'absolute',
    right: 0,
    height: 10,
    width: 10,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  heroName: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  heroLocationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  heroLocationText: {
    fontFamily: 'Satoshi-Regular',
    color: color.textSubtle,
    fontSize: 12,
    lineHeight: 18,
  },
  badgePill: {
    alignItems: 'center',
    backgroundColor: color.successSoft,
    borderColor: color.success,
    borderWidth: 1,
    borderRadius: radius.pill,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
  },
  badgePillSuccess: {
    backgroundColor: color.successSoft,
    borderColor: color.success,
  },
  badgePillText: {
    color: color.text,
    flexShrink: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  badgePillTextSuccess: {
    color: color.text,
  },
  matchCard: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 14,
    width: '100%',
  },
  matchTitle: {
    color: '#050505',
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  matchBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  sectionTitle: {
    color: '#050505',
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  serviceRateRow: {
    gap: 12,
    marginTop: 12,
  },
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  servicePill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    minWidth: 81,
    paddingHorizontal: 12,
  },
  servicePillText: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  ratePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: color.white,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    height: 32,
    paddingHorizontal: 12,
  },
  ratePillText: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  metricGrid: {
    columnGap: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    rowGap: 12,
  },
  metricCell: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 132,
  },
  metricLabel: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
  },
  metricValue: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  utilityButton: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  historyList: {
    gap: 10,
  },
  historyCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    width: '100%',
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyCopy: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  historyRatingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  historyRatingText: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
  },
  historyDot: {
    backgroundColor: '#D9D9D9',
    borderRadius: 3,
    height: 6,
    marginHorizontal: 2,
    width: 6,
  },
  historyTagText: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
  },
  historyDate: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  historyBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  workedForLabel: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 20,
  },
  posterCard: {
    borderColor: color.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  posterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    width: '100%',
  },
  posterIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  posterBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  posterLocationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  posterLocationText: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  historyPhotoBox: {
    alignItems: 'center',
    backgroundColor: '#DCEBFF',
    borderColor: color.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 129,
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: '100%',
  },
  historyPhotoCircle: {
    borderColor: color.primary,
    borderRadius: 18,
    borderWidth: 1.5,
    height: 36,
    width: 36,
  },
  historyPhotoText: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  historyPoster: {
    gap: 4,
  },
  historyPosterAvatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  historyPosterAvatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
  },
  historyPosterCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  historyPosterName: {
    color: '#050505',
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
  },
  historyPosterMeta: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 17,
  },
  historyEarnings: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
  },
  viewButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: 24,
    height: 25,
    justifyContent: 'center',
    width: 65,
  },
  viewButtonText: {
    color: color.white,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 20,
  },
  emptyHistoryCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 14,
    width: '100%',
  },
  emptyHistoryTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyHistoryBody: {
    ...typography.body,
    color: color.textMuted,
  },
  actionRow: {
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 13,
  },
  messageButton: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 34,
  },
  messageButtonText: {
    color: color.verificationBlue,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: radius.pill,
    borderColor: color.border,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 34,
  },
  saveButtonText: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pressed: {
    opacity: 0.78,
  },
});
