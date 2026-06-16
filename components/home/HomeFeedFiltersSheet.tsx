import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import {
  MVP_SERVICE_CATEGORIES,
  type MvpServiceCategory,
  type SearchWorkType,
} from '@/constants/service-taxonomy';
import { color, radius, space, typography } from '@/constants/theme';
import type {
  HomeFeedFilters,
  HomeFeedLocationPreference,
  HomeFeedSort,
  HomeFeedType,
} from '@/services/home-feed.service';

type FilterOption<T extends string> = {
  key: T;
  label: string;
};

type HomeFeedFiltersSheetProps = {
  filters: HomeFeedFilters;
  onAdvancedSearch: () => void;
  onApply: () => void;
  onChange: <K extends keyof HomeFeedFilters>(
    key: K,
    value: HomeFeedFilters[K],
  ) => void;
  onClose: () => void;
  onPersonalizeHomeSearch: () => void;
  onReset: () => void;
  visible: boolean;
};

const FEED_TYPE_OPTIONS: FilterOption<HomeFeedType>[] = [
  { key: 'all', label: 'All' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'services', label: 'Services' },
];

const WORK_TYPE_OPTIONS: FilterOption<SearchWorkType>[] = [
  { key: 'either', label: 'Any' },
  { key: 'physical', label: 'On-site / physical' },
  { key: 'digital', label: 'Digital / remote' },
];

const LOCATION_OPTIONS: FilterOption<HomeFeedLocationPreference>[] = [
  { key: 'same_barangay', label: 'Same barangay' },
  { key: 'nearby', label: 'Nearby areas' },
  { key: 'any', label: 'Any location' },
];

const SORT_OPTIONS: FilterOption<HomeFeedSort>[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'newest', label: 'Newest' },
  { key: 'nearby', label: 'Relevant nearby' },
];

export function HomeFeedFiltersSheet({
  filters,
  onAdvancedSearch,
  onApply,
  onChange,
  onClose,
  onPersonalizeHomeSearch,
  onReset,
  visible,
}: HomeFeedFiltersSheetProps) {
  return (
    <BottomSheet maxHeight="88%" onClose={onClose} visible={visible}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Feed filters</Text>
          <Text style={styles.subtitle}>Tune what appears on Home.</Text>
        </View>
        <Pressable
          accessibilityLabel="Close feed filters"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.textMuted} name="close" size={28} />
        </Pressable>
      </View>

      <View style={styles.separator} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <FilterSection title="Feed type">
          <View style={styles.chipRow}>
            {FEED_TYPE_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                onPress={() => onChange('feedType', option.key)}
                selected={filters.feedType === option.key}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Work / service mode">
          <View style={styles.chipRow}>
            {WORK_TYPE_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                onPress={() => onChange('workType', option.key)}
                selected={filters.workType === option.key}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Category">
          <View style={styles.chipRow}>
            <ChoiceChip
              label="All categories"
              onPress={() => onChange('category', 'all')}
              selected={filters.category === 'all'}
            />
            {MVP_SERVICE_CATEGORIES.map((category) => (
              <ChoiceChip
                key={category}
                label={category}
                onPress={() => onChange('category', category as MvpServiceCategory)}
                selected={filters.category === category}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Location preference">
          <View style={styles.chipRow}>
            {LOCATION_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                onPress={() => onChange('locationPreference', option.key)}
                selected={filters.locationPreference === option.key}
              />
            ))}
          </View>
          <Text style={styles.helperText}>
            Nearby uses barangay and city text for now, not exact distance.
          </Text>
        </FilterSection>

        <FilterSection title="Sort">
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                onPress={() => onChange('sort', option.key)}
                selected={filters.sort === option.key}
              />
            ))}
          </View>
        </FilterSection>

        <Pressable
          accessibilityRole="button"
          onPress={onPersonalizeHomeSearch}
          style={({ pressed }) => [styles.personalizeButton, pressed && styles.pressed]}>
          <View style={styles.personalizeIcon}>
            <MaterialIcons color={color.verificationBlue} name="tune" size={20} />
          </View>
          <View style={styles.personalizeCopy}>
            <Text style={styles.personalizeTitle}>Personalize Home & Search</Text>
            <Text style={styles.personalizeSubtitle}>Choose what recommendations prioritize first.</Text>
          </View>
          <MaterialIcons color={color.textSubtle} name="chevron-right" size={22} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onAdvancedSearch}
          style={({ pressed }) => [styles.advancedSearchButton, pressed && styles.pressed]}>
          <Text style={styles.advancedSearchText}>Advanced search</Text>
          <MaterialIcons color={color.primary} name="arrow-forward" size={18} />
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={onReset}
          style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
          <Text style={styles.resetButtonText}>Reset filters</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onApply}
          style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}>
          <Text style={styles.applyButtonText}>Apply</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function FilterSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
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
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 22,
    lineHeight: 30,
  },
  subtitle: {
    ...typography.caption,
    color: color.textMuted,
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
  helperText: {
    ...typography.caption,
    color: color.textSubtle,
  },
  advancedSearchButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
    justifyContent: 'center',
    minHeight: 42,
    paddingTop: space.md,
  },
  advancedSearchText: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  personalizeButton: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.md,
    minHeight: 72,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  personalizeIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  personalizeCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  personalizeTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  personalizeSubtitle: {
    ...typography.caption,
    color: color.textMuted,
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
