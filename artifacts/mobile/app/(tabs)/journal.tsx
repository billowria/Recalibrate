import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, withDelay, runOnJS, withRepeat } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, BRAND } from '@/constants/colors';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { DAILY_JOURNAL_PROMPTS } from '@/constants/program';

// ─── Config ──────────────────────────────────────────────────────────────────

const DAILY_JOURNAL_XP = 25;
const WORD_COUNT_BONUS_XP = 5;

const TAG_DEFS = [
  { id: 'stress', emoji: '😰', label: 'Stress', color: '#ef4444' },
  { id: 'sleep', emoji: '😴', label: 'Sleep', color: '#6366f1' },
  { id: 'craving', emoji: '🤤', label: 'Craving', color: '#f59e0b' },
  { id: 'win', emoji: '🏆', label: 'Win', color: '#22c55e' },
  { id: 'social', emoji: '👥', label: 'Social', color: '#06b6d4' },
  { id: 'work', emoji: '💼', label: 'Work', color: '#8b5cf6' },
  { id: 'fitness', emoji: '💪', label: 'Fitness', color: '#10b981' },
  { id: 'mindfulness', emoji: '🧘', label: 'Mindfulness', color: '#6366f1' },
  { id: 'relapse', emoji: '⚠️', label: 'Relapse', color: '#ef4444' },
];

// ─── Dynamic Prompt Engine ────────────────────────────────────────────────────
// Generates contextual prompts based on today's tracking data + program week

function buildDynamicPrompts(
  primaryPrompt: string,
  missedTasks: string[],
  hitTasks: string[],
): string[] {
  const prompts: string[] = [primaryPrompt];

  if (missedTasks.length > 0) {
    prompts.push(`You missed "${missedTasks[0]}" today. What was the main barrier, and what's one thing you could do differently tomorrow?`);
  }
  if (hitTasks.length >= 3) {
    prompts.push(`You completed ${hitTasks.length} protocol tasks today. What made today work? What can you repeat tomorrow?`);
  }
  if (missedTasks.length === 0 && hitTasks.length > 0) {
    prompts.push('You stayed on track today. What mental state or environment made that possible?');
  }

  return prompts;
}

// ─── Tag Heatmap ──────────────────────────────────────────────────────────────

