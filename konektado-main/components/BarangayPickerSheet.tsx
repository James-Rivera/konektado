import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { color, radius, space, typography } from '@/constants/theme';

type BarangayPickerSheetProps = {
  description: string;
  options: string[];
  searchPlaceholder?: string;
  selectedValue?: string | null;
  title: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function BarangayPickerSheet({
  description,
  options,
  searchPlaceholder = 'Search barangay',
  selectedValue,
  title,
  visible,
  onClose,
  onSelect,
}: BarangayPickerSheetProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const selectOption = (option: string) => {
    onSelect(option);
    onClose();
  };

  return (
    <BottomSheet maxHeight="64%" onClose={onClose} visible={visible}>
      <View style={styles.handle} />

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={color.textSubtle}
          style={styles.searchInput}
          value={query}
        />
        <MaterialIcons color={color.primary} name="search" size={24} />
      </View>

      <View style={styles.listShell}>
        <ScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          style={styles.listScroll}>
          {filteredOptions.map((option, index) => {
            const active = option === selectedValue;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={option}
                onPress={() => selectOption(option)}
                style={({ pressed }) => [
                  styles.optionRow,
                  index === 0 && styles.optionRowTop,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
          {!filteredOptions.length ? <Text style={styles.emptyText}>No matches found.</Text> : null}
        </ScrollView>
        <View pointerEvents="none" style={styles.listFade} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handle: {
    alignSelf: 'center',
    backgroundColor: color.textMuted,
    borderRadius: radius.pill,
    height: 2,
    marginBottom: space.xs,
    width: 43,
  },
  header: {
    gap: space.xs,
  },
  title: {
    ...typography.sectionTitle,
    color: '#050505',
  },
  description: {
    ...typography.body,
    color: '#050505',
  },
  searchBox: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 42,
    paddingHorizontal: space.md,
  },
  searchInput: {
    ...typography.caption,
    color: color.text,
    flex: 1,
    minHeight: 40,
  },
  listShell: {
    position: 'relative',
  },
  listScroll: {
    maxHeight: 240,
  },
  listContent: {
    paddingBottom: space.xl + 18,
  },
  listFade: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    bottom: 0,
    height: 28,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  optionRow: {
    borderBottomColor: '#F6F6FB',
    borderBottomWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: space.md,
  },
  optionRowTop: {
    borderTopColor: '#F6F6FB',
    borderTopWidth: 1,
  },
  optionText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 22,
    color: '#AFAFAF',
  },
  optionTextActive: {
    color: color.verificationBlue,
  },
  emptyText: {
    ...typography.body,
    color: color.textMuted,
    paddingVertical: space.lg,
  },
  pressed: {
    opacity: 0.72,
  },
});
