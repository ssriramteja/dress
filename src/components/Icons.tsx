import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { size?: number; color: string; strokeWidth?: number };

const S = ({ size = 22, children }: { size?: number; children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {children}
  </Svg>
);

export const IconCloset = ({ size, color, strokeWidth = 1.5 }: P) => (
  <S size={size}>
    <Path d="M12 6.2a1.9 1.9 0 1 1 1.9 1.9c-.9 0-1.9.6-1.9 1.6v.6m0 0 8.6 6.1c.8.6.4 1.8-.6 1.8H4c-1 0-1.4-1.2-.6-1.8L12 10.3Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </S>
);

export const IconStylist = ({ size, color, strokeWidth = 1.5 }: P) => (
  <S size={size}>
    <Path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16h-6.5L6 19.5V16H7a2.5 2.5 0 0 1-2.5-2.5v-7Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
  </S>
);

export const IconYou = ({ size, color, strokeWidth = 1.5 }: P) => (
  <S size={size}>
    <Circle cx={12} cy={8.5} r={3.5} stroke={color} strokeWidth={strokeWidth} />
    <Path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </S>
);

export const IconGrid = ({ size, color, strokeWidth = 1.5 }: P) => (
  <S size={size}>
    <Rect x={4} y={4} width={6.5} height={6.5} stroke={color} strokeWidth={strokeWidth} />
    <Rect x={13.5} y={4} width={6.5} height={6.5} stroke={color} strokeWidth={strokeWidth} />
    <Rect x={4} y={13.5} width={6.5} height={6.5} stroke={color} strokeWidth={strokeWidth} />
    <Rect x={13.5} y={13.5} width={6.5} height={6.5} stroke={color} strokeWidth={strokeWidth} />
  </S>
);

export const IconPile = ({ size, color, strokeWidth = 1.5 }: P) => (
  <S size={size}>
    <Rect x={4} y={10} width={8} height={8} transform="rotate(-14 8 14)" stroke={color} strokeWidth={strokeWidth} />
    <Rect x={11} y={8} width={8} height={8} transform="rotate(12 15 12)" stroke={color} strokeWidth={strokeWidth} />
    <Rect x={7} y={4} width={7} height={7} transform="rotate(4 10.5 7.5)" stroke={color} strokeWidth={strokeWidth} />
  </S>
);

export const IconMic = ({ size, color, strokeWidth = 1.5 }: P) => (
  <S size={size}>
    <Rect x={9} y={3.5} width={6} height={11} rx={3} stroke={color} strokeWidth={strokeWidth} />
    <Path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </S>
);

export const IconSend = ({ size, color, strokeWidth = 1.8 }: P) => (
  <S size={size}>
    <Path d="M12 19V5m0 0-6 6m6-6 6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </S>
);

export const IconClose = ({ size, color, strokeWidth = 1.6 }: P) => (
  <S size={size}>
    <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </S>
);

export const IconBack = ({ size, color, strokeWidth = 1.6 }: P) => (
  <S size={size}>
    <Path d="M14.5 5.5 8 12l6.5 6.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </S>
);

export const IconSave = ({ size, color, strokeWidth = 1.5, filled }: P & { filled?: boolean }) => (
  <S size={size}>
    <Path d="M7 4h10v16l-5-3.5L7 20V4Z" stroke={color} fill={filled ? color : 'none'} strokeWidth={strokeWidth} strokeLinejoin="round" />
  </S>
);

export const IconShuffle = ({ size, color, strokeWidth = 1.5 }: P) => (
  <S size={size}>
    <Path d="M4 7h3.5c3.5 0 5.5 10 9 10H20m0 0-2.5-2.5M20 17l-2.5 2.5M4 17h3.5c1.3 0 2.4-1.3 3.3-3m2.4-4c.9-1.7 2-3 3.3-3H20m0 0-2.5-2.5M20 7l-2.5 2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </S>
);

export const IconDislike = ({ size, color, strokeWidth = 1.5 }: P) => (
  <S size={size}>
    <Path d="M9.5 14.5H5.6a1.6 1.6 0 0 1-1.6-1.9l1.2-6A2 2 0 0 1 7.1 5H14v9l-3 5.5c-1 0-1.7-.9-1.5-1.9l.5-3.1h-.5ZM14 5h3.5v9H14" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
  </S>
);

export const IconCheck = ({ size, color, strokeWidth = 1.7 }: P) => (
  <S size={size}>
    <Path d="m5 12.5 4.5 4.5L19 7.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </S>
);
