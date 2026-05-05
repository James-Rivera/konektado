import { Image, StyleSheet, View } from 'react-native';

import { color } from '@/constants/theme';

type LocationMapPreviewProps = {
  accessibilityLabel?: string;
  height?: number;
};

export function LocationMapPreview({
  accessibilityLabel = 'Barangay San Pedro map preview',
  height = 154,
}: LocationMapPreviewProps) {
  return (
    <View style={[styles.frame, { minHeight: height }]}>
      <Image
        accessibilityLabel={accessibilityLabel}
        resizeMode="cover"
        source={require('../assets/images/job-map-santo-tomas.png')}
        style={[styles.image, { height }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: color.cardTint,
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  image: {
    width: '100%',
  },
});
