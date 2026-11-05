import React, { memo, useId } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { Garment, Kind } from '../storage/types';
import { luminance, shade } from '../storage/util';

interface Shape {
  body: string[];
  /** filled with the accent colour (soles, trims) */
  accent?: string[];
  /** stroked detail lines */
  lines?: string[];
  dots?: [number, number][];
}

const TOP_LS = 'M33 14 L43 11 Q50 17 57 11 L67 14 L80 24 L88 76 L79 78 L71 40 L71 90 L29 90 L29 40 L21 78 L12 76 L20 24 Z';

const SHAPES: Record<Kind, Shape> = {
  tee: {
    body: ['M30 18 L41 13 Q50 20 59 13 L70 18 L87 31 L79 43 L70 38 L70 88 L30 88 L30 38 L21 43 L13 31 Z'],
    lines: ['M41 13 Q50 23 59 13', 'M30 38 L30 38'],
  },
  shirt: {
    body: [TOP_LS],
    accent: [],
    lines: ['M43 11 L50 24 L44 27 Z', 'M57 11 L50 24 L56 27 Z', 'M50 24 L50 90', 'M71 40 L71 40'],
    dots: [[50, 35], [50, 47], [50, 59], [50, 71], [50, 83]],
  },
  knit: {
    body: [TOP_LS],
    lines: ['M43 11 Q50 19 57 11', 'M29 84 L71 84', 'M80 72 L88 71', 'M20 72 L12 71', 'M41 12.5 Q50 22 59 12.5'],
  },
  hoodie: {
    body: [TOP_LS, 'M36 16 Q36 2 50 2 Q64 2 64 16 Q57 22 50 22 Q43 22 36 16 Z'],
    lines: ['M37 66 L63 66 L66 80 L34 80 Z', 'M47 22 L46 36', 'M53 22 L54 36', 'M29 84 L71 84'],
  },
  polo: {
    body: ['M30 18 L41 13 Q50 20 59 13 L70 18 L87 31 L79 43 L70 38 L70 88 L30 88 L30 38 L21 43 L13 31 Z'],
    lines: ['M41 13 L50 21 L59 13', 'M41 13 L45 22 L50 21', 'M59 13 L55 22 L50 21', 'M50 21 L50 34'],
    dots: [[50, 26], [50, 31]],
  },
  jeans: {
    body: ['M30 8 L70 8 L75 92 L56 92 L50 34 L44 92 L25 92 Z'],
    lines: ['M30 14 L70 14', 'M33 14 Q36 26 46 24', 'M67 14 Q64 26 54 24', 'M50 14 L50 30'],
    dots: [[50, 11]],
  },
  trousers: {
    body: ['M31 8 L69 8 L73 92 L55 92 L50 32 L45 92 L27 92 Z'],
    lines: ['M31 13 L69 13', 'M38 13 L36 92', 'M62 13 L64 92', 'M50 13 L50 28', 'M34 13 Q36 22 41 20'],
  },
  chinos: {
    body: ['M30 8 L70 8 L73 92 L55 92 L50 33 L45 92 L27 92 Z'],
    lines: ['M30 13 L70 13', 'M33 13 Q37 23 43 21', 'M67 13 Q63 23 57 21', 'M50 13 L50 28'],
  },
  shorts: {
    body: ['M27 22 L73 22 L78 66 L54 68 L50 42 L46 68 L22 66 Z'],
    lines: ['M27 28 L73 28', 'M30 28 Q34 38 42 36', 'M70 28 Q66 38 58 36', 'M50 28 L50 40'],
  },
  jacket: {
    body: ['M32 12 L44 9 L50 16 L56 9 L68 12 L82 22 L89 78 L79 80 L72 42 L73 90 L27 90 L28 42 L21 80 L11 78 L18 22 Z'],
    lines: ['M44 9 L49 20 L41 24 Z', 'M56 9 L51 20 L59 24 Z', 'M50 20 L50 90', 'M34 56 L46 56 L46 70 L34 70 Z', 'M54 56 L66 56 L66 70 L54 70 Z'],
    dots: [[50, 32], [50, 46], [50, 60], [50, 74]],
  },
  blazer: {
    body: ['M32 12 L43 9 L50 30 L57 9 L68 12 L82 22 L89 80 L79 82 L72 42 L73 92 L27 92 L28 42 L21 82 L11 80 L18 22 Z'],
    lines: ['M43 9 L40 22 L45 25 L50 52', 'M57 9 L60 22 L55 25 L50 52', 'M50 52 L50 92', 'M34 70 L44 70', 'M58 40 L66 40'],
    dots: [[52, 60], [52, 72]],
  },
  coat: {
    body: ['M33 8 L44 6 L50 26 L56 6 L67 8 L81 18 L90 84 L80 86 L72 40 L74 98 L26 98 L28 40 L20 86 L10 84 L19 18 Z'],
    lines: ['M44 6 L40 20 L46 24 L50 50', 'M56 6 L60 20 L54 24 L50 50', 'M50 50 L50 98', 'M32 72 L44 72', 'M56 72 L68 72'],
    dots: [[53, 58], [53, 70], [47, 58], [47, 70]],
  },
  overshirt: {
    body: [TOP_LS],
    lines: ['M43 11 L50 22 L44 25 Z', 'M57 11 L50 22 L56 25 Z', 'M50 22 L50 90', 'M33 34 L44 34 L44 46 L33 46 Z', 'M56 34 L67 34 L67 46 L56 46 Z'],
    dots: [[50, 34], [50, 50], [50, 66], [50, 82]],
  },
  bomber: {
    body: ['M32 14 L42 10 Q50 14 58 10 L68 14 L83 24 L90 74 L80 76 L72 40 L72 82 L28 82 L28 40 L20 76 L10 74 L17 24 Z'],
    accent: ['M28 82 L72 82 L72 90 L28 90 Z', 'M42 10 Q50 14 58 10 L58 15 Q50 19 42 15 Z'],
    lines: ['M50 14 L50 90', 'M33 50 L39 60', 'M67 50 L61 60'],
  },
  puffer: {
    body: ['M30 12 L42 8 Q50 12 58 8 L70 12 L85 24 L91 78 L80 80 L73 42 L73 90 L27 90 L27 42 L20 80 L9 78 L15 24 Z'],
    lines: ['M27 32 L73 32', 'M27 46 L73 46', 'M27 60 L73 60', 'M27 74 L73 74', 'M50 10 L50 90', 'M17 40 L23 40', 'M83 40 L77 40', 'M18 56 L24 56', 'M82 56 L76 56'],
  },
  sneaker: {
    body: ['M8 62 Q9 50 22 48 L40 41 Q49 37 56 44 L74 51 Q91 54 92 66 L92 70 L8 70 Z'],
    accent: ['M7 70 L93 70 L93 76 Q50 80 7 76 Z'],
    lines: ['M40 45 L46 52', 'M45 43 L51 50', 'M50 42 L56 48', 'M20 60 Q40 58 60 62', 'M8 62 L18 62'],
  },
  boot: {
    body: ['M26 14 L52 14 L53 52 Q78 54 86 66 L87 74 L26 74 Z'],
    accent: ['M25 74 L88 74 L88 82 L25 82 Z', 'M32 74 L44 74 L44 86 L32 86 Z'],
    lines: ['M44 16 Q48 34 44 52', 'M30 14 L30 22'],
  },
  loafer: {
    body: ['M8 64 Q12 52 30 52 L62 50 Q86 52 92 66 L92 70 L8 70 Z'],
    accent: ['M7 70 L93 70 L93 76 L7 76 Z'],
    lines: ['M52 52 Q60 58 76 54', 'M58 55 L70 55', 'M14 60 Q30 56 50 58'],
  },
  cap: {
    body: ['M20 62 Q20 28 50 26 Q80 28 80 62 Z', 'M48 60 Q76 58 95 66 Q86 74 54 70 Z'],
    lines: ['M50 26 L50 62', 'M36 30 Q40 46 40 62', 'M64 30 Q60 46 60 62'],
    dots: [[50, 26]],
  },
  beanie: {
    body: ['M24 66 Q24 24 50 22 Q76 24 76 66 Z'],
    accent: ['M22 60 L78 60 L78 80 L22 80 Z'],
    lines: ['M30 62 L30 78', 'M38 62 L38 78', 'M46 62 L46 78', 'M54 62 L54 78', 'M62 62 L62 78', 'M70 62 L70 78'],
  },
  tote: {
    body: ['M20 36 L80 36 L84 92 L16 92 Z'],
    lines: ['M36 36 Q36 10 50 10 Q64 10 64 36', 'M40 36 Q40 16 50 16 Q60 16 60 36', 'M20 44 L80 44'],
  },
  crossbody: {
    body: ['M24 48 L76 48 Q80 48 80 52 L80 82 L20 82 L20 52 Q20 48 24 48 Z'],
    accent: ['M20 52 Q20 48 24 48 L76 48 Q80 48 80 52 L80 64 L20 64 Z'],
    lines: ['M22 50 Q50 -2 78 50'],
    dots: [[50, 64]],
  },
  backpack: {
    body: ['M28 24 Q28 12 40 12 L60 12 Q72 12 72 24 L75 90 L25 90 Z'],
    lines: ['M34 58 L66 58 L66 84 L34 84 Z', 'M28 24 L72 24', 'M44 12 L44 6 L56 6 L56 12'],
  },
};

