import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import {
  OnboardingButton,
  OnboardingFormScaffold,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';
import {
  getCategoryForMvpService,
  getDisplayLabelForMvpService,
  getDisplayLabelForOfferedDeliveryMode,
  getMvpCategoriesForOfferedDeliveryMode,
  getServicesForMvpCategoryAndOfferedDeliveryMode,
  isMvpServiceCategory,
  OFFERED_DELIVERY_MODE_HELPERS,
  OFFERED_DELIVERY_MODE_LABELS,
  OFFERED_DELIVERY_MODES,
  type MvpServiceCategory,
  type OfferedDeliveryMode,
} from '@/constants/service-taxonomy';

import { useOnboarding } from './onboarding-context';

type ServiceSetupSheet =
  | 'providerWorkSetup'
  | 'providerCategories'
  | 'providerServices'
  | 'clientHelpSetup'
  | 'clientCategories'
  | 'clientServices'
  | null;

const NEEDED_DELIVERY_MODE_HELPERS: Record<OfferedDeliveryMode, string> = {
  on_site: 'Help that happens in person nearby.',
  online: 'Help that can happen remotely.',
  both: 'Show both on-site and online help.',
};

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseCustomServices(value: string) {
  return uniqueValues(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function categoryListForServices(services: string[]) {
  return uniqueValues(
    services
      .map((service) => getCategoryForMvpService(service))
      .filter((category): category is MvpServiceCategory => Boolean(category)),
  );
}

function formatSummary(values: string[], empty: string) {
  if (!values.length) return empty;
  if (values.length <= 2) return values.join(', ');
  return `${values.slice(0, 2).join(', ')} +${values.length - 2} more`;
}

export default function JobStep() {
  const router = useRouter();
  const { draft, role, updateDraft } = useOnboarding();
  const collectsOffered = role === 'provider';
  const collectsNeeded = role === 'client';
  const [offeredDeliveryMode, setOfferedDeliveryMode] = useState<OfferedDeliveryMode | null>(
    draft.offeredDeliveryMode,
  );
  const [offeredServices, setOfferedServices] = useState<string[]>(draft.offeredServices);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryListForServices(draft.offeredServices),
  );
  const [neededDeliveryMode, setNeededDeliveryMode] = useState<OfferedDeliveryMode | null>(
    draft.neededServices.length || draft.customNeededServices.length ? 'both' : null,
  );
  const [selectedNeededCategories, setSelectedNeededCategories] = useState<string[]>(
    categoryListForServices(draft.neededServices),
  );
  const [neededServices, setNeededServices] = useState<string[]>(draft.neededServices);
  const [customOffered, setCustomOffered] = useState(draft.customOfferedServices.join(', '));
  const [customNeeded, setCustomNeeded] = useState(draft.customNeededServices.join(', '));
  const [activeSheet, setActiveSheet] = useState<ServiceSetupSheet>(null);
  const [showCustomServiceInput, setShowCustomServiceInput] = useState(false);
  const [showCustomNeededInput, setShowCustomNeededInput] = useState(false);
  const [inlineHelper, setInlineHelper] = useState<string | null>(null);
  const [neededHelper, setNeededHelper] = useState<string | null>(null);

  useEffect(() => {
    if (collectsOffered || collectsNeeded) return;

    router.replace({
      pathname: '/(auth)/role',
      params: { returnTo: '/(onboarding)/job' },
    });
  }, [collectsNeeded, collectsOffered, router]);

  const customOfferedServices = useMemo(() => parseCustomServices(customOffered), [customOffered]);
  const customNeededServices = useMemo(() => parseCustomServices(customNeeded), [customNeeded]);
  const selectedCategoryLabels = selectedCategories.filter(isMvpServiceCategory);
  const selectedNeededCategoryLabels = selectedNeededCategories.filter(isMvpServiceCategory);
  const officialServiceLabels = offeredServices.map((service) => getDisplayLabelForMvpService(service));
  const neededServiceLabels = neededServices.map((service) => getDisplayLabelForMvpService(service));
  const allOfferedLabels = [...officialServiceLabels, ...customOfferedServices];
  const allNeededLabels = [...neededServiceLabels, ...customNeededServices];
  const providerCanContinue = Boolean(offeredDeliveryMode && allOfferedLabels.length);
  const clientCanContinue = Boolean(neededDeliveryMode && allNeededLabels.length);

  const openCategories = () => {
    if (!offeredDeliveryMode) {
      setInlineHelper('Choose your work setup first.');
      return;
    }

    setInlineHelper(null);
    setActiveSheet('providerCategories');
  };

  const openServices = ({ showCustom = false } = {}) => {
    if (!selectedCategories.length) {
      setInlineHelper('Choose a category first.');
      return;
    }

    setInlineHelper(null);
    setShowCustomServiceInput(showCustom);
    setActiveSheet('providerServices');
  };

  const openNeededCategories = () => {
    if (!neededDeliveryMode) {
      setNeededHelper('Choose where you need help first.');
      return;
    }

    setNeededHelper(null);
    setActiveSheet('clientCategories');
  };

  const openNeededServices = ({ showCustom = false } = {}) => {
    if (!selectedNeededCategories.length) {
      setNeededHelper('Choose a category first.');
      return;
    }

    setNeededHelper(null);
    setShowCustomNeededInput(showCustom);
    setActiveSheet('clientServices');
  };

  const confirmDeliveryMode = (mode: OfferedDeliveryMode) => {
    setOfferedDeliveryMode(mode);
    setInlineHelper(null);

    const allowedCategories = getMvpCategoriesForOfferedDeliveryMode(mode);
    setSelectedCategories((prev) => prev.filter((category) => allowedCategories.includes(category as MvpServiceCategory)));
    setOfferedServices((prev) =>
      prev.filter((service) => {
        const category = getCategoryForMvpService(service);
        return Boolean(category && allowedCategories.includes(category));
      }),
    );
  };

  const confirmCategories = (categories: string[]) => {
    setSelectedCategories(categories);
    setInlineHelper(null);
    setOfferedServices((prev) =>
      prev.filter((service) => {
        const category = getCategoryForMvpService(service);
        return Boolean(category && categories.includes(category));
      }),
    );
  };

  const confirmNeededDeliveryMode = (mode: OfferedDeliveryMode) => {
    setNeededDeliveryMode(mode);
    setNeededHelper(null);
    const allowedCategories = getMvpCategoriesForOfferedDeliveryMode(mode);
    setSelectedNeededCategories((prev) =>
      prev.filter((category) => allowedCategories.includes(category as MvpServiceCategory)),
    );
    setNeededServices((prev) =>
      prev.filter((service) => {
        const category = getCategoryForMvpService(service);
        return Boolean(
          category &&
            getServicesForMvpCategoryAndOfferedDeliveryMode(category, mode).includes(service),
        );
      }),
    );
  };

  const confirmNeededCategories = (categories: string[]) => {
    setSelectedNeededCategories(categories);
    setNeededHelper(null);
    setNeededServices((prev) =>
      prev.filter((service) => {
        const category = getCategoryForMvpService(service);
        return Boolean(category && categories.includes(category));
      }),
    );
  };

  const next = () => {
    if (!collectsOffered && !collectsNeeded) {
      Alert.alert(
        'Choose how you will use Konektado',
        'Select whether you want to find work or hire someone before choosing services.',
      );
      router.replace({
        pathname: '/(auth)/role',
        params: { returnTo: '/(onboarding)/job' },
      });
      return;
    }

    const parsedCustomOfferedServices = parseCustomServices(customOffered);
    const finalOffered = uniqueValues([...offeredServices, ...parsedCustomOfferedServices]);
    const finalNeeded = uniqueValues([...neededServices, ...customNeededServices]);

    if (collectsOffered && !offeredDeliveryMode) {
      setInlineHelper('Choose your work setup first.');
      return;
    }

    if (collectsOffered && !finalOffered.length) {
      setInlineHelper('Select at least one service you can offer.');
      return;
    }

    if (collectsNeeded && !finalNeeded.length) {
      setNeededHelper('Select one or more types of help you may need nearby.');
      return;
    }

    updateDraft({
      offeredDeliveryMode,
      offeredServices,
      neededServices,
      customOfferedServices: parsedCustomOfferedServices,
      customNeededServices,
      serviceType: finalOffered.join(', '),
      certificationDetails: '',
      hasCertifications: null,
      verificationFiles: [],
      verificationNote: '',
      wantsBarangayVerification: false,
    });

    router.push('/(onboarding)/review');
  };

  const footer = collectsOffered ? (
    <OnboardingButton
      disabled={!providerCanContinue}
      label="Next"
      onDisabledPress={() => setInlineHelper('Select at least one service you can offer.')}
      onPress={next}
      style={!providerCanContinue ? styles.disabledBlueButton : undefined}
      textStyle={!providerCanContinue ? styles.disabledBlueButtonText : undefined}
    />
  ) : collectsNeeded ? (
    <OnboardingButton
      disabled={!clientCanContinue}
      label="Next"
      onDisabledPress={() =>
        setNeededHelper(
          neededDeliveryMode
            ? 'Select one or more types of help you may need nearby.'
            : 'Choose where you need help first.',
        )
      }
      onPress={next}
      style={!clientCanContinue ? styles.disabledBlueButton : undefined}
      textStyle={!clientCanContinue ? styles.disabledBlueButtonText : undefined}
    />
  ) : (
    <OnboardingButton label="Next" onPress={next} />
  );

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        contentStyle={styles.content}
        currentStep={3}
        footer={footer}
        helper={
          role === 'client'
            ? 'Choose a few services so Home can show better services first.'
            : 'This helps Konektado show better jobs and requests.'
        }
        onBack={() => router.back()}
        title={role === 'client' ? 'What help do you need nearby?' : 'What services can you offer?'}>
        {collectsOffered ? (
          <ProviderServiceSetup
            categorySummary={formatSummary(selectedCategoryLabels, 'Choose service categories')}
            customSummary={formatSummary(customOfferedServices, 'Add a service not listed')}
            helper={inlineHelper}
            onOpenCategories={openCategories}
            onOpenServices={() => openServices()}
            onOpenWorkSetup={() => {
              setInlineHelper(null);
              setActiveSheet('providerWorkSetup');
            }}
            onOpenCustom={() => openServices({ showCustom: true })}
            serviceSummary={formatSummary(allOfferedLabels, 'Choose specific services')}
            servicesDisabled={!selectedCategories.length}
            categoriesDisabled={!offeredDeliveryMode}
            workSetupSummary={
              offeredDeliveryMode
                ? getDisplayLabelForOfferedDeliveryMode(offeredDeliveryMode)
                : 'Choose how you offer services'
            }
          />
        ) : null}

        {collectsNeeded ? (
          <ClientServiceSetup
            categorySummary={formatSummary(selectedNeededCategoryLabels, 'Choose service categories')}
            customSummary={formatSummary(customNeededServices, 'Add help not listed')}
            helper={neededHelper}
            onOpenCategories={openNeededCategories}
            onOpenCustom={() => openNeededServices({ showCustom: true })}
            onOpenHelpSetup={() => {
              setNeededHelper(null);
              setActiveSheet('clientHelpSetup');
            }}
            onOpenServices={() => openNeededServices()}
            serviceSummary={formatSummary(allNeededLabels, 'Choose specific help')}
            servicesDisabled={!selectedNeededCategories.length}
            categoriesDisabled={!neededDeliveryMode}
            helpSetupSummary={
              neededDeliveryMode
                ? getDisplayLabelForOfferedDeliveryMode(neededDeliveryMode)
                : 'Choose where you need help'
            }
          />
        ) : null}
      </OnboardingFormScaffold>

      <WorkSetupSheet
        helpers={OFFERED_DELIVERY_MODE_HELPERS}
        onClose={() => setActiveSheet(null)}
        onDone={confirmDeliveryMode}
        selectedMode={offeredDeliveryMode}
        title="Choose work setup"
        visible={activeSheet === 'providerWorkSetup'}
      />
      <CategoriesSheet
        deliveryMode={offeredDeliveryMode}
        onClose={() => setActiveSheet(null)}
        onDone={confirmCategories}
        selectedCategories={selectedCategories}
        visible={activeSheet === 'providerCategories'}
      />
      <ServicesSheet
        customValue={customOffered}
        customInputLabel="What service can you offer?"
        customPlaceholder="e.g. Pet sitting"
        deliveryMode={offeredDeliveryMode}
        initialShowCustom={showCustomServiceInput}
        onClose={() => setActiveSheet(null)}
        onDone={({ customService, services }) => {
          setOfferedServices(services);
          setCustomOffered(customService);
          setInlineHelper(null);
        }}
        otherHelper="Add a service not listed in the taxonomy."
        otherTitle="Other service"
        selectedCategories={selectedCategories}
        selectedServices={offeredServices}
        title="Choose services"
        visible={activeSheet === 'providerServices'}
      />
      <WorkSetupSheet
        helpers={NEEDED_DELIVERY_MODE_HELPERS}
        onClose={() => setActiveSheet(null)}
        onDone={confirmNeededDeliveryMode}
        selectedMode={neededDeliveryMode}
        title="Choose help setup"
        visible={activeSheet === 'clientHelpSetup'}
      />
      <CategoriesSheet
        deliveryMode={neededDeliveryMode}
        onClose={() => setActiveSheet(null)}
        onDone={confirmNeededCategories}
        selectedCategories={selectedNeededCategories}
        visible={activeSheet === 'clientCategories'}
      />
      <ServicesSheet
        customValue={customNeeded}
        customInputLabel="What help do you need?"
        customPlaceholder="e.g. Child pickup"
        deliveryMode={neededDeliveryMode}
        initialShowCustom={showCustomNeededInput}
        onClose={() => setActiveSheet(null)}
        onDone={({ customService, services }) => {
          setNeededServices(services);
          setCustomNeeded(customService);
          setNeededHelper(null);
        }}
        otherHelper="Add help not listed in the taxonomy."
        otherTitle="Other help"
        selectedCategories={selectedNeededCategories}
        selectedServices={neededServices}
        title="Choose help"
        visible={activeSheet === 'clientServices'}
      />
    </>
  );
}

function ProviderServiceSetup({
  categoriesDisabled,
  categorySummary,
  customSummary,
  helper,
  onOpenCategories,
  onOpenCustom,
  onOpenServices,
  onOpenWorkSetup,
  serviceSummary,
  servicesDisabled,
  workSetupSummary,
}: {
  categoriesDisabled: boolean;
  categorySummary: string;
  customSummary: string;
  helper: string | null;
  onOpenCategories: () => void;
  onOpenCustom: () => void;
  onOpenServices: () => void;
  onOpenWorkSetup: () => void;
  serviceSummary: string;
  servicesDisabled: boolean;
  workSetupSummary: string;
}) {
  return (
    <View style={styles.selectorStack}>
      <SelectorCard
        label="Work setup"
        onPress={onOpenWorkSetup}
        placeholder="Choose how you offer services"
        value={workSetupSummary}
      />
      <SelectorCard
        disabled={categoriesDisabled}
        label="Categories"
        onPress={onOpenCategories}
        placeholder="Choose service categories"
        value={categorySummary}
      />
      <SelectorCard
        disabled={servicesDisabled}
        label="Services"
        onPress={onOpenServices}
        placeholder="Choose specific services"
        value={serviceSummary}
      />
      <SelectorCard
        disabled={servicesDisabled}
        label="Other service"
        onPress={onOpenCustom}
        optional
        placeholder="Add a service not listed"
        value={customSummary}
      />
      {helper ? <Text style={styles.inlineHelper}>{helper}</Text> : null}
    </View>
  );
}

function SelectorCard({
  disabled = false,
  label,
  onPress,
  optional = false,
  placeholder,
  value,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  optional?: boolean;
  placeholder: string;
  value: string;
}) {
  const empty = value === placeholder;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectorCard,
        disabled && styles.selectorCardDisabled,
        pressed && styles.pressed,
      ]}>
      <View style={styles.selectorCopy}>
        <View style={styles.selectorLabelRow}>
          <Text style={styles.selectorLabel}>{label}</Text>
          {optional ? <Text style={styles.optionalLabel}>Optional</Text> : null}
        </View>
        <Text style={[styles.selectorValue, empty && styles.selectorPlaceholder]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <MaterialIcons
        color={disabled ? onboardingColors.placeholder : onboardingColors.textMuted}
        name="chevron-right"
        size={24}
      />
    </Pressable>
  );
}

