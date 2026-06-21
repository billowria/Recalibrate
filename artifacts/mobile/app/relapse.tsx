import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

const CALM_STEPS = [
  { label: 'Breathe in', duration: 4000 },
  { label: 'Hold', duration: 4000 },
  { label: 'Breathe out', duration: 4000 },
];

export default function RelapseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { metrics, addRelapseLog } = useApp();

  const [phase, setPhase] = useState<'breathe' | 'reflect' | 'done'>('breathe');
  const [breathStep, setBreathStep] = useState(0);
  const [selectedMetricId, setSelectedMetricId] = useState('');
  const [trigger, setTrigger] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [breathTimer, setBreathTimer] = useState(4);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  useEffect(() => {
    if (phase !== 'breathe') return;

    const step = CALM_STEPS[breathStep % CALM_STEPS.length];
    setBreathTimer(Math.floor(step.duration / 1000));

    if (breathStep % 3 === 0) {
      Animated.timing(scaleAnim, { toValue: 1.4, duration: step.duration, useNativeDriver: true }).start();
    } else if (breathStep % 3 === 1) {
      // hold
    } else {
      Animated.timing(scaleAnim, { toValue: 1, duration: step.duration, useNativeDriver: true }).start();
    }

    const countdown = setInterval(() => {
      setBreathTimer(prev => Math.max(0, prev - 1));
    }, 1000);

    const next = setTimeout(() => {
      clearInterval(countdown);
      if (breathStep >= 5) {
        setPhase('reflect');
      } else {
        setBreathStep(prev => prev + 1);
      }
    }, step.duration);

    return () => { clearTimeout(next); clearInterval(countdown); };
  }, [breathStep, phase]);

  const handleSubmit = async () => {
    if (!selectedMetricId || !trigger.trim() || !nextAction.trim()) return;
    const metric = metrics.find(m => m.id === selectedMetricId);
    if (!metric) return;

    await addRelapseLog({
      date: new Date().toISOString().split('T')[0],
      metricId: selectedMetricId,
      metricName: metric.name,
      triggerReflection: trigger.trim(),
      nextAction: nextAction.trim(),
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase('done');
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const bgColor = '#0A1628';
  const accentBlue = '#3B82F6';
  const softBlue = '#93C5FD';

  return (
    <Animated.View style={[styles.root, { backgroundColor: bgColor, opacity: fadeAnim }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.closeBtn, { top: topPadding + 8 }]}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={24} color={softBlue} />
      </TouchableOpacity>

      {phase === 'breathe' && (
        <View style={styles.breatheContainer}>
          <Text style={[styles.calmTitle, { color: softBlue }]}>Take a moment</Text>
          <Text style={[styles.calmSubtitle, { color: softBlue + 'AA' }]}>
            A setback is data. Not a failure.
          </Text>

          <View style={styles.breatheCircleContainer}>
            <Animated.View style={[
              styles.breatheCircleOuter,
              { borderColor: accentBlue + '40' },
              { transform: [{ scale: scaleAnim }] },
            ]}>
              <View style={[styles.breatheCircleInner, { borderColor: accentBlue }]}>
                <Text style={[styles.breatheStep, { color: softBlue }]}>
                  {CALM_STEPS[breathStep % CALM_STEPS.length].label}
                </Text>
                <Text style={[styles.breatheTimer, { color: '#fff' }]}>{breathTimer}</Text>
              </View>
            </Animated.View>
          </View>

          <Text style={[styles.breatheHint, { color: softBlue + '80' }]}>
            {Math.floor(breathStep / 3) + 1} of 2 breath cycles
          </Text>

          <TouchableOpacity
            onPress={() => setPhase('reflect')}
            style={styles.skipBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: softBlue + '80' }]}>Skip to reflection</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'reflect' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={[styles.reflectContent, { paddingTop: topPadding + 56 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.calmTitle, { color: softBlue }]}>Reflect</Text>
            <Text style={[styles.calmSubtitle, { color: softBlue + 'AA' }]}>
              No judgment. Just honest data.
            </Text>

            <Text style={[styles.fieldLabel, { color: softBlue + 'AA' }]}>WHAT HAPPENED</Text>
            <View style={styles.metricGrid}>
              {metrics.filter(m => m.category === 'reduce').map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => { setSelectedMetricId(m.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.metricChip, {
                    backgroundColor: selectedMetricId === m.id ? accentBlue : accentBlue + '20',
                    borderColor: selectedMetricId === m.id ? accentBlue : accentBlue + '40',
                  }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.metricChipText, {
                    color: selectedMetricId === m.id ? '#fff' : softBlue,
                  }]}>{m.isSensitive ? '••••' : m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: softBlue + 'AA' }]}>WHAT WAS THE TRIGGER?</Text>
            <TextInput
              value={trigger}
              onChangeText={setTrigger}
              placeholder="Stress, boredom, a specific situation..."
              placeholderTextColor={softBlue + '50'}
              multiline
              style={[styles.cbInput, { borderColor: accentBlue + '40', color: '#fff' }]}
            />

            <Text style={[styles.fieldLabel, { color: softBlue + 'AA' }]}>WHAT WILL YOU DO RIGHT NOW?</Text>
            <TextInput
              value={nextAction}
              onChangeText={setNextAction}
              placeholder="One concrete action in the next hour..."
              placeholderTextColor={softBlue + '50'}
              multiline
              style={[styles.cbInput, { borderColor: accentBlue + '40', color: '#fff' }]}
            />

            <View style={[styles.neverMissCard, { borderColor: accentBlue + '40' }]}>
              <Ionicons name="infinite-outline" size={18} color={accentBlue} />
              <Text style={[styles.neverMissText, { color: softBlue + 'CC' }]}>
                Never miss twice. One day reset. History preserved. You're still on track.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!selectedMetricId || !trigger.trim() || !nextAction.trim()}
              style={[styles.submitBtn, {
                backgroundColor: accentBlue,
                opacity: (!selectedMetricId || !trigger.trim() || !nextAction.trim()) ? 0.4 : 1,
              }]}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Log setback & continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {phase === 'done' && (
        <View style={styles.doneContainer}>
          <Ionicons name="shield-checkmark" size={64} color={accentBlue} />
          <Text style={[styles.calmTitle, { color: softBlue }]}>Logged.</Text>
          <Text style={[styles.doneText, { color: softBlue + 'AA' }]}>
            Awareness is the first act of recovery.{'\n'}Never miss twice.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: accentBlue }]}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  closeBtn: { position: 'absolute', right: 20, zIndex: 10, padding: 8 },
  breatheContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 24 },
  calmTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: -0.5 },
  calmSubtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  breatheCircleContainer: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  breatheCircleOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breatheCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  breatheStep: { fontSize: 13, fontFamily: 'Inter_500Medium', letterSpacing: 1 },
  breatheTimer: { fontSize: 32, fontFamily: 'Inter_700Bold' },
  breatheHint: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  skipBtn: { paddingVertical: 8 },
  skipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  reflectContent: { paddingHorizontal: 24, paddingBottom: 60, gap: 12 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 2, marginTop: 8 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  metricChipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  cbInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
    color: '#fff',
  },
  neverMissCard: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  neverMissText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 24 },
  doneText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24 },
  doneBtn: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12 },
  doneBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
