import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
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
import { AVAILABLE_PROGRAMS, DEFAULT_METRICS } from '@/constants/program';

const { width: SCREEN_W } = Dimensions.get('window');

const C = {
  bg: '#050508',
  surface: '#0a0a12',
  surfaceHigh: '#10101e',
  border: '#1c1c2e',
  borderFocus: '#5B5EFF',
  accent: '#5B5EFF',
  text: '#F0F0FF',
  textMuted: '#5a5a7a',
  textDim: '#32324a',
  error: '#FF4560',
  success: '#00D68F',
  reduce: '#FF4560',
  build: '#00D68F',
};

const STEPS = ['welcome', 'name', 'reduce', 'build', 'routine', 'program', 'done'] as const;
type Step = typeof STEPS[number];

const REDUCE_OPTIONS = DEFAULT_METRICS.filter(m => m.category === 'reduce');
const BUILD_OPTIONS = DEFAULT_METRICS.filter(m => m.category === 'build').slice(0, 8);

// ─── Custom Liquid Progress Bar ───────────────────────────────────────────────
function LiquidProgressBar({ stepIndex, totalSteps }: { stepIndex: number; totalSteps: number }) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: stepIndex / (totalSteps - 1),
      friction: 8,
      tension: 60,
      useNativeDriver: false, // Animating width
    }).start();
  }, [stepIndex]);

  const width = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={pbStyles.container}>
      <Animated.View style={[pbStyles.fill, { width }]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  container: { flex: 1, height: 6, backgroundColor: C.surfaceHigh, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
});

