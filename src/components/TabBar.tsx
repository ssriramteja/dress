import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, type } from '../theme/tokens';
import { IconCloset, IconStylist, IconYou } from './Icons';

const ICONS = { closet: IconCloset, stylist: IconStylist, you: IconYou } as const;

// Matches expo-router SDK 58 BottomTabBarProps, kept loose to avoid internal type imports.
interface Props {
  state: { index: number; routes: { key: string; name: string }[] };
  emitter: { emit: (e: any) => any };
  navigateToTab: (routeKey: string) => void;
}

export function TabBar({ state, emitter, navigateToTab }: Props) {
  const insets = useSafeAreaInsets();
  const [kb, setKb] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  if (kb) return null;

  const active = state.routes[state.index]?.name;
  const light = active === 'closet';
  const fg = light ? color.ink : color.onBlack;
  const dim = light ? '#A19D95' : color.onBlackFaint;

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: light ? color.paper : color.black, borderColor: light ? color.hairline : color.lineDark }]}
    >
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const Icon = ICONS[route.name as keyof typeof ICONS];
        if (!Icon) return null;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={route.name}
            onPress={() => {
              const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e?.defaultPrevented) navigateToTab(route.key);
            }}
            style={styles.item}
          >
            <View style={[styles.indicator, { backgroundColor: focused ? fg : 'transparent' }]} />
            <Icon color={focused ? fg : dim} size={22} strokeWidth={focused ? 1.8 : 1.4} />
            <Text style={[type.micro, { color: focused ? fg : dim, marginTop: 3, fontWeight: focused ? '600' : '400' }]}>{route.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  indicator: { position: 'absolute', top: 0, width: 28, height: 2 },
});
