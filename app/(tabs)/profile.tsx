import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { NoticeBanner } from '@/components/NoticeBanner';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hiringHistory, profileServices, workHistory } from '@/constants/demo-data';
import { color, radius, space, typography } from '@/constants/theme';

type ProfileMode = 'work' | 'hiring';

export default function ProfileScreen() {
  const [mode, setMode] = useState<ProfileMode>('work');

  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon="settings"
        actionLabel="Profile settings"
        eyebrow="One account"
        title="Profile"
        subtitle="Manage your Work Profile and Hiring Profile."
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JR</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>Juan Reyes</Text>
            <Text style={styles.location}>Barangay San Pedro</Text>
            <View style={styles.profilePills}>
              <Pill icon="verified" label="Barangay verified" tone="success" />
              <Pill label="Services ready" tone="primary" />
            </View>
          </View>
        </View>

        <NoticeBanner
          message="Verification status belongs here and will gate posting, messaging, saving, and reviews when connected."
          title="Profile shell uses static data for this slice"
          variant="info"
        />

        <View style={styles.segmented}>
          <PrimaryButton
            label="Work Profile"
            onPress={() => setMode('work')}
            variant={mode === 'work' ? 'primary' : 'ghost'}
          />
          <PrimaryButton
            label="Hiring Profile"
            onPress={() => setMode('hiring')}
            variant={mode === 'hiring' ? 'primary' : 'ghost'}
          />
        </View>

        {mode === 'work' ? <WorkProfile /> : <HiringProfile />}
      </ScrollView>
    </View>
  );
}

function WorkProfile() {
  return (
    <View style={styles.stack}>
      <View style={styles.metricRow}>
        <Metric icon="star" label="Worker rating" value="4.9" />
        <Metric icon="check-circle" label="Jobs done" value="29" />
        <Metric icon="schedule" label="Hours worked" value="86" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <Text style={styles.body}>Weekdays after 2:00 PM and Saturday mornings.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.pillWrap}>
          {profileServices.map((service) => (
            <Pill key={service} label={service} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Work history</Text>
        {workHistory.map((item) => (
          <HistoryRow
            key={item.title}
            icon="work-outline"
            meta={`${item.rating} rating`}
            subtitle={item.detail}
            title={item.title}
          />
        ))}
      </View>
    </View>
  );
}

function HiringProfile() {
  return (
    <View style={styles.stack}>
      <View style={styles.metricRow}>
        <Metric icon="star" label="Client rating" value="4.8" />
        <Metric icon="person-add-alt" label="Workers hired" value="14" />
        <Metric icon="assignment" label="Jobs posted" value="9" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Open jobs</Text>
        <Text style={styles.body}>2 jobs are open and waiting for worker messages.</Text>
        <PrimaryButton disabled icon="list-alt" label="Manage job posts" variant="secondary" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job history</Text>
        {hiringHistory.map((item) => (
          <HistoryRow
            key={item.title}
            icon="history"
            meta={item.status}
            subtitle={item.detail}
            title={item.title}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews from workers</Text>
        <Text style={styles.body}>
          Workers can review this Hiring Profile after completed jobs in a later slice.
        </Text>
      </View>
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <MaterialIcons color={color.primary} name={icon} size={18} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function HistoryRow({
  icon,
  title,
  subtitle,
  meta,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  subtitle: string;
  meta: string;
}) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyIcon}>
        <MaterialIcons color={color.textMuted} name={icon} size={18} />
      </View>
      <View style={styles.historyCopy}>
        <Text style={styles.historyTitle}>{title}</Text>
        <Text style={styles.historySubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.historyMeta}>{meta}</Text>
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
  profileCard: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  avatarText: {
    ...typography.sectionTitle,
    color: color.primary,
  },
  profileCopy: {
    flex: 1,
    gap: space.xs,
  },
  name: {
    ...typography.screenTitle,
    color: color.text,
  },
  location: {
    ...typography.body,
    color: color.textMuted,
  },
  profilePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  segmented: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.xs,
  },
  stack: {
    gap: space.lg,
  },
  metricRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  metricCard: {
    alignItems: 'flex-start',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: space['2xs'],
    padding: space.md,
  },
  metricValue: {
    ...typography.sectionTitle,
    color: color.text,
  },
  metricLabel: {
    ...typography.caption,
    color: color.textMuted,
  },
  section: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  body: {
    ...typography.body,
    color: color.textMuted,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  historyRow: {
    alignItems: 'flex-start',
    borderTopColor: color.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingTop: space.md,
  },
  historyIcon: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  historyCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  historyTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  historySubtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  historyMeta: {
    ...typography.captionMedium,
    color: color.primary,
  },
});
