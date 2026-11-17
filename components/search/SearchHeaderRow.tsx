import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { color, space, typography } from '@/constants/theme';

export function SearchHeaderRow({
  value,
  onChangeText,
  autoFocus = false,
  flush = false,
  embedded = false,
  onBack,
  placeholder = 'Search jobs…',
}: {
  value: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
  flush?: boolean;
  embedded?: boolean;
  onBack?: () => void;
  placeholder?: string;
}) {
  return (
    <View style={[styles.container, flush && styles.containerFlush]}>
      {onBack ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.text} name="arrow-back" size={22} />
        </Pressable>
      ) : null}
      <View style={[styles.searchBar, embedded && styles.searchBarEmbedded]}>
        <TextInput
          accessibilityLabel={placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={color.textSubtle}
          returnKeyType="search"
          selectionColor={color.primary}
          style={styles.input}
          value={value}
        />
        <MaterialIcons color={color.primary} name="search" size={24} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: color.background,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  containerFlush: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBarEmbedded: {
    borderRadius: 0,
    borderWidth: 0,
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  input: {
    ...typography.body,
    color: color.text,
    flex: 1,
    minHeight: 18,
    padding: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
