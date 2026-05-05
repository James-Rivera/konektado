import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { color, space, typography } from '@/constants/theme';

export function SearchHeaderRow({
  value,
  onChangeText,
  onBack,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.text} name="arrow-back" size={22} />
      </Pressable>
      <View style={styles.searchBar}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          onChangeText={onChangeText}
          placeholder="Search nearby jobs or workers"
          placeholderTextColor={color.textSubtle}
          returnKeyType="search"
          selectionColor={color.primary}
          style={styles.input}
          value={value}
        />
        <MaterialIcons color={color.verificationBlue} name="search" size={24} />
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
  backButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
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
