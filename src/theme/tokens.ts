import { Platform } from 'react-native';

/**
 * iOS-aligned design tokens for ENH-KOGAS.
 *
 * Brand: refined ENH-KOGAS blue. Surfaces and grays follow iOS Human
 * Interface Guidelines (systemBackground, secondarySystemBackground,
 * tertiary fills, separators) so the app feels native on iOS while
 * remaining cross-platform.
 */

export const palette = {
  light: {
    // Surfaces — paleta institucional ENH-KOGAS (verde #28a745, grafite, dourado)
    background: '#F3F7F4', // grouped background
    surface: '#FFFFFF', // primary card surface
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#FAFDFB', // tertiary fill
    surfaceTinted: '#E9F4EC', // brand-tinted soft background

    // Separators / borders
    separator: '#E0EAE2',
    separatorStrong: '#CFE4D5',
    hairline: 'rgba(43,60,47,0.16)',

    // Text
    label: '#1C231E',
    labelSecondary: '#536458',
    labelTertiary: '#75857A',
    labelOnPrimary: '#FFFFFF',

    // Brand
    primary: '#1E7E34',
    primaryPressed: '#155D26',
    primarySoftBg: '#E9F4EC',
    primarySoftFg: '#1B5E2F',

    // Status
    success: '#1E7E34',
    successSoftBg: '#DFF4E8',
    error: '#B42318',
    errorSoftBg: '#FDECEA',
    warning: '#B54708',
    warningSoftBg: '#FFF0DD',

    // Charts — verde marca, verde claro, dourado institucional, grafite
    chartA: '#1E7E34',
    chartB: '#28A745',
    chartC: '#E0A100',
    chartD: '#536458',

    // Feedback / overlays
    scrim: 'rgba(13,27,42,0.48)',
    skeleton: '#E3EDE6',

    // Tab bar
    tabBg: 'rgba(255,255,255,0.92)',
    tabBorder: '#E0EAE2',
    tabActive: '#1E7E34',
    tabInactive: '#8FA096',
    tabPill: '#E9F4EC',
  },
  dark: {
    // Grafite institucional com acentos verdes — dark mode ENH-KOGAS
    background: '#12160F',
    surface: '#1C231E',
    surfaceElevated: '#242C26',
    surfaceMuted: '#181F1A',
    surfaceTinted: '#1D2B21',

    separator: '#2B352E',
    separatorStrong: '#3A463D',
    hairline: 'rgba(235,245,238,0.18)',

    label: '#EDF5EE',
    labelSecondary: '#B8C9BD',
    labelTertiary: '#8FA096',
    labelOnPrimary: '#0F1A12',

    primary: '#5ECB7D',
    primaryPressed: '#4CAF68',
    primarySoftBg: '#1C3324',
    primarySoftFg: '#9FDCB0',

    success: '#7BC794',
    successSoftBg: '#14291B',
    error: '#FF8A80',
    errorSoftBg: '#3A1C18',
    warning: '#F7C600',
    warningSoftBg: '#332B0A',

    chartA: '#5ECB7D',
    chartB: '#9FDCB0',
    chartC: '#F7C600',
    chartD: '#B8C9BD',

    scrim: 'rgba(0,0,0,0.55)',
    skeleton: '#242C26',

    tabBg: 'rgba(18,22,15,0.94)',
    tabBorder: '#2B352E',
    tabActive: '#9FDCB0',
    tabInactive: '#7D8F83',
    tabPill: '#1C3324',
  },
};

export type ThemeColors = typeof palette.light;

/** 4-pt grid spacing scale */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

/** Border radius scale — iOS leans on 10–20pt for grouped surfaces */
export const radii = {
  xs: 6,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 22,
  pill: 999,
};

/** iOS-style soft shadows. Use sparingly — over-shadowing breaks the look. */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  card: Platform.select({
    ios: {
      shadowColor: '#0B1730',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 2 },
    default: {},
  }) as object,
  cardStrong: Platform.select({
    ios: {
      shadowColor: '#0B1730',
      shadowOpacity: 0.12,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 6 },
    default: {},
  }) as object,
  floating: Platform.select({
    ios: {
      shadowColor: '#0B1730',
      shadowOpacity: 0.18,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 18 },
    },
    android: { elevation: 12 },
    default: {},
  }) as object,
};

/** Motion: durations + easing aligned with iOS feel */
export const motion = {
  durations: {
    quick: 160,
    base: 240,
    slow: 340,
    page: 420,
  },
  /** UIKit-ish easeInOut */
  easeInOut: { tension: 0, friction: 0 } as const,
  spring: {
    tight: { tension: 220, friction: 22, useNativeDriver: true },
    soft: { tension: 140, friction: 18, useNativeDriver: true },
    bouncy: { tension: 180, friction: 12, useNativeDriver: true },
  },
};

/** Typography ramp (Manrope is shipped with the app already). */
export const type = {
  largeTitle: { fontSize: 32, lineHeight: 40, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.4 },
  title1: { fontSize: 26, lineHeight: 33, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.3 },
  title2: { fontSize: 22, lineHeight: 28, fontFamily: 'Manrope_700Bold', letterSpacing: -0.2 },
  title3: { fontSize: 19, lineHeight: 25, fontFamily: 'Manrope_700Bold' },
  headline: { fontSize: 16, lineHeight: 22, fontFamily: 'Manrope_700Bold' },
  body: { fontSize: 15, lineHeight: 22, fontFamily: 'Manrope_500Medium' },
  callout: { fontSize: 14, lineHeight: 20, fontFamily: 'Manrope_600SemiBold' },
  subheadline: { fontSize: 13, lineHeight: 19, fontFamily: 'Manrope_600SemiBold' },
  footnote: { fontSize: 12, lineHeight: 18, fontFamily: 'Manrope_500Medium' },
  caption1: { fontSize: 11, lineHeight: 16, fontFamily: 'Manrope_600SemiBold' },
  caption2: { fontSize: 10, lineHeight: 14, fontFamily: 'Manrope_700Bold', letterSpacing: 0.4 },
  mono: { fontFamily: 'JetBrainsMono-Bold' },
} as const;

export const tokens = {
  palette,
  spacing,
  radii,
  shadows,
  motion,
  type,
};

export default tokens;
