import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { color, touch, type } from '../theme/tokens';

/** Monoline lowercase "crest", drawn as strokes. viewBox 0 0 200 100. */
const LETTERS: string[][] = [
  ['M47 47 A20 20 0 1 0 47 73'], // c
  ['M58 40 L58 80', 'M58 55 Q61 41 76 41'], // r
  ['M80 60 L118 60 A19 19 0 1 0 113 73'], // e
  ['M148 45 Q143 40 137 40 Q127 40 127 50 Q127 57 138 60 Q150 62 150 70 Q150 80 138 80 Q130 80 125 74'], // s
  ['M164 26 L164 71 Q164 80 173 80 L179 80', 'M155 42 L179 42'], // t
];
const MUTED = ['#A7B39D', '#C9A58D', '#9EAFC2', '#CDBE9A', '#B9A2B3'];
const DASH = 160;

const T = { stagger: 140, draw: 720, inkStart: 1350, inkEnd: 1950, curtainStart: 2250, curtainEnd: 2850, done: 2900 };

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));

export function Intro({ reduced, onDone }: { reduced: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [t, setT] = useState(reduced ? T.inkEnd : 0);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    if (reduced) {
      const id = setTimeout(finish, 900);
      return () => clearTimeout(id);
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const e = Date.now() - start;
      setT(e);
      if (e >= T.done) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const ink = ease((t - T.inkStart) / (T.inkEnd - T.inkStart));
  const curtain = reduced ? 0 : ease((t - T.curtainStart) / (T.curtainEnd - T.curtainStart));
  const w = Math.min(width * 0.62, 320);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: color.paper, alignItems: 'center', justifyContent: 'center' }]} accessibilityLabel="crest">
      <Svg width={w} height={w * 0.4} viewBox="0 15 186 74">
        {LETTERS.map((paths, i) =>
          paths.map((d, k) => {
            const p = ease((t - i * T.stagger - k * 120) / T.draw);
            return (
              <Path
                key={`m${i}${k}`}
                d={d}
                fill="none"
                stroke={MUTED[i]}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${DASH} ${DASH}`}
                strokeDashoffset={DASH * (1 - p)}
                opacity={1 - ink * 0.9}
              />
            );
          }),
        )}
        {ink > 0 &&
          LETTERS.flat().map((d, i) => (
            <Path key={`i${i}`} d={d} fill="none" stroke={color.ink} strokeWidth={3 + ink * 6.5} strokeLinecap="round" strokeLinejoin="round" opacity={ink} />
          ))}
      </Svg>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * curtain, backgroundColor: color.black }}
      />
      <Pressable accessibilityRole="button" onPress={finish} style={styles.skip} hitSlop={12}>
        <Text style={[type.label, { color: curtain > 0.9 ? color.onBlackMuted : color.muted }]}>skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  skip: { position: 'absolute', top: 56, right: 20, minHeight: touch, minWidth: touch, alignItems: 'flex-end', justifyContent: 'center' },
});
