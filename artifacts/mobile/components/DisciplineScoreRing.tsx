import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Stop } from 'react-native-svg';
import { BRAND, FONT, SCORE_COLORS } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';

interface DisciplineScoreRingProps {
  score: number;         // 0-100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  showContext?: boolean;
  contextText?: string;
  animated?: boolean;
  isVisible?: boolean;
  triggerKey?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.excellent;
  if (score >= 60) return BRAND.primary;
  if (score >= 40) return SCORE_COLORS.building;
  return '#6B7280';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Elite Athlete';
  if (score >= 80) return 'Consistent';
  if (score >= 60) return 'Active';
  if (score >= 40) return 'Starting';
  if (score >= 20) return 'Warming Up';
  return 'Resting';
}

export function DisciplineScoreRing({
  score,
  size = 200,
  strokeWidth = 14,
  showLabel = true,
  showContext = true,
  contextText,
  animated = true,
  isVisible = true,
  triggerKey = 0,
}: DisciplineScoreRingProps) {
  const colors = useColors();
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const themeColor = getScoreColor(safeScore);

  const center = size / 2;
  const radius = center - 24; // Outer boundary of the ticks

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const [displayScore, setDisplayScore] = React.useState(0);

  useEffect(() => {
    if (!animated) {
      progressAnim.setValue(safeScore);
      setDisplayScore(safeScore);
      return;
    }

    if (!isVisible) {
      progressAnim.setValue(0);
      setDisplayScore(0);
      return;
    }

    progressAnim.setValue(0);
    setDisplayScore(0);

    Animated.timing(progressAnim, {
      toValue: safeScore,
      duration: 1400,
      delay: 50,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const listener = progressAnim.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.2, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();

    return () => {
      progressAnim.removeListener(listener);
      glowAnim.stopAnimation();
    };
  }, [safeScore, animated, isVisible, triggerKey]);

  // Radial Ticks Configuration
  const numTicks = 55;
  const startAngle = Math.PI + 0.35; // Left horizontal-ish
  const endAngle = 2 * Math.PI - 0.35; // Right horizontal-ish

  // Active ticks calculation
  const activeTicksCount = Math.round((displayScore / 100) * numTicks);

  const ticks = Array.from({ length: numTicks }).map((_, i) => {
    const theta = startAngle + (i / (numTicks - 1)) * (endAngle - startAngle);
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const isActive = i <= activeTicksCount && displayScore > 0;
    const isLeading = i === activeTicksCount && displayScore > 0;

    // Tick length adjustments
    let tickLength = 10;
    let tickWidth = 1.5;
    let color = colors.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(37, 47, 64, 0.1)';

    if (isLeading) {
      tickLength = 16;
      tickWidth = 3;
      color = '#FFB03A'; // Gold Highlight
    } else if (isActive) {
      tickLength = 12;
      tickWidth = 2;
      color = colors.isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(37, 47, 64, 0.8)';
    }

    const rInner = radius - tickLength;
    const rOuter = radius;

    const x1 = center + rInner * cos;
    const y1 = center + rInner * sin;
    const x2 = center + rOuter * cos;
    const y2 = center + rOuter * sin;

    return {
      id: `tick-${i}`,
      x1,
      y1,
      x2,
      y2,
      color,
      width: tickWidth,
      isLeading,
      theta,
    };
  });

  const leadingTick = ticks.find(t => t.isLeading);
  const leadingDot = leadingTick ? {
    x: center + (radius + 4) * Math.cos(leadingTick.theta),
    y: center + (radius + 4) * Math.sin(leadingTick.theta),
  } : null;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ambient background glow strictly behind the score */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: (size * 0.75) / 2,
            backgroundColor: themeColor,
            opacity: glowAnim.interpolate({
              inputRange: [0.6, 1.2],
              outputRange: colors.isDark ? [0.03, 0.08] : [0.015, 0.04],
            }),
          },
        ]}
      />

      {/* SVG Radial Tick Dial */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="orangeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFE082" />
              <Stop offset="100%" stopColor="#FFB03A" />
            </LinearGradient>
          </Defs>

          {/* Render Ticks */}
          {ticks.map(tick => (
            <Line
              key={tick.id}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={tick.color}
              strokeWidth={tick.width}
              strokeLinecap="round"
            />
          ))}

          {/* Glowing dot for leading indicator */}
          {leadingDot && (
            <Circle
              cx={leadingDot.x}
              cy={leadingDot.y}
              r={4}
              fill="url(#orangeGlow)"
            />
          )}
        </Svg>
      </View>

      {/* Center content */}
      <View style={styles.centerContent} pointerEvents="none">
        <Text style={[styles.scoreNumber, { color: colors.isDark ? '#FFFFFF' : colors.text }]}>
          {displayScore}
        </Text>
        {showLabel && (
          <Text style={[styles.scoreLabel, { color: themeColor }]}>
            {getScoreLabel(displayScore)}
          </Text>
        )}
        {showContext && (
          <Text style={[styles.contextText, { color: colors.isDark ? '#606080' : colors.textSecondary }]}>
            {contextText || 'Fitness Completion'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    alignSelf: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: FONT.family.bold,
    fontSize: 64, // Bolder & larger display
    color: '#FFFFFF', // High contrast white
    letterSpacing: -2,
    lineHeight: 68,
  },
  scoreLabel: {
    fontFamily: FONT.family.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  contextText: {
    fontFamily: FONT.family.regular,
    fontSize: 10,
    color: '#606080',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
