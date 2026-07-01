import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
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
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { GlassCard } from '@/components/GlassCard';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

const { width: SW } = Dimensions.get('window');

// Local timezone-safe date helpers
function getLocalToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  // Map standard getDay() (0 = Sun, 1 = Mon, ..., 6 = Sat) to Mon-Sun (0 = Mon, ..., 6 = Sun)
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay: adjustedFirstDay, daysInMonth };
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    dailyLogs,
    journalEntries,
    metrics,
    relapseLogs,
    getJournalEntryForDate,
    getLogsForDate,
  } = useApp();

  const todayStr = useMemo(() => getLocalToday(), []);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedFilterMetricId, setSelectedFilterMetricId] = useState<string | null>(null);

  const expandVal = useSharedValue(0);
  
  useEffect(() => {
    expandVal.value = withSpring(selectedDate !== null ? 1 : 0, { damping: 20, stiffness: 120 });
  }, [selectedDate]);

  const insightsStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(expandVal.value, [0, 1], [0, 2500]),
    opacity: expandVal.value,
    transform: [{ translateY: interpolate(expandVal.value, [0, 1], [-20, 0]) }],
    overflow: 'hidden',
    marginTop: interpolate(expandVal.value, [0, 1], [0, 16]),
  }));

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  // Today's date pulsing glow animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Month slide transition values
  const gridAnim = useRef(new Animated.Value(1)).current;
  const gridX = useRef(new Animated.Value(0)).current;

  // Page entry animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 45, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateMonthChange = (direction: 'prev' | 'next') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.timing(gridAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(gridX, {
        toValue: direction === 'prev' ? 30 : -30,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (direction === 'prev') {
        if (viewMonth === 0) {
          setViewYear((y) => y - 1);
          setViewMonth(11);
        } else {
          setViewMonth((m) => m - 1);
        }
      } else {
        if (viewMonth === 11) {
          setViewYear((y) => y + 1);
          setViewMonth(0);
        } else {
          setViewMonth((m) => m + 1);
        }
      }
      gridX.setValue(direction === 'prev' ? -30 : 30);

      Animated.parallel([
        Animated.spring(gridAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.spring(gridX, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]).start();
    });
  };

  const { firstDay, daysInMonth } = getMonthDays(viewYear, viewMonth);

  const calendarWeeks = useMemo(() => {
    const w: (number | null)[][] = [];
    let cur: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cur.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cur.push(d);
      if (cur.length === 7) { w.push(cur); cur = []; }
    }
    if (cur.length > 0) {
      while (cur.length < 7) cur.push(null);
      w.push(cur);
    }
    return w;
  }, [firstDay, daysInMonth]);

  const selectedDayNum = selectedDate ? parseInt(selectedDate.split('-')[2], 10) : null;
  const selectedWeekIndex = selectedDayNum ? calendarWeeks.findIndex(w => w.includes(selectedDayNum)) : -1;

  // Score Calculations
  const getDayScore = (date: string) => {
    const logs = dailyLogs.filter((l) => l.date === date);
    if (logs.length === 0) return null;

    const completed = logs.filter((l) => {
      const metric = metrics.find((m) => m.id === l.metricId);
      if (!metric) return false;
      if (metric.category === 'build') return l.value > 0;
      if (metric.category === 'reduce') return l.value === 0;
      return true;
    }).length;

    return Math.round((completed / Math.max(logs.length, 1)) * 100);
  };

  const getMetricStatus = (date: string, metricId: string) => {
    const log = dailyLogs.find((l) => l.date === date && l.metricId === metricId);
    if (!log) return 'unlogged';

    const metric = metrics.find((m) => m.id === metricId);
    if (!metric) return 'unlogged';

    const isGood =
      metric.category === 'build' ? log.value > 0 : metric.category === 'reduce' ? log.value === 0 : true;
    return isGood ? 'success' : 'failed';
  };

  const getDayColor = (date: string) => {
    if (date > todayStr) return null;

    if (selectedFilterMetricId) {
      const status = getMetricStatus(date, selectedFilterMetricId);
      if (status === 'success') return colors.brand.success;
      if (status === 'failed') return colors.brand.danger;
      return null;
    }

    const score = getDayScore(date);
    if (score === null) return null;
    return colors.getScoreColor(score);
  };

  // Stats computation
  const monthlyStats = useMemo(() => {
    let loggedDaysCount = 0;
    let totalScoreSum = 0;
    let perfectDaysCount = 0;
    let strongDaysCount = 0;
    let filteredCompleted = 0;
    let filteredTotal = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const ds = dateStr(viewYear, viewMonth, day);
      if (ds > todayStr) continue;

      if (selectedFilterMetricId) {
        const status = getMetricStatus(ds, selectedFilterMetricId);
        if (status !== 'unlogged') {
          filteredTotal++;
          if (status === 'success') filteredCompleted++;
        }
      } else {
        const logs = dailyLogs.filter((l) => l.date === ds);
        if (logs.length > 0) {
          loggedDaysCount++;
          const score = getDayScore(ds);
          if (score !== null) {
            totalScoreSum += score;
            if (score >= 90) perfectDaysCount++;
            if (score >= 70) strongDaysCount++;
          }
        }
      }
    }

    const avgScore = loggedDaysCount > 0 ? Math.round(totalScoreSum / loggedDaysCount) : 0;
    const consistencyRate = loggedDaysCount > 0 ? Math.round((strongDaysCount / loggedDaysCount) * 100) : 0;
    const filterRate = filteredTotal > 0 ? Math.round((filteredCompleted / filteredTotal) * 100) : 0;

    return {
      loggedDays: loggedDaysCount,
      avgScore,
      perfectDays: perfectDaysCount,
      consistencyRate,
      filteredCompleted,
      filteredTotal,
      filterRate,
    };
  }, [viewYear, viewMonth, dailyLogs, metrics, selectedFilterMetricId, todayStr]);

  const selectedLogs = selectedDate ? getLogsForDate(selectedDate) : [];
  const selectedJournal = selectedDate ? getJournalEntryForDate(selectedDate) : undefined;
  const selectedRelapses = selectedDate ? relapseLogs.filter((r) => r.date === selectedDate) : [];
  const selectedScore = selectedDate ? getDayScore(selectedDate) : null;

  const totalLogged = selectedLogs.length;
  const completedMetrics = selectedLogs.filter((l) => {
    const metric = metrics.find((m) => m.id === l.metricId);
    if (!metric) return false;
    if (metric.category === 'build') return l.value > 0;
    if (metric.category === 'reduce') return l.value === 0;
    return true;
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Dynamic Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={[styles.backBtn, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Activity Calendar</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 120 : 60 }]}
      >
        <Animated.View style={{ gap: 18, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Performance Filters */}
          <View>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PERFORMANCE FILTER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedFilterMetricId(null);
                }}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.surfaceMid, borderColor: colors.border },
                  selectedFilterMetricId === null && [
                    styles.filterChipActive,
                    { backgroundColor: colors.brand.primary, borderColor: colors.brand.primaryLight },
                  ],
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.textSecondary },
                    selectedFilterMetricId === null && styles.filterChipTextActive,
                  ]}
                >
                  All Habits
                </Text>
              </TouchableOpacity>
              
              {metrics.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedFilterMetricId(m.id);
                  }}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.surfaceMid, borderColor: colors.border },
                    selectedFilterMetricId === m.id && [
                      styles.filterChipActive,
                      { backgroundColor: colors.brand.primary, borderColor: colors.brand.primaryLight },
                    ],
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.textSecondary },
                      selectedFilterMetricId === m.id && styles.filterChipTextActive,
                    ]}
                  >
                    {m.emoji ?? '📊'} {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Stats Summary Panel */}
          <GlassCard style={styles.statsContainer}>
            <View style={[styles.statsHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.statsTitle, { color: colors.text }]}>
                {selectedFilterMetricId
                  ? `${metrics.find((m) => m.id === selectedFilterMetricId)?.name} History`
                  : `${MONTHS[viewMonth]} Overview`}
              </Text>
              <Text style={[styles.statsSubtitle, { color: colors.textMuted }]}>{viewYear}</Text>
            </View>

            <View style={styles.swissGrid}>
              {selectedFilterMetricId ? (
                <>
                  <View style={styles.swissCell}>
                    <Text style={[styles.swissLabel, { color: colors.textMuted }]}>SUCCESS RATE</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={[styles.swissValue, { color: colors.brand.success }]}>
                        {monthlyStats.filterRate}%
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.swissCellDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.swissCell}>
                    <Text style={[styles.swissLabel, { color: colors.textMuted }]}>LOGGED</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={[styles.swissValue, { color: colors.text }]}>
                        {monthlyStats.filteredCompleted}
                      </Text>
                      <Text style={[styles.swissSub, { color: colors.textSecondary }]}>
                        / {monthlyStats.filteredTotal}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.swissCellDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.swissCell}>
                    <Text style={[styles.swissLabel, { color: colors.textMuted }]}>SKIPPED</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={[styles.swissValue, { color: colors.brand.danger }]}>
                        {monthlyStats.filteredTotal - monthlyStats.filteredCompleted}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.swissCell}>
                    <Text style={[styles.swissLabel, { color: colors.textMuted }]}>CONSISTENCY</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={[styles.swissValue, { color: colors.brand.success }]}>
                        {monthlyStats.consistencyRate}%
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.swissCellDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.swissCell}>
                    <Text style={[styles.swissLabel, { color: colors.textMuted }]}>PERFECT DAYS</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={[styles.swissValue, { color: colors.brand.warning }]}>
                        {monthlyStats.perfectDays}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.swissCellDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.swissCell}>
                    <Text style={[styles.swissLabel, { color: colors.textMuted }]}>AVG SCORE</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={[styles.swissValue, { color: colors.text }]}>
                        {monthlyStats.avgScore}
                      </Text>
                      <Text style={[styles.swissSub, { color: colors.textSecondary }]}>/100</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </GlassCard>
        </Animated.View>

        {/* Calendar Core Card */}
        <Animated.View style={[styles.calCardOffset, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <GlassCard style={styles.calCard}>
            {/* Month Nav */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => animateMonthChange('prev')} style={styles.navBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.monthTitle, { color: colors.text }]}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={() => animateMonthChange('next')} style={styles.navBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Weekday Row */}
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((d) => (
                <Text key={d} style={[styles.weekdayLabel, { color: colors.textMuted }]}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Days Grid - Wizard Animated Rows */}
            <Animated.View style={{ opacity: gridAnim, transform: [{ translateX: gridX }] }}>
              <View style={styles.daysGrid}>
                {calendarWeeks.map((week, wIndex) => {
                  return (
                    <WeekRow
                      key={`week-${wIndex}`}
                      week={week}
                      weekIndex={wIndex}
                      selectedWeekIndex={selectedWeekIndex}
                      isSelectedView={selectedDate !== null}
                      viewYear={viewYear}
                      viewMonth={viewMonth}
                      todayStr={todayStr}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      journalEntries={journalEntries}
                      relapseLogs={relapseLogs}
                      getDayColor={getDayColor}
                      pulseAnim={pulseAnim}
                      colors={colors}
                    />
                  );
                })}
              </View>
            </Animated.View>

            {/* Legends */}
            <View style={[styles.legend, { borderTopColor: colors.border }]}>
              {selectedFilterMetricId ? (
                <>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.brand.success }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Completed</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.brand.danger }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Skipped</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.brand.success }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Strong</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.brand.warning }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Building</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.brand.danger }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Setback</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.brand.calm }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Journal</Text>
                  </View>
                </>
              )}
            </View>
          </GlassCard>
        </Animated.View>

        <AnimatedReanimated.View style={insightsStyle}>
          <DayInsights
            selectedDate={selectedDate}
            todayStr={todayStr}
            setSelectedDate={setSelectedDate}
            selectedScore={selectedScore}
            completedMetrics={completedMetrics}
            totalLogged={totalLogged}
            selectedLogs={selectedLogs}
            metrics={metrics}
            selectedJournal={selectedJournal}
            selectedRelapses={selectedRelapses}
            colors={colors}
          />
        </AnimatedReanimated.View>
      </ScrollView>
    </View>
  );
}

