import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import JobStep from '@/app/(onboarding)/job';
import { OnboardingContext, type OnboardingContextValue } from '@/app/(onboarding)/onboarding-context';
import { OnboardingButton, OnboardingFormScaffold, ReviewField, onboardingColors } from '@/components/onboarding/FigmaOnboarding';
import { getDisplayLabelForOfferedDeliveryMode } from '@/constants/service-taxonomy';
import { emptyOnboardingDraft } from '@/services/onboarding.service';
import type { OnboardingDraft, OnboardingIntent } from '@/types/onboarding.types';

/** Isolated UI draft: never calls the real onboarding loader, save or verification. */
export function OnboardingServicesPreview() {
  const [role, setRole] = useState<OnboardingIntent>('provider');
  const [draft, setDraft] = useState<OnboardingDraft>({ ...emptyOnboardingDraft });
  const [review, setReview] = useState(false);
  const updateDraft = (patch: Partial<OnboardingDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const value: OnboardingContextValue = {
    role, draft, updateDraft, loading: false, saving: false,
    setVerificationFiles: () => undefined,
    saveProfile: async () => false,
  };
  const selections = role === 'provider'
    ? [...draft.offeredServices, ...draft.customOfferedServices]
    : [...draft.neededServices, ...draft.customNeededServices];

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <Text style={styles.notice}>Local preview · Nothing is saved</Text>
        <View style={styles.actions}>
          {(['provider', 'client'] as const).map((intent) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: role === intent }}
              key={intent}
              onPress={() => { setRole(intent); setReview(false); }}
              style={[styles.action, role === intent && styles.selected]}>
              <Text style={styles.actionText}>{intent === 'provider' ? 'Find work' : 'Hire help'}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => { setDraft({ ...emptyOnboardingDraft }); setReview(false); }}
            style={styles.action}>
            <Text style={styles.actionText}>Reset</Text>
          </Pressable>
        </View>
      </View>
      <OnboardingContext.Provider value={value}>
        {review ? (
          <OnboardingFormScaffold
            currentStep={2}
            footer={<OnboardingButton label="Back to services" onPress={() => setReview(false)} />}
            helper="This preview does not create accounts or save changes."
            onBack={() => setReview(false)}
            title="Review your selections">
            {role === 'provider' ? <ReviewField label="Work setup" value={getDisplayLabelForOfferedDeliveryMode(draft.offeredDeliveryMode)} /> : null}
            <ReviewField label={role === 'provider' ? 'Offered services' : 'Needed services'} multiline value={selections.join(', ')} />
          </OnboardingFormScaffold>
        ) : <JobStep key={role} onNext={() => setReview(true)} />}
      </OnboardingContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: onboardingColors.surface },
  toolbar: { backgroundColor: '#EEF5FF', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  notice: { color: onboardingColors.textMuted, fontFamily: 'Satoshi-Medium', fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { alignItems: 'center', borderColor: onboardingColors.border, borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 14 },
  selected: { backgroundColor: '#DDEEFF', borderColor: onboardingColors.actionBlue },
  actionText: { color: onboardingColors.text, fontFamily: 'Satoshi-Medium', fontSize: 14 },
});