// ─── Time Adjuster (Routine Step) ─────────────────────────────────────────────
function TimeAdjuster({ label, time, setTime, icon }: { label: string, time: string, setTime: (t: string) => void, icon: any }) {
  const [h, m] = time.split(':').map(Number);

  const updateTime = (dh: number, dm: number) => {
    Haptics.selectionAsync();
    let newH = h + dh;
    let newM = m + dm;
    if (newM >= 60) { newH += 1; newM -= 60; }
    if (newM < 0) { newH -= 1; newM += 60; }
    if (newH >= 24) newH -= 24;
    if (newH < 0) newH += 24;
    setTime(`${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
  };

  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;

  return (
    <View style={timeStyles.card}>
      <View style={timeStyles.header}>
        <View style={timeStyles.iconWrap}>
          <Ionicons name={icon} size={18} color={C.accent} />
        </View>
        <Text style={timeStyles.label}>{label}</Text>
      </View>
      <View style={timeStyles.controls}>
        <TouchableOpacity style={timeStyles.btn} onPress={() => updateTime(0, -15)} activeOpacity={0.6}>
          <Ionicons name="remove" size={24} color={C.textMuted} />
        </TouchableOpacity>
        <View style={timeStyles.timeDisplay}>
          <Text style={timeStyles.timeText}>{displayH}:{m.toString().padStart(2, '0')}</Text>
          <Text style={timeStyles.ampm}>{ampm}</Text>
        </View>
        <TouchableOpacity style={timeStyles.btn} onPress={() => updateTime(0, 15)} activeOpacity={0.6}>
          <Ionicons name="add" size={24} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const timeStyles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent + '15', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: C.text },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surfaceHigh, borderRadius: 12, padding: 8 },
  btn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  timeDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  timeText: { fontSize: 28, fontFamily: 'Inter_700Bold', color: C.text, fontVariant: ['tabular-nums'] },
  ampm: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.accent },
});


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useApp();

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [selectedReduce, setSelectedReduce] = useState<string[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<string[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('eight-week-recovery');
  const [wakeTime, setWakeTime] = useState('06:00');
  const [bedTime, setBedTime] = useState('22:00');

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const stepIndex = STEPS.indexOf(step);

  useEffect(() => {
    // Welcome step initial entry
    Animated.stagger(150, [
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const animateTransition = (next: Step, direction: 'forward' | 'backward') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const slideOutTo = direction === 'forward' ? -50 : 50;
    const slideInFrom = direction === 'forward' ? 50 : -50;

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: slideOutTo, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(slideInFrom);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    });
  };

  const nextStep = () => {
    if (step === 'name' && !name.trim()) return; // block empty name
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) animateTransition(STEPS[idx + 1], 'forward');
  };

  const prevStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) animateTransition(STEPS[idx - 1], 'backward');
  };

  const toggleSelection = (id: string, type: 'reduce' | 'build') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (type === 'reduce') {
      setSelectedReduce(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelectedBuild(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile({
      name: name.trim(),
      wakeTime,
      bedTime,
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
    router.replace('/(tabs)');
  };

  const prog = AVAILABLE_PROGRAMS.find(p => p.id === selectedProgram);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 20, paddingBottom: 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header Progress ─── */}
        {step !== 'welcome' && step !== 'done' && (
          <View style={styles.progressSection}>
            <TouchableOpacity onPress={prevStep} style={styles.backBtn} activeOpacity={0.6}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
            <LiquidProgressBar stepIndex={stepIndex - 1} totalSteps={STEPS.length - 2} />
            <Text style={styles.stepCount}>
              {stepIndex}/{STEPS.length - 2}
            </Text>
          </View>
        )}

        {/* ─── Step Content ─── */}
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>

          {/* ─── WELCOME ─── */}
          {step === 'welcome' && (
            <View style={styles.centeredStep}>
              <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
                <View style={styles.logoInner}>
                  <Ionicons name="compass" size={44} color={C.accent} />
                </View>
              </Animated.View>
              <Text style={styles.welcomeTitle}>Discipline OS</Text>
              <Text style={styles.welcomeSub}>
                A system for building the person you want to be — backed by behavioral science.
              </Text>
              
              <View style={styles.pillRow}>
                {['Environment over willpower', 'Data-driven insights', 'Offline-first privacy'].map((p, i) => (
                  <View key={p} style={styles.pill}>
                    <Ionicons name={['leaf', 'bar-chart', 'shield-checkmark'][i] as any} size={14} color={C.accent} />
                    <Text style={styles.pillText}>{p}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flex: 1 }} />
              
              <TouchableOpacity onPress={nextStep} style={styles.primaryBtn} activeOpacity={0.88}>
                <Text style={styles.primaryBtnText}>Begin Setup</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
                <Text style={styles.skipLink}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── NAME ─── */}
          {step === 'name' && (
            <View style={styles.questionStep}>
              <View style={styles.iconCircle}><Text style={styles.stepEmoji}>👋</Text></View>
              <Text style={styles.stepTitle}>What should I call you?</Text>
              <Text style={styles.stepDesc}>Personalizing your journey increases commitment. Your data stays strictly on your device.</Text>
              
              <View style={styles.inputWrap}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your first name"
                  placeholderTextColor={C.textDim}
                  autoFocus
                  style={styles.textInput}
                  selectionColor={C.accent}
                  onSubmitEditing={nextStep}
                  returnKeyType="next"
                />
              </View>
              
              <TouchableOpacity 
                onPress={nextStep} 
                style={[styles.primaryBtn, { opacity: name.trim() ? 1 : 0.5 }]} 
                activeOpacity={0.88}
                disabled={!name.trim()}
              >
                <Text style={styles.primaryBtnText}>{name.trim() ? `Continue, ${name}` : 'Continue'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ─── REDUCE ─── */}
          {step === 'reduce' && (
            <View style={styles.questionStep}>
              <View style={[styles.iconCircle, { backgroundColor: C.reduce + '15' }]}><Ionicons name="trending-down" size={28} color={C.reduce} /></View>
              <Text style={styles.stepTitle}>What do you want to reduce?</Text>
              <Text style={styles.stepDesc}>Select the patterns you want to break. We track these and gate progress on real data.</Text>
              
              <View style={styles.optionGrid}>
                {REDUCE_OPTIONS.map(m => {
                  const selected = selectedReduce.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => toggleSelection(m.id, 'reduce')}
                      style={[styles.optionCard, selected && styles.optionCardSelectedReduce]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionTop}>
                        <Text style={styles.optionEmoji}>{m.emoji ?? '📊'}</Text>
                        <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? C.reduce : C.border} />
                      </View>
                      <Text style={[styles.optionName, selected && { color: C.reduce }]}>{m.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <TouchableOpacity onPress={nextStep} style={[styles.primaryBtn, selectedReduce.length === 0 && styles.secondaryBtn]} activeOpacity={0.88}>
                <Text style={selectedReduce.length === 0 ? styles.secondaryBtnText : styles.primaryBtnText}>
                  {selectedReduce.length > 0 ? `Track ${selectedReduce.length} items →` : 'Skip this step →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── BUILD ─── */}
          {step === 'build' && (
            <View style={styles.questionStep}>
              <View style={[styles.iconCircle, { backgroundColor: C.build + '15' }]}><Ionicons name="trending-up" size={28} color={C.build} /></View>
              <Text style={styles.stepTitle}>What habits will you build?</Text>
              <Text style={styles.stepDesc}>Small daily wins compound. Pick 3–6 habits to start — less is more for consistency.</Text>
              
              <View style={styles.optionGrid}>
                {BUILD_OPTIONS.map(m => {
                  const selected = selectedBuild.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => toggleSelection(m.id, 'build')}
                      style={[styles.optionCard, selected && styles.optionCardSelectedBuild]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionTop}>
                        <Text style={styles.optionEmoji}>{m.emoji ?? '📊'}</Text>
                        <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? C.build : C.border} />
                      </View>
                      <Text style={[styles.optionName, selected && { color: C.build }]}>{m.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <TouchableOpacity onPress={nextStep} style={[styles.primaryBtn, selectedBuild.length === 0 && styles.secondaryBtn]} activeOpacity={0.88}>
                <Text style={selectedBuild.length === 0 ? styles.secondaryBtnText : styles.primaryBtnText}>
                  {selectedBuild.length > 0 ? `Build ${selectedBuild.length} habits →` : 'Skip this step →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── ROUTINE (NEW) ─── */}
          {step === 'routine' && (
            <View style={styles.questionStep}>
              <View style={[styles.iconCircle, { backgroundColor: C.accent + '15' }]}><Ionicons name="time" size={28} color={C.accent} /></View>
              <Text style={styles.stepTitle}>Configure your baseline</Text>
              <Text style={styles.stepDesc}>Sleep regulates the prefrontal cortex, which governs impulse control. This is the foundation of discipline.</Text>
              
              <View style={{ gap: 16, marginVertical: 8 }}>
                <TimeAdjuster label="Wake Time" time={wakeTime} setTime={setWakeTime} icon="sunny" />
                <TimeAdjuster label="Bed Time" time={bedTime} setTime={setBedTime} icon="moon" />
              </View>
              
              <TouchableOpacity onPress={nextStep} style={styles.primaryBtn} activeOpacity={0.88}>
                <Text style={styles.primaryBtnText}>Set Routine →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── PROGRAM ─── */}
          {step === 'program' && (
            <View style={styles.questionStep}>
              <View style={[styles.iconCircle, { backgroundColor: '#8b5cf615' }]}><Ionicons name="map" size={28} color="#8b5cf6" /></View>
              <Text style={styles.stepTitle}>Choose your system</Text>
              <Text style={styles.stepDesc}>Programs guide your focus week by week. You can enroll in more later.</Text>
              
              <View style={styles.programList}>
                {AVAILABLE_PROGRAMS.map(p => {
                  const selected = selectedProgram === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { setSelectedProgram(p.id); Haptics.selectionAsync(); }}
                      style={[styles.programCard, selected && { borderColor: p.color, backgroundColor: C.surfaceHigh }]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.programCardTop}>
                        <View style={[styles.programIconWrap, { backgroundColor: p.color + '20' }]}>
                          <Text style={styles.programEmoji}>{p.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.programTitle}>{p.title}</Text>
                          <Text style={styles.programWeeks}>{p.totalWeeks} weeks</Text>
                        </View>
                        <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={26} color={selected ? p.color : C.border} />
                      </View>
                      {selected && (
                        <>
                          <View style={styles.divider} />
                          <Text style={styles.programDesc}>{p.description}</Text>
                          <View style={styles.weekPreviewRow}>
                            {p.weeks.slice(0, 4).map(w => (
                              <View key={w.weekNumber} style={[styles.weekDot, { backgroundColor: p.color + '25' }]}>
                                <Text style={[styles.weekDotNum, { color: p.color }]}>{w.weekNumber}</Text>
                              </View>
                            ))}
                            {p.weeks.length > 4 && <Text style={styles.weekMore}>+{p.weeks.length - 4}</Text>}
                          </View>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <TouchableOpacity onPress={nextStep} style={styles.primaryBtn} activeOpacity={0.88}>
                <Text style={styles.primaryBtnText}>Select Program →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── DONE ─── */}
          {step === 'done' && (
            <View style={styles.centeredStep}>
              <View style={[styles.logoWrap, { borderColor: C.success + '40', backgroundColor: C.success + '10' }]}>
                <Ionicons name="checkmark-done" size={44} color={C.success} />
              </View>
              <Text style={styles.welcomeTitle}>
                {name ? `System initialized, ${name}.` : "System initialized."}
              </Text>
              <Text style={styles.welcomeSub}>
                Your environment is set. Remember: the system works when you work it. Log daily, reflect honestly.
              </Text>
              
              <View style={styles.summaryList}>
                {selectedReduce.length > 0 && (
                  <View style={styles.summaryRow}>
                    <View style={[styles.sumIconWrap, { backgroundColor: C.reduce + '20' }]}>
                      <Ionicons name="trending-down" size={18} color={C.reduce} />
                    </View>
                    <Text style={styles.summaryText}>Tracking {selectedReduce.length} item{selectedReduce.length > 1 ? 's' : ''} to reduce</Text>
                  </View>
                )}
                {selectedBuild.length > 0 && (
                  <View style={styles.summaryRow}>
                    <View style={[styles.sumIconWrap, { backgroundColor: C.build + '20' }]}>
                      <Ionicons name="trending-up" size={18} color={C.build} />
                    </View>
                    <Text style={styles.summaryText}>Building {selectedBuild.length} habit{selectedBuild.length > 1 ? 's' : ''}</Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <View style={[styles.sumIconWrap, { backgroundColor: C.accent + '20' }]}>
                    <Ionicons name="time" size={18} color={C.accent} />
                  </View>
                  <Text style={styles.summaryText}>Routine set: {wakeTime} – {bedTime}</Text>
                </View>
                {prog && (
                  <View style={styles.summaryRow}>
                    <View style={[styles.sumIconWrap, { backgroundColor: prog.color + '20' }]}>
                      <Text style={{ fontSize: 16 }}>{prog.emoji}</Text>
                    </View>
                    <Text style={styles.summaryText}>Starting {prog.title}</Text>
                  </View>
                )}
              </View>
              
              <View style={{ flex: 1 }} />
              
              <TouchableOpacity onPress={handleFinish} style={[styles.primaryBtn, { backgroundColor: C.success, width: '100%' }]} activeOpacity={0.88}>
                <Ionicons name="power" size={20} color="#000" />
                <Text style={[styles.primaryBtnText, { color: '#000' }]}>Launch Discipline OS</Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 24, gap: 0, minHeight: '100%' },
  
  // Progress Header
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepCount: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: C.textDim, minWidth: 28, textAlign: 'right' },
  
  // Step layout
  stepContainer: { gap: 0, flex: 1 },
  centeredStep: { alignItems: 'center', gap: 20, paddingTop: 40, flex: 1 },
  questionStep: { gap: 16, flex: 1 },
  
  // Icons & Typography
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepEmoji: { fontSize: 26 },
  stepTitle: { fontSize: 32, fontFamily: 'Inter_700Bold', color: C.text, letterSpacing: -1, lineHeight: 38 },
  stepDesc: { fontSize: 15, fontFamily: 'Inter_400Regular', color: C.textMuted, lineHeight: 22, marginBottom: 8 },
  
  // Inputs
  inputWrap: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 4, marginBottom: 12 },
  textInput: { paddingHorizontal: 16, paddingVertical: 18, fontSize: 20, fontFamily: 'Inter_600SemiBold', color: C.text },
  
  // Grids
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  optionCard: { width: '48%', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, gap: 12 },
  optionCardSelectedReduce: { backgroundColor: C.reduce + '12', borderColor: C.reduce },
  optionCardSelectedBuild: { backgroundColor: C.build + '12', borderColor: C.build },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  optionEmoji: { fontSize: 24 },
  optionName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.text, lineHeight: 18 },
  
  // Programs
  programList: { gap: 12, marginBottom: 16 },
  programCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, gap: 16 },
  programCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  programIconWrap: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  programEmoji: { fontSize: 26 },
  programTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: C.text },
  programWeeks: { fontSize: 12, fontFamily: 'Inter_500Medium', color: C.textMuted, marginTop: 4 },
  divider: { height: 1, backgroundColor: C.border },
  programDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', color: C.textMuted, lineHeight: 20 },
  weekPreviewRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  weekDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  weekDotNum: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  weekMore: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: C.textDim },
  
  // Welcome & Done
  logoWrap: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh },
  logoInner: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.accent + '20', alignItems: 'center', justifyContent: 'center' },
  welcomeTitle: { fontSize: 36, fontFamily: 'Inter_700Bold', color: C.text, letterSpacing: -1.5, textAlign: 'center' },
  welcomeSub: { fontSize: 15, fontFamily: 'Inter_400Regular', color: C.textMuted, lineHeight: 24, textAlign: 'center', paddingHorizontal: 16, marginBottom: 24 },
  pillRow: { gap: 12, width: '100%', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 },
  pillText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: C.text },
  
  summaryList: { width: '100%', gap: 12, marginVertical: 24 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, padding: 14, borderRadius: 16 },
  sumIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  summaryText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: C.text },
  
  // Buttons
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 16, backgroundColor: C.accent },
  primaryBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  secondaryBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: C.textMuted },
  skipBtn: { paddingVertical: 16 },
  skipLink: { fontSize: 14, fontFamily: 'Inter_500Medium', color: C.textDim },
});
