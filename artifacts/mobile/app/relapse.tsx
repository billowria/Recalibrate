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
      Animated.timing(scaleAnim, { toValue: 1.45, duration: step.duration, useNativeDriver: true }).start();
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
  const bgColor = '#060D1F';
  const accentBlue = '#3B82F6';
  const softBlue = '#93C5FD';
  const cardBg = '#0D1829';

  const canSubmit = !!selectedMetricId && !!triggerCategory && !!(customNextAction.trim() || selectedNextAction);

  return (
    <Animated.View style={[styles.root, { backgroundColor: bgColor, opacity: fadeAnim }]}>
      <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { top: topPadding + 8 }]} activeOpacity={0.7}>
        <Ionicons name="close" size={24} color={softBlue + '80'} />
      </TouchableOpacity>

      {/* ─── BREATHE ─── */}
      {phase === 'breathe' && (
        <View style={styles.centeredContainer}>
          <Text style={[styles.bigTitle, { color: softBlue }]}>Pause for a moment</Text>
          <Text style={[styles.subtitle, { color: softBlue + 'AA' }]}>
            A setback is data. Not a verdict on who you are.
          </Text>
          <View style={styles.breatheRing}>
            <Animated.View style={[styles.breatheOuter, { borderColor: accentBlue + '35', transform: [{ scale: scaleAnim }] }]}>
              <View style={[styles.breatheInner, { borderColor: accentBlue }]}>
                <Text style={[styles.breatheStep, { color: softBlue }]}>
                  {CALM_STEPS[breathStep % CALM_STEPS.length].label}
                </Text>
                <Text style={[styles.breatheTimer, { color: '#fff' }]}>{breathTimer}</Text>
              </View>
            </Animated.View>
          </View>
          <Text style={[styles.breatheHint, { color: softBlue + '60' }]}>
            Cycle {Math.floor(breathStep / 3) + 1} of 2
          </Text>
          <TouchableOpacity onPress={() => goToPhase('compassion')} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={[styles.skipText, { color: softBlue + '60' }]}>Skip breathing →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── COMPASSION ─── */}
      {phase === 'compassion' && (
        <Animated.View style={[styles.centeredContainer, { opacity: phaseAnim }]}>
          <View style={[styles.compassionCard, { backgroundColor: cardBg, borderColor: accentBlue + '30' }]}>
            <Text style={[styles.compassionQuote, { color: '#fff' }]}>
              "{COMPASSION_STATEMENTS[compassionIdx]}"
            </Text>
            <View style={[styles.divider, { backgroundColor: accentBlue + '30' }]} />
            <Text style={[styles.compassionSub, { color: softBlue + '80' }]}>
              The science is clear: self-compassion after a slip predicts better recovery than self-criticism.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => goToPhase('reflect')}
            style={[styles.primaryBtn, { backgroundColor: accentBlue }]}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>I'm ready to reflect →</Text>
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
            <Text style={[styles.bigTitle, { color: softBlue }]}>What happened?</Text>
            <Text style={[styles.subtitle, { color: softBlue + 'AA' }]}>No judgment — just honest data.</Text>

            <Text style={[styles.fieldLabel, { color: softBlue + '70' }]}>WHICH HABIT?</Text>
            <View style={styles.chipGrid}>
              {metrics.filter(m => m.category === 'reduce').map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => { setSelectedMetricId(m.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.chip, {
                    backgroundColor: selectedMetricId === m.id ? accentBlue : accentBlue + '15',
                    borderColor: selectedMetricId === m.id ? accentBlue : accentBlue + '30',
                  }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipEmoji}>{m.emoji ?? '📊'}</Text>
                  <Text style={[styles.chipText, { color: selectedMetricId === m.id ? '#fff' : softBlue }]}>
                    {m.isSensitive ? '••••' : m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: softBlue + '70' }]}>WHAT TRIGGERED IT?</Text>
            <View style={styles.triggerGrid}>
              {TRIGGER_CATEGORIES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => { setTriggerCategory(t.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.triggerCard, {
                    backgroundColor: triggerCategory === t.id ? accentBlue + '25' : cardBg,
                    borderColor: triggerCategory === t.id ? accentBlue : accentBlue + '25',
                  }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.triggerEmoji}>{t.emoji}</Text>
                  <Text style={[styles.triggerLabel, { color: triggerCategory === t.id ? '#fff' : softBlue }]}>{t.label}</Text>
                  <Text style={[styles.triggerDesc, { color: softBlue + '60' }]}>{t.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {triggerCategory && (
              <>
                <Text style={[styles.fieldLabel, { color: softBlue + '70' }]}>TELL ME MORE (optional)</Text>
                <TextInput
                  value={triggerDetail}
                  onChangeText={setTriggerDetail}
                  placeholder={`What specifically was happening when you ${triggerCategory === 'stress' ? 'felt overwhelmed' : 'slipped'}?`}
                  placeholderTextColor={softBlue + '40'}
                  multiline
                  style={[styles.textArea, { borderColor: accentBlue + '35', color: '#fff' }]}
                />
              </>
            )}

            <TouchableOpacity
              onPress={() => { if (selectedMetricId && triggerCategory) goToPhase('intention'); }}
              disabled={!selectedMetricId || !triggerCategory}
              style={[styles.primaryBtn, {
                backgroundColor: accentBlue,
                opacity: (!selectedMetricId || !triggerCategory) ? 0.35 : 1,
              }]}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Next: Set your intention →</Text>
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
            <Text style={[styles.bigTitle, { color: softBlue }]}>One concrete next step</Text>
            <Text style={[styles.subtitle, { color: softBlue + 'AA' }]}>
              Implementation intentions increase follow-through by 2–3×. What will you do right now?
            </Text>

            <Text style={[styles.fieldLabel, { color: softBlue + '70' }]}>CHOOSE OR TYPE YOUR ACTION</Text>
            <View style={styles.actionList}>
              {NEXT_ACTIONS.map(action => (
                <TouchableOpacity
                  key={action}
                  onPress={() => {
                    setSelectedNextAction(action);
                    setCustomNextAction('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.actionRow, {
                    backgroundColor: selectedNextAction === action && !customNextAction ? accentBlue + '20' : cardBg,
                    borderColor: selectedNextAction === action && !customNextAction ? accentBlue : accentBlue + '25',
                  }]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={selectedNextAction === action && !customNextAction ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={selectedNextAction === action && !customNextAction ? accentBlue : softBlue + '50'}
                  />
                  <Text style={[styles.actionText, { color: softBlue }]}>{action}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: softBlue + '70' }]}>OR WRITE YOUR OWN</Text>
            <TextInput
              value={customNextAction}
              onChangeText={t => { setCustomNextAction(t); setSelectedNextAction(''); }}
              placeholder="Something specific, doable in the next hour..."
              placeholderTextColor={softBlue + '40'}
              multiline
              style={[styles.textArea, { borderColor: accentBlue + '35', color: '#fff' }]}
            />

            <View style={[styles.neverMissCard, { borderColor: accentBlue + '35', backgroundColor: cardBg }]}>
              <Ionicons name="infinite-outline" size={18} color={accentBlue} />
              <Text style={[styles.neverMissText, { color: softBlue + 'BB' }]}>
                Never miss twice. One day reset. Your progress is preserved. You're still on this.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[styles.primaryBtn, { backgroundColor: accentBlue, opacity: canSubmit ? 1 : 0.35 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Log setback & keep going</Text>
            </TouchableOpacity>
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ─── DONE ─── */}
      {phase === 'done' && (
        <Animated.View style={[styles.centeredContainer, { opacity: phaseAnim }]}>
          <View style={[styles.doneIconWrap, { backgroundColor: accentBlue + '20' }]}>
            <Ionicons name="shield-checkmark" size={56} color={accentBlue} />
          </View>
          <Text style={[styles.bigTitle, { color: softBlue }]}>Logged.</Text>
          <Text style={[styles.subtitle, { color: softBlue + '90' }]}>
            Awareness is the first act of recovery.{'\n'}Never miss twice.
          </Text>
          <View style={[styles.compassionCard, { backgroundColor: cardBg, borderColor: accentBlue + '25' }]}>
            <Text style={[styles.compassionQuote, { color: softBlue + 'CC' }]}>
              You have the data. You have a plan. Now execute the next step.
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={[styles.primaryBtn, { backgroundColor: accentBlue }]} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Continue →</Text>
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
  breatheRing: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  breatheOuter: { width: 170, height: 170, borderRadius: 85, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  breatheInner: { width: 124, height: 124, borderRadius: 62, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 6 },
  breatheStep: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 1 },
  breatheTimer: { fontSize: 34, fontFamily: 'Inter_700Bold' },
  breatheHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  skipBtn: { marginTop: 4, paddingVertical: 8 },
  skipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  compassionCard: {
    borderWidth: 1, borderRadius: 16, padding: 20, gap: 12, width: '100%',
  },
  compassionQuote: { fontSize: 16, fontFamily: 'Inter_500Medium', lineHeight: 24, textAlign: 'center', fontStyle: 'italic' },
  compassionSub: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, textAlign: 'center' },
  divider: { height: 1, width: '100%' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 15, borderRadius: 14 },
  primaryBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  fieldLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2.5, marginTop: 6 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  triggerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  triggerCard: { width: '48%', borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  triggerEmoji: { fontSize: 22 },
  triggerLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  triggerDesc: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  textArea: {
    borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14,
    fontFamily: 'Inter_400Regular', minHeight: 80, textAlignVertical: 'top', lineHeight: 21,
  },
  actionList: { gap: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  actionText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  neverMissCard: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  neverMissText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  doneIconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
});
