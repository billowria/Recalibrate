import * as Haptics from 'expo-haptics';
import React, { useEffect, useState, useMemo } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, Journal } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');

const MOOD_OPTIONS = [
  { id: 'strong', emoji: '💪', label: 'Strong', color: '#10b981' },
  { id: 'sore', emoji: '🤕', label: 'Sore', color: '#ef4444' },
  { id: 'tired', emoji: '😴', label: 'Tired', color: '#f59e0b' },
  { id: 'motivated', emoji: '⚡', label: 'Motivated', color: '#a855f7' },
  { id: 'recovered', emoji: '🧘', label: 'Recovered', color: '#6366f1' },
];

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { journals, addJournal, currentStreak } = useApp();

  const [text, setText] = useState('');
  const [selectedMood, setSelectedMood] = useState('motivated');
  const [loading, setLoading] = useState(false);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const todayJournal = useMemo(() => {
    return journals.find(j => j.date === todayStr);
  }, [journals, todayStr]);

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('Required', 'Please write a few words about your workout reflection.');
      return;
    }

    try {
      setLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addJournal(text, selectedMood);
      setText('');
      Alert.alert('Reflection Saved', 'Your post-workout reflection has been saved. +25 XP earned!');
    } catch (err) {
      Alert.alert('Error', 'Failed to save reflection.');
    } finally {
      setLoading(false);
    }
  };

  const sortedJournals = useMemo(() => {
    return [...journals].sort((a, b) => b.date.localeCompare(a.date));
  }, [journals]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 8, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>POST-WORKOUT</Text>
            <Text style={[styles.title, { color: colors.text }]}>Fitness Journal</Text>
          </View>

          {/* Streak Ring */}
          <View style={[styles.streakRing, { borderColor: colors.border }]}>
            <Ionicons name="flame" size={18} color="#f59e0b" />
            <Text style={[styles.streakNum, { color: '#f59e0b' }]}>{currentStreak}</Text>
          </View>
        </View>

        {/* Log input card */}
        {todayJournal ? (
          <View style={[styles.completedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle" size={32} color="#10b981" />
            <Text style={[styles.completedTitle, { color: colors.text }]}>Reflection Logged Today</Text>
            <Text style={[styles.completedText, { color: colors.textSecondary }]}>
              "{todayJournal.content}"
            </Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#10b981' }}>
              State: {MOOD_OPTIONS.find(m => m.id === todayJournal.mood)?.emoji || '⚡'} {todayJournal.mood?.toUpperCase()}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Reflect on today's session</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
              How did your body, energy levels, pump, or mental focus feel?
            </Text>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Felt incredibly strong on squats today, hit all reps at RPE 8. Feeling good and recovered..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />

            {/* Mood / State select */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>CURRENT STATE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
              {MOOD_OPTIONS.map(opt => {
                const selected = selectedMood === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => { setSelectedMood(opt.id); Haptics.selectionAsync(); }}
                    style={[
                      styles.moodBtn,
                      { borderColor: colors.border },
                      selected && { backgroundColor: opt.color, borderColor: opt.color }
                    ]}
                  >
                    <Text style={{ fontSize: 13 }}>{opt.emoji} {opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.primaryBtn, { backgroundColor: colors.brand.primary, marginTop: 14 }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontFamily: 'Inter_700Bold' }}>Save Reflection (+25 XP)</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* History list */}
        <View style={{ gap: 10, marginTop: 10 }}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>HISTORY</Text>

          {sortedJournals.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: colors.border }]}>
              <Ionicons name="book-outline" size={28} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textMuted }}>No journal entries recorded yet.</Text>
            </View>
          ) : (
            sortedJournals.map(item => {
              const moodOpt = MOOD_OPTIONS.find(m => m.id === item.mood);
              const formattedDate = new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <View key={item.id} style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.historyHeader}>
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.text }}>{formattedDate}</Text>
                    {moodOpt && (
                      <View style={[styles.moodBadge, { backgroundColor: `${moodOpt.color}15`, borderColor: `${moodOpt.color}30` }]}>
                        <Text style={{ fontSize: 10, color: moodOpt.color, fontFamily: 'Inter_700Bold' }}>
                          {moodOpt.emoji} {moodOpt.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                    "{item.content}"
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },

  streakRing: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  streakNum: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  card: { borderRadius: 20, padding: 18, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  input: { height: 100, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 13, textAlignVertical: 'top', fontFamily: 'Inter_500Medium' },
  label: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 4 },

  moodBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  primaryBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  completedCard: { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: 'center', gap: 10 },
  completedTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  completedText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },

  sectionTitle: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  emptyCard: { borderStyle: 'dashed', borderRadius: 20, borderWidth: 1, padding: 32, alignItems: 'center', gap: 8 },

  historyItem: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 }
});
