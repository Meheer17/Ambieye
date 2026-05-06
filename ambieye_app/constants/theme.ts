// New Modern Theme for AmbiEye
export const Colors = {
  // Primary Colors - Fresh Blue & Teal
  primary: '#0EA5E9',      // Sky Blue
  primaryDark: '#0284C7',  // Darker Sky Blue
  primaryLight: '#7DD3FC', // Light Sky Blue
  
  // Secondary Colors - Vibrant Purple
  secondary: '#8B5CF6',    // Purple
  secondaryDark: '#7C3AED', // Darker Purple
  secondaryLight: '#C4B5FD', // Light Purple
  
  // Accent Colors
  accent: '#10B981',       // Emerald Green
  accentDark: '#059669',   // Darker Emerald
  accentLight: '#6EE7B7',  // Light Emerald
  
  // Neutral Colors
  background: '#F8FAFC',   // Very Light Gray
  surface: '#FFFFFF',      // White
  card: '#FFFFFF',         // White
  
  // Text Colors
  text: '#0F172A',         // Slate 900
  textSecondary: '#64748B', // Slate 500
  textLight: '#94A3B8',    // Slate 400
  
  // Status Colors
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red
  info: '#3B82F6',         // Blue
  
  // UI Elements
  border: '#E2E8F0',       // Slate 200
  divider: '#F1F5F9',      // Slate 100
  shadow: '#0F172A',       // Slate 900
  
  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
  
  // Game Colors
  gameRed: '#EF4444',
  gameBlue: '#3B82F6',
  gameGreen: '#10B981',
  gameYellow: '#F59E0B',
  gamePurple: '#8B5CF6',
  gameOrange: '#F97316',
  gamePink: '#EC4899',
  gameTeal: '#14B8A6',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  huge: 32,
};

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};
