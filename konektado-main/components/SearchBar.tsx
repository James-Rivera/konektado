import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';

type SearchBarProps = TextInputProps & {
  compact?: boolean;
};

export function SearchBar({ compact = false, placeholder = 'Search nearby jobs or workers', ...props }: SearchBarProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <MaterialIcons color={color.textSubtle} name="search" size={20} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={color.textSubtle}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.md,
  },
  compact: {
    minHeight: 42,
  },
  input: {
    ...typography.body,
    color: color.text,
    flex: 1,
    paddingVertical: space.sm,
  },
});
