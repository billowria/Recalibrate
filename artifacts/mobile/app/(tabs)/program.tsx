import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function parseProgramDescription(desc: string) {
  if (!desc) return { body: '', customImageBase64: null };
  if (desc.startsWith('{')) {
    try {
      return JSON.parse(desc);
    } catch (e) {}
  }
  return { body: desc, customImageBase64: null };
}

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

export default function ProgramScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const T = getThemeT(colors);
  
  const {
    profile, programs, workoutDays, workoutDayExercises, exercises,
    startWorkoutSession, currentWorkoutSession, enrollProgram, unenrollProgram
  } = useApp();

  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const enrolledPrograms = useMemo(() => {
    return programs.filter(p => profile.activeProgramIds.includes(p.id));
  }, [profile.activeProgramIds, programs]);

  const activeProgram = enrolledPrograms[0] || null;

  const activeDays = useMemo(() => {
    if (!activeProgram) return [];
    return workoutDays
      .filter(d => d.programId === activeProgram.id)
      .sort((a,b) => a.dayNumber - b.dayNumber);
  }, [activeProgram, workoutDays]);

  const handleStartWorkout = async (dayId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startWorkoutSession(dayId);
    router.push('/(tabs)/track');
  };

  const handleUnenroll = () => {
    if (!activeProgram) return;
    unenrollProgram(activeProgram.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 8, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.subtitle, { color: T.textMid }]}>MY PLANNER</Text>
            <Text style={[styles.title, { color: T.text }]}>Gym Split Routine</Text>
          </View>
        </View>

        {activeProgram ? (
          <View style={{ gap: 16 }}>
            {/* Active program card */}
            <LinearGradient
              colors={colors.isDark ? ['#13112E', '#06050D'] : ['#FFFFFF', '#F0F2F5']}
              style={[styles.activeCard, { borderColor: T.border }]}
            >
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={[styles.emojiWrap, { backgroundColor: activeProgram.color + '20' }]}>
                  <Text style={{ fontSize: 28 }}>{activeProgram.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.activeLabel, { color: activeProgram.color }]}>ACTIVE SPLIT</Text>
                  <Text style={[styles.activeTitle, { color: T.text }]}>{activeProgram.title}</Text>
                  <Text style={{ fontSize: 12, color: T.textMid }}>
                    {activeProgram.description || 'Custom hypertrophy routines split.'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity 
                  onPress={() => router.push('/program-discover')}
                  style={[styles.actionBtn, { flex: 1, backgroundColor: T.card, borderColor: T.border, borderWidth: 1 }]}
                >
                  <Ionicons name="search-outline" size={15} color={T.text} />
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: T.text }}>Change split</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleUnenroll}
                  style={[styles.actionBtn, { backgroundColor: T.red + '20', borderColor: T.red + '40', borderWidth: 1, paddingHorizontal: 16 }]}
                >
                  <Ionicons name="exit-outline" size={15} color={T.red} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Split workout days list */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: T.textDim, letterSpacing: 1.5 }}>ROUTINES IN SPLIT</Text>
              
              {activeDays.map(day => {
                const isExpanded = expandedDayId === day.id;
                const dayExs = workoutDayExercises
                  .filter(de => de.workoutDayId === day.id)
                  .sort((a,b) => a.sortOrder - b.sortOrder);

                return (
                  <View key={day.id} style={[styles.dayCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                    <Pressable 
                      onPress={() => setExpandedDayId(isExpanded ? null : day.id)}
                      style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <View style={{ gap: 2 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: T.text }}>
                          Day {day.dayNumber}: {day.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: T.textMid }}>
                          {dayExs.length} Exercises prescribed • {day.targetMuscleGroups.join(', ')}
                        </Text>
                      </View>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={T.textDim} />
                    </Pressable>

                    {isExpanded && (
                      <View style={[styles.dayBody, { borderTopColor: T.border }]}>
                        {dayExs.map((de, idx) => {
                          const ex = exercises.find(e => e.id === de.exerciseId);
                          return (
                            <View key={de.id} style={styles.exRow}>
                              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: T.text }}>
                                {idx + 1}. {ex ? ex.name : 'Exercise'}
                              </Text>
                              <Text style={{ fontSize: 11, color: T.textMid }}>
                                {de.targetSets} Sets x {de.targetReps} Reps {de.targetRpe ? `@ RPE ${de.targetRpe}` : ''}
                              </Text>
                            </View>
                          );
                        })}

                        <TouchableOpacity 
                          onPress={() => handleStartWorkout(day.id)}
                          style={[styles.actionBtn, { backgroundColor: T.violet, marginTop: 10 }]}
                        >
                          <Ionicons name="play" size={14} color="#fff" />
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#fff' }}>Start Workout Day</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <View style={[styles.emptyCard, { borderColor: T.border }]}>
              <Ionicons name="calendar-outline" size={36} color={T.textDim} />
              <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: T.textMid }}>No Active Split Routines</Text>
              <Text style={{ fontSize: 12, color: T.textDim, textAlign: 'center', lineHeight: 18 }}>
                Select a workout program template or design your custom week split.
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => router.push('/program-discover')}
              style={[styles.primaryBtn, { backgroundColor: T.violet }]}
            >
              <Ionicons name="compass-outline" size={16} color="#fff" />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' }}>Explore Workout Programs</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push('/program-builder')}
              style={[styles.secondaryBtn, { backgroundColor: T.card, borderColor: T.border }]}
            >
              <Ionicons name="add" size={16} color={T.text} />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: T.text }}>Build Custom Split</Text>
            </TouchableOpacity>
          </View>
        )}
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

  activeCard: { borderRadius: 22, padding: 18, borderWidth: 1 },
  emojiWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activeLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  activeTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', marginVertical: 2 },

  dayCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  dayBody: { borderTopWidth: 1, padding: 14, gap: 8 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },

  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 20, padding: 36, alignItems: 'center', gap: 8 }
});
