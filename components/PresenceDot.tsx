import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color } from '@/constants/theme';

export type PresenceDotProps = {
  active?: boolean;
  borderColor?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function PresenceDot({
  active = false,
  borderColor = color.background,
  size = 10,
  style,
}: PresenceDotProps) {
  return (
    <View
      accessibilityLabel={active ? 'Active' : 'Inactive'}
      style={[
        styles.dot,
        {
          backgroundColor: active ? color.brandYellow : color.textSubtle,
          borderColor,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 2,
    position: 'absolute',
  },
});
