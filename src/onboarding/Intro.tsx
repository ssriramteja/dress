import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { color, font, touch, type } from '../theme/tokens';

const WORD = 'sriram teja';
/** long enough to cover each glyph outline, so every letter draws fully */
const DASH = 220;
const T = { draw: 1300, inkStart: 1250, inkEnd: 1900, curtainStart: 2250, curtainEnd: 2850, done: 2900 };

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));

/**
 * Coded intro: the wordmark's outlines are drawn as muted strokes, flooded
 * with black ink, then a black curtain rises into the splash.
 */
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

  const draw = ease(t / T.draw);
  const ink = ease((t - T.inkStart) / (T.inkEnd - T.inkStart));
  const curtain = reduced ? 0 : ease((t - T.curtainStart) / (T.curtainEnd - T.curtainStart));
  const w = Math.min(width * 0.8, 380);
  const fs = 56;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: color.paper, alignItems: 'center', justifyContent: 'center' }]} accessibilityLabel="sriram teja">
      <Svg width={w} height={w * 0.3} viewBox="0 0 300 90">
        <Defs>
          <LinearGradient id="introMuted" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#A7B39D" />
            <Stop offset="0.3" stopColor="#C9A58D" />
            <Stop offset="0.55" stopColor="#9EAFC2" />
            <Stop offset="0.8" stopColor="#CDBE9A" />
            <Stop offset="1" stopColor="#B9A2B3" />
          </LinearGradient>
        </Defs>
        <SvgText
          x="150"
          y="60"
          textAnchor="middle"
          fontFamily={font}
          fontWeight="700"
          fontSize={fs}
          letterSpacing={-fs * 0.07}
          fill={color.ink}
          fillOpacity={ink}
          stroke={ink > 0.6 ? color.ink : 'url(#introMuted)'}
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeDasharray={`${DASH} ${DASH}`}
          strokeDashoffset={DASH * (1 - draw)}
        >
          {WORD}
        </SvgText>
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * curtain, backgroundColor: color.black }} />
      <Pressable accessibilityRole="button" onPress={finish} style={styles.skip} hitSlop={12}>
        <Text style={[type.label, { color: curtain > 0.9 ? color.onBlackMuted : color.muted }]}>skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  skip: { position: 'absolute', top: 56, right: 20, minHeight: touch, minWidth: touch, alignItems: 'flex-end', justifyContent: 'center' },
});
