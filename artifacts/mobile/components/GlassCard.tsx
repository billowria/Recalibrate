import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'glass' | 'soft'; // New Soft UI variant
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderColor?: string;
  glowColor?: string;
  elevated?: boolean;
}

/**
 * GlassCard — Premium dual-mode card component.
 * 
 * Variants:
 * - 'glass': Uses expo-blur (iOS) or transparency (Android) for a frosted glass look.
 * - 'soft': Solid color with soft Neomorphic drop shadow based on the current theme.
 */
export function GlassCard({
  children,
  style,
  variant = 'glass',
  intensity = 40,
  tint,
  borderColor,
  glowColor,
  elevated = true,
}: GlassCardProps) {
  const colors = useColors();
  const isIOS = Platform.OS === 'ios';

  const isSoft = variant === 'soft';
  const defaultTint = colors.isDark ? 'dark' : 'light';
  const activeTint = tint || defaultTint;
  
  // Soft UI Shadows
  const softShadow = colors.isDark ? colors.shadows.softDark : colors.shadows.softLight;
  
  const containerStyle: ViewStyle = {
    borderRadius: colors.radius2.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glowColor 
      ? `${glowColor}50` 
      : (borderColor || (isSoft ? colors.border : colors.borderGlass)),
      
    // Apply shadows if elevated (and apply Soft UI shadow if it's the soft variant)
    ...(elevated
      ? (isSoft 
          ? softShadow 
          : {
              shadowColor: glowColor || (colors.isDark ? '#000' : '#8392AB'),
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: glowColor ? 0.35 : 0.15,
              shadowRadius: 20,
              elevation: 10,
            })
      : {}),
      
    // Solid background for soft variant
    ...(isSoft && { backgroundColor: colors.surface }),
  };

  const innerStyle: ViewStyle = {
    padding: 0,
    position: 'relative',
    overflow: 'hidden',
  };

  // ─── SOFT VARIANT (Solid Background) ────────────────────────────────────────
  if (isSoft) {
    return (
      <View style={[containerStyle, style]}>
        <View style={innerStyle}>{children}</View>
      </View>
    );
  }

  // ─── GLASS VARIANT (Frosted) ────────────────────────────────────────────────
  if (isIOS) {
    return (
      <View style={[containerStyle, style]}>
        <BlurView
          intensity={intensity}
          tint={activeTint}
          style={[StyleSheet.absoluteFill]}
        />
        {/* Top highlight (glass refraction) */}
        <View style={styles.highlight} />
        <View style={innerStyle}>{children}</View>
      </View>
    );
  }

  // Android/Web glass fallback
  return (
    <View
      style={[
        containerStyle,
        {
          backgroundColor:
            activeTint === 'dark'
              ? 'rgba(10, 10, 20, 0.85)'
              : 'rgba(255, 255, 255, 0.70)', // Light mode fallback
        },
        style,
      ]}
    >
      <View style={styles.highlight} />
      {children}
    </View>
  );
}

// Keeping SolidCard for backwards compatibility, but it just wraps GlassCard now
interface SolidCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  color?: string;
}

export function SolidCard({ children, style, color }: SolidCardProps) {
  return (
    <GlassCard variant="soft" style={StyleSheet.flatten([{ backgroundColor: color }, style])}>
      {children}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    zIndex: 1,
  },
});