// ─── Swiss Day Insights Component ───────────────────────────────────────────
function DayInsights({
  selectedDate,
  todayStr,
  setSelectedDate,
  selectedScore,
  completedMetrics,
  totalLogged,
  selectedLogs,
  metrics,
  selectedJournal,
  selectedRelapses,
  colors
}: any) {
  if (!selectedDate) return null;

  return (
    <View style={insStyles.container}>
      <View style={insStyles.header}>
        <View>
          <Text style={[insStyles.dateTitle, { color: colors.text }]}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {selectedDate === todayStr && (
            <Text style={[insStyles.todayBadge, { color: colors.brand.primaryLight }]}>TODAY</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setSelectedDate(null)}
          style={[insStyles.closeBtn, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Score */}
      {selectedScore !== null && (
        <View style={insStyles.scoreContainer}>
          <Text style={[insStyles.scoreVal, { color: colors.getScoreColor(selectedScore) }]}>{selectedScore}%</Text>
          <Text style={[insStyles.scoreLabel, { color: colors.textSecondary }]}>DISCIPLINE SCORE</Text>
        </View>
      )}

      {/* Habits */}
      {totalLogged > 0 ? (
        <View style={insStyles.section}>
          <Text style={[insStyles.sectionTitle, { color: colors.textMuted }]}>
            HABITS ({completedMetrics.length}/{totalLogged})
          </Text>
          <View style={insStyles.habitList}>
            {selectedLogs.map((log: any) => {
              const metric = metrics.find((m: any) => m.id === log.metricId);
              if (!metric) return null;
              const isGood = metric.category === 'build' ? log.value > 0 : metric.category === 'reduce' ? log.value === 0 : true;
              return (
                <View key={log.id} style={[insStyles.habitRow, { borderBottomColor: colors.border }]}>
                  <Text style={[insStyles.habitName, { color: colors.text }]}>{metric.emoji ?? '•'} {metric.name}</Text>
                  <View style={[insStyles.habitStatus, { backgroundColor: isGood ? colors.brand.success + '20' : colors.brand.danger + '20' }]}>
                    <Text style={[insStyles.habitStatusText, { color: isGood ? colors.brand.success : colors.brand.danger }]}>
                      {metric.inputType === 'boolean' ? (log.value ? 'DONE' : 'SKIP') : log.value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={[insStyles.emptyCard, { borderColor: colors.border }]}>
          <Text style={[insStyles.emptyText, { color: colors.textSecondary }]}>No habits logged.</Text>
        </View>
      )}

      {/* Journal */}
      {selectedJournal && (
        <View style={insStyles.section}>
          <Text style={[insStyles.sectionTitle, { color: colors.textMuted }]}>JOURNAL</Text>
          <View style={[insStyles.journalBlock, { borderLeftColor: colors.brand.calm }]}>
            <Text style={[insStyles.journalPrompt, { color: colors.textMuted }]}>{selectedJournal.prompt}</Text>
            <Text style={[insStyles.journalResponse, { color: colors.text }]}>{selectedJournal.response}</Text>
          </View>
        </View>
      )}

      {/* Relapses */}
      {selectedRelapses.length > 0 && (
        <View style={insStyles.section}>
          <Text style={[insStyles.sectionTitle, { color: colors.brand.danger }]}>SETBACKS</Text>
          {selectedRelapses.map((r: any) => (
            <View key={r.id} style={[insStyles.relapseCard, { backgroundColor: colors.brand.danger + '10' }]}>
              <Text style={[insStyles.relapseName, { color: colors.brand.danger }]}>{r.metricName}</Text>
              <Text style={[insStyles.relapseText, { color: colors.text }]}>{r.triggerReflection}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const insStyles = StyleSheet.create({
  container: { marginTop: 8, paddingHorizontal: 4, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  dateTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  todayBadge: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scoreContainer: { alignItems: 'flex-start', marginBottom: 32 },
  scoreVal: { fontSize: 64, fontFamily: 'Inter_700Bold', letterSpacing: -2, lineHeight: 70 },
  scoreLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 16 },
  habitList: { gap: 0 },
  habitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  habitName: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  habitStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  habitStatusText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  emptyCard: { padding: 24, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginBottom: 24 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  journalBlock: { paddingLeft: 16, borderLeftWidth: 3 },
  journalPrompt: { fontSize: 13, fontFamily: 'Inter_500Medium', fontStyle: 'italic', marginBottom: 8 },
  journalResponse: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 24 },
  relapseCard: { padding: 16, borderRadius: 12, marginBottom: 8 },
  relapseName: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  relapseText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingLeft: 2,
  },
  filterScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipActive: {
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  statsContainer: {
    padding: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  statsTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  statsSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  swissGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swissCell: {
    flex: 1,
  },
  swissCellDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 12,
  },
  swissLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  swissDataRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  swissValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  swissSub: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  calCardOffset: {
    marginTop: 4,
  },
  calCard: {
    padding: 16,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    padding: 4,
  },
  monthTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  daysGrid: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
  },
  dayCell: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dayNumBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 3,
    height: 4,
    marginTop: 4,
    justifyContent: 'center',
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  modalRelapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalRelapseName: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  modalRelapseText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
});

// ─── Wizard WeekRow Component ───────────────────────────────────────────────
function WeekRow({
  week, weekIndex, selectedWeekIndex, isSelectedView, viewYear, viewMonth,
  todayStr, selectedDate, setSelectedDate, journalEntries, relapseLogs, getDayColor, pulseAnim, colors
}: any) {
  const rowStyle = useAnimatedStyle(() => {
    const isVisible = !isSelectedView || weekIndex === selectedWeekIndex;
    return {
      height: withTiming(isVisible ? 50 : 0, { duration: 300 }),
      opacity: withTiming(isVisible ? 1 : 0, { duration: 250 }),
      overflow: 'hidden',
    };
  }, [isSelectedView, selectedWeekIndex, weekIndex]);

  return (
    <AnimatedReanimated.View style={[styles.weekRow, rowStyle]}>
      {week.map((day: number | null, i: number) => {
        if (!day) return <View key={`empty-${i}`} style={styles.dayCell} />;
        
        const ds = dateStr(viewYear, viewMonth, day);
        const isFut = ds > todayStr;
        const cellColor = getDayColor(ds);
        const isSelected = selectedDate === ds;
        const hasJournal = journalEntries.some((e: any) => e.date === ds);
        const hasRelapse = relapseLogs.some((r: any) => r.date === ds);
        const todayDay = ds === todayStr;

        const cellContent = (
          <View
            style={[
              styles.dayNumBg,
              todayDay && {
                backgroundColor: cellColor ? cellColor + '20' : colors.brand.primaryGlowSoft,
                borderWidth: 1.5,
                borderColor: cellColor ?? colors.brand.primary,
              },
              !todayDay && cellColor && { backgroundColor: cellColor + '1C' },
            ]}
          >
            <Text
              style={[
                styles.dayNum,
                { color: colors.textSecondary },
                todayDay && { color: cellColor ?? colors.brand.primaryLight, fontFamily: 'Inter_700Bold' },
                !todayDay && cellColor && { color: cellColor, fontFamily: 'Inter_700Bold' },
              ]}
            >
              {day}
            </Text>
          </View>
        );

        return (
          <TouchableOpacity
            key={day}
            onPress={() => {
              if (!isFut) {
                if (selectedDate === ds) setSelectedDate(null);
                else setSelectedDate(ds);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }}
            style={[
              styles.dayCell,
              isSelected && [styles.dayCellSelected, { backgroundColor: colors.pressed, borderColor: colors.brand.primary + '50' }],
              isFut && { opacity: 0.2 },
            ]}
            activeOpacity={isFut ? 1 : 0.7}
          >
            {todayDay ? (
              <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%', alignItems: 'center' }}>
                {cellContent}
              </Animated.View>
            ) : cellContent}
            
            <View style={styles.indicatorRow}>
              {hasJournal && <View style={[styles.miniDot, { backgroundColor: colors.brand.calm }]} />}
              {hasRelapse && <View style={[styles.miniDot, { backgroundColor: colors.brand.danger }]} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </AnimatedReanimated.View>
  );
}
