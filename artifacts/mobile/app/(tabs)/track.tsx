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
import { MetricTrend } from '@/components/MetricTrend';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { TrackedMetric } from '@/context/AppContext';

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

const CATEGORY_META = {
  build: { icon: 'trending-up' as const, emoji: '📈', label: 'Build', color: '#22c55e', desc: 'Do MORE of these' },
  reduce: { icon: 'trending-down' as const, emoji: '📉', label: 'Reduce', color: '#ef4444', desc: 'Do LESS of these' },
  neutral: { icon: 'pulse' as const, emoji: '📊', label: 'Monitor', color: '#6366f1', desc: 'Just track & observe' },
};

function getMiniSparkline(logs: { value: number }[], category: string): string {
  const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  return logs.slice(-7).map(l => {
    if (l.value < 0) return '·';
    if (category === 'reduce') {
      const inv = Math.max(0, 10 - l.value);
      return blocks[Math.floor((inv / 10) * 7)] ?? '▁';
    }
    const v = Math.min(l.value, 10);
    return blocks[Math.floor((v / 10) * 7)] ?? '▁';
  }).join('');
}

function isTodayGood(metric: TrackedMetric, value: number | undefined): boolean {
  if (value === undefined) return false;
  if (metric.category === 'build') return value > 0;
  if (metric.category === 'reduce') return value === 0;
  return value > 0;
}

function getTodayStatus(metric: TrackedMetric, value: number | undefined): 'done' | 'bad' | 'pending' {
  if (value === undefined) return 'pending';
  if (metric.category === 'build') return value > 0 ? 'done' : 'pending';
  if (metric.category === 'reduce') return value === 0 ? 'done' : 'bad';
  return value > 0 ? 'done' : 'pending';
}

function DailyProgressBar({ done, total, colors }: { done: number; total: number; colors: any }) {
  const pct = total > 0 ? done / total : 0;
  const segments = total;
  return (
    <View style={dpStyles.container}>
      <View style={dpStyles.segmentsRow}>
        {Array.from({ length: Math.min(segments, 20) }).map((_, i) => (
          <View
            key={i}
            style={[dpStyles.segment, {
              backgroundColor: i < done ? colors.scoreGreen : colors.border,
              flex: 1,
            }]}
          />
        ))}
      </View>
    </View>
  );
}

const dpStyles = StyleSheet.create({
  container: { gap: 4 },
  segmentsRow: { flexDirection: 'row', gap: 2, height: 4, borderRadius: 2, overflow: 'hidden' },
  segment: { borderRadius: 1 },
});

