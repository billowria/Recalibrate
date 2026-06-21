import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Animated,
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

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { dailyLogs, journalEntries, metrics, relapseLogs, getJournalEntryForDate, getLogsForDate } = useApp();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().split('T')[0]);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const { firstDay, daysInMonth } = getMonthDays(viewYear, viewMonth);

  const activeDates = useMemo(() => {
    const set = new Set<string>();
    dailyLogs.forEach(l => set.add(l.date));
    journalEntries.forEach(e => set.add(e.date));
    return set;
  }, [dailyLogs, journalEntries]);

  const getDayScore = (date: string) => {
    const logs = dailyLogs.filter(l => l.date === date);
    if (logs.length === 0) return null;
    const completed = logs.filter(l => l.value > 0).length;
    return Math.round((completed / Math.max(logs.length, 1)) * 100);
  };

  const getDayColor = (score: number | null) => {
    if (score === null) return null;
    if (score >= 70) return colors.scoreGreen;
    if (score >= 40) return colors.scoreYellow;
    return colors.scoreRed;
  };

  const prevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const selectedLogs = selectedDate ? getLogsForDate(selectedDate) : [];
  const selectedJournal = selectedDate ? getJournalEntryForDate(selectedDate) : undefined;
  const selectedRelapses = selectedDate ? relapseLogs.filter(r => r.date === selectedDate) : [];
  const selectedScore = selectedDate ? getDayScore(selectedDate) : null;
  const selectedColor = getDayColor(selectedScore);

  const isToday = (d: string) => d === today.toISOString().split('T')[0];
  const isFuture = (year: number, month: number, day: number) => {
    const dt = new Date(year, month, day);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return dt > now;
  };

  const completedMetrics = selectedLogs.filter(l => {
    const metric = metrics.find(m => m.id === l.metricId);
    if (!metric) return false;
    if (metric.category === 'build') return l.value > 0;
    if (metric.category === 'reduce') return l.value === 0;
    return true;
  });

  const totalLogged = selectedLogs.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Activity Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 120 : 40 }]}
      >
        <View style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.foreground }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map(d => (
              <Text key={d} style={[styles.weekdayLabel, { color: colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds = dateStr(viewYear, viewMonth, day);
              const future = isFuture(viewYear, viewMonth, day);
              const score = future ? null : getDayScore(ds);
              const dotColor = getDayColor(score);
              const isSelected = selectedDate === ds;
              const hasJournal = journalEntries.some(e => e.date === ds);
              const hasRelapse = relapseLogs.some(r => r.date === ds);
              const todayDay = isToday(ds);

              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => {
                    if (!future) {
                      setSelectedDate(isSelected ? null : ds);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={[styles.dayCell, {
                    backgroundColor: isSelected ? colors.primary + '20' : 'transparent',
                    borderRadius: 8,
                    borderWidth: isSelected ? 1 : 0,
                    borderColor: colors.primary,
                    opacity: future ? 0.3 : 1,
                  }]}
                  activeOpacity={future ? 1 : 0.7}
                >
                  <Text style={[styles.dayNum, {
                    color: todayDay ? colors.primary : colors.foreground,
                    fontFamily: todayDay ? 'Inter_700Bold' : 'Inter_400Regular',
                  }]}>{day}</Text>
                  {dotColor && (
                    <View style={[styles.scoreDot, { backgroundColor: dotColor }]} />
                  )}
                  {!dotColor && !future && activeDates.has(ds) && (
                    <View style={[styles.scoreDot, { backgroundColor: colors.border }]} />
                  )}
                  <View style={styles.iconRow}>
                    {hasJournal && <View style={[styles.miniDot, { backgroundColor: colors.accent }]} />}
                    {hasRelapse && <View style={[styles.miniDot, { backgroundColor: colors.scoreRed }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.legend}>
            {[
              { color: colors.scoreGreen, label: 'Strong (70%+)' },
              { color: colors.scoreYellow, label: 'Building (40%)' },
              { color: colors.scoreRed, label: 'Needs work' },
              { color: colors.accent, label: 'Journal' },
            ].map(l => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {selectedDate && (
          <View style={[styles.dayDetail, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.dayDetailHeader}>
              <View>
                <Text style={[styles.dayDetailDate, { color: colors.foreground }]}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                  })}
                </Text>
                {isToday(selectedDate) && (
                  <Text style={[styles.todayBadge, { color: colors.primary }]}>TODAY</Text>
                )}
              </View>
              {selectedScore !== null && (
                <View style={[styles.scoreChip, { backgroundColor: (selectedColor ?? colors.border) + '20', borderColor: selectedColor ?? colors.border }]}>
                  <Text style={[styles.scoreChipNum, { color: selectedColor ?? colors.foreground }]}>
                    {selectedScore}%
                  </Text>
                </View>
              )}
            </View>

            {totalLogged > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  HABITS — {completedMetrics.length}/{totalLogged} completed
                </Text>
                <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressBarFill, {
                    width: `${totalLogged > 0 ? (completedMetrics.length / totalLogged) * 100 : 0}%` as any,
                    backgroundColor: selectedColor ?? colors.primary,
                  }]} />
                </View>
                {selectedLogs.map(log => {
                  const metric = metrics.find(m => m.id === log.metricId);
                  if (!metric) return null;
                  const isGood = metric.category === 'build' ? log.value > 0 : (metric.category === 'reduce' ? log.value === 0 : true);
                  return (
                    <View key={log.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                      <Ionicons
                        name={isGood ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={isGood ? colors.scoreGreen : colors.scoreRed}
                      />
                      <Text style={[styles.logMetricName, { color: colors.foreground }]}>{metric.name}</Text>
                      <Text style={[styles.logValue, { color: colors.mutedForeground }]}>
                        {metric.inputType === 'boolean'
                          ? (log.value ? 'Done' : 'Skipped')
                          : `${log.value}${metric.unitLabel ? ' ' + metric.unitLabel : ''}`
                        }
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyBlock, { borderColor: colors.border }]}>
                <Ionicons name="moon-outline" size={28} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No habit data for this day</Text>
              </View>
            )}

            {selectedJournal && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>JOURNAL ENTRY</Text>
                <View style={[styles.journalBlock, { backgroundColor: colors.accent + '12', borderRadius: 8 }]}>
                  <View style={styles.moodRow}>
                    <View style={[styles.moodChip, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.moodChipText, { color: colors.primary }]}>
                        Mood {selectedJournal.mood}/10
                      </Text>
                    </View>
                    <View style={[styles.moodChip, { backgroundColor: colors.accent + '20' }]}>
                      <Text style={[styles.moodChipText, { color: colors.accent }]}>
                        Energy {selectedJournal.energy}/10
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.journalPrompt, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {selectedJournal.prompt}
                  </Text>
                  <Text style={[styles.journalResponse, { color: colors.foreground }]} numberOfLines={5}>
                    {selectedJournal.response}
                  </Text>
                </View>
              </View>
            )}

            {selectedRelapses.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.scoreRed }]}>RELAPSE / RECOVERY EVENTS</Text>
                {selectedRelapses.map(r => (
                  <View key={r.id} style={[styles.relapseBlock, { backgroundColor: colors.scoreRed + '10', borderColor: colors.scoreRed + '30', borderRadius: 8 }]}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.scoreRed} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.relapseName, { color: colors.foreground }]}>{r.metricName}</Text>
                      <Text style={[styles.relapseText, { color: colors.mutedForeground }]}>{r.triggerReflection}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {totalLogged === 0 && !selectedJournal && selectedRelapses.length === 0 && (
              <View style={styles.section}>
                <Text style={[styles.nothingText, { color: colors.mutedForeground }]}>
                  Nothing logged on this day. Start checking in daily to build your history.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 16, gap: 16 },
  calCard: { borderWidth: 1, padding: 16 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 8 },
  monthTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  dayNum: { fontSize: 13 },
  scoreDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  iconRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
  miniDot: { width: 4, height: 4, borderRadius: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  dayDetail: { borderWidth: 1, padding: 16, gap: 16 },
  dayDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dayDetailDate: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  todayBadge: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginTop: 4 },
  scoreChip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  scoreChipNum: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  progressBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: 4, borderRadius: 2 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  logMetricName: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  logValue: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  journalBlock: { padding: 12, gap: 8 },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  moodChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  journalPrompt: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  journalResponse: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  relapseBlock: { flexDirection: 'row', gap: 10, padding: 10, borderWidth: 1 },
  relapseName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  relapseText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 16 },
  emptyBlock: { alignItems: 'center', padding: 24, gap: 8, borderWidth: 1, borderRadius: 10, borderStyle: 'dashed' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  nothingText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
});
