import React, { memo, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, PanResponder, Platform, View } from 'react-native';
import { GarmentArt } from '../catalog/GarmentArt';
import type { Garment } from '../storage/types';
import { hashString, rng } from '../storage/util';

interface Props {
  garments: Garment[];
  onOpen: (id: string) => void;
}

/** A heap of the whole closet. Size scales with inventory; every piece drags and taps. */
export function Pile({ garments, onOpen }: Props) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const zTop = useRef(garments.length + 1);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!box || Math.abs(box.w - width) > 2 || Math.abs(box.h - height) > 2) setBox({ w: width, h: height });
  };

  const layout = useMemo(() => {
    if (!box || !garments.length) return [];
    const n = garments.length;
    const size = Math.max(54, Math.min(140, Math.sqrt((box.w * box.h) / n) * 1.45));
    return garments.map((g, i) => {
      const r = rng(hashString(g.id) + 11);
      const v = r();
      const u = r();
      const depth = Math.pow(v, 0.7); // more pieces near the bottom of the heap
      const y = (box.h - size) * (0.08 + 0.92 * depth);
      const spread = 0.45 + 0.55 * depth;
      const x = Math.max(-size * 0.12, Math.min(box.w - size * 0.88, box.w / 2 - size / 2 + (u - 0.5) * (box.w - size) * spread));
      return { g, x, y, size, rot: (r() - 0.5) * 56, z: Math.round(depth * 1000) + i };
    });
  }, [box, garments]);

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={onLayout}>
      {layout.map((p) => (
        <PileItem key={p.g.id} {...p} onOpen={onOpen} nextZ={() => ++zTop.current + 2000} />
      ))}
    </View>
  );
}

const PileItem = memo(function PileItem({
  g, x, y, size, rot, z, onOpen, nextZ,
}: { g: Garment; x: number; y: number; size: number; rot: number; z: number; onOpen: (id: string) => void; nextZ: () => number }) {
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lift = useRef(new Animated.Value(1)).current;
  const [zIndex, setZ] = useState(z);
  const start = useRef({ t: 0 });
  const moved = useRef(0);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          start.current.t = Date.now();
          moved.current = 0;
          pos.extractOffset();
          setZ(nextZ());
          Animated.spring(lift, { toValue: 1.08, useNativeDriver: false, speed: 40 }).start();
        },
        onPanResponderMove: (_e, gs) => {
          moved.current = Math.max(moved.current, Math.abs(gs.dx) + Math.abs(gs.dy));
          pos.setValue({ x: gs.dx, y: gs.dy });
        },
        onPanResponderRelease: () => {
          pos.flattenOffset();
          Animated.spring(lift, { toValue: 1, useNativeDriver: false, speed: 30 }).start();
          if (moved.current < 6 && Date.now() - start.current.t < 400) onOpen(g.id);
        },
        onPanResponderTerminate: () => {
          pos.flattenOffset();
          Animated.spring(lift, { toValue: 1, useNativeDriver: false }).start();
        },
      }),
    [g.id, lift, nextZ, onOpen, pos],
  );

  return (
    <Animated.View
      {...responder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel={g.name}
      accessibilityHint="drag to move, tap to open"
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          zIndex,
          transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate: `${rot}deg` }, { scale: lift }],
        },
        Platform.OS === 'web' ? ({ cursor: 'grab', userSelect: 'none', touchAction: 'none' } as object) : null,
      ]}
    >
      <GarmentArt garment={g} size={size} />
    </Animated.View>
  );
});
