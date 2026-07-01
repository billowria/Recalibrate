import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
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
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, BADGES, CorrelationInsight } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { DisciplineScoreRing } from '@/components/DisciplineScoreRing';
import { GlassCard } from '@/components/GlassCard';
import { HabitItem } from '@/components/HabitItem';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const { width: SW } = Dimensions.get('window');

// ─── LOCAL DATE (timezone-safe) ───────────────────────────────────────────────
function getLocalToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const SCORE_WEIGHTS = (colors: any) => [
  { label: 'Build habits', pct: 38, color: colors.brand.success },
  { label: 'Reduce habits', pct: 32, color: colors.brand.danger },
  { label: 'Focus bonus', pct: 10, color: colors.brand.primary },
  { label: 'Monitoring', pct: 20, color: colors.brand.warning },
];

// ─── Weekly Bar Chart ────────────────────────────────────────────────────────
interface DayData {
  date: string;
  score: number | null;
  isToday: boolean;
  isFuture: boolean;
}

function WeeklyBarChart({ days, isVisible, triggerKey }: { days: DayData[]; isVisible: boolean; triggerKey: number }) {
  const colors = useColors();
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      animationProgress.value = 0;
      animationProgress.value = withDelay(400, withSpring(1, { damping: 14, stiffness: 90 }));
    } else {
      animationProgress.value = 0;
    }
  }, [days, isVisible, triggerKey]);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingVertical: 10 }}>
      {days.map((day) => {
        const d = new Date(day.date + 'T12:00:00');
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
        const dateNum = d.getDate();

        const score = day.score ?? 0;
        const targetHeight = Math.max(8, (score / 100) * 100); 

        let barColor: string = colors.surfaceHigh;
        let isUnlogged = day.score === null;

        if (day.score !== null) {
          if (day.score >= 70) barColor = colors.brand.success;
          else if (day.score >= 40) barColor = colors.brand.warning;
          else barColor = colors.brand.danger;
        }

        const animatedStyle = useAnimatedStyle(() => {
          return {
            height: animationProgress.value * targetHeight,
          };
        });

        const animatedScoreStyle = useAnimatedStyle(() => {
          return {
            opacity: withTiming(animationProgress.value, { duration: 300 }),
            transform: [{ translateY: (1 - animationProgress.value) * 6 }],
          };
        });

        return (
          <View key={day.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', opacity: day.isFuture ? 0.35 : 1 }}>
            <View style={{ height: 120, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
              {isUnlogged ? (
                <>
                  <View style={{ marginBottom: 4, height: 16, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.textMuted }}>--</Text>
                  </View>
                  <View style={{
                    width: 14,
                    height: 12,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: day.isToday ? colors.brand.success : colors.border,
                    borderStyle: 'dashed',
                    backgroundColor: 'transparent',
                  }} />
                </>
              ) : (
                <>
                  <AnimatedReanimated.View style={[animatedScoreStyle, { marginBottom: 4, height: 16, justifyContent: 'center' }]}>
                    <Text style={{
                      fontSize: 10,
                      fontFamily: 'Inter_700Bold',
                      color: barColor,
                    }}>
                      {day.score}
                    </Text>
                  </AnimatedReanimated.View>
                  <AnimatedReanimated.View style={[
                    animatedStyle,
                    {
                      width: 14,
                      borderRadius: 7,
                      backgroundColor: barColor,
                      shadowColor: barColor,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: day.isToday ? 0.4 : 0,
                      shadowRadius: 4,
                    }
                  ]} />
                </>
              )}
            </View>

            <View style={{ marginTop: 8, alignItems: 'center', gap: 3 }}>
              <Text style={{
                fontSize: 9,
                fontFamily: day.isToday ? 'Inter_700Bold' : 'Inter_600SemiBold',
                color: day.isToday ? colors.brand.primary : colors.textDim,
                letterSpacing: 0.5
              }}>
                {dayLabel.toUpperCase()}
              </Text>
              <View style={[
                day.isToday && {
                  backgroundColor: colors.brand.primaryGlowSoft,
                  borderRadius: 8,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  borderWidth: 1,
                  borderColor: colors.brand.primary + '30',
                }
              ]}>
                <Text style={{
                  fontSize: 10,
                  fontFamily: 'Inter_700Bold',
                  color: day.isToday ? colors.brand.primary : colors.text,
                }}>
                  {dateNum}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AnimatedScoreBar({ pct, color, isVisible, delayMs, triggerKey }: { pct: number, color: string, isVisible: boolean, delayMs: number, triggerKey: number }) {
  const anim = useSharedValue(0);
  
  useEffect(() => {
    if (isVisible) {
      anim.value = 0;
      anim.value = withDelay(delayMs, withSpring(pct, { damping: 14, stiffness: 90 }));
    } else {
      anim.value = 0;
    }
  }, [pct, isVisible, triggerKey]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${anim.value}%`
    };
  });
  
  return (
    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <AnimatedReanimated.View style={[{ height: 6, borderRadius: 3, backgroundColor: color }, animatedStyle]} />
    </View>
  );
}


// ─── Score Arc Hero ───────────────────────────────────────────────────────────
function ScoreHero({ score, completedToday, total, streak, streakColor, level, levelProgress, levelMax, totalXP, isVisible, triggerKey }: {
  score: number; completedToday: number; total: number; streak: number; streakColor: string; level: number; levelProgress: number; levelMax: number; totalXP: number; isVisible: boolean; triggerKey: number;
}) {
  const colors = useColors();
  const allDone = completedToday > 0 && completedToday === total;
  const xpPct = Math.round((levelProgress / levelMax) * 100);

  return (
    <LinearGradient
      colors={colors.isDark ? ['#070A1E', '#020307'] : ['#FFFFFF', '#F0F2F5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.heroCard, { borderColor: colors.border }]}
    >
      {/* Dynamic Glow background behind the ring */}
      <View style={[styles.glowBack, { backgroundColor: colors.getScoreColor(score) + (colors.isDark ? '08' : '05') }]} />

      {/* Main Score Ring Component */}
      <View style={{ alignItems: 'center', marginVertical: 10 }}>
        <DisciplineScoreRing
          score={score}
          size={190}
          strokeWidth={12}
          showLabel={true}
          showContext={true}
          contextText="Today's Rating"
          isVisible={isVisible}
          triggerKey={triggerKey}
        />
      </View>

      {/* Stat pills row (Translucent glass style) */}
      <View style={[
        styles.heroPillsRow, 
        { 
          backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', 
          borderColor: colors.isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)' 
        }
      ]}>
        {/* Level */}
        <View style={styles.heroPill}>
          <Ionicons name="layers-outline" size={16} color={colors.brand.primary} />
          <View style={{ marginLeft: 6 }}>
            <Text style={[styles.heroPillNum, { color: colors.isDark ? '#FFFFFF' : colors.text }]}>LVL {level}</Text>
            <Text style={[styles.heroPillLabel, { color: colors.isDark ? 'rgba(255,255,255,0.5)' : colors.textSecondary }]}>{xpPct}% to next</Text>
          </View>
        </View>
        <View style={[styles.heroPillDivider, { backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border }]} />
        {/* XP */}
        <View style={styles.heroPill}>
          <Ionicons name="flash" size={16} color={colors.brand.warning} />
          <View style={{ marginLeft: 6 }}>
            <Text style={[styles.heroPillNum, { color: colors.isDark ? '#FFFFFF' : colors.text }]}>{totalXP.toLocaleString()}</Text>
            <Text style={[styles.heroPillLabel, { color: colors.isDark ? 'rgba(255,255,255,0.5)' : colors.textSecondary }]}>Total XP</Text>
          </View>
        </View>
        <View style={[styles.heroPillDivider, { backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border }]} />
        {/* Streak */}
        <View style={styles.heroPill}>
          <Text style={{ fontSize: 16 }}>🔥</Text>
          <View style={{ marginLeft: 6 }}>
            <Text style={[styles.heroPillNum, { color: streakColor }]}>{streak}</Text>
            <Text style={[styles.heroPillLabel, { color: colors.isDark ? 'rgba(255,255,255,0.5)' : colors.textSecondary }]}>Day streak</Text>
          </View>
        </View>
      </View>

      {/* Level progress bar (Sleek and thin) */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: colors.isDark ? 'rgba(255, 255, 255, 0.5)' : colors.textMuted, letterSpacing: 1 }}>XP PROGRESS</Text>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.isDark ? '#FFFFFF' : colors.text }}>{levelProgress}/{levelMax}</Text>
        </View>
        <View style={[styles.xpBar, { height: 3, backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }]}>
          <View style={[styles.xpBarFill, { height: 3, width: `${xpPct}%` as any, backgroundColor: colors.brand.primary }]} />
        </View>
      </View>

      {/* Habits today bar (Sleek and thin) */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: colors.isDark ? 'rgba(255, 255, 255, 0.5)' : colors.textMuted, letterSpacing: 1 }}>HABITS COMPLETED</Text>
          <View style={[styles.habitsCountBadge, {
            backgroundColor: allDone ? (colors.isDark ? 'rgba(0, 214, 143, 0.1)' : 'rgba(0, 214, 143, 0.06)') : (colors.isDark ? 'rgba(91, 94, 255, 0.1)' : 'rgba(91, 94, 255, 0.06)'),
            borderColor: allDone ? (colors.isDark ? 'rgba(0, 214, 143, 0.25)' : 'rgba(0, 214, 143, 0.15)') : (colors.isDark ? 'rgba(91, 94, 255, 0.25)' : 'rgba(91, 94, 255, 0.15)'),
          }]}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: allDone ? colors.brand.success : colors.brand.primary }}>
              {completedToday}/{total}
            </Text>
            {allDone && <Text style={{ fontSize: 10 }}>🏆</Text>}
          </View>
        </View>
        <View style={[styles.segBar, { height: 3, backgroundColor: 'transparent' }]}>
          {Array.from({ length: Math.max(total, 1) }).map((_, i) => (
            <View key={i} style={[styles.seg, { flex: 1, height: 3, backgroundColor: i < completedToday ? colors.brand.success : (colors.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)') }]} />
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

// Removed InsightPill component to clean up dashboard.

// ─── Section header ───────────────────────────────────────────────────────────
function Sec({ label, right }: { label: string; right?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, paddingHorizontal: 2 }}>
      <Text style={[styles.secLabel, { color: colors.textMuted }]}>{label}</Text>
      {right}
    </View>
  );
}

// ─── Main Dashboard Screen ────────────────────────────────────────────────────
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    disciplineScore, metrics, logMetric, getLogForDate, getLogsForDate,
    profile, totalXP, currentLevel, levelProgress, levelMax,
    currentStreak, graceStreakActive, highestStreak, badges,
    focusMinutesToday, journalEntries, getStreakRisk,
    correlationInsights, availablePrograms, getProgramProgress,
  } = useApp();

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

  // Tab switch logic
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusKey(prev => prev + 1);
    }, [])
  );

  // Visibility tracking
  const [scoreRingY, setScoreRingY] = useState(0);
  const [scoreRingVisible, setScoreRingVisible] = useState(false);
  const [chartY, setChartY] = useState(0);
  const [chartVisible, setChartVisible] = useState(false);
  const [scoreWeightsY, setScoreWeightsY] = useState(0);
  const [scoreWeightsVisible, setScoreWeightsVisible] = useState(false);

  const checkVisibility = useCallback((scrollY: number, ringY = scoreRingY, cY = chartY, swY = scoreWeightsY) => {
    const screenHeight = Dimensions.get('window').height;
    const trigger = scrollY + screenHeight - 120;
    if (trigger >= ringY) setScoreRingVisible(true);
    if (trigger >= cY) setChartVisible(true);
    if (trigger >= swY) setScoreWeightsVisible(true);
  }, [scoreRingY, chartY, scoreWeightsY]);

  const completedToday = useMemo(() => metrics.filter(m => {
    const log = getLogForDate(m.id, today);
    if (!log) return false;
    if (m.category === 'build') return log.value > 0;
    if (m.category === 'reduce') return log.value === 0;
    return !!log;
  }).length, [metrics, getLogForDate, today]);

  const currentWeekDays = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    const day = localDate.getDay();
    const diffToMonday = localDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(y, m - 1, diffToMonday + (weekOffset * 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const ty = temp.getFullYear();
      const tm = String(temp.getMonth() + 1).padStart(2, '0');
      const td = String(temp.getDate()).padStart(2, '0');
      const dateStr = `${ty}-${tm}-${td}`;

      const isFuture = dateStr > today;
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

      days.push({ date: dateStr, score, isToday: dateStr === today, isFuture });
    }
    return days;
  }, [metrics, getLogsForDate, today, weekOffset]);

  const streakColor = currentStreak >= 30 ? colors.brand.xp : currentStreak >= 14 ? colors.brand.success : currentStreak >= 7 ? colors.brand.primaryLight : colors.textSecondary;

  const hour = now.getHours();
  const greeting = hour < 5 ? 'Night owl' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const name = profile.name || 'there';

  const handleToggle = useCallback((metricId: string, value: number) => {
    logMetric(metricId, today, value);
  }, [today, logMetric]);

  const pageAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pageAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 8, paddingBottom: Platform.OS === 'web' ? 140 : 120 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => checkVisibility(e.nativeEvent.contentOffset.y)}
      >
        {/* ─── HEADER ─── */}
      <Animated.View style={[styles.header, {
        opacity: pageAnim,
        transform: [{ translateY: pageAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
      }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting}, {name}</Text>
          <Text style={[styles.dateStr, { color: colors.text }]}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => router.push('/pomodoro')} style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
            <Ionicons name="timer-outline" size={18} color={colors.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/coach')} style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
            <Ionicons name="sparkles" size={18} color={colors.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/calendar')} style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={18} color={colors.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
            <Ionicons name="person-outline" size={18} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ─── ALERT BANNERS ─── */}
      {graceStreakActive && (
        <View style={[styles.banner, { backgroundColor: colors.brand.warning + '12', borderColor: colors.brand.warning + '35' }]}>
          <Text style={{ fontSize: 18 }}>🌿</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.brand.warning }]}>Grace Day Active</Text>
            <Text style={[styles.bannerBody, { color: colors.textSecondary }]}>Streak protected. Log today to keep it.</Text>
          </View>
        </View>
      )}
      {streakRisk && currentStreak > 0 && !graceStreakActive && (
        <View style={[styles.banner, { backgroundColor: colors.brand.danger + '12', borderColor: colors.brand.danger + '35' }]}>
          <Ionicons name="flame-outline" size={20} color={colors.brand.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.brand.danger }]}>Streak at Risk</Text>
            <Text style={[styles.bannerBody, { color: colors.textSecondary }]}>Log now to protect your {currentStreak}-day streak.</Text>
          </View>
        </View>
      )}

      {/* ─── HERO SCORE ─── */}
      <Animated.View
        onLayout={(e) => {
          const y = e.nativeEvent.layout.y;
          setScoreRingY(y);
          checkVisibility(0, y, chartY, scoreWeightsY);
        }}
        style={{ opacity: pageAnim, transform: [{ scale: pageAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }}
      >
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
          isVisible={scoreRingVisible}
          triggerKey={focusKey}
        />
      </Animated.View>

      {/* Score formula toggle */}
      <TouchableOpacity
        onPress={() => { setFormulaOpen(p => !p); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        style={styles.formulaToggle}
        activeOpacity={0.7}
      >
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.formulaToggleText, { color: colors.textSecondary }]}>{formulaOpen ? 'Hide details' : 'How is my score calculated?'}</Text>
        <Ionicons name={formulaOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textMuted} />
      </TouchableOpacity>
      
      {formulaOpen && (
        <View onLayout={(e) => {
          const y = e.nativeEvent.layout.y;
          setScoreWeightsY(y);
          checkVisibility(0, scoreRingY, chartY, y);
        }}>
          <GlassCard intensity={30}>
            <View style={{ padding: 16, gap: 12 }}>
              <Text style={[styles.secLabel, { color: colors.text }]}>SCORE WEIGHTS</Text>
              {SCORE_WEIGHTS(colors).map((w, i) => (
                <View key={w.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.textSecondary, width: 96 }}>{w.label}</Text>
                  <AnimatedScoreBar pct={w.pct} color={w.color} isVisible={scoreWeightsVisible} delayMs={300 + (i * 150)} triggerKey={focusKey} />
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: w.color, width: 32, textAlign: 'right' }}>{w.pct}%</Text>
                </View>
              ))}
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.textMuted, lineHeight: 15, marginTop: 4 }}>
                Deep work timer bonus grants up to +10 extra points for 90+ focus minutes logged.
              </Text>
            </View>
          </GlassCard>
        </View>
      )}

      {/* Behavior Intelligence section removed to clean up dashboard */}

      {/* ─── WEEK PROGRESS HEATMAP ─── */}
      <View
        onLayout={(e) => {
          const y = e.nativeEvent.layout.y;
          setChartY(y);
          checkVisibility(0, scoreRingY, y, scoreWeightsY);
        }}
      >
        <GlassCard intensity={25}>
          <View style={{ padding: 16 }}>
            <Sec
              label={weekOffset === 0 ? "THIS WEEK" : weekOffset === -1 ? "LAST WEEK" : `${Math.abs(weekOffset)} WEEKS AGO`}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.textSecondary }}>{currentWeekDays.filter(d => d.score !== null).length}/7 days</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWeekOffset(w => w - 1); }} style={{ padding: 4, backgroundColor: colors.surfaceHigh, borderRadius: 6 }}>
                      <Ionicons name="chevron-back" size={14} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWeekOffset(w => Math.min(0, w + 1)); }} style={{ padding: 4, backgroundColor: weekOffset < 0 ? colors.surfaceHigh : 'transparent', borderRadius: 6 }} disabled={weekOffset >= 0}>
                      <Ionicons name="chevron-forward" size={14} color={weekOffset < 0 ? colors.text : colors.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>
              }
            />
            <WeeklyBarChart days={currentWeekDays} isVisible={chartVisible} triggerKey={focusKey} />
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 16 }}>
              {[
                { color: colors.brand.success, l: 'Good (70%+)', empty: false },
                { color: colors.brand.warning, l: 'Neutral (40%+)', empty: false },
                { color: colors.brand.danger, l: 'Muted', empty: false },
                { color: colors.border, l: 'Empty', empty: true }
              ].map(({ color, l, empty }) => (
                <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: empty ? 'transparent' : color, borderWidth: empty ? 1 : 0, borderColor: color, borderStyle: empty ? 'dashed' : 'solid' }} />
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_500Medium', color: colors.textMuted }}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        </GlassCard>
      </View>

      {/* ─── ACTIVE PROGRAM ─── */}
      {enrolledPrograms.length > 0 && (
        <View style={{ gap: 12 }}>
          <Sec label="ACTIVE PROGRAMS" right={
            <TouchableOpacity onPress={() => router.push('/(tabs)/program')} activeOpacity={0.7}>
              <Text style={[styles.linkText, { color: colors.brand.primary }]}>Manage →</Text>
            </TouchableOpacity>
          } />
          {enrolledPrograms.map(prog => {
            const progress = getProgramProgress(prog.id);
            if (!progress) return null;
            const pct = (progress.completedWeeks.length / prog.totalWeeks) * 100;
            return (
              <ProgramCard key={prog.id} prog={prog} progress={progress} pct={pct} colors={colors} />
            );
          })}
        </View>
      )}

      {/* ─── BADGES / ACHIEVEMENTS ─── */}
      {badges.length > 0 && (
        <View style={{ gap: 8 }}>
          <Sec label="ACHIEVEMENTS" right={
            <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.textSecondary }}>{badges.length} earned</Text>
          } />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {badges.slice(-8).map(bId => {
                const badge = BADGES.find(b => b.id === bId);
                if (!badge) return null;
                return (
                  <View key={bId} style={[styles.badgeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 22 }}>{badge.emoji}</Text>
                    <Text style={[styles.badgeName, { color: colors.brand.primaryLight }]}>{badge.name}</Text>
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
            <View style={[styles.habitsCountBadge, {
              backgroundColor: completedToday === metrics.length && metrics.length > 0 ? colors.brand.success + '15' : colors.brand.primaryGlowSoft,
              borderColor: completedToday === metrics.length && metrics.length > 0 ? colors.brand.success + '40' : colors.brand.primary + '40',
            }]}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: completedToday === metrics.length && metrics.length > 0 ? colors.brand.success : colors.brand.primary }}>
                {completedToday}/{metrics.length}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/track')} activeOpacity={0.7}>
              <Text style={[styles.linkText, { color: colors.brand.primary }]}>All →</Text>
            </TouchableOpacity>
          </View>
        } />

        {metrics.length === 0 ? (
          <TouchableOpacity onPress={() => router.push('/(tabs)/track')} style={[styles.emptyCard, { borderColor: colors.border }]} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={30} color={colors.textDim} />
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary }}>Add your first tracker</Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textMuted }}>Start small. Build consistently.</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 6 }}>
            {metrics.slice(0, 8).map(m => (
              <HabitItem
                key={m.id}
                metric={m}
                log={getLogForDate(m.id, today)}
                onLog={(metricId, val) => handleToggle(metricId, val)}
              />
            ))}
            {metrics.length > 8 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/track')} style={[styles.moreBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
                <Text style={[styles.moreBtnText, { color: colors.textSecondary }]}>+{metrics.length - 8} more in Track →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ─── JOURNAL ─── */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
          <Ionicons name={todayJournal ? 'book' : 'book-outline'} size={15} color={todayJournal ? colors.brand.primary : colors.textMuted} />
          <Text style={[styles.secLabel, { color: todayJournal ? colors.brand.primary : colors.textSecondary }]}>
            {todayJournal ? 'REFLECTION DONE' : 'DAILY REFLECTION'}
          </Text>
          {todayJournal && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.textSecondary, marginLeft: 'auto' }}>
              {todayJournal.wordCount ? `${todayJournal.wordCount} words` : 'Saved'}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/journal')}
          style={({ pressed }) => [
            styles.newJournalCard,
            { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
        >
          <LinearGradient
            colors={todayJournal ? [colors.brand.primary + '15', colors.brand.primary + '05'] : [colors.surfaceMid, colors.surface]}
            style={StyleSheet.absoluteFillObject}
          />
          
          {todayJournal ? (
            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.newJournalPreview} numberOfLines={4}>
                  {todayJournal.response}
                </Text>
                {/* Fade out bottom of text */}
                <LinearGradient
                  colors={['transparent', colors.surface]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24 }}
                />
              </View>
              {(todayJournal.tags?.length ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {todayJournal.tags!.slice(0, 4).map(tag => (
                    <View key={tag} style={[styles.newTag, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                      <Text style={[styles.newTagText, { color: 'rgba(255,255,255,0.8)' }]}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={{ gap: 18, alignItems: 'center', paddingVertical: 12 }}>
              <Text style={styles.newJournalPrompt}>
                "What did you notice about your behavior today without judgment?"
              </Text>
              
              <View style={styles.newJournalBtn}>
                <Ionicons name="create-outline" size={16} color={colors.brand.primary} />
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.text }}>
                  Write entry
                </Text>
              </View>
            </View>
          )}
        </Pressable>
      </View>



      {/* ─── QUICK ACTIONS ─── */}
      <View style={styles.quickRow}>
        {[
          { label: 'Focus', sub: focusMinutesToday > 0 ? `${focusMinutesToday}m` : 'Start', icon: 'timer-outline' as const, color: colors.brand.primary, route: '/pomodoro' },
          { label: 'Track', sub: `${completedToday}/${metrics.length}`, icon: 'checkmark-done-outline' as const, color: colors.brand.success, route: '/(tabs)/track' },
          { label: 'Journal', sub: `${journalEntries.length} entries`, icon: 'book-outline' as const, color: colors.brand.primaryLight, route: '/(tabs)/journal' },
          { label: 'Programs', sub: `View plans`, icon: 'calendar-outline' as const, color: colors.textSecondary, route: '/(tabs)/program' },
        ].map(({ label, sub, icon, color, route }) => (
          <TouchableOpacity key={label} onPress={() => router.push(route as any)} style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.8}>
            <Ionicons name={icon} size={20} color={color} />
            <Text style={[styles.quickLabel, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.quickSub, { color: colors.textSecondary }]}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── SETBACK PROTOCOL ─── */}
      <TouchableOpacity onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); router.push('/relapse'); }} style={[styles.relapseBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
        <Ionicons name="shield-outline" size={14} color={colors.brand.danger} />
        <Text style={[styles.relapseBtnText, { color: colors.brand.danger }]}>Had a setback? Reflect & Reset</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  dateStr: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginTop: 2 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderWidth: 1, borderRadius: 14 },
  bannerTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  bannerBody: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17, marginTop: 2 },

  // Hero Card
  heroCard: { borderRadius: 24, padding: 22, gap: 18, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  glowBack: { position: 'absolute', top: -50, left: -50, right: -50, bottom: -50, opacity: 0.45, borderRadius: 999 },
  heroPillsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12, borderWidth: 1 },
  heroPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  heroPillNum: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  heroPillLabel: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  heroPillDivider: { width: 1, height: 28 },
  habitsCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  xpBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: 6, borderRadius: 3 },
  segBar: { flexDirection: 'row', gap: 3, height: 6, overflow: 'hidden', borderRadius: 3 },
  seg: { borderRadius: 2 },

  // Formula
  formulaToggle: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'center', paddingVertical: 4 },
  formulaToggleText: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  // Section
  secLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  linkText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  // Insight
  insightCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'flex-start' },
  insightIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  insightTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', lineHeight: 20 },
  insightBody: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  nextInsightBtn: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },

  // Programs
  programCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  programIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  programTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', flex: 1 },
  weekPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  weekPillText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
  progBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progBarFill: { height: 4, borderRadius: 2 },

  // Badges
  badgeCard: { borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 6, minWidth: 72 },
  badgeName: { fontSize: 10, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },

  // Habits empty card
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 28, alignItems: 'center', gap: 8 },
  moreBtn: { alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12 },
  moreBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  // Journal
  journalPreview: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  journalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, borderWidth: 1, borderRadius: 10, justifyContent: 'center', marginTop: 10 },
  journalPrompt: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, fontStyle: 'italic' },
  journalWriteBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },

  // New Program Card Redesign
  newProgramCard: { borderRadius: 20, padding: 18, overflow: 'hidden' },
  newProgramIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  newProgramTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  newWeekPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  newWeekPillText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.5 },
  newProgBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  newProgBarFill: { height: 6, borderRadius: 3 },

  // New Journal Redesign
  newJournalCard: { borderRadius: 20, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  newJournalPrompt: { fontSize: 17, fontFamily: 'Inter_500Medium', fontStyle: 'italic', color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 26, paddingHorizontal: 10 },
  newJournalBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100 },
  newJournalPreview: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 24, color: 'rgba(255,255,255,0.7)' },
  newTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  newTagText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: 8 },
  quickCard: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4, borderWidth: 1, borderRadius: 16 },
  quickLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', marginTop: 4 },
  quickSub: { fontSize: 9, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  // Setback Protocol
  relapseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderRadius: 14 },
  relapseBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});

// ─── Component: Program Card ─────────────────────────────────────────────────
function ProgramCard({ prog, progress, pct, colors }: any) {
  const scale = useSharedValue(1);
  const handlePressIn = () => { scale.value = withTiming(0.97, { duration: 100 }); };
  const handlePressOut = () => { scale.value = withTiming(1, { duration: 150 }); };
  const as = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedReanimated.View style={as}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => router.push('/(tabs)/program')}
        style={[styles.newProgramCard, { backgroundColor: '#0F0F1A' }]}
      >
        <LinearGradient
          colors={[prog.color + '15', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={[styles.newProgramIconWrap, { backgroundColor: prog.color + '20' }]}>
            <Text style={{ fontSize: 26 }}>{prog.emoji}</Text>
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.newProgramTitle} numberOfLines={1}>{prog.title}</Text>
              <View style={[styles.newWeekPill, { backgroundColor: prog.color }]}>
                <Text style={styles.newWeekPillText}>W{progress.currentWeek}</Text>
              </View>
            </View>
            <View style={[styles.newProgBarBg, { backgroundColor: prog.color + '25' }]}>
              <AnimatedReanimated.View style={[styles.newProgBarFill, { width: `${pct}%`, backgroundColor: prog.color }]} />
            </View>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.4)' }}>
              {progress.completedWeeks.length} of {prog.totalWeeks} weeks completed
            </Text>
          </View>
        </View>
      </Pressable>
    </AnimatedReanimated.View>
  );
}
