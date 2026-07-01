import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLOR_OPTIONS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
  '#14b8a6', '#0ea5e9', '#eab308', '#f43f5e'
];

const EMOJI_OPTIONS = ['💪', '🏋️‍♂️', '🏃‍♂️', '🧘', '⚡', '🏆', '🔥', '🎯', '🥗', '🧠', '🛡️', '🌿'];

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Calves', 'Abs/Core', 'Full Body'
];

export default function ProgramBuilderScreen() {
  const {
    exercises,
    programs,
    workoutDays,
    workoutDayExercises,
    createCustomProgram,
    updateCustomProgram
  } = useApp();

  const colors = useColors();
  const params = useLocalSearchParams();
  const id = params.id as string | undefined;
  const isEdit = !!id;
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1); // 1 = General, 2 = Days
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);

  // Days list state
  interface BuilderExercise {
    exerciseId: string;
    name: string;
    targetSets: number;
    targetReps: number;
    targetRpe: number;
  }

  interface BuilderDay {
    id?: string;
    title: string;
    dayNumber: number;
    targetMuscleGroups: string[];
    exercises: BuilderExercise[];
  }

  const [days, setDays] = useState<BuilderDay[]>([
    { title: 'Day 1: Push', dayNumber: 1, targetMuscleGroups: ['Chest', 'Shoulders', 'Triceps'], exercises: [] }
  ]);

  // Exercise selection modal state
  const [exModalOpen, setExModalOpen] = useState(false);
  const [targetDayIndex, setTargetDayIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load existing data if edit mode
  useEffect(() => {
    if (isEdit && id) {
      const existing = programs.find(p => p.id === id);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description || '');
        setColor(existing.color);
        setEmoji(existing.emoji);

        // Find days
        const progDays = workoutDays
          .filter(d => d.programId === id)
          .sort((a, b) => a.dayNumber - b.dayNumber);

        const loadedDays = progDays.map(d => {
          const dayExs = workoutDayExercises
            .filter(de => de.workoutDayId === d.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(de => {
              const exDetails = exercises.find(e => e.id === de.exerciseId);
              return {
                exerciseId: de.exerciseId,
                name: exDetails ? exDetails.name : 'Unknown Exercise',
                targetSets: de.targetSets,
                targetReps: de.targetReps,
                targetRpe: de.targetRpe || 8
              };
            });

          return {
            id: d.id,
            title: d.title,
            dayNumber: d.dayNumber,
            targetMuscleGroups: d.targetMuscleGroups,
            exercises: dayExs
          };
        });

        if (loadedDays.length > 0) {
          setDays(loadedDays);
        }
      }
    }
  }, [isEdit, id, programs, workoutDays, workoutDayExercises, exercises]);

  const addDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDays(prev => [
      ...prev,
      {
        title: `Day ${prev.length + 1}: Routine`,
        dayNumber: prev.length + 1,
        targetMuscleGroups: [],
        exercises: []
      }
    ]);
  };

  const removeDay = (index: number) => {
    if (days.length <= 1) {
      Alert.alert('Cannot Remove', 'Your routine split must contain at least 1 day.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setDays(prev => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 })));
  };

  const updateDayField = (index: number, key: keyof BuilderDay, value: any) => {
    setDays(prev => prev.map((d, i) => i === index ? { ...d, [key]: value } : d));
  };

  const toggleMuscleGroup = (dayIndex: number, group: string) => {
    const day = days[dayIndex];
    const exists = day.targetMuscleGroups.includes(group);
    const updatedGroups = exists
      ? day.targetMuscleGroups.filter(g => g !== group)
      : [...day.targetMuscleGroups, group];
    updateDayField(dayIndex, 'targetMuscleGroups', updatedGroups);
  };

  const openAddExercise = (dayIndex: number) => {
    setTargetDayIndex(dayIndex);
    setSearchQuery('');
    setExModalOpen(true);
  };

  const handleSelectExercise = (ex: any) => {
    if (targetDayIndex === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const day = days[targetDayIndex];
    // Check if already in day
    if (day.exercises.some(e => e.exerciseId === ex.id)) {
      Alert.alert('Duplicate Exercise', 'This exercise is already added to this split day.');
      return;
    }

    const updatedExs = [
      ...day.exercises,
      {
        exerciseId: ex.id,
        name: ex.name,
        targetSets: 3,
        targetReps: 10,
        targetRpe: 8
      }
    ];

    updateDayField(targetDayIndex, 'exercises', updatedExs);
    setExModalOpen(false);
  };

  const removeExerciseFromDay = (dayIndex: number, exId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const day = days[dayIndex];
    const updatedExs = day.exercises.filter(e => e.exerciseId !== exId);
    updateDayField(dayIndex, 'exercises', updatedExs);
  };

  const updateExerciseTarget = (dayIndex: number, exId: string, key: keyof BuilderExercise, val: number) => {
    const day = days[dayIndex];
    const updatedExs = day.exercises.map(e => e.exerciseId === exId ? { ...e, [key]: val } : e);
    updateDayField(dayIndex, 'exercises', updatedExs);
  };

  const filteredExercises = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return exercises.filter(e => e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q));
  }, [exercises, searchQuery]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a name for your workout split routine.');
      return;
    }

    // Ensure all days have at least 1 exercise
    const invalidDay = days.find(d => d.exercises.length === 0);
    if (invalidDay) {
      Alert.alert('Empty Routine Day', `Please add at least one exercise to "${invalidDay.title}".`);
      return;
    }

    try {
      if (isEdit && id) {
        await updateCustomProgram(id, { title, description, emoji, color }, days);
      } else {
        await createCustomProgram({ title, description, emoji, color }, days);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Alert.alert('Save Failed', 'There was an error saving your custom routine split.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Exercise Picker Modal */}
      <Modal visible={exModalOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Exercise</Text>
              <TouchableOpacity onPress={() => setExModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBarContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search Bench Press, Squat, Pullups..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredExercises}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectExercise(item)}
                  style={[styles.exerciseItem, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.exerciseItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.muscleGroup}</Text>
                  </View>
                  <Ionicons name="add-circle" size={20} color={color} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEdit ? 'Edit Custom Split' : 'Create Custom Split'}
          </Text>
        </View>

        {step === 1 ? (
          <View style={{ gap: 20 }}>
            {/* Step Indicators */}
            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 10 }}>
              <View style={[styles.stepBar, { backgroundColor: color }]} />
              <View style={[styles.stepBar, { backgroundColor: colors.border }]} />
            </View>

            {/* Program Icon preview */}
            <View style={{ alignSelf: 'center', marginVertical: 10 }}>
              <View style={[styles.previewIconWrap, { backgroundColor: `${color}15`, borderColor: color }]}>
                <Text style={{ fontSize: 44 }}>{emoji}</Text>
              </View>
            </View>

            {/* Inputs */}
            <View style={styles.inputWrap}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SPLIT PLAN NAME</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Hypertrophy PPL, Arnold Split"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SHORT DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. 3-day split focused on chest, back, legs hypertrophy."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, height: 80, paddingTop: 12 }]}
              />
            </View>

            {/* Emojis selection */}
            <View style={styles.selectorWrap}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CHOOSE EMOJI</Text>
              <View style={styles.gridRow}>
                {EMOJI_OPTIONS.map(em => (
                  <TouchableOpacity
                    key={em}
                    onPress={() => { setEmoji(em); Haptics.selectionAsync(); }}
                    style={[styles.emojiBtn, emoji === em && { borderColor: color, backgroundColor: `${color}15` }]}
                  >
                    <Text style={{ fontSize: 22 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color selection */}
            <View style={styles.selectorWrap}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CHOOSE ACCENT COLOR</Text>
              <View style={styles.gridRow}>
                {COLOR_OPTIONS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { setColor(c); Haptics.selectionAsync(); }}
                    style={[styles.colorBtn, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: '#fff' }]}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setStep(2)}
              style={[styles.primaryBtn, { backgroundColor: color }]}
            >
              <Text style={{ color: '#fff', fontFamily: 'Inter_700Bold' }}>Next: Configure Split Days →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {/* Step Indicators */}
            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 10 }}>
              <View style={[styles.stepBar, { backgroundColor: color }]} />
              <View style={[styles.stepBar, { backgroundColor: color }]} />
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Define the routines in your split and add target exercises.
            </Text>

            {days.map((day, dIdx) => (
              <View key={dIdx} style={[styles.dayBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.dayBlockHeader, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={day.title}
                      onChangeText={val => updateDayField(dIdx, 'title', val)}
                      style={[styles.dayTitleInput, { color: colors.text }]}
                      placeholder="Day Name (e.g. Day 1: Push)"
                    />
                  </View>
                  <TouchableOpacity onPress={() => removeDay(dIdx)} style={styles.deleteDayBtn}>
                    <Ionicons name="trash-outline" size={18} color="#FF5E5E" />
                  </TouchableOpacity>
                </View>

                {/* Muscle target groups */}
                <View style={{ padding: 12, gap: 8 }}>
                  <Text style={[styles.blockLabel, { color: colors.textMuted }]}>TARGET MUSCLES</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {MUSCLE_GROUPS.map(g => {
                      const selected = day.targetMuscleGroups.includes(g);
                      return (
                        <TouchableOpacity
                          key={g}
                          onPress={() => toggleMuscleGroup(dIdx, g)}
                          style={[
                            styles.musclePill,
                            { borderColor: colors.border, backgroundColor: selected ? color : 'transparent' }
                          ]}
                        >
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: selected ? '#fff' : colors.textSecondary }}>
                            {g}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Exercises list in day */}
                <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
                  <Text style={[styles.blockLabel, { color: colors.textMuted }]}>EXERCISES ({day.exercises.length})</Text>

                  {day.exercises.map((ex, eIdx) => (
                    <View key={ex.exerciseId} style={[styles.exRow, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}>
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }} numberOfLines={1}>
                            {ex.name}
                          </Text>
                          <TouchableOpacity onPress={() => removeExerciseFromDay(dIdx, ex.exerciseId)}>
                            <Ionicons name="close" size={16} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>

                        {/* Numeric Targets */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.targetLabel}>SETS</Text>
                            <TextInput
                              value={String(ex.targetSets)}
                              onChangeText={v => updateExerciseTarget(dIdx, ex.exerciseId, 'targetSets', parseInt(v) || 0)}
                              keyboardType="numeric"
                              style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.targetLabel}>REPS</Text>
                            <TextInput
                              value={String(ex.targetReps)}
                              onChangeText={v => updateExerciseTarget(dIdx, ex.exerciseId, 'targetReps', parseInt(v) || 0)}
                              keyboardType="numeric"
                              style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.targetLabel}>RPE (1-10)</Text>
                            <TextInput
                              value={String(ex.targetRpe)}
                              onChangeText={v => updateExerciseTarget(dIdx, ex.exerciseId, 'targetRpe', parseInt(v) || 0)}
                              keyboardType="numeric"
                              style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={() => openAddExercise(dIdx)}
                    style={[styles.addExBtn, { borderColor: color }]}
                  >
                    <Ionicons name="add" size={16} color={color} />
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color }}>Add Exercise</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity onPress={addDay} style={[styles.addDayBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={20} color={color} />
              <Text style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}>Add Routine Split Day</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={[styles.secondaryBtn, { flex: 1, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}>← Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={[styles.primaryBtn, { flex: 2, backgroundColor: color }]}
              >
                <Text style={{ color: '#fff', fontFamily: 'Inter_700Bold' }}>Save Split Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  stepBar: { flex: 1, height: 4, borderRadius: 2 },

  previewIconWrap: { width: 90, height: 90, borderRadius: 28, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  inputWrap: { gap: 6 },
  inputLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 14, fontFamily: 'Inter_500Medium' },

  selectorWrap: { gap: 8 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  colorBtn: { width: 32, height: 32, borderRadius: 16 },

  primaryBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Step 2 Days Styles
  dayBlock: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  dayBlockHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  dayTitleInput: { fontSize: 15, fontFamily: 'Inter_700Bold', padding: 0 },
  deleteDayBtn: { padding: 4 },
  blockLabel: { fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 1 },

  musclePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },

  exRow: { padding: 12, borderRadius: 14, borderWidth: 1 },
  targetLabel: { fontSize: 8, fontFamily: 'Inter_700Bold', color: '#888', marginBottom: 4 },
  numericInput: { height: 36, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontSize: 13, fontFamily: 'Inter_700Bold', padding: 0 },

  addExBtn: { height: 40, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  addDayBtn: { height: 48, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

  // Exercise Picker Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { height: '80%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 16, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 13 },
  exerciseItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  exerciseItemName: { fontSize: 14, fontFamily: 'Inter_700Bold' }
});
