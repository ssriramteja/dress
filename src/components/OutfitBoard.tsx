import React, { memo } from 'react';
import { Image, Text, View } from 'react-native';
import { GarmentArt } from '../catalog/GarmentArt';
import type { Garment, OutfitPhoto } from '../storage/types';
import { color, type } from '../theme/tokens';

/**
 * Renders an outfit "photo". Demo outfits are drawn as a studio board from the
 * pieces they contain; real outfits show the user's photo.
 */
function Board({ outfit, garments, size }: { outfit: OutfitPhoto; garments: Map<string, Garment>; size: number }) {
  if (outfit.uri) {
    return <Image source={{ uri: outfit.uri }} style={{ width: size, height: size * 1.25, backgroundColor: color.hairline }} resizeMode="cover" />;
  }
  const items = outfit.garmentIds.map((id) => garments.get(id)).filter(Boolean) as Garment[];
  const outer = items.find((g) => g.category === 'outerwear');
  const top = items.find((g) => g.category === 'tops');
  const bottom = items.find((g) => g.category === 'bottoms');
  const shoes = items.find((g) => g.category === 'shoes');
  const extra = items.find((g) => g.category === 'caps' || g.category === 'bags');
  const w = size;
  const h = size * 1.25;
  const place = (g: Garment | undefined, x: number, y: number, s: number) =>
    g ? (
      <View key={g.id} style={{ position: 'absolute', left: x * w, top: y * h }}>
        <GarmentArt garment={g} size={s * w} />
      </View>
    ) : null;
  return (
    <View style={{ width: w, height: h, backgroundColor: '#E9E6DF' }}>
      {place(outer, 0.02, 0.04, 0.5)}
      {place(top, outer ? 0.44 : 0.22, 0.02, outer ? 0.52 : 0.56)}
      {place(bottom, 0.3, 0.38, 0.48)}
      {place(shoes, 0.02, 0.72, 0.32)}
      {place(extra, 0.68, 0.74, 0.28)}
      <Text style={[type.micro, { position: 'absolute', right: 6, bottom: 4, color: color.muted, fontSize: 9 }]}>demo board</Text>
    </View>
  );
}

export const OutfitBoard = memo(Board);
