import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

export interface SoftTextProps extends TextProps {
  children: React.ReactNode;
  
  // Hierarchy
  h1?: boolean;
  h2?: boolean;
  h3?: boolean;
  h4?: boolean;
  p?: boolean;
  caption?: boolean;
  
  // Weights
  bold?: boolean;
  semiBold?: boolean;
  medium?: boolean;
  regular?: boolean;
  
  // Colors & Alignment
  color?: string;
  muted?: boolean;
  primary?: boolean;
  center?: boolean;
  right?: boolean;
}

export function SoftText({
  children,
  style,
  h1,
  h2,
  h3,
  h4,
  p,
  caption,
  bold,
  semiBold,
  medium,
  regular,
  color,
  muted,
  primary,
  center,
  right,
  ...rest
}: SoftTextProps) {
  const colors = useColors();

  const textStyles = StyleSheet.flatten([
    // Base style
    {
      color: colors.text,
      fontFamily: colors.font.family.regular,
      fontSize: colors.font.size.base,
    },
    
    // Hierarchy
    h1 && { fontSize: colors.font.size.hero, fontFamily: colors.font.family.bold, lineHeight: colors.font.size.hero * colors.font.lineHeight.tight },
    h2 && { fontSize: colors.font.size.xxl, fontFamily: colors.font.family.bold, lineHeight: colors.font.size.xxl * colors.font.lineHeight.tight },
    h3 && { fontSize: colors.font.size.xl, fontFamily: colors.font.family.semiBold },
    h4 && { fontSize: colors.font.size.lg, fontFamily: colors.font.family.semiBold },
    p && { fontSize: colors.font.size.md, fontFamily: colors.font.family.regular, lineHeight: colors.font.size.md * colors.font.lineHeight.relaxed },
    caption && { fontSize: colors.font.size.sm, fontFamily: colors.font.family.regular, color: colors.textSecondary },
    
    // Weights
    bold && { fontFamily: colors.font.family.bold },
    semiBold && { fontFamily: colors.font.family.semiBold },
    medium && { fontFamily: colors.font.family.medium },
    regular && { fontFamily: colors.font.family.regular },
    
    // Colors
    color && { color },
    muted && { color: colors.textMuted },
    primary && { color: colors.primary },
    
    // Alignment
    center && { textAlign: 'center' },
    right && { textAlign: 'right' },
    
    style,
  ]) as TextStyle;

  return (
    <Text style={textStyles} {...rest}>
      {children}
    </Text>
  );
}
