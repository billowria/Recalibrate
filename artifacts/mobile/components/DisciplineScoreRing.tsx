import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { BRAND, FONT, SCORE_COLORS } from '@/constants/colors';

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

function getScoreGradientColors(score: number): [string, string] {
  if (score >= 80) return [SCORE_COLORS.excellent, '#4DE8FF'];
  if (score >= 60) return ['#4DE8FF', BRAND.primary];
  if (score >= 40) return [SCORE_COLORS.building, '#FF8C42'];
  return ['#6B7280', '#4B5563'];
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Building';
  if (score >= 40) return 'Starting';
  if (score >= 20) return 'Warming Up';
  return 'Day Zero';
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const [gradStart, gradEnd] = getScoreGradientColors(safeScore);

  const center = size / 2;
  const radius = center - strokeWidth / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  // Animation value for score progress
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  const [displayScore, setDisplayScore] = React.useState(0);

  useEffect(() => {
    if (!animated) {
      progressAnim.setValue(safeScore);
      scoreAnim.setValue(safeScore);
      setDisplayScore(safeScore);
      return;
    }

    if (!isVisible) {
      progressAnim.setValue(0);
      scoreAnim.setValue(0);
      setDisplayScore(0);
      return;
    }

    // Reset to 0 when triggerKey changes or visibility transitions
    progressAnim.setValue(0);
    scoreAnim.setValue(0);
    setDisplayScore(0);

    // Animate progress ring
    Animated.timing(progressAnim, {
      toValue: safeScore,
      duration: 1400,
      delay: 50,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Count up the number display
    const listener = progressAnim.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    // Ambient glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Subtle scale pulse for ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.01, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    return () => {
      progressAnim.removeListener(listener);
      glowAnim.stopAnimation();
      pulseAnim.stopAnimation();
    };
  }, [safeScore, animated, isVisible, triggerKey]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, circumference * (1 - safeScore / 100)],
    extrapolate: 'clamp',
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0.15, 0.35],
  });

  const trackOpacity = 0.1;
  const gradId = `scoreGrad_${size}`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ambient glow behind ring */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: (size * 0.8) / 2,
            backgroundColor: gradStart,
            opacity: glowOpacity,
          },
        ]}
      />

      {/* SVG Ring */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradStart} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradEnd} stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Track (background ring) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1C1C2E"
            strokeWidth={strokeWidth}
            strokeOpacity={trackOpacity + 0.2}
          />

          {/* Secondary decorative ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius - strokeWidth - 4}
            fill="none"
            stroke={gradStart}
            strokeWidth={1}
            strokeOpacity={0.15}
            strokeDasharray="4 6"
          />

          {/* Progress arc */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90, ${center}, ${center})`}
          />

          {/* Dot at progress end */}
          {safeScore > 2 && (
            <Circle
              cx={center}
              cy={strokeWidth / 2 + 4}
              r={strokeWidth / 2.5}
              fill={gradEnd}
              transform={`rotate(${(safeScore / 100) * 360 - 90}, ${center}, ${center})`}
            />
          )}
        </Svg>
      </Animated.View>

      {/* Center content */}
      <View style={styles.centerContent} pointerEvents="none">
        <Text style={[styles.scoreNumber, { color: gradStart }]}>
          {displayScore}
        </Text>
        {showLabel && (
          <Text style={styles.scoreLabel}>{getScoreLabel(displayScore)}</Text>
        )}
        {showContext && (
          <Text style={styles.contextText}>
            {contextText || 'Discipline Score'}
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
    top: '10%',
    left: '10%',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: FONT.family.bold,
    fontSize: 52,
    letterSpacing: -2,
    lineHeight: 56,
  },
  scoreLabel: {
    fontFamily: FONT.family.semiBold,
    fontSize: FONT.size.sm,
    color: '#A0A0CC',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  contextText: {
    fontFamily: FONT.family.regular,
    fontSize: FONT.size.xs,
    color: '#606080',
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
