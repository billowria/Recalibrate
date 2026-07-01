/**
 * Discipline OS — Premium Design System (Soft UI Edition)
 * 
 * Color palette built for a dual-theme Soft UI experience.
 * Features Neomorphic soft shadows, glassmorphism, glowing accents, 
 * and a cohesive brand identity.
 */

// ─── Brand Identity ──────────────────────────────────────────────────────────
export const BRAND = {
  // Core accent — electric indigo/blue gradient
  primary: '#5B5EFF',
  primaryLight: '#7C7FFF',
  primaryDark: '#3D40CC',
  primaryGlow: 'rgba(91, 94, 255, 0.35)',
  primaryGlowSoft: 'rgba(91, 94, 255, 0.15)',

  // Secondary accent — teal/cyan for highlights
  secondary: '#00D2FF',
  secondaryLight: '#4DE8FF',
  secondaryGlow: 'rgba(0, 210, 255, 0.25)',

  // Success — emerald
  success: '#00D68F',
  successLight: '#4DFFBE',
  successGlow: 'rgba(0, 214, 143, 0.25)',

  // Warning — amber
  warning: '#FFB700',
  warningLight: '#FFD166',
  warningGlow: 'rgba(255, 183, 0, 0.25)',

  // Danger/Reset — rose (intentionally not harsh red — compassionate)
  danger: '#FF6B6B',
  dangerLight: '#FF9999',
  dangerGlow: 'rgba(255, 107, 107, 0.25)',

  // Calm — slate blue (used in Reset Flow)
  calm: '#4A90E2',
  calmDark: '#2C5F8A',
  calmGlow: 'rgba(74, 144, 226, 0.25)',

  // XP / Gamification — gold
  xp: '#FFD700',
  xpGlow: 'rgba(255, 215, 0, 0.3)',
} as const;

// ─── Score Colors (non-punitive) ─────────────────────────────────────────────
export const SCORE_COLORS = {
  excellent: '#00D68F',    // 80-100: emerald
  good: '#4DE8FF',         // 60-79: cyan
  building: '#FFB700',     // 40-59: amber (neutral, not alarming)
  starting: '#8B8FA8',     // 0-39: muted (not red — this is the start, not a failure)
} as const;

// ─── Dark Mode Palette (Soft OLED-optimized) ────────────────────────────────
const dark = {
  // Base layers
  background: '#050508',       // Very deep charcoal/OLED base
  surface: '#0A0A12',          // Slightly lifted from black
  surfaceMid: '#12121E',       // Cards, modals
  surfaceHigh: '#1A1A2A',      // Elevated elements
  surfaceGlass: 'rgba(15, 15, 26, 0.80)', // Glassmorphism base

  // Text
  text: '#F0F0FF',
  textSecondary: '#A0A0CC',
  textMuted: '#606080',
  textDim: '#303050',
  foreground: '#F0F0FF',
  foregroundSecondary: '#A0A0CC',

  // Borders & dividers
  border: '#1C1C2E',
  borderSubtle: '#141420',
  borderFocus: BRAND.primary,
  borderGlass: 'rgba(255, 255, 255, 0.08)',

  // Interactive states
  pressed: 'rgba(91, 94, 255, 0.12)',
  hover: 'rgba(255, 255, 255, 0.04)',

  // Semantic colors
  tint: BRAND.primary,
  primary: BRAND.primary,
  primaryForeground: '#FFFFFF',
  secondary: '#1A1A2E',
  secondaryForeground: '#F0F0FF',
  accent: BRAND.primaryLight,
  accentForeground: '#FFFFFF',
  muted: '#131320',
  mutedForeground: BRAND.primary + 'AA',

  // Score colors
  scoreExcellent: SCORE_COLORS.excellent,
  scoreGood: SCORE_COLORS.good,
  scoreBuilding: SCORE_COLORS.building,
  scoreStarting: SCORE_COLORS.starting,

  // Legacy compatibility
  card: '#12121E',
  cardForeground: '#F0F0FF',
  destructive: BRAND.danger,
  destructiveForeground: '#FFFFFF',
  input: '#1C1C2E',

  // New additions
  scoreGreen: SCORE_COLORS.excellent,
  scoreYellow: SCORE_COLORS.building,
  scoreRed: BRAND.danger,
  surface2: '#12121E',
  surfaceSecondary: '#1A1A2A',
} as const;

