import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
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
import { DAILY_JOURNAL_PROMPTS } from '@/constants/program';

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, addJournalEntry, getJournalEntryForDate, journalEntries } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const existing = getJournalEntryForDate(today);

  const weekPrompts = DAILY_JOURNAL_PROMPTS[profile.currentWeek] ?? DAILY_JOURNAL_PROMPTS[1];
  const promptOfDay = weekPrompts[new Date().getDay() % weekPrompts.length];

  const [response, setResponse] = useState(existing?.response ?? '');
  const [mood, setMood] = useState(existing?.mood ?? 5);
  const [energy, setEnergy] = useState(existing?.energy ?? 5);
  const [saved, setSaved] = useState(!!existing);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const handleSave = async () => {
    if (!response.trim()) return;
    await addJournalEntry({
      date: today,
      prompt: promptOfDay,
      response: response.trim(),
      mood,
      energy,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
  };

  const recentEntries = [...journalEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  const getMoodLabel = (v: number) => {
    if (v <= 2) return 'Low';
    if (v <= 4) return 'Fair';
    if (v <= 6) return 'Good';
    if (v <= 8) return 'Great';
    return 'Peak';
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.tabHeader, {
        paddingTop: topPadding + 16,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Journal</Text>
          <TouchableOpacity
            onPress={() => router.push('/calendar')}
            style={[styles.calBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.calBtnText, { color: colors.primary }]}>Calendar</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['today', 'history'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabBtn, { backgroundColor: activeTab === tab ? colors.primary : 'transparent' }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === tab ? '#fff' : colors.mutedForeground }]}>
                {tab === 'today' ? 'Today' : 'History'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === 'today' ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.promptCard, {
            backgroundColor: colors.accent + '18',
            borderColor: colors.accent + '40',
            borderRadius: colors.radius,
          }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.accent} />
            <Text style={[styles.promptText, { color: colors.foreground }]}>{promptOfDay}</Text>
          </View>

          <TextInput
            value={response}
            onChangeText={(t) => { setResponse(t); setSaved(false); }}
            placeholder="Write your reflection here..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[styles.responseInput, {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
              borderRadius: colors.radius,
            }]}
          />

          <View style={styles.slidersSection}>
            <SliderRow
              label="Mood"
              value={mood}
              onValueChange={setMood}
              valueLabel={getMoodLabel(mood)}
              colors={colors}
            />
            <SliderRow
              label="Energy"
              value={energy}
              onValueChange={setEnergy}
              valueLabel={getMoodLabel(energy)}
              colors={colors}
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!response.trim() || saved}
            style={[styles.saveBtn, {
              backgroundColor: saved ? colors.scoreGreen : response.trim() ? colors.primary : colors.border,
              borderRadius: colors.radius,
              opacity: !response.trim() ? 0.5 : 1,
            }]}
            activeOpacity={0.8}
          >
            <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color="#fff" />
            <Text style={styles.saveBtnText}>{saved ? 'Saved' : 'Save entry'}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {recentEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No entries yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                Your journal entries will appear here
              </Text>
            </View>
          ) : (
            recentEntries.map(entry => (
              <View key={entry.id} style={[styles.entryCard, {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              }]}>
                <View style={styles.entryHeader}>
                  <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric'
                    })}
                  </Text>
                  <View style={styles.entryBadges}>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        Mood {entry.mood}/10
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.accent }]}>
                        Energy {entry.energy}/10
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.entryPrompt, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {entry.prompt}
                </Text>
                <Text style={[styles.entryResponse, { color: colors.foreground }]} numberOfLines={4}>
                  {entry.response}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function SliderRow({
  label,
  value,
  onValueChange,
  valueLabel,
  colors,
}: {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  valueLabel: string;
  colors: any;
}) {
  return (
    <View style={sliderStyles.row}>
      <View style={sliderStyles.labelRow}>
        <Text style={[sliderStyles.label, { color: colors.foreground }]}>{label}</Text>
        <Text style={[sliderStyles.valueLabel, { color: colors.primary }]}>{valueLabel} ({value}/10)</Text>
      </View>
      <View style={sliderStyles.dotsRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => { onValueChange(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[sliderStyles.dot, {
              backgroundColor: value >= n ? colors.primary : colors.border,
              width: value === n ? 20 : 14,
              height: value === n ? 20 : 14,
              borderRadius: value === n ? 10 : 7,
            }]}
            activeOpacity={0.7}
          />
        ))}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  row: { gap: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  valueLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { alignSelf: 'center' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  calBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  calBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  tabRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  tabBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 20, gap: 16 },
  promptCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  promptText: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  responseInput: {
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  slidersSection: { gap: 20 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptySubtext: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  entryCard: { borderWidth: 1, padding: 16, gap: 8 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
  entryDate: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  entryBadges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  entryPrompt: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  entryResponse: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
});
