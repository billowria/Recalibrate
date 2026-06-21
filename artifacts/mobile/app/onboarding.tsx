import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
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
import { AVAILABLE_PROGRAMS, DEFAULT_METRICS } from '@/constants/program';

const STEPS = ['welcome', 'name', 'reduce', 'build', 'program', 'done'] as const;
type Step = typeof STEPS[number];

const REDUCE_OPTIONS = DEFAULT_METRICS.filter(m => m.category === 'reduce');
const BUILD_OPTIONS = DEFAULT_METRICS.filter(m => m.category === 'build').slice(0, 8);

function ProgressBar({ step, total, color }: { step: number; total: number; color: string }) {
  return (
    <View style={pbStyles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[pbStyles.segment, {
            backgroundColor: i < step ? color : color + '25',
            flex: 1,
          }]}
        />
      ))}
    </View>
  );
}
const pbStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, height: 4, borderRadius: 2, overflow: 'hidden' },
  segment: { borderRadius: 2 },
});

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile, enrollProgram } = useApp();

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [selectedReduce, setSelectedReduce] = useState<string[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<string[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('eight-week-recovery');

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const stepIndex = STEPS.indexOf(step);

  const animateTransition = (next: Step) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const nextStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) animateTransition(STEPS[idx + 1]);
  };

  const prevStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) animateTransition(STEPS[idx - 1]);
  };

  const toggleReduce = (id: string) => {
    setSelectedReduce(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleBuild = (id: string) => {
    setSelectedBuild(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleFinish = async () => {
    await updateProfile({
      name: name.trim(),
      onboardingComplete: true,
      activeProgramIds: [selectedProgram],
      programProgress: {
        [selectedProgram]: {
          currentWeek: 1,
          weekStartDate: new Date().toISOString().split('T')[0],
          completedWeeks: [],
          resetCount: 0,
        },
      },
      selectedBuildMetricIds: selectedBuild,
      selectedReduceMetricIds: selectedReduce,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const prog = AVAILABLE_PROGRAMS.find(p => p.id === selectedProgram);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, {
          paddingTop: topPadding + 20,
          paddingBottom: 60,
        }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step !== 'welcome' && step !== 'done' && (
          <View style={styles.progressSection}>
            <TouchableOpacity onPress={prevStep} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <ProgressBar step={stepIndex} total={STEPS.length - 2} color={colors.primary} />
            <Text style={[styles.stepCount, { color: colors.mutedForeground }]}>
              {stepIndex}/{STEPS.length - 2}
            </Text>
          </View>
        )}

        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>

          {/* ─── WELCOME ─── */}
          {step === 'welcome' && (
            <View style={styles.centeredStep}>
              <View style={[styles.logoWrap, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                <Text style={styles.logoEmoji}>🧭</Text>
              </View>
              <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>Discipline OS</Text>
              <Text style={[styles.welcomeSub, { color: colors.mutedForeground }]}>
                A system for building the person you want to be — backed by behavioral science.
              </Text>
              <View style={styles.pillRow}>
                {['Self-monitoring', 'Habit gating', 'Correlation insights', 'No judgment'].map(p => (
                  <View key={p} style={[styles.pill, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' }]}>
                    <Text style={[styles.pillText, { color: colors.primary }]}>{p}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                onPress={nextStep}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Start setup →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.replace('/(tabs)')} activeOpacity={0.7}>
                <Text style={[styles.skipLink, { color: colors.mutedForeground }]}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── NAME ─── */}
          {step === 'name' && (
            <View style={styles.questionStep}>
              <Text style={[styles.stepEmoji]}>👋</Text>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>What should I call you?</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
                Personalizing your journey increases commitment. This stays on your device only.
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your first name"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                style={[styles.textInput, {
                  backgroundColor: colors.card,
                  borderColor: name ? colors.primary : colors.border,
                  color: colors.foreground,
                  borderRadius: colors.radius,
                }]}
              />
              <TouchableOpacity
                onPress={nextStep}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{name.trim() ? `Continue, ${name} →` : 'Continue →'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── REDUCE ─── */}
          {step === 'reduce' && (
            <View style={styles.questionStep}>
              <Text style={styles.stepEmoji}>📉</Text>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>What do you want to reduce or quit?</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
                Select all that apply. We'll track these and gate your progress on real data — no self-reporting without accountability.
              </Text>
              <View style={styles.optionGrid}>
                {REDUCE_OPTIONS.map(m => {
                  const selected = selectedReduce.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => toggleReduce(m.id)}
                      style={[styles.optionCard, {
                        backgroundColor: selected ? '#ef444415' : colors.card,
                        borderColor: selected ? '#ef4444' : colors.border,
                        borderRadius: colors.radius,
                      }]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionTop}>
                        <Text style={styles.optionEmoji}>{m.emoji ?? '📊'}</Text>
                        {selected && <Ionicons name="checkmark-circle" size={18} color="#ef4444" />}
                      </View>
                      <Text style={[styles.optionName, { color: selected ? '#ef4444' : colors.foreground }]}>
                        {m.isSensitive ? m.name : m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={nextStep}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {selectedReduce.length > 0 ? `Selected ${selectedReduce.length} → Next` : 'Skip this step →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── BUILD ─── */}
          {step === 'build' && (
            <View style={styles.questionStep}>
              <Text style={styles.stepEmoji}>📈</Text>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>What habits do you want to build?</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
                Small daily wins compound. Pick 3–6 habits to start — less is more when you're building consistency.
              </Text>
              <View style={styles.optionGrid}>
                {BUILD_OPTIONS.map(m => {
                  const selected = selectedBuild.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => toggleBuild(m.id)}
                      style={[styles.optionCard, {
                        backgroundColor: selected ? '#22c55e15' : colors.card,
                        borderColor: selected ? '#22c55e' : colors.border,
                        borderRadius: colors.radius,
                      }]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionTop}>
                        <Text style={styles.optionEmoji}>{m.emoji ?? '📊'}</Text>
                        {selected && <Ionicons name="checkmark-circle" size={18} color="#22c55e" />}
                      </View>
                      <Text style={[styles.optionName, { color: selected ? '#22c55e' : colors.foreground }]}>{m.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={nextStep}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {selectedBuild.length > 0 ? `${selectedBuild.length} habits selected → Next` : 'Skip this step →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── PROGRAM ─── */}
          {step === 'program' && (
            <View style={styles.questionStep}>
              <Text style={styles.stepEmoji}>🗺️</Text>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Choose your first program</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
                Programs give your discipline a direction. You can enroll in more later. Week advancement requires real tracking data — no skipping ahead.
              </Text>
              <View style={styles.programList}>
                {AVAILABLE_PROGRAMS.map(p => {
                  const selected = selectedProgram === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { setSelectedProgram(p.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                      style={[styles.programCard, {
                        backgroundColor: selected ? p.color + '12' : colors.card,
                        borderColor: selected ? p.color : colors.border,
                        borderRadius: colors.radius,
                      }]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.programCardTop}>
                        <View style={[styles.programIconWrap, { backgroundColor: p.color + '20' }]}>
                          <Text style={styles.programEmoji}>{p.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.programTitle, { color: selected ? p.color : colors.foreground }]}>{p.title}</Text>
                          <Text style={[styles.programWeeks, { color: colors.mutedForeground }]}>{p.totalWeeks} weeks</Text>
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={22} color={p.color} />}
                      </View>
                      <Text style={[styles.programDesc, { color: colors.mutedForeground }]}>{p.description}</Text>
                      <View style={styles.weekPreviewRow}>
                        {p.weeks.slice(0, 4).map(w => (
                          <View key={w.weekNumber} style={[styles.weekDot, { backgroundColor: selected ? p.color + '40' : colors.border }]}>
                            <Text style={[styles.weekDotNum, { color: selected ? p.color : colors.mutedForeground }]}>{w.weekNumber}</Text>
                          </View>
                        ))}
                        {p.weeks.length > 4 && (
                          <Text style={[styles.weekMore, { color: colors.mutedForeground }]}>+{p.weeks.length - 4}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={nextStep}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Start {prog?.title ?? 'program'} →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── DONE ─── */}
          {step === 'done' && (
            <View style={styles.centeredStep}>
              <View style={[styles.logoWrap, { backgroundColor: '#22c55e15', borderColor: '#22c55e30' }]}>
                <Text style={styles.logoEmoji}>🎯</Text>
              </View>
              <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>
                {name ? `You're set, ${name}!` : "You're all set!"}
              </Text>
              <Text style={[styles.welcomeSub, { color: colors.mutedForeground }]}>
                Your Discipline OS is ready. Remember: the system works when you work it. Log daily, reflect weekly, advance when you've earned it.
              </Text>
              <View style={styles.summaryList}>
                {selectedReduce.length > 0 && (
                  <View style={[styles.summaryRow, { backgroundColor: '#ef444412', borderColor: '#ef444430', borderRadius: 10 }]}>
                    <Ionicons name="trending-down-outline" size={16} color="#ef4444" />
                    <Text style={[styles.summaryText, { color: '#ef4444' }]}>
                      Tracking {selectedReduce.length} thing{selectedReduce.length > 1 ? 's' : ''} to reduce
                    </Text>
                  </View>
                )}
                {selectedBuild.length > 0 && (
                  <View style={[styles.summaryRow, { backgroundColor: '#22c55e12', borderColor: '#22c55e30', borderRadius: 10 }]}>
                    <Ionicons name="trending-up-outline" size={16} color="#22c55e" />
                    <Text style={[styles.summaryText, { color: '#22c55e' }]}>
                      Building {selectedBuild.length} habit{selectedBuild.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {prog && (
                  <View style={[styles.summaryRow, { backgroundColor: prog.color + '12', borderColor: prog.color + '30', borderRadius: 10 }]}>
                    <Text style={styles.summaryEmoji}>{prog.emoji}</Text>
                    <Text style={[styles.summaryText, { color: prog.color }]}>Starting {prog.title}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={handleFinish}
                style={[styles.primaryBtn, { backgroundColor: '#22c55e' }]}
                activeOpacity={0.85}
              >
                <Ionicons name="rocket-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Enter Discipline OS</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 0 },
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  backBtn: { padding: 4 },
  stepCount: { fontSize: 11, fontFamily: 'Inter_600SemiBold', minWidth: 24, textAlign: 'right' },
  stepContainer: { gap: 0 },
  centeredStep: { alignItems: 'center', gap: 20, paddingTop: 40 },
  questionStep: { gap: 20 },
  logoWrap: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  logoEmoji: { fontSize: 44 },
  welcomeTitle: { fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -1, textAlign: 'center' },
  welcomeSub: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 23, textAlign: 'center' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  stepEmoji: { fontSize: 40 },
  stepTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, lineHeight: 32 },
  stepDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  textInput: {
    borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, fontFamily: 'Inter_500Medium',
  },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionCard: { width: '47%', borderWidth: 1.5, padding: 14, gap: 8 },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  optionEmoji: { fontSize: 24 },
  optionName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', lineHeight: 18 },
  programList: { gap: 12 },
  programCard: { borderWidth: 1.5, padding: 14, gap: 10 },
  programCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  programIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  programEmoji: { fontSize: 24 },
  programTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  programWeeks: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  programDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  weekPreviewRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  weekDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  weekDotNum: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  weekMore: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14,
  },
  primaryBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  skipLink: { fontSize: 13, fontFamily: 'Inter_400Regular', paddingVertical: 8 },
  summaryList: { width: '100%', gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1 },
  summaryText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  summaryEmoji: { fontSize: 16 },
});
