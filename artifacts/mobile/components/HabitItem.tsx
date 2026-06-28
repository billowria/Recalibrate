import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { BRAND, FONT, RADIUS } from '@/constants/colors';
import type { TrackedMetric, DailyLog } from '@/context/AppContext';

interface HabitItemProps {
  metric: TrackedMetric;
  log: DailyLog | undefined;
  onLog: (metricId: string, value: number) => void;
  compact?: boolean;
}

function getStateForMetric(
  metric: TrackedMetric,
  log: DailyLog | undefined
): 'completed' | 'missed' | 'neutral' | 'empty' {
  if (!log) return 'empty';
  if (metric.category === 'build') {
    return log.value > 0 ? 'completed' : 'missed';
  }
  if (metric.category === 'reduce') {
    return log.value === 0 ? 'completed' : 'missed';
  }
  return 'neutral';
}

function getNextValue(metric: TrackedMetric, currentLog: DailyLog | undefined): number {
  if (metric.inputType === 'boolean') {
    const current = currentLog?.value ?? -1;
    return current === 1 ? 0 : 1;
  }
  return 1;
}

// ─── Animated Circular Checkbox (SVG checkmark draw) ───────────────────────
// SVG animated components not needed — using Animated.View wrappers instead

function AnimatedCheckbox({ isChecked, color }: { isChecked: boolean; color: string }) {
  const checkProgress = useSharedValue(isChecked ? 1 : 0);
  const circleFill = useSharedValue(isChecked ? 1 : 0);

  useEffect(() => {
    if (isChecked) {
      circleFill.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      checkProgress.value = withDelay(
        80,
        withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) })
      );
    } else {
      checkProgress.value = withTiming(0, { duration: 150 });
      circleFill.value = withDelay(100, withTiming(0, { duration: 200 }));
    }
  }, [isChecked]);

  const circleStyle = useAnimatedStyle(() => ({
    opacity: circleFill.value,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkProgress.value,
    transform: [{ scale: 0.7 + checkProgress.value * 0.3 }],
  }));

  const SIZE = 26;
  const STROKE = 1.8;
  const R = (SIZE - STROKE) / 2;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Unchecked ring */}
        <Circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={STROKE}
        />
      </Svg>
      {/* Filled circle overlay when checked — using Animated.View for opacity */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          circleStyle,
        ]}
      >
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            fill={color}
            stroke={color}
            strokeWidth={STROKE}
          />
        </Svg>
      </Animated.View>
      {/* Checkmark icon */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center' },
          checkmarkStyle,
        ]}
      >
        <Svg width={14} height={10} viewBox="0 0 14 10">
          <Path
            d="M1.5 5L5.5 9L12.5 1"
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Animated Task Label (strikethrough) ────────────────────────────────────
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);

function AnimatedTaskLabel({
  strikethrough,
  children,
  subLabel,
}: {
  strikethrough: boolean;
  children: string;
  subLabel?: string;
}) {
  const strikeProgress = useSharedValue(strikethrough ? 1 : 0);
  const textColorProgress = useSharedValue(strikethrough ? 1 : 0);

  useEffect(() => {
    if (strikethrough) {
      strikeProgress.value = withDelay(
        100,
        withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
      );
      textColorProgress.value = withTiming(1, { duration: 250 });
    } else {
      strikeProgress.value = withTiming(0, { duration: 180 });
      textColorProgress.value = withTiming(0, { duration: 200 });
    }
  }, [strikethrough]);

  const strikeStyle = useAnimatedStyle(() => ({
    width: `${strikeProgress.value * 100}%`,
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      textColorProgress.value,
      [0, 1],
      ['rgba(240,240,255,1)', 'rgba(120,120,140,1)']
    ),
  }));

  return (
    <View style={{ flex: 1 }}>
      <View style={{ position: 'relative', alignSelf: 'flex-start', maxWidth: '100%' }}>
        <AnimatedText
          style={[labelStyles.name, textStyle]}
          numberOfLines={1}
        >
          {children}
        </AnimatedText>
        {/* Strikethrough line */}
        <AnimatedView
          style={[
            labelStyles.strikethrough,
            strikeStyle,
          ]}
        />
      </View>
      {subLabel ? (
        <Text style={labelStyles.subLabel} numberOfLines={1}>{subLabel}</Text>
      ) : null}
    </View>
  );
}

const labelStyles = StyleSheet.create({
  name: {
    fontSize: 15,
    fontFamily: FONT.family.medium,
    letterSpacing: 0.05,
  },
  strikethrough: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: 'rgba(180,180,200,0.6)',
    top: '55%',
    left: 0,
  },
  subLabel: {
    fontSize: 11,
    fontFamily: FONT.family.regular,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

// ─── Main HabitItem ──────────────────────────────────────────────────────────
export function HabitItem({ metric, log, onLog, compact = false }: HabitItemProps) {
  const state = getStateForMetric(metric, log);
  const isCompleted = state === 'completed';
  const isMissed = state === 'missed';

  const pressScale = useSharedValue(1);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Micro press animation
    pressScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withTiming(1, { duration: 120, easing: Easing.out(Easing.back(2)) })
    );

    const nextValue = getNextValue(metric, log);
    const willComplete =
      (metric.inputType === 'boolean' && nextValue === 1) ||
      (metric.category === 'reduce' && nextValue === 0);

    if (willComplete && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    onLog(metric.id, nextValue);
  }, [metric, log, onLog]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const checkColor = isCompleted
    ? BRAND.success
    : metric.category === 'reduce'
    ? BRAND.warning
    : BRAND.primary;

  const subLabel = [
    metric.category === 'build' ? 'Build' : metric.category === 'reduce' ? 'Reduce' : 'Track',
    metric.inputType !== 'boolean' ? metric.unitLabel || 'units' : null,
    metric.implementationIntention ? `· ${metric.implementationIntention}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  if (compact) {
    return (
      <AnimatedView style={[pressStyle]}>
        <Pressable onPress={handlePress} style={compactStyles.row}>
          <AnimatedCheckbox isChecked={isCompleted} color={checkColor} />
          <Text
            style={[
              compactStyles.label,
              isCompleted && { color: 'rgba(255,255,255,0.3)', textDecorationLine: 'line-through' },
            ]}
            numberOfLines={1}
          >
            {metric.emoji ? `${metric.emoji} ` : ''}{metric.name}
          </Text>
        </Pressable>
      </AnimatedView>
    );
  }

  return (
    <AnimatedView style={[pressStyle]}>
      <Pressable onPress={handlePress} style={habitStyles.row}>
        {/* Emoji badge */}
        <Text style={habitStyles.emoji}>{metric.emoji || '📌'}</Text>

        {/* Animated label */}
        <AnimatedTaskLabel strikethrough={isCompleted} subLabel={subLabel}>
          {metric.name}
        </AnimatedTaskLabel>

        {/* Checkbox on the right */}
        <AnimatedCheckbox isChecked={isCompleted} color={checkColor} />
      </Pressable>
      {/* Bottom separator line */}
      <View style={habitStyles.separator} />
    </AnimatedView>
  );
}

const habitStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  emoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 44,
  },
});

const compactStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.family.medium,
    color: 'rgba(240,240,255,0.9)',
  },
});
