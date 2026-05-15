import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/utils/supabase';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { profile } = useProfile();

  const displayName =
    profile?.full_name ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Konektado resident';
  const email = profile?.email ?? 'Signed in account';

  const confirmLogout = () => {
    Alert.alert('Log out', 'End this session on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert('Log out', error.message);
            return;
          }
          router.replace('/(auth)');
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
          <MaterialIcons color={color.text} name="chevron-left" size={30} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>{displayName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.accountCard}>
          <View style={styles.accountAvatar}>
            <Text style={styles.accountInitials}>{getInitials(displayName)}</Text>
          </View>
          <View style={styles.accountCopy}>
            <Text numberOfLines={1} style={styles.accountName}>{displayName}</Text>
            <Text numberOfLines={1} style={styles.accountEmail}>{email}</Text>
          </View>
        </View>

        <SettingsSection title="Profile setup">
          <SettingsRow
            icon="person"
            title="Core Profile"
            subtitle="Name, location, contact preference, and intro"
            onPress={() => router.push({ pathname: '/profile/complete', params: { mode: 'core' } })}
          />
          <SettingsRow
            icon="handyman"
            title="Work Profile"
            subtitle="Services, availability, service area, and rate range"
            onPress={() => router.push({ pathname: '/profile/complete', params: { mode: 'work' } })}
          />
          <SettingsRow
            icon="assignment"
            title="Hiring Profile"
            subtitle="Needed services and hiring preferences"
            onPress={() => router.push({ pathname: '/profile/complete', params: { mode: 'hiring' } })}
          />
        </SettingsSection>

        <SettingsSection title="Trust and marketplace">
          <SettingsRow
            icon="verified-user"
            title="Barangay verification"
            subtitle="Review or submit your verification request"
            onPress={() => router.push('/verification')}
          />
          <SettingsRow
            icon="workspace-premium"
            title="Credentials"
            subtitle="Optional proof, certificates, and work evidence"
            onPress={() => router.push('/profile/credentials')}
          />
          <SettingsRow
            icon="inventory"
            title="Manage posts"
            subtitle="View active jobs and service posts"
            onPress={() => router.push('/post/active')}
          />
        </SettingsSection>

        <SettingsSection title="Session">
          <SettingsRow
            danger
            icon="logout"
            title="Log out"
            subtitle="End this session on your device"
            onPress={confirmLogout}
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.rowStack}>{children}</View>
    </View>
  );
}

function SettingsRow({
  danger = false,
  icon,
  onPress,
  subtitle,
  title,
}: {
  danger?: boolean;
  icon: IconName;
  onPress: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <MaterialIcons color={danger ? color.danger : color.verificationBlue} name={icon} size={22} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <MaterialIcons color={color.textSubtle} name="chevron-right" size={22} />
    </Pressable>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'K';
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 62,
    paddingHorizontal: space.lg,
  },
  headerIcon: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  content: {
    gap: space.sm,
    paddingBottom: space['3xl'],
  },
  accountCard: {
    alignItems: 'center',
    backgroundColor: color.background,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  accountAvatar: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  accountInitials: {
    color: color.verificationBlue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  accountCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  accountName: {
    ...typography.bodyMedium,
    color: color.text,
  },
  accountEmail: {
    ...typography.caption,
    color: color.textMuted,
  },
  section: {
    backgroundColor: color.background,
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  sectionTitle: {
    ...typography.captionMedium,
    color: color.textMuted,
    textTransform: 'uppercase',
  },
  rowStack: {
    gap: space.sm,
  },
  rowCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 70,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  rowIconDanger: {
    backgroundColor: color.dangerSoft,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  rowTitleDanger: {
    color: color.danger,
  },
  rowSubtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});
