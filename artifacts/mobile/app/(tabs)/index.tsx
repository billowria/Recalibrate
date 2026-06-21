import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, BADGES, CorrelationInsight } from '@/context/AppContext';

const { width: SW } = Dimensions.get('window');

// ─── LOCAL DATE (timezone-safe) ───────────────────────────────────────────────
function getLocalToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#07071a',
  surface: '#0d0d24',
  surfaceHigh: '#12122e',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  accent: '#6C63FF',
  accentLight: '#8B85FF',
  text: '#F4F4FF',
  textSub: '#9898B8',
  textDim: '#3a3a5e',
  green: '#00E5A0',
  greenDim: '#00E5A015',
  red: '#FF4D6A',
  redDim: '#FF4D6A15',
  amber: '#FFB830',
  amberDim: '#FFB83015',
  purple: '#A855F7',
  purpleDim: '#A855F715',
};

const SCORE_WEIGHTS = [
  { label: 'Build habits', pct: 38, color: C.green },
  { label: 'Reduce habits', pct: 32, color: C.red },
  { label: 'Focus bonus', pct: 10, color: C.accent },
  { label: 'Monitoring', pct: 20, color: C.amber },
];

// ─── Animated number (count-up) ───────────────────────────────────────────────
function CountUp({ target, color, size }: { target: number; color: string; size: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 35));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setVal(current);
      if (current >= target) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [target]);
  return <Text style={{ fontSize: size, fontFamily: 'Inter_700Bold', color, letterSpacing: -2 }}>{val}</Text>;
}

// ─── XP Float pop ────────────────────────────────────────────────────────────
function XPFloat({ xp, onDone }: { xp: number; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, tension: 180, friction: 5, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(anim, { toValue: 2, duration: 250, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1.5, 2], outputRange: [0, 1, 1, 0] });
  const ty = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [4, -28, -52] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1, 2], outputRange: [0.4, 1.4, 1, 0.7] });
  return (
    <Animated.View style={{ position: 'absolute', top: -6, right: 6, zIndex: 99, opacity, transform: [{ translateY: ty }, { scale }] }}>
      <View style={styles.xpFloat}>
        <Ionicons name="flash" size={10} color="#000" />
        <Text style={styles.xpFloatText}>+{xp} XP</Text>
      </View>
    </Animated.View>
  );
}

