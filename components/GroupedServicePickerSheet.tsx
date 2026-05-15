import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { color, radius, space, typography } from '@/constants/theme';

type GroupedServicePickerSheetProps = {
  categories: readonly string[];
  description: string;
  mode?: 'single' | 'multi';
  searchPlaceholder: string;
  selectedCategory?: string | null;
  selectedService?: string | null;
  selectedServices?: string[];
  selectedCustomServices?: string[];
  servicesByCategory: Record<string, readonly string[]>;
  title: string;
  visible: boolean;
  onClose: () => void;
  onSelect?: (value: string) => void;
  onApplyMulti?: (value: { selectedServices: string[]; customServices: string[] }) => void;
};

export function GroupedServicePickerSheet({
  categories,
  description,
  mode = 'single',
  searchPlaceholder,
  selectedCategory,
  selectedService,
  selectedServices = [],
  selectedCustomServices = [],
  servicesByCategory,
  title,
  visible,
  onClose,
  onSelect,
  onApplyMulti,
}: GroupedServicePickerSheetProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategory ?? categories[0] ?? '');
  const [draftServices, setDraftServices] = useState<string[]>(selectedServices);
  const [draftCustomServices, setDraftCustomServices] = useState<string[]>(selectedCustomServices);
  const [customServiceText, setCustomServiceText] = useState('');

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setCustomServiceText('');
      return;
    }

    setActiveCategory(selectedCategory ?? categories[0] ?? '');
    setDraftServices(selectedServices);
    setDraftCustomServices(selectedCustomServices);
  }, [categories, selectedCategory, selectedCustomServices, selectedServices, visible]);

  const visibleServices = useMemo(() => {
    const categoryServices = servicesByCategory[activeCategory] ?? [];
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return categoryServices;

    return categoryServices.filter((service) => service.toLowerCase().includes(normalizedQuery));
  }, [activeCategory, query, servicesByCategory]);

  const selectService = (service: string) => {
    if (mode === 'multi') {
      setDraftServices((current) =>
        current.includes(service) ? current.filter((item) => item !== service) : [...current, service],
      );
      return;
    }

    onSelect?.(service);
    onClose();
  };

  const addCustomService = () => {
    const cleanValue = customServiceText.trim();
    if (!cleanValue) return;

    setDraftCustomServices((current) =>
      current.some((item) => item.toLowerCase() === cleanValue.toLowerCase())
        ? current
        : [...current, cleanValue],
    );
    setCustomServiceText('');
  };

  const removeCustomService = (service: string) => {
    setDraftCustomServices((current) => current.filter((item) => item !== service));
  };

  const applyMultiSelection = () => {
    onApplyMulti?.({
      selectedServices: draftServices,
      customServices: draftCustomServices,
    });
    onClose();
  };

  const selectedCount = draftServices.length + draftCustomServices.length;
  const isMulti = mode === 'multi';

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
        <Text style={styles.listHint}>
          {isMulti ? `${selectedCount} selected` : 'Choose one service for this post.'}
        </Text>
      </View>

      <View style={styles.listShell}>
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator>
          {visibleServices.map((service, index) => {
            const active = isMulti ? draftServices.includes(service) : service === selectedService;

            return (
              <Pressable
                accessibilityRole={isMulti ? 'checkbox' : 'button'}
                accessibilityState={isMulti ? { checked: active } : { selected: active }}
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
                ) : isMulti ? (
                  <MaterialIcons color={color.textSubtle} name="add-circle-outline" size={20} />
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

      {isMulti ? (
        <>
          <View style={styles.customBlock}>
            <View style={styles.customHeader}>
              <Text style={styles.sectionTitle}>Other service</Text>
              <Text style={styles.listHint}>Use this only when it is not listed above.</Text>
            </View>
            {draftCustomServices.length ? (
              <View style={styles.selectedRow}>
                {draftCustomServices.map((service) => (
                  <Pressable
                    accessibilityLabel={`Remove ${service}`}
                    accessibilityRole="button"
                    key={service}
                    onPress={() => removeCustomService(service)}
                    style={({ pressed }) => [styles.customPill, pressed && styles.pressed]}>
                    <Text style={styles.customPillText}>{service}</Text>
                    <MaterialIcons color={color.primary} name="close" size={15} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.customInputRow}>
              <TextInput
                onChangeText={setCustomServiceText}
                onSubmitEditing={addCustomService}
                placeholder="Add other service"
                placeholderTextColor={color.textSubtle}
                returnKeyType="done"
                style={styles.customInput}
                value={customServiceText}
              />
              <Pressable
                accessibilityRole="button"
                onPress={addCustomService}
                style={({ pressed }) => [styles.customAddButton, pressed && styles.pressed]}>
                <Text style={styles.customAddText}>Add</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
              <Text style={styles.secondaryActionText}>Cancel</Text>
            </Pressable>
            <View style={styles.primaryAction}>
              <PrimaryButton label="Apply services" onPress={applyMultiSelection} />
            </View>
          </View>
        </>
      ) : null}
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
  customBlock: {
    gap: space.sm,
  },
  customHeader: {
    gap: space.xs,
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  customPill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 32,
    paddingHorizontal: space.md,
  },
  customPillText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  customInputRow: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingLeft: space.md,
    paddingRight: space.xs,
  },
  customInput: {
    ...typography.body,
    color: color.text,
    flex: 1,
    minHeight: 42,
  },
  customAddButton: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.md,
  },
  customAddText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  sheetActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: space.lg,
  },
  secondaryActionText: {
    ...typography.bodyMedium,
    color: color.text,
  },
  primaryAction: {
    flex: 1,
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
