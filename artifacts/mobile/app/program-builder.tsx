import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { CommitmentButton } from '@/components/CommitmentButton';
import { Program, ProgramWeek, WeekTask } from '@/constants/program';
import { BRAND, RADIUS } from '@/constants/colors';
import * as ImagePicker from 'expo-image-picker';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  FadeInRight,
  FadeInLeft,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Config ──────────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
  '#14b8a6', '#0ea5e9', '#eab308', '#f43f5e'
];

const EMOJI_OPTIONS = ['🧭', '🌅', '🧠', '💪', '🧘', '💧', '🥗', '📚', '📈', '🚀', '🔥', '🛡️', '🌿', '🎯', '⚡', '🏆'];

const TASK_TYPES = [
  { key: 'action', label: 'Build Habit', icon: 'flash-outline' as const, color: '#22c55e' },
  { key: 'reduction', label: 'Reduce Habit', icon: 'trending-down-outline' as const, color: '#ef4444' },
  { key: 'reflection', label: 'Checklist Task', icon: 'checkbox-outline' as const, color: '#6366f1' },
] as const;

// ─── Swiss Typography & Inputs ──────────────────────────────────────────────

function SwissInput({ label, value, onChange, placeholder, color, colors, multiline = false, autoFocus = false }: any) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useSharedValue(0);

  useEffect(() => {
    borderAnim.value = withSpring(focused ? 1 : 0);
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    borderColor: focused ? color : colors.border,
    backgroundColor: focused ? `${color}05` : colors.background,
  }));

  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: focused ? color : colors.textSecondary }]}>{label}</Text>
      <Reanimated.View style={[styles.inputContainer, animStyle]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.swissInput, { color: colors.text }, multiline && { height: 100, paddingTop: 16 }]}
          multiline={multiline}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </Reanimated.View>
    </View>
  );
}

// ─── Blueprint Card (Week Editor) ───────────────────────────────────────────

