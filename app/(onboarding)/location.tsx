import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import {
  OnboardingButton,
  OnboardingFormScaffold,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';
import { DEFAULT_BARANGAY, DEFAULT_CITY, DEFAULT_PROVINCE } from '@/services/onboarding.service';

import { useOnboarding } from './onboarding-context';

type AddressStep = 'area' | 'address';

const SERVICE_AREA_LABEL = `Brgy. ${DEFAULT_BARANGAY}, ${DEFAULT_CITY}, ${DEFAULT_PROVINCE}`;

function combineAddressDetails(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).join(', ');
}

export default function LocationStep() {
  const router = useRouter();
  const { draft, role, updateDraft } = useOnboarding();
  const [step, setStep] = useState<AddressStep>('area');
  const [street, setStreet] = useState(draft.street);
  const [subdivisionArea, setSubdivisionArea] = useState(draft.subdivisionArea);
  const [exactAddressDetail, setExactAddressDetail] = useState(
    combineAddressDetails([draft.houseNumber, draft.blockLot]),
  );
  const [landmarkNote, setLandmarkNote] = useState(draft.landmarkNote);
  const [generalLocationTouched, setGeneralLocationTouched] = useState(false);
  const [areaSheetVisible, setAreaSheetVisible] = useState(false);

  const hasSupportedArea = true;
  const hasPublicLocation = useMemo(() => Boolean(street.trim()), [street]);

  const saveCurrentArea = () => {
    updateDraft({
      province: DEFAULT_PROVINCE,
      city: DEFAULT_CITY,
      barangay: DEFAULT_BARANGAY,
    });
  };

  const goToAddress = () => {
    if (!hasSupportedArea) return;
    saveCurrentArea();
    setStep('address');
  };

  const next = () => {
    if (!hasPublicLocation) {
      setGeneralLocationTouched(true);
      return;
    }

    const privateAddress = [
      exactAddressDetail,
      street,
      subdivisionArea,
      landmarkNote,
      DEFAULT_BARANGAY,
      DEFAULT_CITY,
      DEFAULT_PROVINCE,
    ]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(', ');

    const hasTasteSetupRole = role === 'provider' || role === 'client';

    if (!hasTasteSetupRole) {
      Alert.alert(
        'Choose how you will use Konektado',
        'Select whether you want to find work or hire someone before choosing services.',
      );
      router.replace({
        pathname: '/(auth)/role',
        params: { returnTo: '/(onboarding)/location' },
      });
      return;
    }

    updateDraft({
      province: DEFAULT_PROVINCE,
      city: DEFAULT_CITY,
      barangay: DEFAULT_BARANGAY,
      streetAddress: privateAddress,
      street: street.trim(),
      subdivisionArea: subdivisionArea.trim(),
      blockLot: '',
      houseNumber: exactAddressDetail.trim(),
      landmarkNote: landmarkNote.trim(),
      certificationDetails: '',
      hasCertifications: null,
      serviceType: '',
      verificationFiles: [],
      verificationNote: '',
      wantsBarangayVerification: false,
    });

    router.push('/(onboarding)/job');
  };

  const onBack = () => {
    if (step === 'address') {
      setStep('area');
      return;
    }

    router.back();
  };

  const footer =
    step === 'area' ? (
      <OnboardingButton disabled={!hasSupportedArea} label="Next" onPress={goToAddress} />
    ) : (
      <OnboardingButton
        disabled={!hasPublicLocation}
        label="Next"
        onDisabledPress={() => setGeneralLocationTouched(true)}
        onPress={next}
        style={!hasPublicLocation ? styles.disabledBlueButton : undefined}
        textStyle={!hasPublicLocation ? styles.disabledBlueButtonText : undefined}
      />
    );

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        contentStyle={styles.content}
        currentStep={3}
        footer={footer}
        helper={
          step === 'area'
            ? 'Choose the area where you live or usually offer services.'
            : 'Only your general area is shown publicly. Exact address details stay private.'
        }
        onBack={onBack}
        title={step === 'area' ? 'Set your current area' : 'Add your address'}>
        {step === 'area' ? (
          <CurrentAreaSelection onPressSelector={() => setAreaSheetVisible(true)} />
        ) : (
          <SpecificAddressEntry onChangeArea={() => setStep('area')}>
            <AddressSection title="Address details">
              <AddressInputField
                autoCapitalize="words"
                error={
                  generalLocationTouched && !hasPublicLocation
                    ? 'Add your area, street, purok, or sitio.'
                    : undefined
                }
                helper="Shown publicly. Do not include your house number."
                label="Area / Street / Purok / Sitio"
                onBlur={() => setGeneralLocationTouched(true)}
                onChangeText={(value) => {
                  setStreet(value);
                  if (!generalLocationTouched) setGeneralLocationTouched(true);
                }}
                placeholder="e.g. Purok 3 or Gov. Carpio Ave"
                value={street}
              />
              <AddressInputField
                autoCapitalize="words"
                label="Additional area details"
                optional
                onBlur={() => setGeneralLocationTouched(true)}
                onChangeText={(value) => {
                  setSubdivisionArea(value);
                  if (!generalLocationTouched) setGeneralLocationTouched(true);
                }}
                placeholder="e.g. Phase 2 or San Pedro Subdivision"
                value={subdivisionArea}
              />
            </AddressSection>

            <AddressSection helper="Kept private for verification and coordination." title="Private details">
              <AddressInputField
                autoCapitalize="words"
                label="House / Building / Block / Lot"
                optional
                onChangeText={setExactAddressDetail}
                placeholder="e.g. House 125, Block 4 Lot 12"
                value={exactAddressDetail}
              />
              <AddressInputField
                autoCapitalize="sentences"
                label="Private note"
                optional
                onChangeText={setLandmarkNote}
                placeholder="e.g. blue gate near chapel"
                value={landmarkNote}
              />
            </AddressSection>
          </SpecificAddressEntry>
        )}
      </OnboardingFormScaffold>

      <ServiceAreaSheet
        onChoose={() => {
          saveCurrentArea();
          setAreaSheetVisible(false);
        }}
        onClose={() => setAreaSheetVisible(false)}
        visible={areaSheetVisible}
      />
    </>
  );
}

