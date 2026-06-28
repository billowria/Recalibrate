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
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { AVAILABLE_PROGRAMS, DEFAULT_METRICS } from '@/constants/program';
import { useColors } from '@/hooks/useColors';
import { CommitmentButton } from '@/components/CommitmentButton';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withTiming,
  withSpring,
  withRepeat,
  Easing as ReanimatedEasing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

const STEPS = ['welcome', 'name', 'reduce', 'build', 'routine', 'program', 'done'] as const;
type Step = typeof STEPS[number];

const REDUCE_OPTIONS = DEFAULT_METRICS.filter(m => m.category === 'reduce');
const BUILD_OPTIONS = DEFAULT_METRICS.filter(m => m.category === 'build').slice(0, 8);

// ─── Orbiting Rings Logo (Welcome Step) ──────────────────────────────────────────
function OrbitingLogo() {
  const colors = useColors();
  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(0);
  const rotation3 = useSharedValue(0);

  useEffect(() => {
    rotation1.value = withRepeat(
      withTiming(360, { duration: 8000, easing: ReanimatedEasing.linear }),
      -1,
      false
    );
    rotation2.value = withRepeat(
      withTiming(-360, { duration: 10000, easing: ReanimatedEasing.linear }),
      -1,
      false
    );
    rotation3.value = withRepeat(
      withTiming(360, { duration: 15000, easing: ReanimatedEasing.linear }),
      -1,
      false
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [
      { rotateX: '45deg' },
      { rotateY: '30deg' },
      { rotateZ: `${rotation1.value}deg` },
    ],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [
      { rotateX: '60deg' },
      { rotateY: '-45deg' },
      { rotateZ: `${rotation2.value}deg` },
    ],
  }));

  return (
    <View style={orbitStyles.container}>
      {/* Outer Glow */}
      <View style={[orbitStyles.glow, { backgroundColor: colors.brand.primaryGlow }]} />
      
      {/* Orbit Ring 1 */}
      <AnimatedReanimated.View style={[orbitStyles.ring, orbitStyles.ring1, { borderColor: colors.brand.primary + '40' }, ring1Style]} />
      
      {/* Orbit Ring 2 */}
      <AnimatedReanimated.View style={[orbitStyles.ring, orbitStyles.ring2, { borderColor: colors.brand.secondary + '30' }, ring2Style]} />

      {/* Central Icon */}
      <View style={[orbitStyles.center, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}>
        <Ionicons name="compass" size={42} color={colors.brand.primary} />
      </View>
    </View>
  );
}

const orbitStyles = StyleSheet.create({
  container: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 20,
  },
  glow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0.8,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  ring1: {
    width: 160,
    height: 160,
  },
  ring2: {
    width: 120,
    height: 120,
  },
  center: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#5B5EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
});

