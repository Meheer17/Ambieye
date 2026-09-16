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

// Warm Dementia Palette for Calm, Trustworthy, Human Caregiver Experience
export const WarmPalette = {
  ivory: '#FDFBF7',         // Warm Ivory background
  cream: '#FFFDF9',         // Pure Warm Cream surface
  sand: '#F7F4EF',          // Light Sand for secondary cards
  sandLight: '#FAF7F2',     // Very light sand
  sandDark: '#EAE4DC',      // Sand border / divider
  peach: '#F9DDD2',         // Muted Peach accent
  peachMuted: '#FDF0EA',    // Soft Peach tint
  peachDeep: '#D97757',     // Peach contrast for text/badges
  roseDusty: '#C2747C',     // Dusty Rose primary accent
  roseSoft: '#F6E6E8',      // Soft Rose tint
  roseDeep: '#8E3E47',      // Deep Rose for important actions
  lavenderWarm: '#A897B5',  // Warm Lavender
  lavenderSoft: '#F3EEF6',  // Soft Lavender tint
  sageWarm: '#7C8E77',      // Warm Sage for positive/completed
  sageSoft: '#EEF2EC',      // Soft Sage tint
  charcoalWarm: '#282524',  // Warm Charcoal headline text
  charcoalMuted: '#5C5652', // Warm Charcoal body text
  charcoalLight: '#8C857F', // Warm Charcoal caption text
  borderWarm: '#E7E0D8',    // Warm hairline borders
  borderSubtle: '#F0EBE3',  // Ultra-subtle border
};

// Aesthetic Pastel Palette for Human, Pleasant, Lavender & Baby Pink UI
export const PastelPalette = {
  lavenderLight: '#FAF5FF',   // Softest Lavender background
  lavenderBase: '#F3E8FF',    // Lavender tint
  lavenderBorder: '#E9D5FF',  // Lavender border
  lavenderAccent: '#9333EA',  // Lavender text / icon
  lavenderDeep: '#6B21A8',    // Deep Lavender
  
  pinkLight: '#FDF2F8',       // Softest Baby Pink background
  pinkBase: '#FCE7F3',        // Baby Pink tint
  pinkBorder: '#FBCFE8',      // Baby Pink border
  pinkAccent: '#EC4899',      // Baby Pink accent
  pinkDeep: '#BE185D',        // Deep Rose / Raspberry

  roseLight: '#FFF1F2',       // Soft Rose background
  roseBase: '#FFE4E6',        // Rose blush
  roseBorder: '#FECDD3',      // Rose border
  roseAccent: '#F43F5E',      // Rose accent

  peachLight: '#FFF7ED',      // Peach cream
  peachBase: '#FFEDD5',       // Peach soft
  peachBorder: '#FED7AA',     // Peach border
  peachAccent: '#EA580C',     // Peach accent

  skyLight: '#F0F9FF',        // Sky mist
  skyBase: '#E0F2FE',         // Sky tint
  skyBorder: '#BAE6FD',       // Sky border
  skyAccent: '#0284C7',       // Sky accent

  mintLight: '#F0FDF4',       // Mint cream
  mintBase: '#DCFCE7',        // Mint tint
  mintBorder: '#BBF7D0',      // Mint border
  mintAccent: '#16A34A',      // Mint accent

  // Semantic aliases for high clarity & convenience
  lavenderPrimary: '#9333EA', // Primary Lavender
  lavenderSoft: '#F3E8FF',    // Soft Lavender
  pinkPrimary: '#EC4899',     // Primary Baby Pink
  pinkSoft: '#FCE7F3',        // Soft Baby Pink
  rosePrimary: '#BE185D',     // Primary Rose / Raspberry
  roseDusty: '#C2747C',       // Dusty Warm Rose
  mintPrimary: '#059669',     // Primary Mint / Sage
  mintSoft: '#DCFCE7',        // Soft Mint
  peachPrimary: '#EA580C',    // Primary Warm Peach
  peachSoft: '#FFEDD5',       // Soft Peach

  ivoryGlow: '#FFFDF9',       // Glowing ivory
  creamSurface: '#FCF9F5',    // Cream card surface
  darkNavy: '#1E1B4B',        // Midnight indigo for titles
  slateText: '#475569',       // Subtle slate body text
  mutedText: '#94A3B8',       // Muted caption text
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
