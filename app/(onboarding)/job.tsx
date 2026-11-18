import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupedServicePickerSheet } from '@/components/GroupedServicePickerSheet';
import { OnboardingButton, OnboardingFormScaffold, onboardingColors } from '@/components/onboarding/FigmaOnboarding';
import {
  getDisplayLabelForMvpService,
  MVP_SERVICE_CATEGORIES,
  MVP_SERVICES_BY_CATEGORY,
  OFFERED_DELIVERY_MODE_HELPERS,
  OFFERED_DELIVERY_MODE_LABELS,
  OFFERED_DELIVERY_MODES,
} from '@/constants/service-taxonomy';
import {
  getIncompatibleOnboardingServices,
  getOnboardingSelectionError,
  normalizeOnboardingServices,
} from '@/services/onboarding-selection';
import { useOnboarding } from './onboarding-context';

export default function JobStep() {
  const router = useRouter();
  const { draft, role, updateDraft } = useOnboarding();
  const [pickerOpen, setPickerOpen] = useState(false);
  const serviceButton = useRef<View>(null);
  const isProvider = role === 'provider';
  const validRole = isProvider || role === 'client';
  const selection = normalizeOnboardingServices(
    isProvider ? draft.offeredServices : draft.neededServices,
    isProvider ? draft.customOfferedServices : draft.customNeededServices,
  );
  const selectionError = validRole ? getOnboardingSelectionError({
    intent: isProvider ? 'provider' : 'client',
    services: selection.services,
    customServices: selection.customServices,
    deliveryMode: draft.offeredDeliveryMode,
  }) : 'Choose whether you want to find work or hire help.';
  const conflicts = isProvider
    ? getIncompatibleOnboardingServices(selection.services, draft.offeredDeliveryMode)
    : [];

  useEffect(() => {
    if (validRole) return;
    router.replace({ pathname: '/(auth)/role', params: { returnTo: '/(onboarding)/job' } });
  }, [router, validRole]);

  const closePicker = () => {
    setPickerOpen(false);
    requestAnimationFrame(() => serviceButton.current?.focus());
  };

  const applySelection = ({ selectedServices, customServices }: {
    selectedServices: string[];
    customServices: string[];
  }) => {
    const normalized = normalizeOnboardingServices(selectedServices, customServices);
    updateDraft(isProvider ? {
      offeredServices: normalized.services,
      customOfferedServices: normalized.customServices,
      serviceType: [...normalized.services, ...normalized.customServices].join(', '),
    } : {
      neededServices: normalized.services,
      customNeededServices: normalized.customServices,
    });
  };

  const removeService = (value: string, custom: boolean) => {
    applySelection({
      selectedServices: custom ? selection.services : selection.services.filter((service) => service !== value),
      customServices: custom ? selection.customServices.filter((service) => service !== value) : selection.customServices,
    });
  };

  const next = () => {
    if (!validRole || selectionError) return;
    router.push('/(onboarding)/review');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        contentStyle={styles.content}
        currentStep={2}
        footer={<OnboardingButton disabled={Boolean(selectionError)} label="Next" onPress={next} />}
        helper="These choices help personalize Home. You can change them later. This does not create a public post."
        onBack={() => router.back()}
        title={isProvider ? 'What services can you offer?' : 'What help might you need?'}>
        <Pressable
          accessibilityLabel={isProvider ? 'Choose services you can offer' : 'Choose help you may need'}
          accessibilityRole="button"
          accessibilityState={{ expanded: pickerOpen }}
          onPress={() => setPickerOpen(true)}
          ref={serviceButton}
          style={({ pressed }) => [styles.chooseButton, pressed && styles.pressed]}>
          <View style={styles.chooseCopy}>
            <Text style={styles.chooseTitle}>Choose services</Text>
            <Text style={styles.helper}>Search, choose common services, or add your own.</Text>
          </View>
          <MaterialIcons color={onboardingColors.actionBlue} name="add-circle-outline" size={24} />
        </Pressable>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Selected services ({selection.services.length + selection.customServices.length})
          </Text>
          {!selection.services.length && !selection.customServices.length ? (
            <Text style={styles.helper}>Choose at least one service to continue.</Text>
          ) : null}
          {[
            ...selection.services.map((value) => ({ value, custom: false })),
            ...selection.customServices.map((value) => ({ value, custom: true })),
          ].map(({ value, custom }) => (
            <View key={`${custom ? 'custom' : 'official'}:${value}`} style={styles.selectedRow}>
              <View style={styles.selectedCopy}>
                <Text style={styles.selectedText}>{custom ? value : getDisplayLabelForMvpService(value)}</Text>
                {custom ? <Text style={styles.helper}>Added by you</Text> : null}
                {conflicts.includes(value) ? <Text style={styles.error}>Does not match your work setup</Text> : null}
              </View>
              <Pressable
                accessibilityLabel={`Remove ${value}`}
                accessibilityRole="button"
                onPress={() => removeService(value, custom)}
                style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                <MaterialIcons color={onboardingColors.textMuted} name="close" size={22} />
              </Pressable>
            </View>
          ))}
        </View>

        {isProvider ? (
          <View accessibilityRole="radiogroup" style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>How can you offer these services?</Text>
            <Text style={styles.helper}>Choose a work setup. Both allows on-site or online work.</Text>
            {OFFERED_DELIVERY_MODES.map((mode) => {
              const selected = draft.offeredDeliveryMode === mode;
              return (
                <Pressable
                  accessibilityLabel={OFFERED_DELIVERY_MODE_LABELS[mode]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={mode}
                  onPress={() => updateDraft({ offeredDeliveryMode: mode })}
                  style={({ pressed }) => [styles.modeRow, selected && styles.modeSelected, pressed && styles.pressed]}>
                  <View style={styles.selectedCopy}>
                    <Text style={styles.selectedText}>{OFFERED_DELIVERY_MODE_LABELS[mode]}</Text>
                    <Text style={styles.helper}>{OFFERED_DELIVERY_MODE_HELPERS[mode]}</Text>
                  </View>
                  <MaterialIcons color={onboardingColors.actionBlue} name={selected ? 'radio-button-checked' : 'radio-button-unchecked'} size={24} />
                </Pressable>
              );
            })}
            {selection.customServices.length ? (
              <Text style={styles.helper}>Choose the setup that fits your added services. Their setup cannot be checked automatically.</Text>
            ) : null}
          </View>
        ) : null}
        {selectionError ? (
          <Text accessibilityLiveRegion="polite" style={conflicts.length ? styles.error : styles.helper}>{selectionError}</Text>
        ) : null}
      </OnboardingFormScaffold>

      <GroupedServicePickerSheet
        categories={MVP_SERVICE_CATEGORIES}
        description={isProvider ? 'Choose services you can offer. Browse by type only if you need it.' : 'Choose help you might need. You can update these choices later.'}
        mode="multi"
        onApplyMulti={applySelection}
        onClose={closePicker}
        searchPlaceholder="Search services"
        selectedCustomServices={selection.customServices}
        selectedServices={selection.services}
        servicesByCategory={MVP_SERVICES_BY_CATEGORY}
        title={isProvider ? 'Choose your services' : 'Choose the help you need'}
        visible={pickerOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingBottom: 28, paddingTop: 24 },
  section: { gap: 10, width: '100%' },
  sectionTitle: { color: onboardingColors.text, fontFamily: 'Satoshi-Bold', fontSize: 16, lineHeight: 22 },
  chooseButton: { alignItems: 'center', borderColor: onboardingColors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 64, padding: 12, width: '100%' },
  chooseCopy: { flex: 1, gap: 4, minWidth: 0 },
  chooseTitle: { color: onboardingColors.actionBlue, fontFamily: 'Satoshi-Bold', fontSize: 16, lineHeight: 22 },
  helper: { color: onboardingColors.textMuted, fontFamily: 'Satoshi-Regular', fontSize: 13, lineHeight: 19 },
  selectedRow: { alignItems: 'center', borderBottomColor: onboardingColors.borderSoft, borderBottomWidth: 1, flexDirection: 'row', gap: 8, minHeight: 52, paddingVertical: 4 },
  selectedCopy: { flex: 1, gap: 4, minWidth: 0 },
  selectedText: { color: onboardingColors.text, fontFamily: 'Satoshi-Medium', fontSize: 15, lineHeight: 21 },
  removeButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  modeRow: { alignItems: 'center', borderColor: onboardingColors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 64, padding: 12 },
  modeSelected: { backgroundColor: '#EEF5FF', borderColor: onboardingColors.actionBlue },
  error: { color: '#B91C1C', fontFamily: 'Satoshi-Medium', fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.72 },
});
