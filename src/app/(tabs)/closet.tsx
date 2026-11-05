import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GarmentTile } from '../../components/GarmentTile';
import { IconGrid, IconPile, IconStylist } from '../../components/Icons';
import { Pile } from '../../components/Pile';
import { useUI } from '../../components/SheetContext';
import { Button, StateMessage, Wordmark } from '../../components/ui';
import { useShake } from '../../hooks/device';
import { useStore } from '../../storage/store';
import type { Category, Garment } from '../../storage/types';
import { color, touch, type } from '../../theme/tokens';

const FILTERS: ('all' | Category)[] = ['all', 'tops', 'bottoms', 'outerwear', 'shoes', 'caps', 'bags'];
const SORTS = ['mixed', 'most worn', 'least worn', 'recently worn', 'colour'] as const;
type Sort = (typeof SORTS)[number];
const CAT_ORDER: Category[] = ['tops', 'bottoms', 'outerwear', 'shoes', 'tops', 'caps', 'bottoms', 'bags'];

function interleave(list: Garment[]) {
  const buckets = new Map<Category, Garment[]>();
  list.forEach((g) => buckets.set(g.category, [...(buckets.get(g.category) ?? []), g]));
  const out: Garment[] = [];
  let i = 0;
  while (out.length < list.length && i < list.length * 8) {
    const b = buckets.get(CAT_ORDER[i % CAT_ORDER.length]);
    const next = b?.shift();
    if (next) out.push(next);
    i++;
  }
  // anything left over
  buckets.forEach((b) => out.push(...b));
  return out;
}

export default function Closet() {
  const { state, wearInfo, saveError } = useStore();
  const { openGarment } = useUI();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [view, setView] = useState<'grid' | 'pile'>('grid');
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [sort, setSort] = useState<Sort>('mixed');
  const [sortOpen, setSortOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const toggle = useCallback(() => {
    setView((v) => (v === 'grid' ? 'pile' : 'grid'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);
  const shakeAvailable = useShake(toggle, focused);

  const items = useMemo(() => {
    const base = filter === 'all' ? state.garments : state.garments.filter((g) => g.category === filter);
    const count = (g: Garment) => wearInfo.get(g.id)?.count ?? 0;
    const last = (g: Garment) => wearInfo.get(g.id)?.last ?? '';
    switch (sort) {
      case 'mixed':
        return filter === 'all' ? interleave([...base].sort((a, b) => b.addedAt - a.addedAt)) : [...base].sort((a, b) => b.addedAt - a.addedAt);
      case 'most worn':
        return [...base].sort((a, b) => count(b) - count(a));
      case 'least worn':
        return [...base].sort((a, b) => count(a) - count(b));
      case 'recently worn':
        return [...base].sort((a, b) => (last(b) > last(a) ? 1 : -1));
      case 'colour':
        return [...base].sort((a, b) => a.family.localeCompare(b.family) || a.colorName.localeCompare(b.colorName));
    }
  }, [state.garments, filter, sort, wearInfo]);

  const contentW = Math.min(width, 900);
  const cols = contentW > 700 ? 5 : contentW > 520 ? 4 : 3;
  const gap = 2;
  const tile = Math.floor((contentW - 32 - gap * (cols - 1)) / cols);
  const open = useCallback((id: string) => openGarment(id, 'closet'), [openGarment]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {focused ? <StatusBar style="dark" /> : null}
      <View style={[styles.header, { maxWidth: 900 }]}>
        <Wordmark />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[type.small, { color: color.muted, marginRight: 8 }]}>{state.garments.length} pieces</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="grid view" accessibilityState={{ selected: view === 'grid' }} onPress={() => setView('grid')} style={styles.iconBtn}>
            <IconGrid color={view === 'grid' ? color.ink : '#A19D95'} size={20} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="pile view" accessibilityState={{ selected: view === 'pile' }} onPress={() => setView('pile')} style={styles.iconBtn}>
            <IconPile color={view === 'pile' ? color.ink : '#A19D95'} size={20} />
          </Pressable>
        </View>
      </View>

      {state.garments.length === 0 ? (
        <StateMessage
          title="your closet is empty."
          body="scan some outfit photos, or load the demo closet, to get started."
          action={<Button label="add pieces" onPress={() => router.push('/onboarding?step=source')} />}
        />
      ) : view === 'grid' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingHorizontal: 16, gap: 18 }}>
            {FILTERS.map((f) => {
              const on = f === filter;
              return (
                <Pressable key={f} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setFilter(f)} style={styles.filter}>
                  <Text style={[type.label, { color: on ? color.ink : color.muted }]}>{f}</Text>
                  <View style={{ height: 1.5, marginTop: 4, backgroundColor: on ? color.ink : 'transparent' }} />
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.sortRow}>
            <Text style={[type.small, { color: color.muted }]}>{items.length} shown</Text>
            <Pressable accessibilityRole="button" onPress={() => setSortOpen((o) => !o)} style={styles.filter}>
              <Text style={[type.small, { color: color.ink }]}>sort: {sort}</Text>
            </Pressable>
          </View>
          {sortOpen ? (
            <View style={styles.sortMenu}>
              {SORTS.map((s) => (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityState={{ selected: s === sort }}
                  onPress={() => {
                    setSort(s);
                    setSortOpen(false);
                  }}
                  style={styles.sortItem}
                >
                  <Text style={[type.label, { color: s === sort ? color.ink : color.muted }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <FlatList
            key={cols}
            data={items}
            numColumns={cols}
            keyExtractor={(g) => g.id}
            columnWrapperStyle={{ gap }}
            contentContainerStyle={{ paddingHorizontal: 16, gap, paddingBottom: 110, alignSelf: 'center', width: contentW }}
            initialNumToRender={18}
            windowSize={7}
            renderItem={({ item }) => <GarmentTile garment={item} size={tile} wears={wearInfo.get(item.id)?.count ?? 0} onPress={() => open(item.id)} />}
            ListEmptyComponent={<StateMessage title={`no ${filter} yet.`} />}
          />
        </>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={[type.small, { color: color.muted, paddingHorizontal: 16, paddingBottom: 6 }]}>
            all {state.garments.length} pieces · drag them around, tap one to open
            {shakeAvailable ? ' · shake to switch view' : Platform.OS === 'web' ? ' · use the grid icon to switch' : ''}
          </Text>
          <Pile garments={state.garments} onOpen={open} />
        </View>
      )}

      {saveError ? <Text style={[type.small, styles.error]}>{saveError}</Text> : null}

      {state.garments.length ? (
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/stylist')} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.85 }]}>
          <IconStylist color={color.onBlack} size={18} />
          <Text style={[type.label, { color: color.onBlack }]}>ask your stylist</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  header: { height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', alignSelf: 'center' },
  iconBtn: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  filters: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
  filter: { minHeight: touch, justifyContent: 'center' },
  sortRow: { paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sortMenu: { marginHorizontal: 16, marginBottom: 8, backgroundColor: color.tile, borderWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
  sortItem: { minHeight: touch, justifyContent: 'center', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
  pill: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: color.ink,
    paddingHorizontal: 18,
    minHeight: 46,
    borderRadius: 23,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  error: { color: color.red, paddingHorizontal: 16, paddingVertical: 6, position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center' },
});
