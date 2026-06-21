import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  score: number;
  size?: number;
}

export function DisciplineScoreRing({ score, size = 180 }: Props) {
  const colors = useColors();
  const [displayScore, setDisplayScore] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();

    let current = 0;
    const step = Math.ceil(score / 30);
    const timer = setInterval(() => {
      current = Math.min(current + step, score);
      setDisplayScore(current);
      if (current >= score) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [score]);

  const scoreColor =
    score >= 75 ? colors.scoreGreen :
    score >= 40 ? colors.scoreYellow :
    colors.scoreRed;

  const label =
    score >= 75 ? 'ON TRACK' :
    score >= 40 ? 'BUILDING' :
    'NEEDS WORK';

  const thickness = size * 0.055;
  const innerSize = size - thickness * 2;

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={[styles.ring, {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: scoreColor,
          backgroundColor: colors.background,
        }]}>
          <View style={[styles.inner, {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }]}>
            <Text style={[styles.scoreNumber, {
              fontSize: size * 0.28,
              color: scoreColor,
            }]}>
              {displayScore}
            </Text>
            <Text style={[styles.scoreLabel, { color: scoreColor, fontSize: size * 0.079 }]}>
              {label}
            </Text>
            <Text style={[styles.scoreSubLabel, { color: colors.mutedForeground, fontSize: size * 0.068 }]}>
              DISCIPLINE
            </Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.segmentRow}>
        {[
          { color: colors.scoreRed, label: '< 40' },
          { color: colors.scoreYellow, label: '40–75' },
          { color: colors.scoreGreen, label: '> 75' },
        ].map((seg) => (
          <View key={seg.label} style={styles.segment}>
            <View style={[styles.segDot, { backgroundColor: seg.color }]} />
            <Text style={[styles.segLabel, { color: colors.mutedForeground }]}>{seg.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  scoreNumber: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    letterSpacing: -2,
  },
  scoreLabel: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    fontWeight: '700',
  },
  scoreSubLabel: {
    fontFamily: 'Inter_500Medium',
    letterSpacing: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 20,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  segDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
  },
});