// ─── Liquid Progress Bar (Top Navigation) ───────────────────────────────────────
function LiquidProgressBar({ stepIndex, totalSteps }: { stepIndex: number; totalSteps: number }) {
  const colors = useColors();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: stepIndex / (totalSteps - 1),
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [stepIndex]);

  const width = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={[pbStyles.container, { backgroundColor: colors.surfaceHigh }]}>
      <Animated.View style={[pbStyles.fill, { width, backgroundColor: colors.brand.primary }]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  container: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

// ─── Time Adjuster (Routine Step) ─────────────────────────────────────────────
function TimeAdjuster({ label, time, setTime, icon }: { label: string, time: string, setTime: (t: string) => void, icon: any }) {
  const colors = useColors();
  const [h, m] = time.split(':').map(Number);

  const minusScale = useSharedValue(1);
  const plusScale = useSharedValue(1);

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

  const minusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: minusScale.value }],
  }));

  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: plusScale.value }],
  }));

  return (
    <View style={[timeStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={timeStyles.header}>
        <View style={[timeStyles.iconWrap, { backgroundColor: colors.brand.primaryGlowSoft }]}>
          <Ionicons name={icon} size={18} color={colors.brand.primary} />
        </View>
        <Text style={[timeStyles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={[timeStyles.controls, { backgroundColor: colors.surfaceHigh }]}>
        <Pressable
          onPressIn={() => { minusScale.value = withSpring(0.85); }}
          onPressOut={() => { minusScale.value = withSpring(1); }}
          onPress={() => updateTime(0, -15)}
        >
          <AnimatedReanimated.View style={[timeStyles.btn, { backgroundColor: colors.surface, borderColor: colors.border }, minusStyle]}>
            <Ionicons name="remove" size={22} color={colors.textSecondary} />
          </AnimatedReanimated.View>
        </Pressable>
        
        <View style={timeStyles.timeDisplay}>
          <Text style={[timeStyles.timeText, { color: colors.text }]}>{displayH}:{m.toString().padStart(2, '0')}</Text>
          <Text style={[timeStyles.ampm, { color: colors.brand.primary }]}>{ampm}</Text>
        </View>

        <Pressable
          onPressIn={() => { plusScale.value = withSpring(0.85); }}
          onPressOut={() => { plusScale.value = withSpring(1); }}
          onPress={() => updateTime(0, 15)}
        >
          <AnimatedReanimated.View style={[timeStyles.btn, { backgroundColor: colors.surface, borderColor: colors.border }, plusStyle]}>
            <Ionicons name="add" size={22} color={colors.textSecondary} />
          </AnimatedReanimated.View>
        </Pressable>
      </View>
    </View>
  );
}

const timeStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 8 },
  btn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  timeDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  timeText: { fontSize: 28, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  ampm: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});

// ─── Selection Card (Reduce / Build Steps) ────────────────────────────────────
function SelectionCard({
  emoji,
  name,
  selected,
  type,
  onPress,
}: {
  emoji: string;
  name: string;
  selected: boolean;
  type: 'reduce' | 'build';
  onPress: () => void;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.04 : 1, { damping: 15, stiffness: 150 });
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const activeColor = type === 'reduce' ? colors.brand.danger : colors.brand.success;

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96); }}
      onPressOut={() => { scale.value = withSpring(selected ? 1.04 : 1); }}
      onPress={onPress}
      style={{ width: '48%' }}
    >
      <AnimatedReanimated.View
        style={[
          styles.optionCard,
          {
            backgroundColor: selected ? `${activeColor}15` : colors.surface,
            borderColor: selected ? activeColor : colors.border,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.optionTop}>
          <Text style={styles.optionEmoji}>{emoji}</Text>
          <Ionicons
            name={selected ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={selected ? activeColor : colors.textMuted}
          />
        </View>
        <Text
          style={[
            styles.optionName,
            { color: selected ? activeColor : colors.text },
          ]}
        >
          {name}
        </Text>
      </AnimatedReanimated.View>
    </Pressable>
  );
}

// Reusable CommitmentButton imported from components

// ─── Main Onboarding Screen ────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { updateProfile } = useApp();

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [selectedReduce, setSelectedReduce] = useState<string[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<string[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('dopamine-detox-protocol');
  const [wakeTime, setWakeTime] = useState('06:00');
  const [bedTime, setBedTime] = useState('22:00');

  // Animation values for transition
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const stepIndex = STEPS.indexOf(step);

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
    if (step === 'name' && !name.trim()) return;
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
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Decorative Blob */}
      <View style={styles.blurBlobContainer}>
        <LinearGradient
          colors={[colors.brand.primaryGlow, 'transparent']}
          style={styles.blurBlob}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 20, paddingBottom: 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header Progress ─── */}
        {step !== 'welcome' && step !== 'done' && (
          <View style={styles.progressSection}>
            <TouchableOpacity onPress={prevStep} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.6}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <LiquidProgressBar stepIndex={stepIndex - 1} totalSteps={STEPS.length - 2} />
            <Text style={[styles.stepCount, { color: colors.textMuted }]}>
              {stepIndex}/{STEPS.length - 2}
            </Text>
          </View>
        )}

        {/* ─── Step Content ─── */}
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>

          {/* ─── WELCOME ─── */}
          {step === 'welcome' && (
            <View style={styles.centeredStep}>
              <OrbitingLogo />
              
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>Discipline OS</Text>
              <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
                A system for building the person you want to be — backed by behavioral science.
              </Text>
              
              <View style={styles.pillRow}>
                {[
                  { text: 'Environment over willpower', icon: 'leaf' },
                  { text: 'Data-driven insights', icon: 'bar-chart' },
                  { text: 'Offline-first privacy', icon: 'shield-checkmark' }
                ].map((p, i) => (
                  <View key={p.text} style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name={p.icon as any} size={14} color={colors.brand.primary} />
                    <Text style={[styles.pillText, { color: colors.text }]}>{p.text}</Text>
                  </View>
                ))}
              </View>

              <View style={{ height: 40 }} />
              
              <TouchableOpacity onPress={nextStep} activeOpacity={0.88} style={{ width: '100%' }}>
                <LinearGradient
                  colors={colors.gradients.primaryShort}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>Begin Setup</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
                <Text style={[styles.skipLink, { color: colors.textMuted }]}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── NAME ─── */}
          {step === 'name' && (
            <View style={styles.questionStep}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}><Text style={styles.centerEmoji}>👋</Text></View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>What should I call you?</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Personalizing your journey increases commitment. Your data stays strictly on your device.</Text>
              
              <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your first name"
                  placeholderTextColor={colors.textDim}
                  autoFocus
                  style={[styles.textInput, { color: colors.text }]}
                  selectionColor={colors.brand.primary}
                  onSubmitEditing={nextStep}
                  returnKeyType="next"
                />
              </View>
              
              <TouchableOpacity 
                onPress={nextStep} 
                disabled={!name.trim()}
                style={{ width: '100%', marginTop: 10, opacity: name.trim() ? 1 : 0.5 }}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={colors.gradients.primaryShort}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>{name.trim() ? `Continue, ${name}` : 'Continue'}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── REDUCE ─── */}
          {step === 'reduce' && (
            <View style={styles.questionStep}>
              <View style={[styles.iconCircle, { backgroundColor: colors.brand.danger + '15', borderColor: colors.brand.danger + '30' }]}><Ionicons name="trending-down" size={28} color={colors.brand.danger} /></View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>What do you want to reduce?</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Select the patterns you want to break. We track these and gate progress on real data.</Text>
              
              <View style={styles.optionGrid}>
                {REDUCE_OPTIONS.map(m => (
                  <SelectionCard
                    key={m.id}
                    emoji={m.emoji ?? '📊'}
                    name={m.name}
                    selected={selectedReduce.includes(m.id)}
                    type="reduce"
                    onPress={() => toggleSelection(m.id, 'reduce')}
                  />
                ))}
              </View>
              
              <TouchableOpacity onPress={nextStep} style={{ width: '100%', marginTop: 10 }} activeOpacity={0.88}>
                {selectedReduce.length > 0 ? (
                  <LinearGradient
                    colors={colors.gradients.primaryShort}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtnGradient}
                  >
                    <Text style={styles.primaryBtnText}>{`Track ${selectedReduce.length} items →`}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.secondaryBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Skip this step →</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ─── BUILD ─── */}
          {step === 'build' && (
            <View style={styles.questionStep}>
              <View style={[styles.iconCircle, { backgroundColor: colors.brand.success + '15', borderColor: colors.brand.success + '30' }]}><Ionicons name="trending-up" size={28} color={colors.brand.success} /></View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>What habits will you build?</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Small daily wins compound. Pick 3–6 habits to start — less is more for consistency.</Text>
              
              <View style={styles.optionGrid}>
                {BUILD_OPTIONS.map(m => (
                  <SelectionCard
                    key={m.id}
                    emoji={m.emoji ?? '📊'}
                    name={m.name}
                    selected={selectedBuild.includes(m.id)}
                    type="build"
                    onPress={() => toggleSelection(m.id, 'build')}
                  />
                ))}
              </View>
              
              <TouchableOpacity onPress={nextStep} style={{ width: '100%', marginTop: 10 }} activeOpacity={0.88}>
                {selectedBuild.length > 0 ? (
                  <LinearGradient
                    colors={colors.gradients.primaryShort}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtnGradient}
                  >
                    <Text style={styles.primaryBtnText}>{`Build ${selectedBuild.length} habits →`}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.secondaryBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Skip this step →</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ─── ROUTINE ─── */}
          {step === 'routine' && (
            <View style={styles.questionStep}>
              <View style={[styles.iconCircle, { backgroundColor: colors.brand.primaryGlowSoft, borderColor: colors.brand.primary + '30' }]}><Ionicons name="time" size={28} color={colors.brand.primary} /></View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Configure your baseline</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Sleep regulates the prefrontal cortex, which governs impulse control. This is the foundation of discipline.</Text>
              
              <View style={{ gap: 16, marginVertical: 8 }}>
                <TimeAdjuster label="Wake Time" time={wakeTime} setTime={setWakeTime} icon="sunny" />
                <TimeAdjuster label="Bed Time" time={bedTime} setTime={setBedTime} icon="moon" />
              </View>
              
              <TouchableOpacity onPress={nextStep} style={{ width: '100%', marginTop: 16 }} activeOpacity={0.88}>
                <LinearGradient
                  colors={colors.gradients.primaryShort}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>Set Routine →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── PROGRAM ─── */}
          {step === 'program' && (
            <View style={styles.questionStep}>
              <View style={[styles.iconCircle, { backgroundColor: '#8b5cf615', borderColor: '#8b5cf630' }]}><Ionicons name="map" size={28} color="#8b5cf6" /></View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Choose your system</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Programs guide your focus week by week. You can enroll in more later.</Text>
              
              <View style={styles.programList}>
                {AVAILABLE_PROGRAMS.map(p => {
                  const selected = selectedProgram === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { setSelectedProgram(p.id); Haptics.selectionAsync(); }}
                      style={[
                        styles.programCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: selected ? p.color : colors.border,
                        }
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.programCardTop}>
                        <View style={[styles.programIconWrap, { backgroundColor: p.color + '20' }]}>
                          <Text style={styles.programEmoji}>{p.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.programTitle, { color: colors.text }]}>{p.title}</Text>
                          <Text style={[styles.programWeeks, { color: colors.textMuted }]}>{p.totalWeeks} weeks</Text>
                        </View>
                        <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={26} color={selected ? p.color : colors.border} />
                      </View>
                      
                      {selected && (
                        <AnimatedReanimated.View
                          entering={FadeIn.duration(200)}
                          exiting={FadeOut.duration(150)}
                          style={styles.programDetails}
                        >
                          <View style={[styles.divider, { backgroundColor: colors.border }]} />
                          <Text style={[styles.programDesc, { color: colors.textSecondary }]}>{p.description}</Text>
                          <View style={styles.weekPreviewRow}>
                            {p.weeks.slice(0, 4).map(w => (
                              <View key={w.weekNumber} style={[styles.weekDot, { backgroundColor: p.color + '20' }]}>
                                <Text style={[styles.weekDotNum, { color: p.color }]}>{w.weekNumber}</Text>
                              </View>
                            ))}
                            {p.weeks.length > 4 && <Text style={[styles.weekMore, { color: colors.textMuted }]}>+{p.weeks.length - 4}</Text>}
                          </View>
                        </AnimatedReanimated.View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <TouchableOpacity onPress={nextStep} style={{ width: '100%', marginTop: 10 }} activeOpacity={0.88}>
                <LinearGradient
                  colors={colors.gradients.primaryShort}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>Select Program →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── DONE ─── */}
          {step === 'done' && (
            <View style={styles.centeredStep}>
              <View style={[styles.logoWrapDone, { borderColor: colors.brand.success + '40', backgroundColor: colors.brand.success + '10' }]}>
                <Ionicons name="checkmark-done" size={44} color={colors.brand.success} />
              </View>
              
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                {name ? `System initialized, ${name}.` : "System initialized."}
              </Text>
              <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
                Your environment is set. Remember: the system works when you work it. Log daily, reflect honestly.
              </Text>
              
              <View style={styles.summaryList}>
                {selectedReduce.length > 0 && (
                  <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.sumIconWrap, { backgroundColor: colors.brand.danger + '20' }]}>
                      <Ionicons name="trending-down" size={18} color={colors.brand.danger} />
                    </View>
                    <Text style={[styles.summaryText, { color: colors.text }]}>Tracking {selectedReduce.length} item{selectedReduce.length > 1 ? 's' : ''} to reduce</Text>
                  </View>
                )}
                {selectedBuild.length > 0 && (
                  <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.sumIconWrap, { backgroundColor: colors.brand.success + '20' }]}>
                      <Ionicons name="trending-up" size={18} color={colors.brand.success} />
                    </View>
                    <Text style={[styles.summaryText, { color: colors.text }]}>Building {selectedBuild.length} habit{selectedBuild.length > 1 ? 's' : ''}</Text>
                  </View>
                )}
                <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.sumIconWrap, { backgroundColor: colors.brand.primaryGlowSoft }]}>
                    <Ionicons name="time" size={18} color={colors.brand.primary} />
                  </View>
                  <Text style={[styles.summaryText, { color: colors.text }]}>Routine set: {wakeTime} – {bedTime}</Text>
                </View>
                {prog && (
                  <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.sumIconWrap, { backgroundColor: prog.color + '20' }]}>
                      <Text style={{ fontSize: 16 }}>{prog.emoji}</Text>
                    </View>
                    <Text style={[styles.summaryText, { color: colors.text }]}>Starting {prog.title}</Text>
                  </View>
                )}
              </View>
              
              <View style={{ flex: 1, minHeight: 40 }} />
              
              <CommitmentButton
                onComplete={handleFinish}
                label="Hold to Commit & Launch"
                completedLabel="Identity Committed!"
                color={colors.brand.success}
              />
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 0, minHeight: '100%' },
  
  // Progress Header
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepCount: { fontSize: 13, fontFamily: 'Inter_600SemiBold', minWidth: 28, textAlign: 'right' },
  
  // Step layout
  stepContainer: { gap: 0, flex: 1 },
  centeredStep: { alignItems: 'center', gap: 16, paddingTop: 20, flex: 1 },
  questionStep: { gap: 16, flex: 1 },
  
  // Decorative BG
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
    borderBottomLeftRadius: SCREEN_W,
    borderBottomRightRadius: SCREEN_W,
    opacity: 0.6,
  },
  
  // Icons & Typography
  iconCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepEmoji: { fontSize: 26 },
  stepTitle: { fontSize: 30, fontFamily: 'Inter_700Bold', letterSpacing: -0.8, lineHeight: 36 },
  stepDesc: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 8 },
  
  // Inputs
  inputWrap: { borderWidth: 1, borderRadius: 16, padding: 4, marginBottom: 12 },
  textInput: { paddingHorizontal: 16, paddingVertical: 18, fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  
  // Grids
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  optionCard: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  optionEmoji: { fontSize: 24 },
  optionName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', lineHeight: 18 },
  
  // Programs
  programList: { gap: 12, marginBottom: 16 },
  programCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  programCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  programIconWrap: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  programEmoji: { fontSize: 26 },
  programTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  programWeeks: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 4 },
  programDetails: { marginTop: 14, gap: 12 },
  divider: { height: 1 },
  programDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  weekPreviewRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  weekDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  weekDotNum: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  weekMore: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  
  // Welcome & Done
  logoWrapDone: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  centerEmoji: { fontSize: 24 },
  welcomeTitle: { fontSize: 34, fontFamily: 'Inter_700Bold', letterSpacing: -1.2, textAlign: 'center' },
  welcomeSub: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 24, textAlign: 'center', paddingHorizontal: 16, marginBottom: 12 },
  pillRow: { gap: 12, width: '100%', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 },
  pillText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  
  summaryList: { width: '100%', gap: 12, marginVertical: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, padding: 14, borderRadius: 16 },
  sumIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  summaryText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  
  // Buttons
  primaryBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 16, width: '100%' },
  primaryBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16, borderWidth: 1, width: '100%' },
  secondaryBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  skipBtn: { paddingVertical: 16 },
  skipLink: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
