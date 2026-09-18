import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { POPULAR_MVP_SERVICES } from '@/constants/service-taxonomy';
import { color, radius, space, typography } from '@/constants/theme';
import { addSkillToList, countSkills, searchSkillOptions } from '@/services/service-classification';

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
  multiActionLabel?: string;
  multiActionLoading?: boolean;
  /** Quick picks shown before the resident types anything. */
  quickPicks?: readonly string[];
  /** Heading for the quick picks, e.g. "Common skills". */
  quickPicksLabel?: string;
  /** Hard cap on selections (multi mode). Omit for no cap. */
  maxSelections?: number;
  /** Above this many selections, show a non-blocking focus reminder. */
  focusReminderThreshold?: number;
  onClose: () => void;
  onSelect?: (value: string) => void;
  onApplyMulti?: (
    value: { selectedServices: string[]; customServices: string[] },
  ) => boolean | void | Promise<boolean | void>;
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
  multiActionLabel = 'Done',
  multiActionLoading = false,
  quickPicks = POPULAR_MVP_SERVICES,
  quickPicksLabel = 'Common services',
  maxSelections,
  focusReminderThreshold,
  onClose,
  onSelect,
  onApplyMulti,
}: GroupedServicePickerSheetProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategory ?? categories[0] ?? '');
  const [draftServices, setDraftServices] = useState<string[]>(selectedServices);
  const [draftCustomServices, setDraftCustomServices] = useState<string[]>(selectedCustomServices);
  const [customServiceText, setCustomServiceText] = useState('');
  const [applying, setApplying] = useState(false);
  // Category browsing is a secondary fallback: residents should be able to add
  // a skill without first working out which category it belongs to.
  const [browseOpen, setBrowseOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Re-seed the drafts from props on open and clear the text inputs on close.
  // Done during render rather than in an effect so the sheet never paints one
  // frame of the previous session's selection.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setActiveCategory(selectedCategory ?? categories[0] ?? '');
      setDraftServices(selectedServices);
      setDraftCustomServices(selectedCustomServices);
    } else {
      setQuery('');
      setCustomServiceText('');
      setBrowseOpen(false);
      setNotice(null);
    }
  }

  /** Every service this picker is allowed to offer, across all categories. */
  const allServices = useMemo(
    () => new Set(categories.flatMap((category) => [...(servicesByCategory[category] ?? [])])),
    [categories, servicesByCategory],
  );

  /**
   * Search runs across the whole taxonomy and resolves aliases and local terms,
   * so "karpintero" finds Carpentry no matter which category chip is active.
   */
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    return searchSkillOptions(query, 8)
      .filter((result) => allServices.has(result.service))
      .map((result) => result.service);
  }, [allServices, query]);

  /** Services listed under the active category chip, used only when browsing. */
  const categoryServices = useMemo(
    () => [...(servicesByCategory[activeCategory] ?? [])],
    [activeCategory, servicesByCategory],
  );

  const hasQuery = Boolean(query.trim());
  const visibleQuickPicks = useMemo(
    () => quickPicks.filter((service) => allServices.has(service)),
    [allServices, quickPicks],
  );

  const selectService = (service: string) => {
    if (mode === 'multi') {
      const alreadySelected = draftServices.includes(service);

      if (!alreadySelected && maxSelections !== undefined) {
        const count = countSkills({ skills: draftServices, customSkills: draftCustomServices });
        if (count >= maxSelections) {
          setNotice(`You can add up to ${maxSelections}. Remove one first to add another.`);
          return;
        }
      }

      setNotice(null);
      setDraftServices((current) =>
        alreadySelected ? current.filter((item) => item !== service) : [...current, service],
      );
      return;
    }

    onSelect?.(service);
    onClose();
  };

  /**
   * Adds free text as a skill through the shared helper, so alias resolution,
   * normalized de-duplication, product-scope exclusions, and the cap behave
   * identically here, in onboarding, and in Create Service.
   */
  const addCustomService = () => {
    const outcome = addSkillToList({
      input: customServiceText,
      state: { skills: draftServices, customSkills: draftCustomServices },
      limit: maxSelections,
    });

    switch (outcome.status) {
      case 'empty':
        return;
      case 'blocked':
        setNotice("Konektado doesn't support this type of service yet.");
        return;
      case 'limit':
        setNotice(`You can add up to ${outcome.limit}. Remove one first to add another.`);
        return;
      case 'duplicate':
        setNotice('That is already on your list.');
        setCustomServiceText('');
        return;
      case 'added':
      default:
        setDraftServices(outcome.state.skills);
        setDraftCustomServices(outcome.state.customSkills);
        setCustomServiceText('');
        setQuery('');
        setNotice(null);
    }
  };

  /** Adds whatever is in the search box when nothing in the taxonomy matches. */
  const addTypedQueryAsCustom = () => {
    setCustomServiceText(query);
    const outcome = addSkillToList({
      input: query,
      state: { skills: draftServices, customSkills: draftCustomServices },
      limit: maxSelections,
    });

    if (outcome.status === 'added') {
      setDraftServices(outcome.state.skills);
      setDraftCustomServices(outcome.state.customSkills);
      setQuery('');
      setCustomServiceText('');
      setNotice(null);
      return;
    }

    if (outcome.status === 'blocked') {
      setNotice("Konektado doesn't support this type of service yet.");
      return;
    }

    if (outcome.status === 'limit') {
      setNotice(`You can add up to ${outcome.limit}. Remove one first to add another.`);
      return;
    }

    if (outcome.status === 'duplicate') {
      setNotice('That is already on your list.');
      setQuery('');
    }
  };

  const removeCustomService = (service: string) => {
    setDraftCustomServices((current) => current.filter((item) => item !== service));
  };

  const cancelMultiSelection = () => {
    setDraftServices(selectedServices);
    setDraftCustomServices(selectedCustomServices);
    setCustomServiceText('');
    setQuery('');
    onClose();
  };

  const applyMultiSelection = async () => {
    if (applying || multiActionLoading) return;

    setApplying(true);
    try {
      const result = await onApplyMulti?.({
        selectedServices: draftServices,
        customServices: draftCustomServices,
      });
      if (result === false) return;
      onClose();
    } finally {
      setApplying(false);
    }
  };

  const isMulti = mode === 'multi';
  const actionLoading = applying || multiActionLoading;
  const selectedCount = countSkills({ skills: draftServices, customSkills: draftCustomServices });
  const showFocusReminder =
    isMulti &&
    focusReminderThreshold !== undefined &&
    selectedCount >= focusReminderThreshold &&
    (maxSelections === undefined || selectedCount < maxSelections);

  const renderOptionRows = (services: string[]) =>
    services.map((service, index) => {
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
          <Text style={[styles.optionText, active && styles.optionTextActive]}>{service}</Text>
          {active ? (
            <MaterialIcons color={color.primary} name="check" size={20} />
          ) : isMulti ? (
            <MaterialIcons color={color.textSubtle} name="add-circle-outline" size={20} />
          ) : null}
        </Pressable>
      );
    });

  return (
    <BottomSheet maxHeight="90%" onClose={isMulti ? cancelMultiSelection : onClose} visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardFrame}>
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          style={styles.sheetScroll}
          showsVerticalScrollIndicator>
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

          {notice ? (
            <View style={styles.noticeBox}>
              <MaterialIcons color={color.textMuted} name="info-outline" size={18} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {showFocusReminder ? (
            <Text style={styles.listHint}>
              Tip: keep your list focused on the work you actually take on.
            </Text>
          ) : null}

          {hasQuery ? (
            <View>
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Results</Text>
                <Text style={styles.listHint}>
                  {isMulti ? `${selectedCount} selected` : 'Choose one service for this post.'}
                </Text>
              </View>

              {renderOptionRows(searchResults)}

              {!searchResults.length ? (
                <View style={styles.section}>
                  <Text style={styles.emptyText}>No exact match found.</Text>
                  {isMulti ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={addTypedQueryAsCustom}
                      style={({ pressed }) => [styles.customAddRow, pressed && styles.pressed]}>
                      <MaterialIcons color={color.primary} name="add" size={18} />
                      <Text style={styles.customAddRowText} numberOfLines={2}>
                        Add &quot;{query.trim()}&quot;
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <View style={styles.listHeader}>
                  <Text style={styles.sectionTitle}>{quickPicksLabel}</Text>
                  <Text style={styles.listHint}>
                    {isMulti ? `${selectedCount} selected` : 'Choose one service for this post.'}
                  </Text>
                </View>
                <View style={styles.quickPickRow}>
                  {visibleQuickPicks.map((service) => {
                    const active = isMulti
                      ? draftServices.includes(service)
                      : service === selectedService;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        key={service}
                        onPress={() => selectService(service)}
                        style={({ pressed }) => [
                          styles.quickPick,
                          active && styles.quickPickActive,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={[styles.quickPickText, active && styles.quickPickTextActive]}>
                          {service}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: browseOpen }}
                  onPress={() => setBrowseOpen((current) => !current)}
                  style={({ pressed }) => [styles.browseToggle, pressed && styles.pressed]}>
                  <Text style={styles.sectionTitle}>Browse by type</Text>
                  <MaterialIcons
                    color={color.primary}
                    name={browseOpen ? 'expand-less' : 'chevron-right'}
                    size={22}
                  />
                </Pressable>

                {browseOpen ? (
                  <>
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

                    {renderOptionRows(categoryServices)}
                  </>
                ) : null}
              </View>
            </>
          )}

          {isMulti ? (
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
          ) : null}
        </ScrollView>

        {isMulti ? (
          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              disabled={actionLoading}
              onPress={cancelMultiSelection}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
              <Text style={styles.secondaryActionText}>Cancel</Text>
            </Pressable>
            <View style={styles.primaryAction}>
              <PrimaryButton
                label={multiActionLabel}
                loading={actionLoading}
                onPress={applyMultiSelection}
              />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  keyboardFrame: {
    flexShrink: 1,
    gap: space.md,
    maxHeight: '100%',
    minHeight: 0,
  },
  sheetScroll: {
    flexShrink: 1,
  },
  sheetContent: {
    gap: space.lg,
    paddingBottom: space.xl,
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
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    marginHorizontal: -space.xl,
    marginTop: space.xs,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
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
  quickPickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  quickPick: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  quickPickActive: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  quickPickText: {
    ...typography.bodyMedium,
    color: color.textMuted,
  },
  quickPickTextActive: {
    color: color.primary,
  },
  browseToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
  },
  noticeBox: {
    alignItems: 'flex-start',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
  },
  noticeText: {
    ...typography.captionMedium,
    color: color.textMuted,
    flex: 1,
  },
  customAddRow: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  customAddRowText: {
    ...typography.bodyMedium,
    color: color.primary,
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
