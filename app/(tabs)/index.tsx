import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfile } from '@/hooks/use-profile';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile, loading } = useProfile();
  const isCompactWidth = width < 380;
  const themeMode = colorScheme === 'dark' ? 'dark' : 'light';

  const greetingName = profile?.full_name || 'there';
  const role = profile?.role ? profile.role : 'Add your role';
  const city = profile?.city || 'Add your city';

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading your home...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}> 
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 20,
          },
        ]}>
        <ThemedText type="title" style={styles.title}>
          Welcome, {greetingName}
        </ThemedText>
        <ThemedText style={styles.subtitle}>Here’s what to do next.</ThemedText>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Your profile</ThemedText>
          <ThemedText>{role}</ThemedText>
          <ThemedText>{city}</ThemedText>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(tabs)/profile')}>
            <ThemedText style={styles.linkText}>View / edit profile</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionsRow, isCompactWidth && styles.actionsColumn]}>
          <TouchableOpacity
            style={[
              styles.action,
              isCompactWidth && styles.actionFullWidth,
              { backgroundColor: Colors[themeMode].tint },
            ]}
            onPress={() => router.push('/(tabs)/explore')}>
            <IconSymbol name="paperplane.fill" size={26} color="#fff" />
            <ThemedText type="defaultSemiBold" style={styles.actionTextLight}>
              Explore opportunities
            </ThemedText>
            <ThemedText style={styles.actionSub}>Find work or services</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionOutline, isCompactWidth && styles.actionFullWidth]}
            onPress={() => router.push('/modal')}>
            <IconSymbol name="bell" size={24} color={Colors[themeMode].tint} />
            <ThemedText type="defaultSemiBold" style={styles.actionTextDark}>
              Notifications
            </ThemedText>
            <ThemedText style={styles.actionSub}>See recent updates</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Quick checklist</ThemedText>
          <ThemedText>- Ensure your name and city are set</ThemedText>
          <ThemedText>- Add a clear service/job description</ThemedText>
          <ThemedText>- Share certifications if you have them</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    color: '#6b7280',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 6,
  },
  linkButton: {
    marginTop: 8,
  },
  linkText: {
    color: '#2563eb',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  action: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  actionOutline: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  actionFullWidth: {
    flexBasis: '100%',
  },
  actionTextLight: {
    color: '#fff',
  },
  actionTextDark: {
    color: '#111827',
  },
  actionSub: {
    color: '#6b7280',
  },
});
