import { StyleSheet, Text, View } from 'react-native';
import { color, space, typography } from '@/constants/theme';

export function PostingReviewDetails({ items }: { items: { label: string; value: string | null | undefined }[] }) {
  return <View style={styles.list}>
    {items.filter(item => item.value?.trim()).map(item => <View key={item.label} style={styles.row}>
      <Text style={styles.label}>{item.label}</Text>
      <Text selectable style={styles.value}>{item.value}</Text>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  list: { gap: space.lg, paddingVertical: space.lg },
  row: { gap: space.xs },
  label: { ...typography.bodyMedium, color: color.text },
  value: { ...typography.body, color: color.textMuted, flexShrink: 1 },
});
