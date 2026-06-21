import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { HabitItem } from '@/components/HabitItem';
import { MetricTrend } from '@/components/MetricTrend';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

const QUICK_TEMPLATES = [
  { emoji: '🏋️', name: 'Gym session', category: 'build' as const, inputType: 'boolean' as const, unitLabel: '', desc: 'Did you train today?' },
  { emoji: '💧', name: 'Water intake', category: 'build' as const, inputType: 'counter' as const, unitLabel: 'glasses', desc: 'Track glasses of water' },
  { emoji: '📖', name: 'Reading', category: 'build' as const, inputType: 'counter' as const, unitLabel: 'pages', desc: 'Pages read today' },
  { emoji: '🚶', name: 'Steps', category: 'build' as const, inputType: 'counter' as const, unitLabel: 'K steps', desc: 'Daily step count' },
  { emoji: '🍭', name: 'Sugar / junk food', category: 'reduce' as const, inputType: 'boolean' as const, unitLabel: '', desc: 'Flag if you indulged' },
  { emoji: '📱', name: 'Social media', category: 'reduce' as const, inputType: 'counter' as const, unitLabel: 'min', desc: 'Minutes of scrolling' },
  { emoji: '😴', name: 'Sleep quality', category: 'neutral' as const, inputType: 'scale' as const, unitLabel: '/10', desc: 'Rate how rested you felt' },
  { emoji: '⚡', name: 'Energy level', category: 'neutral' as const, inputType: 'scale' as const, unitLabel: '/10', desc: 'Overall energy today' },
];

const CATEGORY_INFO = {
  build: {
    icon: 'trending-up' as const,
    emoji: '📈',
    label: 'Build Habits',
    color: '#22c55e',
    description: 'Positive behaviors you want to do MORE of. Each completion earns discipline points.',
    example: 'e.g. Exercise, water, reading, meditation',
  },
  reduce: {
    icon: 'trending-down' as const,
    emoji: '📉',
    label: 'Reduce Habits',
    color: '#ef4444',
    description: 'Harmful behaviors you want to do LESS of or eliminate. Skipping them earns you points.',
    example: 'e.g. Smoking, alcohol, junk food, scrolling',
  },
  neutral: {
    icon: 'pulse' as const,
    emoji: '📊',
    label: 'Track & Monitor',
    color: '#6366f1',
    description: 'Things you just want to observe over time — no judgment, just data.',
    example: 'e.g. Mood, energy, weight, sleep quality',
  },
};

const INPUT_TYPE_INFO = {
  boolean: {
    icon: 'checkmark-circle-outline' as const,
    label: 'Yes / No',
    description: 'Simple done-or-not check. Did it happen today?',
    example: 'E.g. "Did I exercise?" → ✓ or ✗',
  },
  counter: {
    icon: 'add-circle-outline' as const,
    label: 'Count / Number',
    description: 'Log a specific number — how many times, how much, how long.',
    example: 'E.g. "8 glasses of water" or "5 km run"',
  },
  scale: {
    icon: 'bar-chart-outline' as const,
    label: 'Scale 1–10',
    description: 'Rate something on a 1 to 10 scale for nuanced tracking.',
    example: 'E.g. "Mood: 7/10" or "Energy: 4/10"',
  },
};

type Step = 'template' | 'configure';

