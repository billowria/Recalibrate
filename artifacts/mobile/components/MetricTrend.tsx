import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { DailyLog } from '@/context/AppContext';

interface Props {
  logs: DailyLog[];
  category: 'build' | 'reduce' | 'neutral';
  inputType: 'boolean' | 'counter' | 'scale';
  maxValue?: number;
}

export function MetricTrend({ logs, category, inputType, maxValue = 10 }: Props) {
  const colors = useColors();
  const BAR_HEIGHT = 48;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const getBarColor = (value: number) => {
    if (value < 0) return colors.border;
    if (category === 'build') {
      if (inputType === 'boolean') return value === 1 ? colors.scoreGreen : colors.scoreRed;
      return colors.primary;
    }
    if (category === 'reduce') {
      if (inputType === 'boolean') return value === 0 ? colors.scoreGreen : colors.scoreRed;
      if (value === 0) return colors.scoreGreen;
      if (value <= 2) return colors.scoreYellow;
      return colors.scoreRed;
    }
    return colors.primary;
  };

  const getBarHeight = (value: number, max: number) => {
    if (value < 0) return 4;
    if (inputType === 'boolean') return value === 1 ? BAR_HEIGHT : 8;
    return Math.max(4, (value / Math.max(max, 1)) * BAR_HEIGHT);
  };

  const actualMax = inputType === 'boolean' ? 1 :
    Math.max(...logs.filter(l => l.value >= 0).map(l => l.value), 1, maxValue);

  const last7 = logs.slice(-7);

  return (
    <View style={styles.container}>
      {last7.map((log, i) => {
        const h = getBarHeight(log.value, actualMax);
        const color = getBarColor(log.value);
        const dayLabel = days[i % 7];
        return (
          <View key={i} style={styles.barCol}>
            <View style={[styles.barBg, { height: BAR_HEIGHT, backgroundColor: colors.border + '50' }]}>
              <View style={[styles.bar, { height: h, backgroundColor: color }]} />
            </View>
            <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{dayLabel}</Text>
            {log.value >= 0 ? (
              <Text style={[styles.valueLabel, { color: color, fontFamily: 'Inter_700Bold' }]}>
                {inputType === 'boolean' ? (log.value === 1 ? '✓' : '✗') : log.value}
              </Text>
            ) : (
              <Text style={[styles.valueLabel, { color: colors.border }]}>-</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingVertical: 10,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barBg: {
    width: 8,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  valueLabel: {
    fontSize: 9,
  },
});