function CurrentAreaSelection({ onPressSelector }: { onPressSelector: () => void }) {
  return (
    <View style={styles.selectorStack}>
      <SelectorField label="Province" value={DEFAULT_PROVINCE} onPress={onPressSelector} />
      <SelectorField label="City/Municipality" value={DEFAULT_CITY} onPress={onPressSelector} />
      <SelectorField label="Barangay" value={DEFAULT_BARANGAY} onPress={onPressSelector} />
    </View>
  );
}

function SelectorField({
  label,
  onPress,
  value,
}: {
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.selectorField, pressed && styles.pressed]}>
      <View style={styles.selectorCopy}>
        <Text style={styles.selectorLabel}>{label}</Text>
        <Text style={styles.selectorValue}>{value}</Text>
      </View>
      <MaterialIcons color={onboardingColors.placeholder} name="keyboard-arrow-down" size={26} />
    </Pressable>
  );
}

function SpecificAddressEntry({
  children,
  onChangeArea,
}: {
  children: ReactNode;
  onChangeArea: () => void;
}) {
  return (
    <>
      <CurrentAreaCard onChange={onChangeArea} />
      {children}
    </>
  );
}

function CurrentAreaCard({ onChange }: { onChange: () => void }) {
  return (
    <View style={styles.areaCard}>
      <View style={styles.areaHeader}>
        <Text style={styles.cardLabel}>Current area</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onChange}
          style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.changeButtonText}>Change</Text>
        </Pressable>
      </View>
      <Text style={styles.areaValue}>{SERVICE_AREA_LABEL}</Text>
    </View>
  );
}

function AddressSection({
  children,
  helper,
  title,
}: {
  children: ReactNode;
  helper?: string;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {helper ? <Text style={styles.sectionHelper}>{helper}</Text> : null}
      </View>
      <View style={styles.sectionFields}>{children}</View>
    </View>
  );
}

