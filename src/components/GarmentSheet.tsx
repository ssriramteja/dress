import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GarmentArt } from '../catalog/GarmentArt';
import { useReducedMotion } from '../hooks/device';
import { useStore } from '../storage/store';
import type { Garment } from '../storage/types';
import { lastWornLabel } from '../storage/util';
import { color, touch, type } from '../theme/tokens';
import { IconBack, IconClose } from './Icons';
import { OutfitBoard } from './OutfitBoard';
import { useUI } from './SheetContext';
import { Button } from './ui';

const CATEGORY_LABEL: Record<Garment['category'], string> = {
  tops: 'top', bottoms: 'bottom', outerwear: 'outerwear', shoes: 'shoes', caps: 'cap', bags: 'bag',
};

export function GarmentSheet() {
  const { sheet, closeGarment, sendToStylist } = useUI();
  const { garmentById, wearInfo, logWear, wornToday, state } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [current, setCurrent] = useState(sheet);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (sheet) {
      setCurrent(sheet);
      setToast(null);
      Animated.timing(anim, { toValue: 1, duration: reduced ? 0 : 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    } else if (current) {
      Animated.timing(anim, { toValue: 0, duration: reduced ? 0 : 220, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => setCurrent(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  useEffect(() => {
    if (!sheet) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeGarment();
      return true;
    });
    return () => sub.remove();
  }, [sheet, closeGarment]);

  if (!current) return null;
  const g = garmentById.get(current.garmentId);
  const fromChat = current.origin === 'chat';
  const info = wearInfo.get(current.garmentId);
  const worn = g ? wornToday(g.id) : false;
  const sources = g ? state.outfits.filter((o) => g.sourceOutfitIds.includes(o.id)) : [];
  const maxW = Math.min(width, 640);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={sheet ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeGarment} accessibilityLabel="close" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[styles.panel, { top: insets.top + 8, transform: [{ translateY }], width: maxW, alignSelf: 'center' }]}
      >
        <View style={styles.bar}>
          <Pressable accessibilityRole="button" onPress={closeGarment} hitSlop={8} style={styles.barBtn}>
            {fromChat ? <IconBack color={color.ink} size={20} /> : <IconClose color={color.ink} size={20} />}
            <Text style={[type.label, { color: color.ink }]}>{fromChat ? 'back to chat' : 'close'}</Text>
          </Pressable>
        </View>
        {!g ? (
          <View style={{ padding: 24 }}>
            <Text style={[type.title, { color: color.ink }]}>this piece isn’t in your closet any more.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
            <View style={[styles.hero, { height: Math.min(maxW, 420) }]}>
              <GarmentArt garment={g} size={Math.min(maxW, 420) * 0.82} />
            </View>
            <View style={styles.body}>
              <Text style={[type.display, { color: color.ink }]}>{g.name}</Text>
              <Text style={[type.small, { color: color.muted, marginTop: 4 }]}>
                {CATEGORY_LABEL[g.category]} · {g.colorName}
                {g.image.type === 'photo' ? ' · unprocessed photo, not cut out' : ''}
              </Text>
              <Text style={[type.body, { color: color.ink, marginTop: 14 }]}>{g.description}</Text>

              <View style={styles.stats}>
                <Stat label="worn" value={info?.count ? `${info.count}×` : 'never'} red={!info?.count} />
                <Stat label="last worn" value={lastWornLabel(info?.last)} red={!info?.last} />
                <Stat label="in outfits" value={String(sources.length)} />
              </View>

              <View style={{ gap: 8, marginTop: 20 }}>
                <Button
                  label={worn ? 'worn today ✓' : 'worn today'}
                  disabled={worn}
                  onPress={() => {
                    const n = logWear([g.id]);
                    setToast(n ? 'logged. counted once for today.' : 'already logged today.');
                  }}
                />
                <Button
                  label="style this"
                  variant="outline"
                  onPress={() => {
                    sendToStylist({ text: `style my ${g.name}`, anchorId: g.id });
                    closeGarment();
                    router.navigate('/(tabs)/stylist');
                  }}
                />
                {toast ? <Text style={[type.small, { color: color.muted }]} accessibilityLiveRegion="polite">{toast}</Text> : null}
              </View>

              {sources.length ? (
                <View style={{ marginTop: 28 }}>
                  <Text style={[type.label, { color: color.ink, marginBottom: 10 }]}>from these outfits</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {sources.map((o) => (
                      <OutfitBoard key={o.id} outfit={o} garments={garmentById} size={120} />
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function Stat({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <View style={{ flex: 1, paddingVertical: 12, borderTopWidth: 1, borderColor: color.hairline }}>
      <Text style={[type.micro, { color: color.muted }]}>{label}</Text>
      <Text style={[type.title, { fontSize: 17, color: red ? color.red : color.ink, marginTop: 2 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', bottom: 0, backgroundColor: color.paper, overflow: 'hidden' },
  bar: { height: 52, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
  barBtn: { minHeight: touch, flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  hero: { backgroundColor: color.tile, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
