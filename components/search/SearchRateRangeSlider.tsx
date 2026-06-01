import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { color, radius } from '@/constants/theme';

type SearchRateRangeSliderProps = {
  maximumValue: number;
  minimumValue: number;
  onChange: (minimumValue: number, maximumValue: number) => void;
  step: number;
  value: {
    maximum: number;
    minimum: number;
  };
};

type ThumbKind = 'minimum' | 'maximum';

const THUMB_SIZE = 22;
const TOUCH_TARGET_SIZE = 44;

export function SearchRateRangeSlider({
  maximumValue,
  minimumValue,
  onChange,
  step,
  value,
}: SearchRateRangeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const valueRef = useRef(value);
  const dragStartRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const minimumPercent = valueToPercent(value.minimum, minimumValue, maximumValue);
  const maximumPercent = valueToPercent(value.maximum, minimumValue, maximumValue);

  const updateThumb = useCallback(
    (thumb: ThumbKind, nextValue: number) => {
      const current = valueRef.current;
      const nextMinimum =
        thumb === 'minimum'
          ? clamp(roundToStep(nextValue, step), minimumValue, current.maximum)
          : current.minimum;
      const nextMaximum =
        thumb === 'maximum'
          ? clamp(
              roundToStep(nextValue, step),
              Math.max(current.minimum, minimumValue + step),
              maximumValue,
            )
          : current.maximum;

      valueRef.current = {
        maximum: nextMaximum,
        minimum: nextMinimum,
      };
      onChange(nextMinimum, nextMaximum);
    },
    [maximumValue, minimumValue, onChange, step],
  );

  const createThumbPanResponder = useCallback(
    (thumb: ThumbKind) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          dragStartRef.current = valueRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          if (!trackWidth) return;
          const startingValue =
            thumb === 'minimum' ? dragStartRef.current.minimum : dragStartRef.current.maximum;
          const valueDelta = (gestureState.dx / trackWidth) * (maximumValue - minimumValue);
          updateThumb(thumb, startingValue + valueDelta);
        },
      }),
    [maximumValue, minimumValue, trackWidth, updateThumb],
  );

  const minimumPanResponder = useMemo(
    () => createThumbPanResponder('minimum'),
    [createThumbPanResponder],
  );
  const maximumPanResponder = useMemo(
    () => createThumbPanResponder('maximum'),
    [createThumbPanResponder],
  );

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handleTrackPress = (locationX: number) => {
    if (!trackWidth) return;

    const nextValue = minimumValue + (locationX / trackWidth) * (maximumValue - minimumValue);
    const current = valueRef.current;
    const thumb =
      Math.abs(current.minimum - nextValue) <= Math.abs(current.maximum - nextValue)
        ? 'minimum'
        : 'maximum';

    updateThumb(thumb, nextValue);
  };

  const handleAccessibilityAction = (thumb: ThumbKind, event: AccessibilityActionEvent) => {
    const current = valueRef.current;
    const direction = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    const currentValue = thumb === 'minimum' ? current.minimum : current.maximum;
    updateThumb(thumb, currentValue + direction * step);
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessible={false}
        onLayout={handleTrackLayout}
        onPress={(event) => handleTrackPress(event.nativeEvent.locationX)}
        style={styles.trackTouchTarget}>
        <View style={styles.track} />
        <View
          style={[
            styles.activeTrack,
            {
              left: `${minimumPercent}%`,
              right: `${100 - maximumPercent}%`,
            },
          ]}
        />
      </Pressable>

      <View
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityLabel="Minimum rate"
        accessibilityRole="adjustable"
        accessibilityValue={{ min: minimumValue, max: maximumValue, now: value.minimum }}
        onAccessibilityAction={(event) => handleAccessibilityAction('minimum', event)}
        style={[styles.thumbTouchTarget, { left: `${minimumPercent}%` }]}
        {...minimumPanResponder.panHandlers}>
        <View style={styles.thumb} />
      </View>

      <View
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityLabel="Maximum rate"
        accessibilityRole="adjustable"
        accessibilityValue={{ min: minimumValue, max: maximumValue, now: value.maximum }}
        onAccessibilityAction={(event) => handleAccessibilityAction('maximum', event)}
        style={[styles.thumbTouchTarget, { left: `${maximumPercent}%` }]}
        {...maximumPanResponder.panHandlers}>
        <View style={styles.thumb} />
      </View>
    </View>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function valueToPercent(value: number, minimum: number, maximum: number) {
  if (maximum <= minimum) return 0;
  return ((value - minimum) / (maximum - minimum)) * 100;
}

const styles = StyleSheet.create({
  container: {
    height: TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    marginHorizontal: THUMB_SIZE / 2,
    position: 'relative',
  },
  trackTouchTarget: {
    height: TOUCH_TARGET_SIZE,
    justifyContent: 'center',
  },
  track: {
    backgroundColor: color.border,
    borderRadius: radius.pill,
    height: 6,
  },
  activeTrack: {
    backgroundColor: color.primary,
    borderRadius: radius.pill,
    height: 6,
    position: 'absolute',
    top: (TOUCH_TARGET_SIZE - 6) / 2,
  },
  thumbTouchTarget: {
    alignItems: 'center',
    height: TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    marginLeft: -TOUCH_TARGET_SIZE / 2,
    position: 'absolute',
    top: 0,
    width: TOUCH_TARGET_SIZE,
  },
  thumb: {
    backgroundColor: color.background,
    borderColor: color.primary,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    height: THUMB_SIZE,
    width: THUMB_SIZE,
  },
});