// ─── Habit row ────────────────────────────────────────────────────────────────
function HabitRow({ metric, value, onToggle, index }: { metric: any; value: number | undefined; onToggle: () => void; index: number }) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const [showXP, setShowXP] = useState(false);
  const prevVal = useRef(value);

  useEffect(() => {
    Animated.spring(enterAnim, { toValue: 1, friction: 8, tension: 60, delay: index * 45, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (prevVal.current !== value && value !== undefined) {
      Animated.sequence([
        Animated.spring(bounceAnim, { toValue: 0.93, tension: 400, friction: 4, useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
      ]).start();
      const done = metric.category === 'build' ? value > 0 : metric.category === 'reduce' ? value === 0 : true;
      if (done) setShowXP(true);
    }
    prevVal.current = value;
  }, [value]);

  const done = metric.category === 'build' ? value === 1 : metric.category === 'reduce' ? value === 0 : value !== undefined;
  const bad = metric.category === 'reduce' && value !== undefined && value > 0;
  const ringColor = bad ? C.red : done ? C.green : C.textDim;
  const nameColor = bad ? C.red : done ? C.green : C.text;

  return (
    <Animated.View style={{
      opacity: enterAnim,
      transform: [
        { scale: bounceAnim },
        { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      ]
    }}>
      {showXP && <XPFloat xp={5} onDone={() => setShowXP(false)} />}
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(); }}
        style={[styles.habitRow, {
          backgroundColor: bad ? C.redDim : done ? C.greenDim : C.glass,
          borderColor: bad ? C.red + '50' : done ? C.green + '50' : C.glassBorder,
        }]}
        activeOpacity={0.75}
      >
        <View style={[styles.habitCheck, { borderColor: ringColor, backgroundColor: done || bad ? ringColor : 'transparent' }]}>
          {done && <Ionicons name={bad ? 'close' : 'checkmark'} size={11} color="#000" />}
        </View>
        <Text style={styles.habitEmoji}>{metric.emoji ?? '📊'}</Text>
        <Text style={[styles.habitName, { color: nameColor, textDecorationLine: done && !bad ? 'line-through' : 'none' }]} numberOfLines={1}>
          {metric.name}
        </Text>
        {value !== undefined && metric.inputType !== 'boolean' && (
          <Text style={[styles.habitVal, { color: done ? C.green : C.textSub }]}>{value}{metric.unitLabel ? ` ${metric.unitLabel}` : ''}</Text>
        )}
        {value === undefined && <Text style={styles.habitTap}>tap</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Heatmap dot ──────────────────────────────────────────────────────────────
function HeatDot({ date, score, isToday, isFuture, delay }: { date: string; score: number | null; isToday: boolean; isFuture: boolean; delay: number }) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, delay, useNativeDriver: true }).start();
  }, []);

  const d = new Date(date + 'T12:00:00');
  const dayL = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
  const dayN = d.getDate();

  // Color synced with Activity Calendar
  let dotColor = C.surfaceHigh;
  let isUnlogged = score === null;
  if (!isUnlogged) {
    if (score >= 70) dotColor = C.green;
    else if (score >= 40) dotColor = C.amber;
    else dotColor = C.red;
  }

  return (
    <View style={{ alignItems: 'center', gap: 7, flex: 1, opacity: isFuture ? 0.35 : 1 }}>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: C.textDim, letterSpacing: 0.5 }}>{dayL}</Text>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: isUnlogged ? 'transparent' : dotColor,
          borderWidth: isUnlogged ? 1 : (isToday ? 2 : 0),
          borderStyle: isUnlogged && !isToday ? 'dashed' : 'solid',
          borderColor: isUnlogged && !isToday ? C.glassBorder : isToday && isUnlogged ? C.accentLight : isToday ? C.accentLight : 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {isToday && isUnlogged && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accentLight + '50' }} />
          )}
        </View>
      </Animated.View>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: isToday ? C.accentLight : !isUnlogged ? dotColor : C.textDim }}>
        {dayN}
      </Text>
    </View>
  );
}