export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { metrics, logMetric, getLogForDate, getLogsForMetric, addCustomMetric } = useApp();
  const today = new Date().toISOString().split('T')[0];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState<Step>('template');
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newCategory, setNewCategory] = useState<'build' | 'reduce' | 'neutral'>('build');
  const [newInputType, setNewInputType] = useState<'boolean' | 'counter' | 'scale'>('boolean');
  const [newUnit, setNewUnit] = useState('');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const resetModal = () => {
    setNewName(''); setNewEmoji(''); setNewUnit('');
    setNewCategory('build'); setNewInputType('boolean');
    setModalStep('template');
  };

  const openModal = () => { resetModal(); setShowAddModal(true); };
  const closeModal = () => { resetModal(); setShowAddModal(false); };

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setNewName(t.name); setNewCategory(t.category);
    setNewInputType(t.inputType); setNewUnit(t.unitLabel);
    setNewEmoji(t.emoji); setModalStep('configure');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddMetric = async () => {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Give your tracker a name so you can identify it later.');
      return;
    }
    await addCustomMetric({
      name: newName.trim(),
      category: newCategory,
      inputType: newInputType,
      unitLabel: newUnit.trim(),
      emoji: newEmoji || undefined,
      isSensitive: false,
      scoreWeight: 5,
    });
    closeModal();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const grouped = {
    build: metrics.filter(m => m.category === 'build'),
    reduce: metrics.filter(m => m.category === 'reduce'),
    neutral: metrics.filter(m => m.category === 'neutral'),
  };

  const catColor = (cat: keyof typeof CATEGORY_INFO) => ({
    build: colors.scoreGreen,
    reduce: colors.scoreRed,
    neutral: colors.primary,
  }[cat]);

  const completedToday = metrics.filter(m => {
    const log = getLogForDate(m.id, today);
    if (!log) return false;
    if (m.category === 'build') return log.value > 0;
    if (m.category === 'reduce') return log.value === 0;
    return !!log;
  }).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, {
          paddingTop: topPadding + 16,
          paddingBottom: Platform.OS === 'web' ? 120 : 100,
        }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>My Trackers</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {completedToday}/{metrics.length} complete today
            </Text>
          </View>
          <TouchableOpacity
            onPress={openModal}
            style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.explainCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.explainTitle, { color: colors.foreground }]}>How trackers work</Text>
            <Text style={[styles.explainBody, { color: colors.mutedForeground }]}>
              Log your habits every day. Green habits reward you for doing them. Red habits reward you for <Text style={{ fontFamily: 'Inter_600SemiBold' }}>skipping</Text> them. Your Discipline Score updates in real time.
            </Text>
          </View>
        </View>

        {(Object.keys(grouped) as (keyof typeof grouped)[]).map(cat => {
          const group = grouped[cat];
          const info = CATEGORY_INFO[cat];
          const color = catColor(cat);
          return (
            <View key={cat} style={styles.catSection}>
              <View style={[styles.catHeader, { backgroundColor: color + '12', borderColor: color + '30', borderRadius: 10 }]}>
                <Text style={styles.catEmoji}>{info.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catLabel, { color }]}>{info.label}</Text>
                  <Text style={[styles.catDesc, { color: colors.mutedForeground }]}>{info.description}</Text>
                </View>
                <View style={[styles.catCount, { backgroundColor: color + '25' }]}>
                  <Text style={[styles.catCountText, { color }]}>{group.length}</Text>
                </View>
              </View>

              {group.length === 0 ? (
                <TouchableOpacity
                  onPress={openModal}
                  style={[styles.emptyGroup, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.emptyGroupText, { color: colors.mutedForeground }]}>
                    Add a {info.label.toLowerCase().replace(' habits', '')} tracker
                  </Text>
                </TouchableOpacity>
              ) : (
                group.map(metric => {
                  const log = getLogForDate(metric.id, today);
                  const history = getLogsForMetric(metric.id, 7);
                  const isExpanded = expandedId === metric.id;

                  return (
                    <View key={metric.id} style={[styles.metricCard, {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                    }]}>
                      <HabitItem
                        metric={metric}
                        value={log?.value}
                        onToggle={(val) => logMetric(metric.id, today, val)}
                      />
                      <TouchableOpacity
                        onPress={() => setExpandedId(isExpanded ? null : metric.id)}
                        style={[styles.trendToggle, { borderTopColor: colors.border }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="stats-chart-outline" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.trendToggleText, { color: colors.mutedForeground }]}>
                          {isExpanded ? 'Hide 7-day chart' : 'Show 7-day trend'}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={12}
                          color={colors.mutedForeground}
                        />
                      </TouchableOpacity>
                      {isExpanded && (
                        <View style={styles.trendContainer}>
                          <MetricTrend
                            logs={history}
                            category={metric.category}
                            inputType={metric.inputType}
                          />
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.modal, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            {modalStep === 'configure' ? (
              <TouchableOpacity onPress={() => setModalStep('template')} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color={colors.foreground} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
            <View style={styles.modalTitleBlock}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {modalStep === 'template' ? 'Add Tracker' : 'Configure Tracker'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                {modalStep === 'template' ? 'Choose a quick-start or build custom' : 'Set it up exactly how you want'}
              </Text>
            </View>
            <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.stepIndicator, { borderBottomColor: colors.border }]}>
            {(['template', 'configure'] as Step[]).map((s, i) => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, {
                  backgroundColor: modalStep === s ? colors.primary : (modalStep === 'configure' && s === 'template') ? colors.scoreGreen : colors.border,
                }]}>
                  {modalStep === 'configure' && s === 'template'
                    ? <Ionicons name="checkmark" size={10} color="#fff" />
                    : <Text style={styles.stepDotText}>{i + 1}</Text>
                  }
                </View>
                <Text style={[styles.stepLabel, { color: modalStep === s ? colors.primary : colors.mutedForeground }]}>
                  {s === 'template' ? 'Choose type' : 'Configure'}
                </Text>
              </View>
            ))}
          </View>

          {modalStep === 'template' ? (
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>QUICK-START TEMPLATES</Text>
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                Tap any to pre-fill the form — you can adjust it afterwards.
              </Text>

              <View style={styles.templateGrid}>
                {QUICK_TEMPLATES.map((t, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => applyTemplate(t)}
                    style={[styles.templateCard, {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.templateEmoji}>{t.emoji}</Text>
                    <Text style={[styles.templateName, { color: colors.foreground }]}>{t.name}</Text>
                    <Text style={[styles.templateDesc, { color: colors.mutedForeground }]}>{t.desc}</Text>
                    <View style={[styles.templateBadge, { backgroundColor: catColor(t.category) + '20' }]}>
                      <Text style={[styles.templateBadgeText, { color: catColor(t.category) }]}>
                        {CATEGORY_INFO[t.category].label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.dividerRow, { borderColor: colors.border }]}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or build from scratch</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <TouchableOpacity
                onPress={() => setModalStep('configure')}
                style={[styles.customBtn, { borderColor: colors.primary, borderRadius: colors.radius }]}
                activeOpacity={0.8}
              >
                <Ionicons name="construct-outline" size={18} color={colors.primary} />
                <Text style={[styles.customBtnText, { color: colors.primary }]}>Build a custom tracker</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TRACKER NAME</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Morning run, Vitamin D..."
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                style={[styles.textInput, {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                  borderRadius: colors.radius,
                }]}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>WHAT TYPE OF HABIT IS THIS?</Text>
              <View style={styles.catCards}>
                {(Object.keys(CATEGORY_INFO) as (keyof typeof CATEGORY_INFO)[]).map(cat => {
                  const info = CATEGORY_INFO[cat];
                  const color = catColor(cat);
                  const selected = newCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => { setNewCategory(cat); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.catCard, {
                        backgroundColor: selected ? color + '15' : colors.card,
                        borderColor: selected ? color : colors.border,
                        borderRadius: colors.radius,
                      }]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.catCardTop}>
                        <Text style={styles.catCardEmoji}>{info.emoji}</Text>
                        {selected && <Ionicons name="checkmark-circle" size={18} color={color} />}
                      </View>
                      <Text style={[styles.catCardTitle, { color: selected ? color : colors.foreground }]}>
                        {info.label}
                      </Text>
                      <Text style={[styles.catCardDesc, { color: colors.mutedForeground }]}>
                        {info.description}
                      </Text>
                      <Text style={[styles.catCardEx, { color: color + 'AA' }]}>{info.example}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>HOW WILL YOU LOG IT?</Text>
              <View style={styles.inputTypeCards}>
                {(Object.keys(INPUT_TYPE_INFO) as (keyof typeof INPUT_TYPE_INFO)[]).map(type => {
                  const info = INPUT_TYPE_INFO[type];
                  const selected = newInputType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => { setNewInputType(type); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.inputTypeCard, {
                        backgroundColor: selected ? colors.primary + '15' : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: colors.radius,
                      }]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.inputTypeTop}>
                        <Ionicons name={info.icon} size={22} color={selected ? colors.primary : colors.mutedForeground} />
                        {selected && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                      </View>
                      <Text style={[styles.inputTypeTitle, { color: selected ? colors.primary : colors.foreground }]}>
                        {info.label}
                      </Text>
                      <Text style={[styles.inputTypeDesc, { color: colors.mutedForeground }]}>
                        {info.description}
                      </Text>
                      <View style={[styles.inputTypeExample, { backgroundColor: colors.border + '40' }]}>
                        <Text style={[styles.inputTypeExText, { color: colors.mutedForeground }]}>{info.example}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {newInputType !== 'boolean' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    UNIT LABEL <Text style={{ fontFamily: 'Inter_400Regular', letterSpacing: 0 }}>(optional)</Text>
                  </Text>
                  <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                    Adds context to the number — what does each unit mean?
                  </Text>
                  <TextInput
                    value={newUnit}
                    onChangeText={setNewUnit}
                    placeholder="e.g. km, pages, glasses, minutes..."
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.textInput, {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                      borderRadius: colors.radius,
                    }]}
                  />
                </>
              )}

              <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: catColor(newCategory) + '50', borderRadius: colors.radius }]}>
                <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>PREVIEW</Text>
                <Text style={[styles.previewName, { color: colors.foreground }]}>
                  {newEmoji ? `${newEmoji} ` : ''}{newName || 'Your tracker name'}
                </Text>
                <Text style={[styles.previewMeta, { color: colors.mutedForeground }]}>
                  {CATEGORY_INFO[newCategory].label} · {INPUT_TYPE_INFO[newInputType].label}
                  {newUnit ? ` · logged in ${newUnit}` : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleAddMetric}
                style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Add to My Trackers</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  explainCard: {
    flexDirection: 'row', gap: 10, padding: 14, borderWidth: 1, marginBottom: 8, alignItems: 'flex-start',
  },
  explainTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  explainBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  catSection: { gap: 6, marginTop: 8 },
  catHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 10, borderWidth: 1 },
  catEmoji: { fontSize: 22, lineHeight: 26 },
  catLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  catDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 16, marginTop: 2 },
  catCount: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catCountText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  emptyGroup: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10,
  },
  emptyGroupText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  metricCard: { borderWidth: 1, overflow: 'hidden', marginBottom: 2 },
  trendToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderTopWidth: 1, gap: 5,
  },
  trendToggleText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  trendContainer: { paddingHorizontal: 14, paddingBottom: 12 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 24, borderBottomWidth: 1,
  },
  modalTitleBlock: { alignItems: 'center', flex: 1 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  modalSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  stepIndicator: {
    flexDirection: 'row', justifyContent: 'center', gap: 32,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },
  stepLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  modalContent: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 6, marginTop: 20 },
  fieldHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 12, marginTop: -4, lineHeight: 16 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  templateCard: {
    width: '47%', borderWidth: 1, padding: 12, gap: 5,
  },
  templateEmoji: { fontSize: 24, marginBottom: 2 },
  templateName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  templateDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 14 },
  templateBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  templateBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20, borderTopWidth: 0 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  customBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderWidth: 1.5, marginBottom: 32,
  },
  customBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  textInput: {
    borderWidth: 1, padding: 14, fontSize: 16, fontFamily: 'Inter_400Regular', marginBottom: 4,
  },
  catCards: { gap: 10 },
  catCard: { borderWidth: 1.5, padding: 14, gap: 4 },
  catCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catCardEmoji: { fontSize: 24 },
  catCardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  catCardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  catCardEx: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  inputTypeCards: { gap: 10 },
  inputTypeCard: { borderWidth: 1.5, padding: 14, gap: 5 },
  inputTypeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputTypeTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  inputTypeDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  inputTypeExample: { padding: 8, borderRadius: 6, marginTop: 4 },
  inputTypeExText: { fontSize: 11, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  previewCard: { borderWidth: 1.5, padding: 14, gap: 4, marginTop: 20, marginBottom: 4 },
  previewLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  previewName: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  previewMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginTop: 16, marginBottom: 40,
  },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
