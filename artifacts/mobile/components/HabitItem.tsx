import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { TrackedMetric } from '@/context/AppContext';

interface Props {
  metric: TrackedMetric;
  value: number | undefined;
  onToggle: (value: number) => void;
  compact?: boolean;
}

export function HabitItem({ metric, value, onToggle, compact }: Props) {
  const colors = useColors();
  const isLogged = value !== undefined && value >= 0;

  const handleBooleanTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle(value === 1 ? 0 : 1);
  };

  const handleCounter = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = value ?? 0;
    onToggle(Math.max(0, current + delta));
  };

  const handleScale = (v: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(v);
  };

  const isReduce = metric.category === 'reduce';
  const isSensitive = metric.isSensitive;

  const getStatusColor = () => {
    if (!isLogged) return colors.border;
    if (metric.category === 'build') {
      return value === 1 ? colors.scoreGreen : colors.scoreRed;
    }
    if (metric.category === 'reduce') {
      if (metric.inputType === 'boolean') return value === 0 ? colors.scoreGreen : colors.scoreRed;
      if (metric.inputType === 'counter') {
        if (value === 0) return colors.scoreGreen;
        if (value <= 2) return colors.scoreYellow;
        return colors.scoreRed;
      }
    }
    return colors.primary;
  };

  const statusColor = getStatusColor();

  return (
    <View style={[styles.container, {
      backgroundColor: colors.card,
      borderColor: isLogged ? statusColor + '33' : colors.border,
      borderRadius: colors.radius,
    }]}>
      <View style={[styles.indicator, { backgroundColor: statusColor }]} />
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {isSensitive && !isLogged ? '••••••••' : metric.name}
        </Text>
        {metric.unitLabel ? (
          <Text style={[styles.unit, { color: colors.mutedForeground }]}>
            {metric.category === 'reduce' ? 'target: 0' : metric.unitLabel}
          </Text>
        ) : null}
      </View>

      {metric.inputType === 'boolean' && (
        <TouchableOpacity
          onPress={handleBooleanTap}
          style={[styles.checkCircle, {
            backgroundColor: value === 1 ? colors.scoreGreen : colors.card,
            borderColor: value === 1 ? colors.scoreGreen : colors.border,
          }]}
          activeOpacity={0.7}
        >
          {value === 1 && <Ionicons name="checkmark" size={16} color="#fff" />}
        </TouchableOpacity>
      )}

      {metric.inputType === 'counter' && (
        <View style={styles.counter}>
          <TouchableOpacity
            onPress={() => handleCounter(-1)}
            style={[styles.counterBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.counterVal, { color: isReduce && (value ?? 0) > 0 ? colors.scoreRed : colors.foreground }]}>
            {value ?? 0}
          </Text>
          <TouchableOpacity
            onPress={() => handleCounter(1)}
            style={[styles.counterBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      )}

      {metric.inputType === 'scale' && !compact && (
        <View style={styles.scaleRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <TouchableOpacity
              key={n}
              onPress={() => handleScale(n)}
              style={[styles.scaleDot, {
                backgroundColor: (value ?? 0) >= n ? colors.primary : colors.border,
              }]}
              activeOpacity={0.7}
            />
          ))}
        </View>
      )}

      {metric.inputType === 'scale' && compact && (
        <Text style={[styles.scaleValue, { color: value ? colors.primary : colors.mutedForeground }]}>
          {value ? `${value}/10` : '—'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  indicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  unit: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterVal: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    minWidth: 24,
    textAlign: 'center',
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 3,
  },
  scaleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scaleValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
