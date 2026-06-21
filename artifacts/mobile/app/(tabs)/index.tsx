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
import { useApp, BADGES } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { PROGRAM_WEEKS } from '@/constants/program';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    disciplineScore, metrics, logMetric, getLogForDate,
    profile, totalXP, currentLevel, levelProgress, levelMax,
    currentStreak, highestStreak, badges, dayScore, completionPct,
    focusMinutesToday, journalEntries, getStreakRisk, getMissedDays,
    getRecentActivity, relapseLogs,
  } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const currentWeek = PROGRAM_WEEKS[Math.min(profile.currentWeek - 1, 7)];
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const topMetrics = useMemo(() =>
    metrics.filter(m => m.isDefault || !m.isCustom).slice(0, 8),
    [metrics]
  );

  const completedToday = topMetrics.filter(m => {
    const log = getLogForDate(m.id, today);
    return log && log.value >= 0;
  }).length;

  const completedGood = topMetrics.filter(m => {
    const log = getLogForDate(m.id, today);
    if (!log) return false;
    if (m.category === 'build') return log.value > 0;
    if (m.category === 'reduce') return log.value === 0;
    return true;
  }).length;

  const missedDays = getMissedDays(7);
  const streakRisk = getStreakRisk();
  const recentActivity = getRecentActivity(5);
  const todayJournal = journalEntries.find(e => e.date === today);
  const journalCount = journalEntries.length;

  const weekProgress = currentWeek?.tasks
    ? currentWeek.tasks.filter(t => useMemo(() => ({
      progress: profile.currentWeek,
    }), [profile.currentWeek])).length
    : 0;

  const streakColor = currentStreak >= 14 ? colors.scoreGreen :
    currentStreak >= 7 ? colors.scoreYellow : colors.primary;

  const scoreLabel = disciplineScore >= 90 ? '⭐ Legendary' :
    disciplineScore >= 75 ? '✨ On Track' :
    disciplineScore >= 40 ? '💪 Building' : '🎯 Needs Focus';

  const isPerfectDay = dayScore === 100 && todayJournal && focusMinutesToday >= 30;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, {
        paddingTop: topPadding + 16,
        paddingBottom: Platform.OS === 'web' ? 140 : 120,
      }]}
      showsVerticalScrollIndicator={false}
    >
      {/* =========== HEADER =========== */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </Text>
          <Text style={[styles.date, { color: colors.foreground }]}>
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push('/calendar')}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/pomodoro')}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="timer-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* =========== GAMIFICATION BAR =========== */}
      <View style={[styles.gamifyCard, {
        backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius,
      }]}>
        <View style={styles.gamifyRow}>
          <View style={styles.xpBlock}>
            <Text style={[styles.xpNum, { color: colors.primary }]}>{totalXP}</Text>
            <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>XP</Text>
          </View>
          <View style={styles.levelDivider} />
          <View style={styles.levelBlock}>
            <Text style={[styles.levelNum, { color: colors.foreground }]}>
              LVL {currentLevel}
            </Text>
            <View style={[styles.levelBarBg, { backgroundColor: colors.border }]}>
              <View style={[styles.levelBarFill, {
                width: `${(levelProgress / levelMax) * 100}%` as any,
                backgroundColor: colors.primary,
              }]} />
            </View>
            <Text style={[styles.levelSub, { color: colors.mutedForeground }]}>
              {levelMax - levelProgress} XP to next level
            </Text>
          </View>
          <View style={styles.levelDivider} />
          <View style={styles.streakBlock}>
            <Text style={[styles.streakEmoji, { color: streakColor }]}>🔥</Text>
            <Text style={[styles.streakNum, { color: streakColor }]}>
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </Text>
            <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>
              {currentStreak > highestStreak ? 'NEW RECORD' : `Best: ${highestStreak}`}
            </Text>
          </View>
        </View>

        {badges.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
            <View style={styles.badgeRow}>
              {badges.slice(-6).map(badgeId => {
                const badge = BADGES.find(b => b.id === badgeId);
                if (!badge) return null;
                return (
                  <View key={badgeId} style={[styles.badgeChip, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    <Text style={[styles.badgeName, { color: colors.primary }]}>{badge.name}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* =========== ALERTS / WARNINGS =========== */}
      {isPerfectDay && (
        <View style={[styles.alertCard, { backgroundColor: colors.scoreGreen + '15', borderColor: colors.scoreGreen + '40', borderRadius: colors.radius }]}>
          <Text style={styles.alertEmoji}>⭐</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.alertTitle, { color: colors.scoreGreen }]}>Perfect Day!</Text>
            <Text style={[styles.alertText, { color: colors.mutedForeground }]}>
              All habits checked, journal written, and deep work done. Keep this momentum.
            </Text>
          </View>
        </View>
      )}

      {streakRisk && currentStreak > 0 && (
        <View style={[styles.alertCard, { backgroundColor: colors.scoreRed + '15', borderColor: colors.scoreRed + '40', borderRadius: colors.radius }]}>
          <Ionicons name="flame-outline" size={20} color={colors.scoreRed} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.alertTitle, { color: colors.scoreRed }]}>Streak at Risk</Text>
            <Text style={[styles.alertText, { color: colors.mutedForeground }]}>
              You didn't log yesterday. Log something now to keep your {currentStreak}-day streak alive.
            </Text>
          </View>
        </View>
      )}

      {missedDays.length > 1 && currentStreak === 0 && (
        <View style={[styles.alertCard, { backgroundColor: colors.scoreYellow + '15', borderColor: colors.scoreYellow + '40', borderRadius: colors.radius }]}>
          <Ionicons name="trending-up-outline" size={20} color={colors.scoreYellow} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.alertTitle, { color: colors.scoreYellow }]}>Restart Momentum</Text>
            <Text style={[styles.alertText, { color: colors.mutedForeground }]}>
              {missedDays.length} gaps in the last week. One log today starts a new streak.
            </Text>
          </View>
        </View>
      )}

      {relapseLogs.length > 0 && !isPerfectDay && !streakRisk && (
        <View style={[styles.alertCard, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '30', borderRadius: colors.radius }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.alertTitle, { color: colors.accent }]}>Recovery Mode</Text>
            <Text style={[styles.alertText, { color: colors.mutedForeground }]}>
              {relapseLogs.length} setback{relapseLogs.length > 1 ? 's' : ''} logged. Every day moving forward is a win.
            </Text>
          </View>
        </View>
      )}

      {/* =========== SCORE + STATS =========== */}
      <View style={[styles.scoreCard, {
        backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius,
      }]}>
        <View style={styles.scoreHeader}>
          <View style={styles.scoreLeft}>
            <Text style={[styles.scoreTitle, { color: colors.foreground }]}>
              {scoreLabel}
            </Text>
            <Text style={[styles.scoreSub, { color: colors.mutedForeground }]}>
              {completedGood}/{topMetrics.length} habits aligned
            </Text>
          </View>
          <View style={styles.scoreRight}>
            <Text style={[styles.scoreBig, { color: disciplineScore >= 75 ? colors.scoreGreen : disciplineScore >= 40 ? colors.scoreYellow : colors.scoreRed }]}>
              {disciplineScore}
            </Text>
            <Text style={[styles.scoreBigLabel, { color: colors.mutedForeground }]}>/100</Text>
          </View>
        </View>
        <View style={[styles.scoreBarBg, { backgroundColor: colors.border }]}>
          <View style={[styles.scoreBarFill, {
            width: `${disciplineScore}%` as any,
            backgroundColor: disciplineScore >= 75 ? colors.scoreGreen : disciplineScore >= 40 ? colors.scoreYellow : colors.scoreRed,
          }]} />
        </View>
        <View style={styles.scoreLabels}>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>0</Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>50</Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>100</Text>
        </View>
      </View>

      {/* =========== QUICK STATS ROW =========== */}
      <View style={styles.quickStats}>
        {[
          { icon: 'checkmark-done-outline', color: colors.scoreGreen, label: 'Done', value: `${completedGood}/${topMetrics.length}` },
          { icon: 'flame-outline', color: streakColor, label: 'Streak', value: `${currentStreak}d` },
          { icon: 'book-outline', color: colors.accent, label: 'Journal', value: `${journalCount}` },
          { icon: 'time-outline', color: colors.primary, label: 'Focus', value: `${focusMinutesToday}m` },
        ].map(s => (
          <View key={s.label} style={[styles.quickStat, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Ionicons name={s.icon as any} size={16} color={s.color} />
            <Text style={[styles.quickStatValue, { color: colors.foreground }]}>{s.value}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* =========== WEEK MISSION =========== */}
      <View style={[styles.missionCard, {
        backgroundColor: colors.primary + '10', borderColor: colors.primary + '40', borderRadius: colors.radius,
      }]}>
        <View style={styles.missionHeader}>
          <View style={[styles.missionBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.missionBadgeText}>WEEK {profile.currentWeek}</Text>
          </View>
          <Text style={[styles.missionTheme, { color: colors.foreground }]}>
            {currentWeek?.theme}
          </Text>
        </View>
        <Text style={[styles.missionGoal, { color: colors.mutedForeground }]}>{currentWeek?.goal}</Text>
        <TouchableOpacity
          onPress={() => router.push('/program')}
          style={[styles.missionBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}
        >
          <Text style={styles.missionBtnText}>Continue Mission →</Text>
        </TouchableOpacity>
      </View>

      {/* =========== DAILY REFLECTION =========== */}
      <View style={[styles.reflectionCard, {
        backgroundColor: colors.accent + '10', borderColor: colors.accent + '30', borderRadius: colors.radius,
      }]}>
        <View style={styles.reflectionHeader}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.accent} />
          <Text style={[styles.reflectionLabel, { color: colors.accent }]}>DAILY REFLECTION</Text>
        </View>
        {todayJournal ? (
          <View style={styles.reflectionDone}>
            <Text style={[styles.reflectionText, { color: colors.foreground }]}>
              {todayJournal.response.substring(0, 80)}{todayJournal.response.length > 80 ? '...' : ''}
            </Text>
            <View style={styles.reflectionMeta}>
              <View style={[styles.reflectionChip, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.reflectionChipText, { color: colors.primary }]}>
                  Mood {todayJournal.mood}/10
                </Text>
              </View>
              <View style={[styles.reflectionChip, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.reflectionChipText, { color: colors.accent }]}>
                  Energy {todayJournal.energy}/10
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.reflectionPrompt}>
            <Text style={[styles.reflectionText, { color: colors.foreground }]}>
              "What did you notice about your behavior today without judgment?"
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/journal')}
              style={[styles.reflectionBtn, { backgroundColor: colors.accent }]} activeOpacity={0.8}
            >
              <Text style={styles.reflectionBtnText}>Write today's entry +25 XP</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* =========== RECENT ACTIVITY =========== */}
      {recentActivity.length > 0 && (
        <View style={[styles.activitySection, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.activityTitle, { color: colors.foreground }]}>
            <Ionicons name="pulse-outline" size={14} color={colors.primary} /> Today's Activity
          </Text>
          {recentActivity.map((item, i) => (
            <View key={item.id} style={[styles.activityRow, { borderBottomColor: i < recentActivity.length - 1 ? colors.border : 'transparent' }]}>
              <Text style={styles.activityEmoji}>{item.emoji}</Text>
              <Text style={[styles.activityText, { color: colors.foreground }]}>{item.text}</Text>
              <Text style={[styles.activityXP, { color: item.xp && item.xp > 0 ? colors.scoreGreen : colors.mutedForeground }]}>
                {item.xp && item.xp > 0 ? `+${item.xp} XP` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* =========== HABIT CHECKLIST =========== */}
      <View style={styles.checklistSection}>
        <View style={styles.checklistHeader}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            TODAY'S CHECKLIST
          </Text>
          <View style={[styles.checklistBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.checklistBadgeText, { color: colors.primary }]}>
              {completedGood}/{topMetrics.length} done
            </Text>
          </View>
        </View>
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
      </View>

      {/* =========== QUICK ACTIONS =========== */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.push('/relapse');
          }}
          style={[styles.relapseBtn, { borderColor: colors.destructive + '50', borderRadius: colors.radius }]} activeOpacity={0.7}
        >
          <Ionicons name="shield-outline" size={16} color={colors.destructive} />
          <Text style={[styles.relapseBtnText, { color: colors.destructive }]}>Emergency — Log Setback</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 10 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  greeting: { fontSize: 14, fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  date: { fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  gamifyCard: { borderWidth: 1, padding: 14, gap: 10 },
  gamifyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpBlock: { alignItems: 'center', minWidth: 56 },
  xpNum: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  xpLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  levelDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },
  levelBlock: { flex: 1, gap: 4 },
  levelNum: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  levelBarBg: { height: 5, borderRadius: 3, overflow: 'hidden' },
  levelBarFill: { height: 5, borderRadius: 3 },
  levelSub: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  streakBlock: { alignItems: 'center', minWidth: 56 },
  streakEmoji: { fontSize: 20 },
  streakNum: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  streakLabel: { fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  badgeScroll: { marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeEmoji: { fontSize: 13 },
  badgeName: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },

  alertCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderWidth: 1.5 },
  alertEmoji: { fontSize: 20 },
  alertTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  alertText: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },

  scoreCard: { borderWidth: 1, padding: 16, gap: 8 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLeft: { gap: 2 },
  scoreTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  scoreSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  scoreRight: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  scoreBig: { fontSize: 36, fontFamily: 'Inter_700Bold', letterSpacing: -2 },
  scoreBigLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  scoreBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },

  quickStats: { flexDirection: 'row', gap: 8 },
  quickStat: {
    flex: 1, alignItems: 'center', gap: 3,
    paddingVertical: 12, borderWidth: 1,
  },
  quickStatValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  quickStatLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },

  missionCard: { borderWidth: 1.5, padding: 16, gap: 8 },
  missionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  missionBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  missionBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
  missionTheme: { fontSize: 15, fontFamily: 'Inter_700Bold', flex: 1 },
  missionGoal: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  missionBtn: { paddingVertical: 12, alignItems: 'center', borderRadius: 10, marginTop: 4 },
  missionBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },

  reflectionCard: { borderWidth: 1.5, padding: 14, gap: 8 },
  reflectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reflectionLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  reflectionDone: { gap: 8 },
  reflectionPrompt: { gap: 8 },
  reflectionText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  reflectionMeta: { flexDirection: 'row', gap: 8 },
  reflectionChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  reflectionChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  reflectionBtn: { paddingVertical: 12, alignItems: 'center', borderRadius: 10, marginTop: 2 },
  reflectionBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },

  activitySection: { borderWidth: 1, padding: 14, gap: 0 },
  activityTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  activityEmoji: { fontSize: 14, width: 20, textAlign: 'center' },
  activityText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  activityXP: { fontSize: 11, fontFamily: 'Inter_600SemiBold', minWidth: 50, textAlign: 'right' },

  checklistSection: { gap: 4 },
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  checklistBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  checklistBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  quickActions: { marginTop: 4 },
  relapseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, paddingVertical: 13,
  },
  relapseBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
