import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GarmentArt } from '../catalog/GarmentArt';
import { splashGarments } from '../catalog/demoCatalog';
import type { Garment } from '../storage/types';
import { color, type } from '../theme/tokens';
import { Button, TextLink, Wordmark } from '../components/ui';

const native = Platform.OS !== 'web';

function Column({ items, tile, gap, direction, duration, reduced }: { items: Garment[]; tile: number; gap: number; direction: 1 | -1; duration: number; reduced: boolean }) {
  const setH = items.length * (tile + gap);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [v, duration, reduced]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: direction === 1 ? [-setH, 0] : [0, -setH] });
  return (
    <Animated.View style={{ gap, transform: [{ translateY }] }}>
      {[...items, ...items].map((g, i) => (
        <View key={`${g.id}${i}`} style={{ width: tile, height: tile, backgroundColor: color.paper, alignItems: 'center', justifyContent: 'center' }}>
          <GarmentArt garment={g} size={tile * 0.8} />
        </View>
      ))}
    </Animated.View>
  );
}

export function Splash({ reduced, onNext, onSkip }: { reduced: boolean; onNext: () => void; onSkip: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const all = useMemo(splashGarments, []);
  const cols = useMemo(() => {
    const pick = (start: number) => all.filter((_, i) => i % 3 === start).filter((_, i) => i % 2 === 0).slice(0, 10);
    return [pick(0), pick(1), pick(2)];
  }, [all]);
  const gap = 6;
  const contentW = Math.min(width, 520);
  const tile = (contentW - gap * 4) / 3;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: color.black }]}>
      <View style={{ position: 'absolute', top: 0, height: height * 0.68, left: 0, right: 0, overflow: 'hidden', alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ flexDirection: 'row', gap, paddingHorizontal: gap }}>
          {cols.map((c, i) => (
            <Column key={i} items={c} tile={tile} gap={gap} direction={i === 1 ? 1 : -1} duration={52000 + i * 9000} reduced={reduced} />
          ))}
        </View>
        <Svg style={styles.fade} width="100%" height={160} pointerEvents="none">
          <Defs>
            <LinearGradient id="splashFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000" stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="160" fill="url(#splashFade)" />
        </Svg>
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <Wordmark tone="light" size={22} />
        <Text style={[type.display, { color: color.onBlack, marginTop: 14 }]}>your closet, organised.</Text>
        <Text style={[type.body, { color: color.onBlackMuted, marginTop: 6 }]}>style what you already own.</Text>
        <Button tone="onBlack" label="get started" onPress={onNext} style={{ marginTop: 24 }} />
        <TextLink label="skip intro" onPress={onSkip} style={{ alignSelf: 'center', marginTop: 4 }} textStyle={{ color: color.onBlackMuted }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, maxWidth: 520, alignSelf: 'center', width: '100%' },
});
