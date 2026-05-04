import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { color, radius, space, typography } from '@/constants/theme';

type PostOptionPickerSheetProps = {
  allOptions: string[];
  description: string;
  popularLabel?: string;
  popularOptions?: string[];
  searchPlaceholder: string;
  selectedValue?: string | null;
  title: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function PostOptionPickerSheet({
  allOptions,
  description,
  popularLabel = 'Popular',
  popularOptions = [],
  searchPlaceholder,
  selectedValue,
  title,
  visible,
  onClose,
  onSelect,
}: PostOptionPickerSheetProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return allOptions;
    return allOptions.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [allOptions, query]);

  const shownPopularOptions = useMemo(
    () => popularOptions.filter((option) => allOptions.includes(option)),
    [allOptions, popularOptions],
  );

  const selectOption = (option: string) => {
    onSelect(option);
    onClose();
  };

  return (
    <BottomSheet maxHeight="72%" onClose={onClose} visible={visible}>
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

      {shownPopularOptions.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{popularLabel}</Text>
          <View style={styles.pillRow}>
            {shownPopularOptions.map((option) => {
              const active = option === selectedValue;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={option}
                  onPress={() => selectOption(option)}
                  style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && styles.pressed]}>
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>All categories</Text>
        <MaterialIcons color={color.text} name="keyboard-arrow-up" size={22} />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
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
  section: {
    gap: space.lg,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: '#050505',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  pill: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 75,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  pillActive: {
    backgroundColor: color.cardTint,
    borderColor: color.primary,
  },
  pillText: {
    ...typography.captionMedium,
    color: color.textMuted,
    textAlign: 'center',
  },
  pillTextActive: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listContent: {
    paddingBottom: space.xl,
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
