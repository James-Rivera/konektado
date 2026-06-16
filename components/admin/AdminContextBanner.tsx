import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';
import { adminPalette } from '@/components/admin/AdminShell';

export function AdminContextBanner({
  note = 'Admin actions are limited to authorized barangay review workflows.',
}: {
  note?: string | null;
}) {
  return (
    <View style={styles.banner}>
      <MaterialIcons color={adminPalette.blue} name="admin-panel-settings" size={21} />
      <View style={styles.copy}>
        <Text style={styles.title}>
          Admin view only. You are viewing public content connected to this resident.
        </Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'flex-start',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
  },
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  title: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    ...typography.caption,
    color: color.textMuted,
  },
});
