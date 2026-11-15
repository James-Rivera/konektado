import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { color, radius, space, typography } from '@/constants/theme';

export function PreferenceField({ label, options, value, onChange }: {
  label: string; options: readonly string[]; value: string; onChange: (value: string) => void;
}) {
  const [custom, setCustom] = useState(false);
  return <View style={styles.field}>
    <Text style={typography.bodyMedium}>{label}</Text>
    <View style={styles.options}>
      {options.map(option => <Pressable key={option} accessibilityRole="button"
        accessibilityState={{ selected: value === option }} onPress={() => { setCustom(false); onChange(option); }}
        style={[styles.option, value === option && styles.selected]}>
        <Text style={styles.text}>{option}</Text>
      </Pressable>)}
      <Pressable accessibilityRole="button" onPress={() => setCustom(true)} style={styles.option}>
        <Text style={styles.text}>Write my own</Text>
      </Pressable>
    </View>
    {(custom || (Boolean(value) && !options.includes(value))) && <TextInput
      accessibilityLabel={label} multiline value={value} onChangeText={onChange} placeholder="Add your preference"
      style={styles.input} />}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: space.sm }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: { minHeight: 44, borderWidth: 1, borderColor: color.border, borderRadius: radius.pill, padding: space.md, justifyContent: 'center' },
  selected: { backgroundColor: color.primarySoft, borderColor: color.primaryText },
  text: { ...typography.captionMedium, color: color.primaryText },
  input: { ...typography.body, minHeight: 80, padding: space.md, borderWidth: 1, borderColor: color.border, borderRadius: radius.md, color: color.text },
});
