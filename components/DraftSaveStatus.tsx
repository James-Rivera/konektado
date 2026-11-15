import { Pressable, Text, View } from 'react-native';
import { color, space, typography } from '@/constants/theme';

export function DraftSaveStatus({ status, error, onRetry }: {
  status: 'idle' | 'saving' | 'saved' | 'error'; error: string | null; onRetry: () => void;
}) {
  if (status === 'idle') return null;
  return <View style={{ gap: space.xs }}>
    <Text accessibilityLiveRegion="polite" style={{ ...typography.caption, color: status === 'error' ? color.danger : color.textMuted }}>
      {status === 'saving' ? 'Saving draft…' : status === 'saved' ? 'Draft saved' : error || 'Draft could not be saved.'}
    </Text>
    {status === 'error' ? <Pressable accessibilityRole="button" onPress={onRetry} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ ...typography.bodyMedium, color: color.primaryText }}>Retry saving</Text>
    </Pressable> : null}
  </View>;
}
