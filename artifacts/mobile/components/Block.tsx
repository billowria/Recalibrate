import React from 'react';
import { View, StyleSheet, ViewStyle, SafeAreaView, ScrollView, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';

export interface BlockProps {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  flex?: number | boolean;
  row?: boolean;
  justify?: 'center' | 'flex-start' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  align?: 'center' | 'flex-start' | 'flex-end' | 'stretch' | 'baseline';
  center?: boolean;
  padding?: number;
  margin?: number;
  radius?: number;
  
  // Visuals
  color?: string;
  gradient?: readonly [string, string, ...string[]];
  shadow?: boolean;
  softShadow?: boolean;
  card?: boolean; // Preset for soft cards
  
  // Layout wrappers
  safe?: boolean;
  scroll?: boolean;
}

export function Block({
  children,
  style,
  flex,
  row,
  justify,
  align,
  center,
  padding,
  margin,
  radius,
  color,
  gradient,
  shadow,
  softShadow,
  card,
  safe,
  scroll,
  ...rest
}: BlockProps) {
  const colors = useColors();

  const blockStyles = StyleSheet.flatten([
    // Layout
    flex !== undefined && { flex: typeof flex === 'boolean' ? 1 : flex },
    row && { flexDirection: 'row' },
    justify && { justifyContent: justify },
    align && { alignItems: align },
    center && { justifyContent: 'center', alignItems: 'center' },
    padding !== undefined && { padding },
    margin !== undefined && { margin },
    radius !== undefined && { borderRadius: radius },
    
    // Aesthetic
    color && { backgroundColor: color },
    card && {
      backgroundColor: colors.surface,
      borderRadius: colors.radius2.card,
      padding: colors.spacing.md,
    },
    
    // Shadows
    (shadow && !softShadow) && (colors.isDark ? colors.shadows.card : colors.shadows.cardLarge),
    softShadow && (colors.isDark ? colors.shadows.softDark : colors.shadows.softLight),
    
    style,
  ]);

  if (safe) {
    return (
      <SafeAreaView style={blockStyles} {...rest}>
        {children}
      </SafeAreaView>
    );
  }

  if (scroll) {
    return (
      <ScrollView contentContainerStyle={blockStyles} showsVerticalScrollIndicator={false} {...rest}>
        {children}
      </ScrollView>
    );
  }

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={[0, 0]}
        end={[1, 1]}
        style={blockStyles}
        {...rest}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={blockStyles} {...rest}>
      {children}
    </View>
  );
}
