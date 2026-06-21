import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
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
import { DisciplineScoreRing } from '@/components/DisciplineScoreRing';
import { useApp, BADGES, CorrelationInsight } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { AVAILABLE_PROGRAMS } from '@/constants/program';

const SCORE_WEIGHTS = [
  { label: 'Build habits', pct: 38, color: '#22c55e', icon: 'trending-up-outline' as const },
  { label: 'Reduce habits', pct: 32, color: '#ef4444', icon: 'trending-down-outline' as const },
  { label: 'Focus bonus', pct: 10, color: '#6366f1', icon: 'time-outline' as const },
  { label: 'Monitoring', pct: 20, color: '#f59e0b', icon: 'pulse-outline' as const },
];

function HeatmapDot({ date, hasLog, isToday, colors }: { date: string; hasLog: boolean; isToday: boolean; colors: any }) {
  const d = new Date(date + 'T12:00:00');
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
  const dayNum = d.getDate();
  return (
    <View style={hmStyles.col}>
      <Text style={[hmStyles.dayLetter, { color: colors.mutedForeground }]}>{dayLabel}</Text>
      <View style={[hmStyles.dot, {
        backgroundColor: isToday
          ? colors.primary
          : hasLog
            ? colors.scoreGreen
            : colors.border,
        borderWidth: isToday ? 2 : 0,
        borderColor: colors.primary + '80',
      }]}>
        {isToday && !hasLog && <View style={[hmStyles.innerDot, { backgroundColor: colors.primary + '40' }]} />}
      </View>
      <Text style={[hmStyles.dayNum, { color: isToday ? colors.primary : hasLog ? colors.scoreGreen : colors.mutedForeground }]}>
        {dayNum}
      </Text>
    </View>
  );
}

const hmStyles = StyleSheet.create({
  col: { alignItems: 'center', gap: 4, flex: 1 },
  dayLetter: { fontSize: 9, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  innerDot: { width: 10, height: 10, borderRadius: 5 },
  dayNum: { fontSize: 9, fontFamily: 'Inter_700Bold' },
});

function InsightCard({ insight, colors }: { insight: CorrelationInsight; colors: any }) {
  return (
    <View style={[icStyles.card, {
      backgroundColor: insight.color + '0E',
      borderColor: insight.color + '30',
      borderRadius: 14,
    }]}>
      <View style={icStyles.row}>
        <View style={[icStyles.iconWrap, { backgroundColor: insight.color + '20' }]}>
          <Text style={icStyles.icon}>{insight.icon}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={icStyles.header}>
            <Text style={[icStyles.badge, { color: insight.color, backgroundColor: insight.color + '18' }]}>
              {insight.type === 'correlation' ? 'INSIGHT' :
               insight.type === 'streak' ? 'STREAK' :
               insight.type === 'trend' ? 'TREND' : 'TODAY'}
            </Text>
          </View>
          <Text style={[icStyles.title, { color: '#fff' }]}>{insight.title}</Text>
          <Text style={[icStyles.body, { color: '#ffffff99' }]}>{insight.body}</Text>
        </View>
      </View>
    </View>
  );
}

const icStyles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14, gap: 0 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  title: { fontSize: 14, fontFamily: 'Inter_700Bold', lineHeight: 20 },
  body: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});