interface Props {
  garment: Garment;
  size: number;
}

function ArtInner({ garment, size }: Props) {
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9]/g, '');
  if (garment.image.type === 'photo') {
    return <Image source={{ uri: garment.image.uri }} style={{ width: size, height: size }} resizeMode="cover" />;
  }
  const shape = SHAPES[garment.kind];
  const base = garment.hex;
  const light = luminance(base) > 0.75;
  const edge = shade(base, light ? -0.22 : -0.35);
  const detail = shade(base, light ? -0.28 : luminance(base) < 0.2 ? 0.22 : -0.3);
  const accent = garment.accentHex ?? shade(base, -0.2);
  const isFootwear = garment.category === 'shoes';
  const patternColor = garment.pattern !== 'solid' ? garment.accentHex ?? '#ffffff' : undefined;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={shade(base, 0.12)} />
            <Stop offset="0.55" stopColor={base} />
            <Stop offset="1" stopColor={shade(base, -0.14)} />
          </LinearGradient>
          <ClipPath id={`c${id}`}>
            {shape.body.map((d, i) => (
              <Path key={i} d={d} />
            ))}
          </ClipPath>
        </Defs>
        {shape.body.map((d, i) => (
          <Path key={i} d={d} fill={`url(#g${id})`} stroke={edge} strokeWidth={0.9} strokeLinejoin="round" />
        ))}
        {patternColor && (
          <G clipPath={`url(#c${id})`} opacity={0.85}>
            {garment.pattern === 'stripe'
              ? Array.from({ length: 16 }, (_, i) => <Rect key={i} x={0} y={4 + i * 6} width={100} height={2.4} fill={patternColor} />)
              : Array.from({ length: 12 }, (_, i) => (
                  <G key={i}>
                    <Rect x={i * 9} y={0} width={2.6} height={100} fill={patternColor} opacity={0.7} />
                    <Rect x={0} y={i * 9} width={100} height={2.6} fill={patternColor} opacity={0.7} />
                  </G>
                ))}
          </G>
        )}
        {shape.accent?.map((d, i) => (
          <Path key={`a${i}`} d={d} fill={isFootwear ? accent : shade(base, -0.12)} stroke={edge} strokeWidth={0.8} strokeLinejoin="round" />
        ))}
        {shape.lines?.map((d, i) => (
          <Path key={`l${i}`} d={d} fill="none" stroke={detail} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        ))}
        {shape.dots?.map(([x, y], i) => (
          <Circle key={`d${i}`} cx={x} cy={y} r={1.3} fill={detail} />
        ))}
      </Svg>
    </View>
  );
}

export const GarmentArt = memo(ArtInner, (a, b) => a.garment === b.garment && a.size === b.size);
