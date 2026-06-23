/**
 * AmbiEye Design System Colors
 * A modern, medical-grade color palette
 */

// Brand Colors
export const BRAND = {
  primary: '#1A0A5E',       // Deep navy purple
  primaryLight: '#2D1B8E',  // Lighter navy
  primaryDark: '#0D0145',   // Darkest navy
  accent: '#E8447A',        // Vibrant coral pink
  accentLight: '#FF6B9D',   // Light coral
  accentDark: '#C0305E',    // Dark coral
  secondary: '#7C3AED',     // Purple
  secondaryLight: '#A78BFA', // Light purple
};

// Semantic Colors
export const SEMANTIC = {
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
};

// Neutral Colors
export const NEUTRAL = {
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  black: '#000000',
};

const tintColorLight = BRAND.accent;
const tintColorDark = BRAND.accentLight;

export const Colors = {
  light: {
    text: NEUTRAL.gray900,
    background: NEUTRAL.gray50,
    tint: tintColorLight,
    icon: NEUTRAL.gray500,
    tabIconDefault: NEUTRAL.gray400,
    tabIconSelected: tintColorLight,
    card: NEUTRAL.white,
    border: NEUTRAL.gray200,
    primary: BRAND.primary,
    accent: BRAND.accent,
  },
  dark: {
    text: NEUTRAL.gray50,
    background: BRAND.primaryDark,
    tint: tintColorDark,
    icon: NEUTRAL.gray400,
    tabIconDefault: NEUTRAL.gray500,
    tabIconSelected: tintColorDark,
    card: BRAND.primaryLight,
    border: BRAND.primary,
    primary: BRAND.primaryLight,
    accent: BRAND.accentLight,
  },
};
