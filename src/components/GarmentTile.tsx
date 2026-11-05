import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GarmentArt } from '../catalog/GarmentArt';
import type { Garment } from '../storage/types';
import { color, type } from '../theme/tokens';

interface Props {
  garment: Garment;
  size: number;
  wears?: number;
  showWears?: boolean;
  onPress?: () => void;
  /** tile surface for dark contexts */
  surface?: string;
  radius?: number;
}

function Tile({ garment, size, wears = 0, showWears = true, onPress, surface = color.tile, radius = 0 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${garment.name}, ${wears ? `worn ${wears} times` : 'never worn'}`}
      style={({ pressed }) => [{ width: size, height: size, backgroundColor: surface, borderRadius: radius, overflow: 'hidden', opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.art}>
        <GarmentArt garment={garment} size={size * 0.78} />
      </View>
      {garment.image.type === 'photo' ? <Text style={[type.micro, styles.badge]}>not cut out</Text> : null}
      {showWears ? (
        <Text style={[type.micro, styles.count, { color: wears ? color.muted : color.red }]}>{wears ? `${wears}×` : 'never worn'}</Text>
      ) : null}
    </Pressable>
  );
}

export const GarmentTile = memo(Tile);

const styles = StyleSheet.create({
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', left: 8, bottom: 6 },
  badge: { position: 'absolute', right: 6, top: 6, color: color.muted },
});
