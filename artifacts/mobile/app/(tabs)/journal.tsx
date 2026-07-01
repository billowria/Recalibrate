/**
 * Journal — Swiss Design × Gamified Reflection Engine
 *
 * Architecture:
 * - Swiss grid discipline (8pt baseline, tight typographic hierarchy)
 * - Gamified XP + streak system with animated counters
 * - Active program journals with clear visual identity
 * - Fluid Reanimated 3 micro-interactions throughout
 * - OLED-optimised dark-first palette
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, {
  Easing as RAEasing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { BRAND } from '@/constants/colors';
import { DAILY_JOURNAL_PROMPTS } from '@/constants/program';

const { width: SW } = Dimensions.get('window');

const DAILY_JOURNAL_XP = 25;
const WORD_COUNT_BONUS_XP = 5;
const DEEP_WRITE_THRESHOLD = 50;

const PROGRAM_ACCENTS = [
  { primary: '#5B5EFF', glow: 'rgba(91,94,255,0.3)' },
  { primary: '#00D68F', glow: 'rgba(0,214,143,0.3)' },
  { primary: '#FF6B6B', glow: 'rgba(255,107,107,0.3)' },
  { primary: '#FFB700', glow: 'rgba(255,183,0,0.3)' },
  { primary: '#00D2FF', glow: 'rgba(0,210,255,0.3)' },
  { primary: '#A855F7', glow: 'rgba(168,85,247,0.3)' },
];

const TAG_DEFS = [
  { id: 'stress',      emoji: '😰', label: 'Stress',      color: '#ef4444' },
  { id: 'sleep',       emoji: '😴', label: 'Sleep',        color: '#6366f1' },
  { id: 'craving',     emoji: '🤤', label: 'Craving',      color: '#f59e0b' },
  { id: 'win',         emoji: '🏆', label: 'Win',          color: '#22c55e' },
  { id: 'social',      emoji: '👥', label: 'Social',       color: '#06b6d4' },
  { id: 'work',        emoji: '💼', label: 'Work',         color: '#8b5cf6' },
  { id: 'fitness',     emoji: '💪', label: 'Fitness',      color: '#10b981' },
  { id: 'mindfulness', emoji: '🧘', label: 'Mindful',      color: '#6366f1' },
  { id: 'relapse',     emoji: '⚠️', label: 'Relapse',      color: '#ef4444' },
];

function buildDynamicPrompts(primary: string, missed: string[], hit: string[]): string[] {
  const ps: string[] = [primary];
  if (missed.length > 0)
    ps.push(`You missed "${missed[0]}" today. What was the barrier?`);
  if (hit.length >= 3)
    ps.push(`You completed ${hit.length} tasks today. What made today click?`);
  if (missed.length === 0 && hit.length > 0)
    ps.push('You stayed on track today. What environment made that possible?');
  return ps;
}

const CONFETTI_COLORS = ['#f43f5e', '#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#fff'];

function ConfettiPiece({ index, trigger }: { index: number; trigger: boolean }) {
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const rot = useSharedValue(0);
  const op = useSharedValue(0);
  const sc = useSharedValue(0);
  const color = useMemo(() => CONFETTI_COLORS[index % CONFETTI_COLORS.length], []);
  const size = useMemo(() => Math.random() * 8 + 5, []);

  useEffect(() => {
    if (trigger) {
      const angle = Math.random() * Math.PI + Math.PI;
      const vel = Math.random() * 260 + 100;
      op.value = 1;
      sc.value = withSpring(1);
      x.value = withTiming(Math.cos(angle) * vel, { duration: 1300 });
      y.value = withTiming(Math.sin(angle) * vel + Math.random() * 60 + 40, { duration: 1300 });
      rot.value = withTiming(Math.random() * 720 - 360, { duration: 1300 });
      op.value = withDelay(600, withTiming(0, { duration: 700 }));
    }
  }, [trigger]);

  const s = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${rot.value}deg` }, { scale: sc.value }],
    opacity: op.value,
  }));
  return <Reanimated.View style={[{ position: 'absolute', width: size, height: size, backgroundColor: color, borderRadius: size / 3, zIndex: 50 }, s]} />;
}

function PulsingDot({ color }: { color: string }) {
  const sc = useSharedValue(1);
  const op = useSharedValue(0.6);
  useEffect(() => {
    sc.value = withRepeat(withSequence(withTiming(1.5, { duration: 900, easing: RAEasing.out(RAEasing.quad) }), withTiming(1, { duration: 900 })), -1, false);
    op.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.3, { duration: 900 })), -1, false);
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }], opacity: op.value }));
  return <Reanimated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }, s]} />;
}

function XPBadge({ xp }: { xp: number }) {
  const sc = useSharedValue(0.8);
  const op = useSharedValue(0);
  useEffect(() => {
    sc.value = withSpring(1, { damping: 12, stiffness: 180 });
    op.value = withTiming(1, { duration: 300 });
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }], opacity: op.value }));
  return (
    <Reanimated.View style={s}>
      <LinearGradient colors={['#FFD700', '#FFA500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={SC.xpBadge}>
        <Ionicons name="star" size={11} color="#000" />
        <Text style={SC.xpBadgeText}>+{xp} XP</Text>
      </LinearGradient>
    </Reanimated.View>
  );
}

function StreakRing({ streak, colors }: { streak: number; colors: any }) {
  const glow = useSharedValue(0);
  useEffect(() => {
    if (streak > 0) {
      glow.value = withRepeat(withSequence(withTiming(1, { duration: 1500 }), withTiming(0.3, { duration: 1500 })), -1, false);
    }
  }, [streak]);
  const glowS = useAnimatedStyle(() => ({ shadowOpacity: glow.value * 0.7 }));
  if (streak === 0) {
    return (
      <View style={[SC.streakRing, { borderColor: colors.border }]}>
        <Ionicons name="flame-outline" size={18} color={colors.textMuted} />
        <Text style={[SC.streakNum, { color: colors.textMuted }]}>0</Text>
      </View>
    );
  }
  return (
    <Reanimated.View style={[SC.streakRing, SC.streakActive, glowS]}>
      <Ionicons name="flame" size={18} color="#f59e0b" />
      <Text style={[SC.streakNum, { color: '#f59e0b' }]}>{streak}</Text>
    </Reanimated.View>
  );
}

function ProgramBadge({ name, week, accent, isWeekly }: { name: string; week: number; accent: { primary: string; glow: string }; isWeekly?: boolean }) {
  const sh = useSharedValue(0);
  useEffect(() => {
    sh.value = withRepeat(withSequence(withTiming(1, { duration: 2000 }), withTiming(0, { duration: 2000 })), -1, false);
  }, []);
  const shS = useAnimatedStyle(() => ({ opacity: 0.5 + sh.value * 0.5 }));
  return (
    <View style={[SC.progBadgeWrap, { borderColor: accent.primary + '40' }]}>
      <LinearGradient colors={[accent.primary + '18', accent.primary + '05']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={SC.progBadgeGrad}>
        <View style={[SC.progBadgeDot, { backgroundColor: accent.primary + '20' }]}>
          <PulsingDot color={accent.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[SC.progBadgeName, { color: accent.primary }]} numberOfLines={1}>
            {isWeekly ? '◆ WEEKLY REFLECTION' : name.toUpperCase()}
          </Text>
          <Text style={SC.progBadgeSub}>{isWeekly ? 'End of week synthesis' : `Week ${week} · Daily Prompt`}</Text>
        </View>
        {isWeekly && <Reanimated.View style={shS}><Ionicons name="sparkles" size={16} color={accent.primary} /></Reanimated.View>}
      </LinearGradient>
    </View>
  );
}

function PromptCard({ prompt, accent, programName, programWeek, isWeekly, isDynamic, promptIndex, totalPrompts, onNext, onPrev, colors }: {
  prompt: string; accent: { primary: string; glow: string }; programName: string; programWeek: number;
  isWeekly: boolean; isDynamic: boolean; promptIndex: number; totalPrompts: number;
  onNext: () => void; onPrev: () => void; colors: any;
}) {
  const tx = useSharedValue(0);
  const op = useSharedValue(1);
  const prevIdx = useRef(promptIndex);

  useEffect(() => {
    if (prevIdx.current !== promptIndex) {
      const dir = promptIndex > prevIdx.current ? 1 : -1;
      tx.value = dir * 40; op.value = 0;
      tx.value = withSpring(0, { damping: 20, stiffness: 200 });
      op.value = withTiming(1, { duration: 300 });
      prevIdx.current = promptIndex;
    }
  }, [promptIndex]);

  const tS = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }], opacity: op.value }));

  return (
    <View style={[SC.promptCard, { borderColor: accent.primary + '30' }]}>
      <LinearGradient colors={[accent.primary + '12', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <ProgramBadge name={programName} week={programWeek} accent={accent} isWeekly={isWeekly} />
      <Reanimated.Text style={[SC.promptText, { color: colors.foreground }, tS]}>{prompt}</Reanimated.Text>
      {isDynamic && totalPrompts > 1 && (
        <View style={SC.promptNavRow}>
          <TouchableOpacity onPress={() => { onPrev(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[SC.promptNavBtn, { borderColor: accent.primary + '50' }]} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={14} color={accent.primary} />
          </TouchableOpacity>
          <View style={SC.promptDots}>
            {Array.from({ length: totalPrompts }).map((_, i) => (
              <View key={i} style={[SC.promptDot, { backgroundColor: i === promptIndex ? accent.primary : accent.primary + '30', width: i === promptIndex ? 20 : 6 }]} />
            ))}
          </View>
          <TouchableOpacity onPress={() => { onNext(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[SC.promptNavBtn, { borderColor: accent.primary + '50' }]} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={14} color={accent.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function WritingEditor({ value, onChangeText, placeholder, colors, accent, wordCount, isFocused, onFocus, onBlur }: {
  value: string; onChangeText: (t: string) => void; placeholder: string; colors: any;
  accent: { primary: string; glow: string }; wordCount?: number; isFocused: boolean; onFocus: () => void; onBlur: () => void;
}) {
  const bAnim = useSharedValue(0);
  useEffect(() => { bAnim.value = withTiming(isFocused ? 1 : 0, { duration: 300 }); }, [isFocused]);
  const bS = useAnimatedStyle(() => ({
    borderColor: isFocused ? accent.primary : colors.border,
    shadowOpacity: bAnim.value * 0.4,
    shadowColor: accent.primary,
  }));
  const isDeep = (wordCount ?? 0) >= DEEP_WRITE_THRESHOLD;
  return (
    <Reanimated.View style={[SC.editorWrap, { backgroundColor: colors.surfaceHigh }, bS]}>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textMuted} multiline textAlignVertical="top" onFocus={onFocus} onBlur={onBlur} style={[SC.editorInput, { color: colors.foreground }]} />
      {wordCount !== undefined && (
        <View style={SC.editorFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[SC.wordDot, { backgroundColor: isDeep ? BRAND.success : accent.primary }]} />
            <Text style={[SC.wordText, { color: isDeep ? BRAND.success : colors.textSecondary }]}>
              {wordCount} words{isDeep ? ' · Deep Write ✦' : ''}
            </Text>
          </View>
        </View>
      )}
    </Reanimated.View>
  );
}

function TagChip({ tag, isSelected, onPress, colors }: { tag: typeof TAG_DEFS[0]; isSelected: boolean; onPress: () => void; colors: any }) {
  const sc = useSharedValue(1);
  useEffect(() => {}, [isSelected]);
  const s = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }],
    backgroundColor: isSelected ? tag.color + '22' : colors.surfaceHigh,
    borderColor: isSelected ? tag.color + 'CC' : colors.border,
  }));
  return (
    <Pressable onPressIn={() => { sc.value = withSpring(0.88, { damping: 15 }); }} onPressOut={() => { sc.value = withSpring(1, { damping: 12 }); }} onPress={onPress}>
      <Reanimated.View style={[SC.tagChip, s]}>
        <Text style={{ fontSize: 14 }}>{tag.emoji}</Text>
        <Text style={[SC.tagLabel, { color: isSelected ? tag.color : colors.textSecondary }]}>{tag.label}</Text>
      </Reanimated.View>
    </Pressable>
  );
}

function CommitButton({ onPress, disabled, saved, xp, accent, colors }: {
  onPress: () => void; disabled: boolean; saved: boolean; xp: number; accent: { primary: string; glow: string }; colors: any;
}) {
  const progress = useSharedValue(0);
  const sc = useSharedValue(1);
  const xpY = useSharedValue(0);
  const xpOp = useSharedValue(0);
  const confetti = useMemo(() => Array.from({ length: 28 }), []);

  const triggerTick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const triggerDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 200);
  };

  useAnimatedReaction(
    () => progress.value,
    (cur, prev) => {
      if (!prev) return;
      if (Math.floor(cur * 10) > Math.floor(prev * 10) && cur < 1) runOnJS(triggerTick)();
    }
  );

  useEffect(() => {
    if (saved) {
      xpY.value = withSpring(-56, { damping: 12, stiffness: 100 });
      xpOp.value = withSequence(withTiming(1, { duration: 200 }), withDelay(1800, withTiming(0, { duration: 400 })));
    }
  }, [saved]);

  const handlePressIn = () => {
    if (disabled || saved) return;
    sc.value = withSpring(0.93, { damping: 15 });
    progress.value = withTiming(1, { duration: 1000, easing: RAEasing.bezier(0.25, 1, 0.5, 1) }, (fin) => {
      if (fin) { runOnJS(triggerDone)(); runOnJS(onPress)(); }
    });
  };
  const handlePressOut = () => {
    if (disabled || saved) return;
    sc.value = withSpring(1, { damping: 15 });
    if (progress.value < 1) progress.value = withTiming(0, { duration: 300 });
  };

  const wS = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  const pS = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));
  const xpS = useAnimatedStyle(() => ({ transform: [{ translateY: xpY.value }], opacity: xpOp.value }));

  if (saved) {
    return (
      <Reanimated.View entering={FadeInDown.springify().damping(18)} style={SC.savedWrap}>
        <LinearGradient colors={[BRAND.success + 'CC', BRAND.success]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={SC.savedGrad}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={SC.savedText}>REFLECTION SAVED</Text>
          <XPBadge xp={xp} />
        </LinearGradient>
        <View style={{ position: 'absolute', zIndex: -1 }}>
          {confetti.map((_, i) => <ConfettiPiece key={i} index={i} trigger={saved} />)}
        </View>
      </Reanimated.View>
    );
  }

  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <Reanimated.View style={[{ position: 'absolute', top: -40, zIndex: 100 }, xpS]}>
        <Text style={{ color: BRAND.success, fontFamily: 'Inter_800ExtraBold', fontSize: 22 }}>+{xp} XP</Text>
      </Reanimated.View>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled || saved} style={{ width: '100%' }}>
        <Reanimated.View style={[SC.commitBtn, { backgroundColor: disabled ? colors.surfaceHigh : colors.surfaceMid, borderColor: disabled ? colors.border : accent.primary + '60', opacity: disabled ? 0.5 : 1 }, wS]}>
          <Reanimated.View style={[SC.commitProg, { backgroundColor: accent.primary + '25' }, pS]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="finger-print" size={22} color={disabled ? colors.textMuted : accent.primary} />
            <Text style={[SC.commitText, { color: disabled ? colors.textMuted : colors.foreground }]}>HOLD TO COMMIT</Text>
          </View>
        </Reanimated.View>
      </Pressable>
    </View>
  );
}

function CelebrationModal({ xp, currentLevel, levelProgress, levelMax, onClose }: {
  xp: number; currentLevel: number; levelProgress: number; levelMax: number; onClose: () => void;
}) {
  const colors = useColors();
  const sc = useSharedValue(0.5);
  const op = useSharedValue(0);
  const pw = useSharedValue(0);
  const confetti = useMemo(() => Array.from({ length: 40 }), []);

  useEffect(() => {
    sc.value = withSpring(1, { damping: 12, stiffness: 120 });
    op.value = withTiming(1, { duration: 300 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const prev = Math.max(0, levelProgress - xp);
    pw.value = prev / levelMax;
    pw.value = withDelay(400, withSpring(levelProgress / levelMax, { damping: 15, stiffness: 80 }));
  }, []);

  const cardS = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }], opacity: op.value }));
  const bgS = useAnimatedStyle(() => ({ opacity: op.value }));
  const barS = useAnimatedStyle(() => ({ width: `${pw.value * 100}%` as any }));

  return (
    <Reanimated.View style={[CM.overlay, bgS]}>
      <View style={{ position: 'absolute', top: '30%', left: '50%' }}>
        {confetti.map((_, i) => <ConfettiPiece key={i} index={i} trigger={true} />)}
      </View>
      <Reanimated.View style={[CM.card, { backgroundColor: colors.card, borderColor: colors.border }, cardS]}>
        <LinearGradient colors={[BRAND.success + '20', 'transparent']} style={StyleSheet.absoluteFill} />
        <View style={[CM.iconRing, { borderColor: BRAND.success + '40' }]}>
          <Ionicons name="sparkles" size={32} color={BRAND.success} />
        </View>
        <Text style={[CM.title, { color: colors.foreground }]}>Reflection Saved ✦</Text>
        <Text style={[CM.sub, { color: colors.textSecondary }]}>You're strengthening your self-awareness pathway. Keep going.</Text>
        <LinearGradient colors={['#FFD700', '#FFA500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={CM.xpRow}>
          <Text style={CM.xpVal}>+{xp} XP</Text>
          <Text style={CM.xpSub}>added to your score</Text>
        </LinearGradient>
        <View style={CM.levelWrap}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[CM.lvlLabel, { color: colors.textSecondary }]}>LVL {currentLevel}</Text>
            <Text style={[CM.lvlLabel, { color: BRAND.success }]}>{levelProgress}/{levelMax} XP</Text>
          </View>
          <View style={[CM.barBg, { backgroundColor: colors.surfaceHigh }]}>
            <Reanimated.View style={[CM.barFill, { backgroundColor: BRAND.success }, barS]} />
          </View>
        </View>
        <TouchableOpacity onPress={() => { op.value = withTiming(0, { duration: 200 }, () => runOnJS(onClose)()); }} activeOpacity={0.85} style={CM.btn}>
          <LinearGradient colors={[BRAND.primary, BRAND.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={CM.btnInner}>
            <Text style={CM.btnText}>Continue Journey</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Reanimated.View>
    </Reanimated.View>
  );
}

const CM = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, paddingHorizontal: 20 },
  card: { width: '100%', borderRadius: 28, borderWidth: 1, padding: 28, alignItems: 'center', gap: 16, overflow: 'hidden' },
  iconRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 24, fontFamily: 'Inter_800ExtraBold', textAlign: 'center', letterSpacing: -0.5 },
  sub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
  xpRow: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, alignItems: 'center', gap: 2, marginVertical: 4 },
  xpVal: { fontSize: 32, fontFamily: 'Inter_800ExtraBold', color: '#000' },
  xpSub: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#000', opacity: 0.7 },
  levelWrap: { width: '100%', marginVertical: 4 },
  lvlLabel: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  btn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  btnInner: { paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.3 },
});

function HistoryCard({ entry, colors, index }: { entry: any; colors: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.date + 'T12:00:00');
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const tags = entry.tags ?? [];
  const isWin = tags.includes('win');
  const isRelapse = tags.includes('relapse');
  const isDeep = (entry.wordCount ?? 0) >= DEEP_WRITE_THRESHOLD;
  const ac = isWin ? BRAND.success : isRelapse ? BRAND.danger : isDeep ? BRAND.primary : colors.border;

  return (
    <Reanimated.View entering={FadeInDown.delay(index * 40).springify().damping(18)}>
      <TouchableOpacity onPress={() => { setExpanded(e => !e); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} activeOpacity={0.9} style={[HC.card, { backgroundColor: colors.surfaceHigh, borderColor: ac + '50' }]}>
        <View style={[HC.accentBar, { backgroundColor: ac }]} />
        <View style={HC.content}>
          <View style={HC.headerRow}>
            <View style={{ gap: 3 }}>
              <Text style={[HC.dateText, { color: colors.foreground }]}>{dateLabel.toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {(entry.wordCount ?? 0) > 0 && <Text style={[HC.metaText, { color: colors.textSecondary }]}>{entry.wordCount} words</Text>}
                {isDeep && <View style={[HC.deepBadge, { backgroundColor: BRAND.primary + '20' }]}><Text style={{ fontSize: 9, color: BRAND.primary, fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>DEEP WRITE</Text></View>}
                {isWin && <Text style={{ fontSize: 13 }}>🏆</Text>}
                {isRelapse && <Text style={{ fontSize: 13 }}>⚠️</Text>}
              </View>
            </View>
            <View style={[HC.chevronBtn, { borderColor: colors.border }]}>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
            </View>
          </View>
          {!expanded && <Text style={[HC.preview, { color: colors.textSecondary }]} numberOfLines={2}>{entry.response}</Text>}
          {expanded && (
            <Reanimated.View entering={FadeInDown.duration(200)} style={HC.expandedWrap}>
              <Text style={[HC.promptLabel, { color: ac }]}>"{entry.prompt}"</Text>
              <Text style={[HC.fullText, { color: colors.foreground }]}>{entry.response}</Text>
              {entry.freeResponse ? (
                <>
                  <View style={[HC.divider, { backgroundColor: colors.border }]} />
                  <Text style={[HC.fullText, { color: colors.foreground }]}>{entry.freeResponse}</Text>
                </>
              ) : null}
              {tags.length > 0 && (
                <View style={HC.tagsRow}>
                  {tags.map((tagId: string) => {
                    const def = TAG_DEFS.find(t => t.id === tagId);
                    if (!def) return null;
                    return (
                      <View key={tagId} style={[HC.tagPill, { backgroundColor: def.color + '20', borderColor: def.color + '60' }]}>
                        <Text style={{ fontSize: 11 }}>{def.emoji}</Text>
                        <Text style={{ fontSize: 10, color: def.color, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 }}>{def.label.toUpperCase()}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </Reanimated.View>
          )}
        </View>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const HC = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  accentBar: { width: 3, minHeight: 72 },
  content: { flex: 1, padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dateText: { fontSize: 13, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.5 },
  metaText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  deepBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chevronBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  preview: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, opacity: 0.85 },
  expandedWrap: { gap: 14 },
  promptLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', fontStyle: 'italic', lineHeight: 19 },
  fullText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 24 },
  divider: { height: 1, width: 36, marginVertical: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
});

function Heatmap({ entries, colors }: { entries: any[]; colors: any }) {
  const today = new Date();
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (27 - i));
    const ds = d.toISOString().split('T')[0];
    const entry = entries.find((e: any) => e.date === ds);
    const isToday = ds === today.toISOString().split('T')[0];
    return { ds, entry, isToday };
  });
  const getColor = (entry: any) => {
    if (!entry) return colors.surfaceHigh;
    if (entry.tags?.includes('win')) return BRAND.success;
    if (entry.tags?.includes('relapse') || entry.tags?.includes('craving')) return BRAND.danger;
    if ((entry.wordCount ?? 0) >= 50) return BRAND.primary;
    return BRAND.primaryLight;
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
      {days.map(({ ds, entry, isToday }) => (
        <View key={ds} style={{ width: '13.2%', aspectRatio: 1, borderRadius: 4, backgroundColor: getColor(entry), opacity: entry ? 1 : 0.18, borderWidth: isToday ? 2 : 0, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
          {isToday && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff', opacity: 0.9 }} />}
        </View>
      ))}
    </View>
  );
}

function InsightStat({ label, value, icon, color, colors, index }: { label: string; value: string; icon: any; color: string; colors: any; index: number }) {
  return (
    <Reanimated.View entering={FadeInUp.delay(index * 80).springify().damping(18)} style={[IS.card, { backgroundColor: colors.surfaceHigh, borderColor: color + '30' }]}>
      <LinearGradient colors={[color + '15', 'transparent']} style={StyleSheet.absoluteFill} />
      <View style={[IS.iconRing, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[IS.val, { color: colors.foreground }]}>{value}</Text>
      <Text style={[IS.lbl, { color: colors.textSecondary }]}>{label}</Text>
    </Reanimated.View>
  );
}

const IS = StyleSheet.create({
  card: { width: '47%', borderRadius: 18, borderWidth: 1, padding: 16, alignItems: 'center', gap: 8, overflow: 'hidden' },
  iconRing: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  val: { fontSize: 26, fontFamily: 'Inter_800ExtraBold', letterSpacing: -1 },
  lbl: { fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'center' },
});

function TabButton({ label, icon, isActive, onPress, colors }: { label: string; icon: string; isActive: boolean; onPress: () => void; colors: any }) {
  const sc = useSharedValue(1);
  const s = useAnimatedStyle(() => ({
    backgroundColor: isActive ? BRAND.primary + '20' : 'transparent',
    transform: [{ scale: sc.value }],
  }));
  return (
    <Pressable onPressIn={() => { sc.value = withSpring(0.93, { damping: 15 }); }} onPressOut={() => { sc.value = withSpring(1, { damping: 12 }); }} onPress={onPress} style={{ flex: 1 }}>
      <Reanimated.View style={[SC.tabBtn, s]}>
        <Ionicons name={icon as any} size={14} color={isActive ? BRAND.primary : colors.textSecondary} />
        <Text style={[SC.tabText, { color: isActive ? BRAND.primary : colors.textSecondary }]}>{label}</Text>
      </Reanimated.View>
    </Pressable>
  );
}

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile, addJournalEntry, getJournalEntryForDate, journalEntries,
    addXP, currentLevel, availablePrograms, weekTaskProgress, isWeekTaskComplete,
    getWeekGatingStatus, levelProgress, levelMax,
  } = useApp();

  const today = new Date().toISOString().split('T')[0];
  const existing = getJournalEntryForDate(today);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const isSunday = new Date().getDay() === 0;
  const primaryProgramId = profile.activeProgramIds?.[0];
  const prog = primaryProgramId ? availablePrograms.find(p => p.id === primaryProgramId) : null;
  const progress = primaryProgramId ? profile.programProgress[primaryProgramId] : null;
  const gating = primaryProgramId ? getWeekGatingStatus(primaryProgramId) : null;
  const isWeekEnd = !!gating && gating.daysSinceWeekStart >= 6;
  const isWeeklyReflectionDay = isSunday || isWeekEnd;

  const weeklyReflectionPrompt = useMemo(() => {
    if (!prog || !progress) return 'Looking back at this week — what did you learn about yourself?';
    const weekData = prog.weeks[progress.currentWeek - 1];
    return (weekData as any)?.weeklyReflectionPrompt ?? 'Looking back at this week — what patterns did you notice?';
  }, [prog, progress]);

  const { primaryPrompt, missedTasks, hitTasks, programWeek, programName } = useMemo(() => {
    const pid = profile.activeProgramIds?.[0];
    const p = pid ? availablePrograms.find(x => x.id === pid) : null;
    const pr = pid ? profile.programProgress[pid] : null;
    let prompt = 'What is one small choice you can make today to align with your values?';
    let week = profile.currentWeek ?? 1;
    let name = '';
    const missed: string[] = [];
    const hit: string[] = [];
    if (p && pr) {
      week = pr.currentWeek; name = p.title;
      const weekData = p.weeks[pr.currentWeek - 1];
      if (weekData) {
        if ((weekData as any).dailyJournalPrompt) { prompt = (weekData as any).dailyJournalPrompt; }
        else { const prompts = DAILY_JOURNAL_PROMPTS[pr.currentWeek]; if (prompts?.length > 0) prompt = prompts[new Date().getDay() % prompts.length]; }
        weekData.tasks.forEach(task => {
          if (isWeekTaskComplete(pr.currentWeek, task.id, pid!)) hit.push(task.title);
          else missed.push(task.title);
        });
      }
    }
    return { primaryPrompt: prompt, missedTasks: missed, hitTasks: hit, programWeek: week, programName: name };
  }, [profile, availablePrograms, weekTaskProgress]);

  const dynamicPrompts = useMemo(() => buildDynamicPrompts(primaryPrompt, missedTasks, hitTasks), [primaryPrompt, missedTasks, hitTasks]);

  const programAccent = PROGRAM_ACCENTS[
    Math.abs(profile.activeProgramIds?.[0]?.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) ?? 0) % PROGRAM_ACCENTS.length
  ] ?? PROGRAM_ACCENTS[0];

  const [selectedTags, setSelectedTags] = useState<string[]>(existing?.tags ?? []);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activePromptIdx, setActivePromptIdx] = useState(0);
  const [response, setResponse] = useState(existing?.response ?? '');
  const [freeResponse, setFreeResponse] = useState(existing?.freeResponse ?? '');
  const [saved, setSaved] = useState(!!existing);
  const [activeTab, setActiveTab] = useState<'write' | 'history' | 'insights'>('write');
  const [wordCount, setWordCount] = useState(existing?.wordCount ?? 0);
  const [showFreeWrite, setShowFreeWrite] = useState(!!existing?.freeResponse);
  const [editorFocused, setEditorFocused] = useState(false);
  const [freeEditorFocused, setFreeEditorFocused] = useState(false);

  const handleTextChange = (text: string) => {
    setResponse(text); setSaved(false);
    setWordCount([...text.trim().split(/\s+/), ...freeResponse.trim().split(/\s+/)].filter(w => w.length > 0).length);
  };
  const handleFreeChange = (text: string) => {
    setFreeResponse(text); setSaved(false);
    setWordCount([...response.trim().split(/\s+/), ...text.trim().split(/\s+/)].filter(w => w.length > 0).length);
  };

  const handleSave = async () => {
    if (!response.trim()) return;
    await addJournalEntry(
      { date: today, prompt: isWeeklyReflectionDay ? weeklyReflectionPrompt : dynamicPrompts[activePromptIdx], response: response.trim(), programContext: { missedTaskIds: missedTasks.map((_, i) => `missed-${i}`), hitTaskIds: hitTasks.map((_, i) => `hit-${i}`), programId: profile.activeProgramIds?.[0] }, isWeeklyReflection: isWeeklyReflectionDay },
      freeResponse.trim() || undefined, selectedTags
    );
    if (!existing) await addXP(DAILY_JOURNAL_XP + (wordCount >= DEEP_WRITE_THRESHOLD ? WORD_COUNT_BONUS_XP : 0));
    setSaved(true); setShowCelebration(true);
  };

  const recentEntries = useMemo(() => [...journalEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30), [journalEntries]);

  const journalStreak = useMemo(() => {
    let streak = 0; const d = new Date();
    while (true) {
      const ds = d.toISOString().split('T')[0];
      if (journalEntries.some(e => e.date === ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  }, [journalEntries]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    journalEntries.forEach(e => { e.tags?.forEach(t => { counts[t] = (counts[t] || 0) + 1; }); });
    return counts;
  }, [journalEntries]);

  const totalWords = useMemo(() => journalEntries.reduce((sum, e) => sum + (e.wordCount ?? 0), 0), [journalEntries]);
  const deepWrites = useMemo(() => journalEntries.filter(e => (e.wordCount ?? 0) >= DEEP_WRITE_THRESHOLD).length, [journalEntries]);

  const xpToEarn = DAILY_JOURNAL_XP + (wordCount >= DEEP_WRITE_THRESHOLD ? WORD_COUNT_BONUS_XP : 0);
  const currentPrompt = isWeeklyReflectionDay ? weeklyReflectionPrompt : dynamicPrompts[activePromptIdx];
  const isDynamic = !isWeeklyReflectionDay && dynamicPrompts.length > 1;

  const activeProgs = useMemo(() =>
    (profile.activeProgramIds ?? []).map((id, idx) => {
      const p = availablePrograms.find(x => x.id === id);
      if (!p) return null;
      return { ...p, progProgress: profile.programProgress[id], accent: PROGRAM_ACCENTS[idx % PROGRAM_ACCENTS.length] };
    }).filter(Boolean),
    [profile.activeProgramIds, availablePrograms, profile.programProgress]
  );

  const scrollY = useSharedValue(0);
  const headerAnimS = useAnimatedStyle(() => ({ shadowOpacity: interpolate(scrollY.value, [0, 40], [0, 0.4], 'clamp') }));

  return (
    <View style={[SC.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[programAccent.primary + '18', 'transparent']} style={SC.heroGrad} pointerEvents="none" />

      <Reanimated.View style={[SC.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }, headerAnimS]}>
        {/* Title row */}
        <View style={SC.titleRow}>
          <View style={{ gap: 2 }}>
            <Text style={[SC.titleLabel, { color: colors.textSecondary }]}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </Text>
            <Text style={[SC.title, { color: colors.foreground }]}>Journal</Text>
          </View>
          <View style={SC.headerActions}>
            <StreakRing streak={journalStreak} colors={colors} />
            <LinearGradient colors={[BRAND.primary, BRAND.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={SC.levelBadge}>
              <Text style={SC.levelBadgeText}>LVL {currentLevel}</Text>
            </LinearGradient>
            <TouchableOpacity onPress={() => router.push('/calendar')} style={[SC.iconBtn, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* XP Bar */}
        <View style={SC.xpBarWrap}>
          <View style={[SC.xpBarBg, { backgroundColor: colors.surfaceHigh }]}>
            <LinearGradient colors={[BRAND.primary, BRAND.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[SC.xpBarFill, { width: `${(levelProgress / levelMax) * 100}%` as any }]} />
          </View>
          <Text style={[SC.xpBarText, { color: colors.textSecondary }]}>{levelProgress}/{levelMax} XP</Text>
        </View>

        {/* Active program pills */}
        {activeProgs.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
            {activeProgs.map((p: any, idx) => (
              <Reanimated.View key={p.id} entering={FadeIn.delay(idx * 100)} style={[SC.progPill, { borderColor: p.accent.primary + '50', backgroundColor: p.accent.primary + '10' }]}>
                <PulsingDot color={p.accent.primary} />
                <Text style={[SC.progPillText, { color: p.accent.primary }]} numberOfLines={1}>{p.title}</Text>
                <Text style={[SC.progPillWeek, { color: p.accent.primary + 'AA' }]}>W{p.progProgress?.currentWeek ?? 1}</Text>
              </Reanimated.View>
            ))}
          </ScrollView>
        )}

        {/* Tabs */}
        <View style={[SC.tabRow, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
          <TabButton label="Write" icon="create-outline" isActive={activeTab === 'write'} onPress={() => { setActiveTab('write'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} colors={colors} />
          <TabButton label="History" icon="time-outline" isActive={activeTab === 'history'} onPress={() => { setActiveTab('history'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} colors={colors} />
          <TabButton label="Insights" icon="analytics-outline" isActive={activeTab === 'insights'} onPress={() => { setActiveTab('insights'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} colors={colors} />
        </View>
      </Reanimated.View>

      {/* ── WRITE TAB ── */}
      {activeTab === 'write' && (
        <ScrollView contentContainerStyle={[SC.content, { paddingBottom: Platform.OS === 'web' ? 120 : 110 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <PromptCard prompt={currentPrompt} accent={programAccent} programName={programName || 'Daily Reflection'} programWeek={programWeek} isWeekly={isWeeklyReflectionDay} isDynamic={isDynamic} promptIndex={activePromptIdx} totalPrompts={dynamicPrompts.length} onNext={() => setActivePromptIdx(i => Math.min(i + 1, dynamicPrompts.length - 1))} onPrev={() => setActivePromptIdx(i => Math.max(i - 1, 0))} colors={colors} />

          {(missedTasks.length > 0 || hitTasks.length >= 3) && (
            <Reanimated.View entering={FadeInDown.duration(300)} style={{ gap: 8 }}>
              {missedTasks.length > 0 && (
                <View style={[SC.alertChip, { backgroundColor: BRAND.danger + '15', borderColor: BRAND.danger + '40' }]}>
                  <Ionicons name="alert-circle" size={14} color={BRAND.danger} />
                  <Text style={[SC.alertText, { color: colors.textSecondary }]}>
                    <Text style={{ color: BRAND.danger, fontFamily: 'Inter_700Bold' }}>Missed: </Text>
                    {missedTasks.slice(0, 2).join(', ')}{missedTasks.length > 2 ? ` +${missedTasks.length - 2}` : ''}
                  </Text>
                </View>
              )}
              {hitTasks.length >= 3 && (
                <View style={[SC.alertChip, { backgroundColor: BRAND.success + '15', borderColor: BRAND.success + '40' }]}>
                  <Ionicons name="checkmark-circle" size={14} color={BRAND.success} />
                  <Text style={[SC.alertText, { color: colors.textSecondary }]}>
                    <Text style={{ color: BRAND.success, fontFamily: 'Inter_700Bold' }}>Crushed it: </Text>
                    Completed {hitTasks.length} protocol tasks today.
                  </Text>
                </View>
              )}
            </Reanimated.View>
          )}

          <View style={SC.sectionLabel}>
            <View style={[SC.sectionLine, { backgroundColor: programAccent.primary }]} />
            <Text style={[SC.sectionLabelText, { color: colors.textSecondary }]}>YOUR REFLECTION</Text>
          </View>

          <WritingEditor value={response} onChangeText={handleTextChange} placeholder="Start writing… be honest with yourself." colors={colors} accent={programAccent} wordCount={wordCount} isFocused={editorFocused} onFocus={() => setEditorFocused(true)} onBlur={() => setEditorFocused(false)} />

          {!showFreeWrite ? (
            <TouchableOpacity onPress={() => setShowFreeWrite(true)} activeOpacity={0.7} style={SC.freeToggle}>
              <Ionicons name="add-circle-outline" size={16} color={programAccent.primary} />
              <Text style={[SC.freeToggleText, { color: programAccent.primary }]}>Add Free Write</Text>
            </TouchableOpacity>
          ) : (
            <Reanimated.View entering={FadeInDown.duration(250)}>
              <View style={SC.sectionLabel}>
                <View style={[SC.sectionLine, { backgroundColor: colors.border }]} />
                <Text style={[SC.sectionLabelText, { color: colors.textSecondary }]}>FREE WRITE</Text>
              </View>
              <WritingEditor value={freeResponse} onChangeText={handleFreeChange} placeholder="No prompt. Just your thoughts flowing freely…" colors={colors} accent={{ primary: colors.textSecondary, glow: 'transparent' }} isFocused={freeEditorFocused} onFocus={() => setFreeEditorFocused(true)} onBlur={() => setFreeEditorFocused(false)} />
            </Reanimated.View>
          )}

          <View style={{ gap: 12 }}>
            <View style={SC.sectionLabel}>
              <View style={[SC.sectionLine, { backgroundColor: colors.border }]} />
              <Text style={[SC.sectionLabelText, { color: colors.textSecondary }]}>HOW ARE YOU FEELING?</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TAG_DEFS.map(tag => (
                <TagChip key={tag.id} tag={tag} isSelected={selectedTags.includes(tag.id)} onPress={() => { setSelectedTags(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]); setSaved(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} colors={colors} />
              ))}
            </View>
          </View>

          {!saved && response.trim().length > 0 && (
            <Reanimated.View entering={FadeInDown.duration(300)} style={[SC.xpPreview, { borderColor: programAccent.primary + '30', backgroundColor: programAccent.primary + '08' }]}>
              <Ionicons name="star-outline" size={14} color={programAccent.primary} />
              <Text style={[SC.xpPreviewText, { color: programAccent.primary }]}>
                Save to earn <Text style={{ fontFamily: 'Inter_800ExtraBold' }}>+{xpToEarn} XP</Text>
                {wordCount >= DEEP_WRITE_THRESHOLD ? ' (Deep Write bonus ✦)' : ''}
              </Text>
            </Reanimated.View>
          )}

          <CommitButton onPress={handleSave} disabled={!response.trim() || saved} saved={saved} xp={xpToEarn} accent={programAccent} colors={colors} />
        </ScrollView>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <ScrollView contentContainerStyle={[SC.content, { paddingBottom: Platform.OS === 'web' ? 120 : 110 }]} showsVerticalScrollIndicator={false}>
          {recentEntries.length === 0 ? (
            <Reanimated.View entering={FadeInUp.duration(400)} style={SC.emptyState}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>📖</Text>
              <Text style={[SC.emptyTitle, { color: colors.foreground }]}>No entries yet</Text>
              <Text style={[SC.emptySub, { color: colors.textSecondary }]}>Start writing today to build your reflection journal</Text>
            </Reanimated.View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={[SC.historyCount, { color: colors.foreground }]}>{recentEntries.length} Entries</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {[{ color: BRAND.success, label: 'Win' }, { color: BRAND.primary, label: 'Deep' }, { color: BRAND.danger, label: 'Relapse' }].map(l => (
                    <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: l.color }} />
                      <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              {recentEntries.map((entry, idx) => <HistoryCard key={entry.id} entry={entry} colors={colors} index={idx} />)}
            </>
          )}
        </ScrollView>
      )}

      {/* ── INSIGHTS TAB ── */}
      {activeTab === 'insights' && (
        <ScrollView contentContainerStyle={[SC.content, { paddingBottom: Platform.OS === 'web' ? 120 : 110 }]} showsVerticalScrollIndicator={false}>
          <View style={SC.statsGrid}>
            {[
              { label: 'Day Streak', value: `${journalStreak}`, icon: 'flame', color: '#f59e0b' },
              { label: 'Total Entries', value: `${journalEntries.length}`, icon: 'book', color: BRAND.primary },
              { label: 'Words Written', value: totalWords > 999 ? `${(totalWords / 1000).toFixed(1)}k` : `${totalWords}`, icon: 'create-outline', color: BRAND.secondary },
              { label: 'Deep Writes', value: `${deepWrites}`, icon: 'star', color: BRAND.success },
            ].map((stat, idx) => <InsightStat key={stat.label} label={stat.label} value={stat.value} icon={stat.icon as any} color={stat.color} colors={colors} index={idx} />)}
          </View>

          <Reanimated.View entering={FadeInUp.delay(200).springify()} style={[SC.insightCard, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="grid-outline" size={16} color={BRAND.primary} />
              <Text style={[SC.insightTitle, { color: colors.foreground }]}>28-Day Writing Map</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
              {[{ color: BRAND.success, label: 'Win' }, { color: BRAND.primary, label: 'Deep' }, { color: BRAND.primaryLight, label: 'Written' }, { color: BRAND.danger, label: 'Relapse' }].map(l => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: l.color }} />
                  <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>{l.label}</Text>
                </View>
              ))}
            </View>
            <Heatmap entries={journalEntries} colors={colors} />
          </Reanimated.View>

          {activeProgs.length > 0 && (
            <Reanimated.View entering={FadeInUp.delay(300).springify()}>
              <View style={SC.sectionLabel}>
                <View style={[SC.sectionLine, { backgroundColor: BRAND.primary }]} />
                <Text style={[SC.sectionLabelText, { color: colors.textSecondary }]}>ACTIVE PROGRAM JOURNALS</Text>
              </View>
              <View style={{ gap: 10 }}>
                {activeProgs.map((p: any, idx) => {
                  const progEntries = journalEntries.filter(e => e.programContext?.programId === p.id);
                  return (
                    <Reanimated.View key={p.id} entering={FadeInDown.delay(idx * 80).springify()} style={[SC.progJournalCard, { backgroundColor: colors.surfaceHigh, borderColor: p.accent.primary + '40' }]}>
                      <LinearGradient colors={[p.accent.primary + '12', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                      <View style={[SC.progJournalBar, { backgroundColor: p.accent.primary }]} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <PulsingDot color={p.accent.primary} />
                          <Text style={[SC.progJournalName, { color: p.accent.primary }]} numberOfLines={1}>{p.title}</Text>
                          <View style={[SC.weekBadge, { backgroundColor: p.accent.primary + '20' }]}>
                            <Text style={[SC.weekBadgeText, { color: p.accent.primary }]}>WEEK {p.progProgress?.currentWeek ?? 1}</Text>
                          </View>
                        </View>
                        <Text style={[SC.progJournalStat, { color: colors.textSecondary }]}>{progEntries.length} entries in this program</Text>
                      </View>
                      <Ionicons name="journal-outline" size={20} color={p.accent.primary + '80'} />
                    </Reanimated.View>
                  );
                })}
              </View>
            </Reanimated.View>
          )}

          {Object.keys(tagCounts).length > 0 && (
            <Reanimated.View entering={FadeInUp.delay(400).springify()} style={[SC.insightCard, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="pricetags-outline" size={16} color={BRAND.secondary} />
                <Text style={[SC.insightTitle, { color: colors.foreground }]}>Recurring Themes</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tagId, count]) => {
                  const def = TAG_DEFS.find(t => t.id === tagId);
                  if (!def) return null;
                  return (
                    <View key={tagId} style={[SC.themeChip, { backgroundColor: def.color + '15', borderColor: def.color + '40' }]}>
                      <Text style={{ fontSize: 14 }}>{def.emoji}</Text>
                      <View>
                        <Text style={[SC.themeChipLabel, { color: def.color }]}>{def.label}</Text>
                        <Text style={[SC.themeChipCount, { color: colors.textSecondary }]}>{count}×</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Reanimated.View>
          )}

          {journalEntries.length >= 3 && (
            <Reanimated.View entering={FadeInUp.delay(500).springify()}>
              <LinearGradient colors={[BRAND.primary + '20', BRAND.secondary + '10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[SC.callout, { borderColor: BRAND.primary + '30' }]}>
                <Text style={[SC.calloutText, { color: colors.foreground }]}>
                  {journalStreak >= 7
                    ? `🔥 ${journalStreak}-day streak! Writing daily rewires your self-awareness.`
                    : journalEntries.length >= 20
                    ? `📚 ${journalEntries.length} entries. You're building a real record of your evolution.`
                    : `✍️ ${Math.max(0, 14 - journalEntries.length)} more entries to unlock pattern insights. Keep going.`}
                </Text>
              </LinearGradient>
            </Reanimated.View>
          )}
        </ScrollView>
      )}

      {showCelebration && (
        <CelebrationModal xp={xpToEarn} currentLevel={currentLevel} levelProgress={levelProgress} levelMax={levelMax} onClose={() => setShowCelebration(false)} />
      )}
    </View>
  );
}

const SC = StyleSheet.create({
  root: { flex: 1 },
  heroGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 280, zIndex: 0 },

  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, gap: 12, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  titleLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginBottom: 2 },
  title: { fontSize: 34, fontFamily: 'Inter_800ExtraBold', letterSpacing: -1.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  streakRing: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5 },
  streakActive: { borderColor: '#f59e0b60', backgroundColor: '#f59e0b10', shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 0 }, shadowRadius: 12 },
  streakNum: { fontSize: 14, fontFamily: 'Inter_800ExtraBold' },

  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  levelBadgeText: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', color: '#fff', letterSpacing: 0.5 },

  iconBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  xpBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  xpBarBg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  xpBarFill: { height: 4, borderRadius: 2 },
  xpBarText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },

  progPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginRight: 8 },
  progPillText: { fontSize: 12, fontFamily: 'Inter_700Bold', maxWidth: 140 },
  progPillWeek: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  tabRow: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, gap: 2 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10 },
  tabText: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },

  content: { padding: 20, gap: 16 },

  promptCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', padding: 20, gap: 16 },
  promptText: { fontSize: 26, fontFamily: 'Inter_500Medium', lineHeight: 34, fontStyle: 'italic', letterSpacing: -0.8 },
  promptNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  promptNavBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  promptDots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  promptDot: { height: 6, borderRadius: 3 },

  progBadgeWrap: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  progBadgeGrad: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  progBadgeDot: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  progBadgeName: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1.2 },
  progBadgeSub: { fontSize: 10, fontFamily: 'Inter_500Medium', color: '#808080', marginTop: 1 },

  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  alertText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },

  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionLine: { width: 3, height: 14, borderRadius: 2 },
  sectionLabelText: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', letterSpacing: 2 },

  editorWrap: { borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', shadowOffset: { width: 0, height: 0 }, shadowRadius: 16 },
  editorInput: { padding: 20, fontSize: 17, fontFamily: 'Inter_400Regular', minHeight: 200, lineHeight: 28 },
  editorFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  wordDot: { width: 8, height: 8, borderRadius: 4 },
  wordText: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },

  freeToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  freeToggleText: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },

  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  tagLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  xpPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  xpPreviewText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },

  commitBtn: { height: 62, borderRadius: 18, borderWidth: 1.5, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  commitProg: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  commitText: { fontSize: 15, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1.5 },

  savedWrap: { borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  savedGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', paddingVertical: 18, paddingHorizontal: 24 },
  savedText: { fontSize: 15, fontFamily: 'Inter_800ExtraBold', color: '#fff', letterSpacing: 1, flex: 1 },

  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  xpBadgeText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: '#000' },

  historyCount: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5 },

  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  insightCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14, overflow: 'hidden' },
  insightTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },

  progJournalCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 16, gap: 12 },
  progJournalBar: { width: 3, height: 44, borderRadius: 2 },
  progJournalName: { fontSize: 13, fontFamily: 'Inter_700Bold', flex: 1 },
  progJournalStat: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  weekBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  weekBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },

  themeChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  themeChipLabel: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  themeChipCount: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 1 },

  callout: { padding: 18, borderRadius: 16, borderWidth: 1 },
  calloutText: { fontSize: 15, fontFamily: 'Inter_500Medium', lineHeight: 23 },
});
