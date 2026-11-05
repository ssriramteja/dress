import { Platform, TextStyle } from 'react-native';

export const color = {
  ink: '#0B0B0B',
  black: '#000000',
  paper: '#F3F1EC',
  tile: '#FBFAF7',
  hairline: '#E2DED6',
  muted: '#77746E',
  onBlack: '#FFFFFF',
  onBlackMuted: '#8C8C8C',
  onBlackFaint: '#4A4A4A',
  lineDark: '#232323',
  surfaceDark: '#111111',
  bubbleDark: '#1D1D1D',
  red: '#D6331F',
};

export const font = Platform.select({
  ios: 'Helvetica Neue',
  web: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  default: 'sans-serif',
}) as string;

const base: TextStyle = { fontFamily: font };

export const type = {
  display: { ...base, fontSize: 28, lineHeight: 32, fontWeight: '500', letterSpacing: -1.1 } as TextStyle,
  title: { ...base, fontSize: 20, lineHeight: 24, fontWeight: '500', letterSpacing: -0.6 } as TextStyle,
  body: { ...base, fontSize: 15, lineHeight: 21, fontWeight: '400', letterSpacing: -0.15 } as TextStyle,
  label: { ...base, fontSize: 13, lineHeight: 17, fontWeight: '500', letterSpacing: -0.1 } as TextStyle,
  small: { ...base, fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 } as TextStyle,
  micro: { ...base, fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: 0.1 } as TextStyle,
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Minimum comfortable touch target. */
export const touch = 44;
