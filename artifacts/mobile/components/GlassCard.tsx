import React from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';
import { BRAND, RADIUS } from '@/constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderColor?: string;
  glowColor?: string;
  elevated?: boolean;
  animated?: boolean;
}

/**
 * GlassCard — Premium glassmorphism card component.
 * 
 * On iOS: Uses expo-blur for true backdrop blur.
 * On Android/Web: Simulates glass with semi-transparent background.
 *
 * Features:
 * - Configurable blur intensity and tint
 * - Optional colored glow border
 * - Optional elevation shadow
 * - Subtle inner highlight at top edge (glass refraction effect)
 */
export function GlassCard({
  children,
  style,
  intensity = 40,
  tint = 'dark',
  borderColor = 'rgba(255,255,255,0.08)',
  glowColor,
  elevated = false,
}: GlassCardProps) {
  const isIOS = Platform.OS === 'ios';

  const containerStyle: ViewStyle = {
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glowColor
      ? `${glowColor}50`
      : borderColor,
    ...(elevated
      ? {
          shadowColor: glowColor || '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: glowColor ? 0.35 : 0.25,
          shadowRadius: 20,
          elevation: 10,
        }
      : {}),
  };

  const innerStyle: ViewStyle = {
    padding: 0,
    position: 'relative',
    overflow: 'hidden',
  };

  if (isIOS) {
    return (
      <View style={[containerStyle, style]}>
        <BlurView
          intensity={intensity}
          tint={tint}
          style={[StyleSheet.absoluteFill]}
        />
        {/* Top highlight (glass refraction) */}
        <View style={styles.highlight} />
        <View style={innerStyle}>{children}</View>
      </View>
    );
  }

  // Android/Web fallback
  return (
    <View
      style={[
        containerStyle,
        {
          backgroundColor:
            tint === 'dark'
              ? 'rgba(10, 10, 20, 0.85)'
              : 'rgba(255, 255, 255, 0.12)',
        },
        style,
      ]}
    >
      {/* Top highlight */}
      <View style={styles.highlight} />
      {children}
    </View>
  );
}

// Simpler card for basic usage (no blur)
interface SolidCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  color?: string;
}

export function SolidCard({ children, style, color = '#0F0F1A' }: SolidCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: color,
          borderRadius: RADIUS.card,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
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
