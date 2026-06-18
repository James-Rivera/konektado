import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { listMyConversations } from '@/services/conversation.service';
import { supabase } from '@/utils/supabase';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type BottomNavUnreadChannel = ReturnType<typeof supabase.channel>;

const reportedRealtimeStatuses = new Set<string>();

function warnBottomNavRealtime(message: string, error?: unknown) {
  if (__DEV__) {
    console.warn(`[BottomNav] ${message}`, error);
  }
}

function noteBottomNavRealtime(channelName: string, status: string, error?: unknown) {
  if (!__DEV__) return;

  const key = `${channelName}:${status}`;
  if (reportedRealtimeStatuses.has(key)) return;

  reportedRealtimeStatuses.add(key);
  console.debug(
    `[BottomNav] Realtime ${status} for ${channelName}; unread-count fetch fallback remains active.`,
    error,
  );
}

function getRealtimeTopic(channelName: string) {
  return `realtime:${channelName}`;
}

async function removeExistingBottomNavUnreadChannels(channelName: string) {
  const topic = getRealtimeTopic(channelName);
  const existingChannels = supabase
    .getChannels()
    .filter((channel) => channel.topic === topic);

  await Promise.all(
    existingChannels.map((channel) =>
      supabase.removeChannel(channel).catch((error) => {
        warnBottomNavRealtime(`Could not remove stale channel ${channelName}.`, error);
      }),
    ),
  );
}

const TAB_META: Record<
  string,
  { label: string; activeIcon: MaterialIconName; inactiveIcon: MaterialIconName }
> = {
  index: { label: 'Home', activeIcon: 'home', inactiveIcon: 'home' },
  search: { label: 'Search', activeIcon: 'search', inactiveIcon: 'search' },
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
  const { profile } = useProfile();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const visibleRoutes = state.routes.filter((route) => TAB_META[route.name]);

  const refreshUnread = useCallback(() => {
    if (!profile?.id) {
      setUnreadMessages(0);
      return;
    }

    void listMyConversations().then((result) => {
      if (!result.data) return;
      setUnreadMessages(
        result.data.reduce((total, conversation) => total + conversation.unreadCount, 0),
      );
    });
  }, [profile?.id]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  useFocusEffect(useCallback(() => {
    refreshUnread();
  }, [refreshUnread]));

  useEffect(() => {
    if (!profile?.id) return undefined;

    let cancelled = false;
    let channel: BottomNavUnreadChannel | null = null;
    const channelName = `bottom-nav-unread-${profile.id}`;

    const setupChannel = async () => {
      try {
        await removeExistingBottomNavUnreadChannels(channelName);

        if (cancelled) return;

        channel = supabase
          .channel(channelName)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refreshUnread)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_reads' }, refreshUnread);

        channel.subscribe((status, error) => {
          if (cancelled) return;

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            noteBottomNavRealtime(channelName, status, error);
            refreshUnread();
          }
        });
      } catch (error) {
        if (cancelled) return;

        warnBottomNavRealtime(`Could not subscribe to ${channelName}.`, error);
        refreshUnread();
      }
    };

    void setupChannel();

    return () => {
      cancelled = true;

      if (!channel) return;

      const channelToRemove = channel;
      channel = null;
      void supabase.removeChannel(channelToRemove).catch((error) => {
        warnBottomNavRealtime(`Could not remove channel ${channelName}.`, error);
      });
    };
  }, [profile?.id, refreshUnread]);

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
            <View>
              <MaterialIcons
                color={tint}
                name={isFocused ? meta.activeIcon : meta.inactiveIcon}
                size={24}
              />
              {route.name === 'messages' && unreadMessages > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text>
                </View>
              ) : null}
            </View>
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
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 60,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    width: '100%',
  },
  labelActive: {
    fontFamily: 'Satoshi-Bold',
  },
  labelInactive: {
    fontFamily: 'Satoshi-Regular',
  },
  pressed: {
    opacity: 0.7,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: color.danger,
    borderColor: color.background,
    borderRadius: 9,
    borderWidth: 2,
    minHeight: 18,
    minWidth: 18,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -11,
    top: -7,
  },
  badgeText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 14,
  },
});
