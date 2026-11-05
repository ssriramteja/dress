import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Calls `onShake` on a firm shake. No-op where there is no accelerometer. */
export function useShake(onShake: () => void, enabled: boolean) {
  const cb = useRef(onShake);
  cb.current = onShake;
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let sub: { remove: () => void } | undefined;
    let last = 0;
    let hits: number[] = [];
    let alive = true;
    Accelerometer.isAvailableAsync()
      .then((ok) => {
        if (!alive || !ok) return;
        setAvailable(true);
        Accelerometer.setUpdateInterval(80);
        sub = Accelerometer.addListener(({ x, y, z }) => {
          const g = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();
          if (g > 2.1) {
            hits = [...hits.filter((t) => now - t < 700), now];
            if (hits.length >= 2 && now - last > 1200) {
              last = now;
              hits = [];
              cb.current();
            }
          }
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [enabled]);
  return available;
}
