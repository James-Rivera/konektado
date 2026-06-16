import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupedServicePickerSheet } from '@/components/GroupedServicePickerSheet';
import {
  getDisplayLabelForMvpService,
  MVP_SERVICE_CATEGORIES,
  MVP_SERVICES_BY_CATEGORY,
} from '@/constants/service-taxonomy';
import { color, radius, space, typography } from '@/constants/theme';
import { useFeedback } from '@/components/FeedbackProvider';
import { useProfile } from '@/hooks/use-profile';
import { saveMyDiscoveryPreferences } from '@/services/onboarding.service';
import type { UserPreferences } from '@/types/onboarding.types';

type PreferencePicker = 'offered' | 'needed' | null;
type PreferenceState = {
  customNeededServices: string[];
  customOfferedServices: string[];
  neededServices: string[];
  offeredServices: string[];
};

export default function DiscoveryPreferencesScreen() {
  const router = useRouter();
  const { showErrorToast, showSuccessToast } = useFeedback();
  const { preferences, refresh } = useProfile();
  const [offeredServices, setOfferedServices] = useState<string[]>([]);
  const [customOfferedServices, setCustomOfferedServices] = useState<string[]>([]);
  const [neededServices, setNeededServices] = useState<string[]>([]);
  const [customNeededServices, setCustomNeededServices] = useState<string[]>([]);
  const [activePicker, setActivePicker] = useState<PreferencePicker>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hydratePreferences(preferences, {
      setCustomNeededServices,
      setCustomOfferedServices,
      setNeededServices,
      setOfferedServices,
    });
  }, [preferences]);

  const totalSelected = useMemo(
    () =>
      offeredServices.length +
      customOfferedServices.length +
      neededServices.length +
      customNeededServices.length,
    [customNeededServices.length, customOfferedServices.length, neededServices.length, offeredServices.length],
  );

  const persistPreferences = async (nextState: PreferenceState) => {
    if (saving) return false;

    setSaving(true);
    try {
      const result = await saveMyDiscoveryPreferences(nextState);

      if (result.error || !result.data) {
        showErrorToast(result.error ?? 'Could not save discovery preferences.');
        return false;
      }

      hydratePreferences(result.data, {
        setCustomNeededServices,
        setCustomOfferedServices,
        setNeededServices,
        setOfferedServices,
      });
      await refresh();
      showSuccessToast('Discovery preferences saved');
      return true;
    } catch {
      showErrorToast('Could not save discovery preferences.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveOfferedSelection = ({
    customServices,
    selectedServices,
  }: {
    customServices: string[];
    selectedServices: string[];
  }) =>
    persistPreferences({
      customNeededServices,
      customOfferedServices: customServices,
      neededServices,
      offeredServices: selectedServices,
    });

  const saveNeededSelection = ({
    customServices,
    selectedServices,
  }: {
    customServices: string[];
    selectedServices: string[];
  }) =>
    persistPreferences({
      customNeededServices: customServices,
      customOfferedServices,
      neededServices: selectedServices,
      offeredServices,
    });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
          <MaterialIcons color={color.text} name="chevron-left" size={30} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Discovery preferences</Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            Personalize Home and Search
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <MaterialIcons color={color.verificationBlue} name="tune" size={22} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>Keep discovery useful</Text>
            <Text style={styles.introText}>
              These choices only guide ranking and browsing. They do not publish a service or job post.
            </Text>
          </View>
        </View>

        <PreferenceCard
          actionLabel={offeredServices.length || customOfferedServices.length ? 'Edit offered' : 'Add offered'}
          emptyText="Choose services you can offer so job posts can rank better for you."
          icon="handyman"
          onEdit={() => setActivePicker('offered')}
          selectedCustomServices={customOfferedServices}
          selectedServices={offeredServices}
          subtitle="Used to rank job posts"
          title="Services I can offer"
        />

        <PreferenceCard
          actionLabel={neededServices.length || customNeededServices.length ? 'Edit needed' : 'Add needed'}
          emptyText="Choose help you may need nearby so service posts can rank better for you."
          icon="assignment"
          onEdit={() => setActivePicker('needed')}
          selectedCustomServices={customNeededServices}
          selectedServices={neededServices}
          subtitle="Used to rank service posts"
          title="Help I need nearby"
        />

        <Text style={styles.helperText}>
          {totalSelected
            ? `${totalSelected} preferences selected. You can still browse outside these services.`
            : 'No preferences selected yet. Home will use general nearby and recent posts.'}
        </Text>
      </ScrollView>

      <GroupedServicePickerSheet
        categories={MVP_SERVICE_CATEGORIES}
        description="Pick services you can offer. This helps Konektado show more relevant job posts first."
        mode="multi"
        multiActionLabel="Save preferences"
        multiActionLoading={saving}
        onApplyMulti={saveOfferedSelection}
        onClose={() => setActivePicker(null)}
        searchPlaceholder="Search services"
        selectedCustomServices={customOfferedServices}
        selectedServices={offeredServices}
        servicesByCategory={MVP_SERVICES_BY_CATEGORY}
        title="Services I can offer"
        visible={activePicker === 'offered'}
      />

      <GroupedServicePickerSheet
        categories={MVP_SERVICE_CATEGORIES}
        description="Pick the help you usually need nearby. This helps Konektado show more relevant service posts first."
        mode="multi"
        multiActionLabel="Save preferences"
        multiActionLoading={saving}
        onApplyMulti={saveNeededSelection}
        onClose={() => setActivePicker(null)}
        searchPlaceholder="Search services"
        selectedCustomServices={customNeededServices}
        selectedServices={neededServices}
        servicesByCategory={MVP_SERVICES_BY_CATEGORY}
        title="Help I need nearby"
        visible={activePicker === 'needed'}
      />
    </SafeAreaView>
  );
}

