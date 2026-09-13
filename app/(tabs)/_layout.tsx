import { Tabs } from 'expo-router';
import React from 'react';

import { BottomNav } from '@/components/BottomNav';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      {/*
        Search keeps its route and all of its filtering, taxonomy, and
        personalization logic. It is simply no longer a bottom-navigation
        destination: `BottomNav` only renders routes listed in its `TAB_META`,
        so Search stays fully navigable from the Home search bar and the Home
        category grid. It is deliberately NOT hidden with `href: null`, which
        can drop the screen from the navigator and break `router.push`.
      */}
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
        }}
      />
    </Tabs>
  );
}
