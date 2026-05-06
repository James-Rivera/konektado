import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { color, radius, space, typography } from '@/constants/theme';

type GroupedServicePickerSheetProps = {
  categories: string[];
  description: string;
  searchPlaceholder: string;
  selectedCategory?: string | null;
  selectedService?: string | null;
  servicesByCategory: Record<string, string[]>;
  title: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function GroupedServicePickerSheet({
  categories,
  description,
  searchPlaceholder,
  selectedCategory,
  selectedService,
  servicesByCategory,
  title,
  visible,
  onClose,
  onSelect,
}: GroupedServicePickerSheetProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategory ?? categories[0] ?? '');

  useEffect(() => {
    if (!visible) {
      setQuery('');
      return;
    }

    setActiveCategory(selectedCategory ?? categories[0] ?? '');
  }, [categories, selectedCategory, visible]);

  const visibleServices = useMemo(() => {
    const categoryServices = servicesByCategory[activeCategory] ?? [];
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return categoryServices;

    return categoryServices.filter((service) => service.toLowerCase().includes(normalizedQuery));
  }, [activeCategory, query, servicesByCategory]);

  const selectService = (service: string) => {
    onSelect(service);
    onClose();
  };

  return (
    <BottomSheet maxHeight="76%" onClose={onClose} visible={visible}>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service categories</Text>
        <ScrollView
          contentContainerStyle={styles.categoryRow}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {categories.map((category) => {
            const active = category === activeCategory;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={category}
                onPress={() => setActiveCategory(category)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  active ? styles.categoryChipActive : styles.categoryChipDefault,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}>
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Services in {activeCategory}</Text>
        <Text style={styles.listHint}>Choose one service for this post.</Text>
      </View>

      <View style={styles.listShell}>
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator>
          {visibleServices.map((service, index) => {
            const active = service === selectedService;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={service}
                onPress={() => selectService(service)}
                style={({ pressed }) => [
                  styles.optionRow,
                  index === 0 && styles.optionRowTop,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {service}
                </Text>
                {active ? (
                  <MaterialIcons color={color.primary} name="check" size={20} />
                ) : null}
              </Pressable>
            );
          })}
          {!visibleServices.length ? (
            <Text style={styles.emptyText}>No matching services in this category.</Text>
          ) : null}
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
    color: color.text,
  },
  description: {
    ...typography.body,
    color: color.text,
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
    gap: space.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  categoryChipDefault: {
    backgroundColor: color.primarySoft,
    borderColor: color.border,
  },
  categoryChipActive: {
    backgroundColor: color.primary,
    borderColor: color.primary,
  },
  categoryChipText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  categoryChipTextActive: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
  },
  listHeader: {
    gap: space.xs,
    minHeight: 32,
  },
  listHint: {
    ...typography.caption,
    color: color.textMuted,
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
    alignItems: 'center',
    borderBottomColor: '#F6F6FB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingVertical: space.md,
  },
  optionRowTop: {
    borderTopColor: '#F6F6FB',
    borderTopWidth: 1,
  },
  optionText: {
    color: color.textMuted,
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 22,
  },
  optionTextActive: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
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
