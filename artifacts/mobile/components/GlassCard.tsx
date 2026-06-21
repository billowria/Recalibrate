import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function GlassCard({ children, style, padding = 16 }: Props) {
  const colors = useColors();
  return (
    <View style={[
      styles.card,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRadius: colors.radius,
        padding,
      },
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
});
