import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space, typography } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const TAB_META: Record<
  string,
  { label: string; activeIcon: MaterialIconName; inactiveIcon: MaterialIconName }
> = {
  index: { label: 'Home', activeIcon: 'home', inactiveIcon: 'home' },
  post: { label: 'Post', activeIcon: 'add-circle', inactiveIcon: 'add-circle-outline' },
  messages: {
    label: 'Messages',
    activeIcon: 'chat-bubble',
    inactiveIcon: 'chat-bubble-outline',
  },
  profile: { label: 'Profile', activeIcon: 'person', inactiveIcon: 'person-outline' },
};

export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const isFocused = state.index === index;
        const meta = TAB_META[route.name] ?? {
          label: descriptor.options.title ?? route.name,
          activeIcon: 'circle',
          inactiveIcon: 'circle',
        };
        const tint = isFocused ? color.primary : color.textSubtle;

        return (
          <Pressable
            accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <MaterialIcons
              color={tint}
              name={isFocused ? meta.activeIcon : meta.inactiveIcon}
              size={24}
            />
            <Text style={[styles.label, { color: tint }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: space['2xs'],
    justifyContent: 'center',
    minHeight: 54,
  },
  label: {
    ...typography.captionMedium,
  },
  pressed: {
    opacity: 0.7,
  },
});
