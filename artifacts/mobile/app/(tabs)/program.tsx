import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
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
import { PROGRAM_WEEKS } from '@/constants/program';

const XP_PER_TASK = 50;

const WEEK_ICONS = ['🧭', '🏠', '⚡', '🧠', '🪞', '🎯', '🤝', '🚀'];

const TYPE_CONFIG = {
  action: { color: '#6366f1', label: 'Action', icon: 'flash-outline' as const },
  reduction: { color: '#ef4444', label: 'Reduce', icon: 'trending-down-outline' as const },
  reflection: { color: '#f59e0b', label: 'Reflect', icon: 'bulb-outline' as const },
};

function XPBar({ earned, total, color }: { earned: number; total: number; color: string }) {
  const pct = total > 0 ? earned / total : 0;
  return (
    <View style={xpStyles.container}>
      <View style={[xpStyles.bg, { backgroundColor: color + '20' }]}>
        <View style={[xpStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[xpStyles.label, { color }]}>{earned} / {total} XP</Text>
    </View>
  );
}

const xpStyles = StyleSheet.create({
  container: { gap: 4 },
  bg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
});

function CheckAnimation({ onComplete }: { onComplete: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.spring(scale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start(() => {
      setTimeout(onComplete, 600);
    });
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
    </Animated.View>
  );
}

export default function ProgramScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, toggleWeekTask, isWeekTaskComplete, updateProfile, totalXP, currentLevel, currentStreak } = useApp();
  const [expandedWeek, setExpandedWeek] = useState<number>(profile.currentWeek);
  const [recentlyChecked, setRecentlyChecked] = useState<string | null>(null);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const getWeekStatus = (n: number) => {
    if (n < profile.currentWeek) return 'complete';
    if (n === profile.currentWeek) return 'active';
    return 'locked';
  };

  const getWeekXP = (n: number) => {
    const week = PROGRAM_WEEKS[n - 1];
    if (!week) return { earned: 0, total: 0, pct: 0 };
    const earned = week.tasks.filter(t => isWeekTaskComplete(n, t.id)).length * XP_PER_TASK;
    const total = week.tasks.length * XP_PER_TASK;
    return { earned, total, pct: total > 0 ? earned / total : 0 };
  };

  const maxXP = PROGRAM_WEEKS.reduce((sum, w) => sum + w.tasks.length * XP_PER_TASK, 0);
  const weeksComplete = PROGRAM_WEEKS.filter((_, i) => getWeekXP(i + 1).pct >= 1).length;

  const handleTaskToggle = (weekNum: number, taskId: string) => {
    const wasComplete = isWeekTaskComplete(weekNum, taskId);
    toggleWeekTask(weekNum, taskId);
    if (!wasComplete) {
      setRecentlyChecked(`${weekNum}-${taskId}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAdvanceWeek = () => {
    if (profile.currentWeek < 8) {
      updateProfile({ currentWeek: profile.currentWeek + 1 });
      setExpandedWeek(profile.currentWeek + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const currentWeekXP = getWeekXP(profile.currentWeek);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, {
        paddingTop: topPadding + 16,
        paddingBottom: Platform.OS === 'web' ? 120 : 100,
      }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>8-Week Protocol</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your recovery journey</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/calendar')}
          style={[styles.calBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.heroCard, {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary + '40',
        borderRadius: colors.radius,
      }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.heroWeekNum, { color: colors.primary }]}>WEEK {profile.currentWeek} OF 8</Text>
            <Text style={[styles.heroTheme, { color: colors.foreground }]}>
              {WEEK_ICONS[profile.currentWeek - 1]} {PROGRAM_WEEKS[profile.currentWeek - 1]?.theme}
            </Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.levelBadgeText}>LVL {currentLevel}</Text>
          </View>
        </View>

        <Text style={[styles.heroGoal, { color: colors.mutedForeground }]}>
          {PROGRAM_WEEKS[profile.currentWeek - 1]?.goal}
        </Text>

        <View style={styles.xpRow}>
          <XPBar earned={currentWeekXP.earned} total={currentWeekXP.total} color={colors.primary} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{totalXP}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total XP</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>🔥 {currentStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Day Streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {Math.round((totalXP / Math.max(maxXP, 1)) * 100)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Complete</Text>
          </View>
        </View>

        {currentWeekXP.pct >= 1 && profile.currentWeek < 8 && (
          <TouchableOpacity
            onPress={handleAdvanceWeek}
            style={[styles.advanceBtn, { backgroundColor: colors.scoreGreen }]}
            activeOpacity={0.85}
          >
            <Ionicons name="trophy-outline" size={18} color="#fff" />
            <Text style={styles.advanceBtnText}>Week Complete! Unlock Week {profile.currentWeek + 1} →</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.howCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.howHeader}>
          <Ionicons name="game-controller-outline" size={18} color={colors.accent} />
          <Text style={[styles.howTitle, { color: colors.foreground }]}>How the program works</Text>
        </View>
        <View style={styles.howGrid}>
          {[
            { icon: '🎯', title: 'Complete tasks', desc: 'Each task earns you 50 XP. Check them off as you do them.' },
            { icon: '🔓', title: 'Unlock weeks', desc: 'Finish all tasks in a week to unlock the next chapter.' },
            { icon: '🧪', title: 'Science-backed', desc: 'Every week is grounded in behavioral psychology research.' },
            { icon: '📅', title: 'Take your time', desc: 'The app doesn\'t rush you. Move at a pace that sticks.' },
          ].map((item, i) => (
            <View key={i} style={[styles.howItem, { backgroundColor: colors.background, borderRadius: 10 }]}>
              <Text style={styles.howEmoji}>{item.icon}</Text>
              <Text style={[styles.howItemTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.howItemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.roadmapLabel, { color: colors.mutedForeground }]}>YOUR RECOVERY ROADMAP</Text>

      {PROGRAM_WEEKS.map((week) => {
        const status = getWeekStatus(week.weekNumber);
        const isExpanded = expandedWeek === week.weekNumber;
        const { earned, total, pct } = getWeekXP(week.weekNumber);
        const isLocked = status === 'locked';
        const isActive = status === 'active';
        const isComplete = status === 'complete';
        const icon = WEEK_ICONS[week.weekNumber - 1];

        const borderColor = isActive ? colors.primary :
          isComplete ? colors.scoreGreen :
          colors.border;
        const headerBg = isActive ? colors.primary + '10' :
          isComplete ? colors.scoreGreen + '08' :
          colors.card;

        return (
          <View
            key={week.weekNumber}
            style={[styles.weekCard, {
              backgroundColor: colors.card,
              borderColor,
              borderRadius: colors.radius,
              opacity: isLocked ? 0.45 : 1,
            }]}
          >
            <TouchableOpacity
              onPress={() => {
                if (!isLocked) {
                  setExpandedWeek(prev => prev === week.weekNumber ? 0 : week.weekNumber);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={[styles.weekHeader, { backgroundColor: headerBg }]}
              activeOpacity={0.7}
            >
              <View style={[styles.weekIconCircle, {
                backgroundColor: isComplete ? colors.scoreGreen + '25' :
                  isActive ? colors.primary + '25' :
                  colors.border,
              }]}>
                {isLocked ? (
                  <Ionicons name="lock-closed" size={14} color={colors.mutedForeground} />
                ) : isComplete ? (
                  <Ionicons name="checkmark" size={14} color={colors.scoreGreen} />
                ) : (
                  <Text style={styles.weekIconEmoji}>{icon}</Text>
                )}
              </View>

              <View style={styles.weekMeta}>
                <View style={styles.weekTitleRow}>
                  <Text style={[styles.weekNumLabel, {
                    color: isActive ? colors.primary : isComplete ? colors.scoreGreen : colors.mutedForeground
                  }]}>
                    {isLocked ? `LOCKED` : isActive ? `WEEK ${week.weekNumber} — ACTIVE` : `WEEK ${week.weekNumber}`}
                  </Text>
                </View>
                <Text style={[styles.weekTheme, { color: colors.foreground }]}>{week.theme}</Text>
                {!isLocked && (
                  <Text style={[styles.weekXPLabel, { color: colors.mutedForeground }]}>
                    {earned} / {total} XP earned
                  </Text>
                )}
              </View>

              {!isLocked && (
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.mutedForeground}
                />
              )}
            </TouchableOpacity>

            {!isLocked && (
              <View style={[styles.xpBarRow, { backgroundColor: colors.border }]}>
                <View style={[styles.xpBarFill, {
                  width: `${pct * 100}%` as any,
                  backgroundColor: isComplete ? colors.scoreGreen : colors.primary,
                }]} />
              </View>
            )}

            {isExpanded && !isLocked && (
              <View style={styles.weekBody}>
                <View style={[styles.goalCard, { backgroundColor: colors.background, borderRadius: 10 }]}>
                  <Text style={[styles.goalCardLabel, { color: colors.mutedForeground }]}>🎯 MISSION GOAL</Text>
                  <Text style={[styles.goalCardText, { color: colors.foreground }]}>{week.goal}</Text>
                </View>

                <View style={[styles.scienceCard, { backgroundColor: colors.accent + '10', borderRadius: 10, borderLeftColor: colors.accent }]}>
                  <View style={styles.scienceHeader}>
                    <Ionicons name="flask-outline" size={14} color={colors.accent} />
                    <Text style={[styles.scienceLabel, { color: colors.accent }]}>WHY THIS WORKS</Text>
                  </View>
                  <Text style={[styles.scienceText, { color: colors.mutedForeground }]}>
                    {week.psychologyRationale}
                  </Text>
                </View>

                <Text style={[styles.tasksHeading, { color: colors.mutedForeground }]}>
                  TASKS — tap to mark complete
                </Text>

                {week.tasks.map((task, taskIdx) => {
                  const done = isWeekTaskComplete(week.weekNumber, task.id);
                  const key = `${week.weekNumber}-${task.id}`;
                  const typeConf = TYPE_CONFIG[task.type];

                  return (
                    <TouchableOpacity
                      key={task.id}
                      onPress={() => handleTaskToggle(week.weekNumber, task.id)}
                      style={[styles.taskRow, {
                        backgroundColor: done ? colors.scoreGreen + '0E' : colors.background,
                        borderColor: done ? colors.scoreGreen + '50' : colors.border,
                        borderRadius: 12,
                      }]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.taskLeft}>
                        <View style={[styles.taskCheckCircle, {
                          backgroundColor: done ? colors.scoreGreen : 'transparent',
                          borderColor: done ? colors.scoreGreen : colors.border,
                        }]}>
                          {done && recentlyChecked === key ? (
                            <CheckAnimation onComplete={() => setRecentlyChecked(null)} />
                          ) : done ? (
                            <Ionicons name="checkmark" size={13} color="#fff" />
                          ) : (
                            <Text style={[styles.taskNum, { color: colors.mutedForeground }]}>{taskIdx + 1}</Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.taskBody}>
                        <Text style={[styles.taskTitle, {
                          color: done ? colors.mutedForeground : colors.foreground,
                          textDecorationLine: done ? 'line-through' : 'none',
                        }]}>
                          {task.title}
                        </Text>
                        <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>
                          {task.description}
                        </Text>
                        {task.isPersistent && (
                          <View style={[styles.persistBadge, { backgroundColor: colors.primary + '18' }]}>
                            <Ionicons name="repeat" size={10} color={colors.primary} />
                            <Text style={[styles.persistText, { color: colors.primary }]}>Ongoing — keep doing this</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.taskRight}>
                        <View style={[styles.typeBadge, { backgroundColor: typeConf.color + '20' }]}>
                          <Ionicons name={typeConf.icon} size={10} color={typeConf.color} />
                          <Text style={[styles.typeBadgeText, { color: typeConf.color }]}>{typeConf.label}</Text>
                        </View>
                        <Text style={[styles.xpChip, { color: done ? colors.scoreGreen : colors.mutedForeground }]}>
                          +{XP_PER_TASK} XP
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {isComplete && (
                  <View style={[styles.weekCompleteRow, { backgroundColor: colors.scoreGreen + '15', borderRadius: 10 }]}>
                    <Ionicons name="trophy" size={20} color={colors.scoreGreen} />
                    <Text style={[styles.weekCompleteText, { color: colors.scoreGreen }]}>
                      Week {week.weekNumber} mastered! +{total} XP earned
                    </Text>
                  </View>
                )}
              </View>
            )}

            {isLocked && (
              <View style={styles.lockedMsg}>
                <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
                  Complete Week {week.weekNumber - 1} to unlock this chapter
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 2 },
  calBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  heroCard: { borderWidth: 1.5, padding: 18, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroWeekNum: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 4 },
  heroTheme: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  levelBadgeText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
  heroGoal: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  xpRow: {},
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  statDivider: { width: 1, height: 32 },
  advanceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 12,
  },
  advanceBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },
  howCard: { borderWidth: 1, padding: 16, gap: 12 },
  howHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  howTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  howGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  howItem: { width: '47%', padding: 12, gap: 4 },
  howEmoji: { fontSize: 20, marginBottom: 2 },
  howItemTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  howItemDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 15 },
  roadmapLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginTop: 4 },
  weekCard: { borderWidth: 1, overflow: 'hidden' },
  weekHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  weekIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  weekIconEmoji: { fontSize: 18 },
  weekMeta: { flex: 1, gap: 2 },
  weekTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekNumLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  weekTheme: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  weekXPLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  xpBarRow: { height: 3, overflow: 'hidden' },
  xpBarFill: { height: 3 },
  weekBody: { padding: 14, gap: 12 },
  goalCard: { padding: 12, gap: 4 },
  goalCardLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  goalCardText: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  scienceCard: { padding: 12, borderLeftWidth: 3, gap: 6 },
  scienceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scienceLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  scienceText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  tasksHeading: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  taskRow: { flexDirection: 'row', borderWidth: 1, padding: 12, gap: 10 },
  taskLeft: { paddingTop: 1 },
  taskCheckCircle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  taskNum: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  taskBody: { flex: 1, gap: 4 },
  taskTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', lineHeight: 20 },
  taskDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  persistBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 2 },
  persistText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  taskRight: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  xpChip: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  weekCompleteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
  },
  weekCompleteText: { fontSize: 13, fontFamily: 'Inter_700Bold', flex: 1 },
  lockedMsg: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 2 },
  lockedText: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
});
