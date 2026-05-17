import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, shadow, space } from '@/constants/theme';

interface BottomSheetProps {
  children: React.ReactNode;
  maxHeight?: string;
  onClose: () => void;
  visible: boolean;
}

/**
 * BottomSheet component with smooth independent animations.
 *
 * The backdrop fades in (500ms) while the sheet simultaneously slides up from the bottom (700ms).
 * This creates a natural, polished animation where the two elements feel independent.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * return (
 *   <>
 *     <Button onPress={() => setIsOpen(true)}>Open Sheet</Button>
 *
 *     <BottomSheet visible={isOpen} onClose={() => setIsOpen(false)}>
 *       <Text>Your content here</Text>
 *     </BottomSheet>
 *   </>
 * );
 * ```
 */
export function BottomSheet({ children, maxHeight = '82%', onClose, visible }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 500,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  return (
    <Modal animationType="none" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: maxHeight as any,
              paddingBottom: Math.max(insets.bottom + space.sm, space.lg),
              transform: [{ translateY: sheetTranslateY }],
            } as ViewStyle,
          ]}>
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(17,17,17,0.34)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: color.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: space.lg,
    alignSelf: 'stretch',
    overflow: 'hidden',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    width: '100%',
    ...shadow.modal,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#D6DCE5',
    borderRadius: radius.pill,
    height: 4,
    width: 44,
  },
});
