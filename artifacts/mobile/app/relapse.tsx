import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
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
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/GlassCard';
import { CommitmentButton } from '@/components/CommitmentButton';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

const CALM_STEPS = [
  { label: 'Breathe in', duration: 4000 },
  { label: 'Hold', duration: 4000 },
  { label: 'Breathe out', duration: 4000 },
];

const TRIGGER_CATEGORIES = [
  { id: 'stress', label: 'Stress / overwhelm', emoji: '😰', description: 'Work, deadlines, pressure' },
  { id: 'boredom', label: 'Boredom', emoji: '😑', description: 'Nothing to do, restless' },
  { id: 'social', label: 'Social situation', emoji: '👥', description: 'Peer pressure, gathering' },
  { id: 'loneliness', label: 'Loneliness', emoji: '😔', description: 'Isolated, disconnected' },
  { id: 'anxiety', label: 'Anxiety', emoji: '😟', description: 'Worry, future uncertainty' },
  { id: 'celebration', label: 'Celebrating', emoji: '🎉', description: 'Happy occasion, reward' },
  { id: 'automatic', label: 'Automatic habit', emoji: '🔄', description: 'Did it without thinking' },
  { id: 'other', label: 'Something else', emoji: '💭', description: 'Unique circumstance' },
];

const NEXT_ACTIONS = [
  'Take a 10-minute walk outside',
  'Call or text someone I trust',
  'Drink a full glass of water and sit quietly',
  'Write in my journal for 5 minutes',
  'Do 20 push-ups or a short workout',
  'Meditate or use a breathing exercise',
  'Make tea and read something inspiring',
];

const COMPASSION_STATEMENTS = [
  'A setback is not a failure. It is data. You are still on track.',
  'Every person rebuilding their life has moments like this. What matters is what comes next.',
  'Awareness is the first act of recovery. You reached out — that takes courage.',
  'Progress is not linear. One step back does not erase the steps forward.',
  'You are not your worst moment. You are the person who chose to reflect on it.',
];

