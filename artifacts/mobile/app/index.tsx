import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Animated brand icon for the splash
function AnimatedIcon({ scale, opacity }: { scale: Animated.Value; opacity: Animated.Value }) {
  const rotateOuter = useRef(new Animated.Value(0)).current;
  const rotateInner = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateOuter, { toValue: 1, duration: 8000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(rotateInner, { toValue: -1, duration: 5000, useNativeDriver: true })
    ).start();
  }, []);

  const spinOuter = rotateOuter.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinInner = rotateInner.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });

  const S = 110;
  const r1 = S * 0.44;
  const r2 = S * 0.30;

  return (
    <Animated.View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center', transform: [{ scale }], opacity }}>
      {/* Outer orbit */}
      <Animated.View style={[{
        position: 'absolute', width: r1 * 2, height: r1 * 2,
        borderRadius: r1, borderWidth: 2.5, borderColor: '#8b5cf6',
        opacity: 0.7,
      }, { transform: [{ rotate: spinOuter }] }]} />

      {/* Mid tilted ring */}
      <Animated.View style={[{
        position: 'absolute', width: r2 * 2 + 16, height: r2 * 2 + 16,
        borderRadius: r2 + 8, borderWidth: 2.5, borderColor: '#6366f1',
        transform: [{ scaleX: 0.4 }, { rotate: spinInner }],
      }]} />

      {/* Inner ring */}
      <View style={{
        position: 'absolute', width: r2 * 2, height: r2 * 2,
        borderRadius: r2, borderWidth: 2, borderColor: '#a78bfa', opacity: 0.55,
        transform: [{ rotate: '45deg' }, { scaleX: 0.45 }],
      }} />

      {/* Center glow */}
      <View style={{
        width: 14, height: 14, borderRadius: 7, backgroundColor: '#c4b5fd',
        shadowColor: '#8b5cf6', shadowOpacity: 1, shadowRadius: 12,
      }} />

      {/* Up arrow */}
      <View style={{
        position: 'absolute', top: S / 2 - r1 - 2,
        width: 0, height: 0,
        borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 11,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: '#a78bfa',
      }} />
    </Animated.View>
  );
}

export default function SplashScreen() {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1) Icon pops in
    Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start();
    Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // 2) Text fades in
    Animated.timing(textOpacity, { toValue: 1, duration: 600, delay: 400, useNativeDriver: true }).start();

    // 3) Loading bar
    Animated.timing(barWidth, { toValue: 1, duration: 1600, delay: 500, useNativeDriver: false }).start();

    // 4) Pulse the icon gently
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // 5) Navigate after splash
    const timer = setTimeout(() => navigateNext(), 2400);
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

  const barInterpolated = barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const combinedScale = Animated.multiply ? scaleAnim : scaleAnim;

  return (
    <View style={styles.root}>
      {/* Background radial glow */}
      <View style={styles.glowCircle} />

      {/* Icon */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <AnimatedIcon scale={scaleAnim} opacity={opacityAnim} />
      </Animated.View>

      {/* Text */}
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', gap: 6 }}>
        <Text style={styles.appName}>Recalibrate</Text>
        <Text style={styles.tagline}>Master yourself. Daily.</Text>
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barInterpolated }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#07070f',
    alignItems: 'center', justifyContent: 'center', gap: 28,
  },
  glowCircle: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#6366f1', opacity: 0.06,
    top: '50%', left: '50%',
    transform: [{ translateX: -140 }, { translateY: -200 }],
  },
  appName: {
    fontSize: 42, fontFamily: 'Inter_700Bold',
    color: '#f9fafb', letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 15, fontFamily: 'Inter_400Regular',
    color: '#6b7280', letterSpacing: 0.5,
  },
  barTrack: {
    position: 'absolute', bottom: 80,
    width: 140, height: 2, borderRadius: 2,
    backgroundColor: '#1e1e30', overflow: 'hidden',
  },
  barFill: {
    height: '100%', borderRadius: 2,
    backgroundColor: '#6366f1',
  },
});