function PreferenceCard({
  actionLabel,
  emptyText,
  icon,
  onEdit,
  selectedCustomServices,
  selectedServices,
  subtitle,
  title,
}: {
  actionLabel: string;
  emptyText: string;
  icon: 'assignment' | 'handyman';
  onEdit: () => void;
  selectedCustomServices: string[];
  selectedServices: string[];
  subtitle: string;
  title: string;
}) {
  const hasValues = Boolean(selectedServices.length || selectedCustomServices.length);

  return (
    <View style={styles.preferenceCard}>
      <View style={styles.preferenceHeader}>
        <View style={styles.preferenceIcon}>
          <MaterialIcons color={color.verificationBlue} name={icon} size={22} />
        </View>
        <View style={styles.preferenceCopy}>
          <Text style={styles.preferenceTitle}>{title}</Text>
          <Text style={styles.preferenceSubtitle}>{subtitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.primary} name={hasValues ? 'edit' : 'add'} size={17} />
          <Text style={styles.editButtonText}>{actionLabel}</Text>
        </Pressable>
      </View>

      {hasValues ? (
        <View style={styles.pillRow}>
          {selectedServices.map((service) => (
            <View key={service} style={styles.servicePill}>
              <Text style={styles.servicePillText}>{getDisplayLabelForMvpService(service) || service}</Text>
            </View>
          ))}
          {selectedCustomServices.map((service) => (
            <View key={service} style={styles.customPill}>
              <Text style={styles.customPillText}>Other: {service}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [styles.emptyPicker, pressed && styles.pressed]}>
          <MaterialIcons color={color.primary} name="add-circle-outline" size={20} />
          <Text style={styles.emptyPickerText}>{emptyText}</Text>
        </Pressable>
      )}
    </View>
  );
}

function hydratePreferences(
  preferences: UserPreferences | null,
  setters: {
    setCustomNeededServices: (value: string[]) => void;
    setCustomOfferedServices: (value: string[]) => void;
    setNeededServices: (value: string[]) => void;
    setOfferedServices: (value: string[]) => void;
  },
) {
  setters.setOfferedServices(preferences?.offeredServices ?? []);
  setters.setCustomOfferedServices(preferences?.customOfferedServices ?? []);
  setters.setNeededServices(preferences?.neededServices ?? []);
  setters.setCustomNeededServices(preferences?.customNeededServices ?? []);
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 62,
    paddingHorizontal: space.lg,
  },
  headerIcon: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  content: {
    gap: space.sm,
    paddingBottom: space['3xl'],
  },
  introCard: {
    alignItems: 'flex-start',
    backgroundColor: color.background,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  introIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  introCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  introTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  introText: {
    ...typography.caption,
    color: color.textMuted,
  },
  preferenceCard: {
    backgroundColor: color.background,
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  preferenceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  preferenceIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  preferenceCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  preferenceTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  preferenceSubtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 34,
    paddingHorizontal: space.md,
  },
  editButtonText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  servicePill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: space.md,
  },
  servicePillText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  customPill: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: space.md,
  },
  customPillText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  emptyPicker: {
    alignItems: 'flex-start',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.lg,
  },
  emptyPickerText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  helperText: {
    ...typography.caption,
    color: color.textMuted,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