function BlueprintCard({ week, weekIndex, programColor, onUpdate, colors }: any) {
  const [expanded, setExpanded] = useState(false);

  const updateField = (field: string, val: string) => {
    onUpdate(weekIndex, { [field]: val });
  };

  const addTask = () => {
    const newTask: WeekTask = {
      id: `t-${Date.now()}`,
      title: '',
      description: '',
      type: 'action' as any,
      isPersistent: false,
      isHabit: true,
      metricCategory: 'build',
      metricInputType: 'boolean',
      metricScoreWeight: 5,
      metricUnitLabel: '',
    };
    onUpdate(weekIndex, { tasks: [...week.tasks, newTask] });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateTask = (tIdx: number, field: string, val: any) => {
    const nextTasks = [...week.tasks];
    const task = { ...nextTasks[tIdx], [field]: val } as any;
    if (field === 'type') {
      task.isHabit = val !== 'reflection';
      task.metricCategory = val === 'reduction' ? 'reduce' : 'build';
    }
    nextTasks[tIdx] = task;
    onUpdate(weekIndex, { tasks: nextTasks });
  };

  const removeTask = (tIdx: number) => {
    const nextTasks = [...week.tasks];
    nextTasks.splice(tIdx, 1);
    onUpdate(weekIndex, { tasks: nextTasks });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <View style={[styles.bpCard, { backgroundColor: expanded ? colors.surfaceHigh : colors.background, borderColor: expanded ? programColor : colors.border }]}>
      <TouchableOpacity 
        style={styles.bpHeader} 
        activeOpacity={0.7}
        onPress={() => { setExpanded(!expanded); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      >
        <View style={[styles.bpBadge, { backgroundColor: `${programColor}15` }]}>
          <Text style={[styles.bpBadgeText, { color: programColor }]}>W{week.weekNumber}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bpTitle, { color: colors.text }]}>{week.theme || 'Untitled Week'}</Text>
          <Text style={[styles.bpSub, { color: colors.textSecondary }]}>{week.tasks.length} tasks configured</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {expanded && (
        <Reanimated.View entering={FadeIn} style={styles.bpContent}>
          <SwissInput label="WEEKLY THEME" value={week.theme} onChange={(v: string) => updateField('theme', v)} placeholder="e.g. Foundation Building" color={programColor} colors={colors} />
          <SwissInput label="GOAL" value={week.goal} onChange={(v: string) => updateField('goal', v)} placeholder="What must be achieved?" color={programColor} colors={colors} />
          <SwissInput label="BEHAVIORAL RATIONALE (OPTIONAL)" value={week.psychologyRationale} onChange={(v: string) => updateField('psychologyRationale', v)} placeholder="Why does this matter?" color={programColor} colors={colors} multiline />
          
          <View style={styles.bpTasksWrap}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>HABITS & TASKS</Text>
            {week.tasks.map((task: any, idx: number) => (
              <View key={task.id} style={[styles.bpTask, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}>
                <View style={styles.bpTaskHeader}>
                  <TouchableOpacity 
                    onPress={() => updateTask(idx, 'type', task.type === 'action' ? 'reduction' : task.type === 'reduction' ? 'reflection' : 'action')}
                    style={[styles.taskTypeBadge, { backgroundColor: `${TASK_TYPES.find(t=>t.key===task.type)?.color}15` }]}
                  >
                    <Ionicons name={TASK_TYPES.find(t=>t.key===task.type)?.icon as any} size={12} color={TASK_TYPES.find(t=>t.key===task.type)?.color} />
                    <Text style={[styles.taskTypeText, { color: TASK_TYPES.find(t=>t.key===task.type)?.color }]}>
                      {TASK_TYPES.find(t=>t.key===task.type)?.label}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeTask(idx)}>
                    <Ionicons name="trash" size={16} color={BRAND.danger} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  value={task.title} onChangeText={(v) => updateTask(idx, 'title', v)}
                  placeholder="Task title..." placeholderTextColor={colors.textMuted}
                  style={[styles.taskTitleInput, { color: colors.text }]}
                />
              </View>
            ))}
            <TouchableOpacity onPress={addTask} style={[styles.addTaskBtn, { borderColor: programColor }]} activeOpacity={0.7}>
              <Ionicons name="add" size={16} color={programColor} />
              <Text style={[styles.addTaskText, { color: programColor }]}>Add Task</Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProgramBuilderScreen() {
  const { profile, userId, availablePrograms, createCustomProgram, updateCustomProgram } = useApp();
  const colors = useColors();
  const params = useLocalSearchParams();
  const id = params.id as string | undefined;
  const isEdit = !!id;
  const insets = useSafeAreaInsets();

  // Navigation
  const [step, setStep] = useState(0);

  // Payload State
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🚀');
  const [color, setColor] = useState('#6366f1');
  const [identityStatement, setIdentityStatement] = useState('');
  const [stakes, setStakes] = useState('');
  const [gatingThreshold, setGatingThreshold] = useState('50'); // Default 50%
  const [totalWeeks, setTotalWeeks] = useState(4);
  const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Init
  useEffect(() => {
    if (isEdit && id) {
      const existing = availablePrograms.find(p => p.id === id);
      if (existing) {
        setTitle(existing.title);
        setEmoji(existing.emoji);
        setColor(existing.color);
        setTotalWeeks(existing.totalWeeks);
        setWeeks(JSON.parse(JSON.stringify(existing.weeks)));
        
        // Deserialize custom fields from description if present
        try {
          if (existing.description.startsWith('{')) {
            const parsed = JSON.parse(existing.description);
            setIdentityStatement(parsed.identityStatement || '');
            setStakes(parsed.stakes || '');
            setGatingThreshold(parsed.gatingThreshold || '50');
            setImageBase64(parsed.customImageBase64 || null);
          } else {
            setIdentityStatement(existing.description);
          }
        } catch {
          setIdentityStatement(existing.description);
        }
      }
    } else {
      // Init empty weeks
      const initialWeeks = Array.from({ length: 4 }).map((_, i) => ({
        weekNumber: i + 1, theme: '', goal: '', psychologyRationale: '', tasks: [], dailyJournalPrompt: ''
      })) as any;
      setWeeks(initialWeeks);
    }
  }, [id, isEdit]);

  // Sync weeks array length
  useEffect(() => {
    setWeeks(prev => {
      const next = [...prev];
      while (next.length < totalWeeks) {
        next.push({ weekNumber: next.length + 1, theme: '', goal: '', psychologyRationale: '', tasks: [], dailyJournalPrompt: '' } as any);
      }
      if (next.length > totalWeeks) next.splice(totalWeeks);
      return next;
    });
  }, [totalWeeks]);

  const handleUpdateWeek = (idx: number, updated: any) => {
    setWeeks(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...updated };
      return next;
    });
  };

  const saveProtocol = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a protocol title.'); return; }
    
    // Serialize behavioral fields into description to satisfy DB schema
    const serializedDesc = JSON.stringify({
      identityStatement,
      stakes,
      gatingThreshold,
      text: identityStatement,
      customImageBase64: imageBase64
    });

    try {
      const payload = { 
        title, 
        emoji, 
        description: serializedDesc, 
        color, 
        totalWeeks, 
        weeks,
        authorId: userId || undefined
      };
      if (isEdit && id) { await updateCustomProgram(id, payload); }
      else { await createCustomProgram(payload); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save protocol.');
    }
  };

  // ─── Step Renders ───────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <Reanimated.View entering={FadeInRight} exiting={FadeOut} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>The Vision.</Text>
      <Text style={[styles.stepSub, { color: colors.textSecondary }]}>Every transformation starts with clarity.</Text>
      
      <View style={{ marginHorizontal: -24, marginBottom: 32 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiGrid}>
          {EMOJI_OPTIONS.map(e => (
            <TouchableOpacity key={e} onPress={() => { setEmoji(e); Haptics.selectionAsync(); }} style={[styles.emojiCell, { backgroundColor: emoji === e ? `${color}20` : colors.surfaceHigh, borderColor: emoji === e ? color : 'transparent' }]}>
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputWrap}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CUSTOM COVER IMAGE (OPTIONAL)</Text>
        <TouchableOpacity 
          onPress={async () => {
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [16, 9],
              quality: 0.3,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets[0].base64) {
              setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
            }
          }}
          style={[styles.imagePickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
          activeOpacity={0.7}
        >
          {imageBase64 ? (
            <Reanimated.Image source={{ uri: imageBase64 }} style={styles.imagePickerPreview} />
          ) : (
            <>
              <Ionicons name="image-outline" size={24} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 8 }}>Tap to upload cover image</Text>
            </>
          )}
        </TouchableOpacity>
        {imageBase64 && (
          <TouchableOpacity onPress={() => setImageBase64(null)} style={{ position: 'absolute', top: 32, right: 8, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16 }}>
             <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <SwissInput label="PROTOCOL TITLE" value={title} onChange={setTitle} placeholder="e.g. Dopamine Detox" color={color} colors={colors} autoFocus />
      <SwissInput label="IDENTITY STATEMENT" value={identityStatement} onChange={setIdentityStatement} placeholder="I am becoming someone who..." color={color} colors={colors} multiline />
      <SwissInput label="THE STAKES (Optional)" value={stakes} onChange={setStakes} placeholder="If I break this protocol, I will..." color={BRAND.danger} colors={colors} />
    </Reanimated.View>
  );

  const renderStep1 = () => (
    <Reanimated.View entering={FadeInRight} exiting={FadeOut} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>The Architecture.</Text>
      <Text style={[styles.stepSub, { color: colors.textSecondary }]}>Design the structure of your transformation.</Text>
      
      <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 20 }]}>THEME COLOR</Text>
      <View style={{ marginHorizontal: -24, marginBottom: 32 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorGrid}>
          {COLOR_OPTIONS.map(c => (
            <TouchableOpacity key={c} onPress={() => { setColor(c); Haptics.selectionAsync(); }} style={[styles.colorCell, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.background }]} />
          ))}
        </ScrollView>
      </View>

      <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 30 }]}>DURATION: {totalWeeks} WEEKS</Text>
      <View style={styles.durationRow}>
        <TouchableOpacity onPress={() => { setTotalWeeks(Math.max(1, totalWeeks - 1)); Haptics.selectionAsync(); }} style={[styles.durBtn, { backgroundColor: colors.surfaceHigh }]}>
          <Ionicons name="remove" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.durDisplay}>
          <Text style={[styles.durText, { color: colors.text }]}>{totalWeeks}</Text>
        </View>
        <TouchableOpacity onPress={() => { setTotalWeeks(Math.min(12, totalWeeks + 1)); Haptics.selectionAsync(); }} style={[styles.durBtn, { backgroundColor: colors.surfaceHigh }]}>
          <Ionicons name="add" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <SwissInput label="GATING THRESHOLD (%)" value={gatingThreshold} onChange={setGatingThreshold} placeholder="e.g. 50" color={color} colors={colors} />
      <Text style={[styles.helperText, { color: colors.textMuted }]}>Percentage of habits that must be completed to unlock the next week.</Text>
    </Reanimated.View>
  );

  const renderStep2 = () => (
    <Reanimated.View entering={FadeInRight} exiting={FadeOut} style={[styles.stepContainer, { paddingHorizontal: 0 }]}>
      <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>The Blueprints.</Text>
        <Text style={[styles.stepSub, { color: colors.textSecondary }]}>Define the habits and goals for each week.</Text>
      </View>
      
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 16, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        {weeks.map((w, i) => (
          <BlueprintCard key={i} week={w} weekIndex={i} programColor={color} onUpdate={handleUpdateWeek} colors={colors} />
        ))}
      </ScrollView>
    </Reanimated.View>
  );

  const renderStep3 = () => (
    <Reanimated.View entering={FadeInRight} exiting={FadeOut} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Initialization.</Text>
      <Text style={[styles.stepSub, { color: colors.textSecondary }]}>Review your flight path.</Text>
      
      <View style={[styles.flightPathCard, { backgroundColor: `${color}10`, borderColor: `${color}30` }]}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</Text>
        <Text style={[styles.fpTitle, { color: colors.text }]}>{title || 'Untitled Protocol'}</Text>
        <Text style={[styles.fpIdentity, { color: colors.textSecondary }]}>{identityStatement || 'No identity statement set.'}</Text>
        
        <View style={styles.fpStatsRow}>
          <View style={styles.fpStat}>
            <Text style={[styles.fpStatVal, { color: color }]}>{totalWeeks}</Text>
            <Text style={[styles.fpStatLabel, { color: colors.textMuted }]}>Weeks</Text>
          </View>
          <View style={styles.fpStat}>
            <Text style={[styles.fpStatVal, { color: color }]}>{weeks.reduce((acc, w) => acc + w.tasks.length, 0)}</Text>
            <Text style={[styles.fpStatLabel, { color: colors.textMuted }]}>Habits</Text>
          </View>
          <View style={styles.fpStat}>
            <Text style={[styles.fpStatVal, { color: color }]}>{gatingThreshold}%</Text>
            <Text style={[styles.fpStatLabel, { color: colors.textMuted }]}>Gating</Text>
          </View>
        </View>

        {stakes ? (
          <View style={[styles.stakesBadge, { backgroundColor: `${BRAND.danger}20` }]}>
            <Ionicons name="warning" size={14} color={BRAND.danger} />
            <Text style={[styles.stakesText, { color: BRAND.danger }]} numberOfLines={2}>Penalty: {stakes}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: 24, marginBottom: 40 }}>
        <CommitmentButton
          onComplete={async () => saveProtocol()}
          label={isEdit ? 'UPDATE PROGRAM' : 'INITIALIZE PROGRAM'}
          color={color}
          icon="rocket"
          duration={1500}
        />
      </View>
    </Reanimated.View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Swiss Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.stepDots}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.dot, { backgroundColor: step >= i ? color : colors.border, opacity: step >= i ? 1 : 0.5, width: step === i ? 24 : 8 }]} />
          ))}
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => setStep(Math.max(0, step - 1))} 
          style={[styles.navBtn, { opacity: step === 0 ? 0 : 1 }]}
          disabled={step === 0}
        >
          <Text style={[styles.navBtnText, { color: colors.textSecondary }]}>BACK</Text>
        </TouchableOpacity>

        {step < 3 ? (
          <TouchableOpacity 
            onPress={() => {
              if (step === 0 && !title.trim()) { Alert.alert('Required', 'Please enter a title.'); return; }
              setStep(step + 1); 
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }} 
            style={[styles.navBtnPrimary, { backgroundColor: color }]}
            activeOpacity={0.8}
          >
            <Text style={styles.navBtnPrimaryText}>NEXT STEP</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  stepDots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  
  scrollContent: { flexGrow: 1 },
  stepContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  stepTitle: { fontSize: 38, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  stepSub: { fontSize: 16, fontFamily: 'Inter_400Regular', marginTop: 8, marginBottom: 32 },

  // Swiss Inputs
  inputWrap: { marginBottom: 24 },
  inputLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  inputContainer: { borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },
  swissInput: { padding: 16, fontSize: 16, fontFamily: 'Inter_500Medium' },
  helperText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: -16, marginBottom: 24 },

  imagePickerBtn: { height: 120, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagePickerPreview: { width: '100%', height: '100%' },

  // Emoji Grid
  emojiGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 24 },
  emojiCell: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },

  // Color Grid
  colorGrid: { flexDirection: 'row', gap: 16, paddingHorizontal: 24 },
  colorCell: { width: 48, height: 48, borderRadius: 24 },

  // Duration
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 40 },
  durBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  durDisplay: { flex: 1, alignItems: 'center' },
  durText: { fontSize: 42, fontFamily: 'Inter_700Bold' },

  // Blueprint Card
  bpCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  bpHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  bpBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  bpBadgeText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  bpTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: -0.2 },
  bpSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  bpContent: { padding: 16, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  
  bpTasksWrap: { marginTop: 10 },
  bpTask: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  bpTaskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  taskTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  taskTypeText: { fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  taskTitleInput: { fontSize: 15, fontFamily: 'Inter_500Medium', padding: 0 },
  addTaskBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  addTaskText: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  // Flight Path Review
  flightPathCard: { padding: 32, borderRadius: 24, borderWidth: 1, alignItems: 'center', marginBottom: 40 },
  fpTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 8 },
  fpIdentity: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', fontStyle: 'italic', marginBottom: 24 },
  fpStatsRow: { flexDirection: 'row', gap: 24, marginBottom: 24 },
  fpStat: { alignItems: 'center' },
  fpStatVal: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  fpStatLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', marginTop: 4 },
  stakesBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  stakesText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', flexShrink: 1 },

  initBtnWrap: { borderRadius: 20, overflow: 'hidden' },
  initBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 20 },
  initBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 1 },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
  navBtn: { paddingVertical: 12 },
  navBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  navBtnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100 },
  navBtnPrimaryText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
});
