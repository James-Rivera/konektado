import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SearchSegmentedControl } from '@/components/search/SearchSegmentedControl';
import type { SearchMode } from '@/constants/search-demo-data';
import { color } from '@/constants/theme';

/** One visible surface for the search row and its discovery intent. */
export function DiscoverySearchCard({
  children,
  mode,
  onModeChange,
}: {
  children: ReactNode;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}) {
  return (
    <View style={styles.card} testID="discovery-search-card">
      {children}
      <View style={styles.divider} />
      <View style={styles.intentRow}>
        <SearchSegmentedControl embedded mode={mode} onChange={onModeChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 20,
    borderWidth: 1,
    boxShadow: '0px 3px 10px rgba(11, 37, 69, 0.10)',
    padding: 6,
  },
  divider: {
    backgroundColor: color.border,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 8,
  },
  intentRow: {
    paddingTop: 4,
  },
});