// ─── Score Arc Hero ───────────────────────────────────────────────────────────
function ScoreHero({ score, completedToday, total, streak, streakColor, level, levelProgress, levelMax, totalXP }: {
  score: number; completedToday: number; total: number; streak: number; streakColor: string; level: number; levelProgress: number; levelMax: number; totalXP: number;
}) {
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const scoreColor = score >= 75 ? C.green : score >= 40 ? C.amber : C.red;
  const scoreLabel = score >= 75 ? 'ON TRACK' : score >= 40 ? 'BUILDING' : 'NEEDS FOCUS';
  const allDone = completedToday > 0 && completedToday === total;
  const xpPct = Math.round((levelProgress / levelMax) * 100);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(ringScale, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.035, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
    ])).start();
  }, []);

  const RING_SIZE = 180;
  const RING_THICKNESS = 12;

  return (
    <LinearGradient
      colors={['#10103a', '#0a0a24', '#07071a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      {/* Subtle radial glow behind score */}
      <Animated.View style={{
        position: 'absolute', width: RING_SIZE + 60, height: RING_SIZE + 60,
        borderRadius: (RING_SIZE + 60) / 2,
        backgroundColor: scoreColor, opacity: ringOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.07] }),
        top: 28, alignSelf: 'center',
      }} />

      {/* Score ring */}
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: ringScale }], opacity: ringOpacity }}>
        <Animated.View style={{
          width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
          borderWidth: RING_THICKNESS, borderColor: scoreColor,
          backgroundColor: C.surface,
          alignItems: 'center', justifyContent: 'center',
          transform: [{ scale: pulseAnim }],
          shadowColor: scoreColor, shadowOpacity: 0.55, shadowRadius: 24, elevation: 24,
        }}>
          {/* Inner dark circle */}
          <View style={{
            width: RING_SIZE - RING_THICKNESS * 2 - 12, height: RING_SIZE - RING_THICKNESS * 2 - 12,
            borderRadius: (RING_SIZE - RING_THICKNESS * 2 - 12) / 2,
            backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 0,
          }}>
            <CountUp target={score} color={scoreColor} size={52} />
            <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: scoreColor, letterSpacing: 3, marginTop: 2 }}>
              {scoreLabel}
            </Text>
            <Text style={{ fontSize: 8, fontFamily: 'Inter_500Medium', color: C.textDim, letterSpacing: 2, marginTop: 1 }}>
              DISCIPLINE
            </Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Stat pills row */}
      <Animated.View style={[styles.heroPillsRow, { opacity: ringOpacity }]}>
        {/* Level */}
        <View style={styles.heroPill}>
          <Ionicons name="layers-outline" size={16} color={C.accent} />
          <View>
            <Text style={[styles.heroPillNum, { color: C.text }]}>LVL {level}</Text>
            <Text style={[styles.heroPillLabel, { color: C.textSub }]}>{xpPct}% to next</Text>
          </View>
        </View>
        <View style={styles.heroPillDivider} />
        {/* XP */}
        <View style={styles.heroPill}>
          <Ionicons name="flash" size={16} color={C.amber} />
          <View>
            <Text style={[styles.heroPillNum, { color: C.text }]}>{totalXP.toLocaleString()}</Text>
            <Text style={[styles.heroPillLabel, { color: C.textSub }]}>Total XP</Text>
          </View>
        </View>
        <View style={styles.heroPillDivider} />
        {/* Streak */}
        <View style={styles.heroPill}>
          <Text style={{ fontSize: 16 }}>🔥</Text>
          <View>
            <Text style={[styles.heroPillNum, { color: streakColor }]}>{streak}</Text>
            <Text style={[styles.heroPillLabel, { color: C.textSub }]}>Day streak</Text>
          </View>
        </View>
      </Animated.View>

      {/* Level progress bar */}
      <Animated.View style={[{ gap: 6 }, { opacity: ringOpacity }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: C.textSub, letterSpacing: 1 }}>XP PROGRESS</Text>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: C.accent }}>{levelProgress}/{levelMax}</Text>
        </View>
        <View style={styles.xpBar}>
          <Animated.View style={[styles.xpBarFill, {
            width: `${xpPct}%` as any,
          }]} />
        </View>
      </Animated.View>

      {/* Habits today bar */}
      <Animated.View style={[{ gap: 8 }, { opacity: ringOpacity }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: C.textSub, letterSpacing: 1 }}>HABITS TODAY</Text>
          <View style={[styles.habitsCountBadge, { backgroundColor: allDone ? C.greenDim : 'rgba(108,99,255,0.12)', borderColor: allDone ? C.green + '40' : C.accent + '40' }]}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: allDone ? C.green : C.accent }}>
              {completedToday}/{total}
            </Text>
            {allDone && <Text style={{ fontSize: 10 }}>🏆</Text>}
          </View>
        </View>
        <View style={styles.segBar}>
          {Array.from({ length: Math.min(total, 14) }).map((_, i) => (
            <View key={i} style={[styles.seg, { flex: 1, backgroundColor: i < completedToday ? C.green : C.surfaceHigh }]} />
          ))}
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

// ─── Insight pill ─────────────────────────────────────────────────────────────
function InsightPill({ insight }: { insight: CorrelationInsight }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    fadeAnim.setValue(0); slideAnim.setValue(8);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [insight.id]);
  const typeLabel = insight.type === 'correlation' ? 'INSIGHT' : insight.type === 'streak' ? 'STREAK' : insight.type === 'trend' ? 'TREND' : 'TODAY';
  return (
    <Animated.View style={[styles.insightCard, { borderColor: insight.color + '35', backgroundColor: insight.color + '0C', opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.insightIcon, { backgroundColor: insight.color + '20' }]}>
        <Text style={{ fontSize: 18 }}>{insight.icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.insightTypeBadge, { backgroundColor: insight.color + '22' }]}>
            <Text style={{ fontSize: 8, fontFamily: 'Inter_700Bold', color: insight.color, letterSpacing: 2 }}>{typeLabel}</Text>
          </View>
        </View>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightBody}>{insight.body}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function Sec({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
      <Text style={styles.secLabel}>{label}</Text>
      {right}
    </View>
  );
}

