/**
 * TRACKER — Protocol Board
 * 
 * Swiss Design Language. Every element earns its place.
 * Compact hold to commit. Weekly accountability grid. Program-grouped.
 */

import * as Haptics from 'expo-haptics';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
  Keyboard,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { TrackedMetric, DailyLog, HabitContext } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  interpolate,
  Easing as RAEasing,
} from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';

const { width: SW } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        '#080808',
  surface:   '#0F0F0F',
  card:      '#141414',
  cardRaise: '#1A1A1A',
  border:    '#1E1E1E',
  borderMid: '#252525',
  text:      '#F0F0F0',
  textMid:   '#888888',
  textDim:   '#444444',
  violet:    '#7B5EFF',
  violetDim: '#7B5EFF22',
  green:     '#22D37A',
  red:       '#FF5E5E',
  amber:     '#FFB340',
};

function getThemeT(colors: any) {
  return {
    bg:        colors.background,
    surface:   colors.surface,
    card:      colors.surfaceMid,
    cardRaise: colors.surfaceHigh,
    border:    colors.border,
    borderMid: colors.borderSubtle,
    text:      colors.text,
    textMid:   colors.textSecondary,
    textDim:   colors.textMuted,
    violet:    colors.brand.primary,
    violetDim: colors.brand.primaryGlowSoft,
    green:     colors.brand.success,
    red:       colors.brand.danger,
    amber:     colors.brand.warning,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getThisWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return getLocalDateString(d);
  });
}

function getLast14Days(): string[] {
  const arr = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(getLocalDateString(d));
  }
  return arr;
}

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function isGood(metric: TrackedMetric, value: number | undefined): boolean {
  if (value === undefined) return false;
  if (metric.category === 'reduce') return value === 0;
  return value > 0;
}

function getFriendlyInputTypeName(type: string): string {
  if (type === 'boolean') return 'Check-off (Yes/No)';
  if (type === 'counter') return 'Tally Count';
  if (type === 'scale') return '1-10 Rating';
  return type;
}

// ─── Animated Weekly Bar Chart (from Dashboard) ────────────────────────────────
interface DayData {
  date: string;
  score: number | null;
  isToday: boolean;
  isFuture: boolean;
}

function WeeklyBarChart({ days, isVisible, triggerKey }: { days: DayData[]; isVisible: boolean; triggerKey: number }) {
  const colors = useColors();
  const T = getThemeT(colors);
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      animationProgress.value = 0;
      animationProgress.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 90 }));
    } else {
      animationProgress.value = 0;
    }
  }, [days, isVisible, triggerKey]);

  return (
    <View style={wbcStyles.container}>
      {days.map((day) => {
        const d = new Date(day.date + 'T12:00:00');
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
        const dateNum = d.getDate();

        const score = day.score ?? 0;
        const targetHeight = Math.max(8, (score / 100) * 80); 

        let barColor: string = T.border;
        let isUnlogged = day.score === null;

        if (day.score !== null) {
          if (day.score >= 70) barColor = T.green;
          else if (day.score >= 40) barColor = T.amber;
          else barColor = T.red;
        }

        const animatedStyle = useAnimatedStyle(() => {
          return {
            height: animationProgress.value * targetHeight,
          };
        });

        const animatedScoreStyle = useAnimatedStyle(() => {
          return {
            opacity: withTiming(animationProgress.value, { duration: 300 }),
            transform: [{ translateY: (1 - animationProgress.value) * 6 }],
          };
        });

        return (
          <View key={day.date} style={[wbcStyles.dayCol, { opacity: day.isFuture ? 0.35 : 1 }]}>
            <View style={wbcStyles.barContainer}>
              {isUnlogged ? (
                <>
                  <View style={wbcStyles.scoreWrap}>
                    <Text style={wbcStyles.unloggedText}>--</Text>
                  </View>
                  <View style={[wbcStyles.unloggedDot, { borderColor: day.isToday ? T.violet : T.border }]} />
                </>
              ) : (
                <>
                  <AnimatedReanimated.View style={[animatedScoreStyle, wbcStyles.scoreWrap]}>
                    <Text style={[wbcStyles.scoreText, { color: barColor }]}>{day.score}</Text>
                  </AnimatedReanimated.View>
                  <AnimatedReanimated.View style={[animatedStyle, { width: 10, borderRadius: 5, backgroundColor: barColor }]} />
                </>
              )}
            </View>
            <Text style={[wbcStyles.dayLabel, { color: day.isToday ? T.violet : T.textMid }]}>{dayLabel}</Text>
            <Text style={[wbcStyles.dateNum, { color: day.isToday ? T.violet : T.textDim }]}>{dateNum}</Text>
          </View>
        );
      })}
    </View>
  );
}

const wbcStyles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130, paddingVertical: 10 },
  dayCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barContainer: { height: 90, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  scoreWrap: { marginBottom: 4, height: 16, justifyContent: 'center' },
  unloggedText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: T.textDim },
  unloggedDot: { width: 10, height: 8, borderRadius: 4, borderWidth: 1.5, borderStyle: 'dashed', backgroundColor: 'transparent' },
  scoreText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  dayLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', marginTop: 6 },
  dateNum: { fontSize: 9, fontFamily: 'Inter_500Medium', marginTop: 1 },
});

// ─── Compact Hold to Commit Button (Size 38) ──────────────────────────────────
function HoldToLogCompact({
  color, onComplete, completed, disabled = false, size = 38, duration = 800,
}: {
  color: string; onComplete: () => void; completed: boolean;
  disabled?: boolean; size?: number; duration?: number;
}) {
  const colors = useColors();
  const T = getThemeT(colors);
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  const triggerTick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const triggerDone = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  useAnimatedReaction(
    () => progress.value,
    (cur, prev) => {
      if (!prev) return;
      const steps = 10;
      if (Math.floor(cur * steps) > Math.floor(prev * steps) && cur < 1) runOnJS(triggerTick)();
    }
  );

  const handlePressIn = () => {
    if (disabled || completed) return;
    scale.value = withSpring(0.92, { damping: 15 });
    progress.value = withTiming(1, { duration, easing: RAEasing.bezier(0.25, 1, 0.5, 1) }, (fin) => {
      if (fin) { runOnJS(triggerDone)(); runOnJS(onComplete)(); }
    });
  };
  const handlePressOut = () => {
    if (disabled || completed) return;
    scale.value = withSpring(1, { damping: 15 });
    if (progress.value < 1) progress.value = withTiming(0, { duration: 300 });
  };

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: completed ? color : progress.value > 0 ? color : T.borderMid,
    transform: [{ scale: scale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    height: `${progress.value * 100}%` as any,
    width: `${progress.value * 100}%` as any,
    borderRadius: (size * progress.value) / 2,
  }));

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled} style={{ width: size, height: size }}>
      <AnimatedReanimated.View style={[
        htlCompactStyles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: completed ? color : T.cardRaise,
          borderColor: completed ? color : T.border,
        },
        ringStyle
      ]}>
        {!completed && (
          <AnimatedReanimated.View style={[htlCompactStyles.circleFill, { backgroundColor: color + '35' }, progressStyle]} />
        )}
        {completed ? (
          <Ionicons name="checkmark-sharp" size={16} color="#000" />
        ) : (
          <Ionicons name="finger-print-outline" size={16} color={progress.value > 0 ? color : T.textDim} />
        )}
      </AnimatedReanimated.View>
    </Pressable>
  );
}

