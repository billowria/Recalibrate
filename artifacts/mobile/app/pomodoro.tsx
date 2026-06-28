import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { scheduleInstant } from '@/notifications/manager';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/GlassCard';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';

type Phase = 'work' | 'short-break' | 'long-break';

const PHASE_LABELS: Record<Phase, string> = {
  'work': 'DEEP WORK',
  'short-break': 'SHORT BREAK',
  'long-break': 'LONG BREAK',
};

const PHASE_ICONS: Record<Phase, any> = {
  'work': 'flame',
  'short-break': 'leaf',
  'long-break': 'cafe',
};

const ROUNDS_BEFORE_LONG = 4;

// ─── Round dots ───────────────────────────────────────────────────────────────
function RoundDots({ total, completed, current, activeColor }: { total: number; completed: number; current: boolean; activeColor: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i < completed ? 12 : (i === completed && current ? 12 : 8),
            height: i < completed ? 12 : (i === completed && current ? 12 : 8),
            borderRadius: 6,
            backgroundColor:
              i < completed
                ? activeColor
                : i === completed && current
                  ? activeColor + '80'
                  : colors.border,
            borderWidth: i === completed && current ? 2 : 0,
            borderColor: activeColor + '60',
          }}
        />
      ))}
    </View>
  );
}

// ─── Circular Ring ────────────────────────────────────────────────────────────
function CircularRing({ pct, size, strokeW, color, children }: {
  pct: number; size: number; strokeW: number; color: string; children?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* track */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeW, borderColor: colors.border, opacity: 0.5,
      }} />
      {/* filled arc using simple rotate/border rendering */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeW,
        borderTopColor: color,
        borderRightColor: pct > 0.25 ? color : 'transparent',
        borderBottomColor: pct > 0.5 ? color : 'transparent',
        borderLeftColor: pct > 0.75 ? color : 'transparent',
        transform: [{ rotate: '-90deg' }],
      }} />
      {children}
    </View>
  );
}

