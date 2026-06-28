import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
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
import { GlassCard } from '@/components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

type CardType = 'momentum' | 'slip' | 'score' | 'celebrate' | 'insight' | 'journal' | 'focus' | 'program' | 'motivation' | 'reduce';

interface CoachCard {
  id: string;
  type: CardType;
  priority: number;
  title: string;
  body: string;
  cta?: string;
  ctaAction?: () => void;
  emoji: string;
  accentColor: string;
}

const TYPE_LABELS: Record<CardType, string> = {
  momentum: 'MOMENTUM',
  slip: 'RECOVERY',
  score: 'TREND',
  celebrate: 'MILESTONE',
  insight: 'INSIGHT',
  journal: 'REFLECTION',
  focus: 'DEEP WORK',
  program: 'PROGRAM',
  motivation: 'FOUNDATION',
  reduce: 'PROGRESS',
};

const getCardTypeColor = (type: CardType, colors: any): string => {
  const TYPE_COLORS: Record<CardType, string> = {
    momentum: colors.brand.primary,
    slip: colors.brand.danger,
    score: colors.brand.warning,
    celebrate: colors.brand.success,
    insight: colors.brand.primaryLight,
    journal: colors.brand.primary,
    focus: colors.brand.secondary,
    program: colors.brand.warning,
    motivation: colors.textSecondary,
    reduce: colors.brand.success,
  };
  return TYPE_COLORS[type] ?? colors.brand.primary;
};

// ─── Pre-seeded Coach Questions ───────────────────────────────────────────────
const COACH_QAS = [
  {
    q: 'Why am I stuck at the same score every week?',
    a: 'Plateaus usually mean you\'ve hit your current system\'s ceiling. Look at which habit you\'re most inconsistent on — that\'s your constraint. One habit improved from 60% → 90% consistency will move your score more than trying to fix everything at once.',
  },
  {
    q: 'I slipped up. Should I restart everything?',
    a: 'Absolutely not. Research shows "all-or-nothing" thinking after a slip causes more harm than the slip itself. The 24 hours after a relapse are what define your trajectory — not the relapse. Log it, reflect in your journal, and do one positive action today.',
  },
  {
    q: 'How long until I stop feeling urges?',
    a: 'Neurological habit pathways don\'t disappear — they get weaker with disuse. Most people report a significant reduction in urge intensity around weeks 6–8 of consistent tracking. Your consistency data is the best predictor: look at your 30-day trend, not the daily noise.',
  },
];