function QuickLog({ metric, value, onChange, colors }: {
  metric: TrackedMetric;
  value: number | undefined;
  onChange: (v: number) => void;
  colors: any;
}) {
  const catColor = CATEGORY_META[metric.category].color;
  const status = getTodayStatus(metric, value);

  if (metric.inputType === 'boolean') {
    const done = value === 1;
    const isBad = metric.category === 'reduce' && value === 1;
    return (
      <TouchableOpacity
        onPress={() => { onChange(done ? 0 : 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        style={[qlStyles.boolBtn, {
          backgroundColor: done
            ? (isBad ? '#ef444420' : '#22c55e20')
            : colors.background,
          borderColor: done
            ? (isBad ? '#ef4444' : '#22c55e')
            : colors.border,
        }]}
        activeOpacity={0.7}
      >
        <Ionicons
          name={done ? (isBad ? 'close-circle' : 'checkmark-circle') : 'ellipse-outline'}
          size={22}
          color={done ? (isBad ? '#ef4444' : '#22c55e') : colors.mutedForeground}
        />
        <Text style={[qlStyles.boolLabel, {
          color: done ? (isBad ? '#ef4444' : '#22c55e') : colors.mutedForeground,
        }]}>
          {done ? (isBad ? 'Logged' : 'Done') : 'Mark done'}
        </Text>
      </TouchableOpacity>
    );
  }

  if (metric.inputType === 'scale') {
    return (
      <View style={qlStyles.scaleWrap}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => { onChange(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[qlStyles.scaleDot, {
              backgroundColor: (value ?? 0) >= n ? catColor : colors.border,
              width: (value ?? 0) === n ? 20 : 14,
              height: (value ?? 0) === n ? 20 : 14,
              borderRadius: (value ?? 0) === n ? 10 : 7,
            }]}
            activeOpacity={0.7}
          />
        ))}
        {value !== undefined && (
          <Text style={[qlStyles.scaleVal, { color: catColor }]}>{value}/10</Text>
        )}
      </View>
    );
  }

  const current = value ?? 0;
  return (
    <View style={qlStyles.counterWrap}>
      <TouchableOpacity
        onPress={() => { if (current > 0) { onChange(current - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
        style={[qlStyles.counterBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
      <View style={[qlStyles.counterVal, { borderColor: catColor + '40', backgroundColor: catColor + '12' }]}>
        <Text style={[qlStyles.counterNum, { color: catColor }]}>{current}</Text>
        {metric.unitLabel ? (
          <Text style={[qlStyles.counterUnit, { color: catColor }]}>{metric.unitLabel}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={() => { onChange(current + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        style={[qlStyles.counterBtn, { borderColor: catColor, backgroundColor: catColor + '15' }]}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={16} color={catColor} />
      </TouchableOpacity>
    </View>
  );
}

const qlStyles = StyleSheet.create({
  boolBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignSelf: 'flex-start' },
  boolLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  scaleWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  scaleDot: { alignSelf: 'center' },
  scaleVal: { fontSize: 13, fontFamily: 'Inter_700Bold', marginLeft: 6 },
  counterWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  counterVal: { minWidth: 60, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, paddingHorizontal: 10 },
  counterNum: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  counterUnit: { fontSize: 11, fontFamily: 'Inter_500Medium' },
});

function MetricCard({ metric, colors, today }: {
  metric: TrackedMetric;
  colors: any;
  today: string;
}) {
  const { logMetric, getLogForDate, getLogsForMetric, getMetricStreak, getMetricConsistency, deleteMetric } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const log = getLogForDate(metric.id, today);
  const history = getLogsForMetric(metric.id, 14);
  const streak = getMetricStreak(metric.id);
  const consistency = getMetricConsistency(metric.id, 30);

  const catMeta = CATEGORY_META[metric.category];
  const catColor = catMeta.color;
  const status = getTodayStatus(metric, log?.value);
  const sparkline = getMiniSparkline(history, metric.category);

  React.useEffect(() => {
    setNoteText(log?.note ?? '');
    setNoteSaved(false);
  }, [log?.note]);

  const handleLogValue = (val: number) => {
    logMetric(metric.id, today, val, noteText || undefined);
  };

  const handleSaveNote = () => {
    if (log !== undefined) {
      logMetric(metric.id, today, log.value, noteText.trim());
    }
    setNoteSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const statusBg = status === 'done'
    ? catColor + '12'
    : status === 'bad'
      ? '#ef444410'
      : colors.card;
  const statusBorder = status === 'done'
    ? catColor + '40'
    : status === 'bad'
      ? '#ef444440'
      : colors.border;

  const streakColor = streak >= 7 ? '#f59e0b' : streak >= 3 ? catColor : colors.mutedForeground;

  return (
    <View style={[mcStyles.card, {
      backgroundColor: statusBg,
      borderColor: statusBorder,
      borderRadius: colors.radius,
    }]}>
      <View style={mcStyles.header}>
        <View style={[mcStyles.emojiWrap, { backgroundColor: catColor + '18' }]}>
          <Text style={mcStyles.emoji}>{metric.emoji ?? catMeta.emoji}</Text>
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={mcStyles.nameLine}>
            <Text style={[mcStyles.name, { color: colors.foreground }]} numberOfLines={1}>{metric.name}</Text>
            {streak > 0 && (
              <View style={[mcStyles.streakBadge, { backgroundColor: streakColor + '18' }]}>
                <Text style={mcStyles.streakFire}>{streak >= 7 ? '🔥' : '⚡'}</Text>
                <Text style={[mcStyles.streakNum, { color: streakColor }]}>{streak}d</Text>
              </View>
            )}
          </View>
          <Text style={[mcStyles.sparkline, { color: catColor }]}>{sparkline}</Text>
        </View>

        {status === 'done' && (
          <View style={[mcStyles.doneDot, { backgroundColor: catColor }]}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
        {status === 'bad' && (
          <View style={[mcStyles.doneDot, { backgroundColor: '#ef4444' }]}>
            <Ionicons name="alert" size={12} color="#fff" />
          </View>
        )}
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Delete Tracker?',
              `Remove "${metric.name}" and all its history? This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteMetric(metric.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  },
                },
              ],
              { cancelable: true }
            );
          }}
          style={mcStyles.deleteBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={14} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={mcStyles.logRow}>
        <QuickLog metric={metric} value={log?.value} onChange={handleLogValue} colors={colors} />
      </View>

      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={[mcStyles.expandBtn, { borderTopColor: statusBorder }]}
        activeOpacity={0.7}
      >
        <View style={mcStyles.expandBtnLeft}>
          <Ionicons name="analytics-outline" size={12} color={colors.mutedForeground} />
          <Text style={[mcStyles.expandLabel, { color: colors.mutedForeground }]}>
            {consistency}% consistent · {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={colors.mutedForeground} />
      </TouchableOpacity>

      {expanded && (
        <View style={[mcStyles.expandedBody, { borderTopColor: statusBorder }]}>
          <View style={mcStyles.statsRow}>
            <View style={mcStyles.statBlock}>
              <Text style={[mcStyles.statVal, { color: streakColor }]}>{streak}</Text>
              <Text style={[mcStyles.statKey, { color: colors.mutedForeground }]}>Streak</Text>
            </View>
            <View style={[mcStyles.statDivider, { backgroundColor: colors.border }]} />
            <View style={mcStyles.statBlock}>
              <Text style={[mcStyles.statVal, { color: catColor }]}>{consistency}%</Text>
              <Text style={[mcStyles.statKey, { color: colors.mutedForeground }]}>30-day</Text>
            </View>
            <View style={[mcStyles.statDivider, { backgroundColor: colors.border }]} />
            <View style={mcStyles.statBlock}>
              <Text style={[mcStyles.statVal, { color: colors.foreground }]}>
                {history.filter(l => l.value >= 0).length}
              </Text>
              <Text style={[mcStyles.statKey, { color: colors.mutedForeground }]}>Logged</Text>
            </View>
          </View>

          <MetricTrend logs={history} category={metric.category} inputType={metric.inputType} />

          <View style={[mcStyles.noteSection, { backgroundColor: colors.background, borderRadius: 10 }]}>
            <View style={mcStyles.noteHeader}>
              <Ionicons name="create-outline" size={13} color={catColor} />
              <Text style={[mcStyles.noteTitle, { color: catColor }]}>Note for today</Text>
              {log?.note ? <Text style={[mcStyles.noteSaved, { color: '#22c55e' }]}>Saved ✓</Text> : null}
            </View>
            <TextInput
              value={noteText}
              onChangeText={t => { setNoteText(t); setNoteSaved(false); }}
              placeholder="What happened? Any context for this entry…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[mcStyles.noteInput, { color: colors.foreground, borderColor: colors.border }]}
            />
            {noteText.trim().length > 0 && !noteSaved && (
              <TouchableOpacity
                onPress={handleSaveNote}
                style={[mcStyles.noteSaveBtn, { backgroundColor: catColor }]}
                activeOpacity={0.8}
              >
                <Ionicons name="save-outline" size={14} color="#fff" />
                <Text style={mcStyles.noteSaveBtnText}>Save note</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const mcStyles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingBottom: 10 },
  emojiWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontFamily: 'Inter_700Bold', flex: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  streakFire: { fontSize: 11 },
  streakNum: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  sparkline: { fontSize: 12, fontFamily: 'Inter_400Regular', letterSpacing: 1 },
  doneDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logRow: { paddingHorizontal: 14, paddingBottom: 12 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  expandBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  expandLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  expandedBody: { borderTopWidth: 1, padding: 14, gap: 14 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statKey: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  statDivider: { width: 1, height: 28 },
  noteSection: { padding: 12, gap: 8 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', flex: 1 },
  noteSaved: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  noteInput: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  noteSaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  noteSaveBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});

type ModalStep = 'template' | 'configure';

export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { metrics, logMetric, getLogForDate, addCustomMetric, deleteMetric, dayScore, completionPct, journalEntries } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [activeSection, setActiveSection] = useState<'all' | 'build' | 'reduce' | 'neutral'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('template');
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newCategory, setNewCategory] = useState<'build' | 'reduce' | 'neutral'>('build');
  const [newInputType, setNewInputType] = useState<'boolean' | 'counter' | 'scale'>('boolean');
  const [newUnit, setNewUnit] = useState('');

  const hasJournal = journalEntries.some(e => e.date === today);

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
      Alert.alert('Name required', 'Give your tracker a name.');
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

  const completedToday = metrics.filter(m => {
    const log = getLogForDate(m.id, today);
    if (!log) return false;
    if (m.category === 'build') return log.value > 0;
    if (m.category === 'reduce') return log.value === 0;
    return !!log;
  }).length;

  const sections = (['build', 'reduce', 'neutral'] as const).map(cat => ({
    cat,
    meta: CATEGORY_META[cat],
    metrics: metrics.filter(m => m.category === cat),
  }));

  const displayedMetrics = activeSection === 'all'
    ? metrics
    : metrics.filter(m => m.category === activeSection);

  const catColor = (cat: 'build' | 'reduce' | 'neutral') => CATEGORY_META[cat].color;

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, {
          paddingTop: topPadding + 16,
          paddingBottom: Platform.OS === 'web' ? 120 : 100,
        }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Track</Text>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>{dateLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={openModal}
            style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: 12 }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.heroCard, {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroScoreCol}>
              <Text style={[styles.heroScoreNum, { color: colors.scoreGreen }]}>{completedToday}</Text>
              <Text style={[styles.heroScoreOf, { color: colors.mutedForeground }]}>/ {metrics.length}</Text>
              <Text style={[styles.heroScoreLabel, { color: colors.mutedForeground }]}>done today</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.heroStatRow}>
                <View style={styles.heroStat}>
                  <Ionicons name={hasJournal ? 'book' : 'book-outline'} size={14} color={hasJournal ? '#f59e0b' : colors.mutedForeground} />
                  <Text style={[styles.heroStatText, { color: hasJournal ? '#f59e0b' : colors.mutedForeground }]}>
                    {hasJournal ? 'Journal done' : 'Write journal'}
                  </Text>
                </View>
                <View style={styles.heroStat}>
                  <Ionicons name="trophy-outline" size={14} color={dayScore >= 80 ? colors.scoreGreen : colors.mutedForeground} />
                  <Text style={[styles.heroStatText, { color: dayScore >= 80 ? colors.scoreGreen : colors.mutedForeground }]}>
                    {dayScore}% score
                  </Text>
                </View>
              </View>
              <DailyProgressBar done={completedToday} total={metrics.length} colors={colors} />
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                {completedToday === metrics.length && metrics.length > 0
                  ? '🏆 Perfect day!'
                  : `${metrics.length - completedToday} remaining`}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
          {(['all', 'build', 'reduce', 'neutral'] as const).map(s => {
            const isActive = activeSection === s;
            const color = s === 'all' ? colors.primary : CATEGORY_META[s].color;
            const count = s === 'all' ? metrics.length : metrics.filter(m => m.category === s).length;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => { setActiveSection(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.filterChip, {
                  backgroundColor: isActive ? color : colors.card,
                  borderColor: isActive ? color : colors.border,
                }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, { color: isActive ? '#fff' : colors.mutedForeground }]}>
                  {s === 'all' ? '⚡ All' : `${CATEGORY_META[s].emoji} ${CATEGORY_META[s].label}`}
                </Text>
                <View style={[styles.filterCount, { backgroundColor: isActive ? '#ffffff30' : colors.border }]}>
                  <Text style={[styles.filterCountText, { color: isActive ? '#fff' : colors.mutedForeground }]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeSection === 'all' ? (
          sections.map(({ cat, meta, metrics: catMetrics }) => {
            if (catMetrics.length === 0) return null;
            const color = meta.color;
            const doneCat = catMetrics.filter(m => {
              const log = getLogForDate(m.id, today);
              return isTodayGood(m, log?.value);
            }).length;
            return (
              <View key={cat} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: color + '18' }]}>
                    <Text style={styles.sectionEmoji}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{meta.label} Habits</Text>
                    <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>{meta.desc}</Text>
                  </View>
                  <View style={[styles.sectionCount, { backgroundColor: color + '18' }]}>
                    <Text style={[styles.sectionCountText, { color }]}>{doneCat}/{catMetrics.length}</Text>
                  </View>
                </View>
                {catMetrics.map(metric => (
                  <MetricCard key={metric.id} metric={metric} colors={colors} today={today} />
                ))}
              </View>
            );
          })
        ) : (
          <View style={styles.section}>
            {displayedMetrics.length === 0 ? (
              <TouchableOpacity
                onPress={openModal}
                style={[styles.emptyGroup, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={24} color={colors.mutedForeground} />
                <Text style={[styles.emptyGroupText, { color: colors.mutedForeground }]}>
                  Add a {activeSection} tracker
                </Text>
              </TouchableOpacity>
            ) : (
              displayedMetrics.map(metric => (
                <MetricCard key={metric.id} metric={metric} colors={colors} today={today} />
              ))
            )}
          </View>
        )}

        <TouchableOpacity
          onPress={openModal}
          style={[styles.addMoreBtn, { borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.mutedForeground} />
          <Text style={[styles.addMoreBtnText, { color: colors.mutedForeground }]}>Add new tracker</Text>
        </TouchableOpacity>
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
            ) : <View style={{ width: 24 }} />}
            <View style={styles.modalTitleBlock}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {modalStep === 'template' ? 'Add Tracker' : 'Configure Tracker'}
              </Text>
            </View>
            <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {modalStep === 'template' ? (
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>QUICK-START TEMPLATES</Text>
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
                        {CATEGORY_META[t.category].label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.dividerRow, { borderColor: colors.border }]}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or custom</Text>
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

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EMOJI</Text>
              <TextInput
                value={newEmoji}
                onChangeText={setNewEmoji}
                placeholder="e.g. 🏃 🍺 💊"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.textInput, {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                  borderRadius: colors.radius,
                }]}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>HABIT TYPE</Text>
              <View style={styles.catCards}>
                {(Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]).map(cat => {
                  const info = CATEGORY_META[cat];
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
                      <Text style={[styles.catCardDesc, { color: colors.mutedForeground }]}>{info.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>HOW TO LOG IT</Text>
              <View style={styles.inputTypeRow}>
                {(['boolean', 'counter', 'scale'] as const).map(type => {
                  const selected = newInputType === type;
                  const labels = { boolean: 'Yes/No', counter: 'Counter', scale: 'Scale 1–10' };
                  const icons = { boolean: 'checkmark-circle-outline' as const, counter: 'add-circle-outline' as const, scale: 'bar-chart-outline' as const };
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => { setNewInputType(type); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.inputTypeChip, {
                        backgroundColor: selected ? colors.primary + '15' : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: 10,
                      }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={icons[type]} size={18} color={selected ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.inputTypeChipText, { color: selected ? colors.primary : colors.foreground }]}>
                        {labels[type]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {newInputType !== 'boolean' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>UNIT LABEL (optional)</Text>
                  <TextInput
                    value={newUnit}
                    onChangeText={setNewUnit}
                    placeholder="e.g. km, pages, glasses..."
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

              <TouchableOpacity
                onPress={handleAddMetric}
                style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Add Tracker</Text>
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
  content: { paddingHorizontal: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  dateLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderWidth: 1, padding: 16, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroScoreCol: { alignItems: 'center', gap: 0 },
  heroScoreNum: { fontSize: 36, fontFamily: 'Inter_700Bold', lineHeight: 40 },
  heroScoreOf: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  heroScoreLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  heroStatRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  progressLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 4 },
  filterRow: { flexGrow: 0 },
  filterRowContent: { gap: 8, paddingVertical: 2 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  filterChipText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  filterCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  filterCountText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  section: { gap: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionEmoji: { fontSize: 18 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  sectionDesc: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  sectionCount: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sectionCountText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  emptyGroup: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 20, alignItems: 'center', gap: 8, marginBottom: 10 },
  emptyGroupText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14 },
  addMoreBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20, borderBottomWidth: 1 },
  modalTitleBlock: { flex: 1, alignItems: 'center' },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  modalContent: { flex: 1, padding: 16 },
  fieldLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 8, marginTop: 16 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateCard: { width: '47%', borderWidth: 1, padding: 12, gap: 4 },
  templateEmoji: { fontSize: 22, marginBottom: 2 },
  templateName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  templateDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 15 },
  templateBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  templateBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  customBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, paddingVertical: 14, marginBottom: 40 },
  customBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  textInput: { borderWidth: 1, padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  catCards: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  catCard: { flex: 1, borderWidth: 1.5, padding: 12, gap: 4 },
  catCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catCardEmoji: { fontSize: 20 },
  catCardTitle: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  catCardDesc: { fontSize: 10, fontFamily: 'Inter_400Regular', lineHeight: 14 },
  inputTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  inputTypeChip: { flex: 1, borderWidth: 1.5, padding: 12, alignItems: 'center', gap: 6 },
  inputTypeChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8, marginBottom: 40 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
