import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
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
import { AVAILABLE_PROGRAMS, Program } from '@/constants/program';

const XP_PER_TASK = 50;

const TYPE_CONFIG = {
  action: { color: '#6366f1', label: 'Action', icon: 'flash-outline' as const },
  reduction: { color: '#ef4444', label: 'Reduce', icon: 'trending-down-outline' as const },
  reflection: { color: '#f59e0b', label: 'Reflect', icon: 'bulb-outline' as const },
};

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

function RequirementRow({ icon, label, value, met, color }: { icon: any; label: string; value: string; met: boolean; color: string }) {
  return (
    <View style={reqStyles.row}>
      <View style={[reqStyles.iconWrap, { backgroundColor: met ? '#22c55e20' : color + '15' }]}>
        <Ionicons name={met ? 'checkmark-circle' : icon} size={14} color={met ? '#22c55e' : color} />
      </View>
      <Text style={[reqStyles.label, { color: met ? '#22c55e' : '#888' }]}>{label}</Text>
      <Text style={[reqStyles.value, { color: met ? '#22c55e' : color }]}>{value}</Text>
    </View>
  );
}

const reqStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  iconWrap: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium' },
  value: { fontSize: 12, fontFamily: 'Inter_700Bold' },
});

function ProgramCard({ program, isActive, onToggle, onSelect, colors, compact }: {
  program: Program;
  isActive: boolean;
  onToggle: () => void;
  onSelect: () => void;
  colors: any;
  compact?: boolean;
}) {
  const { getProgramProgress } = useApp();
  const progress = getProgramProgress(program.id);
  const pct = progress ? (progress.completedWeeks.length / program.totalWeeks) * 100 : 0;

  return (
    <View style={[progCardStyles.card, {
      backgroundColor: colors.card,
      borderColor: isActive ? program.color : colors.border,
      borderWidth: isActive ? 2 : 1,
      borderRadius: colors.radius,
    }]}>
      <TouchableOpacity onPress={onSelect} style={progCardStyles.top} activeOpacity={0.8}>
        <View style={[progCardStyles.emojiWrap, { backgroundColor: program.color + '18' }]}>
          <Text style={progCardStyles.emoji}>{program.emoji}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[progCardStyles.title, { color: colors.foreground }]}>{program.title}</Text>
          <Text style={[progCardStyles.weeks, { color: colors.mutedForeground }]}>{program.totalWeeks} weeks</Text>
        </View>
      </TouchableOpacity>
      <Text style={[progCardStyles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {program.description}
      </Text>
      {isActive && progress && (
        <View style={progCardStyles.progressWrap}>
          <View style={[progCardStyles.progressBg, { backgroundColor: program.color + '20' }]}>
            <View style={[progCardStyles.progressFill, { width: `${pct}%` as any, backgroundColor: program.color }]} />
          </View>
          <Text style={[progCardStyles.progressLabel, { color: program.color }]}>
            Week {progress.currentWeek} / {program.totalWeeks} · {progress.completedWeeks.length} complete
          </Text>
        </View>
      )}
      <View style={progCardStyles.actionRow}>
        <TouchableOpacity
          onPress={onToggle}
          style={[progCardStyles.toggleBtn, {
            backgroundColor: isActive ? '#ef444412' : program.color + '15',
            borderColor: isActive ? '#ef444440' : program.color + '40',
          }]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            size={16}
            color={isActive ? '#ef4444' : program.color}
          />
          <Text style={[progCardStyles.toggleText, { color: isActive ? '#ef4444' : program.color }]}>
            {isActive ? 'Pause' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const progCardStyles = StyleSheet.create({
  card: { padding: 14, gap: 10, marginBottom: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  title: { fontSize: 14, fontFamily: 'Inter_700Bold', lineHeight: 20 },
  weeks: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  desc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  progressWrap: { gap: 4 },
  progressBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  toggleText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
});

export default function ProgramScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile, toggleWeekTask, isWeekTaskComplete, totalXP, currentLevel, currentStreak,
    availablePrograms, enrollProgram, unenrollProgram, advanceProgramWeek, restartProgramWeek,
    getWeekGatingStatus, getProgramProgress, addXP,
  } = useApp();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    profile.activeProgramIds[0] ?? 'eight-week-recovery'
  );
  const [expandedWeek, setExpandedWeek] = useState<number>(1);
  const [recentlyChecked, setRecentlyChecked] = useState<string | null>(null);
  const [showProgramList, setShowProgramList] = useState(false);

  const selectedProgram = availablePrograms.find(p => p.id === selectedProgramId);
  const progress = getProgramProgress(selectedProgramId);
  const isEnrolled = profile.activeProgramIds.includes(selectedProgramId);
  const gating = isEnrolled ? getWeekGatingStatus(selectedProgramId) : null;

  React.useEffect(() => {
    if (progress) setExpandedWeek(progress.currentWeek);
  }, [selectedProgramId]);

  const getWeekStatus = (n: number) => {
    if (!progress) return 'locked';
    if (progress.completedWeeks.includes(n)) return 'complete';
    if (n === progress.currentWeek) return 'active';
    if (n < progress.currentWeek) return 'complete';
    return 'locked';
  };

  const getWeekXP = (weekNum: number) => {
    const week = selectedProgram?.weeks[weekNum - 1];
    if (!week) return { earned: 0, total: 0, pct: 0 };
    const earned = week.tasks.filter(t => isWeekTaskComplete(weekNum, t.id, selectedProgramId)).length * XP_PER_TASK;
    const total = week.tasks.length * XP_PER_TASK;
    return { earned, total, pct: total > 0 ? earned / total : 0 };
  };

  const handleTaskToggle = (weekNum: number, taskId: string) => {
    if (!isEnrolled) return;
    const wasComplete = isWeekTaskComplete(weekNum, taskId, selectedProgramId);
    toggleWeekTask(weekNum, taskId, selectedProgramId);
    if (!wasComplete) {
      setRecentlyChecked(`${weekNum}-${taskId}`);
      addXP(XP_PER_TASK);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAdvanceWeek = async () => {
    if (!gating?.canAdvance) {
      Alert.alert(
        'Week Not Unlocked',
        `To advance, you need:\n• ${gating?.weekPassThreshold ?? 5} days of tracking (you have ${gating?.daysTracked ?? 0})\n• 1 journal entry this week (you have ${gating?.daysJournaled ?? 0})\n• 50%+ tasks completed (${gating?.tasksCompleted ?? 0}/${gating?.totalTasks ?? 0})\n\nKeep going — the system holds you accountable.`,
        [{ text: 'Got it', style: 'default' }]
      );
      return;
    }
    await advanceProgramWeek(selectedProgramId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRestart = () => {
    Alert.alert(
      'Restart Week?',
      'This resets your task checkboxes and gives you a fresh 7-day window. Your tracking data and journals are kept intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart Week', style: 'destructive', onPress: async () => {
          await restartProgramWeek(selectedProgramId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }},
      ]
    );
  };

  const handleToggleActive = async () => {
    if (isEnrolled) {
      await unenrollProgram(selectedProgramId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      await enrollProgram(selectedProgramId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const programColor = selectedProgram?.color ?? colors.primary;

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
          <Text style={[styles.title, { color: colors.foreground }]}>Programs</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {profile.activeProgramIds.length} active · {availablePrograms.length} available
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/calendar')}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={20} color={programColor} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => setShowProgramList(!showProgramList)}
        style={[styles.programPickerBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
        activeOpacity={0.8}
      >
        <View style={styles.programPickerLeft}>
          <Text style={styles.programPickerEmoji}>{selectedProgram?.emoji ?? '📋'}</Text>
          <View>
            <Text style={[styles.programPickerLabel, { color: colors.mutedForeground }]}>ACTIVE PROGRAM</Text>
            <Text style={[styles.programPickerName, { color: colors.foreground }]}>{selectedProgram?.title ?? 'Select a program'}</Text>
          </View>
        </View>
        <Ionicons name={showProgramList ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {showProgramList && (
        <View style={[styles.programList, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.programListTitle, { color: colors.mutedForeground }]}>SELECT PROGRAM</Text>
          {availablePrograms.map(p => (
            <ProgramCard
              key={p.id}
              program={p}
              isActive={profile.activeProgramIds.includes(p.id)}
              onSelect={() => {
                setSelectedProgramId(p.id);
                setShowProgramList(false);
              }}
              onToggle={async () => {
                if (profile.activeProgramIds.includes(p.id)) {
                  await unenrollProgram(p.id);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                } else {
                  await enrollProgram(p.id);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              }}
              colors={colors}
            />
          ))}
        </View>
      )}

      {selectedProgram && progress && isEnrolled && (
        <>
          <View style={[styles.heroCard, {
            backgroundColor: programColor + '12',
            borderColor: programColor + '35',
            borderRadius: colors.radius,
          }]}>
            <View style={styles.heroTop}>
              <View>
                <Text style={[styles.heroWeekNum, { color: programColor }]}>
                  WEEK {progress.currentWeek} OF {selectedProgram.totalWeeks}
                </Text>
                <Text style={[styles.heroTheme, { color: colors.foreground }]}>
                  {selectedProgram.emoji} {selectedProgram.weeks[progress.currentWeek - 1]?.theme}
                </Text>
              </View>
              <View style={[styles.levelBadge, { backgroundColor: programColor }]}>
                <Text style={styles.levelBadgeText}>LVL {currentLevel}</Text>
              </View>
            </View>

            <Text style={[styles.heroGoal, { color: colors.mutedForeground }]}>
              {selectedProgram.weeks[progress.currentWeek - 1]?.goal}
            </Text>

            <View style={[styles.gatingCard, { backgroundColor: colors.card + 'CC', borderRadius: 10 }]}>
              <Text style={[styles.gatingTitle, { color: colors.foreground }]}>Week Requirements</Text>
              {gating && (
                <>
                  <RequirementRow
                    icon="calendar-outline"
                    label="Days tracked"
                    value={`${gating.daysTracked} / ${gating.weekPassThreshold}`}
                    met={gating.daysTracked >= gating.weekPassThreshold}
                    color={programColor}
                  />
                  <RequirementRow
                    icon="book-outline"
                    label="Journal entry"
                    value={gating.daysJournaled >= 1 ? 'Done' : 'Needed'}
                    met={gating.daysJournaled >= 1}
                    color={programColor}
                  />
                  <RequirementRow
                    icon="checkmark-done-outline"
                    label="Tasks completed"
                    value={`${gating.tasksCompleted} / ${gating.totalTasks}`}
                    met={gating.tasksCompleted >= Math.ceil(gating.totalTasks * 0.5)}
                    color={programColor}
                  />
                </>
              )}
              {gating?.shouldRestart && (
                <View style={[styles.restartBanner, { backgroundColor: '#ef444418' }]}>
                  <Ionicons name="refresh-outline" size={14} color="#ef4444" />
                  <Text style={[styles.restartBannerText, { color: '#ef4444' }]}>
                    14 days in without passing. Consider restarting this week.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{totalXP}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total XP</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>🔥 {currentStreak}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Streak</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{progress.completedWeeks.length}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Weeks Done</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleToggleActive}
                style={[styles.pauseBtn, { borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Ionicons name="pause-circle-outline" size={16} color="#ef4444" />
                <Text style={[styles.pauseBtnText, { color: '#ef4444' }]}>Pause program</Text>
              </TouchableOpacity>
              {gating?.canAdvance && progress.currentWeek < selectedProgram.totalWeeks ? (
                <TouchableOpacity
                  onPress={handleAdvanceWeek}
                  style={[styles.advanceBtn, { backgroundColor: '#22c55e' }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trophy-outline" size={18} color="#fff" />
                  <Text style={styles.advanceBtnText}>Week Complete! Unlock Week {progress.currentWeek + 1} →</Text>
                </TouchableOpacity>
              ) : !gating?.canAdvance ? (
                <TouchableOpacity
                  onPress={handleAdvanceWeek}
                  style={[styles.advanceBtn, { backgroundColor: colors.border, opacity: 0.7 }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.advanceBtnText, { color: colors.mutedForeground }]}>Unlock next week by meeting requirements</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={handleRestart}
                style={[styles.restartBtn, { borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.restartBtnText, { color: colors.mutedForeground }]}>Restart week</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.roadmapLabel, { color: colors.mutedForeground }]}>YOUR ROADMAP</Text>

          {selectedProgram.weeks.map((week) => {
            const status = getWeekStatus(week.weekNumber);
            const isExpanded = expandedWeek === week.weekNumber;
            const { earned, total, pct } = getWeekXP(week.weekNumber);
            const isLocked = status === 'locked';
            const isActive = status === 'active';
            const isComplete = status === 'complete';

            const borderColor = isActive ? programColor :
              isComplete ? '#22c55e' :
              colors.border;
            const headerBg = isActive ? programColor + '10' :
              isComplete ? '#22c55e08' :
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
                    backgroundColor: isComplete ? '#22c55e25' :
                      isActive ? programColor + '25' :
                      colors.border,
                  }]}>
                    {isLocked ? (
                      <Ionicons name="lock-closed" size={14} color={colors.mutedForeground} />
                    ) : isComplete ? (
                      <Ionicons name="checkmark" size={14} color="#22c55e" />
                    ) : (
                      <Text style={styles.weekIconEmoji}>{selectedProgram.emoji}</Text>
                    )}
                  </View>

                  <View style={styles.weekMeta}>
                    <Text style={[styles.weekNumLabel, {
                      color: isActive ? programColor : isComplete ? '#22c55e' : colors.mutedForeground
                    }]}>
                      {isLocked ? 'LOCKED' : isActive ? `WEEK ${week.weekNumber} — ACTIVE` : `WEEK ${week.weekNumber}`}
                    </Text>
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
                      backgroundColor: isComplete ? '#22c55e' : programColor,
                    }]} />
                  </View>
                )}

                {isExpanded && !isLocked && (
                  <View style={styles.weekBody}>
                    <View style={[styles.goalCard, { backgroundColor: colors.background, borderRadius: 10 }]}>
                      <Text style={[styles.goalCardLabel, { color: colors.mutedForeground }]}>🎯 MISSION GOAL</Text>
                      <Text style={[styles.goalCardText, { color: colors.foreground }]}>{week.goal}</Text>
                    </View>

                    <View style={[styles.scienceCard, { backgroundColor: programColor + '0E', borderRadius: 10, borderLeftColor: programColor }]}>
                      <View style={styles.scienceHeader}>
                        <Ionicons name="flask-outline" size={14} color={programColor} />
                        <Text style={[styles.scienceLabel, { color: programColor }]}>WHY THIS WORKS</Text>
                      </View>
                      <Text style={[styles.scienceText, { color: colors.mutedForeground }]}>
                        {week.psychologyRationale}
                      </Text>
                    </View>

                    {isActive && gating && (
                      <View style={[styles.weekContextBar, { backgroundColor: colors.background, borderRadius: 10, borderColor: colors.border }]}>
                        <Text style={[styles.weekContextTitle, { color: colors.mutedForeground }]}>THIS WEEK'S PROGRESS</Text>
                        <View style={styles.weekContextStats}>
                          <View style={styles.weekContextStat}>
                            <Text style={[styles.weekContextNum, { color: gating.daysTracked >= gating.weekPassThreshold ? '#22c55e' : programColor }]}>
                              {gating.daysTracked}
                            </Text>
                            <Text style={[styles.weekContextLabel, { color: colors.mutedForeground }]}>days tracked</Text>
                          </View>
                          <View style={styles.weekContextStat}>
                            <Text style={[styles.weekContextNum, { color: gating.daysJournaled >= 1 ? '#22c55e' : programColor }]}>
                              {gating.daysJournaled}
                            </Text>
                            <Text style={[styles.weekContextLabel, { color: colors.mutedForeground }]}>journals written</Text>
                          </View>
                          <View style={styles.weekContextStat}>
                            <Text style={[styles.weekContextNum, { color: colors.foreground }]}>
                              {gating.daysSinceWeekStart}
                            </Text>
                            <Text style={[styles.weekContextLabel, { color: colors.mutedForeground }]}>days in week</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    <Text style={[styles.tasksHeading, { color: colors.mutedForeground }]}>
                      TASKS — tap to mark complete
                    </Text>

                    {week.tasks.map((task, taskIdx) => {
                      const done = isWeekTaskComplete(week.weekNumber, task.id, selectedProgramId);
                      const key = `${week.weekNumber}-${task.id}`;
                      const typeConf = TYPE_CONFIG[task.type];

                      return (
                        <TouchableOpacity
                          key={task.id}
                          onPress={() => handleTaskToggle(week.weekNumber, task.id)}
                          style={[styles.taskRow, {
                            backgroundColor: done ? '#22c55e0E' : colors.background,
                            borderColor: done ? '#22c55e50' : colors.border,
                            borderRadius: 12,
                          }]}
                          activeOpacity={0.7}
                        >
                          <View style={styles.taskLeft}>
                            <View style={[styles.taskCheckCircle, {
                              backgroundColor: done ? '#22c55e' : 'transparent',
                              borderColor: done ? '#22c55e' : colors.border,
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
                              <View style={[styles.persistBadge, { backgroundColor: programColor + '18' }]}>
                                <Ionicons name="repeat" size={10} color={programColor} />
                                <Text style={[styles.persistText, { color: programColor }]}>Ongoing — keep doing this</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.taskRight}>
                            <View style={[styles.typeBadge, { backgroundColor: typeConf.color + '20' }]}>
                              <Ionicons name={typeConf.icon} size={10} color={typeConf.color} />
                              <Text style={[styles.typeBadgeText, { color: typeConf.color }]}>{typeConf.label}</Text>
                            </View>
                            <Text style={[styles.xpChip, { color: done ? '#22c55e' : colors.mutedForeground }]}>
                              +{XP_PER_TASK} XP
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {isComplete && (
                      <View style={[styles.weekCompleteRow, { backgroundColor: '#22c55e15', borderRadius: 10 }]}>
                        <Ionicons name="trophy" size={20} color="#22c55e" />
                        <Text style={[styles.weekCompleteText, { color: '#22c55e' }]}>
                          Week {week.weekNumber} mastered! +{total} XP earned
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {isLocked && (
                  <View style={styles.lockedMsg}>
                    <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
                      Complete Week {week.weekNumber - 1} requirements to unlock
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}

      {selectedProgram && !isEnrolled && (
        <View style={[styles.enrollCard, { backgroundColor: colors.card, borderColor: programColor + '40', borderRadius: colors.radius }]}>
          <Text style={styles.enrollEmoji}>{selectedProgram.emoji}</Text>
          <Text style={[styles.enrollTitle, { color: colors.foreground }]}>{selectedProgram.title}</Text>
          <Text style={[styles.enrollDesc, { color: colors.mutedForeground }]}>{selectedProgram.description}</Text>
          <TouchableOpacity
            onPress={handleToggleActive}
            style={[styles.enrollBtn, { backgroundColor: programColor }]}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.enrollBtnText}>Activate Program</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12 },
  programPickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderWidth: 1,
  },
  programPickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  programPickerEmoji: { fontSize: 22 },
  programPickerLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginBottom: 2 },
  programPickerName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  programList: { borderWidth: 1, padding: 14, gap: 0 },
  programListTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 12 },
  heroCard: { borderWidth: 1.5, padding: 18, gap: 12 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroWeekNum: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 3 },
  heroTheme: { fontSize: 19, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  levelBadgeText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
  heroGoal: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  gatingCard: { padding: 12, gap: 6 },
  gatingTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginBottom: 4 },
  restartBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, marginTop: 4 },
  restartBannerText: { fontSize: 11, fontFamily: 'Inter_500Medium', flex: 1, lineHeight: 15 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  statDivider: { width: 1, height: 30 },
  actionRow: { gap: 8 },
  advanceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 12,
  },
  advanceBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
  restartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  restartBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  roadmapLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginTop: 4 },
  weekCard: { borderWidth: 1, overflow: 'hidden' },
  weekHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  weekIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  weekIconEmoji: { fontSize: 18 },
  weekMeta: { flex: 1, gap: 2 },
  weekNumLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  weekTheme: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  weekXPLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  xpBarRow: { height: 3, overflow: 'hidden' },
  xpBarFill: { height: 3 },
  weekBody: { padding: 14, gap: 12 },
  goalCard: { padding: 12, gap: 4 },
  goalCardLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  goalCardText: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 19 },
  scienceCard: { padding: 12, borderLeftWidth: 3, gap: 6 },
  scienceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scienceLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  scienceText: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  weekContextBar: { padding: 12, borderWidth: 1, gap: 8 },
  weekContextTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  weekContextStats: { flexDirection: 'row', justifyContent: 'space-around' },
  weekContextStat: { alignItems: 'center', gap: 2 },
  weekContextNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  weekContextLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  tasksHeading: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  taskRow: { flexDirection: 'row', borderWidth: 1, padding: 12, gap: 10 },
  taskLeft: { paddingTop: 1 },
  taskCheckCircle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  taskNum: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  taskBody: { flex: 1, gap: 4 },
  taskTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', lineHeight: 19 },
  taskDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  persistBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 2 },
  persistText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  taskRight: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  xpChip: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  weekCompleteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  weekCompleteText: { fontSize: 13, fontFamily: 'Inter_700Bold', flex: 1 },
  lockedMsg: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 2 },
  lockedText: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  enrollCard: { borderWidth: 1.5, padding: 24, alignItems: 'center', gap: 12 },
  enrollEmoji: { fontSize: 48 },
  enrollTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  enrollDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, textAlign: 'center' },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  enrollBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  pauseBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