// ─── Card Engine ──────────────────────────────────────────────────────────────
function buildCoachCards(data: {
  currentStreak: number;
  highestStreak: number;
  relapseLogs: any[];
  disciplineScore: number;
  journalEntries: any[];
  focusMinutesToday: number;
  dailyLogs: any[];
  profile: any;
  availablePrograms: any[];
  correlationInsights: any[];
  today: string;
}, colors: any): CoachCard[] {
  const cards: CoachCard[] = [];
  const { currentStreak, highestStreak, relapseLogs, disciplineScore, journalEntries,
    focusMinutesToday, dailyLogs, profile, availablePrograms, correlationInsights, today } = data;

  // ── SLIP RECOVERY (highest priority) ─────────────────────────────────────
  const recentSlip = relapseLogs.filter(r => {
    const diffMs = new Date(today).getTime() - new Date(r.date).getTime();
    return diffMs <= 3 * 86400000;
  });
  if (recentSlip.length > 0) {
    const slip = recentSlip[0];
    const slipDate = new Date(slip.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    cards.push({
      id: 'slip-recovery',
      type: 'slip',
      priority: 1,
      emoji: '🧭',
      title: 'You logged a slip. That takes honesty.',
      body: `You recorded a setback on ${slipDate}. The research is clear: what you do in the next 24 hours matters far more than the slip itself. One positive action resets the trajectory.`,
      cta: 'Log today\'s habits',
      accentColor: getCardTypeColor('slip', colors),
    });
  }

  // ── MOMENTUM / STREAK ─────────────────────────────────────────────────────
  if (currentStreak >= 7) {
    cards.push({
      id: 'momentum-streak',
      type: 'momentum',
      priority: 2,
      emoji: '🔥',
      title: `${currentStreak} days straight. Don't negotiate with today.`,
      body: currentStreak >= 14
        ? `${currentStreak} days is when neural pathways start to consolidate. The identity is forming — not just the habit. Protect this streak like an asset.`
        : `7 days is the first threshold where the habit starts to feel less effortful. You're in the window. Keep the chain unbroken.`,
      accentColor: getCardTypeColor('momentum', colors),
    });
  } else if (currentStreak === 0 && highestStreak > 0) {
    cards.push({
      id: 'rebuild-streak',
      type: 'motivation',
      priority: 3,
      emoji: '⚡',
      title: 'Your best streak was ' + highestStreak + ' days. You\'ve done it before.',
      body: 'You know exactly what it feels like to be in the zone. The capability is already there — it just needs to be reactivated. Today is day 1 of the next run.',
      accentColor: getCardTypeColor('motivation', colors),
    });
  }

  // ── SCORE TREND ───────────────────────────────────────────────────────────
  const last3Scores: number[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const logs = dailyLogs.filter((l: any) => l.date === ds);
    if (logs.length > 0) last3Scores.push(logs.length);
  }
  if (last3Scores.length === 3 && last3Scores[0] < last3Scores[2]) {
    cards.push({
      id: 'score-dropping',
      type: 'score',
      priority: 4,
      emoji: '📉',
      title: 'Logging activity dropped 3 days in a row.',
      body: 'This is the earliest warning signal. It usually isn\'t willpower — it\'s environment. What changed 3 days ago? Adjust one variable in your environment today.',
      accentColor: getCardTypeColor('score', colors),
    });
  }

  // ── CELEBRATE ─────────────────────────────────────────────────────────────
  if (disciplineScore >= 90) {
    cards.push({
      id: 'perfect-score',
      type: 'celebrate',
      priority: 5,
      emoji: '🏆',
      title: 'Excellent score today. That\'s rare.',
      body: 'A score above 90 means you executed across all dimensions — build habits, reduce habits, and monitoring. This is what mastery looks like in practice. Document what made today work.',
      accentColor: getCardTypeColor('celebrate', colors),
    });
  }

  // ── CORRELATION INSIGHT ───────────────────────────────────────────────────
  if (correlationInsights.length > 0) {
    const insight = correlationInsights[0];
    cards.push({
      id: `insight-${insight.metric1}`,
      type: 'insight',
      priority: 6,
      emoji: '🔬',
      title: 'Data pattern detected in your logs.',
      body: insight.insight,
      accentColor: getCardTypeColor('insight', colors),
    });
  }

  // ── JOURNAL GAP ───────────────────────────────────────────────────────────
  const lastJournal = [...journalEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
  const journalGapDays = lastJournal
    ? Math.floor((new Date(today).getTime() - new Date(lastJournal.date + 'T12:00:00').getTime()) / 86400000)
    : 999;
  if (journalGapDays >= 3) {
    cards.push({
      id: 'journal-gap',
      type: 'journal',
      priority: 7,
      emoji: '📝',
      title: `${journalGapDays} days without a reflection.`,
      body: 'Journaling breaks the feedback loop. Without reflection, you repeat patterns without realising it. You don\'t need to write much — even 3 sentences creates the metacognitive shift.',
      cta: 'Write today\'s entry',
      accentColor: getCardTypeColor('journal', colors),
    });
  }

  // ── FOCUS GAP ─────────────────────────────────────────────────────────────
  if (focusMinutesToday === 0) {
    cards.push({
      id: 'focus-today',
      type: 'focus',
      priority: 8,
      emoji: '🎯',
      title: 'No deep work session logged today.',
      body: 'Discipline without focus is noise. Your habits build the foundation — but focused execution moves you forward. Even a 25-minute session compounds over 30 days.',
      cta: 'Start a session',
      accentColor: getCardTypeColor('focus', colors),
    });
  }

  // ── PROGRAM PACING ────────────────────────────────────────────────────────
  if (profile.activeProgramIds?.length > 0) {
    const programId = profile.activeProgramIds[0];
    const prog = availablePrograms.find((p: any) => p.id === programId);
    const progress = profile.programProgress?.[programId];
    if (prog && progress) {
      const weekStart = new Date(progress.weekStartDate + 'T12:00:00');
      const daysSinceStart = Math.floor((new Date(today).getTime() - weekStart.getTime()) / 86400000);
      if (daysSinceStart <= 2) {
        cards.push({
          id: 'program-new-week',
          type: 'program',
          priority: 9,
          emoji: prog.emoji ?? '📋',
          title: `Week ${progress.currentWeek} of ${prog.title} just started.`,
          body: `You're ${daysSinceStart + 1} day${daysSinceStart > 0 ? 's' : ''} into Week ${progress.currentWeek}. The first 3 days set the tone. Check your protocol tasks and lock in the habit pattern for this week.`,
          accentColor: prog.color ?? getCardTypeColor('program', colors),
        });
      }
    }
  }

  // ── MOTIVATION (always show at least one) ─────────────────────────────────
  const totalDays = new Set(dailyLogs.map((l: any) => l.date)).size;
  if (totalDays <= 7 || cards.length < 2) {
    cards.push({
      id: 'motivation-foundation',
      type: 'motivation',
      priority: 10,
      emoji: '🧱',
      title: 'Behavior change is a systems problem.',
      body: totalDays <= 7
        ? 'Not a willpower problem. You\'re in the foundation phase — the first 2 weeks are about installing the system, not measuring results. Show up. Log. Repeat.'
        : `${totalDays} days of data. You're building a feedback loop that most people never create. Today is the day to collect mapping parameters.`,
      accentColor: getCardTypeColor('motivation', colors),
    });
  }

  return cards.sort((a, b) => a.priority - b.priority);
}

// ─── Card Component View ───────────────────────────────────────────────────────
function CoachCardView({ card, index, colors }: { card: CoachCard; index: number; colors: any }) {
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={() => {
        setExpanded(e => !e);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      style={{ marginBottom: 10 }}
    >
      <AnimatedReanimated.View
        style={[
          ccStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: card.accentColor + '30',
            borderWidth: 1,
            borderRadius: 18,
          },
          animatedStyle
        ]}
      >
        {/* Glow overlay */}
        <View style={[ccStyles.cardGlow, { backgroundColor: card.accentColor + '08' }]} />

        <View style={ccStyles.cardTop}>
          <View style={[ccStyles.emojiWrap, { backgroundColor: card.accentColor + '15' }]}>
            <Text style={{ fontSize: 22 }}>{card.emoji}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[ccStyles.typeBadge, { backgroundColor: card.accentColor + '20' }]}>
              <Text style={[ccStyles.typeBadgeText, { color: card.accentColor }]}>
                {TYPE_LABELS[card.type]}
              </Text>
            </View>
            <Text style={[ccStyles.title, { color: colors.text }]}>{card.title}</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </View>
        
        {expanded && (
          <AnimatedReanimated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={ccStyles.expanded}
          >
            <View style={[ccStyles.divider, { backgroundColor: colors.border }]} />
            <Text style={[ccStyles.body, { color: colors.textSecondary }]}>{card.body}</Text>
            {card.cta && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (card.cta?.includes('habit')) router.push('/(tabs)/track');
                  else if (card.cta?.includes('entry')) router.push('/(tabs)/journal');
                  else if (card.cta?.includes('session')) router.push('/pomodoro');
                }}
                activeOpacity={0.75}
              >
                <View style={[ccStyles.ctaRow, { backgroundColor: card.accentColor + '10', borderColor: card.accentColor + '20' }]}>
                  <Ionicons name="arrow-forward-circle" size={16} color={card.accentColor} />
                  <Text style={[ccStyles.ctaText, { color: card.accentColor }]}>{card.cta}</Text>
                </View>
              </TouchableOpacity>
            )}
          </AnimatedReanimated.View>
        )}
      </AnimatedReanimated.View>
    </Pressable>
  );
}

