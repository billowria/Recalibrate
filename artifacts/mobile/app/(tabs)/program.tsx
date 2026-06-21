import React, { useState } from 'react';
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
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { PROGRAM_WEEKS } from '@/constants/program';
import * as Haptics from 'expo-haptics';

export default function ProgramScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, toggleWeekTask, isWeekTaskComplete } = useApp();
  const [expandedWeek, setExpandedWeek] = useState<number>(profile.currentWeek);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const toggleExpand = (weekNum: number) => {
    setExpandedWeek(prev => prev === weekNum ? 0 : weekNum);
  };

  const getWeekStatus = (weekNum: number) => {
    if (weekNum < profile.currentWeek) return 'complete';
    if (weekNum === profile.currentWeek) return 'active';
    return 'locked';
  };

  const getWeekCompletion = (weekNum: number) => {
    const week = PROGRAM_WEEKS[weekNum - 1];
    if (!week) return 0;
    const completed = week.tasks.filter(t => isWeekTaskComplete(weekNum, t.id)).length;
    return completed / week.tasks.length;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>8-Week Protocol</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Evidence-based behavior change system
      </Text>

      <View style={[styles.currentBadge, { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '33', borderRadius: colors.radius }]}>
        <Ionicons name="pulse" size={16} color={colors.primary} />
        <Text style={[styles.currentBadgeText, { color: colors.primary }]}>
          You are on Week {profile.currentWeek}
        </Text>
      </View>

      {PROGRAM_WEEKS.map((week) => {
        const status = getWeekStatus(week.weekNumber);
        const isExpanded = expandedWeek === week.weekNumber;
        const completion = getWeekCompletion(week.weekNumber);
        const isLocked = status === 'locked';

        return (
          <View key={week.weekNumber} style={[
            styles.weekCard,
            {
              backgroundColor: colors.card,
              borderColor: status === 'active' ? colors.primary + '60' : colors.border,
              borderRadius: colors.radius,
              opacity: isLocked ? 0.5 : 1,
            }
          ]}>
            <TouchableOpacity
              onPress={() => { if (!isLocked) toggleExpand(week.weekNumber); }}
              style={styles.weekHeader}
              activeOpacity={0.7}
            >
              <View style={[styles.weekNumBadge, {
                backgroundColor: status === 'complete' ? colors.scoreGreen + '20' :
                  status === 'active' ? colors.primary + '20' : colors.border,
              }]}>
                {status === 'complete' ? (
                  <Ionicons name="checkmark" size={14} color={colors.scoreGreen} />
                ) : (
                  <Text style={[styles.weekNumText, {
                    color: status === 'active' ? colors.primary : colors.mutedForeground
                  }]}>{week.weekNumber}</Text>
                )}
              </View>
              <View style={styles.weekMeta}>
                <Text style={[styles.weekTheme, { color: colors.foreground }]}>{week.theme}</Text>
                <Text style={[styles.weekGoalText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {week.goal}
                </Text>
              </View>
              {!isLocked && (
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.mutedForeground}
                />
              )}
            </TouchableOpacity>

            {status !== 'locked' && (
              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View style={[styles.progressBarFill, {
                  width: `${completion * 100}%` as any,
                  backgroundColor: status === 'complete' ? colors.scoreGreen : colors.primary,
                }]} />
              </View>
            )}

            {isExpanded && !isLocked && (
              <View style={styles.weekBody}>
                <View style={[styles.psychCard, { backgroundColor: colors.secondary, borderRadius: colors.radius - 4 }]}>
                  <Ionicons name="brain-outline" size={14} color={colors.accent} />
                  <Text style={[styles.psychText, { color: colors.mutedForeground }]}>
                    {week.psychologyRationale}
                  </Text>
                </View>

                <Text style={[styles.tasksLabel, { color: colors.mutedForeground }]}>TASKS</Text>

                {week.tasks.map(task => {
                  const done = isWeekTaskComplete(week.weekNumber, task.id);
                  return (
                    <TouchableOpacity
                      key={task.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleWeekTask(week.weekNumber, task.id);
                      }}
                      style={[styles.taskRow, {
                        backgroundColor: done ? colors.scoreGreen + '12' : colors.background,
                        borderColor: done ? colors.scoreGreen + '40' : colors.border,
                        borderRadius: colors.radius - 4,
                      }]}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.taskCheck, {
                        backgroundColor: done ? colors.scoreGreen : 'transparent',
                        borderColor: done ? colors.scoreGreen : colors.border,
                      }]}>
                        {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                      <View style={styles.taskContent}>
                        <Text style={[styles.taskTitle, {
                          color: done ? colors.mutedForeground : colors.foreground,
                          textDecorationLine: done ? 'line-through' : 'none',
                        }]}>{task.title}</Text>
                        <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>
                          {task.description}
                        </Text>
                      </View>
                      {task.type === 'reduction' && (
                        <View style={[styles.typeBadge, { backgroundColor: colors.scoreRed + '20' }]}>
                          <Text style={[styles.typeBadgeText, { color: colors.scoreRed }]}>reduce</Text>
                        </View>
                      )}
                      {task.type === 'reflection' && (
                        <View style={[styles.typeBadge, { backgroundColor: colors.accent + '20' }]}>
                          <Text style={[styles.typeBadgeText, { color: colors.accent }]}>reflect</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
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
  content: { paddingHorizontal: 20, gap: 8 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  currentBadgeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  weekCard: { borderWidth: 1, overflow: 'hidden' },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  weekNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNumText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  weekMeta: { flex: 1 },
  weekTheme: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  weekGoalText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  progressBarBg: { height: 3, marginHorizontal: 14, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: 3, borderRadius: 2 },
  weekBody: { padding: 14, paddingTop: 12, gap: 8 },
  psychCard: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    marginBottom: 4,
  },
  psychText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18 },
  tasksLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 2 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  taskDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 16 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});
