import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

const MODES = [
  { label: '25 / 5', work: 25, rest: 5 },
  { label: '50 / 10', work: 50, rest: 10 },
  { label: '90 / 15', work: 90, rest: 15 },
];

export default function PomodoroScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addFocusMinutes } = useApp();

  const [modeIndex, setModeIndex] = useState(0);
  const [phase, setPhase] = useState<'work' | 'rest'>('work');
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(MODES[0].work * 60);
  const [sessionsCompleted, setSessions] = useState(0);
  const [totalFocus, setTotalFocus] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const mode = MODES[modeIndex];
  const totalSeconds = phase === 'work' ? mode.work * 60 : mode.rest * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  useEffect(() => {
    if (running) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
    return () => pulseLoop.current?.stop();
  }, [running]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          if (phase === 'work') {
            const focusMins = mode.work;
            addFocusMinutes(focusMins);
            setTotalFocus(t => t + focusMins);
            setSessions(s => s + 1);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPhase('rest');
            setSecondsLeft(mode.rest * 60);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setPhase('work');
            setSecondsLeft(mode.work * 60);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, mode]);

  const handleStartPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(r => !r);
  };

  const handleReset = () => {
    clearInterval(intervalRef.current!);
    setRunning(false);
    setPhase('work');
    setSecondsLeft(mode.work * 60);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleModeChange = (i: number) => {
    clearInterval(intervalRef.current!);
    setRunning(false);
    setModeIndex(i);
    setPhase('work');
    setSecondsLeft(MODES[i].work * 60);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const phaseColor = phase === 'work' ? colors.primary : colors.scoreGreen;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Deep Work</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.modeRow}>
        {MODES.map((m, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => handleModeChange(i)}
            style={[styles.modeBtn, {
              backgroundColor: modeIndex === i ? colors.primary : colors.card,
              borderColor: modeIndex === i ? colors.primary : colors.border,
              borderRadius: colors.radius,
            }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, { color: modeIndex === i ? '#fff' : colors.foreground }]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.timerCenter}>
        <View style={[styles.phaseRow, { backgroundColor: phaseColor + '20', borderRadius: 20 }]}>
          <Ionicons
            name={phase === 'work' ? 'flame' : 'leaf'}
            size={14}
            color={phaseColor}
          />
          <Text style={[styles.phaseLabel, { color: phaseColor }]}>
            {phase === 'work' ? 'FOCUS' : 'REST'}
          </Text>
        </View>

        <Animated.View style={[styles.clockRing, {
          borderColor: phaseColor + '30',
          transform: [{ scale: pulseAnim }],
        }]}>
          <View style={[styles.clockInner, { borderColor: phaseColor + '60', backgroundColor: colors.card }]}>
            <Text style={[styles.timeDisplay, { color: colors.foreground }]}>{timeStr}</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, {
                width: `${progress * 100}%` as any,
                backgroundColor: phaseColor,
              }]} />
            </View>
          </View>
        </Animated.View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={handleReset} style={[styles.controlBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
            <Ionicons name="refresh" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleStartPause}
            style={[styles.mainBtn, { backgroundColor: phaseColor }]}
            activeOpacity={0.8}
          >
            <Ionicons name={running ? 'pause' : 'play'} size={32} color="#fff" />
          </TouchableOpacity>
          <View style={[styles.sessionCountBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sessionCount, { color: colors.foreground }]}>{sessionsCompleted}</Text>
            <Text style={[styles.sessionCountLabel, { color: colors.mutedForeground }]}>done</Text>
          </View>
        </View>
      </View>

      {totalFocus > 0 && (
        <View style={[styles.focusCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.scoreGreen} />
          <Text style={[styles.focusText, { color: colors.foreground }]}>
            {totalFocus} focus minutes logged today
          </Text>
        </View>
      )}

      <View style={styles.tipsContainer}>
        {[
          'Phone off. No exceptions.',
          'One task only. No multitasking.',
          'Quality beats quantity.',
        ].map((tip, i) => (
          <View key={i} style={[styles.tip, { borderLeftColor: phaseColor }]}>
            <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  modeRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  modeBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  timerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  phaseLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  clockRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockInner: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timeDisplay: { fontSize: 52, fontFamily: 'Inter_700Bold', letterSpacing: -2 },
  progressBar: { width: 100, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCountBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCount: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  sessionCountLabel: { fontSize: 9, fontFamily: 'Inter_500Medium' },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  focusText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  tipsContainer: { paddingHorizontal: 24, paddingBottom: 32, gap: 8 },
  tip: { borderLeftWidth: 2, paddingLeft: 12 },
  tipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