const ccStyles = StyleSheet.create({
  card: { padding: 14, borderWidth: 1, position: 'relative', overflow: 'hidden' },
  cardGlow: { ...StyleSheet.absoluteFillObject },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, zIndex: 2 },
  emojiWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  title: { fontSize: 14, fontFamily: 'Inter_700Bold', lineHeight: 20 },
  expanded: { gap: 12, marginTop: 10, zIndex: 2 },
  divider: { height: 1, marginVertical: 4 },
  body: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  ctaText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});

// ─── Main Screen Component ─────────────────────────────────────────────────────
export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    currentStreak, highestStreak, relapseLogs, disciplineScore,
    journalEntries, focusMinutesToday, dailyLogs, profile,
    availablePrograms, correlationInsights,
  } = useApp();
  
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const today = new Date().toISOString().split('T')[0];

  const [openQA, setOpenQA] = useState<number | null>(null);

  const cards = useMemo(() => buildCoachCards({
    currentStreak, highestStreak, relapseLogs, disciplineScore,
    journalEntries, focusMinutesToday, dailyLogs, profile,
    availablePrograms, correlationInsights, today,
  }, colors), [currentStreak, highestStreak, relapseLogs, disciplineScore,
    journalEntries, focusMinutesToday, dailyLogs, profile,
    availablePrograms, correlationInsights, today, colors]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const name = profile.name?.split(' ')[0] || 'there';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Decorative Blob */}
      <View style={styles.blurBlobContainer}>
        <LinearGradient
          colors={[colors.brand.primaryGlow, 'transparent']}
          style={styles.blurBlob}
        />
      </View>

      {/* Dynamic Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={[styles.backBtn, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AI Coach</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, {
          paddingBottom: Platform.OS === 'web' ? 120 : 60,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach Greeting Avatar header */}
        <GlassCard intensity={30} style={{ marginBottom: 12 }}>
          <View style={styles.avatarCardContent}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.brand.primaryGlowSoft, borderColor: colors.brand.primary + '30', borderWidth: 1 }]}>
              <Text style={{ fontSize: 32 }}>🧠</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.greeting, { color: colors.text }]}>
                {greeting}, {name}.
              </Text>
              <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
                {cards.length} behavior audits loaded
              </Text>
            </View>
            <View style={[styles.streakPill, { backgroundColor: currentStreak > 0 ? colors.brand.warning + '20' : colors.surfaceHigh }]}>
              <Text style={{ fontSize: 14 }}>🔥</Text>
              <Text style={[styles.streakPillText, { color: currentStreak > 0 ? colors.brand.warning : colors.textSecondary }]}>
                {currentStreak}d
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Coaching section */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TODAY'S BEHAVIOR AUDITS</Text>
        {cards.map((card, i) => (
          <CoachCardView key={card.id} card={card} index={i} colors={colors} />
        ))}

        {/* AMA Q&A Accordion */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>BEHAVIORAL INQUIRY</Text>
        <GlassCard intensity={25}>
          <View style={styles.qaCardContent}>
            <Text style={[styles.qaIntro, { color: colors.textSecondary }]}>
              Select a behavioral science inquiry below for a structural explanation.
            </Text>
            {COACH_QAS.map((qa, i) => (
              <View key={i}>
                {i > 0 && <View style={[styles.qaDivider, { backgroundColor: colors.border }]} />}
                <TouchableOpacity
                  onPress={() => {
                    setOpenQA(openQA === i ? null : i);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                  style={styles.qaRow}
                >
                  <Ionicons
                    name={openQA === i ? 'chevron-up-circle' : 'chevron-down-circle-outline'}
                    size={20}
                    color={colors.brand.primary}
                  />
                  <Text style={[styles.qaQuestion, { color: colors.text }]}>{qa.q}</Text>
                </TouchableOpacity>
                {openQA === i && (
                  <AnimatedReanimated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={[styles.qaAnswer, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}
                  >
                    <Text style={[styles.qaAnswerText, { color: colors.textSecondary }]}>{qa.a}</Text>
                  </AnimatedReanimated.View>
                )}
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Offline notice footer */}
        <View style={[styles.footer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            All diagnostics are generated offline using local behavior metrics. No internet required. exportable anytime.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12, paddingTop: 12 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },

  // Background radial blur
  blurBlobContainer: {
    position: 'absolute',
    top: -150,
    left: -50,
    right: -50,
    height: 400,
    zIndex: -1,
  },
  blurBlob: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },

  avatarCardContent: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
  },
  avatarCircle: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  greeting: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  greetingSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  streakPillText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  sectionLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginTop: 4, paddingLeft: 2 },
  
  qaCardContent: { padding: 16 },
  qaIntro: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, marginBottom: 12 },
  qaDivider: { height: 1, marginVertical: 4 },
  qaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12 },
  qaQuestion: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1, lineHeight: 20 },
  qaAnswer: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, marginTop: 4 },
  qaAnswerText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  footer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
    marginTop: 8,
  },
  footerText: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16, flex: 1 },
});
