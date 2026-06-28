import * as Haptics from 'expo-haptics';
import React, { useRef, useState, useEffect } from 'react';
import {
  Alert,
  Animated,
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { TrackedMetric, DailyLog, HabitContext } from '@/context/AppContext';
import { GlassCard } from '@/components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMiniSparkline(logs: { value: number }[]): string {
  const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  return logs.slice(-7).map(l => {
    if (l.value < 0) return '·';
    const v = Math.min(l.value === 0 ? 0 : (l.value / 10), 1);
    return blocks[Math.floor(v * 7)] ?? '▁';
  }).join('');
}

function isGood(metric: TrackedMetric, value: number | undefined): boolean {
  if (value === undefined) return false;
  if (metric.category === 'build') return value > 0;
  if (metric.category === 'reduce') return value === 0;
  return value > 0;
}

// ─── Circular Ring ────────────────────────────────────────────────────────────
function CircularRing({ pct, size, strokeW, color, children }: {
  pct: number; size: number; strokeW: number; color: string; children?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* track */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeW, borderColor: colors.border, opacity: 0.5,
      }} />
      {/* filled arc using simple rotate/border rendering */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeW,
        borderTopColor: color,
        borderRightColor: pct > 0.25 ? color : 'transparent',
        borderBottomColor: pct > 0.5 ? color : 'transparent',
        borderLeftColor: pct > 0.75 ? color : 'transparent',
        transform: [{ rotate: '-90deg' }],
      }} />
      {children}
    </View>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TRIGGERS = [
  { key: 'stress', label: 'Stress', emoji: '😰' },
  { key: 'boredom', label: 'Boredom', emoji: '😑' },
  { key: 'social', label: 'Social', emoji: '👥' },
  { key: 'habit', label: 'Auto-pilot', emoji: '🤖' },
  { key: 'craving', label: 'Craving', emoji: '🤤' },
  { key: 'other', label: 'Other', emoji: '🤷' },
] as const;

const SETTINGS = [
  { key: 'home', label: 'Home', emoji: '🏠' },
  { key: 'work', label: 'Work', emoji: '💼' },
  { key: 'social', label: 'Social', emoji: '🎉' },
  { key: 'commute', label: 'Commute', emoji: '🚌' },
  { key: 'other', label: 'Other', emoji: '📍' },
] as const;

// ─── Intensity Dots (Slider alternative) ──────────────────────────────────────
function IntensityDots({ value, onChange, color, label }: {
  value: number; onChange: (v: number) => void; color: string; label: string;
}) {
  const colors = useColors();
  return (
    <View style={csStyles.dotRow}>
      <Text style={[csStyles.dotLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={csStyles.dots}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n} onPress={() => { onChange(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[csStyles.dot, { backgroundColor: value >= n ? color : colors.border, transform: [{ scale: value === n ? 1.2 : 1 }] }]}
            activeOpacity={0.7}
          />
        ))}
      </View>
      <Text style={[csStyles.dotNum, { color }]}>{value || '–'}/5</Text>
    </View>
  );
}

