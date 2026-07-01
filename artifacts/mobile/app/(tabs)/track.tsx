import * as Haptics from 'expo-haptics';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, Exercise, WorkoutDay, WorkoutDayExercise, ExerciseLog } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { router } from 'expo-router';
import { GlassCard } from '@/components/GlassCard';

const { width: SW } = Dimensions.get('window');

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

// ─── Sleek Countdown Rest Timer ────────────────────────────────────────────────
interface RestTimerProps {
  duration: number; // in seconds
  onClose: () => void;
}

function RestTimer({ duration, onClose }: RestTimerProps) {
  const colors = useColors();
  const T = getThemeT(colors);
  const [timeLeft, setTimeLeft] = useState(duration);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setTimeLeft(duration);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [duration]);

  const add30s = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeLeft(prev => prev + 30);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const pct = timeLeft / duration;

  return (
    <View style={[timerStyles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="timer-outline" size={24} color={T.violet} />
        <View>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: T.textDim, letterSpacing: 0.5 }}>REST TIMER</Text>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: T.text }}>{formatTime(timeLeft)}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={add30s} style={[timerStyles.btn, { backgroundColor: T.card, borderColor: T.border }]}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: T.text }}>+30s</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={[timerStyles.btn, { backgroundColor: T.violet }]}>
          <Ionicons name="close" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'transparent'
  }
});

// ─── Compact Hold to Commit ───────────────────────────────────────────────────
interface HoldToLogProps {
  onComplete: () => void;
  color: string;
}

function HoldToLogCompact({ onComplete, color }: HoldToLogProps) {
  const colors = useColors();
  const T = getThemeT(colors);
  const [holding, setHolding] = useState(false);
  const progress = useSharedValue(0);
  const timerRef = useRef<any>(null);

  const startHold = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHolding(true);
    progress.value = withTiming(1, { duration: 850, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    
    timerRef.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
      resetHold();
    }, 850);
  };

  const resetHold = () => {
    setHolding(false);
    progress.value = withTiming(0, { duration: 150 });
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const animRingStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [{ scale: interpolate(progress.value, [0, 1], [0.8, 1.25]) }]
    };
  });

  return (
    <Pressable
      onPressIn={startHold}
      onPressOut={resetHold}
      style={[
        holdStyles.btn,
        {
          backgroundColor: holding ? color + '15' : T.cardRaise,
          borderColor: holding ? color : T.border
        }
      ]}
    >
      <AnimatedReanimated.View style={[holdStyles.progressRing, { borderColor: color }, animRingStyle]} />
      <Ionicons name={holding ? "refresh" : "checkmark-circle-outline"} size={16} color={holding ? color : T.textMid} />
      <Text style={[holdStyles.text, { color: holding ? color : T.text }]}>Log Sets</Text>
    </Pressable>
  );
}

const holdStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
    overflow: 'visible'
  },
  progressRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'solid'
  },
  text: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold'
  }
});

// ─── Exercise Row Component ────────────────────────────────────────────────────
interface ExerciseRowProps {
  dayEx: WorkoutDayExercise;
  activeSessionId: string | null;
  onLoggedSet: () => void;
}