function CompactHabitRow({ metric, value, onToggle, colors }: {
  metric: any; value: number | undefined; onToggle: () => void; colors: any;
}) {
  const done = metric.category === 'build' ? value === 1 : metric.category === 'reduce' ? value === 0 : value !== undefined;
  const bad = metric.category === 'reduce' && value !== undefined && value > 0;
  return (
    <TouchableOpacity
      onPress={() => { onToggle(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      style={[chrStyles.row, {
        backgroundColor: done ? (bad ? '#ef444410' : colors.scoreGreen + '10') : colors.background,
        borderColor: done ? (bad ? '#ef444440' : colors.scoreGreen + '40') : colors.border,
        borderRadius: 10,
      }]}
      activeOpacity={0.7}
    >
      <View style={[chrStyles.check, {
        backgroundColor: done ? (bad ? '#ef4444' : colors.scoreGreen) : 'transparent',
        borderColor: done ? (bad ? '#ef4444' : colors.scoreGreen) : colors.border,
      }]}>
        {done && <Ionicons name={bad ? 'alert' : 'checkmark'} size={11} color="#fff" />}
      </View>
      <Text style={chrStyles.emoji}>{metric.emoji ?? '📊'}</Text>
      <Text style={[chrStyles.name, {
        color: done ? (bad ? '#ef4444' : colors.scoreGreen) : colors.foreground,
        textDecorationLine: (done && !bad) ? 'line-through' : 'none',
      }]} numberOfLines={1}>
        {metric.name}
      </Text>
      {value !== undefined && metric.inputType !== 'boolean' && (
        <Text style={[chrStyles.val, { color: done ? colors.scoreGreen : colors.mutedForeground }]}>
          {value}{metric.unitLabel ? ` ${metric.unitLabel}` : ''}
        </Text>
      )}
      {value === undefined && (
        <Text style={[chrStyles.tapHint, { color: colors.mutedForeground }]}>tap</Text>
      )}
    </TouchableOpacity>
  );
}

const chrStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 15 },
  name: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  val: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  tapHint: { fontSize: 10, fontFamily: 'Inter_400Regular' },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    disciplineScore, metrics, logMetric, getLogForDate,
    profile, totalXP, currentLevel, levelProgress, levelMax,
    currentStreak, graceStreakActive, highestStreak, badges, dayScore,
    focusMinutesToday, journalEntries, getStreakRisk, getMissedDays,
    relapseLogs, correlationInsights, availablePrograms, getProgramProgress,
  } = useApp();

  const today = new Date().toISOString().split('T')[0];
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [insightIndex, setInsightIndex] = useState(0);
  const [formulaExpanded, setFormulaExpanded] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const streakRisk = getStreakRisk();
  const missedDays = getMissedDays(7);
  const todayJournal = journalEntries.find(e => e.date === today);
  const currentInsight = correlationInsights[insightIndex % correlationInsights.length];

  const completedToday = useMemo(() => metrics.filter(m => {
    const log = getLogForDate(m.id, today);
    if (!log) return false;
    if (m.category === 'build') return log.value > 0;
    if (m.category === 'reduce') return log.value === 0;
    return !!log;
  }).length, [metrics, getLogForDate, today]);

  const last7Days = useMemo(() => {
    const days: { date: string; hasLog: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, hasLog: !!getLogForDate(metrics[0]?.id, dateStr) || i === 0 });
    }
    return days;
  }, [metrics, getLogForDate]);

  const last7DatesWithLogs = useMemo(() => {
    const days: { date: string; hasLog: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const logged = metrics.some(m => getLogForDate(m.id, dateStr) !== undefined);
      days.push({ date: dateStr, hasLog: logged });
    }
    return days;
  }, [metrics, getLogForDate]);

  const streakColor = currentStreak >= 30 ? '#f59e0b' : currentStreak >= 14 ? colors.scoreGreen : currentStreak >= 7 ? colors.primary : colors.mutedForeground;

  const scoreLabel = disciplineScore >= 90 ? 'Legendary' :
    disciplineScore >= 75 ? 'On Track' :
    disciplineScore >= 40 ? 'Building' : 'Needs Focus';

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = profile.name ? `, ${profile.name}` : '';

  const enrolledPrograms = availablePrograms.filter(p => profile.activeProgramIds.includes(p.id));

  const handleHabitToggle = (metric: any) => {
    const log = getLogForDate(metric.id, today);
    if (metric.inputType === 'boolean') {
      const newVal = log?.value === 1 ? 0 : 1;
      logMetric(metric.id, today, newVal);
    } else {
      router.push('/(tabs)/track');
    }
  };

  const bgColor = colors.background;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      contentContainerStyle={[styles.content, {
        paddingTop: topPadding + 12,
        paddingBottom: Platform.OS === 'web' ? 140 : 120,
      }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {greeting}{displayName}
          </Text>
          <Text style={[styles.dateText, { color: colors.foreground }]}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/pomodoro')} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7}>
            <Ionicons name="timer-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/calendar')} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── GRACE DAY NOTICE ─── */}
      {graceStreakActive && (
        <View style={[styles.alertCard, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b40', borderRadius: colors.radius }]}>
          <Text style={styles.alertEmoji}>🌿</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.alertTitle, { color: '#f59e0b' }]}>Grace Day Active</Text>
            <Text style={[styles.alertText, { color: colors.mutedForeground }]}>
              You missed yesterday — your streak is protected. Log today to keep it.
            </Text>
          </View>
        </View>
      )}

      {streakRisk && currentStreak > 0 && !graceStreakActive && (
        <View style={[styles.alertCard, { backgroundColor: colors.scoreRed + '15', borderColor: colors.scoreRed + '40', borderRadius: colors.radius }]}>
          <Ionicons name="flame-outline" size={20} color={colors.scoreRed} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.alertTitle, { color: colors.scoreRed }]}>Streak at Risk</Text>
            <Text style={[styles.alertText, { color: colors.mutedForeground }]}>
              Log something now to protect your {currentStreak}-day streak.
            </Text>
          </View>
        </View>
      )}

      {/* ─── SCORE HERO ─── */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.heroRow}>
          <DisciplineScoreRing score={disciplineScore} size={140} />
          <View style={styles.heroRight}>
            <View style={[styles.levelRow, { backgroundColor: colors.primary + '12', borderRadius: 10, borderColor: colors.primary + '30' }]}>
              <Text style={[styles.levelNum, { color: colors.primary }]}>LVL {currentLevel}</Text>
              <View style={styles.levelBarWrap}>
                <View style={[styles.levelBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.levelBarFill, { width: `${(levelProgress / levelMax) * 100}%` as any, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.levelSub, { color: colors.mutedForeground }]}>{levelMax - levelProgress} XP left</Text>
              </View>
            </View>

            <View style={styles.xpStreakRow}>
              <View style={styles.statBlock}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{totalXP}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total XP</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statBlock}>
                <Text style={[styles.statNum, { color: streakColor }]}>🔥{currentStreak}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  {currentStreak === highestStreak && currentStreak > 0 ? 'RECORD' : `Best ${highestStreak}`}
                </Text>
              </View>
            </View>

            <View style={styles.progressRow}>
              <Text style={[styles.progressNum, { color: completedToday >= metrics.length ? colors.scoreGreen : colors.foreground }]}>
                {completedToday}<Text style={[styles.progressDen, { color: colors.mutedForeground }]}>/{metrics.length}</Text>
              </Text>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>today</Text>
            </View>
            <View style={styles.progressBarRow}>
              {metrics.slice(0, 12).map((m, i) => {
                const log = getLogForDate(m.id, today);
                const done = log ? (m.category === 'build' ? log.value > 0 : m.category === 'reduce' ? log.value === 0 : true) : false;
                return (
                  <View key={m.id} style={[styles.progressSegment, {
                    backgroundColor: done ? colors.scoreGreen : colors.border,
                    flex: 1,
                  }]} />
                );
              })}
            </View>
          </View>
        </View>

        {badges.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
            <View style={styles.badgeRow}>
              {badges.slice(-6).map(bId => {
                const badge = BADGES.find(b => b.id === bId);
                if (!badge) return null;
                return (
                  <View key={bId} style={[styles.badgeChip, { backgroundColor: colors.primary + '15', borderRadius: 8 }]}>
                    <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    <Text style={[styles.badgeName, { color: colors.primary }]}>{badge.name}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        <TouchableOpacity
          onPress={() => setFormulaExpanded(!formulaExpanded)}
          style={[styles.formulaToggle, { borderTopColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="calculator-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.formulaToggleText, { color: colors.mutedForeground }]}>
            {formulaExpanded ? 'Hide score formula' : 'How is my score calculated?'}
          </Text>
          <Ionicons name={formulaExpanded ? 'chevron-up' : 'chevron-down'} size={12} color={colors.mutedForeground} />
        </TouchableOpacity>

        {formulaExpanded && (
          <View style={[styles.formulaBody, { borderTopColor: colors.border }]}>
            <Text style={[styles.formulaDesc, { color: colors.mutedForeground }]}>
              Your discipline score is a weighted combination of four dimensions:
            </Text>
            {SCORE_WEIGHTS.map(w => (
              <View key={w.label} style={styles.formulaRow}>
                <Ionicons name={w.icon} size={13} color={w.color} />
                <Text style={[styles.formulaRowLabel, { color: colors.foreground }]}>{w.label}</Text>
                <View style={[styles.formulaBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.formulaBarFill, { width: `${w.pct}%` as any, backgroundColor: w.color }]} />
                </View>
                <Text style={[styles.formulaRowPct, { color: w.color }]}>{w.pct}%</Text>
              </View>
            ))}
            <Text style={[styles.formulaFooter, { color: colors.mutedForeground }]}>
              Focus bonus adds up to +10 pts for 90+ min of deep work.
            </Text>
          </View>
        )}
      </View>

      {/* ─── INSIGHT CARD ─── */}
      {currentInsight && (
        <View style={{ gap: 8 }}>
          <InsightCard insight={currentInsight} colors={colors} />
          {correlationInsights.length > 1 && (
            <View style={styles.insightNav}>
              {correlationInsights.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setInsightIndex(i)} activeOpacity={0.7}>
                  <View style={[styles.insightDot, {
                    backgroundColor: i === insightIndex % correlationInsights.length ? colors.primary : colors.border,
                    width: i === insightIndex % correlationInsights.length ? 16 : 6,
                  }]} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setInsightIndex(prev => (prev + 1) % correlationInsights.length)}
                style={[styles.insightNextBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.insightNextText, { color: colors.mutedForeground }]}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ─── 7-DAY HEATMAP ─── */}
      <View style={[styles.heatmapCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>THIS WEEK</Text>
          <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
            {last7DatesWithLogs.filter(d => d.hasLog).length}/7 days logged
          </Text>
        </View>
        <View style={styles.heatmapRow}>
          {last7DatesWithLogs.map(({ date, hasLog }) => (
            <HeatmapDot key={date} date={date} hasLog={hasLog} isToday={date === today} colors={colors} />
          ))}
        </View>
        <View style={styles.heatmapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.scoreGreen }]} />
            <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>Logged</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>Today</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
            <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>Missed</Text>
          </View>
        </View>
      </View>

      {/* ─── ACTIVE PROGRAMS ─── */}
      {enrolledPrograms.length > 0 && (
        <View style={{ gap: 6 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACTIVE PROGRAMS</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/program')} activeOpacity={0.7}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>Manage →</Text>
            </TouchableOpacity>
          </View>
          {enrolledPrograms.map(prog => {
            const progress = getProgramProgress(prog.id);
            if (!progress) return null;
            const pct = (progress.completedWeeks.length / prog.totalWeeks) * 100;
            return (
              <TouchableOpacity
                key={prog.id}
                onPress={() => router.push('/(tabs)/program')}
                style={[styles.programMini, { backgroundColor: prog.color + '0E', borderColor: prog.color + '30', borderRadius: colors.radius }]}
                activeOpacity={0.8}
              >
                <Text style={styles.programMiniEmoji}>{prog.emoji}</Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.programMiniTop}>
                    <Text style={[styles.programMiniTitle, { color: colors.foreground }]} numberOfLines={1}>{prog.title}</Text>
                    <View style={[styles.weekBadge, { backgroundColor: prog.color }]}>
                      <Text style={styles.weekBadgeText}>W{progress.currentWeek}</Text>
                    </View>
                  </View>
                  <View style={[styles.programBarBg, { backgroundColor: prog.color + '20' }]}>
                    <View style={[styles.programBarFill, { width: `${pct}%` as any, backgroundColor: prog.color }]} />
                  </View>
                  <Text style={[styles.programBarLabel, { color: prog.color }]}>
                    {progress.completedWeeks.length}/{prog.totalWeeks} weeks · {Math.round(pct)}% complete
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={prog.color} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ─── TODAY'S HABITS ─── */}
      <View style={{ gap: 8 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>TODAY'S HABITS</Text>
          <View style={styles.habitCountRow}>
            <View style={[styles.habitCountBadge, {
              backgroundColor: completedToday === metrics.length ? colors.scoreGreen + '20' : colors.primary + '15',
            }]}>
              <Text style={[styles.habitCountText, {
                color: completedToday === metrics.length ? colors.scoreGreen : colors.primary,
              }]}>
                {completedToday}/{metrics.length}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/track')} activeOpacity={0.7}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>All →</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          {metrics.slice(0, 8).map(metric => {
            const log = getLogForDate(metric.id, today);
            return (
              <CompactHabitRow
                key={metric.id}
                metric={metric}
                value={log?.value}
                onToggle={() => handleHabitToggle(metric)}
                colors={colors}
              />
            );
          })}
          {metrics.length > 8 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/track')}
              style={[styles.showMoreBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.showMoreText, { color: colors.mutedForeground }]}>
                +{metrics.length - 8} more in Track →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── JOURNAL CARD ─── */}
      <View style={[styles.journalCard, {
        backgroundColor: todayJournal ? '#6366f10E' : colors.card,
        borderColor: todayJournal ? '#6366f130' : colors.border,
        borderRadius: colors.radius,
      }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.journalHeaderLeft}>
            <Ionicons name={todayJournal ? 'book' : 'book-outline'} size={16} color={todayJournal ? '#6366f1' : colors.mutedForeground} />
            <Text style={[styles.sectionTitle, { color: todayJournal ? '#6366f1' : colors.mutedForeground }]}>
              {todayJournal ? 'REFLECTION DONE' : 'DAILY REFLECTION'}
            </Text>
          </View>
          {todayJournal && (
            <View style={styles.journalMoodRow}>
              <Text style={[styles.journalMoodText, { color: colors.mutedForeground }]}>
                😊 {todayJournal.mood}/10 · ⚡ {todayJournal.energy}/10
              </Text>
            </View>
          )}
        </View>
        {todayJournal ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.journalPreview, { color: colors.foreground }]} numberOfLines={3}>
              {todayJournal.response}
            </Text>
            {(todayJournal.tags?.length ?? 0) > 0 && (
              <View style={styles.tagRow}>
                {todayJournal.tags!.slice(0, 4).map(tag => (
                  <View key={tag} style={[styles.tag, { backgroundColor: '#6366f118' }]}>
                    <Text style={[styles.tagText, { color: '#6366f1' }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/journal')}
              style={[styles.journalEditBtn, { borderColor: '#6366f140' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={14} color="#6366f1" />
              <Text style={[styles.journalEditText, { color: '#6366f1' }]}>Edit today's entry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={[styles.journalPrompt, { color: colors.foreground }]}>
              {profile.activeProgramIds[0] === 'morning-mastery'
                ? '"What energized or drained you most this morning?"'
                : '"What did you notice about your behavior today without judgment?"'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/journal')}
              style={[styles.journalWriteBtn, { backgroundColor: '#6366f1' }]}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.journalWriteBtnText}>Write today's entry · +25 XP</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── QUICK ACTIONS ─── */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          onPress={() => router.push('/pomodoro')}
          style={[styles.quickAction, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
          activeOpacity={0.8}
        >
          <Ionicons name="timer-outline" size={22} color={colors.primary} />
          <Text style={[styles.quickActionLabel, { color: colors.primary }]}>Focus</Text>
          {focusMinutesToday > 0 && (
            <Text style={[styles.quickActionSub, { color: colors.mutedForeground }]}>{focusMinutesToday}m done</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/track')}
          style={[styles.quickAction, { backgroundColor: colors.scoreGreen + '10', borderColor: colors.scoreGreen + '30' }]}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-done-outline" size={22} color={colors.scoreGreen} />
          <Text style={[styles.quickActionLabel, { color: colors.scoreGreen }]}>Track</Text>
          <Text style={[styles.quickActionSub, { color: colors.mutedForeground }]}>{completedToday}/{metrics.length} done</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/journal')}
          style={[styles.quickAction, { backgroundColor: '#6366f110', borderColor: '#6366f130' }]}
          activeOpacity={0.8}
        >
          <Ionicons name="book-outline" size={22} color="#6366f1" />
          <Text style={[styles.quickActionLabel, { color: '#6366f1' }]}>Journal</Text>
          <Text style={[styles.quickActionSub, { color: colors.mutedForeground }]}>{journalEntries.length} entries</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Ionicons name="person-outline" size={22} color={colors.mutedForeground} />
          <Text style={[styles.quickActionLabel, { color: colors.mutedForeground }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ─── RESET BUTTON ─── */}
      <TouchableOpacity
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.push('/relapse');
        }}
        style={[styles.relapseBtn, { borderColor: colors.destructive + '40', borderRadius: colors.radius }]}
        activeOpacity={0.7}
      >
        <Ionicons name="shield-outline" size={15} color={colors.destructive} />
        <Text style={[styles.relapseBtnText, { color: colors.destructive }]}>Had a setback? Reflect & Reset</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  dateText: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  alertCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderWidth: 1.5 },
  alertEmoji: { fontSize: 18 },
  alertTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  alertText: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  heroCard: { borderWidth: 1, padding: 16, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroRight: { flex: 1, gap: 10 },
  levelRow: { padding: 10, borderWidth: 1, gap: 4 },
  levelNum: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  levelBarWrap: { gap: 3 },
  levelBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  levelBarFill: { height: 4, borderRadius: 2 },
  levelSub: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  xpStreakRow: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center', gap: 1 },
  statNum: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 9, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 24 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  progressNum: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  progressDen: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  progressLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  progressBarRow: { flexDirection: 'row', gap: 2, height: 5, borderRadius: 3, overflow: 'hidden' },
  progressSegment: { borderRadius: 2 },
  badgeScroll: { marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  badgeEmoji: { fontSize: 12 },
  badgeName: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  formulaToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1 },
  formulaToggleText: { fontSize: 11, fontFamily: 'Inter_500Medium', flex: 1 },
  formulaBody: { borderTopWidth: 1, paddingTop: 10, gap: 8 },
  formulaDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  formulaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formulaRowLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', width: 100 },
  formulaBarBg: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  formulaBarFill: { height: 5, borderRadius: 3 },
  formulaRowPct: { fontSize: 11, fontFamily: 'Inter_700Bold', width: 32, textAlign: 'right' },
  formulaFooter: { fontSize: 10, fontFamily: 'Inter_400Regular', lineHeight: 15 },
  insightNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightDot: { height: 6, borderRadius: 3, backgroundColor: '#fff' },
  insightNextBtn: { marginLeft: 'auto', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  insightNextText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  heatmapCard: { borderWidth: 1, padding: 14, gap: 12 },
  heatmapRow: { flexDirection: 'row', gap: 4 },
  heatmapLegend: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  sectionMeta: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  sectionLink: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  habitCountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitCountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  habitCountText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  showMoreBtn: { alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10 },
  showMoreText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  programMini: { borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  programMiniEmoji: { fontSize: 22 },
  programMiniTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  programMiniTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },
  weekBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  weekBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
  programBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  programBarFill: { height: 4, borderRadius: 2 },
  programBarLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  journalCard: { borderWidth: 1, padding: 14, gap: 12 },
  journalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  journalMoodRow: {},
  journalMoodText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  journalPreview: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  journalEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, borderWidth: 1, borderRadius: 8, justifyContent: 'center' },
  journalEditText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  journalPrompt: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, fontStyle: 'italic' },
  journalWriteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 10 },
  journalWriteBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },
  quickActionsRow: { flexDirection: 'row', gap: 8 },
  quickAction: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4, borderWidth: 1, borderRadius: 12 },
  quickActionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  quickActionSub: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  relapseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1 },
  relapseBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
