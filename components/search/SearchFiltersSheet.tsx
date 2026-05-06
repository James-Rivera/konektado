import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import type { DiscoveryGroupKey, MvpServiceOption, SearchWorkType } from '@/constants/service-taxonomy';
import { color, radius, space, typography } from '@/constants/theme';

export type SearchDiscoveryFilters = {
  workType: SearchWorkType;
  serviceGroup: 'all' | DiscoveryGroupKey;
  service: 'all' | MvpServiceOption;
  locationScope: 'same_barangay' | 'nearby';
  sort: 'relevant' | 'newest' | 'nearby';
};

type FilterOption<T extends string> = {
  key: T;
  label: string;
};

type SearchFiltersSheetProps = {
  filters: SearchDiscoveryFilters;
  groups: FilterOption<'all' | DiscoveryGroupKey>[];
  services: FilterOption<'all' | MvpServiceOption>[];
  visible: boolean;
  onApply: () => void;
  onChange: <K extends keyof SearchDiscoveryFilters>(
    key: K,
    value: SearchDiscoveryFilters[K],
  ) => void;
  onClose: () => void;
  onReset: () => void;
};

const WORK_TYPE_OPTIONS: FilterOption<SearchWorkType>[] = [
  { key: 'either', label: 'All' },
  { key: 'physical', label: 'Physical / on-site' },
  { key: 'digital', label: 'Digital / remote' },
];

const LOCATION_SCOPE_OPTIONS: FilterOption<SearchDiscoveryFilters['locationScope']>[] = [
  { key: 'same_barangay', label: 'Same barangay' },
  { key: 'nearby', label: 'Nearby' },
];

const SORT_OPTIONS: FilterOption<SearchDiscoveryFilters['sort']>[] = [
  { key: 'relevant', label: 'Most relevant' },
  { key: 'newest', label: 'Newest' },
  { key: 'nearby', label: 'Nearby' },
];

export function SearchFiltersSheet({
  filters,
  groups,
  services,
  visible,
  onApply,
  onChange,
  onClose,
  onReset,
}: SearchFiltersSheetProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [serviceSectionY, setServiceSectionY] = useState(0);

  const scrollToSpecificService = () => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        animated: true,
        y: Math.max(0, serviceSectionY - 20),
      });
    });
  };

  return (
    <BottomSheet maxHeight="88%" onClose={onClose} visible={visible}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Filters</Text>
        <Pressable
          accessibilityLabel="Close filters"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.textMuted} name="close" size={28} />
        </Pressable>
      </View>

      <View style={styles.separator} />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <FilterSection title="Work type">
          <View style={styles.chipRow}>
            {WORK_TYPE_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                selected={filters.workType === option.key}
                onPress={() => onChange('workType', option.key)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Service group">
          <View style={styles.groupRows}>
            {groups.map((group, index) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: filters.serviceGroup === group.key }}
                key={group.key}
                onPress={() => {
                  onChange('serviceGroup', group.key);
                  if (group.key !== 'all') {
                    scrollToSpecificService();
                  }
                }}
                style={({ pressed }) => [
                  styles.groupRow,
                  index === 0 && styles.groupRowTop,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.groupRowText,
                    filters.serviceGroup === group.key && styles.groupRowTextSelected,
                  ]}>
                  {group.label}
                </Text>
                <MaterialIcons
                  color={filters.serviceGroup === group.key ? color.primary : color.textSubtle}
                  name={filters.serviceGroup === group.key ? 'check' : 'chevron-right'}
                  size={22}
                />
              </Pressable>
            ))}
          </View>
        </FilterSection>

        <FilterSection onLayoutY={setServiceSectionY} title="Specific service">
          <View style={styles.chipRow}>
            {services.map((service) => (
              <ChoiceChip
                key={service.key}
                label={service.label}
                selected={filters.service === service.key}
                onPress={() => onChange('service', service.key)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Location scope">
          <View style={styles.chipRow}>
            {LOCATION_SCOPE_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                selected={filters.locationScope === option.key}
                onPress={() => onChange('locationScope', option.key)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Sort">
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                selected={filters.sort === option.key}
                onPress={() => onChange('sort', option.key)}
              />
            ))}
          </View>
        </FilterSection>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={onReset}
          style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onApply}
          style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}>
          <Text style={styles.applyButtonText}>Apply filters</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function FilterSection({
  title,
  children,
  onLayoutY,
}: {
  title: string;
  children: ReactNode;
  onLayoutY?: (y: number) => void;
}) {
  return (
    <View
      onLayout={(event) => {
        onLayoutY?.(event.nativeEvent.layout.y);
      }}
      style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChoiceChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : styles.chipDefault,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 22,
    lineHeight: 30,
  },
  closeButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  separator: {
    backgroundColor: color.border,
    height: 1,
  },
  content: {
    paddingBottom: space.sm,
  },
  section: {
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    gap: space.md,
    paddingVertical: space.lg,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
    fontSize: 16,
    lineHeight: 24,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 90,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipDefault: {
    backgroundColor: color.primarySoft,
    borderColor: color.border,
  },
  chipSelected: {
    backgroundColor: color.primary,
    borderColor: color.primary,
  },
  chipText: {
    ...typography.captionMedium,
    color: color.textMuted,
    textAlign: 'center',
  },
  chipTextSelected: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
  },
  groupRows: {
    borderBottomColor: '#F1F3F6',
    borderTopColor: '#F1F3F6',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  groupRow: {
    alignItems: 'center',
    borderBottomColor: '#F1F3F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
  },
  groupRowTop: {
    borderTopWidth: 0,
  },
  groupRowText: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  groupRowTextSelected: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
  footer: {
    gap: space.sm,
    paddingTop: space.sm,
  },
  resetButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 42,
  },
  resetButtonText: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  applyButton: {
    alignItems: 'center',
    backgroundColor: color.primary,
    borderRadius: 28,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 20,
  },
  applyButtonText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.75,
  },
});
