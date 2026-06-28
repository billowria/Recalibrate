import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';

// Animated brand icon for the splash screen
function AnimatedIcon({
  scale,
  opacity,
  colors,
}: {
  scale: Animated.Value;
  opacity: Animated.Value;
  colors: any;
}) {
  const rotateOuter = useRef(new Animated.Value(0)).current;
  const rotateInner = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateOuter, { toValue: 1, duration: 9000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(rotateInner, { toValue: -1, duration: 6000, useNativeDriver: true })
    ).start();
  }, []);

  const spinOuter = rotateOuter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const spinInner = rotateInner.interpolate({
    inputRange: [-1, 0],
    outputRange: ['-360deg', '0deg'],
  });

  const S = 120;
  const r1 = S * 0.44;
  const r2 = S * 0.3;

  return (
    <Animated.View
      style={{
        width: S,
        height: S,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
        opacity,
      }}
    >
      {/* Outer Orbit Ring */}
      <Animated.View
        style={[
          styles.orbitRing,
          {
            width: r1 * 2,
            height: r1 * 2,
            borderRadius: r1,
            borderColor: colors.brand.primary,
          },
          { transform: [{ rotate: spinOuter }] },
        ]}
      />

      {/* Mid Tilted Ring */}
      <Animated.View
        style={[
          styles.orbitRing,
          {
            width: r2 * 2 + 16,
            height: r2 * 2 + 16,
            borderRadius: r2 + 8,
            borderColor: colors.brand.secondary,
            transform: [{ scaleX: 0.4 }, { rotate: spinInner }],
          },
        ]}
      />

      {/* Inner Ring */}
      <View
        style={[
          styles.innerRing,
          {
            width: r2 * 2,
            height: r2 * 2,
            borderRadius: r2,
            borderColor: colors.brand.primaryLight,
          },
        ]}
      />

      {/* Center Glowing Core */}
      <View
        style={[
          styles.centerCore,
          {
            backgroundColor: colors.brand.primaryLight,
            shadowColor: colors.brand.primary,
          },
        ]}
      />

      {/* Branded Compass Arrow */}
      <View
        style={[
          styles.compassArrow,
          {
            top: S / 2 - r1 - 3,
            borderBottomColor: colors.brand.secondary,
          },
        ]}
      />
    </Animated.View>
  );
}

export default function SplashScreen() {
  const colors = useColors();

  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1) Icon pop-in
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 35,
      friction: 7,
      useNativeDriver: true,
    }).start();
    Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // 2) Taglines fade-in
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 600,
      delay: 350,
      useNativeDriver: true,
    }).start();

    // 3) Loading Bar progression
    Animated.timing(barWidth, {
      toValue: 1,
      duration: 1500,
      delay: 450,
      useNativeDriver: false,
    }).start();

    // 4) Micro-pulse breathing loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // 5) Transition logic
    const timer = setTimeout(() => navigateNext(), 2200);
    return () => clearTimeout(timer);
  }, []);

  const navigateNext = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId && userId.trim().length > 0) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth');
      }
    } catch {
      router.replace('/auth');
    }
  };

  const barInterpolated = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Background Radial Glow */}
      <View
        style={[
          styles.glowCircle,
          {
            backgroundColor: colors.brand.primary,
          },
        ]}
      />

      {/* Orbit Logo */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <AnimatedIcon scale={scaleAnim} opacity={opacityAnim} colors={colors} />
      </Animated.View>

      {/* Branded Text */}
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', gap: 6 }}>
        <Text style={[styles.appName, { color: colors.text }]}>Recalibrate</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Master your environment. Discipline OS.
        </Text>
      </Animated.View>

      {/* Loading Progress Bar */}
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: barInterpolated,
              backgroundColor: colors.brand.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.65,
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1.5,
    opacity: 0.45,
    transform: [{ rotate: '45deg' }, { scaleX: 0.45 }],
  },
  centerCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  compassArrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  glowCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.05,
    top: '50%',
    left: '50%',
    transform: [{ translateX: -160 }, { translateY: -220 }],
  },
  appName: {
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
  },
  barTrack: {
    position: 'absolute',
    bottom: 80,
    width: 120,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
