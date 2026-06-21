import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import { useApp } from '@/context/AppContext';

const { width: SW } = Dimensions.get('window');

// ─── Design Tokens (Swiss Space-Dark System) ──────────────────────────────
const C = {
  bg: '#050512',
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

// ─── Local timezone-safe date helpers ──────────────────────────────────────
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
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
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
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [selectedFilterMetricId, setSelectedFilterMetricId] = useState<string | null>(null);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  // Month change animations
  const gridAnim = useRef(new Animated.Value(1)).current;
  const gridX = useRef(new Animated.Value(0)).current;

  // Entry animation
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
      Animated.timing(gridX, { toValue: direction === 'prev' ? 40 : -40, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      // Set the state
      if (direction === 'prev') {
        if (viewMonth === 0) {
          setViewYear(y => y - 1);
          setViewMonth(11);
        } else {
          setViewMonth(m => m - 1);
        }
      } else {
        if (viewMonth === 11) {
          setViewYear(y => y + 1);
          setViewMonth(0);
        } else {
          setViewMonth(m => m + 1);
        }
      }
      // Position opposite
      gridX.setValue(direction === 'prev' ? -40 : 40);
      
      // Animate back in
      Animated.parallel([
        Animated.spring(gridAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.spring(gridX, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]).start();
    });
  };

  const { firstDay, daysInMonth } = getMonthDays(viewYear, viewMonth);

  // Score calculators
  const getDayScore = (date: string) => {
    const logs = dailyLogs.filter(l => l.date === date);
    if (logs.length === 0) return null;
    
    const completed = logs.filter(l => {
      const metric = metrics.find(m => m.id === l.metricId);
      if (!metric) return false;
      if (metric.category === 'build') return l.value > 0;
      if (metric.category === 'reduce') return l.value === 0;
      return true;
    }).length;
    
    return Math.round((completed / Math.max(logs.length, 1)) * 100);
  };

  const getMetricStatus = (date: string, metricId: string) => {
    const log = dailyLogs.find(l => l.date === date && l.metricId === metricId);
    if (!log) return 'unlogged';
    
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return 'unlogged';

    const isGood = metric.category === 'build' ? log.value > 0 : (metric.category === 'reduce' ? log.value === 0 : true);
    return isGood ? 'success' : 'failed';
  };

  const getDayColor = (date: string) => {
    if (date > todayStr) return null; // Future

    // If filtering by a specific habit
    if (selectedFilterMetricId) {
      const status = getMetricStatus(date, selectedFilterMetricId);
      if (status === 'success') return C.green;
      if (status === 'failed') return C.red;
      return null; // unlogged
    }

    // Default: Overall discipline score
    const score = getDayScore(date);
    if (score === null) return null;
    if (score >= 70) return C.green;
    if (score >= 40) return C.amber;
    return C.red;
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
        const logs = dailyLogs.filter(l => l.date === ds);
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
  const selectedRelapses = selectedDate ? relapseLogs.filter(r => r.date === selectedDate) : [];
  const selectedScore = selectedDate ? getDayScore(selectedDate) : null;

  const totalLogged = selectedLogs.length;
  const completedMetrics = selectedLogs.filter(l => {
    const metric = metrics.find(m => m.id === l.metricId);
    if (!metric) return false;
    if (metric.category === 'build') return l.value > 0;
    if (metric.category === 'reduce') return l.value === 0;
    return true;
  });

  return (
    <View style={styles.root}>
      {/* Background Gradient */}
      <LinearGradient colors={['#050512', '#07071a']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 120 : 60 }]}
      >
        {/* Compact Swiss-Style Filter & Stats */}
        <Animated.View style={{ gap: 16, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.sectionLabel}>PERFORMANCE FILTER</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedFilterMetricId(null);
                }}
                style={[styles.filterChip, selectedFilterMetricId === null && styles.filterChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, selectedFilterMetricId === null && styles.filterChipTextActive]}>
                  All Habits
                </Text>
              </TouchableOpacity>
              {metrics.map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedFilterMetricId(m.id);
                  }}
                  style={[styles.filterChip, selectedFilterMetricId === m.id && styles.filterChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, selectedFilterMetricId === m.id && styles.filterChipTextActive]}>
                    {m.emoji ?? '📊'} {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Minimalist Stats Grid */}
          <View style={styles.statsContainer}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>
                {selectedFilterMetricId
                  ? `${metrics.find(m => m.id === selectedFilterMetricId)?.name} Insights`
                  : `${MONTHS[viewMonth]} Overview`}
              </Text>
              <Text style={styles.statsSubtitle}>{viewYear}</Text>
            </View>
            
            <View style={styles.swissGrid}>
              {selectedFilterMetricId ? (
                <>
                  <View style={styles.swissCell}>
                    <Text style={styles.swissLabel}>SUCCESS RATE</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={[styles.swissValue, { color: C.green }]}>{monthlyStats.filterRate}%</Text>
                      <Ionicons name="trending-up" size={14} color={C.green} />
                    </View>
                  </View>
                  <View style={styles.swissCellDivider} />
                  <View style={styles.swissCell}>
                    <Text style={styles.swissLabel}>LOGGED</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={styles.swissValue}>{monthlyStats.filteredCompleted}</Text>
                      <Text style={styles.swissSub}>/ {monthlyStats.filteredTotal}</Text>
                    </View>
                  </View>
                  <View style={styles.swissCellDivider} />
                  <View style={styles.swissCell}>
                    <Text style={styles.swissLabel}>SKIPPED</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={[styles.swissValue, { color: C.red }]}>{monthlyStats.filteredTotal - monthlyStats.filteredCompleted}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.swissCell}>
                    <Text style={styles.swissLabel}>CONSISTENCY</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={[styles.swissValue, { color: C.green }]}>{monthlyStats.consistencyRate}%</Text>
                    </View>
                  </View>
                  <View style={styles.swissCellDivider} />
                  <View style={styles.swissCell}>
                    <Text style={styles.swissLabel}>PERFECT DAYS</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={[styles.swissValue, { color: C.amber }]}>{monthlyStats.perfectDays}</Text>
                    </View>
                  </View>
                  <View style={styles.swissCellDivider} />
                  <View style={styles.swissCell}>
                    <Text style={styles.swissLabel}>AVG SCORE</Text>
                    <View style={styles.swissDataRow}>
                      <Text style={styles.swissValue}>{monthlyStats.avgScore}</Text>
                      <Text style={styles.swissSub}>/ 100</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Calendar Core Card */}
        <Animated.View style={[styles.calCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Calendar Header / Month Nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => animateMonthChange('prev')} style={styles.navBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={() => animateMonthChange('next')} style={styles.navBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Weekday labels starting Monday */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map(d => (
              <Text key={d} style={styles.weekdayLabel}>{d}</Text>
            ))}
          </View>

          {/* Animated Grid Container */}
          <Animated.View style={{ opacity: gridAnim, transform: [{ translateX: gridX }] }}>
            <View style={styles.daysGrid}>
              {/* Empty padding cells */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell} />
              ))}
              
              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const ds = dateStr(viewYear, viewMonth, day);
                const isFut = ds > todayStr;
                const cellColor = getDayColor(ds);
                const isSelected = selectedDate === ds;
                const hasJournal = journalEntries.some(e => e.date === ds);
                const hasRelapse = relapseLogs.some(r => r.date === ds);
                const todayDay = ds === todayStr;

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => {
                      if (!isFut) {
                        setSelectedDate(isSelected ? null : ds);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isFut && { opacity: 0.25 },
                    ]}
                    activeOpacity={isFut ? 1 : 0.7}
                  >
                    <View style={[
                      styles.dayNumBg,
                      todayDay && styles.todayNumBg,
                      cellColor && !selectedFilterMetricId && { backgroundColor: cellColor + '1C' },
                      cellColor && selectedFilterMetricId && { backgroundColor: cellColor + '2A' },
                    ]}>
                      <Text style={[
                        styles.dayNum,
                        todayDay && styles.todayNum,
                        cellColor && { color: cellColor, fontFamily: 'Inter_700Bold' },
                      ]}>
                        {day}
                      </Text>
                    </View>

                    {/* Small indicators */}
                    <View style={styles.indicatorRow}>
                      {hasJournal && <View style={[styles.miniDot, { backgroundColor: C.purple }]} />}
                      {hasRelapse && <View style={[styles.miniDot, { backgroundColor: C.red }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* Legends */}
          <View style={styles.legend}>
            {selectedFilterMetricId ? (
              <>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.green }]} />
                  <Text style={styles.legendText}>Completed</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.red }]} />
                  <Text style={styles.legendText}>Skipped/Failed</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.surfaceHigh }]} />
                  <Text style={styles.legendText}>Unlogged</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.green }]} />
                  <Text style={styles.legendText}>Strong (70%+)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.amber }]} />
                  <Text style={styles.legendText}>Building (40%+)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.red }]} />
                  <Text style={styles.legendText}>Needs work</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.purple }]} />
                  <Text style={styles.legendText}>Journal</Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Selected Day Details Panel */}
        {selectedDate && (
          <View style={styles.dayDetail}>
            <View style={styles.dayDetailHeader}>
              <View>
                <Text style={styles.dayDetailDate}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                  })}
                </Text>
                {selectedDate === todayStr && (
                  <Text style={styles.todayBadge}>TODAY</Text>
                )}
              </View>
              {selectedScore !== null && (
                <View style={[
                  styles.scoreChip,
                  {
                    backgroundColor: (selectedScore >= 70 ? C.green : selectedScore >= 40 ? C.amber : C.red) + '1E',
                    borderColor: (selectedScore >= 70 ? C.green : selectedScore >= 40 ? C.amber : C.red) + '60'
                  }
                ]}>
                  <Text style={[
                    styles.scoreChipNum,
                    { color: selectedScore >= 70 ? C.green : selectedScore >= 40 ? C.amber : C.red }
                  ]}>
                    {selectedScore}%
                  </Text>
                </View>
              )}
            </View>

            {/* Habit Checklist Section */}
            {totalLogged > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  HABITS CHECKED — {completedMetrics.length}/{totalLogged}
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[
                    styles.progressBarFill,
                    {
                      width: `${(completedMetrics.length / totalLogged) * 100}%` as any,
                      backgroundColor: selectedScore && selectedScore >= 70 ? C.green : selectedScore && selectedScore >= 40 ? C.amber : C.red,
                    }
                  ]} />
                </View>
                {selectedLogs.map(log => {
                  const metric = metrics.find(m => m.id === log.metricId);
                  if (!metric) return null;
                  const isGood = metric.category === 'build' ? log.value > 0 : (metric.category === 'reduce' ? log.value === 0 : true);
                  return (
                    <View key={log.id} style={styles.logRow}>
                      <Ionicons
                        name={isGood ? 'checkmark-circle' : 'close-circle'}
                        size={18}
                        color={isGood ? C.green : C.red}
                      />
                      <Text style={styles.logMetricName}>{metric.emoji ?? '📊'} {metric.name}</Text>
                      <Text style={[styles.logValue, { color: isGood ? C.green : C.textSub }]}>
                        {metric.inputType === 'boolean'
                          ? (log.value ? 'Completed' : 'Skipped')
                          : `${log.value}${metric.unitLabel ? ' ' + metric.unitLabel : ''}`
                        }
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyBlock}>
                <Ionicons name="moon-outline" size={24} color={C.textDim} />
                <Text style={styles.emptyText}>No habit logged for this day</Text>
              </View>
            )}

            {/* Journal Section */}
            {selectedJournal && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DAILY REFLECTION</Text>
                <View style={styles.journalBlock}>
                  <View style={styles.moodRow}>
                    <View style={[styles.moodChip, { backgroundColor: C.accentLight + '12' }]}>
                      <Text style={[styles.moodChipText, { color: C.accentLight }]}>
                        😊 Mood {selectedJournal.mood}/10
                      </Text>
                    </View>
                    <View style={[styles.moodChip, { backgroundColor: C.purpleDim }]}>
                      <Text style={[styles.moodChipText, { color: C.purple }]}>
                        ⚡ Energy {selectedJournal.energy}/10
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.journalPrompt}>"{selectedJournal.prompt}"</Text>
                  <Text style={styles.journalResponse}>{selectedJournal.response}</Text>
                </View>
              </View>
            )}

            {/* Relapse/Recovery Events Section */}
            {selectedRelapses.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: C.red }]}>RELAPSE EVENTS</Text>
                {selectedRelapses.map(r => (
                  <View key={r.id} style={styles.relapseBlock}>
                    <Ionicons name="alert-circle-outline" size={18} color={C.red} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.relapseName}>{r.metricName}</Text>
                      <Text style={styles.relapseText}>{r.triggerReflection}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.glassBorder,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: C.text },
  content: { padding: 16, gap: 20 },
  
  // Section Headers
  sectionLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: C.textDim, letterSpacing: 2, marginBottom: 4 },

  // Habit Filters
  filterScroll: { gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.glassBorder,
  },
  filterChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accentLight,
  },
  filterChipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: C.textSub },
  filterChipTextActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },

  // Swiss Stats Grid
  statsContainer: { backgroundColor: C.glass, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.glassBorder },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: C.glassBorder, paddingBottom: 10 },
  statsTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.text, letterSpacing: 0.5 },
  statsSubtitle: { fontSize: 11, fontFamily: 'Inter_500Medium', color: C.textDim },
  swissGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  swissCell: { flex: 1 },
  swissCellDivider: { width: 1, height: '80%', backgroundColor: C.glassBorder, marginHorizontal: 12 },
  swissLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', color: C.textDim, letterSpacing: 1.5, marginBottom: 4 },
  swissDataRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  swissValue: { fontSize: 22, fontFamily: 'Inter_700Bold', color: C.text, letterSpacing: -0.5 },
  swissSub: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: C.textSub },

  // Calendar
  calCard: {
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 20,
    padding: 16,
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: C.text },
  
  weekdayRow: { flexDirection: 'row', marginBottom: 12 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontFamily: 'Inter_600SemiBold', color: C.textDim, letterSpacing: 0.5 },
  
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 0.95,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    marginBottom: 4,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.accent,
  },
  dayNumBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayNumBg: {
    backgroundColor: C.accent + '25',
    borderWidth: 1,
    borderColor: C.accentLight,
  },
  dayNum: { fontSize: 13, fontFamily: 'Inter_500Medium', color: C.textSub },
  todayNum: { color: C.accentLight, fontFamily: 'Inter_700Bold' },
  
  indicatorRow: { flexDirection: 'row', gap: 3, height: 4, marginTop: 4, justifyContent: 'center' },
  miniDot: { width: 4, height: 4, borderRadius: 2 },
  
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.glassBorder, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: C.textDim },

  // Selected Day Detail Panel
  dayDetail: {
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  dayDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDetailDate: { fontSize: 15, fontFamily: 'Inter_700Bold', color: C.text, flex: 1 },
  todayBadge: { fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 2, color: C.accentLight, marginTop: 4 },
  
  scoreChip: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  scoreChipNum: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  
  section: { gap: 10 },
  sectionTitle: { fontSize: 9, fontFamily: 'Inter_700Bold', color: C.textDim, letterSpacing: 2 },
  progressBarBg: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progressBarFill: { height: 4, borderRadius: 2 },
  
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.glassBorder,
  },
  logMetricName: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', color: C.text },
  logValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  
  journalBlock: { padding: 12, gap: 10, backgroundColor: C.purpleDim, borderRadius: 14, borderWidth: 1, borderColor: C.purple + '20' },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  moodChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  journalPrompt: { fontSize: 12, fontFamily: 'Inter_500Medium', color: C.textSub, fontStyle: 'italic' },
  journalResponse: { fontSize: 13, fontFamily: 'Inter_400Regular', color: C.text, lineHeight: 18 },
  
  relapseBlock: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: C.redDim, borderColor: C.red + '25', borderWidth: 1, borderRadius: 14 },
  relapseName: { fontSize: 13, fontFamily: 'Inter_700Bold', color: C.red },
  relapseText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: C.textSub, marginTop: 4, lineHeight: 16 },
  
  emptyBlock: { alignItems: 'center', padding: 20, gap: 6, borderWidth: 1, borderColor: C.glassBorder, borderStyle: 'dashed', borderRadius: 14 },
  emptyText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: C.textDim, textAlign: 'center' },
});