// ─── Light Mode Palette (Soft UI Standard) ──────────────────────────────────
const light = {
  background: '#F8F9FA',      // Soft warm off-white
  surface: '#FFFFFF',         // Pure white cards
  surfaceMid: '#F0F2F5',      // Slightly inset areas (like inputs)
  surfaceHigh: '#E9ECEF',     // Hover/Active states
  surfaceGlass: 'rgba(255, 255, 255, 0.85)',

  text: '#252F40',            // Deep slate for readability (not harsh black)
  textSecondary: '#67748E',   // Muted slate
  textMuted: '#8392AB',       // Gray
  textDim: '#CBD5E1',         // Very dim
  foreground: '#252F40',
  foregroundSecondary: '#67748E',

  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderFocus: BRAND.primary,
  borderGlass: 'rgba(91, 94, 255, 0.12)',

  pressed: 'rgba(91, 94, 255, 0.08)',
  hover: 'rgba(0, 0, 0, 0.02)',

  tint: BRAND.primary,
  primary: BRAND.primary,
  primaryForeground: '#FFFFFF',
  secondary: '#E9ECEF',
  secondaryForeground: '#252F40',
  accent: BRAND.primaryDark,
  accentForeground: '#FFFFFF',
  muted: '#F0F2F5',
  mutedForeground: '#8392AB',

  scoreExcellent: SCORE_COLORS.excellent,
  scoreGood: '#00D2FF',
  scoreBuilding: '#FFB700',
  scoreStarting: '#8392AB',

  card: '#FFFFFF',
  cardForeground: '#252F40',
  destructive: BRAND.danger,
  destructiveForeground: '#FFFFFF',
  input: '#FFFFFF',

  scoreGreen: SCORE_COLORS.excellent,
  scoreYellow: '#FFB700',
  scoreRed: BRAND.danger,
  surface2: '#F8F9FA',
  surfaceSecondary: '#F0F2F5',
} as const;

// ─── Gradients ────────────────────────────────────────────────────────────────
export const GRADIENTS = {
  // Primary brand gradient
  primary: ['#5B5EFF', '#7C7FFF', '#00D2FF'] as [string, string, ...string[]],
  primaryShort: ['#5B5EFF', '#7C7FFF'] as [string, string, ...string[]],
  
  // Soft UI colorful accents
  softPink: ['#FF0080', '#7928CA'] as [string, string, ...string[]],
  softBlue: ['#21D4FD', '#2152FF'] as [string, string, ...string[]],
  softGreen: ['#98EC2D', '#17AD37'] as [string, string, ...string[]],
  softWarning: ['#FBCF33', '#F53939'] as [string, string, ...string[]],

  // Score ring gradients
  scoreExcellent: ['#00D68F', '#4DE8FF'] as [string, string, ...string[]],
  scoreGood: ['#4DE8FF', '#5B5EFF'] as [string, string, ...string[]],
  scoreBuilding: ['#FFB700', '#FF8C42'] as [string, string, ...string[]],
  scoreStarting: ['#6B7280', '#4B5563'] as [string, string, ...string[]],

  // Background hero gradients
  heroTop: ['rgba(91, 94, 255, 0.15)', 'transparent'] as [string, string, ...string[]],
  heroBottom: ['transparent', 'rgba(0, 210, 255, 0.06)'] as [string, string, ...string[]],

  // Reset Flow (calm, compassionate)
  calm: ['#0F1E35', '#0A1525'] as [string, string, ...string[]],
  calmAccent: ['#4A90E2', '#2C5F8A'] as [string, string, ...string[]],

  // Pomodoro ambient
  focus: ['#0A0A20', '#050520'] as [string, string, ...string[]],
  focusPulse: ['rgba(91, 94, 255, 0.3)', 'rgba(0, 210, 255, 0.1)', 'rgba(91, 94, 255, 0.05)'] as [string, string, ...string[]],

  // Card glass
  glassLight: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)'] as [string, string, ...string[]],
  glassDark: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)'] as [string, string, ...string[]],
} as const;

// ─── Shadows & Glows ─────────────────────────────────────────────────────────
export const SHADOWS = {
  // Soft UI Primary Drop Shadow
  softLight: {
    shadowColor: '#8392AB', // Slate gray shadow
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  softDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  
  // Legacy shadows updated for better softness
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cardLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  primaryGlow: {
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  successGlow: {
    shadowColor: BRAND.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  tab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 16,
  },
} as const;

// ─── Spacing & Sizing ─────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screen: 20, // Standard horizontal padding
} as const;

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
  card: 20, // Increased for softer UI
  button: 16, // Soft UI pill-like buttons
  input: 12,
} as const;

// ─── Typography Scale ─────────────────────────────────────────────────────────
export const FONT = {
  family: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  size: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    hero: 48,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

// ─── Animation Timings ────────────────────────────────────────────────────────
export const ANIM = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: { friction: 7, tension: 60 },
  springSnappy: { friction: 8, tension: 100 },
} as const;

// ─── Default export (backward-compatible) ─────────────────────────────────────
const colors = {
  light,
  dark,
  radius: RADIUS.md,
};

export default colors;
