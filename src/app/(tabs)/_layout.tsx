import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { TabBar } from '../../components/TabBar';
import { useStore } from '../../storage/store';

export default function TabsLayout() {
  const { state } = useStore();
  if (!state.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="closet" options={{ title: 'closet' }} />
      <Tabs.Screen name="stylist" options={{ title: 'stylist' }} />
      <Tabs.Screen name="you" options={{ title: 'you' }} />
    </Tabs>
  );
}
