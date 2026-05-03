import { Platform } from 'react-native';

export const color = {
  primary: '#69A4EC',
  verificationBlue: '#0D99FF',
  primaryPressed: '#4F8FDC',
  primarySoft: '#EEF5FF',
  accentYellow: '#FCC03B',
  brandYellow: '#F2E640',
  success: '#7BBE7A',
  successSoft: '#EEF8EE',
  warning: '#B7791F',
  warningSoft: '#FFF7E6',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  text: '#111111',
  textSecondary: 'rgba(60, 60, 67, 0.6)',
  textMuted: '#46576C',
  textSubtle: '#738293',
  border: '#E5E7EB',
  background: '#FFFFFF',
  screenBackground: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F6FA',
  verificationCard: '#F5F5EF',
  white: '#FFFFFF',
} as const;

export const space = {
  '2xs': 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  screenTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 24,
    lineHeight: 30,
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  bodyMedium: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  captionMedium: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
} as const;

export const shadow = {
  none: {},
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  floatingAction: {
    shadowColor: '#1D4F91',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
} as const;

export const theme = {
  color,
  space,
  radius,
  typography,
  shadow,
} as const;

export const Colors = {
  light: {
    text: color.text,
    background: color.background,
    screenBackground: color.screenBackground,
    tint: color.primary,
    icon: color.textSubtle,
    tabIconDefault: color.textSubtle,
    tabIconSelected: color.primary,
    border: color.border,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    screenBackground: '#101214',
    tint: color.primary,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: color.primary,
    border: '#2A2F35',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