const htlCompactStyles = StyleSheet.create({
  circle: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  circleFill: { position: 'absolute', alignSelf: 'center' },
});

// ─── Compact Hold to Delete Button ────────────────────────────────────────────
function HoldToDeleteAction({
  onDelete, size = 50, duration = 800
}: {
  onDelete: () => void; size?: number; duration?: number;
}) {
  const colors = useColors();
  const T = getThemeT(colors);
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  const triggerTick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  useAnimatedReaction(
    () => progress.value,
    (cur, prev) => {
      if (!prev) return;
      const steps = 10;
      if (Math.floor(cur * steps) > Math.floor(prev * steps) && cur < 1) runOnJS(triggerTick)();
    }
  );

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15 });
    progress.value = withTiming(1, { duration, easing: RAEasing.bezier(0.25, 1, 0.5, 1) }, (fin) => {
      if (fin) runOnJS(onDelete)();
    });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    if (progress.value < 1) progress.value = withTiming(0, { duration: 300 });
  };

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: progress.value > 0 ? T.red : T.borderMid,
    transform: [{ scale: scale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    height: `${progress.value * 100}%` as any,
    width: `${progress.value * 100}%` as any,
    borderRadius: (size * progress.value) / 2,
  }));

  return (
    <View style={hrStyles.deleteActionWrap}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={{ width: size, height: size }}>
        <AnimatedReanimated.View style={[
          htlCompactStyles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: T.cardRaise,
            borderColor: T.border,
          },
          ringStyle
        ]}>
          <AnimatedReanimated.View style={[htlCompactStyles.circleFill, { backgroundColor: T.red + '40' }, progressStyle]} />
          <Ionicons name="trash-outline" size={20} color={progress.value > 0.8 ? '#FFF' : T.red} />
        </AnimatedReanimated.View>
      </Pressable>
    </View>
  );
}

