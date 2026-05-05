import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';
import type { PopularService } from '@/constants/search-demo-data';

export function PopularServicesSection({
  services,
  selectedService,
  onPressService,
}: {
  services: PopularService[];
  selectedService?: string | null;
  onPressService: (serviceLabel: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        onPress={() => setCollapsed((value) => !value)}
        style={styles.headerRow}>
        <Text style={styles.title}>Popular services</Text>
        <MaterialIcons
          color={color.verificationBlue}
          name={collapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
          size={20}
        />
      </Pressable>
      {collapsed ? (
        <ScrollView
          contentContainerStyle={styles.chipRowSingleLine}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {services.map((service) => {
            const selected = selectedService === service.label;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={service.id}
                onPress={() => onPressService(service.label)}
                style={({ pressed }) => [
                  styles.chip,
                  selected ? styles.chipSelected : styles.chipDefault,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {service.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.chipRowWrap}>
          {services.map((service) => {
            const selected = selectedService === service.label;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={service.id}
                onPress={() => onPressService(service.label)}
                style={({ pressed }) => [
                  styles.chip,
                  selected ? styles.chipSelected : styles.chipDefault,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {service.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    gap: space.md,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.sectionTitle,
    color: '#050505',
    fontSize: 14,
    lineHeight: 22,
  },
  chipRowSingleLine: {
    flexDirection: 'row',
    gap: 8,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 75,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipDefault: {
    backgroundColor: color.background,
    borderColor: color.border,
  },
  chipSelected: {
    backgroundColor: color.cardTint,
    borderColor: color.primary,
  },
  chipText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  chipTextSelected: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
  pressed: {
    opacity: 0.75,
  },
});
