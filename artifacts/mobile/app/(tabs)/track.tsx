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

const CATEGORIES = ['build', 'reduce', 'neutral'] as const;
const INPUT_TYPES = ['boolean', 'counter', 'scale'] as const;

export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { metrics, logMetric, getLogForDate, getLogsForMetric, addCustomMetric } = useApp();
  const today = new Date().toISOString().split('T')[0];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'build' | 'reduce' | 'neutral'>('build');
  const [newInputType, setNewInputType] = useState<'boolean' | 'counter' | 'scale'>('boolean');
  const [newUnit, setNewUnit] = useState('');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const handleAddMetric = async () => {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Please enter a name for your tracker.');
      return;
    }
    await addCustomMetric({
      name: newName.trim(),
      category: newCategory,
      inputType: newInputType,
      unitLabel: newUnit.trim(),
      isSensitive: false,
      scoreWeight: 5,
    });
    setNewName('');
    setNewUnit('');
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const grouped = {
    build: metrics.filter(m => m.category === 'build'),
    reduce: metrics.filter(m => m.category === 'reduce'),
    neutral: metrics.filter(m => m.category === 'neutral'),
  };

  const categoryConfig = {
    build: { label: 'BUILD', icon: 'trending-up', color: colors.scoreGreen },
    reduce: { label: 'REDUCE', icon: 'trending-down', color: colors.scoreRed },
    neutral: { label: 'TRACK', icon: 'pulse', color: colors.primary },
  } as const;

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
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>My Trackers</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {(Object.keys(grouped) as (keyof typeof grouped)[]).map(cat => {
          const group = grouped[cat];
          if (group.length === 0) return null;
          const cfg = categoryConfig[cat];
          return (
            <View key={cat}>
              <View style={styles.catHeader}>
                <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                <Text style={[styles.catLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              {group.map(metric => {
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
                      <Text style={[styles.trendToggleText, { color: colors.mutedForeground }]}>
                        {isExpanded ? 'Hide trend' : '7-day trend'}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
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
              })}
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
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Tracker</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NAME</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Steps, Reading, Gym..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
                borderRadius: colors.radius,
              }]}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CATEGORY</Text>
            <View style={styles.segmentedRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setNewCategory(cat)}
                  style={[styles.segmentBtn, {
                    backgroundColor: newCategory === cat ? colors.primary : colors.card,
                    borderColor: newCategory === cat ? colors.primary : colors.border,
                    borderRadius: colors.radius - 4,
                  }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentBtnText, {
                    color: newCategory === cat ? '#fff' : colors.foreground,
                  }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>INPUT TYPE</Text>
            <View style={styles.segmentedRow}>
              {INPUT_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setNewInputType(type)}
                  style={[styles.segmentBtn, {
                    backgroundColor: newInputType === type ? colors.accent : colors.card,
                    borderColor: newInputType === type ? colors.accent : colors.border,
                    borderRadius: colors.radius - 4,
                  }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentBtnText, {
                    color: newInputType === type ? '#fff' : colors.foreground,
                  }]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>UNIT LABEL (OPTIONAL)</Text>
            <TextInput
              value={newUnit}
              onChangeText={setNewUnit}
              placeholder="e.g. km, pages, hours..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
                borderRadius: colors.radius,
              }]}
            />

            <TouchableOpacity
              onPress={handleAddMetric}
              style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>Add Tracker</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 8 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 2 },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 4 },
  catLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  metricCard: { borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  trendToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 4,
  },
  trendToggleText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  trendContainer: { paddingHorizontal: 14, paddingBottom: 12 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalContent: { padding: 20 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 2, marginBottom: 8, marginTop: 16 },
  textInput: {
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  segmentedRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  segmentBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  saveBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
