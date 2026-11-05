import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { GarmentArt } from '../catalog/GarmentArt';
import type { Garment, Look } from '../storage/types';
import { color, touch, type } from '../theme/tokens';
import { IconCheck, IconDislike, IconSave, IconShuffle } from './Icons';

interface Props {
  look: Look;
  garments: Map<string, Garment>;
  saved: boolean;
  note?: string;
  onOpen: (id: string) => void;
  onSave: () => void;
  onShuffle: () => void;
  onDislike: () => void;
  onWear: () => void;
}

/** Rounded look card (chat surface). Tiles are separate and aligned, never a collage. */
export function LookCard({ look, garments, saved, note, onOpen, onSave, onShuffle, onDislike, onWear }: Props) {
  const [w, setW] = useState(0);
  const items = look.garmentIds.map((id) => garments.get(id)).filter(Boolean) as Garment[];
  const perRow = items.length <= 4 ? Math.max(2, items.length) : 3;
  const gap = 8;
  const tile = w ? Math.floor((w - gap * (perRow - 1)) / perRow) : 0;
  return (
    <View style={styles.card}>
      <Text style={[type.title, { color: color.onBlack, fontSize: 17 }]}>{look.name}</Text>
      <Text style={[type.small, { color: color.onBlackMuted, marginTop: 4 }]}>{look.reason}</Text>
      <View style={[styles.tiles, { gap }]} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        {tile > 0 &&
          items.map((g) => (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              accessibilityLabel={`open ${g.name}`}
              onPress={() => onOpen(g.id)}
              style={({ pressed }) => [styles.tile, { width: tile, height: tile * 1.15, opacity: pressed ? 0.8 : 1 }]}
            >
              <GarmentArt garment={g} size={tile * 0.84} />
              <Text numberOfLines={1} style={[type.micro, styles.tileLabel]}>{g.name}</Text>
            </Pressable>
          ))}
      </View>
      <View style={styles.actions}>
        <Action label={saved ? 'saved' : 'save'} onPress={onSave} icon={<IconSave color={color.onBlack} size={18} filled={saved} />} />
        <Action label="shuffle" onPress={onShuffle} icon={<IconShuffle color={color.onBlack} size={18} />} />
        <Action label="dislike" onPress={onDislike} icon={<IconDislike color={color.onBlack} size={18} />} />
        <Action label="wear it" onPress={onWear} icon={<IconCheck color={color.onBlack} size={18} />} />
      </View>
      {note ? <Text style={[type.small, { color: color.onBlackMuted, marginTop: 6 }]} accessibilityLiveRegion="polite">{note}</Text> : null}
    </View>
  );
}

function Action({ label, onPress, icon }: { label: string; onPress: () => void; icon: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
      {icon}
      <Text style={[type.micro, { color: color.onBlack }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.surfaceDark, borderRadius: 22, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#2A2A2A' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  tile: { backgroundColor: color.paper, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingBottom: 14 },
  tileLabel: { position: 'absolute', bottom: 6, left: 8, right: 8, color: color.muted, fontSize: 10 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  action: { minHeight: touch, minWidth: touch, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 6 },
});