function WorkSetupSheet({
  helpers,
  onClose,
  onDone,
  selectedMode,
  title,
  visible,
}: {
  helpers: Record<OfferedDeliveryMode, string>;
  onClose: () => void;
  onDone: (mode: OfferedDeliveryMode) => void;
  selectedMode: OfferedDeliveryMode | null;
  title: string;
  visible: boolean;
}) {
  const [draftMode, setDraftMode] = useState<OfferedDeliveryMode | null>(selectedMode);

  useEffect(() => {
    if (visible) setDraftMode(selectedMode);
  }, [selectedMode, visible]);

  return (
    <BottomSheet maxHeight="58%" onClose={onClose} visible={visible}>
      <SheetHeader title={title} />
      <View style={styles.sheetList}>
        {OFFERED_DELIVERY_MODES.map((mode) => {
          const selected = draftMode === mode;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={mode}
              onPress={() => setDraftMode(mode)}
              style={({ pressed }) => [styles.optionRow, selected && styles.optionRowSelected, pressed && styles.pressed]}>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{OFFERED_DELIVERY_MODE_LABELS[mode]}</Text>
                <Text style={styles.optionHelper}>{helpers[mode]}</Text>
              </View>
              <SelectionMark selected={selected} />
            </Pressable>
          );
        })}
      </View>
      <OnboardingButton
        disabled={!draftMode}
        label="Done"
        onPress={() => {
          if (!draftMode) return;
          onDone(draftMode);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

function CategoriesSheet({
  deliveryMode,
  onClose,
  onDone,
  selectedCategories,
  visible,
}: {
  deliveryMode: OfferedDeliveryMode | null;
  onClose: () => void;
  onDone: (categories: string[]) => void;
  selectedCategories: string[];
  visible: boolean;
}) {
  const [draftCategories, setDraftCategories] = useState<string[]>(selectedCategories);
  const categories = useMemo(
    () => (deliveryMode ? getMvpCategoriesForOfferedDeliveryMode(deliveryMode) : []),
    [deliveryMode],
  );

  useEffect(() => {
    if (visible) {
      setDraftCategories(selectedCategories.filter((category) => categories.includes(category as MvpServiceCategory)));
    }
  }, [categories, selectedCategories, visible]);

  const toggleCategory = (category: string) => {
    setDraftCategories((prev) =>
      prev.includes(category) ? prev.filter((value) => value !== category) : [...prev, category],
    );
  };

  return (
    <BottomSheet maxHeight="60%" onClose={onClose} visible={visible}>
      <SheetHeader title="Choose categories" />
      <View style={styles.sheetList}>
        {categories.map((category) => {
          const selected = draftCategories.includes(category);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={category}
              onPress={() => toggleCategory(category)}
              style={({ pressed }) => [styles.optionRow, selected && styles.optionRowSelected, pressed && styles.pressed]}>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{category}</Text>
                <Text style={styles.optionHelper}>
                  {getServicesForMvpCategoryAndOfferedDeliveryMode(category, deliveryMode ?? 'both').length} services available
                </Text>
              </View>
              <SelectionMark selected={selected} />
            </Pressable>
          );
        })}
      </View>
      <OnboardingButton
        disabled={!draftCategories.length}
        label="Done"
        onPress={() => {
          onDone(draftCategories);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

function ServicesSheet({
  customValue,
  customInputLabel,
  customPlaceholder,
  deliveryMode,
  initialShowCustom,
  onClose,
  onDone,
  otherHelper,
  otherTitle,
  selectedCategories,
  selectedServices,
  title,
  visible,
}: {
  customValue: string;
  customInputLabel: string;
  customPlaceholder: string;
  deliveryMode: OfferedDeliveryMode | null;
  initialShowCustom: boolean;
  onClose: () => void;
  onDone: (value: { customService: string; services: string[] }) => void;
  otherHelper: string;
  otherTitle: string;
  selectedCategories: string[];
  selectedServices: string[];
  title: string;
  visible: boolean;
}) {
  const [draftServices, setDraftServices] = useState<string[]>(selectedServices);
  const [draftCustom, setDraftCustom] = useState(customValue);
  const [showCustom, setShowCustom] = useState(initialShowCustom);

  useEffect(() => {
    if (!visible) return;
    setDraftServices(selectedServices);
    setDraftCustom(customValue);
    setShowCustom(initialShowCustom || Boolean(customValue.trim()));
  }, [customValue, initialShowCustom, selectedServices, visible]);

  const toggleService = (service: string) => {
    setDraftServices((prev) =>
      prev.includes(service) ? prev.filter((value) => value !== service) : [...prev, service],
    );
  };

  return (
    <BottomSheet maxHeight="82%" onClose={onClose} visible={visible}>
      <SheetHeader title={title} />
      <ScrollView
        contentContainerStyle={styles.serviceSheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator>
        {selectedCategories.filter(isMvpServiceCategory).map((category) => {
          const services = deliveryMode
            ? getServicesForMvpCategoryAndOfferedDeliveryMode(category, deliveryMode)
            : [];

          if (!services.length) return null;

          return (
            <View key={category} style={styles.serviceGroup}>
              <Text style={styles.sheetSectionTitle}>{category}</Text>
              <View style={styles.serviceChipContainer}>
                {services.map((service) => {
                  const selected = draftServices.includes(service);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      key={service}
                      onPress={() => toggleService(service)}
                      style={({ pressed }) => [
                        styles.chip,
                        selected && styles.chipSelected,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {getDisplayLabelForMvpService(service)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.serviceGroup}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowCustom((value) => !value)}
            style={({ pressed }) => [styles.otherServiceRow, showCustom && styles.optionRowSelected, pressed && styles.pressed]}>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>{otherTitle}</Text>
              <Text style={styles.optionHelper}>{otherHelper}</Text>
            </View>
            <MaterialIcons
              color={onboardingColors.textMuted}
              name={showCustom ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={24}
            />
          </Pressable>
          {showCustom ? (
            <View style={styles.customInputShell}>
              <Text style={styles.customInputLabel}>{customInputLabel}</Text>
              <TextInput
                autoCapitalize="sentences"
                onChangeText={setDraftCustom}
                placeholder={customPlaceholder}
                placeholderTextColor={onboardingColors.placeholder}
                style={styles.customInput}
                value={draftCustom}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
      <OnboardingButton
        label="Done"
        onPress={() => {
          onDone({ customService: draftCustom, services: draftServices });
          onClose();
        }}
      />
    </BottomSheet>
  );
}

function SheetHeader({ title }: { title: string }) {
  return (
    <View style={styles.sheetHeader}>
      <Text style={styles.sheetTitle}>{title}</Text>
    </View>
  );
}

function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.selectionMark, selected && styles.selectionMarkSelected]}>
      {selected ? <MaterialIcons color={onboardingColors.white} name="check" size={14} /> : null}
    </View>
  );
}

function ClientServiceSetup({
  categoriesDisabled,
  categorySummary,
  customSummary,
  helpSetupSummary,
  helper,
  onOpenCategories,
  onOpenCustom,
  onOpenHelpSetup,
  onOpenServices,
  serviceSummary,
  servicesDisabled,
}: {
  categoriesDisabled: boolean;
  categorySummary: string;
  customSummary: string;
  helpSetupSummary: string;
  helper: string | null;
  onOpenCategories: () => void;
  onOpenCustom: () => void;
  onOpenHelpSetup: () => void;
  onOpenServices: () => void;
  serviceSummary: string;
  servicesDisabled: boolean;
}) {
  return (
    <View style={styles.selectorStack}>
      <SelectorCard
        label="Help setup"
        onPress={onOpenHelpSetup}
        placeholder="Choose where you need help"
        value={helpSetupSummary}
      />
      <SelectorCard
        disabled={categoriesDisabled}
        label="Categories"
        onPress={onOpenCategories}
        placeholder="Choose service categories"
        value={categorySummary}
      />
      <SelectorCard
        disabled={servicesDisabled}
        label="Services"
        onPress={onOpenServices}
        placeholder="Choose specific help"
        value={serviceSummary}
      />
      <SelectorCard
        disabled={servicesDisabled}
        label="Other help"
        onPress={onOpenCustom}
        optional
        placeholder="Add help not listed"
        value={customSummary}
      />
      {helper ? <Text style={styles.inlineHelper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 28,
    paddingTop: 36,
  },
  selectorStack: {
    gap: 12,
    width: '100%',
  },
  selectorCard: {
    alignItems: 'center',
    backgroundColor: onboardingColors.surface,
    borderColor: onboardingColors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  selectorCardDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.68,
  },
  selectorCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  selectorLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  selectorLabel: {
    color: onboardingColors.placeholder,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 12,
  },
  optionalLabel: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 10,
    lineHeight: 12,
  },
  selectorValue: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 15,
    lineHeight: 20,
  },
  selectorPlaceholder: {
    color: onboardingColors.textMuted,
  },
  inlineHelper: {
    color: '#B91C1C',
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 2,
  },
  sheetHeader: {
    gap: 4,
  },
  sheetTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  sheetList: {
    gap: 8,
  },
  optionRow: {
    alignItems: 'center',
    borderColor: onboardingColors.borderSoft,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionRowSelected: {
    backgroundColor: '#EEF5FF',
    borderColor: onboardingColors.actionBlue,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  optionTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  optionHelper: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  selectionMark: {
    alignItems: 'center',
    borderColor: '#D6DCE5',
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  selectionMarkSelected: {
    backgroundColor: onboardingColors.actionBlue,
    borderColor: onboardingColors.actionBlue,
  },
  serviceSheetContent: {
    gap: 16,
    paddingBottom: 8,
  },
  serviceGroup: {
    gap: 10,
  },
  sheetSectionTitle: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  serviceChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  otherServiceRow: {
    alignItems: 'center',
    borderColor: onboardingColors.borderSoft,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  customInputShell: {
    backgroundColor: onboardingColors.surface,
    borderColor: onboardingColors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  customInputLabel: {
    color: onboardingColors.placeholder,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 12,
  },
  customInput: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    minHeight: 28,
    padding: 0,
  },
  chip: {
    backgroundColor: onboardingColors.surface,
    borderColor: onboardingColors.borderSoft,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#EEF5FF',
    borderColor: onboardingColors.actionBlue,
  },
  chipText: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  chipTextSelected: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
  },
  pressed: {
    opacity: 0.72,
  },
  disabledBlueButton: {
    backgroundColor: '#E5EAF1',
  },
  disabledBlueButtonText: {
    color: onboardingColors.textMuted,
  },
});
