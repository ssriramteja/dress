import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { color, touch, type } from '../theme/tokens';

export function Wordmark({ tone = 'dark', size = 17 }: { tone?: 'dark' | 'light'; size?: number }) {
  return (
    <Text
      accessibilityRole="header"
      style={[type.title, { fontSize: size, lineHeight: size * 1.15, fontWeight: '700', letterSpacing: -size * 0.07, color: tone === 'dark' ? color.ink : color.onBlack }]}
    >
      sriram teja
    </Text>
  );
}

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
  tone?: 'onPaper' | 'onBlack';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** Sharp-edged commerce button. */
export function Button({ label, onPress, variant = 'solid', tone = 'onPaper', disabled, loading, style, accessibilityHint }: ButtonProps) {
  const fg = tone === 'onPaper' ? color.ink : color.onBlack;
  const bg = tone === 'onPaper' ? color.ink : color.onBlack;
  const solid = variant === 'solid';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        solid && { backgroundColor: bg },
        variant === 'outline' && { borderWidth: 1, borderColor: fg },
        (pressed || disabled) && { opacity: disabled ? 0.35 : 0.75 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={solid ? (tone === 'onPaper' ? color.onBlack : color.ink) : fg} />
      ) : (
        <Text style={[type.label, { fontSize: 14, color: solid ? (tone === 'onPaper' ? color.onBlack : color.ink) : fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function ProgressBar({ value, tone = 'onBlack' }: { value: number; tone?: 'onBlack' | 'onPaper' }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height: 2, backgroundColor: tone === 'onBlack' ? color.lineDark : color.hairline, width: '100%' }}
    >
      <View style={{ height: 2, width: `${pct * 100}%`, backgroundColor: tone === 'onBlack' ? color.onBlack : color.ink }} />
    </View>
  );
}

export function TextLink({ label, onPress, style, textStyle }: { label: string; onPress: () => void; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={10} onPress={onPress} style={({ pressed }) => [{ minHeight: touch, justifyContent: 'center', opacity: pressed ? 0.6 : 1 }, style]}>
      <Text style={[type.label, textStyle]}>{label}</Text>
    </Pressable>
  );
}

/** Rounded suggestion chip. Chat surfaces only. */
export function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && { backgroundColor: '#2A2A2A' }]}
    >
      <Text style={[type.label, { color: color.onBlack }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StateMessage({ title, body, tone = 'onPaper', action }: { title: string; body?: string; tone?: 'onPaper' | 'onBlack'; action?: React.ReactNode }) {
  const fg = tone === 'onPaper' ? color.ink : color.onBlack;
  const mu = tone === 'onPaper' ? color.muted : color.onBlackMuted;
  return (
    <View style={{ padding: 24, gap: 8, alignItems: 'flex-start' }}>
      <Text style={[type.title, { color: fg }]}>{title}</Text>
      {body ? <Text style={[type.body, { color: mu }]}>{body}</Text> : null}
      {action ? <View style={{ marginTop: 12, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 50, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: color.bubbleDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
    justifyContent: 'center',
  },
});
