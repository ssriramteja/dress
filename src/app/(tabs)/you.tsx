import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GarmentArt } from '../../catalog/GarmentArt';
import { useUI } from '../../components/SheetContext';
import { Button } from '../../components/ui';
import { useStore } from '../../storage/store';
import type { ColorFamily, Garment } from '../../storage/types';
import { daysBetween, localDate } from '../../storage/util';
import { color, touch, type } from '../../theme/tokens';

const FAMILY: Record<ColorFamily, { label: string; hex: string }> = {
  neutral: { label: 'black & grey', hex: '#3B3C3E' },
  light: { label: 'white & cream', hex: '#EFE7D6' },
  blue: { label: 'blues', hex: '#2D3E63' },
  earth: { label: 'earth tones', hex: '#B88A58' },
  green: { label: 'greens', hex: '#5B5E3A' },
  red: { label: 'reds', hex: '#9A4A2A' },
};

export default function You() {
  const { state, wearInfo, garmentById, dispatch, logout } = useStore();
  const { openGarment } = useUI();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false);
  const today = localDate();

  const stats = useMemo(() => {
    const g = state.garments;
    const never = g.filter((x) => !wearInfo.get(x.id)?.count).length;
    const recent = g.filter((x) => {
      const l = wearInfo.get(x.id)?.last;
      return l && daysBetween(l, today) <= 30;
    }).length;
    const month = today.slice(0, 7);
    const wearsThisMonth = state.wears.filter((w) => w.date.startsWith(month)).length;
    const top = [...g].sort((a, b) => (wearInfo.get(b.id)?.count ?? 0) - (wearInfo.get(a.id)?.count ?? 0))[0];
    return { pieces: g.length, never, recentPct: g.length ? Math.round((recent / g.length) * 100) : 0, wearsThisMonth, totalWears: state.wears.length, top };
  }, [state.garments, state.wears, wearInfo, today]);

  const underused = useMemo(
    () =>
      state.garments
        .map((g) => ({ g, last: wearInfo.get(g.id)?.last }))
        .filter(({ last }) => !last || daysBetween(last, today) > 60)
        .sort((a, b) => ((a.last ?? '') < (b.last ?? '') ? -1 : 1))
        .slice(0, 12)
        .map(({ g }) => g),
    [state.garments, wearInfo, today],
  );

  const colours = useMemo(() => {
    const counts = new Map<ColorFamily, number>();
    state.garments.forEach((g) => counts.set(g.family, (counts.get(g.family) ?? 0) + 1));
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const total = state.garments.length || 1;
    const neutralShare = ((counts.get('neutral') ?? 0) + (counts.get('light') ?? 0)) / total;
    const wornByFamily = new Map<ColorFamily, number>();
    state.wears.forEach((w) => {
      const g = garmentById.get(w.garmentId);
      if (g) wornByFamily.set(g.family, (wornByFamily.get(g.family) ?? 0) + 1);
    });
    const mostWorn = [...wornByFamily.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    let insight = `${Math.round(neutralShare * 100)}% of your closet is black, grey, white or cream.`;
    if (mostWorn) insight += ` you reach for ${FAMILY[mostWorn].label} most.`;
    const leastWorn = rows.filter(([f]) => (wornByFamily.get(f) ?? 0) / (counts.get(f) ?? 1) < 2).map(([f]) => f)[0];
    if (leastWorn && leastWorn !== mostWorn) insight += ` your ${FAMILY[leastWorn].label} barely get out.`;
    return { rows, total, insight };
  }, [state.garments, state.wears, garmentById]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={[type.label, { color: color.onBlack }]}>you</Text>
          {state.demo ? <Text style={[type.micro, { color: color.onBlackMuted }]}>demo closet</Text> : null}
        </View>

        <View style={styles.statGrid}>
          <Stat label="pieces" value={String(stats.pieces)} />
          <Stat label="wears logged" value={String(stats.totalWears)} />
          <Stat label="worn in last 30 days" value={`${stats.recentPct}%`} />
          <Stat label="never worn" value={String(stats.never)} red={stats.never > 0} />
        </View>
        {stats.top ? (
          <Text style={[type.small, { color: color.onBlackMuted, marginTop: 10 }]}>
            most worn: {stats.top.name}, {wearInfo.get(stats.top.id)?.count ?? 0} times. {stats.wearsThisMonth} wears logged this month.
          </Text>
        ) : null}

        <Section title="colour">
          <View style={styles.colourBar} accessibilityLabel="colour breakdown">
            {colours.rows.map(([f, n]) => (
              <View key={f} style={{ flex: n, backgroundColor: FAMILY[f].hex }} />
            ))}
          </View>
          <View style={styles.legend}>
            {colours.rows.map(([f, n]) => (
              <View key={f} style={styles.legendItem}>
                <View style={{ width: 10, height: 10, backgroundColor: FAMILY[f].hex, borderWidth: StyleSheet.hairlineWidth, borderColor: '#444' }} />
                <Text style={[type.small, { color: color.onBlackMuted }]}>
                  {FAMILY[f].label} {Math.round((n / colours.total) * 100)}%
                </Text>
              </View>
            ))}
          </View>
          <Text style={[type.body, { color: color.onBlack, marginTop: 12 }]}>{colours.insight}</Text>
        </Section>

        <Section title="underused" note="not worn in two months or more">
          {underused.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 2 }}>
              {underused.map((g) => (
                <Mini key={g.id} g={g} label={wearInfo.get(g.id)?.count ? `${wearInfo.get(g.id)!.count}×` : 'never worn'} red={!wearInfo.get(g.id)?.count} onPress={() => openGarment(g.id, 'you')} />
              ))}
            </ScrollView>
          ) : (
            <Text style={[type.small, { color: color.onBlackMuted }]}>everything’s been worn recently.</Text>
          )}
        </Section>

        <Section title="saved looks">
          {state.savedLooks.length === 0 ? (
            <Text style={[type.small, { color: color.onBlackMuted }]}>looks you save in the stylist land here.</Text>
          ) : (
            <View style={{ gap: 16 }}>
              {state.savedLooks.map((l) => (
                <View key={l.id} style={styles.saved}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[type.label, { color: color.onBlack }]}>{l.name}</Text>
                    <Pressable accessibilityRole="button" onPress={() => dispatch({ type: 'unsaveLook', id: l.id })} style={{ minHeight: touch, justifyContent: 'center' }}>
                      <Text style={[type.small, { color: color.onBlackMuted }]}>remove</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 2, flexWrap: 'wrap' }}>
                    {l.garmentIds.map((id) => {
                      const g = garmentById.get(id);
                      return g ? <Mini key={id} g={g} onPress={() => openGarment(id, 'you')} /> : null;
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="account">
          {confirm ? (
            <View style={{ gap: 8 }}>
              <Text style={[type.body, { color: color.onBlack }]}>this clears your closet, wear history and chat from this device.</Text>
              <Button
                tone="onBlack"
                label="log out and clear"
                onPress={async () => {
                  await logout();
                  router.replace('/onboarding');
                }}
              />
              <Button tone="onBlack" variant="outline" label="cancel" onPress={() => setConfirm(false)} />
            </View>
          ) : (
            <Button tone="onBlack" variant="outline" label="log out" onPress={() => setConfirm(true)} />
          )}
        </Section>
      </View>
    </ScrollView>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 32 }}>
      <Text style={[type.label, { color: color.onBlack }]}>{title}</Text>
      {note ? <Text style={[type.small, { color: color.onBlackMuted, marginTop: 2 }]}>{note}</Text> : null}
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

function Stat({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[type.display, { color: red ? color.red : color.onBlack }]}>{value}</Text>
      <Text style={[type.small, { color: color.onBlackMuted }]}>{label}</Text>
    </View>
  );
}

function Mini({ g, label, red, onPress }: { g: Garment; label?: string; red?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={g.name} onPress={onPress} style={styles.mini}>
      <GarmentArt garment={g} size={70} />
      {label ? <Text style={[type.micro, { fontSize: 10, color: red ? color.red : color.muted }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.black },
  inner: { paddingHorizontal: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: color.lineDark },
  stat: { width: '50%', padding: 14, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.lineDark, gap: 2 },
  colourBar: { flexDirection: 'row', height: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saved: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.lineDark, paddingTop: 4, gap: 6 },
  mini: { width: 84, height: 96, backgroundColor: color.paper, alignItems: 'center', justifyContent: 'center' },
});
