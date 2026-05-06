import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, typography } from '@/constants/theme';
import { searchModeLabels, type SearchMode } from '@/constants/search-demo-data';

const modes = Object.keys(searchModeLabels) as SearchMode[];

export function SearchSegmentedControl({
  mode,
  onChange,
  flush = false,
}: {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  flush?: boolean;
}) {
  return (
    <View style={[styles.container, flush && styles.containerFlush]}>
      {modes.map((item) => {
        const selected = item === mode;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={item}
            onPress={() => onChange(item)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {searchModeLabels[item]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 4,
  },
  containerFlush: {
    marginHorizontal: 0,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 17,
    flex: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segmentSelected: {
    backgroundColor: color.primary,
  },
  segmentText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  segmentTextSelected: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
  },
  pressed: {
    opacity: 0.75,
  },
});