// ─── Weekly Dot Row with initials instead of ticks ────────────────────────────
function WeekDots({ metric, weekDates, today, color }: {
  metric: TrackedMetric; weekDates: string[]; today: string; color: string;
}) {
  const colors = useColors();
  const T = getThemeT(colors);
  const { getLogForDate } = useApp();
  return (
    <View style={wdStyles.row}>
      {weekDates.map((date, i) => {
        const log = getLogForDate(metric.id, date);
        const done = isGood(metric, log?.value);
        const isToday = date === today;
        const isFuture = date > today;
        const letter = WEEK_DAYS[i];

        return (
          <View key={date} style={wdStyles.cell}>
            <View style={[
              wdStyles.dot,
              {
                backgroundColor: done ? color : 'transparent',
                borderWidth: 1,
                borderColor: done ? color : isToday ? color : T.borderMid,
                opacity: isFuture ? 0.35 : 1,
              }
            ]}>
              <Text style={[
                wdStyles.dotText,
                {
                  color: done ? '#000' : isToday ? color : T.textMid,
                  fontFamily: done || isToday ? 'Inter_700Bold' : 'Inter_500Medium',
                }
              ]}>
                {letter}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const wdStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, paddingTop: 2 },
  cell: { alignItems: 'center' },
  dot: { width: 15, height: 15, borderRadius: 7.5, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 8, textAlign: 'center' },
});

// ─── HabitRow with Inline Analytics & Compact Adjusters ────────────────────────
function HabitRow({
  metric, today, weekDates, color, isCustomRoutine,
}: {
  metric: TrackedMetric; today: string; weekDates: string[]; color: string; isCustomRoutine?: boolean;
}) {
  const colors = useColors();
  const T = getThemeT(colors);
  const { logMetric, getLogForDate, getMetricStreak, getMetricConsistency, getLogsForMetric, deleteMetric } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');

  const log = getLogForDate(metric.id, today);
  const streak = getMetricStreak(metric.id);
  const consistency = getMetricConsistency(metric.id, 30);
  const history = getLogsForMetric(metric.id, 14);

  const isReduce = metric.category === 'reduce';
  const isBool = metric.inputType === 'boolean';
  const isCounter = metric.inputType === 'counter';
  const done = isGood(metric, log?.value);

  const expandVal = useSharedValue(0);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    expandVal.value = withSpring(next ? 1 : 0, { damping: 18, stiffness: 150 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const bodyStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(expandVal.value, [0, 1], [0, 380]),
    opacity: expandVal.value,
    overflow: 'hidden',
  }));

  const [noteText, setNoteText] = useState(log?.note ?? '');
  const [noteFocus, setNoteFocus] = useState(false);
  
  useEffect(() => {
    setNoteText(log?.note ?? '');
  }, [log?.note]);

  const noteHasChanges = noteText !== (log?.note ?? '');
  const showSaveBtn = noteFocus || noteHasChanges;
  
  const saveVal = useSharedValue(0);
  useEffect(() => {
    saveVal.value = withTiming(showSaveBtn ? 1 : 0, { duration: 250 });
  }, [showSaveBtn]);

  const saveBtnStyle = useAnimatedStyle(() => ({
    opacity: saveVal.value,
    maxHeight: interpolate(saveVal.value, [0, 1], [0, 60]),
    marginTop: interpolate(saveVal.value, [0, 1], [0, 12]),
  }));

  const handleCommit = async () => {
    if (isBool) {
      await logMetric(metric.id, today, isReduce ? 0 : 1, undefined, {});
    } else {
      if (!expanded) toggleExpand();
    }
  };

  const handleUnlog = () => {
    Alert.alert('Unlog?', 'Remove today\'s log for this habit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unlog', style: 'destructive', onPress: () => logMetric(metric.id, today, -1, undefined, {}) },
    ]);
  };

  const last14Days = useMemo(() => getLast14Days(), []);
  const recentNotes = useMemo(() => {
    return history.filter(h => h.note && h.note.trim() !== '').slice(-3).reverse();
  }, [history]);

  const handleDelete = async () => {
    await deleteMetric(metric.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderRightActions = () => {
    if (!isCustomRoutine) return null;
    return (
      <HoldToDeleteAction onDelete={handleDelete} />
    );
  };

  const content = (
    <View style={[
      hrStyles.rowWrapper, 
      { backgroundColor: T.surface, borderColor: T.border },
      expanded && { borderColor: color + '40', backgroundColor: T.cardRaise }
    ]}>
      <View style={hrStyles.row}>
        <TouchableOpacity
          onPress={toggleExpand}
          onLongPress={done ? handleUnlog : undefined}
          style={hrStyles.leftCol}
          activeOpacity={0.7}
        >
          <View style={[hrStyles.emojiBox, { backgroundColor: color + '15' }]}>
            <Text style={hrStyles.emoji}>{metric.emoji ?? '•'}</Text>
          </View>
          <View style={hrStyles.nameSub}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[hrStyles.name, { color: T.text }]} numberOfLines={1}>{metric.name}</Text>
              {streak >= 3 && (
                <View style={[hrStyles.streakPill, { backgroundColor: color + '20' }]}>
                  <Text style={[hrStyles.streakText, { color }]}>{streak}🔥</Text>
                </View>
              )}
            </View>
            <WeekDots metric={metric} weekDates={weekDates} today={today} color={color} />
          </View>
        </TouchableOpacity>

        {/* Compact interactive target */}
        <View style={hrStyles.commitWrap}>
          {isBool ? (
            <HoldToLogCompact
              color={done ? color : T.textDim}
              completed={done}
              onComplete={handleCommit}
            />
          ) : isCounter ? (
            <View style={hrStyles.inlineCounter}>
              <TouchableOpacity
                onPress={async () => {
                  const cur = log?.value ?? 0;
                  if (cur > 0) {
                    await logMetric(metric.id, today, cur - 1, undefined, {});
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={hrStyles.inlineBtn}
              >
                <Ionicons name="remove-sharp" size={12} color={T.textMid} />
              </TouchableOpacity>
              <Text style={[hrStyles.inlineVal, { color: done ? color : T.text }]}>{log?.value ?? 0}</Text>
              <TouchableOpacity
                onPress={async () => {
                  const cur = log?.value ?? 0;
                  await logMetric(metric.id, today, cur + 1, undefined, {});
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={[hrStyles.inlineBtn, { borderColor: color + '40', backgroundColor: color + '10' }]}
              >
                <Ionicons name="add-sharp" size={12} color={color} />
              </TouchableOpacity>
            </View>
          ) : (
            // Scale rating type (1-10)
            <View style={hrStyles.inlineCounter}>
              <TouchableOpacity
                onPress={async () => {
                  const cur = log?.value ?? 6;
                  if (cur > 1) {
                    await logMetric(metric.id, today, cur - 1, undefined, {});
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={hrStyles.inlineBtn}
              >
                <Ionicons name="remove-sharp" size={12} color={T.textMid} />
              </TouchableOpacity>
              <Text style={[hrStyles.inlineVal, { color: done ? color : T.text }]}>{log?.value ?? '—'}</Text>
              <TouchableOpacity
                onPress={async () => {
                  const cur = log?.value ?? 4;
                  if (cur < 10) {
                    await logMetric(metric.id, today, cur + 1, undefined, {});
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                }}
                style={[hrStyles.inlineBtn, { borderColor: color + '40', backgroundColor: color + '10' }]}
              >
                <Ionicons name="add-sharp" size={12} color={color} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Expanded Analytics & Extra Logs Tab */}
      <AnimatedReanimated.View style={bodyStyle}>
        <View style={hrStyles.expandContainer}>
          {/* Tab Selector */}
          <View style={hrStyles.tabBar}>
            <TouchableOpacity
              onPress={() => setActiveTab('log')}
              style={[hrStyles.tabItem, activeTab === 'log' && { borderBottomColor: color }]}
            >
              <Text style={[hrStyles.tabText, activeTab === 'log' && { color: T.text }]}>Log Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('history')}
              style={[hrStyles.tabItem, activeTab === 'history' && { borderBottomColor: color }]}
            >
              <Text style={[hrStyles.tabText, activeTab === 'history' && { color: T.text }]}>History & Stats</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'log' ? (
            <View style={hrStyles.tabContent}>
              <View style={hrStyles.noteInputContainer}>
                <TextInput
                  style={[hrStyles.noteInput, { borderColor: noteFocus ? color : T.border, backgroundColor: noteFocus ? color + '05' : T.surface, color: T.text }]}
                  placeholder="Add reflections or notes..."
                  placeholderTextColor={T.textDim}
                  value={noteText}
                  onChangeText={setNoteText}
                  onFocus={() => setNoteFocus(true)}
                  onBlur={() => setNoteFocus(false)}
                  multiline
                />
              </View>
              <AnimatedReanimated.View style={[saveBtnStyle, { overflow: 'hidden' }]}>
                <TouchableOpacity
                  onPress={async () => {
                    await logMetric(metric.id, today, log?.value ?? (isReduce ? 0 : 1), noteText, {});
                    Keyboard.dismiss();
                    setNoteFocus(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                  style={[hrStyles.saveBtn, { backgroundColor: color }]}
                  activeOpacity={0.8}
                >
                  <Text style={hrStyles.saveBtnText}>Save Log & Note</Text>
                </TouchableOpacity>
              </AnimatedReanimated.View>

              {done && (
                <View style={{ marginTop: 12, alignItems: 'center' }}>
                  <TouchableOpacity onPress={handleUnlog} style={hrStyles.unlogBtn}>
                    <Text style={hrStyles.unlogBtnText}>Reset Today's Log</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={hrStyles.tabContent}>
              {/* Consistency & Streaks */}
              <View style={hrStyles.statsGrid}>
                <View style={hrStyles.statCard}>
                  <Text style={[hrStyles.statVal, { color: T.text }]}>{consistency}%</Text>
                  <Text style={hrStyles.statLbl}>30d Success</Text>
                </View>
                <View style={hrStyles.statCard}>
                  <Text style={[hrStyles.statVal, { color: T.text }]}>{streak}d</Text>
                  <Text style={hrStyles.statLbl}>Current Streak</Text>
                </View>
              </View>

              {/* 14-day history dot grid */}
              <Text style={hrStyles.gridTitle}>LAST 14 DAYS</Text>
              <View style={hrStyles.gridDots}>
                {last14Days.map((date) => {
                  const dayLog = getLogForDate(metric.id, date);
                  const isDayDone = isGood(metric, dayLog?.value);
                  const shortDay = new Date(date + 'T12:00:00').getDate();
                  return (
                    <View key={date} style={hrStyles.gridDotWrap}>
                      <View style={[
                        hrStyles.gridDot,
                        {
                          backgroundColor: isDayDone ? color : T.border,
                          borderColor: isDayDone ? color : T.borderMid,
                        }
                      ]} />
                      <Text style={[hrStyles.gridDotLabel, { color: T.textDim }]}>{shortDay}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Past reflections */}
              {recentNotes.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={hrStyles.gridTitle}>PAST REFLECTIONS</Text>
                  {recentNotes.map((n, idx) => (
                    <View key={idx} style={hrStyles.noteRow}>
                      <Text style={[hrStyles.noteDate, { color: T.textMid }]}>{new Date(n.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:</Text>
                      <Text style={[hrStyles.noteText, { color: T.textDim }]} numberOfLines={1}>"{n.note}"</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </AnimatedReanimated.View>
    </View>
  );

  return isCustomRoutine ? (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      {content}
    </Swipeable>
  ) : content;
}

const hrStyles = StyleSheet.create({
  deleteActionWrap: { justifyContent: 'center', alignItems: 'center', width: 70, marginBottom: 8, marginLeft: 4 },
  rowWrapper: { borderRadius: 16, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  leftCol: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  emojiBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 18 },
  nameSub: { flex: 1, gap: 6 },
  name: { fontSize: 14, fontFamily: 'Inter_700Bold', lineHeight: 18 },
  streakPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  streakText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  commitWrap: { minWidth: 90, alignItems: 'flex-end', justifyContent: 'center' },
  inlineCounter: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, padding: 2 },
  inlineBtn: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  inlineVal: { fontSize: 13, fontFamily: 'Inter_700Bold', minWidth: 20, textAlign: 'center' },
  expandContainer: { borderTopWidth: 1, padding: 14 },
  tabBar: { flexDirection: 'row', gap: 16, marginBottom: 12, borderBottomWidth: 1 },
  tabItem: { paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  tabContent: { gap: 10 },
  noteInputContainer: { marginTop: 4 },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'Inter_500Medium', minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  unlogBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  unlogBtnText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1 },
  statVal: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  statLbl: { fontSize: 9, fontFamily: 'Inter_600SemiBold', marginTop: 1 },
  gridTitle: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  gridDots: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 4 },
  gridDotWrap: { alignItems: 'center', gap: 3 },
  gridDot: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
  gridDotLabel: { fontSize: 8, fontFamily: 'Inter_500Medium' },
  noteRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 },
  noteDate: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  noteText: { fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1 },
});

// ─── Program Block ────────────────────────────────────────────────────────────
function ProgramBlock({
  programId, programTitle, programEmoji, programColor, weekLabel,
  habits, today, weekDates,
}: {
  programId: string; programTitle: string; programEmoji: string; programColor: string;
  weekLabel: string; habits: TrackedMetric[]; today: string; weekDates: string[];
}) {
  const colors = useColors();
  const T = getThemeT(colors);
  const { getLogForDate } = useApp();
  const completedCount = habits.filter(m => isGood(m, getLogForDate(m.id, today)?.value)).length;
  const allDone = completedCount === habits.length && habits.length > 0;

  return (
    <View style={[pbStyles.block, { borderLeftColor: programColor, backgroundColor: T.surface }]}>
      <View style={pbStyles.header}>
        <Text style={pbStyles.programEmoji}>{programEmoji}</Text>
        <View style={pbStyles.headerMid}>
          <Text style={[pbStyles.programTitle, { color: T.text }]}>{programTitle}</Text>
          <Text style={[pbStyles.weekLabel, { color: programColor + 'BB' }]}>{weekLabel}</Text>
        </View>
        <View style={[pbStyles.progressPill, { backgroundColor: allDone ? programColor + '20' : T.cardRaise, borderColor: allDone ? programColor + '40' : T.border }]}>
          <Text style={[pbStyles.progressText, { color: allDone ? programColor : T.textMid }]}>
            {completedCount}/{habits.length}
          </Text>
        </View>
      </View>

      <View style={pbStyles.habitsBody}>
        {habits.map((m) => (
          <HabitRow
            key={m.id}
            metric={m}
            today={today}
            weekDates={weekDates}
            color={programColor}
          />
        ))}
      </View>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  block: { borderLeftWidth: 3, borderRadius: 16, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginBottom: 12, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  programEmoji: { fontSize: 18 },
  headerMid: { flex: 1, gap: 1 },
  programTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: -0.2 },
  weekLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  progressPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  progressText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  habitsBody: { paddingHorizontal: 14, paddingBottom: 6 },
});

// ─── Today Score Band ─────────────────────────────────────────────────────────
function TodayScoreBand({
  completed, total, dayScore, streak,
}: {
  completed: number; total: number; dayScore: number; streak: number;
}) {
  const colors = useColors();
  const T = getThemeT(colors);
  const pct = total > 0 ? completed / total : 0;
  const barColor = pct >= 1 ? T.green : pct >= 0.5 ? T.violet : T.amber;
  const animWidth = useSharedValue(0);

  useEffect(() => {
    animWidth.value = withTiming(pct, { duration: 700, easing: RAEasing.out(RAEasing.exp) });
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animWidth.value * 100}%` as any,
    backgroundColor: barColor,
  }));

  return (
    <View style={[tsbStyles.container, { backgroundColor: T.surface }]}>
      <View style={tsbStyles.statCol}>
        <Text style={[tsbStyles.statNum, { color: barColor }]}>{completed}<Text style={[tsbStyles.statDen, { color: T.textDim }]}>/{total}</Text></Text>
        <Text style={[tsbStyles.statLabel, { color: T.textDim }]}>Habits Done</Text>
      </View>
      <View style={[tsbStyles.divider, { backgroundColor: T.border }]} />
      <View style={tsbStyles.statCol}>
        <Text style={[tsbStyles.statNum, { color: dayScore >= 80 ? T.green : dayScore >= 50 ? T.violet : T.textMid }]}>{dayScore}<Text style={[tsbStyles.statDen, { color: T.textDim }]}>%</Text></Text>
        <Text style={[tsbStyles.statLabel, { color: T.textDim }]}>Day Score</Text>
      </View>
      <View style={[tsbStyles.divider, { backgroundColor: T.border }]} />
      <View style={tsbStyles.statCol}>
        <Text style={[tsbStyles.statNum, { color: streak >= 7 ? T.amber : streak >= 1 ? T.violet : T.textDim }]}>{streak}<Text style={[tsbStyles.statDen, { color: T.textDim }]}>d</Text></Text>
        <Text style={[tsbStyles.statLabel, { color: T.textDim }]}>Streak</Text>
      </View>
      <View style={[tsbStyles.barTrack, { backgroundColor: T.border }]}>
        <AnimatedReanimated.View style={[tsbStyles.barFill, barStyle]} />
      </View>
    </View>
  );
}

const tsbStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, marginHorizontal: 16, overflow: 'hidden' },
  statCol: { flex: 1, alignItems: 'center', paddingVertical: 18, paddingBottom: 22, gap: 3 },
  statNum: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  statDen: { fontSize: 14, fontFamily: 'Inter_400Regular', letterSpacing: 0 },
  statLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.2, textTransform: 'uppercase' },
  divider: { width: 1, height: 36 },
  barTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
  barFill: { height: 3, borderRadius: 3 },
});

// ─── Log Detail Modal ─────────────────────────────────────────────────────────
function LogDetailModal({
  metric, onSave, onClose, existingValue,
}: {
  metric: TrackedMetric | null; onSave: (value: number, ctx: HabitContext) => void;
  onClose: () => void; existingValue?: number;
}) {
  const colors = useColors();
  const T = getThemeT(colors);
  const [counter, setCounter] = useState(existingValue ?? 0);
  const [scaleVal, setScaleVal] = useState(existingValue ?? 5);
  const [note, setNote] = useState('');
  const [trigger, setTrigger] = useState<HabitContext['trigger']>();

  useEffect(() => {
    if (metric) {
      setCounter(existingValue ?? 0);
      setScaleVal(existingValue ?? 5);
      setNote('');
      setTrigger(undefined);
    }
  }, [metric, existingValue]);

  if (!metric) return null;

  const isReduce = metric.category === 'reduce';
  const isCounter = metric.inputType === 'counter';
  const isScale = metric.inputType === 'scale';
  const color = isReduce ? T.red : metric.category === 'build' ? T.green : T.violet;

  const handleSave = () => {
    const ctx: HabitContext = {};
    if (trigger) ctx.trigger = trigger;
    if (note.trim()) ctx.note = note.trim();
    onSave(isCounter ? counter : scaleVal, ctx);
  };

  return (
    <Modal visible={!!metric} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={ldmStyles.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={ldmStyles.closeBtn}>
            <Ionicons name="chevron-down" size={22} color={T.textMid} />
          </TouchableOpacity>
          <Text style={ldmStyles.title}>{metric.name}</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={ldmStyles.body} keyboardShouldPersistTaps="handled">
          <View style={ldmStyles.handle} />
          <View style={ldmStyles.metricHead}>
            <View style={[ldmStyles.emojiCircle, { backgroundColor: color + '18' }]}>
              <Text style={{ fontSize: 32 }}>{metric.emoji ?? '•'}</Text>
            </View>
            <Text style={ldmStyles.metricLabel}>{isReduce ? 'Log slip-up count' : 'Log your progress'}</Text>
            <Text style={[ldmStyles.metricCategory, { color: color + 'AA' }]}>
              {isReduce ? 'REDUCE' : metric.category === 'build' ? 'BUILD' : 'MONITOR'}
            </Text>
          </View>

          {isCounter && (
            <View style={ldmStyles.counterBlock}>
              <TouchableOpacity onPress={() => setCounter(v => Math.max(0, v - 1))} style={[ldmStyles.counterBtn, { borderColor: T.border }]} activeOpacity={0.7}>
                <Ionicons name="remove" size={26} color={T.textMid} />
              </TouchableOpacity>
              <View style={[ldmStyles.counterVal, { borderColor: color + '40', backgroundColor: color + '10' }]}>
                <Text style={[ldmStyles.counterNum, { color }]}>{counter}</Text>
                {metric.unitLabel ? <Text style={[ldmStyles.counterUnit, { color: color + 'BB' }]}>{metric.unitLabel}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => setCounter(v => v + 1)} style={[ldmStyles.counterBtn, { borderColor: color, backgroundColor: color + '15' }]} activeOpacity={0.7}>
                <Ionicons name="add" size={26} color={color} />
              </TouchableOpacity>
            </View>
          )}

          {isScale && (
            <View style={ldmStyles.scaleBlock}>
              <Text style={[ldmStyles.scaleNum, { color }]}>{scaleVal}<Text style={ldmStyles.scaleDen}>/10</Text></Text>
              <View style={ldmStyles.scaleDots}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <TouchableOpacity key={n} onPress={() => { setScaleVal(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: scaleVal === n ? 28 : 18, height: scaleVal === n ? 28 : 18, borderRadius: scaleVal === n ? 14 : 9, backgroundColor: scaleVal >= n ? color : T.border, alignSelf: 'center' }} activeOpacity={0.8} />
                ))}
              </View>
            </View>
          )}

          {isReduce && (
            <View style={ldmStyles.section}>
              <Text style={ldmStyles.sectionLabel}>WHAT TRIGGERED IT?</Text>
              <View style={ldmStyles.chips}>
                {(['stress','boredom','social','habit','craving','other'] as const).map(t => (
                  <TouchableOpacity key={t} onPress={() => setTrigger(t === trigger ? undefined : t)} style={[ldmStyles.chip, { backgroundColor: trigger === t ? T.red + '20' : T.card, borderColor: trigger === t ? T.red : T.border }]} activeOpacity={0.7}>
                    <Text style={[ldmStyles.chipText, { color: trigger === t ? T.red : T.textMid }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={ldmStyles.section}>
            <Text style={ldmStyles.sectionLabel}>NOTE / REFLECTION</Text>
            <TextInput
              value={note} onChangeText={setNote}
              placeholder="Felt tired? Environment change?"
              placeholderTextColor={T.textDim}
              style={[ldmStyles.noteInput]}
              multiline
            />
          </View>

          <HoldToLogCompact
            color={color}
            completed={false}
            onComplete={handleSave}
            size={56}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Tracker Templates ───────────────────────────────────────────────────
const TEMPLATES = [
  { emoji: '🏋️', name: 'Gym Session', category: 'build' as const, inputType: 'boolean' as const, unitLabel: '' },
  { emoji: '💧', name: 'Water Intake', category: 'build' as const, inputType: 'counter' as const, unitLabel: 'glasses' },
  { emoji: '📖', name: 'Reading', category: 'build' as const, inputType: 'counter' as const, unitLabel: 'pages' },
  { emoji: '🧘', name: 'Meditation', category: 'build' as const, inputType: 'boolean' as const, unitLabel: '' },
  { emoji: '🚶', name: 'Steps', category: 'build' as const, inputType: 'counter' as const, unitLabel: 'K steps' },
  { emoji: '🍭', name: 'Sugar & Junk', category: 'reduce' as const, inputType: 'boolean' as const, unitLabel: '' },
  { emoji: '🚬', name: 'Cigarettes', category: 'reduce' as const, inputType: 'counter' as const, unitLabel: 'cigs' },
  { emoji: '🍺', name: 'Alcohol', category: 'reduce' as const, inputType: 'counter' as const, unitLabel: 'drinks' },
  { emoji: '📱', name: 'Screen Time', category: 'reduce' as const, inputType: 'counter' as const, unitLabel: 'min' },
  { emoji: '⚡', name: 'Energy', category: 'neutral' as const, inputType: 'scale' as const, unitLabel: '/10' },
  { emoji: '😴', name: 'Sleep Quality', category: 'neutral' as const, inputType: 'scale' as const, unitLabel: '/10' },
  { emoji: '🧠', name: 'Deep Work', category: 'build' as const, inputType: 'counter' as const, unitLabel: 'min' },
];

// ─── Add Tracker Modal ────────────────────────────────────────────────────────
function AddTrackerModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (m: any) => void; }) {
  const colors = useColors();
  const T = getThemeT(colors);
  const [step, setStep] = useState<'pick' | 'config'>('pick');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [category, setCategory] = useState<'build' | 'reduce' | 'neutral'>('build');
  const [inputType, setInputType] = useState<'boolean' | 'counter' | 'scale'>('boolean');
  const [unit, setUnit] = useState('');
  const reset = () => { setName(''); setEmoji(''); setUnit(''); setCategory('build'); setInputType('boolean'); setStep('pick'); };

  const catColor = category === 'build' ? T.green : category === 'reduce' ? T.red : T.violet;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={atmStyles.header}>
          {step === 'config'
            ? <TouchableOpacity onPress={() => setStep('pick')} style={atmStyles.navBtn} activeOpacity={0.7}><Ionicons name="chevron-back" size={22} color={T.text} /></TouchableOpacity>
            : <View style={atmStyles.navBtn} />}
          <Text style={atmStyles.title}>{step === 'pick' ? 'Add Tracker' : 'Configure'}</Text>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} style={atmStyles.navBtn} activeOpacity={0.7}><Ionicons name="close" size={22} color={T.textMid} /></TouchableOpacity>
        </View>

        {step === 'pick' ? (
          <ScrollView contentContainerStyle={atmStyles.body} keyboardShouldPersistTaps="handled">
            <Text style={atmStyles.sectionLabel}>QUICK START</Text>
            <View style={atmStyles.templateGrid}>
              {TEMPLATES.map((t, i) => {
                const cc = t.category === 'build' ? T.green : t.category === 'reduce' ? T.red : T.violet;
                return (
                  <TouchableOpacity key={i} onPress={() => { setName(t.name); setCategory(t.category); setInputType(t.inputType); setUnit(t.unitLabel); setEmoji(t.emoji); setStep('config'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[atmStyles.templateCard, { borderColor: cc + '30' }]} activeOpacity={0.8}>
                    <View style={[atmStyles.templateEmojiBox, { backgroundColor: cc + '15' }]}><Text style={{ fontSize: 22 }}>{t.emoji}</Text></View>
                    <Text style={atmStyles.templateName}>{t.name}</Text>
                    <View style={[atmStyles.catDot, { backgroundColor: cc }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={atmStyles.sep}><View style={atmStyles.sepLine} /><Text style={atmStyles.sepText}>or from scratch</Text><View style={atmStyles.sepLine} /></View>
            <TouchableOpacity onPress={() => setStep('config')} style={[atmStyles.scratchBtn, { borderColor: T.violet + '40' }]} activeOpacity={0.8}>
              <Ionicons name="construct-outline" size={16} color={T.violet} />
              <Text style={[atmStyles.scratchBtnText, { color: T.violet }]}>Build Custom Tracker</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={atmStyles.body} keyboardShouldPersistTaps="handled">
            <Text style={atmStyles.sectionLabel}>NAME</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Morning Run" placeholderTextColor={T.textDim} autoFocus style={atmStyles.input} selectionColor={T.violet} />
            <Text style={atmStyles.sectionLabel}>EMOJI</Text>
            <TextInput value={emoji} onChangeText={setEmoji} placeholder="🏃" placeholderTextColor={T.textDim} style={atmStyles.input} selectionColor={T.violet} />
            <Text style={atmStyles.sectionLabel}>CATEGORY</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([{ k: 'build', l: 'Build', c: T.green }, { k: 'reduce', l: 'Reduce', c: T.red }, { k: 'neutral', l: 'Monitor', c: T.violet }] as const).map(cat => (
                <TouchableOpacity key={cat.k} onPress={() => { setCategory(cat.k); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[atmStyles.catBtn, { borderColor: category === cat.k ? cat.c : T.border, backgroundColor: category === cat.k ? cat.c + '12' : T.card }]} activeOpacity={0.8}>
                  <View style={[atmStyles.catDotLg, { backgroundColor: cat.c, opacity: category === cat.k ? 1 : 0.3 }]} />
                  <Text style={[atmStyles.catBtnLabel, { color: category === cat.k ? cat.c : T.textMid }]}>{cat.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={atmStyles.sectionLabel}>HOW TO LOG</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([{ k: 'boolean', l: 'Check-off (Yes/No)' }, { k: 'counter', l: 'Tally Count' }, { k: 'scale', l: '1-10 Rating' }] as const).map(type => (
                <TouchableOpacity key={type.k} onPress={() => { setInputType(type.k); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[atmStyles.typeBtn, { borderColor: inputType === type.k ? catColor : T.border, backgroundColor: inputType === type.k ? catColor + '12' : T.card }]} activeOpacity={0.8}>
                  <Text style={[atmStyles.typeBtnLabel, { color: inputType === type.k ? catColor : T.textMid }]}>{type.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {inputType !== 'boolean' && (
              <>
                <Text style={atmStyles.sectionLabel}>UNIT LABEL</Text>
                <TextInput value={unit} onChangeText={setUnit} placeholder="glasses, km, min..." placeholderTextColor={T.textDim} style={atmStyles.input} selectionColor={T.violet} />
              </>
            )}
            <View style={{ marginTop: 8 }}>
              <HoldToLogCompact
                color={catColor}
                completed={false}
                onComplete={async () => {
                  if (!name.trim()) { Alert.alert('Name required'); return; }
                  await onAdd({ name: name.trim(), category, inputType, unitLabel: unit.trim(), emoji: emoji || undefined, isSensitive: false, scoreWeight: 5 });
                  reset(); onClose();
                }}
                size={56}
              />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const atmStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontFamily: 'Inter_700Bold', color: T.text },
  body: { padding: 20, paddingBottom: 60, gap: 12 },
  sectionLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: T.textDim, letterSpacing: 2 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateCard: { width: (SW - 56) / 3, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'flex-start', gap: 6 },
  templateEmojiBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  templateName: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: T.text, lineHeight: 15 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  sep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sepLine: { flex: 1, height: 1, backgroundColor: T.border },
  sepText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: T.textDim },
  scratchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingVertical: 16 },
  scratchBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  input: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: T.text },
  catBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 14 },
  catDotLg: { width: 8, height: 8, borderRadius: 4 },
  catBtnLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  typeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 14 },
  typeBtnLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
});

const ldmStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontFamily: 'Inter_700Bold', color: T.text },
  body: { padding: 20, gap: 20, paddingBottom: 60 },
  handle: { width: 36, height: 4, backgroundColor: T.borderMid, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  metricHead: { alignItems: 'center', gap: 8 },
  emojiCircle: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 18, fontFamily: 'Inter_700Bold', color: T.text, textAlign: 'center' },
  metricCategory: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  counterBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  counterBtn: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  counterVal: { minWidth: 120, height: 56, borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 20 },
  counterNum: { fontSize: 34, fontFamily: 'Inter_700Bold' },
  counterUnit: { fontSize: 13, fontFamily: 'Inter_500Medium', alignSelf: 'flex-end', paddingBottom: 5 },
  scaleBlock: { alignItems: 'center', gap: 14 },
  scaleNum: { fontSize: 52, fontFamily: 'Inter_700Bold', letterSpacing: -3 },
  scaleDen: { fontSize: 22, fontFamily: 'Inter_400Regular', color: T.textDim, letterSpacing: 0 },
  scaleDots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  section: { gap: 10 },
  sectionLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: T.textDim, letterSpacing: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  noteInput: { backgroundColor: T.surface, borderRadius: 14, padding: 14, fontSize: 14, fontFamily: 'Inter_400Regular', color: T.text, minHeight: 72, textAlignVertical: 'top', borderWidth: 1, borderColor: T.border },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function TrackScreen() {
  const insets = useSafeAreaInsets();
  const {
    metrics, getLogForDate, getLogsForDate, addCustomMetric, dayScore,
    profile, availablePrograms, currentStreak, logMetric, getProgramProgress,
  } = useApp();
  const colors = useColors();
  const T = getThemeT(colors);

  const today = getLocalDateString();
  const weekDates = getThisWeekDates();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [showAdd, setShowAdd] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'routines' | string>('all');

  const protocolMetrics = metrics.filter(m => (m as any).programId != null);
  const routineMetrics = metrics.filter(m => (m as any).programId == null);

  const completedToday = metrics.filter(m => isGood(m, getLogForDate(m.id, today)?.value)).length;

  // Filter program groups
  const programGroups = useMemo(() => {
    const groups: { programId: string; metrics: TrackedMetric[] }[] = [];
    for (const programId of profile.activeProgramIds) {
      const prog = availablePrograms.find(p => p.id === programId);
      if (!prog) continue;
      const pmx = protocolMetrics.filter(m => (m as any).programId === programId);
      if (pmx.length === 0) continue;
      groups.push({ programId, metrics: pmx });
    }
    return groups;
  }, [profile.activeProgramIds, availablePrograms, protocolMetrics]);

  // Weekly bar chart calculation (matches index.tsx dashboard view exactly)
  const currentWeekDays = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    const day = localDate.getDay();
    const diffToMonday = localDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(y, m - 1, diffToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const ty = temp.getFullYear();
      const tm = String(temp.getMonth() + 1).padStart(2, '0');
      const td = String(temp.getDate()).padStart(2, '0');
      const dateStr = `${ty}-${tm}-${td}`;

      const isFuture = dateStr > today;
      const logs = getLogsForDate ? getLogsForDate(dateStr) : [];
      let score: number | null = null;
      if (logs.length > 0) {
        const completed = logs.filter(l => {
          const metric = metrics.find(m => m.id === l.metricId);
          if (!metric) return false;
          if (metric.category === 'build') return l.value > 0;
          if (metric.category === 'reduce') return l.value === 0;
          return true;
        }).length;
        score = Math.round((completed / Math.max(logs.length, 1)) * 100);
      }
      days.push({ date: dateStr, score, isToday: dateStr === today, isFuture });
    }
    return days;
  }, [metrics, getLogsForDate, today]);

  // Tab switch logic to trigger bar reanimation
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusKey(prev => prev + 1);
    }, [])
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Filter lists based on selectedProgramFilter
  const showAll = selectedFilter === 'all';
  const showRoutines = selectedFilter === 'routines' || showAll;

  const filteredGroups = useMemo(() => {
    if (selectedFilter === 'routines') return [];
    if (selectedFilter === 'all') return programGroups;
    return programGroups.filter(g => g.programId === selectedFilter);
  }, [selectedFilter, programGroups]);

  return (
    <View style={[mainStyle.root, { backgroundColor: colors.background }]}>
      <View style={mainStyle.ambientGlow} pointerEvents="none">
        <LinearGradient colors={[colors.brand.primaryGlow, 'transparent']} style={{ flex: 1 }} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={[mainStyle.scroll, { paddingTop: topPadding + 6, paddingBottom: Platform.OS === 'web' ? 140 : 130 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page header ── */}
        <View style={mainStyle.pageHeader}>
          <View>
            <Text style={mainStyle.pageDateLabel}>{dateStr}</Text>
            <Text style={mainStyle.pageTitle}>Protocol Board</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={mainStyle.headerAddBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color={T.text} />
            <Text style={mainStyle.headerAddBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* ── Zone 1: Today Score Band ── */}
        <TodayScoreBand
          completed={completedToday}
          total={metrics.length}
          dayScore={dayScore}
          streak={currentStreak}
        />

        {/* ── Zone 2: Animated Week Bar Chart (Dashboard Animation style, Clickable to Activity Calendar) ── */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/calendar'); }}
          style={[mainStyle.heatmapCard, { backgroundColor: T.surface, borderColor: T.border }]}
          activeOpacity={0.95}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={mainStyle.heatmapTitle}>THIS WEEK</Text>
            <Ionicons name="chevron-forward" size={14} color={T.textDim} />
          </View>
          <WeeklyBarChart days={currentWeekDays} isVisible={true} triggerKey={focusKey} />
        </TouchableOpacity>

        {/* ── Zone 3: Program Selector (Filter bar) ── */}
        {profile.activeProgramIds.length > 0 && (
          <View style={{ marginVertical: 4 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mainStyle.filterScroll}>
              <TouchableOpacity
                onPress={() => { setSelectedFilter('all'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[
                  mainStyle.filterPill, 
                  { 
                    backgroundColor: selectedFilter === 'all' ? T.violetDim : T.card, 
                    borderColor: selectedFilter === 'all' ? T.violet : T.border 
                  }
                ]}
              >
                <Text style={[mainStyle.filterText, { color: selectedFilter === 'all' ? T.violet : T.textMid }]}>All Protocols</Text>
              </TouchableOpacity>
              {profile.activeProgramIds.map(id => {
                const prog = availablePrograms.find(p => p.id === id);
                if (!prog) return null;
                const active = selectedFilter === id;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => { setSelectedFilter(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[mainStyle.filterPill, { borderColor: active ? prog.color : T.border, backgroundColor: active ? prog.color + '15' : T.card }]}
                  >
                    <Text style={{ fontSize: 13 }}>{prog.emoji}</Text>
                    <Text style={[mainStyle.filterText, { color: active ? prog.color : T.textMid }]}>{prog.title}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => { setSelectedFilter('routines'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[
                  mainStyle.filterPill, 
                  { 
                    borderColor: selectedFilter === 'routines' ? T.green : T.border, 
                    backgroundColor: selectedFilter === 'routines' ? T.green + '15' : T.card 
                  }
                ]}
              >
                <Text style={{ fontSize: 13 }}>🧘</Text>
                <Text style={[mainStyle.filterText, { color: selectedFilter === 'routines' ? T.green : T.textMid }]}>Routines</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* ── Zone 4: Program Protocol Blocks ── */}
        {filteredGroups.length > 0 && (
          <View style={mainStyle.section}>
            <View style={mainStyle.sectionLabel}>
              <View style={[mainStyle.sectionBar, { backgroundColor: T.violet }]} />
              <Text style={mainStyle.sectionTitle}>Program Protocols</Text>
            </View>
            {filteredGroups.map(({ programId, metrics: pmx }) => {
              const prog = availablePrograms.find(p => p.id === programId)!;
              const progress = getProgramProgress?.(programId);
              const currentWeek = progress?.currentWeek ?? 1;
              return (
                <ProgramBlock
                  key={programId}
                  programId={programId}
                  programTitle={prog.title}
                  programEmoji={prog.emoji ?? '📋'}
                  programColor={prog.color ?? T.violet}
                  weekLabel={`Week ${currentWeek} of ${prog.weeks?.length ?? 8}`}
                  habits={pmx}
                  today={today}
                  weekDates={weekDates}
                />
              );
            })}
          </View>
        )}

        {/* ── Zone 5: Personal Routines ── */}
        {showRoutines && routineMetrics.length > 0 && (
          <View style={mainStyle.section}>
            <View style={mainStyle.sectionLabel}>
              <View style={[mainStyle.sectionBar, { backgroundColor: T.green }]} />
              <Text style={mainStyle.sectionTitle}>My Routines</Text>
            </View>
            <View style={[mainStyle.routinesBlock, { backgroundColor: T.surface }]}>
              {routineMetrics.map(m => (
                <HabitRow
                  key={m.id}
                  metric={m}
                  today={today}
                  weekDates={weekDates}
                  color={m.category === 'reduce' ? T.red : m.category === 'build' ? T.green : T.violet}
                  isCustomRoutine={true}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Inline dashed add button at bottom ── */}
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          style={mainStyle.inlineAddBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={16} color={T.violet} />
          <Text style={mainStyle.inlineAddBtnText}>Add custom tracker or template</Text>
        </TouchableOpacity>

        {/* ── Empty state ── */}
        {metrics.length === 0 && (
          <View style={mainStyle.emptyState}>
            <Text style={mainStyle.emptyEmoji}>⬛</Text>
            <Text style={mainStyle.emptyTitle}>Board is empty</Text>
            <Text style={mainStyle.emptySub}>Enrol in a program or add personal habits to start tracking.</Text>
            <TouchableOpacity onPress={() => setShowAdd(true)} style={[mainStyle.emptyBtn, { backgroundColor: T.violet }]} activeOpacity={0.8}>
              <Text style={mainStyle.emptyBtnText}>Add First Habit</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>


      {/* ── Add Tracker Modal ── */}
      <AddTrackerModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={addCustomMetric}
      />
    </View>
  );
}

const mainStyle = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  ambientGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, zIndex: 0 },
  scroll: { gap: 14, paddingHorizontal: 0 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 4 },
  pageDateLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: T.textDim, letterSpacing: 0.3 },
  pageTitle: { fontSize: 32, fontFamily: 'Inter_700Bold', color: T.text, letterSpacing: -1, marginTop: 2 },
  headerAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: T.border },
  headerAddBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: T.text },

  heatmapCard: { marginHorizontal: 16, backgroundColor: T.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: T.border },
  heatmapTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', color: T.textDim, letterSpacing: 1.5 },

  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: T.card },
  filterPillActive: { borderColor: T.violet, backgroundColor: T.violetDim },
  filterText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: T.textMid },
  filterTextActive: { color: T.violet },

  section: { paddingHorizontal: 16, gap: 10 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionBar: { width: 4, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', color: T.textDim, textTransform: 'uppercase', letterSpacing: 1 },

  routinesBlock: { backgroundColor: T.surface, borderRadius: 16, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 4 },
  inlineAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 14, borderStyle: 'dashed', borderWidth: 1, borderColor: T.borderMid, borderRadius: 16, backgroundColor: T.surface },
  inlineAddBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: T.textMid },

  emptyState: { margin: 20, alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: T.text },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: T.textMid, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