export default function RelapseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { metrics, addRelapseLog } = useApp();

  const [phase, setPhase] = useState<'breathe' | 'compassion' | 'reflect' | 'intention' | 'done'>('breathe');
  const [breathStep, setBreathStep] = useState(0);
  const [breathTimer, setBreathTimer] = useState(4);
  const [selectedMetricId, setSelectedMetricId] = useState('');
  const [triggerCategory, setTriggerCategory] = useState('');
  const [triggerDetail, setTriggerDetail] = useState('');
  const [selectedNextAction, setSelectedNextAction] = useState('');
  const [customNextAction, setCustomNextAction] = useState('');
  const [compassionIdx] = useState(() => Math.floor(Math.random() * COMPASSION_STATEMENTS.length));

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const phaseAnim = useRef(new Animated.Value(0)).current;

  // Reanimated scales for buttons
  const reflectBtnScale = useSharedValue(1);
  const nextBtnScale = useSharedValue(1);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const fadeInPhase = () => {
    phaseAnim.setValue(0);
    Animated.timing(phaseAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const goToPhase = (p: typeof phase) => {
    setPhase(p);
    fadeInPhase();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  useEffect(() => {
    if (phase !== 'breathe') return;
    const step = CALM_STEPS[breathStep % CALM_STEPS.length];
    setBreathTimer(Math.floor(step.duration / 1000));
    if (breathStep % 3 === 0) {
      Animated.timing(scaleAnim, { toValue: 1.35, duration: step.duration, useNativeDriver: true }).start();
    } else if (breathStep % 3 === 2) {
      Animated.timing(scaleAnim, { toValue: 1, duration: step.duration, useNativeDriver: true }).start();
    }
    const countdown = setInterval(() => setBreathTimer(p => Math.max(0, p - 1)), 1000);
    const next = setTimeout(() => {
      clearInterval(countdown);
      if (breathStep >= 5) { goToPhase('compassion'); }
      else setBreathStep(p => p + 1);
    }, step.duration);
    return () => { clearTimeout(next); clearInterval(countdown); };
  }, [breathStep, phase]);

  const handleSubmit = async () => {
    if (!selectedMetricId || !triggerCategory) return;
    const metric = metrics.find(m => m.id === selectedMetricId);
    if (!metric) return;
    const action = customNextAction.trim() || selectedNextAction;
    await addRelapseLog({
      date: new Date().toISOString().split('T')[0],
      metricId: selectedMetricId,
      metricName: metric.name,
      triggerCategory,
      triggerReflection: triggerDetail.trim() || triggerCategory,
      nextAction: action,
      compassionStatement: COMPASSION_STATEMENTS[compassionIdx],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goToPhase('done');
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const canSubmit = !!selectedMetricId && !!triggerCategory && !!(customNextAction.trim() || selectedNextAction);

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      {/* Calm gradient background */}
      <LinearGradient
        colors={colors.gradients.calm}
        style={StyleSheet.absoluteFillObject}
      />

      <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { top: topPadding + 8 }]} activeOpacity={0.7}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* ─── BREATHE ─── */}
      {phase === 'breathe' && (
        <View style={styles.centeredContainer}>
          <Text style={[styles.bigTitle, { color: colors.text }]}>Pause for a moment</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            A setback is data. Not a verdict on who you are.
          </Text>
          
          <View style={styles.breatheRing}>
            <Animated.View style={[styles.breatheOuter, { borderColor: colors.brand.calm + '35', transform: [{ scale: scaleAnim }] }]}>
              {/* Inner glowing circle */}
              <LinearGradient
                colors={colors.gradients.calmAccent}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 999, opacity: 0.15 }]}
              />
              <View style={[styles.breatheInner, { borderColor: colors.brand.calm }]}>
                <Text style={[styles.breatheStep, { color: colors.text }]}>
                  {CALM_STEPS[breathStep % CALM_STEPS.length].label}
                </Text>
                <Text style={[styles.breatheTimer, { color: '#fff' }]}>{breathTimer}</Text>
              </View>
            </Animated.View>
          </View>
          
          <Text style={[styles.breatheHint, { color: colors.textMuted }]}>
            Cycle {Math.floor(breathStep / 3) + 1} of 2
          </Text>
          <TouchableOpacity onPress={() => goToPhase('compassion')} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={[styles.skipText, { color: colors.brand.calm }]}>Skip breathing →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── COMPASSION ─── */}
      {phase === 'compassion' && (
        <Animated.View style={[styles.centeredContainer, { opacity: phaseAnim }]}>
          <GlassCard intensity={30} style={{ width: '100%' }}>
            <View style={styles.compassionCardContent}>
              <Text style={[styles.compassionQuote, { color: '#fff' }]}>
                "{COMPASSION_STATEMENTS[compassionIdx]}"
              </Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.compassionSub, { color: colors.textSecondary }]}>
                The science is clear: self-compassion after a slip predicts better recovery than self-criticism.
              </Text>
            </View>
          </GlassCard>
          
          <TouchableOpacity
            onPressIn={() => { reflectBtnScale.value = withSpring(0.96); }}
            onPressOut={() => { reflectBtnScale.value = withSpring(1); }}
            onPress={() => goToPhase('reflect')}
            activeOpacity={0.88}
            style={{ width: '100%' }}
          >
            <AnimatedReanimated.View style={[{ transform: [{ scale: reflectBtnScale.value }] }]}>
              <LinearGradient
                colors={colors.gradients.calmAccent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>I'm ready to reflect →</Text>
              </LinearGradient>
            </AnimatedReanimated.View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ─── REFLECT ─── */}
      {phase === 'reflect' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.ScrollView
            style={{ opacity: phaseAnim }}
            contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding + 56 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.bigTitle, { color: colors.text }]}>What happened?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>No judgment — just honest data.</Text>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>WHICH HABIT?</Text>
            <View style={styles.chipGrid}>
              {metrics.filter(m => m.category === 'reduce').map(m => {
                const selected = selectedMetricId === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => { setSelectedMetricId(m.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.chip, {
                      backgroundColor: selected ? colors.brand.calm : colors.surface,
                      borderColor: selected ? colors.brand.calm : colors.border,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipEmoji}>{m.emoji ?? '⚠️'}</Text>
                    <Text style={[styles.chipText, { color: selected ? '#fff' : colors.text }]}>
                      {m.isSensitive ? '••••' : m.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>WHAT TRIGGERED IT?</Text>
            <View style={styles.triggerGrid}>
              {TRIGGER_CATEGORIES.map(t => {
                const selected = triggerCategory === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => { setTriggerCategory(t.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.triggerCard, {
                      backgroundColor: selected ? colors.brand.calm + '25' : colors.surface,
                      borderColor: selected ? colors.brand.calm : colors.border,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.triggerEmoji}>{t.emoji}</Text>
                    <Text style={[styles.triggerLabel, { color: selected ? '#fff' : colors.text }]}>{t.label}</Text>
                    <Text style={[styles.triggerDesc, { color: colors.textSecondary }]}>{t.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {triggerCategory && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TELL ME MORE (optional)</Text>
                <TextInput
                  value={triggerDetail}
                  onChangeText={setTriggerDetail}
                  placeholder={`What specifically was happening when you ${triggerCategory === 'stress' ? 'felt overwhelmed' : 'slipped'}?`}
                  placeholderTextColor={colors.textDim}
                  multiline
                  style={[styles.textArea, { borderColor: colors.border, backgroundColor: colors.surface, color: '#fff' }]}
                  selectionColor={colors.brand.calm}
                />
              </>
            )}

            <TouchableOpacity
              onPressIn={() => { nextBtnScale.value = withSpring(0.97); }}
              onPressOut={() => { nextBtnScale.value = withSpring(1); }}
              onPress={() => { if (selectedMetricId && triggerCategory) goToPhase('intention'); }}
              disabled={!selectedMetricId || !triggerCategory}
              style={{ width: '100%', marginTop: 10, opacity: (!selectedMetricId || !triggerCategory) ? 0.45 : 1 }}
              activeOpacity={0.88}
            >
              <AnimatedReanimated.View style={[{ transform: [{ scale: nextBtnScale.value }] }]}>
                <LinearGradient
                  colors={colors.gradients.calmAccent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>Next: Set your intention →</Text>
                </LinearGradient>
              </AnimatedReanimated.View>
            </TouchableOpacity>
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ─── INTENTION ─── */}
      {phase === 'intention' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.ScrollView
            style={{ opacity: phaseAnim }}
            contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding + 56 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.bigTitle, { color: colors.text }]}>One concrete next step</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Implementation intentions increase follow-through by 2–3×. What will you do right now?
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CHOOSE YOUR ACTION</Text>
            <View style={styles.actionList}>
              {NEXT_ACTIONS.map(action => {
                const selected = selectedNextAction === action && !customNextAction;
                return (
                  <TouchableOpacity
                    key={action}
                    onPress={() => {
                      setSelectedNextAction(action);
                      setCustomNextAction('');
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[styles.actionRow, {
                      backgroundColor: selected ? colors.brand.calm + '20' : colors.surface,
                      borderColor: selected ? colors.brand.calm : colors.border,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={selected ? colors.brand.calm : colors.textSecondary}
                    />
                    <Text style={[styles.actionText, { color: colors.text }]}>{action}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>OR WRITE YOUR OWN</Text>
            <TextInput
              value={customNextAction}
              onChangeText={t => { setCustomNextAction(t); setSelectedNextAction(''); }}
              placeholder="Something specific, doable in the next hour..."
              placeholderTextColor={colors.textDim}
              multiline
              style={[styles.textArea, { borderColor: colors.border, backgroundColor: colors.surface, color: '#fff' }]}
              selectionColor={colors.brand.calm}
            />

            <View style={[styles.neverMissCard, { borderColor: colors.brand.calm + '35', backgroundColor: colors.surface }]}>
              <Ionicons name="infinite-outline" size={18} color={colors.brand.calm} />
              <Text style={[styles.neverMissText, { color: colors.textSecondary }]}>
                Never miss twice. One day reset. Your progress is preserved. You're still on this.
              </Text>
            </View>

            <CommitmentButton
              onComplete={handleSubmit}
              disabled={!canSubmit}
              color={colors.brand.calm || '#3b82f6'}
              label="Hold to Log Setback & Reset"
              completedLabel="Setback Logged!"
              icon="shield-checkmark"
              duration={2000}
            />
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ─── DONE ─── */}
      {phase === 'done' && (
        <Animated.View style={[styles.centeredContainer, { opacity: phaseAnim }]}>
          <View style={[styles.doneIconWrap, { backgroundColor: colors.brand.calm + '20', borderColor: colors.brand.calm + '40', borderWidth: 1 }]}>
            <Ionicons name="shield-checkmark" size={56} color={colors.brand.calm} />
          </View>
          <Text style={[styles.bigTitle, { color: colors.text }]}>Logged.</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Awareness is the first act of recovery.{'\n'}Never miss twice.
          </Text>
          
          <GlassCard intensity={30} style={{ width: '100%' }}>
            <View style={styles.compassionCardContent}>
              <Text style={[styles.compassionQuote, { color: colors.text }]}>
                You have the data. You have a plan. Now execute the next step.
              </Text>
            </View>
          </GlassCard>
          
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.88} style={{ width: '100%' }}>
            <LinearGradient
              colors={colors.gradients.calmAccent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  closeBtn: { position: 'absolute', right: 20, zIndex: 10, padding: 8 },
  centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 20 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 60, gap: 14 },
  bigTitle: { fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21 },
  breatheRing: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  breatheOuter: { width: 170, height: 170, borderRadius: 85, borderWidth: 2, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  breatheInner: { width: 124, height: 124, borderRadius: 62, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(6, 13, 31, 0.6)' },
  breatheStep: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 1 },
  breatheTimer: { fontSize: 34, fontFamily: 'Inter_700Bold' },
  breatheHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  skipBtn: { marginTop: 4, paddingVertical: 8 },
  skipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  compassionCardContent: { padding: 20, gap: 12 },
  compassionQuote: { fontSize: 16, fontFamily: 'Inter_500Medium', lineHeight: 24, textAlign: 'center', fontStyle: 'italic' },
  compassionSub: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, textAlign: 'center' },
  divider: { height: 1, width: '100%' },
  primaryBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 16, borderRadius: 14 },
  primaryBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  fieldLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2.5, marginTop: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  triggerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  triggerCard: { width: '48%', borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  triggerEmoji: { fontSize: 22 },
  triggerLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  triggerDesc: { fontSize: 10, fontFamily: 'Inter_400Regular', lineHeight: 14 },
  textArea: {
    borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14,
    fontFamily: 'Inter_400Regular', minHeight: 80, textAlignVertical: 'top', lineHeight: 21,
  },
  actionList: { gap: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  actionText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  neverMissCard: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  neverMissText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  doneIconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
