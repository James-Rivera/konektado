import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, typography } from '@/constants/theme';

export function SearchResultHeader({
  activeFilterCount = 0,
  title,
  onFilterPress,
}: {
  activeFilterCount?: number;
  title: string;
  onFilterPress: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Pressable
        accessibilityLabel="Search filters"
        accessibilityRole="button"
        onPress={onFilterPress}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.primary} name="tune" size={22} />
        {activeFilterCount > 0 ? (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount > 9 ? '9+' : activeFilterCount}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  title: {
    ...typography.sectionTitle,
    color: color.text,
    fontSize: 14,
    lineHeight: 18,
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  filterBadge: {
    alignItems: 'center',
    backgroundColor: color.primary,
    borderColor: color.background,
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  filterBadgeText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 11,
  },
  pressed: {
    opacity: 0.75,
  },
});
