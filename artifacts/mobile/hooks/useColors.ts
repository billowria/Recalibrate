import { useColorScheme } from 'react-native';
import colors, { BRAND, GRADIENTS, SHADOWS, SPACING, RADIUS, FONT, ANIM, SCORE_COLORS } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

/**
 * useColors — Full Discipline OS Theme Hook
 *
 * Returns the full design token set for the current color scheme,
 * including palette colors, brand constants, gradients, shadows,
 * spacing, typography, and animation configs.
 */
export function useColors() {
  const systemScheme = useColorScheme();
  
  let themeMode: 'system' | 'light' | 'dark' = 'system';
  try {
    const app = useApp();
    themeMode = app.themeMode || 'system';
  } catch (e) {
    // Fail silently if used outside of AppProvider context
  }

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  return {
    ...palette,
    radius: colors.radius,
    isDark,
    scheme: isDark ? 'dark' as const : 'light' as const,
    themeMode,

    // Extended design tokens
    brand: BRAND,
    gradients: GRADIENTS,
    shadows: SHADOWS,
    spacing: SPACING,
    radius2: RADIUS,
    font: FONT,
    anim: ANIM,
    scoreColors: SCORE_COLORS,

    // Convenience score color function
    getScoreColor: (score: number): string => {
      if (score >= 80) return SCORE_COLORS.excellent;
      if (score >= 60) return SCORE_COLORS.good;
      if (score >= 40) return SCORE_COLORS.building;
      return SCORE_COLORS.starting;
    },

    getScoreGradient: (score: number): string[] => {
      if (score >= 80) return GRADIENTS.scoreExcellent;
      if (score >= 60) return GRADIENTS.scoreGood;
      if (score >= 40) return GRADIENTS.scoreBuilding;
      return GRADIENTS.scoreStarting;
    },
  };
}

export type AppColors = ReturnType<typeof useColors>;

