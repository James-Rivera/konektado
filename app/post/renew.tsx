import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color, radius, space, typography } from '@/constants/theme';

export default function RenewPostsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
            <MaterialIcons color={color.text} name="chevron-left" size={28} />
          </Pressable>
          <Text style={styles.headerTitle}>Post renewal</Text>
          <View style={styles.headerIcon} />
        </View>

        <View style={styles.emptyCard}>
          <MaterialIcons color={color.verificationBlue} name="event-available" size={36} />
          <Text style={styles.emptyTitle}>Nothing to renew</Text>
          <Text style={styles.emptyText}>
            Konektado posts do not expire in this MVP. Manage visibility from Your Posts instead.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/post/active')}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Text style={styles.actionButtonText}>Open Your Posts</Text>
          </Pressable>
        </View>
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
  emptyCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.md,
    margin: space.xl,
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
  actionButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.pill,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  actionButtonText: {
    ...typography.button,
    color: color.white,
  },
  pressed: {
    opacity: 0.72,
  },
});