function ExerciseRow({ dayEx, activeSessionId, onLoggedSet }: ExerciseRowProps) {
  const colors = useColors();
  const T = getThemeT(colors);
  const { exercises, exerciseLogs, logExerciseSet } = useApp();
  const [expanded, setExpanded] = useState(false);

  // Find exercise details
  const ex = useMemo(() => exercises.find(e => e.id === dayEx.exerciseId), [exercises, dayEx.exerciseId]);

  // Find logged sets for this session
  const loggedSets = useMemo(() => {
    if (!activeSessionId) return [];
    return exerciseLogs.filter(l => l.workoutSessionId === activeSessionId && l.exerciseId === dayEx.exerciseId);
  }, [exerciseLogs, activeSessionId, dayEx.exerciseId]);

  // Find previous weight logs for this exercise to help suggest weights
  const previousWeight = useMemo(() => {
    const historical = exerciseLogs
      .filter(l => l.exerciseId === dayEx.exerciseId && l.workoutSessionId !== activeSessionId)
      .sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return historical[0]?.weight ?? 20; // default to empty barbell
  }, [exerciseLogs, dayEx.exerciseId, activeSessionId]);

  // Hold-to-commit quick fill
  const handleHoldComplete = async () => {
    if (!activeSessionId) return;
    for (let i = 1; i <= dayEx.targetSets; i++) {
      await logExerciseSet(dayEx.exerciseId, i, previousWeight, dayEx.targetReps, dayEx.targetRpe);
    }
    onLoggedSet();
  };

  const handleSetRowLog = async (setNum: number, weight: number, reps: number, rpe?: number | null) => {
    await logExerciseSet(dayEx.exerciseId, setNum, weight, reps, rpe);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLoggedSet();
  };

  const isCompleted = loggedSets.length >= dayEx.targetSets;

  if (!ex) return null;

  return (
    <View style={[exStyles.card, { backgroundColor: T.surface, borderColor: isCompleted ? T.green + '40' : T.border }]}>
      <Pressable onPress={() => setExpanded(p => !p)} style={exStyles.headerRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[exStyles.name, { color: T.text }]}>{ex.name}</Text>
          <Text style={{ fontSize: 11, color: T.textMid }}>
            Target: {dayEx.targetSets} Sets x {dayEx.targetReps} Reps {dayEx.targetRpe ? `@ RPE ${dayEx.targetRpe}` : ''}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {activeSessionId && (
            <HoldToLogCompact 
              color={isCompleted ? T.green : T.violet}
              onComplete={handleHoldComplete}
            />
          )}
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={T.textDim} />
        </View>
      </Pressable>

      {expanded && (
        <View style={[exStyles.body, { borderTopColor: T.border }]}>
          <View style={exStyles.tableHeader}>
            <Text style={[exStyles.th, { width: 40 }]}>SET</Text>
            <Text style={[exStyles.th, { flex: 1 }]}>PREV</Text>
            <Text style={[exStyles.th, { flex: 1.5, textAlign: 'center' }]}>KG</Text>
            <Text style={[exStyles.th, { flex: 1.5, textAlign: 'center' }]}>REPS</Text>
            <Text style={[exStyles.th, { width: 44, textAlign: 'right' }]}></Text>
          </View>

          {Array.from({ length: dayEx.targetSets }).map((_, idx) => {
            const setNum = idx + 1;
            const log = loggedSets.find(l => l.setNumber === setNum);
            
            return (
              <SetRow
                key={setNum}
                setNum={setNum}
                log={log}
                prevWeight={previousWeight}
                targetReps={dayEx.targetReps}
                onLog={(w, r) => handleSetRowLog(setNum, w, r)}
                activeSessionId={activeSessionId}
                T={T}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

interface SetRowProps {
  setNum: number;
  log?: ExerciseLog;
  prevWeight: number;
  targetReps: number;
  onLog: (weight: number, reps: number) => void;
  activeSessionId: string | null;
  T: any;
}

function SetRow({ setNum, log, prevWeight, targetReps, onLog, activeSessionId, T }: SetRowProps) {
  const [weight, setWeight] = useState(log ? String(log.weight) : String(prevWeight));
  const [reps, setReps] = useState(log ? String(log.reps) : String(targetReps));

  const isChecked = !!log;

  return (
    <View style={exStyles.row}>
      <Text style={[exStyles.tdLabel, { width: 40, color: T.textMid }]}>{setNum}</Text>
      <Text style={[exStyles.tdLabel, { flex: 1, color: T.textDim }]}>{prevWeight} kg</Text>
      
      <View style={{ flex: 1.5, alignItems: 'center' }}>
        <TextInput
          style={[exStyles.input, { backgroundColor: T.card, color: T.text, borderColor: T.border }]}
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          editable={!!activeSessionId}
        />
      </View>
      
      <View style={{ flex: 1.5, alignItems: 'center' }}>
        <TextInput
          style={[exStyles.input, { backgroundColor: T.card, color: T.text, borderColor: T.border }]}
          value={reps}
          onChangeText={setReps}
          keyboardType="numeric"
          editable={!!activeSessionId}
        />
      </View>

      <View style={{ width: 44, alignItems: 'flex-end' }}>
        {activeSessionId ? (
          <TouchableOpacity
            onPress={() => onLog(Number(weight), Number(reps))}
            style={[
              exStyles.checkBtn,
              { 
                backgroundColor: isChecked ? T.green : T.cardRaise, 
                borderColor: isChecked ? 'transparent' : T.border 
              }
            ]}
          >
            <Ionicons name="checkmark" size={14} color={isChecked ? '#fff' : T.textDim} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="lock-closed-outline" size={14} color={T.textDim} />
        )}
      </View>
    </View>
  );
}

const exStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  name: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  body: { borderTopWidth: 1, padding: 12, gap: 6 },
  tableHeader: { flexDirection: 'row', paddingVertical: 4, opacity: 0.6 },
  th: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#888' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  tdLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  input: { width: 56, height: 32, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontSize: 12, fontFamily: 'Inter_700Bold', padding: 0 },
  checkBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }
});

// ─── Main Tracker Screen ───────────────────────────────────────────────────────
export default function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const T = getThemeT(colors);
  
  const {
    profile, programs, workoutDays, workoutDayExercises,
    currentWorkoutSession, finishWorkoutSession, cancelWorkoutSession,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'board' | 'split'>('board');
  const [restDuration, setRestDuration] = useState<number | null>(null);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const activeProgram = useMemo(() => {
    const activeId = profile.activeProgramIds[0];
    return programs.find(p => p.id === activeId);
  }, [profile.activeProgramIds, programs]);

  const activeDays = useMemo(() => {
    if (!activeProgram) return [];
    return workoutDays
      .filter(d => d.programId === activeProgram.id)
      .sort((a,b) => a.dayNumber - b.dayNumber);
  }, [activeProgram, workoutDays]);

  // Current session details
  const sessionDay = useMemo(() => {
    if (!currentWorkoutSession) return null;
    return workoutDays.find(d => d.id === currentWorkoutSession.workoutDayId);
  }, [currentWorkoutSession, workoutDays]);

  const sessionExercises = useMemo(() => {
    if (!currentWorkoutSession) return [];
    return workoutDayExercises
      .filter(de => de.workoutDayId === currentWorkoutSession.workoutDayId)
      .sort((a,b) => a.sortOrder - b.sortOrder);
  }, [currentWorkoutSession, workoutDayExercises]);

  const handleFinish = () => {
    Alert.alert('Finish Workout?', 'Have you completed all your sets?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Finish', 
        onPress: async () => {
          await finishWorkoutSession();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.push('/(tabs)');
        } 
      }
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Workout?', 'Discard all logged sets for this session?', [
      { text: 'Keep Lifting', style: 'cancel' },
      { 
        text: 'Discard', 
        style: 'destructive',
        onPress: async () => {
          await cancelWorkoutSession();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } 
      }
    ]);
  };

  const triggerRestTimer = () => {
    setRestDuration(90); // default 90s rest timer
  };

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {/* Rest Timer Overlay */}
      {restDuration && (
        <RestTimer duration={restDuration} onClose={() => setRestDuration(null)} />
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 8, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.subtitle, { color: T.textMid }]}>FitBuddy Split</Text>
            <Text style={[styles.title, { color: T.text }]}>Gym split planner</Text>
          </View>
        </View>

        {/* ── Active Session Banner ── */}
        {currentWorkoutSession && sessionDay && (
          <GlassCard intensity={30}>
            <View style={{ padding: 16, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: T.violet, letterSpacing: 1 }}>ACTIVE WORKOUT SESSION</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: T.text }}>{sessionDay.title}</Text>
                </View>
                <View style={styles.pulseDot} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={handleFinish} style={[styles.actionBtn, { flex: 2, backgroundColor: T.green }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' }}>Finish Session</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={handleCancel} style={[styles.actionBtn, { flex: 1, backgroundColor: T.red + '20', borderColor: T.red + '40', borderWidth: 1 }]}>
                  <Ionicons name="trash-outline" size={16} color={T.red} />
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        )}

        {/* ── Exercises lists ── */}
        <View style={{ gap: 12 }}>
          {currentWorkoutSession && sessionDay ? (
            // Render active workout exercises
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionTitle, { color: T.textMid }]}>EXERCISES</Text>
              {sessionExercises.map(dayEx => (
                <ExerciseRow
                  key={dayEx.id}
                  dayEx={dayEx}
                  activeSessionId={currentWorkoutSession.id}
                  onLoggedSet={triggerRestTimer}
                />
              ))}
            </View>
          ) : activeDays.length > 0 ? (
            // Render all program days collapsed
            <View style={{ gap: 12 }}>
              <Text style={[styles.sectionTitle, { color: T.textMid }]}>YOUR PROGRAM DAYS</Text>
              {activeDays.map(day => {
                const dayExs = workoutDayExercises
                  .filter(de => de.workoutDayId === day.id)
                  .sort((a,b) => a.sortOrder - b.sortOrder);

                return (
                  <View key={day.id} style={[styles.dayBlock, { backgroundColor: T.surface, borderColor: T.border }]}>
                    <View style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ gap: 2 }}>
                        <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: T.text }}>{day.title}</Text>
                        <Text style={{ fontSize: 11, color: T.textMid }}>
                          {dayExs.length} Exercises prescribed
                        </Text>
                      </View>
                    </View>
                    
                    <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                      {dayExs.map(dayEx => (
                        <ExerciseRow
                          key={dayEx.id}
                          dayEx={dayEx}
                          activeSessionId={null}
                          onLoggedSet={() => {}}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyCard, { borderColor: T.border }]}>
              <Ionicons name="barbell-outline" size={32} color={T.textDim} />
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: T.textMid }}>No Active Split</Text>
              <Text style={{ fontSize: 12, color: T.textDim }}>Navigate to profile/templates to enroll in a gym split program.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginTop: 10 },
  
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D68F' },

  dayBlock: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 32, alignItems: 'center', gap: 8 }
});
