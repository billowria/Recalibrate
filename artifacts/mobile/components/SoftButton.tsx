import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { SoftText } from './SoftText';

export interface SoftButtonProps {
  children?: React.ReactNode;
  title?: string;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  
  // Variants
  primary?: boolean;
  secondary?: boolean;
  danger?: boolean;
  success?: boolean;
  gradient?: readonly [string, string, ...string[]];
  
  // Modifiers
  disabled?: boolean;
  block?: boolean; // full width
  round?: boolean;
  
  // Effects
  shadow?: boolean;
  haptic?: boolean;
}

export function SoftButton({
  children,
  title,
  onPress,
  style,
  primary,
  secondary,
  danger,
  success,
  gradient,
  disabled,
  block,
  round,
  shadow = true,
  haptic = true,
}: SoftButtonProps) {
  const colors = useColors();

  const handlePress = useCallback(() => {
    if (disabled) return;
    
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (onPress) {
      onPress();
    }
  }, [disabled, haptic, onPress]);

  // Determine background
  let bgGradient = gradient;
  let bgColor = colors.surface;
  let textColor = colors.text;

  if (primary) {
    bgGradient = colors.gradients.primary;
    textColor = '#FFFFFF';
  } else if (danger) {
    bgGradient = [colors.brand.dangerLight, colors.brand.danger];
    textColor = '#FFFFFF';
  } else if (success) {
    bgGradient = [colors.brand.successLight, colors.brand.success];
    textColor = '#FFFFFF';
  } else if (secondary) {
    bgColor = colors.secondary;
    textColor = colors.secondaryForeground;
  }

  const containerStyle = StyleSheet.flatten([
    {
      minHeight: 50,
      paddingHorizontal: colors.spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: round ? 999 : colors.radius2.button,
      backgroundColor: bgGradient ? 'transparent' : bgColor,
    },
    block && { width: '100%' },
    (shadow && !disabled && colors.isDark) && colors.shadows.softDark,
    (shadow && !disabled && !colors.isDark) && colors.shadows.softLight,
    disabled && { opacity: 0.5 },
    style,
  ]);

  const innerContent = (
    <>
      {title && (
        <SoftText semiBold style={{ color: textColor }}>
          {title}
        </SoftText>
      )}
      {children}
    </>
  );

  if (bgGradient && !disabled) {
    return (
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={handlePress} 
        style={containerStyle}
        disabled={disabled}
      >
        <LinearGradient
          colors={bgGradient}
          start={[0, 0]}
          end={[1, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: containerStyle.borderRadius }]}
        />
        <View style={{ zIndex: 1, flexDirection: 'row', alignItems: 'center' }}>
          {innerContent}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={handlePress} 
      style={containerStyle}
      disabled={disabled}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {innerContent}
      </View>
    </TouchableOpacity>
  );
}
