import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { color, radius, shadow, space, typography } from '@/constants/theme';

type FeedbackVariant = 'success' | 'error' | 'info';

type FeedbackMessage = {
  id: number;
  message: string;
  variant: FeedbackVariant;
};

type FeedbackContextValue = {
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  showInfoToast: (message: string) => void;
};

const TOAST_DURATION_MS = 2600;

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef = useRef(0);
  const [toast, setToast] = useState<FeedbackMessage | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 180,
        easing: Easing.out(Easing.quad),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: 180,
        easing: Easing.out(Easing.quad),
        toValue: 20,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setToast(null);
      }
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (message: string, variant: FeedbackVariant) => {
      if (!message.trim()) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      nextIdRef.current += 1;
      const nextToast = {
        id: nextIdRef.current,
        message,
        variant,
      };

      setToast(nextToast);
      translateY.setValue(20);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(opacity, {
          duration: 180,
          easing: Easing.out(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          duration: 180,
          easing: Easing.out(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();

      AccessibilityInfo.announceForAccessibility(message);

      timeoutRef.current = setTimeout(hideToast, TOAST_DURATION_MS);
    },
    [hideToast, opacity, translateY],
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      showSuccessToast: (message: string) => showToast(message, 'success'),
      showErrorToast: (message: string) => showToast(message, 'error'),
      showInfoToast: (message: string) => showToast(message, 'info'),
    }),
    [showToast],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          style={[
            styles.host,
            {
              bottom: Math.max(insets.bottom, space.md) + space.lg,
            },
          ]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              getToastStyle(toast.variant),
              {
                opacity,
                transform: [{ translateY }],
              },
            ]}>
            <MaterialIcons color={getIconColor(toast.variant)} name={getIconName(toast.variant)} size={18} />
            <Text style={styles.message}>{toast.message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }

  return context;
}

function getIconName(variant: FeedbackVariant) {
  if (variant === 'success') return 'check-circle';
  if (variant === 'error') return 'error';
  return 'info';
}

function getIconColor(variant: FeedbackVariant) {
  if (variant === 'success') return color.success;
  if (variant === 'error') return color.danger;
  return color.primary;
}

function getToastStyle(variant: FeedbackVariant) {
  if (variant === 'success') {
    return styles.successToast;
  }

  if (variant === 'error') {
    return styles.errorToast;
  }

  return styles.infoToast;
}

const styles = StyleSheet.create({
  host: {
    left: space.lg,
    position: 'absolute',
    right: space.lg,
    zIndex: 20,
  },
  toast: {
    ...shadow.modal,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  successToast: {
    backgroundColor: color.successSoft,
    borderColor: color.success,
  },
  errorToast: {
    backgroundColor: color.dangerSoft,
    borderColor: color.danger,
  },
  infoToast: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  message: {
    ...typography.bodyMedium,
    color: color.text,
    flex: 1,
  },
});