// ─── Context Log Sheet ────────────────────────────────────────────────────────
function ContextSheet({ metric, existingLog, onSave, onCancel, colors }: {
  metric: TrackedMetric;
  existingLog?: DailyLog;
  onSave: (value: number, ctx: HabitContext) => void;
  onCancel: () => void;
  colors: any;
}) {
  const isReduce = metric.category === 'reduce';
  const isBool = metric.inputType === 'boolean';
  const isCounter = metric.inputType === 'counter';

  const [counterVal, setCounterVal] = useState(existingLog?.value ?? 0);
  const [boolDone, setBoolDone] = useState((existingLog?.value ?? 0) === 1);
  const [scaleVal, setScaleVal] = useState(existingLog?.value ?? 5);

  const [trigger, setTrigger] = useState<HabitContext['trigger']>(existingLog?.context?.trigger);
  const [setting, setSetting] = useState<HabitContext['setting']>(existingLog?.context?.setting);
  const [intensity, setIntensity] = useState(existingLog?.context?.intensity ?? 0);
  const [quality, setQuality] = useState(existingLog?.context?.quality ?? 0);
  const [note, setNote] = useState(existingLog?.context?.note ?? '');

  const catColor = isReduce ? colors.brand.danger : metric.category === 'build' ? colors.brand.success : colors.brand.primary;

  const getValue = () => {
    if (isBool) return boolDone ? 1 : 0;
    if (isCounter) return counterVal;
    return scaleVal;
  };

  const handleSave = () => {
    const ctx: HabitContext = {};
    if (trigger) ctx.trigger = trigger;
    if (setting) ctx.setting = setting;
    if (intensity > 0) ctx.intensity = intensity;
    if (quality > 0) ctx.quality = quality;
    if (note.trim()) ctx.note = note.trim();
    onSave(getValue(), ctx);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[csStyles.sheet, { paddingBottom: 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[csStyles.sheetHandle, { backgroundColor: colors.border }]} />
        <View style={csStyles.sheetHeader}>
          <View style={[csStyles.sheetEmojiWrap, { backgroundColor: catColor + '15', borderColor: catColor + '30', borderWidth: 1 }]}>
            <Text style={csStyles.sheetEmoji}>{metric.emoji ?? (isReduce ? '⚠️' : '✅')}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[csStyles.sheetTitle, { color: colors.text }]}>{metric.name}</Text>
            <Text style={[csStyles.sheetSub, { color: colors.textSecondary }]}>
              {isReduce ? 'Log this slip-up with context' : 'Log your progress today'}
            </Text>
          </View>
        </View>

        {/* Value Capture Card */}
        <View style={[csStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[csStyles.sectionLabel, { color: colors.textSecondary }]}>TODAY'S VALUE</Text>
          {isBool && (
            <View style={csStyles.boolRow}>
              <TouchableOpacity
                onPress={() => { setBoolDone(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[csStyles.boolBtn, {
                  backgroundColor: !boolDone ? (isReduce ? colors.brand.success + '15' : colors.surfaceHigh) : colors.surface,
                  borderColor: !boolDone ? (isReduce ? colors.brand.success : colors.border) : colors.border,
                }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 22 }}>{isReduce ? '✅' : '🔲'}</Text>
                <Text style={[csStyles.boolBtnText, { color: !boolDone ? (isReduce ? colors.brand.success : colors.text) : colors.textSecondary }]}>
                  {isReduce ? 'Stayed Clean' : 'Not Done'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setBoolDone(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                style={[csStyles.boolBtn, {
                  backgroundColor: boolDone ? (isReduce ? colors.brand.danger + '15' : catColor + '15') : colors.surface,
                  borderColor: boolDone ? (isReduce ? colors.brand.danger : catColor) : colors.border,
                }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 22 }}>{isReduce ? '❌' : '✅'}</Text>
                <Text style={[csStyles.boolBtnText, { color: boolDone ? (isReduce ? colors.brand.danger : catColor) : colors.textSecondary }]}>
                  {isReduce ? 'Slipped Up' : 'Done!'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {isCounter && (
            <View style={csStyles.counterRow}>
              <TouchableOpacity
                onPress={() => { if (counterVal > 0) { setCounterVal(c => c - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                style={[csStyles.counterBtn, { borderColor: colors.border, backgroundColor: colors.surfaceHigh }]}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={[csStyles.counterCenter, { borderColor: catColor + '40', backgroundColor: catColor + '10' }]}>
                <Text style={[csStyles.counterNum, { color: catColor }]}>{counterVal}</Text>
                {metric.unitLabel ? <Text style={[csStyles.counterUnit, { color: catColor + 'aa' }]}>{metric.unitLabel}</Text> : null}
              </View>
              <TouchableOpacity
                onPress={() => { setCounterVal(c => c + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                style={[csStyles.counterBtn, { borderColor: catColor, backgroundColor: catColor + '15' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color={catColor} />
              </TouchableOpacity>
            </View>
          )}
          {metric.inputType === 'scale' && (
            <View style={csStyles.scaleContainer}>
              <View style={csStyles.scaleWrap}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => { setScaleVal(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[csStyles.scaleDot, {
                      backgroundColor: scaleVal >= n ? catColor : colors.border,
                      width: scaleVal === n ? 24 : 16,
                      height: scaleVal === n ? 24 : 16,
                      borderRadius: scaleVal === n ? 12 : 8,
                    }]}
                    activeOpacity={0.7}
                  />
                ))}
              </View>
              <Text style={[csStyles.scaleNum, { color: catColor }]}>{scaleVal}/10</Text>
            </View>
          )}
        </View>

        {/* Reduction Slips Context */}
        {isReduce && boolDone && (
          <>
            <View style={[csStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[csStyles.sectionLabel, { color: colors.textSecondary }]}>WHAT TRIGGERED IT?</Text>
              <View style={csStyles.chipGrid}>
                {TRIGGERS.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => { setTrigger(t.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[csStyles.chip, {
                      backgroundColor: trigger === t.key ? colors.brand.danger + '15' : colors.surfaceHigh,
                      borderColor: trigger === t.key ? colors.brand.danger : colors.border,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Text style={csStyles.chipEmoji}>{t.emoji}</Text>
                    <Text style={[csStyles.chipLabel, { color: trigger === t.key ? colors.brand.danger : colors.text }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[csStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[csStyles.sectionLabel, { color: colors.textSecondary }]}>WHERE WERE YOU?</Text>
              <View style={csStyles.chipGrid}>
                {SETTINGS.map(s => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => { setSetting(s.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[csStyles.chip, {
                      backgroundColor: setting === s.key ? colors.brand.danger + '15' : colors.surfaceHigh,
                      borderColor: setting === s.key ? colors.brand.danger : colors.border,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Text style={csStyles.chipEmoji}>{s.emoji}</Text>
                    <Text style={[csStyles.chipLabel, { color: setting === s.key ? colors.brand.danger : colors.text }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[csStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IntensityDots value={intensity} onChange={setIntensity} color={colors.brand.danger} label="Urge Strength" />
            </View>
          </>
        )}

        {/* Build Quality Context */}
        {!isReduce && (
          <View style={[csStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IntensityDots value={quality} onChange={setQuality} color={catColor} label="Session Quality" />
          </View>
        )}

        {/* Notes (text input) */}
        <View style={[csStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[csStyles.sectionLabel, { color: colors.textSecondary }]}>NOTES & REFLECTION (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={isReduce ? 'What was on your mind? What will you do differently tomorrow?' : 'Any wins? How did you design your environment?'}
            placeholderTextColor={colors.textDim}
            multiline
            style={[csStyles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceHigh }]}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity onPress={handleSave} activeOpacity={0.88}>
          <LinearGradient
            colors={isReduce ? [colors.brand.danger, colors.brand.dangerLight] : colors.gradients.primaryShort}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={csStyles.saveBtnGradient}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={csStyles.saveBtnText}>Save Log</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const csStyles = StyleSheet.create({
  sheet: { padding: 20, gap: 14 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  sheetEmojiWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetEmoji: { fontSize: 26 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  sheetSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  section: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  sectionLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  boolRow: { flexDirection: 'row', gap: 10 },
  boolBtn: { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  boolBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 14, justifyContent: 'center' },
  counterBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  counterCenter: { minWidth: 100, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 18 },
  counterNum: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  counterUnit: { fontSize: 13, fontFamily: 'Inter_500Medium', alignSelf: 'flex-end', paddingBottom: 4 },
  scaleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scaleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scaleDot: { alignSelf: 'center' },
  scaleNum: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipEmoji: { fontSize: 15 },
  chipLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', width: 100 },
  dots: { flexDirection: 'row', gap: 8, flex: 1 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  dotNum: { fontSize: 13, fontFamily: 'Inter_700Bold', width: 28, textAlign: 'right' },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20, minHeight: 72, textAlignVertical: 'top' },
  saveBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 16, marginTop: 6 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});

// ─── Habit Card (Grid Item) ───────────────────────────────────────────────────
function HabitCard({ metric, today, isProgram, programColor, colors }: {
  metric: TrackedMetric; today: string; isProgram: boolean; programColor?: string; colors: any;
}) {
  const { logMetric, getLogForDate, getLogsForMetric, getMetricStreak, getMetricConsistency, deleteMetric } = useApp();
  const [showSheet, setShowSheet] = useState(false);
  const scale = useSharedValue(1);

  const log = getLogForDate(metric.id, today);
  const history = getLogsForMetric(metric.id, 14);
  const streak = getMetricStreak(metric.id);
  const consistency = getMetricConsistency(metric.id, 30);

  const isReduce = metric.category === 'reduce';
  const isBuild = metric.category === 'build';
  const done = isGood(metric, log?.value);
  const hasContext = !!(log?.context && Object.keys(log.context).length > 0);

  const accentColor = isProgram && programColor
    ? programColor
    : isReduce ? colors.brand.danger : isBuild ? colors.brand.success : colors.brand.primary;

  const sparkline = getMiniSparkline(history);

  const handleSave = (value: number, ctx: HabitContext) => {
    logMetric(metric.id, today, value, ctx.note, ctx);
    setShowSheet(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const cardBg = done
    ? accentColor + '10'
    : isReduce && log?.value && log.value > 0 ? colors.brand.danger + '10' : colors.surface;
  const cardBorder = done
    ? accentColor + '50'
    : isReduce && log?.value && log.value > 0 ? colors.brand.danger + '40' : colors.border;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => { setShowSheet(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        style={{ marginBottom: 10 }}
      >
        <AnimatedReanimated.View
          style={[
            hcStyles.card,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              borderWidth: isProgram ? 1.5 : 1,
              borderRadius: 18,
            },
            animatedStyle
          ]}
        >
          <View style={hcStyles.top}>
            {/* Streak ring + emoji */}
            <View style={hcStyles.iconArea}>
              <View style={[hcStyles.emojiRing, {
                borderColor: streak >= 3 ? accentColor : 'transparent',
                borderWidth: streak >= 3 ? 2 : 0,
                backgroundColor: accentColor + '15',
              }]}>
                <Text style={hcStyles.emoji}>{metric.emoji ?? (isReduce ? '⚠️' : '✅')}</Text>
              </View>
              {streak >= 1 && (
                <View style={[hcStyles.streakPill, { backgroundColor: accentColor }]}>
                  <Text style={hcStyles.streakPillText}>{streak}🔥</Text>
                </View>
              )}
            </View>

            {/* Info */}
            <View style={{ flex: 1, gap: 3 }}>
              <View style={hcStyles.nameRow}>
                <Text style={[hcStyles.name, { color: colors.text }]} numberOfLines={1}>{metric.name}</Text>
                {isProgram && (
                  <View style={[hcStyles.protocolBadge, { backgroundColor: accentColor + '20' }]}>
                    <Text style={[hcStyles.protocolBadgeText, { color: accentColor }]}>Protocol</Text>
                  </View>
                )}
              </View>
              <Text style={[hcStyles.spark, { color: accentColor }]}>{sparkline}</Text>
              <Text style={[hcStyles.consistency, { color: colors.textSecondary }]}>
                {consistency}% consistent · {streak > 0 ? `${streak}d streak` : 'Start today'}
              </Text>
            </View>

            {/* Status Button representation */}
            <View style={[hcStyles.statusDot, {
              backgroundColor: done ? accentColor : (isReduce && log?.value ? colors.brand.danger : colors.border + '80'),
            }]}>
              <Ionicons
                name={done ? 'checkmark' : (isReduce && log?.value ? 'close' : 'add')}
                size={14}
                color={done || (isReduce && log?.value) ? '#fff' : colors.textSecondary}
              />
            </View>
          </View>

          {/* Context Preview block */}
          {log && hasContext && (
            <View style={[hcStyles.contextPreview, { backgroundColor: accentColor + '10', borderColor: accentColor + '20' }]}>
              {log.context?.trigger && (
                <View style={[hcStyles.ctxChip, { backgroundColor: colors.surfaceHigh }]}>
                  <Text style={[hcStyles.ctxChipText, { color: colors.text }]}>{TRIGGERS.find(t => t.key === log.context!.trigger)?.emoji} {log.context.trigger}</Text>
                </View>
              )}
              {log.context?.setting && (
                <View style={[hcStyles.ctxChip, { backgroundColor: colors.surfaceHigh }]}>
                  <Text style={[hcStyles.ctxChipText, { color: colors.text }]}>{SETTINGS.find(s => s.key === log.context!.setting)?.emoji} {log.context.setting}</Text>
                </View>
              )}
              {(log.context?.intensity ?? 0) > 0 && (
                <View style={[hcStyles.ctxChip, { backgroundColor: colors.surfaceHigh }]}>
                  <Text style={[hcStyles.ctxChipText, { color: colors.text }]}>⚡ Intensity {log.context?.intensity}/5</Text>
                </View>
              )}
              {(log.context?.quality ?? 0) > 0 && (
                <View style={[hcStyles.ctxChip, { backgroundColor: colors.surfaceHigh }]}>
                  <Text style={[hcStyles.ctxChipText, { color: colors.text }]}>⭐ Quality {log.context?.quality}/5</Text>
                </View>
              )}
              {log.context?.note && (
                <Text style={[hcStyles.ctxNote, { color: colors.textSecondary }]} numberOfLines={1}>
                  "{log.context.note}"
                </Text>
              )}
            </View>
          )}

          {/* Logged simple row */}
          {log && !hasContext && (
            <View style={[hcStyles.loggedSimple, { borderTopColor: cardBorder }]}>
              <Text style={[hcStyles.loggedSimpleText, { color: accentColor }]}>
                {metric.inputType === 'boolean'
                  ? (done ? '✓ Logged' : '✗ Slipped')
                  : metric.inputType === 'counter'
                    ? `${log.value}${metric.unitLabel ? ' ' + metric.unitLabel : ''} logged`
                    : `${log.value}/10 logged`}
              </Text>
              <TouchableOpacity onPress={() => setShowSheet(true)} activeOpacity={0.7}>
                <Text style={[hcStyles.addContextText, { color: accentColor }]}>+ Add context</Text>
              </TouchableOpacity>
            </View>
          )}
        </AnimatedReanimated.View>
      </Pressable>

      <Modal visible={showSheet} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[sheetHeaderStyles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowSheet(false)} style={sheetHeaderStyles.cancelBtn} activeOpacity={0.7}>
              <Text style={[sheetHeaderStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Delete Tracker?', `Remove "${metric.name}" and all its history?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => { deleteMetric(metric.id); setShowSheet(false); } },
                ]);
              }}
              style={sheetHeaderStyles.deleteBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={colors.brand.danger} />
            </TouchableOpacity>
          </View>
          <ContextSheet metric={metric} existingLog={log} onSave={handleSave} onCancel={() => setShowSheet(false)} colors={colors} />
        </View>
      </Modal>
    </>
  );
}

const hcStyles = StyleSheet.create({
  card: { padding: 14, gap: 10, borderWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconArea: { alignItems: 'center', gap: 4 },
  emojiRing: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  streakPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },
  streakPillText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontFamily: 'Inter_700Bold', flex: 1 },
  protocolBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  protocolBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  spark: { fontSize: 11, fontFamily: 'Inter_400Regular', letterSpacing: 1.5 },
  consistency: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  statusDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  contextPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, borderRadius: 12, borderWidth: 1 },
  ctxChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  ctxChipText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  ctxNote: { fontSize: 11, fontFamily: 'Inter_400Regular', fontStyle: 'italic', width: '100%' },
  loggedSimple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8 },
  loggedSimpleText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  addContextText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});

const sheetHeaderStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  cancelBtn: { paddingVertical: 4 },
  cancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef444415' },
});

// ─── Templates Constants ──────────────────────────────────────────────────────
const QUICK_TEMPLATES = [
  { emoji: '🏋️', name: 'Gym Session', category: 'build' as const, inputType: 'boolean' as const, unitLabel: '' },
  { emoji: '💧', name: 'Water Intake', category: 'build' as const, inputType: 'counter' as const, unitLabel: 'glasses' },
  { emoji: '📖', name: 'Reading', category: 'build' as const, inputType: 'counter' as const, unitLabel: 'pages' },
  { emoji: '🚶', name: 'Steps Goal', category: 'build' as const, inputType: 'counter' as const, unitLabel: 'K steps' },
  { emoji: '🍭', name: 'Sugar & Junk', category: 'reduce' as const, inputType: 'boolean' as const, unitLabel: '' },
  { emoji: '🚬', name: 'Cigarettes', category: 'reduce' as const, inputType: 'counter' as const, unitLabel: 'cigs' },
  { emoji: '🍺', name: 'Alcohol', category: 'reduce' as const, inputType: 'counter' as const, unitLabel: 'drinks' },
  { emoji: '📱', name: 'Screen Time', category: 'reduce' as const, inputType: 'counter' as const, unitLabel: 'min' },
  { emoji: '⚡', name: 'Energy Level', category: 'neutral' as const, inputType: 'scale' as const, unitLabel: '/10' },
  { emoji: '😴', name: 'Sleep Quality', category: 'neutral' as const, inputType: 'scale' as const, unitLabel: '/10' },
];

// ─── Main Tracker Component ───────────────────────────────────────────────────
export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    metrics, getLogForDate, addCustomMetric, dayScore, journalEntries,
    profile, availablePrograms,
  } = useApp();
  
  const today = new Date().toISOString().split('T')[0];
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState<'template' | 'configure'>('template');
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newCategory, setNewCategory] = useState<'build' | 'reduce' | 'neutral'>('build');
  const [newInputType, setNewInputType] = useState<'boolean' | 'counter' | 'scale'>('boolean');
  const [newUnit, setNewUnit] = useState('');
  const [activeSection, setActiveSection] = useState<'all' | 'protocol' | 'routines'>('all');

  const hasJournal = journalEntries.some(e => e.date === today);

  const programColorMap: Record<string, string> = {};
  for (const programId of profile.activeProgramIds) {
    const prog = availablePrograms.find(p => p.id === programId);
    if (!prog) continue;
    metrics.forEach(m => {
      if ((m as any).programId === programId) {
        programColorMap[m.id] = prog.color;
      }
    });
  }
  
  const protocolMetrics = metrics.filter(m => (m as any).programId != null);
  const routineMetrics = metrics.filter(m => (m as any).programId == null);

  const completedToday = metrics.filter(m => {
    const log = getLogForDate(m.id, today);
    return isGood(m, log?.value);
  }).length;
  const totalMetrics = metrics.length;
  const ringPct = totalMetrics > 0 ? completedToday / totalMetrics : 0;

  const ringColor = ringPct >= 1 ? colors.brand.success : ringPct >= 0.5 ? colors.brand.primary : colors.brand.warning;
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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
    if (!newName.trim()) { Alert.alert('Name required', 'Give your tracker a name.'); return; }
    await addCustomMetric({
      name: newName.trim(), category: newCategory, inputType: newInputType,
      unitLabel: newUnit.trim(), emoji: newEmoji || undefined,
      isSensitive: false, scoreWeight: 5,
    });
    closeModal();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const displayMetrics = activeSection === 'protocol'
    ? protocolMetrics
    : activeSection === 'routines'
      ? routineMetrics
      : metrics;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Decorative radial gradient blob */}
      <View style={styles.blurBlobContainer}>
        <LinearGradient
          colors={[colors.brand.primaryGlow, 'transparent']}
          style={styles.blurBlob}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, {
          paddingTop: topPadding + 12,
          paddingBottom: Platform.OS === 'web' ? 120 : 110,
        }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title bar */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Trackers</Text>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{dateLabel}</Text>
          </View>
          <TouchableOpacity onPress={openModal} activeOpacity={0.88}>
            <LinearGradient
              colors={colors.gradients.primaryShort}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addBtnGradient}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Hero status card */}
        <GlassCard intensity={30}>
          <View style={styles.heroCardContent}>
            <CircularRing pct={ringPct} size={86} strokeW={7} color={ringColor}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.ringNum, { color: ringColor }]}>{completedToday}</Text>
                <Text style={[styles.ringDen, { color: colors.textSecondary }]}>/{totalMetrics}</Text>
              </View>
            </CircularRing>

            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[styles.heroLabel, { color: colors.text }]}>
                {completedToday === totalMetrics && totalMetrics > 0
                  ? '🏆 Perfect day completed!'
                  : completedToday > 0
                    ? `${totalMetrics - completedToday} left to complete`
                    : 'Start logging habits'}
              </Text>
              
              <View style={styles.heroStatRow}>
                <View style={styles.heroStat}>
                  <Ionicons name="trophy-outline" size={13} color={dayScore >= 80 ? colors.brand.success : colors.textSecondary} />
                  <Text style={[styles.heroStatText, { color: dayScore >= 80 ? colors.brand.success : colors.textSecondary }]}>
                    {dayScore}% Score
                  </Text>
                </View>
                <View style={styles.heroStat}>
                  <Ionicons name={hasJournal ? 'book' : 'book-outline'} size={13} color={hasJournal ? colors.brand.primaryLight : colors.textSecondary} />
                  <Text style={[styles.heroStatText, { color: hasJournal ? colors.brand.primaryLight : colors.textSecondary }]}>
                    {hasJournal ? 'Journaled ✓' : 'Journal open'}
                  </Text>
                </View>
              </View>
              {/* Progress bar */}
              <View style={[styles.progressBar, { backgroundColor: colors.surfaceHigh }]}>
                <View style={[styles.progressFill, { width: `${ringPct * 100}%` as any, backgroundColor: ringColor }]} />
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Section switcher */}
        <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {([
            { key: 'all', label: `All · ${metrics.length}` },
            { key: 'protocol', label: `Protocol · ${protocolMetrics.length}` },
            { key: 'routines', label: `Routines · ${routineMetrics.length}` },
          ] as const).map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => { setActiveSection(t.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.tabBtn, { backgroundColor: activeSection === t.key ? colors.brand.primary : 'transparent' }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, { color: activeSection === t.key ? '#fff' : colors.textSecondary }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Protocol metrics */}
        {(activeSection === 'all' || activeSection === 'protocol') && protocolMetrics.length > 0 && (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: colors.brand.primary }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Program Protocols</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Gated core habits</Text>
          </View>
        )}
        {(activeSection === 'all' || activeSection === 'protocol') && protocolMetrics.map(m => (
          <HabitCard
            key={m.id} metric={m} today={today} colors={colors}
            isProgram programColor={programColorMap[m.id] ?? colors.brand.primary}
          />
        ))}

        {/* Routines metrics */}
        {(activeSection === 'all' || activeSection === 'routines') && (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: colors.brand.success }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Routines</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Personal metrics</Text>
          </View>
        )}
        {(activeSection === 'all' || activeSection === 'routines') && routineMetrics.map(m => (
          <HabitCard key={m.id} metric={m} today={today} colors={colors} isProgram={false} />
        ))}

        {/* Empty state */}
        {displayMetrics.length === 0 && (
          <TouchableOpacity
            onPress={openModal}
            style={[styles.emptyState, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 36 }}>✨</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Tap to add your first tracker</Text>
          </TouchableOpacity>
        )}

        {/* Add more button */}
        <TouchableOpacity
          onPress={openModal}
          style={[styles.addMoreBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.textSecondary} />
          <Text style={[styles.addMoreText, { color: colors.textSecondary }]}>Add custom tracker</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Tracker Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.modal, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            {modalStep === 'configure' ? (
              <TouchableOpacity onPress={() => setModalStep('template')} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : <View style={{ width: 24 }} />}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {modalStep === 'template' ? 'Add Tracker' : 'Configure Tracker'}
            </Text>
            <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {modalStep === 'template' ? (
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>QUICK-START TEMPLATES</Text>
              <View style={styles.templateGrid}>
                {QUICK_TEMPLATES.map((t, i) => {
                  const catColor = t.category === 'build' ? colors.brand.success : t.category === 'reduce' ? colors.brand.danger : colors.brand.primary;
                  return (
                    <TouchableOpacity
                      key={i} onPress={() => applyTemplate(t)}
                      style={[styles.templateCard, {
                        backgroundColor: colors.surface, borderColor: catColor + '40',
                        borderWidth: 1.5, borderRadius: 16,
                      }]}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.templateEmoji}>{t.emoji}</Text>
                      <Text style={[styles.templateName, { color: colors.text }]}>{t.name}</Text>
                      <View style={[styles.templateBadge, { backgroundColor: catColor + '15' }]}>
                        <Text style={[styles.templateBadgeText, { color: catColor }]}>
                          {t.category === 'build' ? '📈 Build' : t.category === 'reduce' ? '📉 Reduce' : '📊 Monitor'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>or custom</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>
              
              <TouchableOpacity
                onPress={() => setModalStep('configure')}
                style={{ width: '100%', marginBottom: 40 }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={colors.gradients.primaryShort}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.customBtnGradient}
                >
                  <Ionicons name="construct-outline" size={18} color="#fff" />
                  <Text style={styles.customBtnText}>Create Custom Tracker</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TRACKER NAME</Text>
              <TextInput
                value={newName} onChangeText={setNewName}
                placeholder="e.g. Daily Run, Meditation, Sugar Clean..."
                placeholderTextColor={colors.textDim} autoFocus
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                selectionColor={colors.brand.primary}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>EMOJI ICON</Text>
              <TextInput
                value={newEmoji} onChangeText={setNewEmoji}
                placeholder="e.g. 🏃 🧘 🍭 💧"
                placeholderTextColor={colors.textDim}
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                selectionColor={colors.brand.primary}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>HABIT CATEGORY</Text>
              <View style={styles.catCards}>
                {([
                  { key: 'build', emoji: '📈', label: 'Build', desc: 'Do more of this', color: colors.brand.success },
                  { key: 'reduce', emoji: '📉', label: 'Reduce', desc: 'Do less of this', color: colors.brand.danger },
                  { key: 'neutral', emoji: '📊', label: 'Observe', desc: 'Just monitor values', color: colors.brand.primary },
                ] as const).map(cat => {
                  const selected = newCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => { setNewCategory(cat.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.catCard, {
                        backgroundColor: selected ? cat.color + '15' : colors.surface,
                        borderColor: selected ? cat.color : colors.border,
                      }]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.catCardTop}>
                        <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                        {selected && <Ionicons name="checkmark-circle" size={16} color={cat.color} />}
                      </View>
                      <Text style={[styles.catCardTitle, { color: selected ? cat.color : colors.text }]}>{cat.label}</Text>
                      <Text style={[styles.catCardDesc, { color: colors.textSecondary }]}>{cat.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>HOW TO LOG IT</Text>
              <View style={styles.inputTypeRow}>
                {([
                  { key: 'boolean', label: 'Yes / No', icon: 'checkmark-circle-outline' as const },
                  { key: 'counter', label: 'Counter', icon: 'add-circle-outline' as const },
                  { key: 'scale', label: 'Scale 1–10', icon: 'bar-chart-outline' as const },
                ] as const).map(type => {
                  const selected = newInputType === type.key;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      onPress={() => { setNewInputType(type.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.inputTypeChip, {
                        backgroundColor: selected ? colors.brand.primary + '15' : colors.surface,
                        borderColor: selected ? colors.brand.primary : colors.border,
                      }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={type.icon} size={18} color={selected ? colors.brand.primary : colors.textSecondary} />
                      <Text style={[styles.inputTypeText, { color: selected ? colors.brand.primary : colors.text }]}>{type.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              {newInputType !== 'boolean' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>UNIT LABEL (optional)</Text>
                  <TextInput
                    value={newUnit} onChangeText={setNewUnit}
                    placeholder="e.g. km, pages, glasses..."
                    placeholderTextColor={colors.textDim}
                    style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    selectionColor={colors.brand.primary}
                  />
                </>
              )}
              
              <TouchableOpacity onPress={handleAddMetric} activeOpacity={0.88} style={{ marginTop: 8, marginBottom: 40 }}>
                <LinearGradient
                  colors={colors.gradients.primaryShort}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtnGradient}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Add Tracker</Text>
                </LinearGradient>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  dateLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  addBtnGradient: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  
  // Background radial blur
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
    opacity: 0.5,
  },

  // Hero Card content
  heroCardContent: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18 },
  ringNum: { fontSize: 22, fontFamily: 'Inter_700Bold', lineHeight: 24 },
  ringDen: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  heroLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  heroStatRow: { flexDirection: 'row', gap: 14 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  progressBar: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  tabRow: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, gap: 2 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabBtnText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, marginTop: 6 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', flex: 1 },
  sectionSub: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  emptyState: { alignItems: 'center', gap: 8, padding: 40, borderWidth: 1, borderStyle: 'dashed', borderRadius: 18 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 16 },
  addMoreText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  modalContent: { flex: 1, padding: 16 },
  fieldLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 8, marginTop: 16 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateCard: { width: '48%', padding: 14, gap: 6, borderWidth: 1 },
  templateEmoji: { fontSize: 24, marginBottom: 2 },
  templateName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  templateBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 2 },
  templateBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  customBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  customBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },
  textInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  catCards: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  catCard: { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 4 },
  catCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catCardTitle: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  catCardDesc: { fontSize: 10, fontFamily: 'Inter_400Regular', lineHeight: 14 },
  inputTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  inputTypeChip: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 12, alignItems: 'center', gap: 6 },
  inputTypeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  saveBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});