// ─── Glass card ───────────────────────────────────────────────────────────────
function Glass({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const {
    disciplineScore, metrics, logMetric, getLogForDate, getLogsForDate,
    profile, totalXP, currentLevel, levelProgress, levelMax,
    currentStreak, graceStreakActive, highestStreak, badges,
    focusMinutesToday, journalEntries, getStreakRisk,
    correlationInsights, availablePrograms, getProgramProgress,
  } = useApp();

  // ─ Timezone-safe today ─
  const today = useMemo(() => getLocalToday(), []);
  const now = new Date();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [insightIdx, setInsightIdx] = useState(0);
  const [formulaOpen, setFormulaOpen] = useState(false);

  const streakRisk = getStreakRisk();
  const todayJournal = journalEntries.find(e => e.date === today);
  const currentInsight = correlationInsights.length > 0 ? correlationInsights[insightIdx % correlationInsights.length] : null;
  const enrolledPrograms = availablePrograms.filter(p => profile.activeProgramIds.includes(p.id));

  const [weekOffset, setWeekOffset] = useState(0);

  const completedToday = useMemo(() => metrics.filter(m => {
    const log = getLogForDate(m.id, today);
    if (!log) return false;
    if (m.category === 'build') return log.value > 0;
    if (m.category === 'reduce') return log.value === 0;
    return !!log;
  }).length, [metrics, getLogForDate, today]);

  // Monday to Sunday week dates — synced with Activity Calendar
  const currentWeekDays = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    const day = localDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const diffToMonday = localDate.getDate() - day + (day === 0 ? -6 : 1);
    
    // Apply week offset
    const monday = new Date(y, m - 1, diffToMonday + (weekOffset * 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const ty = temp.getFullYear();
      const tm = String(temp.getMonth() + 1).padStart(2, '0');
      const td = String(temp.getDate()).padStart(2, '0');
      const dateStr = `${ty}-${tm}-${td}`;

      const isFuture = dateStr > today;

      // Calculate score for this date
      const logs = getLogsForDate ? getLogsForDate(dateStr) : [];
      let score: number | null = null;
      if (logs.length > 0) {
        const completed = logs.filter(l => {
          const metric = metrics.find(m => m.id === l.metricId);
          if (!metric) return false;
          if (metric.category === 'build') return l.value > 0;
          if (metric.category === 'reduce') return l.value === 0;
          return true;
        }).length;
        score = Math.round((completed / Math.max(logs.length, 1)) * 100);
      }

      days.push({
        date: dateStr,
        score,
        isToday: dateStr === today,
        isFuture,
      });
    }
    return days;
  }, [metrics, getLogsForDate, today, weekOffset]);

  const streakColor = currentStreak >= 30 ? C.amber : currentStreak >= 14 ? C.green : currentStreak >= 7 ? C.accentLight : C.textSub;

  const hour = now.getHours();
  const greeting = hour < 5 ? 'Night owl' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const name = profile.name || 'there';

  const handleToggle = useCallback((metric: any) => {
    const log = getLogForDate(metric.id, today);
    if (metric.inputType === 'boolean') {
      logMetric(metric.id, today, log?.value === 1 ? 0 : 1);
    } else {
      router.push('/(tabs)/track');
    }
  }, [getLogForDate, today, logMetric]);

  // Page entrance
  const pageAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pageAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);

  return (
    <ScrollView
      style={[styles.root]}
      contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 8, paddingBottom: Platform.OS === 'web' ? 140 : 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── HEADER ─── */}
      <Animated.View style={[styles.header, {
        opacity: pageAnim,
        transform: [{ translateY: pageAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
      }]}>
        <View>
          <Text style={styles.greeting}>{greeting}, {name}</Text>
          <Text style={styles.dateStr}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => router.push('/pomodoro')} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="timer-outline" size={18} color={C.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/calendar')} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={18} color={C.accent} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ─── ALERT BANNERS ─── */}
      {graceStreakActive && (
        <View style={[styles.banner, { backgroundColor: C.amberDim, borderColor: C.amber + '50' }]}>
          <Text style={{ fontSize: 18 }}>🌿</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: C.amber }]}>Grace Day Active</Text>
            <Text style={styles.bannerBody}>Streak protected. Log today to keep it.</Text>
          </View>
        </View>
      )}
      {streakRisk && currentStreak > 0 && !graceStreakActive && (
        <View style={[styles.banner, { backgroundColor: C.redDim, borderColor: C.red + '50' }]}>
          <Ionicons name="flame-outline" size={20} color={C.red} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: C.red }]}>Streak at Risk</Text>
            <Text style={styles.bannerBody}>Log now to protect your {currentStreak}-day streak.</Text>
          </View>
        </View>
      )}

      {/* ─── HERO SCORE ─── */}
      <Animated.View style={{ opacity: pageAnim, transform: [{ scale: pageAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }}>
        <ScoreHero
          score={disciplineScore}
          completedToday={completedToday}
          total={metrics.length}
          streak={currentStreak}
          streakColor={streakColor}
          level={currentLevel}
          levelProgress={levelProgress}
          levelMax={levelMax}
          totalXP={totalXP}
        />
      </Animated.View>

      {/* Score formula */}
      <TouchableOpacity
        onPress={() => { setFormulaOpen(p => !p); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        style={styles.formulaToggle}
        activeOpacity={0.7}
      >
        <Ionicons name="information-circle-outline" size={14} color={C.textDim} />
        <Text style={styles.formulaToggleText}>{formulaOpen ? 'Hide formula' : 'How is my score calculated?'}</Text>
        <Ionicons name={formulaOpen ? 'chevron-up' : 'chevron-down'} size={13} color={C.textDim} />
      </TouchableOpacity>
      {formulaOpen && (
        <Glass>
          <Text style={[styles.secLabel, { marginBottom: 10 }]}>SCORE FORMULA</Text>
          {SCORE_WEIGHTS.map(w => (
            <View key={w.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: C.textSub, width: 96 }}>{w.label}</Text>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.surfaceHigh, overflow: 'hidden' }}>
                <View style={{ width: `${w.pct}%` as any, height: 6, borderRadius: 3, backgroundColor: w.color }} />
              </View>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: w.color, width: 32, textAlign: 'right' }}>{w.pct}%</Text>
            </View>
          ))}
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: C.textDim, lineHeight: 14, marginTop: 4 }}>
            Focus bonus adds up to +10 pts for 90+ min of deep work.
          </Text>
        </Glass>
      )}

      {/* ─── INSIGHTS ─── */}
      {currentInsight && (
        <View style={{ gap: 10 }}>
          <Sec label="INTELLIGENCE" right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {correlationInsights.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setInsightIdx(i)}>
                  <View style={{
                    height: 6, borderRadius: 3,
                    width: i === insightIdx % correlationInsights.length ? 18 : 6,
                    backgroundColor: i === insightIdx % correlationInsights.length ? C.accent : C.textDim,
                  }} />
                </TouchableOpacity>
              ))}
              {correlationInsights.length > 1 && (
                <TouchableOpacity
                  onPress={() => { setInsightIdx(p => (p + 1) % correlationInsights.length); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{ backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.glassBorder, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}
                >
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: C.textSub }}>Next →</Text>
                </TouchableOpacity>
              )}
            </View>
          } />
          <InsightPill key={currentInsight.id} insight={currentInsight} />
        </View>
      )}

      {/* ─── HEATMAP ─── */}
      <Glass>
        <Sec
          label={weekOffset === 0 ? "THIS WEEK" : weekOffset === -1 ? "LAST WEEK" : `${Math.abs(weekOffset)} WEEKS AGO`}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: C.textSub }}>{currentWeekDays.filter(d => d.score !== null).length}/7 days</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWeekOffset(w => w - 1); }} style={{ padding: 4, backgroundColor: C.surfaceHigh, borderRadius: 6 }}>
                  <Ionicons name="chevron-back" size={14} color={C.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWeekOffset(w => Math.min(0, w + 1)); }} style={{ padding: 4, backgroundColor: weekOffset < 0 ? C.surfaceHigh : 'transparent', borderRadius: 6 }} disabled={weekOffset >= 0}>
                  <Ionicons name="chevron-forward" size={14} color={weekOffset < 0 ? C.text : C.textDim} />
                </TouchableOpacity>
              </View>
            </View>
          }
        />
        <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
          {currentWeekDays.map(({ date, score, isToday, isFuture }, i) => (
            <HeatDot key={date} date={date} score={score} isToday={isToday} isFuture={isFuture} delay={i * 55} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 12 }}>
          {[
            { color: C.green, l: 'Strong (70%+)', empty: false },
            { color: C.amber, l: 'Building (40%+)', empty: false },
            { color: C.red, l: 'Needs work', empty: false },
            { color: C.glassBorder, l: 'Unlogged', empty: true }
          ].map(({ color, l, empty }) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: empty ? 'transparent' : color, borderWidth: empty ? 1 : 0, borderColor: color, borderStyle: empty ? 'dashed' : 'solid' }} />
              <Text style={{ fontSize: 9, fontFamily: 'Inter_500Medium', color: C.textDim }}>{l}</Text>
            </View>
          ))}
        </View>
      </Glass>

      {/* ─── ACTIVE PROGRAMS ─── */}
      {enrolledPrograms.length > 0 && (
        <View style={{ gap: 8 }}>
          <Sec label="ACTIVE PROGRAMS" right={
            <TouchableOpacity onPress={() => router.push('/(tabs)/program')} activeOpacity={0.7}>
              <Text style={styles.linkText}>Manage →</Text>
            </TouchableOpacity>
          } />
          {enrolledPrograms.map(prog => {
            const progress = getProgramProgress(prog.id);
            if (!progress) return null;
            const pct = (progress.completedWeeks.length / prog.totalWeeks) * 100;
            return (
              <TouchableOpacity
                key={prog.id}
                onPress={() => router.push('/(tabs)/program')}
                style={[styles.programCard, { borderColor: prog.color + '40', backgroundColor: prog.color + '0C' }]}
                activeOpacity={0.8}
              >
                <View style={[styles.programIconWrap, { backgroundColor: prog.color + '25' }]}>
                  <Text style={{ fontSize: 22 }}>{prog.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.programTitle} numberOfLines={1}>{prog.title}</Text>
                    <View style={[styles.weekPill, { backgroundColor: prog.color }]}>
                      <Text style={styles.weekPillText}>W{progress.currentWeek}</Text>
                    </View>
                  </View>
                  <View style={[styles.progBarBg, { backgroundColor: prog.color + '25' }]}>
                    <View style={[styles.progBarFill, { width: `${pct}%` as any, backgroundColor: prog.color }]} />
                  </View>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: prog.color }}>
                    {progress.completedWeeks.length}/{prog.totalWeeks} weeks · {Math.round(pct)}% complete
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={prog.color} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ─── BADGES ─── */}
      {badges.length > 0 && (
        <View style={{ gap: 8 }}>
          <Sec label="ACHIEVEMENTS" right={
            <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: C.textSub }}>{badges.length} earned</Text>
          } />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {badges.slice(-8).map((bId, i) => {
                const badge = BADGES.find(b => b.id === bId);
                if (!badge) return null;
                return (
                  <View key={bId} style={styles.badgeCard}>
                    <Text style={{ fontSize: 22 }}>{badge.emoji}</Text>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ─── TODAY'S HABITS ─── */}
      <View style={{ gap: 8 }}>
        <Sec label="TODAY'S HABITS" right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.countBadge, {
              backgroundColor: completedToday === metrics.length && metrics.length > 0 ? C.greenDim : 'rgba(108,99,255,0.12)',
              borderColor: completedToday === metrics.length && metrics.length > 0 ? C.green + '45' : C.accent + '40',
            }]}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: completedToday === metrics.length && metrics.length > 0 ? C.green : C.accent }}>
                {completedToday}/{metrics.length}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/track')} activeOpacity={0.7}>
              <Text style={styles.linkText}>All →</Text>
            </TouchableOpacity>
          </View>
        } />

        {metrics.length === 0 ? (
          <TouchableOpacity onPress={() => router.push('/(tabs)/track')} style={styles.emptyCard} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={30} color={C.textDim} />
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.textSub }}>Add your first tracker</Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: C.textDim }}>Start small. Build consistently.</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 6 }}>
            {metrics.slice(0, 8).map((m, i) => (
              <HabitRow key={m.id} metric={m} value={getLogForDate(m.id, today)?.value} onToggle={() => handleToggle(m)} index={i} />
            ))}
            {metrics.length > 8 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/track')} style={styles.moreBtn} activeOpacity={0.7}>
                <Text style={styles.moreBtnText}>+{metrics.length - 8} more in Track →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ─── JOURNAL ─── */}
      <Glass style={{ borderColor: todayJournal ? C.purple + '40' : C.glassBorder, backgroundColor: todayJournal ? C.purpleDim : C.glass }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name={todayJournal ? 'book' : 'book-outline'} size={15} color={todayJournal ? C.purple : C.textDim} />
          <Text style={[styles.secLabel, { color: todayJournal ? C.purple : C.textDim }]}>
            {todayJournal ? 'REFLECTION DONE' : 'DAILY REFLECTION'}
          </Text>
          {todayJournal && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: C.textSub, marginLeft: 'auto' }}>
              😊 {todayJournal.mood}/10 · ⚡ {todayJournal.energy}/10
            </Text>
          )}
        </View>
        {todayJournal ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.journalPreview} numberOfLines={3}>{todayJournal.response}</Text>
            {(todayJournal.tags?.length ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {todayJournal.tags!.slice(0, 4).map(tag => (
                  <View key={tag} style={[styles.tag, { backgroundColor: C.purpleDim }]}>
                    <Text style={[styles.tagText, { color: C.purple }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/(tabs)/journal')} style={[styles.journalBtn, { borderColor: C.purple + '40' }]} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={14} color={C.purple} />
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: C.purple }}>Edit today's entry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={styles.journalPrompt}>
              {'"What did you notice about your behavior today without judgment?"'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/journal')} style={[styles.journalWriteBtn, { backgroundColor: C.purple }]} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' }}>Write entry · +25 XP</Text>
            </TouchableOpacity>
          </View>
        )}
      </Glass>

      {/* ─── QUICK ACTIONS ─── */}
      <View style={styles.quickRow}>
        {[
          { label: 'Focus', sub: focusMinutesToday > 0 ? `${focusMinutesToday}m` : 'Start', icon: 'timer-outline' as const, color: C.accent, route: '/pomodoro' },
          { label: 'Track', sub: `${completedToday}/${metrics.length}`, icon: 'checkmark-done-outline' as const, color: C.green, route: '/(tabs)/track' },
          { label: 'Journal', sub: `${journalEntries.length} entries`, icon: 'book-outline' as const, color: C.purple, route: '/(tabs)/journal' },
          { label: 'Profile', sub: `LVL ${currentLevel}`, icon: 'person-outline' as const, color: C.textSub, route: '/(tabs)/profile' },
        ].map(({ label, sub, icon, color, route }) => (
          <TouchableOpacity key={label} onPress={() => router.push(route as any)} style={[styles.quickCard, { backgroundColor: color + '10', borderColor: color + '30' }]} activeOpacity={0.8}>
            <Ionicons name={icon} size={22} color={color} />
            <Text style={[styles.quickLabel, { color }]}>{label}</Text>
            <Text style={styles.quickSub}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── RELAPSE ─── */}
      <TouchableOpacity onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); router.push('/relapse'); }} style={styles.relapseBtn} activeOpacity={0.7}>
        <Ionicons name="shield-outline" size={14} color={C.textDim} />
        <Text style={styles.relapseBtnText}>Had a setback? Reflect & Reset</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, gap: 16 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 12, fontFamily: 'Inter_500Medium', color: C.textSub, letterSpacing: 0.5 },
  dateStr: { fontSize: 22, fontFamily: 'Inter_700Bold', color: C.text, letterSpacing: -0.5, marginTop: 2 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: C.glassBorder, backgroundColor: C.glass, alignItems: 'center', justifyContent: 'center' },

  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderWidth: 1, borderRadius: 14 },
  bannerTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  bannerBody: { fontSize: 12, fontFamily: 'Inter_400Regular', color: C.textSub, lineHeight: 17, marginTop: 2 },

  // Hero
  heroCard: { borderRadius: 22, padding: 22, gap: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(108,99,255,0.18)' },
  heroPillsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.glassBorder },
  heroPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroPillNum: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  heroPillLabel: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  heroPillDivider: { width: 1, height: 28, backgroundColor: C.glassBorder },
  habitsCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  xpBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  xpBarFill: { height: 6, borderRadius: 3, backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.7, shadowRadius: 6 },
  segBar: { flexDirection: 'row', gap: 3, height: 6, overflow: 'hidden', borderRadius: 3 },
  seg: { borderRadius: 2 },

  // XP float
  xpFloat: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.green, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  xpFloatText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#000' },

  // Formula
  formulaToggle: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'center', paddingVertical: 4 },
  formulaToggleText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: C.textDim },

  // Glass card
  glassCard: { backgroundColor: C.glass, borderWidth: 1, borderColor: C.glassBorder, borderRadius: 18, padding: 16, gap: 0 },

  // Section
  secLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: C.textDim, letterSpacing: 2 },
  linkText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: C.accent },

  // Insight
  insightCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'flex-start' },
  insightIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  insightTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: C.text, lineHeight: 20 },
  insightBody: { fontSize: 12, fontFamily: 'Inter_400Regular', color: C.textSub, lineHeight: 18 },

  // Programs
  programCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  programIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  programTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: C.text, flex: 1 },
  weekPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  weekPillText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
  progBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progBarFill: { height: 4, borderRadius: 2 },

  // Badges
  badgeCard: { backgroundColor: C.glass, borderWidth: 1, borderColor: C.glassBorder, borderRadius: 14, padding: 12, alignItems: 'center', gap: 6, minWidth: 72 },
  badgeName: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: C.accentLight, textAlign: 'center' },

  // Habits
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderRadius: 14 },
  habitCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  habitEmoji: { fontSize: 16 },
  habitName: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  habitVal: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  habitTap: { fontSize: 10, fontFamily: 'Inter_400Regular', color: C.textDim },
  countBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  emptyCard: { borderWidth: 1, borderColor: C.glassBorder, borderStyle: 'dashed', borderRadius: 14, padding: 28, alignItems: 'center', gap: 8 },
  moreBtn: { alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: C.glassBorder, borderStyle: 'dashed', borderRadius: 12 },
  moreBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: C.textSub },

  // Journal
  journalPreview: { fontSize: 13, fontFamily: 'Inter_400Regular', color: C.text, lineHeight: 20 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  journalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, borderWidth: 1, borderRadius: 10, justifyContent: 'center' },
  journalPrompt: { fontSize: 14, fontFamily: 'Inter_400Regular', color: C.text, lineHeight: 22, fontStyle: 'italic' },
  journalWriteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: 8 },
  quickCard: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4, borderWidth: 1, borderRadius: 16 },
  quickLabel: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  quickSub: { fontSize: 9, fontFamily: 'Inter_400Regular', color: C.textDim, textAlign: 'center' },

  // Relapse
  relapseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderColor: C.glassBorder, borderRadius: 14 },
  relapseBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: C.textDim },
});
