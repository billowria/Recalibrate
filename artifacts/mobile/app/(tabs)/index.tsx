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
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { DisciplineScoreRing } from '@/components/DisciplineScoreRing';
import { GlassCard } from '@/components/GlassCard';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

// ─── LOCAL DATE (timezone-safe) ───────────────────────────────────────────────
function getLocalToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, paddingVertical: 10 }}>
      {days.map((day) => {
        const d = new Date(day.date + 'T12:00:00');
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
        const dateNum = d.getDate();

        const score = day.score ?? 0;
        const targetHeight = Math.max(8, (score / 100) * 80); 

        let barColor: string = colors.surfaceHigh;
        let isUnlogged = day.score === null;

        if (day.score !== null) {
          barColor = colors.brand.success;
        }

        const animatedStyle = useAnimatedStyle(() => {
          return {
            height: animationProgress.value * targetHeight,
          };
        });

        return (
          <View key={day.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', opacity: day.isFuture ? 0.35 : 1 }}>
            <View style={{ height: 100, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
              {isUnlogged ? (
                <>
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

// ─── Score Arc Hero ───────────────────────────────────────────────────────────
function ScoreHero({ score, completedToday, total, streak, streakColor, level, levelProgress, levelMax, totalXP, isVisible, triggerKey }: {
  score: number; completedToday: number; total: number; streak: number; streakColor: string; level: number; levelProgress: number; levelMax: number; totalXP: number; isVisible: boolean; triggerKey: number;
}) {
  const colors = useColors();
  const xpPct = Math.round((levelProgress / levelMax) * 100);

  return (
    <LinearGradient
      colors={colors.isDark ? ['#070A1E', '#020307'] : ['#FFFFFF', '#F0F2F5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.heroCard, { borderColor: colors.border }]}
    >
      <View style={[styles.glowBack, { backgroundColor: colors.brand.success + (colors.isDark ? '08' : '05') }]} />

      <View style={{ alignItems: 'center', marginVertical: 10 }}>
        <DisciplineScoreRing
          score={score}
          size={190}
          strokeWidth={12}
          showLabel={true}
          showContext={true}
          contextText="Weekly Goal"
          isVisible={isVisible}
          triggerKey={triggerKey}
        />
      </View>

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
            <Text style={[styles.heroPillNum, { color: streakColor }]}>{streak} Days</Text>
            <Text style={[styles.heroPillLabel, { color: colors.isDark ? 'rgba(255,255,255,0.5)' : colors.textSecondary }]}>Lifting Streak</Text>
          </View>
        </View>
      </View>

      {/* Level progress bar */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: colors.isDark ? 'rgba(255, 255, 255, 0.5)' : colors.textMuted, letterSpacing: 1 }}>XP PROGRESS</Text>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.isDark ? '#FFFFFF' : colors.text }}>{levelProgress}/{levelMax}</Text>
        </View>
        <View style={[styles.xpBar, { height: 3, backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }]}>
          <View style={[styles.xpBarFill, { height: 3, width: `${xpPct}%` as any, backgroundColor: colors.brand.primary }]} />
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
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
    profile, totalXP, currentLevel, levelProgress, levelMax,
    currentStreak, highestStreak, workoutSessions, exerciseLogs,
    currentWorkoutSession, startWorkoutSession, finishWorkoutSession,
    programs, workoutDays, workoutDayExercises, exercises, journals,
  } = useApp();

  const today = useMemo(() => getLocalToday(), []);
  const now = new Date();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

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

  const checkVisibility = useCallback((scrollY: number, ringY = scoreRingY, cY = chartY) => {
    const screenHeight = Dimensions.get('window').height;
    const trigger = scrollY + screenHeight - 120;
    if (trigger >= ringY) setScoreRingVisible(true);
    if (trigger >= cY) setChartVisible(true);
  }, [scoreRingY, chartY]);

  // Find active program
  const activeProgram = useMemo(() => {
    const activeId = profile.activeProgramIds[0];
    return programs.find(p => p.id === activeId);
  }, [profile.activeProgramIds, programs]);

  const activeDays = useMemo(() => {
    if (!activeProgram) return [];
    return workoutDays.filter(d => d.programId === activeProgram.id).sort((a,b) => a.dayNumber - b.dayNumber);
  }, [activeProgram, workoutDays]);

  // Determine current split day for today
  const todayWorkoutDay = useMemo(() => {
    if (activeDays.length === 0) return null;
    
    // Find completed days this week
    const startOfWeek = new Date();
    const currentDay = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(startOfWeek.setDate(diff));
    monday.setHours(0,0,0,0);

    const completedDayIds = workoutSessions
      .filter(s => s.completedAt && new Date(s.completedAt).getTime() >= monday.getTime())
      .map(s => s.workoutDayId);

    // Give next uncompleted day
    const nextDay = activeDays.find(d => !completedDayIds.includes(d.id));
    return nextDay || activeDays[0];
  }, [activeDays, workoutSessions]);

  // Compute completed sessions this week
  const thisWeekSessionsCount = useMemo(() => {
    const startOfWeek = new Date();
    const currentDay = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(startOfWeek.setDate(diff));
    monday.setHours(0,0,0,0);

    return workoutSessions.filter(
      s => s.completedAt && new Date(s.completedAt).getTime() >= monday.getTime()
    ).length;
  }, [workoutSessions]);

  const totalTargetWorkouts = activeDays.length || 3;
  const completionPct = Math.round((thisWeekSessionsCount / totalTargetWorkouts) * 100);

  // Compute 7 days chart data
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
      const hasWorkout = workoutSessions.some(
        s => s.completedAt && s.completedAt.split('T')[0] === dateStr
      );

      days.push({ 
        date: dateStr, 
        score: hasWorkout ? 100 : null, 
        isToday: dateStr === today, 
        isFuture 
      });
    }
    return days;
  }, [workoutSessions, today, weekOffset]);

  const streakColor = currentStreak >= 30 ? colors.brand.xp : currentStreak >= 14 ? colors.brand.success : currentStreak >= 7 ? colors.brand.primaryLight : colors.textSecondary;
  const greeting = now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening';
  const name = profile.name || 'Athlete';

  // Fetch recent PRs
  const recentPRs = useMemo(() => {
    const prLogs = exerciseLogs.filter(l => l.isPr);
    // Attach exercise names
    return prLogs.map(log => {
      const ex = exercises.find(e => e.id === log.exerciseId);
      return {
        ...log,
        exerciseName: ex ? ex.name : 'Exercise'
      };
    }).slice(-5).reverse();
  }, [exerciseLogs, exercises]);

  const todayJournal = journals.find(j => j.date === today);

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
            <TouchableOpacity onPress={() => router.push('/calendar')} style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={18} color={colors.brand.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
              <Ionicons name="person-outline" size={18} color={colors.brand.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ─── HERO SCORE ─── */}
        <Animated.View
          onLayout={(e) => {
            const y = e.nativeEvent.layout.y;
            setScoreRingY(y);
            checkVisibility(0, y, chartY);
          }}
          style={{ opacity: pageAnim, transform: [{ scale: pageAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }}
        >
          <ScoreHero
            score={completionPct}
            completedToday={thisWeekSessionsCount}
            total={totalTargetWorkouts}
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

        {/* ─── TODAY'S WORKOUT SPLIT / QUICK START ─── */}
        <View style={{ gap: 8 }}>
          <Sec label="TODAY'S WORKOUT" />
          
          {currentWorkoutSession ? (
            <GlassCard intensity={35}>
              <LinearGradient
                colors={[colors.brand.primary + '15', 'transparent']}
                style={{ padding: 18, gap: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' }}>Workout In Progress</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Keep lifting and completing sets!</Text>
                  </View>
                  <View style={styles.pulseDot} />
                </View>

                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/track')}
                  style={[styles.actionBtn, { backgroundColor: colors.brand.primary }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' }}>Resume Active Workout</Text>
                </TouchableOpacity>
              </LinearGradient>
            </GlassCard>
          ) : todayWorkoutDay ? (
            <GlassCard intensity={25}>
              <View style={{ padding: 18, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.workoutDayIcon, { backgroundColor: colors.brand.primaryGlowSoft }]}>
                    <Text style={{ fontSize: 22 }}>🏋️‍♂️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.text }} numberOfLines={1}>
                      {todayWorkoutDay.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                      Focus: {todayWorkoutDay.targetMuscleGroups.join(', ')}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={async () => {
                    await startWorkoutSession(todayWorkoutDay.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.push('/(tabs)/track');
                  }}
                  style={[styles.actionBtn, { backgroundColor: colors.brand.primary }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="barbell-outline" size={16} color="#fff" />
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' }}>Start Workout Split</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ) : (
            <View style={[styles.emptyCard, { borderColor: colors.border }]}>
              <Ionicons name="trophy-outline" size={30} color={colors.textDim} />
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary }}>No Active Program</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textMuted }}>Enroll in a template split to get started.</Text>
            </View>
          )}
        </View>

        {/* ─── WEEK PROGRESS HEATMAP ─── */}
        <View
          onLayout={(e) => {
            const y = e.nativeEvent.layout.y;
            setChartY(y);
            checkVisibility(0, scoreRingY, y);
          }}
        >
          <GlassCard intensity={20}>
            <View style={{ padding: 16 }}>
              <Sec
                label={weekOffset === 0 ? "THIS WEEK" : weekOffset === -1 ? "LAST WEEK" : `${Math.abs(weekOffset)} WEEKS AGO`}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.textSecondary }}>{thisWeekSessionsCount} Workouts</Text>
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
            </View>
          </GlassCard>
        </View>

        {/* ─── RECENT PERSONAL RECORDS (PRs) ─── */}
        {recentPRs.length > 0 && (
          <View style={{ gap: 8 }}>
            <Sec label="PERSONAL RECORDS (PRs) 🏆" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {recentPRs.map(pr => (
                <View key={pr.id} style={[styles.prCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 20 }}>🔥</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.text }} numberOfLines={1}>
                    {pr.exerciseName}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.brand.success, fontFamily: 'Inter_700Bold' }}>
                    {pr.weight} kg x {pr.reps}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── JOURNAL ─── */}
        <View style={{ gap: 8 }}>
          <Sec label="FITNESS REFLECTIONS" />
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
            
            <View style={{ gap: 12, alignItems: 'center' }}>
              <Ionicons name="fitness-outline" size={24} color={colors.brand.primary} />
              {todayJournal ? (
                <>
                  <Text style={[styles.newJournalPreview, { color: colors.text }]} numberOfLines={2}>
                    "{todayJournal.content}"
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.brand.primary }}>REFLECTION COMPLETED</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.newJournalPrompt, { color: colors.textSecondary }]}>
                    "How did your body and energy levels feel after your session?"
                  </Text>
                  <View style={styles.newJournalBtn}>
                    <Ionicons name="create-outline" size={16} color="#000" />
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#000' }}>Reflect on workout</Text>
                  </View>
                </>
              )}
            </View>
          </Pressable>
        </View>

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

  // Hero Card
  heroCard: { borderRadius: 24, padding: 22, gap: 18, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  glowBack: { position: 'absolute', top: -50, left: -50, right: -50, bottom: -50, opacity: 0.45, borderRadius: 999 },
  heroPillsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12, borderWidth: 1 },
  heroPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  heroPillNum: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  heroPillLabel: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  heroPillDivider: { width: 1, height: 28 },
  xpBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: 6, borderRadius: 3 },

  secLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  workoutDayIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D68F' },

  // PR Card
  prCard: { borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, minWidth: 100, maxWidth: 140 },

  // Empty Card
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 28, alignItems: 'center', gap: 8 },

  // Journal
  newJournalCard: { borderRadius: 20, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  newJournalPrompt: { fontSize: 14, fontFamily: 'Inter_500Medium', fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
  newJournalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 },
  newJournalPreview: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, textAlign: 'center' },
});