// ─── Main Focus Timer Screen ──────────────────────────────────────────────────
export default function PomodoroScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addFocusMinutes, totalXP, currentLevel, pomodoroSettings } = useApp();

  const [phase, setPhase] = useState<Phase>('work');
  const [running, setRunning] = useState(false);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [totalFocus, setTotalFocus] = useState(0);

  const getPhaseDuration = useCallback((p: Phase) => {
    switch (p) {
      case 'work': return pomodoroSettings.workMinutes * 60;
      case 'short-break': return pomodoroSettings.shortBreak * 60;
      case 'long-break': return pomodoroSettings.longBreak * 60;
    }
  }, [pomodoroSettings]);

  const [secondsLeft, setSecondsLeft] = useState(() => getPhaseDuration('work'));

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Reanimated values for breathing background pulse
  const breathPulse = useSharedValue(1);
  const controlScale = useSharedValue(1);

  const getPhaseColor = (p: Phase): string => {
    switch (p) {
      case 'work': return colors.brand.primary;
      case 'short-break': return colors.brand.success;
      case 'long-break': return colors.brand.warning;
    }
  };

  const phaseColor = getPhaseColor(phase);
  const totalSeconds = getPhaseDuration(phase);
  const progress = 1 - secondsLeft / totalSeconds;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  // ── Breathing ambient background gradient pulse ──────────────────────────────
  useEffect(() => {
    if (running) {
      breathPulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 4000, easing: ReanimatedEasing.inOut(ReanimatedEasing.sin) }),
          withTiming(1.0, { duration: 4000, easing: ReanimatedEasing.inOut(ReanimatedEasing.sin) })
        ),
        -1,
        false
      );
    } else {
      breathPulse.value = withTiming(1, { duration: 500 });
    }
  }, [running]);

  const backgroundPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathPulse.value }],
    opacity: running ? 0.35 : 0.15,
  }));

  // ── countdown tick ──
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          handlePhaseEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, pomodoroSettings]);

  const handlePhaseEnd = useCallback(() => {
    if (phase === 'work') {
      const newRounds = roundsCompleted + 1;
      setRoundsCompleted(newRounds);
      addFocusMinutes(pomodoroSettings.workMinutes);
      setTotalFocus(t => t + pomodoroSettings.workMinutes);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (newRounds % ROUNDS_BEFORE_LONG === 0) {
        setPhase('long-break');
        setSecondsLeft(pomodoroSettings.longBreak * 60);
        scheduleInstant('☕ Long Break Time!', `You've completed ${newRounds} rounds. Take ${pomodoroSettings.longBreak} minutes to recharge.`).catch(() => {});
      } else {
        setPhase('short-break');
        setSecondsLeft(pomodoroSettings.shortBreak * 60);
        scheduleInstant('🌿 Short Break', `Work session done! Rest for ${pomodoroSettings.shortBreak} minutes.`).catch(() => {});
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPhase('work');
      setSecondsLeft(pomodoroSettings.workMinutes * 60);
      scheduleInstant('⚡ Back to Work!', 'Break over. Lock in for the next deep work session.').catch(() => {});
    }
  }, [phase, roundsCompleted, pomodoroSettings, addFocusMinutes]);

  const handleStartPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(r => !r);
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setPhase('work');
    setSecondsLeft(pomodoroSettings.workMinutes * 60);
    setRoundsCompleted(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const skipPhase = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    if (phase === 'work') {
      const newRounds = roundsCompleted + 1;
      setRoundsCompleted(newRounds);
      if (newRounds % ROUNDS_BEFORE_LONG === 0) {
        setPhase('long-break');
        setSecondsLeft(pomodoroSettings.longBreak * 60);
      } else {
        setPhase('short-break');
        setSecondsLeft(pomodoroSettings.shortBreak * 60);
      }
    } else {
      setPhase('work');
      setSecondsLeft(pomodoroSettings.workMinutes * 60);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const currentRoundInCycle = roundsCompleted % ROUNDS_BEFORE_LONG;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Immersive Breathing background glow */}
      <View style={styles.breathingGlowContainer}>
        <AnimatedReanimated.View style={[styles.breathingGlow, { backgroundColor: phaseColor }, backgroundPulseStyle]} />
      </View>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Focus Timer</Text>
        <View style={[styles.lvlBadge, { backgroundColor: phaseColor }]}>
          <Text style={styles.lvlBadgeText}>LVL {currentLevel}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Phase badge ── */}
        <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '15', borderColor: phaseColor + '35' }]}>
          <Ionicons name={PHASE_ICONS[phase]} size={14} color={phaseColor} />
          <Text style={[styles.phaseLabel, { color: phaseColor }]}>{PHASE_LABELS[phase]}</Text>
        </View>

        {/* ── Timer ring ── */}
        <View style={styles.ringContainer}>
          <CircularRing pct={progress} size={230} strokeW={12} color={phaseColor}>
            <GlassCard intensity={35} style={styles.ringGlass}>
              <Text style={[styles.timeDisplay, { color: colors.text }]}>{timeStr}</Text>
              <Text style={[styles.timeSub, { color: phaseColor }]}>
                {phase === 'work'
                  ? `Round ${currentRoundInCycle + 1} of ${ROUNDS_BEFORE_LONG}`
                  : phase === 'short-break' ? 'Rest & recover' : 'Full recharge'}
              </Text>
            </GlassCard>
          </CircularRing>
        </View>

        {/* ── Round dots ── */}
        <View style={styles.roundRow}>
          <Text style={[styles.roundLabel, { color: colors.textMuted }]}>ROUND</Text>
          <RoundDots
            total={ROUNDS_BEFORE_LONG}
            completed={currentRoundInCycle}
            current={phase === 'work' && running}
            activeColor={phaseColor}
          />
          <Text style={[styles.roundLabel, { color: colors.textMuted }]}>{roundsCompleted} DONE</Text>
        </View>

        {/* ── Controls ── */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleReset} style={[styles.controlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleStartPause}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[phaseColor, colors.brand.primaryLight]}
              style={[styles.mainBtn, { shadowColor: phaseColor }]}
            >
              <Ionicons name={running ? 'pause' : 'play'} size={32} color="#fff" style={{ marginLeft: running ? 0 : 4 }} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={skipPhase} style={[styles.controlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
            <Ionicons name="play-skip-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Stats row ── */}
        {(totalFocus > 0 || roundsCompleted > 0) && (
          <View style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: colors.brand.primaryGlowSoft, borderColor: colors.brand.primary + '30' }]}>
              <Ionicons name="flash" size={13} color={colors.brand.primary} />
              <Text style={[styles.statPillText, { color: colors.brand.primary }]}>{totalFocus} min logged</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: colors.brand.success + '15', borderColor: colors.brand.success + '30' }]}>
              <Ionicons name="checkmark-circle" size={13} color={colors.brand.success} />
              <Text style={[styles.statPillText, { color: colors.brand.success }]}>{roundsCompleted} sessions</Text>
            </View>
          </View>
        )}

        {/* ── Cycle Info Card ── */}
        <GlassCard intensity={25} style={styles.cycleCardGlass}>
          <View style={styles.cycleCardContent}>
            <Text style={[styles.cycleTitle, { color: colors.textSecondary }]}>POMODORO CYCLE</Text>
            <View style={styles.cycleRow}>
              {[
                { label: `Work`, val: `${pomodoroSettings.workMinutes}m`, color: colors.brand.primary },
                { label: `Short Break`, val: `${pomodoroSettings.shortBreak}m`, color: colors.brand.success },
                { label: `Long Break`, val: `${pomodoroSettings.longBreak}m`, color: colors.brand.warning },
              ].map(item => (
                <View key={item.label} style={[styles.cycleItem, { backgroundColor: item.color + '10', borderColor: item.color + '25' }]}>
                  <Text style={[styles.cycleVal, { color: item.color }]}>{item.val}</Text>
                  <Text style={[styles.cycleLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.configLink}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.configLinkText, { color: colors.textSecondary }]}>Configure in settings</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* ── Focus Tips ── */}
        <View style={styles.tipsCard}>
          {[
            { icon: '📵', tip: 'Silence notifications. Place phone face-down.' },
            { icon: '🎯', tip: 'Single-task only. Avoid context-switching.' },
            { icon: '🌊', tip: 'Sync your breathing to the pulsing light gradient.' },
          ].map(({ icon, tip }) => (
            <View key={tip} style={[styles.tipRow, { borderLeftColor: phaseColor }]}>
              <Text style={{ fontSize: 14 }}>{icon}</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  lvlBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  lvlBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
  scroll: { paddingHorizontal: 20, alignItems: 'center', gap: 28 },
  
  // Breathing background glow
  breathingGlowContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  breathingGlow: {
    width: 280,
    height: 280,
    borderRadius: 999,
    filter: Platform.OS === 'ios' ? 'blur(60px)' : undefined, // blur filter on web/iOS
    opacity: 0.25,
  },

  phaseBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  phaseLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  
  // Timer ring
  ringContainer: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringGlass: {
    width: 194,
    height: 194,
    borderRadius: 97,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  timeDisplay: { fontSize: 50, fontFamily: 'Inter_700Bold', letterSpacing: -2, lineHeight: 56 },
  timeSub: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  roundRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  roundLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  controlBtn: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  mainBtn: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  statPillText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  cycleCardGlass: { width: '100%' },
  cycleCardContent: { padding: 16, gap: 12 },
  cycleTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  cycleRow: { flexDirection: 'row', gap: 8 },
  cycleItem: {
    flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 4, borderColor: 'rgba(255,255,255,0.06)'
  },
  cycleVal: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  cycleLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  configLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingTop: 4,
  },
  configLinkText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  tipsCard: { width: '100%', gap: 10, paddingHorizontal: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderLeftWidth: 2, paddingLeft: 12 },
  tipText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 19 },
});
