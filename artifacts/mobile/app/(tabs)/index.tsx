import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DisciplineScoreRing } from '@/components/DisciplineScoreRing';
import { HabitItem } from '@/components/HabitItem';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { PROGRAM_WEEKS } from '@/constants/program';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { disciplineScore, metrics, logMetric, getLogForDate, profile } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const currentWeek = PROGRAM_WEEKS[Math.min(profile.currentWeek - 1, 7)];

  const topMetrics = useMemo(() =>
    metrics.filter(m => m.isDefault || !m.isCustom).slice(0, 8),
    [metrics]
  );

  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const completedToday = topMetrics.filter(m => {
    const log = getLogForDate(m.id, today);
    return log && log.value >= 0;
  }).length;

  const completionPct = topMetrics.length > 0 ? completedToday / topMetrics.length : 0;

  const handleRelapse = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.push('/relapse');
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{dayOfWeek}</Text>
          <Text style={[styles.date, { color: colors.foreground }]}>{dateStr}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/pomodoro')}
          style={[styles.pomodoroBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="timer-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.weekBadge, { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '40' }]}>
        <Text style={[styles.weekBadgeText, { color: colors.primary }]}>
          WEEK {profile.currentWeek} — {currentWeek?.theme?.toUpperCase()}
        </Text>
      </View>

      <View style={styles.scoreSection}>
        <DisciplineScoreRing score={disciplineScore} size={180} />
      </View>

      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.foreground }]}>Daily Check-In</Text>
          <Text style={[styles.progressCount, { color: colors.mutedForeground }]}>
            {completedToday}/{topMetrics.length}
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, {
            width: `${completionPct * 100}%` as any,
            backgroundColor: completionPct > 0.75 ? colors.scoreGreen : completionPct > 0.4 ? colors.scoreYellow : colors.scoreRed,
          }]} />
        </View>
        <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
          {completedToday === topMetrics.length
            ? 'All done for today — excellent.'
            : `${topMetrics.length - completedToday} remaining`}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>NON-NEGOTIABLES</Text>

      {topMetrics.map(metric => {
        const log = getLogForDate(metric.id, today);
        return (
          <HabitItem
            key={metric.id}
            metric={metric}
            value={log?.value}
            onToggle={(val) => logMetric(metric.id, today, val)}
            compact
          />
        );
      })}

      <TouchableOpacity
        onPress={handleRelapse}
        style={[styles.relapseBtn, { borderColor: colors.destructive + '60', borderRadius: colors.radius }]}
        activeOpacity={0.7}
      >
        <Ionicons name="warning-outline" size={18} color={colors.destructive} />
        <Text style={[styles.relapseBtnText, { color: colors.destructive }]}>Log a setback</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 4 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: { fontSize: 14, fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  date: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  pomodoroBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  weekBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  scoreSection: { alignItems: 'center', marginVertical: 12 },
  progressCard: {
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  progressCount: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  progressSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 4,
  },
  relapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 16,
  },
  relapseBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
