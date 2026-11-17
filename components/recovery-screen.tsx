import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { color, radius, space, typography } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export function RecoveryScreen({ retry }: { retry: () => Promise<void> }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>We couldn’t load your details</Text>
        <Text style={styles.message}>Check your connection and try again. We’ll load your details when you’re connected.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          accessibilityState={{ disabled: retrying, busy: retrying }}
          disabled={retrying}
          onPress={async () => {
            setRetrying(true);
            try { await retry(); } catch { /* Keep recovery available. */ } finally { setRetrying(false); }
          }}
          style={styles.button}
        >
          {retrying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Try again</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: space['2xl'], gap: space.lg },
  title: { ...typography.screenTitle, color: color.text },
  message: { fontSize: 16, lineHeight: 24, color: color.textMuted },
  button: { backgroundColor: color.primaryText, padding: space.lg, borderRadius: radius.md, alignItems: 'center' },
  buttonText: { color: color.white, ...typography.button, fontSize: 16 },
});