function AddressInputField({
  error,
  helper,
  label,
  optional = false,
  placeholderTextColor,
  style,
  ...props
}: TextInputProps & {
  error?: string;
  helper?: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {optional ? (
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>Optional</Text>
          </View>
        ) : null}
      </View>
      {helper || error ? (
        <Text style={[styles.fieldHelper, error ? styles.fieldHelperError : undefined]}>
          {error ?? helper}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={placeholderTextColor ?? onboardingColors.placeholder}
        style={[styles.input, error ? styles.inputError : undefined, style]}
        {...props}
      />
    </View>
  );
}

function ServiceAreaSheet({
  onChoose,
  onClose,
  visible,
}: {
  onChoose: () => void;
  onClose: () => void;
  visible: boolean;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="58%">
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Choose service area</Text>
      </View>

      <View style={styles.sheetSection}>
        <Text style={styles.sheetSectionTitle}>Available now</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onChoose}
          style={({ pressed }) => [styles.sheetListRow, pressed && styles.pressed]}>
          <View style={styles.optionIcon}>
            <MaterialIcons color={onboardingColors.actionBlue} name="check" size={14} />
          </View>
          <View style={styles.sheetOptionCopy}>
            <Text style={styles.sheetOptionText}>Brgy. {DEFAULT_BARANGAY}</Text>
            <Text style={styles.sheetOptionSubtext}>
              {DEFAULT_CITY}, {DEFAULT_PROVINCE}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.sheetSection}>
        <Text style={styles.sheetSectionTitle}>More areas</Text>
        <View style={[styles.sheetListRow, styles.sheetOptionDisabled]}>
          <View style={styles.optionIconPlaceholder} />
          <View style={styles.sheetOptionCopy}>
            <Text style={styles.sheetOptionTextMuted}>Other barangays in Santo Tomas</Text>
            <Text style={styles.sheetOptionSubtextMuted}>Not available yet</Text>
          </View>
        </View>
      </View>

      <View style={styles.sheetFooter}>
        <OnboardingButton label="Done" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingBottom: 28,
    paddingTop: 34,
  },
  selectorStack: {
    gap: 12,
    width: '100%',
  },
  selectorField: {
    alignItems: 'center',
    backgroundColor: onboardingColors.surface,
    borderColor: onboardingColors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    height: 52,
    paddingHorizontal: 12,
    paddingVertical: 7,
    width: '100%',
  },
  selectorCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectorLabel: {
    color: onboardingColors.placeholder,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 12,
  },
  selectorValue: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    lineHeight: 20,
  },
  areaCard: {
    backgroundColor: '#F8FAFC',
    borderColor: onboardingColors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    width: '100%',
  },
  areaHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  areaValue: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 19,
  },
  changeButtonText: {
    color: onboardingColors.actionBlue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    gap: 10,
    width: '100%',
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  sectionHelper: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionFields: {
    gap: 12,
  },
  field: {
    gap: 6,
    width: '100%',
  },
  fieldLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  fieldLabel: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  optionalBadge: {
    backgroundColor: '#F6F6EF',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  optionalBadgeText: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 11,
  },
  fieldHelper: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  fieldHelperError: {
    color: '#B91C1C',
    fontFamily: 'Satoshi-Medium',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: onboardingColors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    height: 48,
    includeFontPadding: false,
    lineHeight: 20,
    margin: 0,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  inputError: {
    borderColor: '#B91C1C',
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -2,
  },
  sheetTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  sheetSection: {
    gap: 6,
  },
  sheetSectionTitle: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  sheetListRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF5FF',
    borderRadius: 999,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  optionIconPlaceholder: {
    height: 20,
    width: 20,
  },
  sheetOptionCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  sheetOptionDisabled: {
    opacity: 0.62,
  },
  sheetOptionText: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  sheetOptionSubtext: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  sheetOptionTextMuted: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 18,
  },
  sheetOptionSubtextMuted: {
    color: onboardingColors.placeholder,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  sheetFooter: {
    paddingTop: 2,
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
