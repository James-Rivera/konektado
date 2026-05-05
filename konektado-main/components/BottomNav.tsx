import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const TAB_META: Record<
  string,
  { label: string; activeIcon: MaterialIconName; inactiveIcon: MaterialIconName }
> = {
  index: { label: 'Home', activeIcon: 'home', inactiveIcon: 'home' },
  post: { label: 'Post', activeIcon: 'add-box', inactiveIcon: 'add-box' },
  messages: {
    label: 'Messages',
    activeIcon: 'chat',
    inactiveIcon: 'chat',
  },
  profile: { label: 'Profile', activeIcon: 'person', inactiveIcon: 'person' },
};

export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((route) => TAB_META[route.name]);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {visibleRoutes.map((route) => {
        const descriptor = descriptors[route.key];
        const isFocused = state.routes[state.index]?.key === route.key;
        const meta = TAB_META[route.name];
        const tint = isFocused ? color.verificationBlue : color.textSubtle;

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
            <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive, { color: tint }]}>
              {meta.label}
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
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  tab: {
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    minHeight: 60,
    width: 60,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    width: 60,
  },
  labelActive: {
    fontFamily: 'Satoshi-Regular',
  },
  labelInactive: {
    fontFamily: 'Satoshi-Bold',
  },
  pressed: {
    opacity: 0.7,
  },
});
