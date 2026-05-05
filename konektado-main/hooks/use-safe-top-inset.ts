import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useSafeTopInset() {
  const insets = useSafeAreaInsets();

  if (Platform.OS !== 'android') {
    return insets.top;
  }

  return Math.max(insets.top, StatusBar.currentHeight ?? 0);
}