function TagCloud({ tagCounts, total, colors }: { tagCounts: Record<string, number>; total: number; colors: any }) {
  if (Object.keys(tagCounts).length === 0) return null;
  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  return (
    <View style={tcStyles.wrap}>
      {sorted.map(([tagId, count]) => {
        const def = TAG_DEFS.find(t => t.id === tagId);
        if (!def) return null;
        const opacity = Math.max(0.3, count / Math.max(...Object.values(tagCounts)));
        return (
          <View
            key={tagId}
            style={[tcStyles.chip, { backgroundColor: def.color + Math.round(opacity * 255).toString(16).padStart(2, '0') }]}
          >
            <Text style={tcStyles.chipEmoji}>{def.emoji}</Text>
            <Text style={tcStyles.chipLabel}>{def.label}</Text>
            <Text style={tcStyles.chipCount}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

const tcStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  chipEmoji: { fontSize: 13 },
  chipLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  chipCount: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#ffffffcc' },
});

// ─── Mood Grid ────────────────────────────────────────────────────────────────
// Replaces the old 1-10 slider with a 30-day calendar heatmap of tag density

function MoodHeatmap({ entries, colors }: { entries: any[]; colors: any }) {
  const today = new Date();
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (27 - i));
    const ds = d.toISOString().split('T')[0];
    const entry = entries.find((e: any) => e.date === ds);
    return { ds, entry, dayNum: d.getDate(), isToday: ds === today.toISOString().split('T')[0] };
  });

  const getColor = (entry: any) => {
    if (!entry) return colors.border + '40';
    const isWin = entry.tags?.includes('win');
    const isRelapse = entry.tags?.includes('relapse') || entry.tags?.includes('craving');
    if (isWin) return '#22c55e';
    if (isRelapse) return '#ef4444';
    if ((entry.wordCount ?? 0) >= 50) return colors.primary;
    return colors.primary + '60';
  };

  return (
    <View style={hmStyles.grid}>
      {days.map(({ ds, entry, dayNum, isToday }) => (
        <View
          key={ds}
          style={[hmStyles.cell, {
            backgroundColor: getColor(entry),
            borderWidth: isToday ? 2 : 0,
            borderColor: colors.foreground,
          }]}
        >
          {isToday && <Text style={hmStyles.todayDot}>·</Text>}
        </View>
      ))}
    </View>
  );
}

const hmStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: 28, height: 28, borderRadius: 6 },
  todayDot: { position: 'absolute', bottom: 2, right: 4, fontSize: 10, color: '#fff', fontFamily: 'Inter_700Bold' },
});

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, colors }: { entry: any; colors: any }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.date + 'T12:00:00');
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const tags = entry.tags ?? [];

  return (
    <TouchableOpacity
      onPress={() => { setExpanded(e => !e); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      activeOpacity={0.85}
      style={[ecStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={ecStyles.header}>
        <View style={ecStyles.dateBlock}>
          <Text style={[ecStyles.date, { color: colors.mutedForeground }]}>{dateLabel}</Text>
          {(entry.wordCount ?? 0) > 0 && (
            <Text style={[ecStyles.wc, { color: colors.mutedForeground }]}>{entry.wordCount}w</Text>
          )}
        </View>
        <View style={ecStyles.tagRow}>
          {tags.slice(0, 3).map((tagId: string) => {
            const def = TAG_DEFS.find(t => t.id === tagId);
            if (!def) return null;
            return (
              <View key={tagId} style={[ecStyles.tagBadge, { backgroundColor: def.color + '20' }]}>
                <Text style={{ fontSize: 11 }}>{def.emoji}</Text>
              </View>
            );
          })}
          {tags.length > 3 && (
            <View style={[ecStyles.tagBadge, { backgroundColor: colors.border }]}>
              <Text style={[ecStyles.moreText, { color: colors.mutedForeground }]}>+{tags.length - 3}</Text>
            </View>
          )}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
      </View>

      {!expanded && (
        <Text style={[ecStyles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
          {entry.response}
        </Text>
      )}

      {expanded && (
        <View style={ecStyles.expanded}>
          <View style={[ecStyles.promptBubble, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[ecStyles.promptLabel, { color: colors.mutedForeground }]}>PROMPT</Text>
            <Text style={[ecStyles.promptText, { color: colors.foreground }]}>{entry.prompt}</Text>
          </View>
          <Text style={[ecStyles.fullResponse, { color: colors.foreground }]}>{entry.response}</Text>
          {entry.freeResponse ? (
            <View style={[ecStyles.freeWrap, { borderTopColor: colors.border }]}>
              <Text style={[ecStyles.freeLabel, { color: colors.mutedForeground }]}>FREE REFLECTION</Text>
              <Text style={[ecStyles.fullResponse, { color: colors.foreground }]}>{entry.freeResponse}</Text>
            </View>
          ) : null}
          {tags.length > 0 && (
            <View style={ecStyles.allTags}>
              {tags.map((tagId: string) => {
                const def = TAG_DEFS.find(t => t.id === tagId);
                if (!def) return null;
                return (
                  <View key={tagId} style={[ecStyles.tagBadge, { backgroundColor: def.color + '20' }]}>
                    <Text style={{ fontSize: 12 }}>{def.emoji}</Text>
                    <Text style={[ecStyles.tagBadgeText, { color: def.color }]}>{def.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const ecStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBlock: { flex: 1, gap: 1 },
  date: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  wc: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  tagRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
  tagBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  moreText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  preview: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  expanded: { gap: 12 },
  promptBubble: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  promptLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  promptText: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 19, fontStyle: 'italic' },
  fullResponse: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  freeWrap: { borderTopWidth: 1, paddingTop: 10, gap: 4 },
  freeLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  allTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});

// ─── Premium Save Button ────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#f43f5e', '#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#fff'];
const NUM_CONFETTI = 30;

function ConfettiPiece({ index, trigger }: { index: number; trigger: boolean }) {
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  
  const color = useMemo(() => CONFETTI_COLORS[index % CONFETTI_COLORS.length], []);
  const size = useMemo(() => Math.random() * 8 + 6, []);
  
  useEffect(() => {
    if (trigger) {
      const angle = (Math.random() * Math.PI) + Math.PI; // Upwards semicircle
      const velocity = Math.random() * 250 + 100;
      
      opacity.value = 1;
      scale.value = withSpring(1);
      
      x.value = withTiming(Math.cos(angle) * velocity, { duration: 1200 });
      y.value = withTiming(Math.sin(angle) * velocity + (Math.random() * 50 + 50), { duration: 1200 });
      
      rotation.value = withTiming(Math.random() * 720 - 360, { duration: 1200 });
      opacity.value = withDelay(600, withTiming(0, { duration: 600 }));
    }
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View style={[
      {
        position: 'absolute',
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: size / 2,
        zIndex: 50,
      },
      style
    ]} />
  );
}

function PremiumSaveButton({
  onPress,
  disabled,
  saved,
  xp,
  colors,
}: {
  onPress: () => void;
  disabled: boolean;
  saved: boolean;
  xp: number;
  colors: any;
}) {
  const scale = useSharedValue(1);
  const breath = useSharedValue(1);
  const width = useSharedValue(220); // initial width
  const xpY = useSharedValue(0);
  const xpOpacity = useSharedValue(0);

  const confettiArray = useMemo(() => Array.from({ length: NUM_CONFETTI }), []);

  useEffect(() => {
    if (!disabled && !saved) {
      breath.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1200 }),
          withTiming(1, { duration: 1200 })
        ),
        -1,
        true
      );
    } else {
      breath.value = withTiming(1);
    }

    if (saved) {
      // Morph to circle and trigger effects
      width.value = withSpring(56, { damping: 12 }); // 56x56 circle
      
      // XP float up
      xpY.value = withSpring(-40, { damping: 12, stiffness: 100 });
      xpOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1500, withTiming(0, { duration: 300 }))
      );

      // Heavy haptics
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 200);
    }
  }, [disabled, saved]);

  const handlePressIn = () => {
    if (disabled || saved) return;
    scale.value = withSpring(0.9, { damping: 8, stiffness: 200 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    if (disabled || saved) return;
    scale.value = withSpring(1, { damping: 10, stiffness: 150 });
  };

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * breath.value }],
    width: width.value,
  }));

  const xpStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: xpY.value }],
    opacity: xpOpacity.value,
  }));

  return (
    <View style={{ alignItems: 'center', marginVertical: 16, height: 60, justifyContent: 'center' }}>
      {/* Floating XP */}
      <Reanimated.View style={[{ position: 'absolute', zIndex: 100 }, xpStyle]}>
        <Text style={{ color: '#22c55e', fontFamily: 'Inter_700Bold', fontSize: 16, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
          +{xp} XP
        </Text>
      </Reanimated.View>

      {/* Confetti Explosion */}
      <View style={{ position: 'absolute', zIndex: -1 }}>
        {confettiArray.map((_, i) => (
          <ConfettiPiece key={i} index={i} trigger={saved} />
        ))}
      </View>

      <Reanimated.View style={[wrapperStyle]}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          disabled={disabled || saved}
          activeOpacity={1}
          style={{
            borderRadius: 30,
            overflow: 'hidden',
            shadowColor: saved ? '#22c55e' : colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: disabled ? 0 : (saved ? 0.6 : 0.3),
            shadowRadius: 10,
            height: 56,
          }}
        >
          <LinearGradient
            colors={saved ? ['#22c55e', '#10b981'] : [colors.primary, colors.accent || '#6366f1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: disabled ? 0.4 : 1,
            }}
          >
            {saved ? (
              <Ionicons name="checkmark-sharp" size={26} color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' }}>
                  Save Reflection (+{xp} XP)
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Reanimated.View>
    </View>
  );
}

// ─── Save Celebration Modal ───────────────────────────────────────────────────
function SaveCelebrationModal({
  xp,
  currentLevel,
  levelProgress,
  levelMax,
  onClose,
}: {
  xp: number;
  currentLevel: number;
  levelProgress: number;
  levelMax: number;
  onClose: () => void;
}) {
  const colors = useColors();
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  
  const confettiArray = useMemo(() => Array.from({ length: 40 }), []);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 300 });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const prevProgress = Math.max(0, levelProgress - xp);
    const startPct = prevProgress / levelMax;
    const endPct = levelProgress / levelMax;

    progressWidth.value = startPct;
    progressWidth.value = withDelay(400, withSpring(endPct, { damping: 15, stiffness: 80 }));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }));

  return (
    <Reanimated.View style={[
      celebrationStyles.overlay, 
      { backgroundColor: 'rgba(0,0,0,0.85)' },
      bgStyle
    ]}>
      <View style={{ position: 'absolute', top: '30%', left: '50%' }}>
        {confettiArray.map((_, i) => (
          <ConfettiPiece key={i} index={i} trigger={true} />
        ))}
      </View>

      <Reanimated.View style={[
        celebrationStyles.card, 
        { backgroundColor: colors.card, borderColor: colors.border },
        cardStyle
      ]}>
        <View style={[celebrationStyles.iconWrap, { backgroundColor: colors.brand.success + '15' }]}>
          <Ionicons name="sparkles" size={32} color={colors.brand.success} />
        </View>

        <Text style={[celebrationStyles.title, { color: colors.foreground }]}>
          Reflection Saved
        </Text>

        <Text style={[celebrationStyles.sub, { color: colors.mutedForeground }]}>
          You're strengthening your self-awareness neural pathway. Keep going!
        </Text>

        <View style={celebrationStyles.rewardRow}>
          <Text style={[celebrationStyles.xpText, { color: colors.brand.success }]}>
            +{xp} XP
          </Text>
          <Text style={[celebrationStyles.xpSubText, { color: colors.mutedForeground }]}>
            added to your score
          </Text>
        </View>

        <View style={celebrationStyles.levelContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.textSecondary }}>LVL {currentLevel}</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.brand.success }}>{levelProgress}/{levelMax} XP</Text>
          </View>
          <View style={[celebrationStyles.barBg, { backgroundColor: colors.surfaceHigh }]}>
            <Reanimated.View style={[
              celebrationStyles.barFill, 
              { backgroundColor: colors.brand.success },
              barStyle
            ]} />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            opacity.value = withTiming(0, { duration: 250 }, () => {
              runOnJS(onClose)();
            });
          }}
          activeOpacity={0.8}
          style={[celebrationStyles.doneBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={celebrationStyles.doneBtnText}>Continue</Text>
        </TouchableOpacity>
      </Reanimated.View>
    </Reanimated.View>
  );
}

const celebrationStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  rewardRow: {
    alignItems: 'center',
    gap: 4,
    marginVertical: 8,
  },
  xpText: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
  },
  xpSubText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  levelContainer: {
    width: '100%',
    marginVertical: 12,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  doneBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile, addJournalEntry, getJournalEntryForDate, journalEntries,
    addXP, currentLevel, availablePrograms, weekTaskProgress, isWeekTaskComplete,
    getWeekGatingStatus, levelProgress, levelMax
  } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const existing = getJournalEntryForDate(today);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  // ─── Weekly reflection detection ───────────────────────────────────────────
  const isSunday = new Date().getDay() === 0;
  const primaryProgramId = profile.activeProgramIds?.[0];
  const prog = primaryProgramId ? availablePrograms.find(p => p.id === primaryProgramId) : null;
  const progress = primaryProgramId ? profile.programProgress[primaryProgramId] : null;
  const gating = primaryProgramId ? getWeekGatingStatus(primaryProgramId) : null;
  const isWeekEnd = !!gating && gating.daysSinceWeekStart >= 6;
  const isWeeklyReflectionDay = isSunday || isWeekEnd;

  const weeklyReflectionPrompt = useMemo(() => {
    if (!prog || !progress) return "Looking back at this week — what did you learn about yourself?";
    const weekData = prog.weeks[progress.currentWeek - 1];
    return (weekData as any)?.weeklyReflectionPrompt
      ?? "Looking back at this week — what patterns did you notice? What would you do differently?";
  }, [prog, progress]);

  // Determine today's program context
  const { primaryPrompt, missedTasks, hitTasks, programWeek, programName } = useMemo(() => {
    const primaryProgramId = profile.activeProgramIds?.[0];
    const prog = primaryProgramId ? availablePrograms.find(p => p.id === primaryProgramId) : null;
    const progress = primaryProgramId ? profile.programProgress[primaryProgramId] : null;

    let prompt = "What is one small choice you can make today to align with your values?";
    let week = profile.currentWeek ?? 1;
    let name = '';
    const missed: string[] = [];
    const hit: string[] = [];

    if (prog && progress) {
      week = progress.currentWeek;
      name = prog.title;
      const weekData = prog.weeks[progress.currentWeek - 1];
      if (weekData) {
        if ((weekData as any).dailyJournalPrompt) {
          prompt = (weekData as any).dailyJournalPrompt;
        } else {
          const prompts = DAILY_JOURNAL_PROMPTS[progress.currentWeek];
          if (prompts?.length > 0) prompt = prompts[new Date().getDay() % prompts.length];
        }
        weekData.tasks.forEach(task => {
          const complete = isWeekTaskComplete(progress.currentWeek, task.id, primaryProgramId!);
          if (complete) hit.push(task.title);
          else missed.push(task.title);
        });
      }
    }

    return { primaryPrompt: prompt, missedTasks: missed, hitTasks: hit, programWeek: week, programName: name };
  }, [profile, availablePrograms, weekTaskProgress]);

  const dynamicPrompts = useMemo(
    () => buildDynamicPrompts(primaryPrompt, missedTasks, hitTasks),
    [primaryPrompt, missedTasks, hitTasks]
  );

  const [selectedTags, setSelectedTags] = useState<string[]>(existing?.tags ?? []);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activePromptIdx, setActivePromptIdx] = useState(0);
  const [response, setResponse] = useState(existing?.response ?? '');
  const [freeResponse, setFreeResponse] = useState(existing?.freeResponse ?? '');
  const [saved, setSaved] = useState(!!existing);
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'insights'>('today');
  const [wordCount, setWordCount] = useState(existing?.wordCount ?? 0);
  const [showFreeWrite, setShowFreeWrite] = useState(!!existing?.freeResponse);

  const handleTextChange = (text: string) => {
    setResponse(text);
    setSaved(false);
    const wc = [...text.trim().split(/\s+/), ...freeResponse.trim().split(/\s+/)].filter(w => w.length > 0).length;
    setWordCount(wc);
  };

  const handleFreeChange = (text: string) => {
    setFreeResponse(text);
    setSaved(false);
    const wc = [...response.trim().split(/\s+/), ...text.trim().split(/\s+/)].filter(w => w.length > 0).length;
    setWordCount(wc);
  };

  const handleSave = async () => {
    if (!response.trim()) return;
    const missedTaskIds = missedTasks.map((_, i) => `missed-${i}`);
    const hitTaskIds = hitTasks.map((_, i) => `hit-${i}`);
    await addJournalEntry({
      date: today,
      prompt: isWeeklyReflectionDay ? weeklyReflectionPrompt : dynamicPrompts[activePromptIdx],
      response: response.trim(),
      programContext: { missedTaskIds, hitTaskIds, programId: profile.activeProgramIds?.[0] },
      isWeeklyReflection: isWeeklyReflectionDay,
    }, freeResponse.trim() || undefined, selectedTags);
    const isNew = !existing;
    if (isNew) {
      await addXP(DAILY_JOURNAL_XP + (wordCount >= 50 ? WORD_COUNT_BONUS_XP : 0));
    }
    setSaved(true);
    setShowCelebration(true);
  };

  const recentEntries = useMemo(
    () => [...journalEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
    [journalEntries]
  );

  const journalStreak = useMemo(() => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const ds = d.toISOString().split('T')[0];
      if (journalEntries.some(e => e.date === ds)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }, [journalEntries]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    journalEntries.forEach(e => { e.tags?.forEach(t => { counts[t] = (counts[t] || 0) + 1; }); });
    return counts;
  }, [journalEntries]);

  const totalWords = useMemo(
    () => journalEntries.reduce((sum, e) => sum + (e.wordCount ?? 0), 0),
    [journalEntries]
  );

  const currentPrompt = dynamicPrompts[activePromptIdx];
  const isDynamic = dynamicPrompts.length > 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Journal</Text>
          <View style={styles.headerRight}>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.levelBadgeText}>LVL {currentLevel}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/calendar')}
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={14} color={journalStreak > 0 ? '#f59e0b' : colors.mutedForeground} />
            <Text style={[styles.statText, { color: journalStreak > 0 ? '#f59e0b' : colors.mutedForeground }]}>
              {journalStreak}d streak
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="book" size={14} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.foreground }]}>{journalEntries.length} entries</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="create-outline" size={14} color={colors.accent} />
            <Text style={[styles.statText, { color: colors.foreground }]}>{(totalWords / 1000).toFixed(1)}k words</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['today', 'history', 'insights'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => { setActiveTab(tab); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.tabBtn, { backgroundColor: activeTab === tab ? colors.primary : 'transparent' }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === tab ? '#fff' : colors.mutedForeground }]}>
                {tab === 'today' ? 'Today' : tab === 'history' ? 'History' : 'Insights'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── TODAY tab ── */}
      {activeTab === 'today' && (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Dynamic Prompt Card — or Weekly Reflection */}
          {isWeeklyReflectionDay ? (
            <View style={[styles.promptCard, { backgroundColor: '#a855f712', borderColor: '#a855f730' }]}>
              <View style={styles.promptBadgeRow}>
                <View style={[styles.promptBadge, { backgroundColor: '#a855f725' }]}>
                  <Text style={[styles.promptBadgeText, { color: '#a855f7' }]}>🌀 Weekly Reflection</Text>
                </View>
                {prog && progress && (
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#a855f7', marginLeft: 'auto' }}>
                    Week {progress.currentWeek}
                  </Text>
                )}
              </View>
              <Text style={[styles.promptText, { color: colors.foreground }]}>{weeklyReflectionPrompt}</Text>
              <View style={[styles.contextAlert, { backgroundColor: '#a855f712', borderColor: '#a855f730' }]}>
                <Text style={{ fontSize: 14 }}>🌟</Text>
                <Text style={[styles.contextAlertText, { color: '#a855f7' }]}>
                  Sunday reflection — look back at your whole week with compassion
                </Text>
              </View>
            </View>
          ) : (
          <View style={[styles.promptCard, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '30' }]}>
            <View style={styles.promptBadgeRow}>
              <View style={[styles.promptBadge, { backgroundColor: colors.accent + '25' }]}>
                <Text style={[styles.promptBadgeText, { color: colors.accent }]}>
                  {programName ? `${programName} · Week ${programWeek}` : `Week ${programWeek} Prompt`}
                </Text>
              </View>
              {isDynamic && (
                <View style={styles.promptNav}>
                  {dynamicPrompts.map((_, i) => (
                    <TouchableOpacity
                      key={i} onPress={() => { setActivePromptIdx(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.promptNavDot, {
                        backgroundColor: activePromptIdx === i ? colors.accent : colors.border,
                        width: activePromptIdx === i ? 18 : 6,
                      }]}
                    />
                  ))}
                </View>
              )}
            </View>
            <Text style={[styles.promptText, { color: colors.foreground }]}>{currentPrompt}</Text>

            {/* Missed/hit task context */}
            {missedTasks.length > 0 && (
              <View style={[styles.contextAlert, { backgroundColor: '#ef444412', borderColor: '#ef444430' }]}>
                <Ionicons name="warning-outline" size={14} color="#ef4444" />
                <Text style={styles.contextAlertText} numberOfLines={1}>
                  Missed: {missedTasks.slice(0, 2).join(', ')}
                  {missedTasks.length > 2 ? ` +${missedTasks.length - 2}` : ''}
                </Text>
              </View>
            )}
            {hitTasks.length >= 3 && (
              <View style={[styles.contextAlert, { backgroundColor: '#22c55e12', borderColor: '#22c55e30' }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#22c55e" />
                <Text style={[styles.contextAlertText, { color: '#22c55e' }]}>
                  Crushed {hitTasks.length} tasks today 🔥
                </Text>
              </View>
            )}
          </View>
          )}

          {/* Primary Response */}
          <View style={[styles.editorWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>YOUR REFLECTION</Text>
            <TextInput
              value={response}
              onChangeText={handleTextChange}
              placeholder="Write your thoughts here… be honest with yourself."
              placeholderTextColor={colors.mutedForeground + '80'}
              multiline
              style={[styles.editorInput, { color: colors.foreground }]}
            />
            <View style={styles.editorMeta}>
              <Text style={[styles.wordCountText, { color: wordCount >= 50 ? colors.accent : colors.mutedForeground }]}>
                {wordCount} words {wordCount >= 50 ? '✨ Bonus XP earned' : `· ${Math.max(0, 50 - wordCount)} for bonus`}
              </Text>
              {!showFreeWrite && (
                <TouchableOpacity onPress={() => setShowFreeWrite(true)} activeOpacity={0.7}>
                  <Text style={[styles.freeWriteToggle, { color: colors.primary }]}>+ Free write</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Free Write Section */}
          {showFreeWrite && (
            <View style={[styles.editorWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.freeWriteHeader}>
                <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>FREE REFLECTION</Text>
                <Text style={[styles.editorLabelSub, { color: colors.mutedForeground }]}>No prompt — just your thoughts</Text>
              </View>
              <TextInput
                value={freeResponse}
                onChangeText={handleFreeChange}
                placeholder="Anything else on your mind today..."
                placeholderTextColor={colors.mutedForeground + '80'}
                multiline
                style={[styles.editorInput, { color: colors.foreground, minHeight: 100 }]}
              />
            </View>
          )}

          {/* Tag Selector */}
          <View style={{ gap: 8, marginTop: 10, marginBottom: 14 }}>
            <Text style={[styles.editorLabel, { color: colors.mutedForeground, paddingHorizontal: 0, paddingTop: 0 }]}>
              ADD TAGS (HOW ARE YOU FEELING TODAY?)
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TAG_DEFS.map(tag => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedTags(prev =>
                        prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                      );
                      setSaved(false);
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: isSelected ? tag.color + '20' : colors.card,
                        borderColor: isSelected ? tag.color : colors.border,
                        borderWidth: 1,
                      }
                    ]}
                  >
                    <Text style={{ fontSize: 13 }}>{tag.emoji}</Text>
                    <Text style={[
                      styles.tagChipLabel,
                      { color: isSelected ? colors.foreground : colors.mutedForeground }
                    ]}>
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save */}
          <PremiumSaveButton
            onPress={handleSave}
            disabled={!response.trim() || saved}
            saved={saved}
            xp={DAILY_JOURNAL_XP + (wordCount >= 50 ? WORD_COUNT_BONUS_XP : 0)}
            colors={colors}
          />
        </ScrollView>
      )}

      {/* ── HISTORY tab ── */}
      {activeTab === 'history' && (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {recentEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>📖</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No entries yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Start writing today to build your journal streak
              </Text>
            </View>
          ) : (
            recentEntries.map(entry => (
              <EntryCard key={entry.id} entry={entry} colors={colors} />
            ))
          )}
        </ScrollView>
      )}

      {/* ── INSIGHTS tab ── */}
      {activeTab === 'insights' && (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 28-day heatmap */}
          <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.insightCardHeader}>
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <Text style={[styles.insightCardTitle, { color: colors.foreground }]}>28-Day Writing Map</Text>
            </View>
            <Text style={[styles.insightCardSub, { color: colors.mutedForeground }]}>
              🟢 Win · 🔴 Relapse · 🔵 Deep write · ⬜ No entry
            </Text>
            <MoodHeatmap entries={journalEntries} colors={colors} />
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Streak', value: `${journalStreak}d`, icon: 'flame', color: '#f59e0b' },
              { label: 'Entries', value: `${journalEntries.length}`, icon: 'book', color: colors.primary },
              { label: 'Total Words', value: `${totalWords.toLocaleString()}`, icon: 'create-outline', color: colors.accent },
              { label: 'Deep Writes', value: `${journalEntries.filter(e => (e.wordCount ?? 0) >= 50).length}`, icon: 'star', color: '#22c55e' },
            ].map(stat => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                <Text style={[styles.statCardVal, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statCardLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Recurring themes */}
          {Object.keys(tagCounts).length > 0 && (
            <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.insightCardHeader}>
                <Ionicons name="pricetags" size={16} color={colors.primary} />
                <Text style={[styles.insightCardTitle, { color: colors.foreground }]}>Recurring Themes</Text>
              </View>
              <Text style={[styles.insightCardSub, { color: colors.mutedForeground }]}>
                Auto-detected from your writing — bigger = more frequent
              </Text>
              <TagCloud tagCounts={tagCounts} total={journalEntries.length} colors={colors} />
            </View>
          )}

          {/* Writing frequency insight */}
          {journalEntries.length >= 7 && (
            <View style={[styles.insightCard, { backgroundColor: '#6366f112', borderColor: '#6366f130' }]}>
              <Text style={[styles.insightCallout, { color: colors.foreground }]}>
                {journalStreak >= 7
                  ? `🔥 ${journalStreak}-day streak! Writing daily is a superpower for behavior change.`
                  : journalEntries.length >= 20
                    ? `📚 ${journalEntries.length} entries logged. You're building a real record of your journey.`
                    : `✍️ Keep going — patterns emerge after 14 entries. You're ${Math.max(0, 14 - journalEntries.length)} away.`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {showCelebration && (
        <SaveCelebrationModal
          xp={DAILY_JOURNAL_XP + (wordCount >= 50 ? WORD_COUNT_BONUS_XP : 0)}
          currentLevel={currentLevel}
          levelProgress={levelProgress}
          levelMax={levelMax}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  levelBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 14, gap: 0 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, justifyContent: 'center' },
  statText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  statDivider: { width: 1, height: 18 },
  tabRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 4, gap: 2 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  content: { padding: 16, gap: 14 },
  promptCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  promptBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promptBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  promptBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  promptNav: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'flex-end' },
  promptNavDot: { height: 6, borderRadius: 3 },
  promptText: { fontSize: 16, fontFamily: 'Inter_500Medium', lineHeight: 24 },
  contextAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 10, borderWidth: 1 },
  contextAlertText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#ef4444', flex: 1 },
  editorWrap: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  editorLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, paddingHorizontal: 16, paddingTop: 14 },
  editorLabelSub: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  freeWriteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14 },
  editorInput: {
    padding: 16, paddingTop: 8,
    fontSize: 15, fontFamily: 'Inter_400Regular',
    minHeight: 160, textAlignVertical: 'top', lineHeight: 24,
  },
  editorMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  wordCountText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  freeWriteToggle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 18 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  insightCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  insightCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightCardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  insightCardSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  insightCallout: { fontSize: 15, fontFamily: 'Inter_500Medium', lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  statCardVal: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statCardLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagChipLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
