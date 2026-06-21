import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
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

const TAG_DEFS = [
  { id: 'stress', emoji: '😰', label: 'Stress' },
  { id: 'sleep', emoji: '😴', label: 'Sleep' },
  { id: 'craving', emoji: '🤤', label: 'Craving' },
  { id: 'win', emoji: '🏆', label: 'Win' },
  { id: 'social', emoji: '👥', label: 'Social' },
  { id: 'work', emoji: '💼', label: 'Work' },
  { id: 'fitness', emoji: '💪', label: 'Fitness' },
  { id: 'mindfulness', emoji: '🧘', label: 'Mindfulness' },
];

const DAILY_JOURNAL_XP = 25;
const WORD_COUNT_BONUS_XP = 5;
const STREAK_BONUS_XP = 10;

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile,
    addJournalEntry,
    getJournalEntryForDate,
    journalEntries,
    addXP,
    currentLevel,
    currentStreak,
  } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const existing = getJournalEntryForDate(today);

  const weekPrompts = DAILY_JOURNAL_PROMPTS[profile.currentWeek] ?? DAILY_JOURNAL_PROMPTS[1];
  const promptOfDay = weekPrompts[new Date().getDay() % weekPrompts.length];

  const [response, setResponse] = useState(existing?.response ?? '');
  const [mood, setMood] = useState(existing?.mood ?? 5);
  const [energy, setEnergy] = useState(existing?.energy ?? 5);
  const [saved, setSaved] = useState(!!existing);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [showTags, setShowTags] = useState(false);
  const [wordCount, setWordCount] = useState(existing?.wordCount ?? 0);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const handleTextChange = (text: string) => {
    setResponse(text);
    setSaved(false);
    const wc = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(wc);
  };

  const handleSave = async () => {
    if (!response.trim()) return;
    await addJournalEntry({
      date: today,
      prompt: promptOfDay,
      response: response.trim(),
      mood,
      energy,
    });
    const isNew = !existing;
    const totalReward = DAILY_JOURNAL_XP + (wordCount >= 50 ? WORD_COUNT_BONUS_XP : 0) + (isNew ? 0 : STREAK_BONUS_XP);
    if (isNew) {
      await addXP(totalReward);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
  };

  const recentEntries = useMemo(
    () => [...journalEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20),
    [journalEntries]
  );

  const journalStreak = useMemo(() => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const ds = d.toISOString().split('T')[0];
      if (journalEntries.some(e => e.date === ds)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  }, [journalEntries]);

  const avgMood = useMemo(() => {
    if (journalEntries.length === 0) return 0;
    const sum = journalEntries.reduce((acc, e) => acc + e.mood, 0);
    return Math.round((sum / journalEntries.length) * 10) / 10;
  }, [journalEntries]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    journalEntries.forEach(e => {
      e.tags?.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    });
    return counts;
  }, [journalEntries]);

  const getMoodLabel = (v: number) => {
    if (v <= 2) return 'Low';
    if (v <= 4) return 'Fair';
    if (v <= 6) return 'Good';
    if (v <= 8) return 'Great';
    return 'Peak';
  };

  const getMoodEmoji = (v: number) => {
    if (v <= 2) return '😔';
    if (v <= 4) return '😐';
    if (v <= 6) return '🙂';
    if (v <= 8) return '😄';
    return '🤩';
  };

  const totalReward = DAILY_JOURNAL_XP + (wordCount >= 50 ? WORD_COUNT_BONUS_XP : 0) + (!existing ? 0 : STREAK_BONUS_XP);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Journal</Text>
          <View style={styles.headerRight}>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}
                pointerEvents="none">
              <Text style={styles.levelBadgeText}>LVL {currentLevel}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/calendar')}
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.gamifyBar, { backgroundColor: colors.card, borderColor: colors.border }]}
            pointerEvents="none">
          <View style={styles.gamifyBlock}>
            <Ionicons name="flame" size={16} color={colors.primary} />
            <Text style={[styles.gamifyText, { color: colors.foreground }]}>
              {journalStreak} day streak
            </Text>
          </View>
          <View style={[styles.gamifyDivider, { backgroundColor: colors.border }]} />
          <View style={styles.gamifyBlock}>
            <Ionicons name="book" size={16} color={colors.accent} />
            <Text style={[styles.gamifyText, { color: colors.foreground }]}>
              {journalEntries.length} entries
            </Text>
          </View>
          <View style={[styles.gamifyDivider, { backgroundColor: colors.border }]} />
          <View style={styles.gamifyBlock}>
            <Ionicons name="trending-up" size={16} color={colors.scoreGreen} />
            <Text style={[styles.gamifyText, { color: colors.foreground }]}>
              Mood {avgMood > 0 ? avgMood : '-'}
            </Text>
          </View>
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
            backgroundColor: colors.accent + '12',
            borderColor: colors.accent + '30',
            borderRadius: colors.radius,
          }]}>
            <View style={styles.promptBadge}>
              <Text style={[styles.promptBadgeText, { color: colors.accent }]}>
                Week {profile.currentWeek} Prompt
              </Text>
            </View>
            <Text style={[styles.promptText, { color: colors.foreground }]}>{promptOfDay}</Text>
          </View>

          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <TextInput
              value={response}
              onChangeText={handleTextChange}
              placeholder="Reflect on today's prompt..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[styles.responseInput, { color: colors.foreground }]}
            />
            <View style={styles.inputMeta}>
              <Text style={[styles.wordCount, { color: colors.mutedForeground }]}>
                {wordCount} words {wordCount >= 50 ? '✨' : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowTags(!showTags)} activeOpacity={0.7}>
                <Text style={[styles.tagToggle, { color: colors.primary }]}>
                  {showTags ? 'Hide tags' : 'Show tags'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showTags && (
            <View style={styles.tagsSection}>
              <Text style={[styles.tagsTitle, { color: colors.mutedForeground }]}>
                Auto-detected themes from your writing
              </Text>
              <View style={styles.tagGrid}>
                {TAG_DEFS.map(tag => {
                  const count = tagCounts[tag.id] || 0;
                  return (
                    <View key={tag.id} style={[styles.tagChip, {
                      backgroundColor: count > 0 ? colors.primary + '15' : colors.border + '80',
                      borderColor: count > 0 ? colors.primary + '30' : colors.border,
                    }]}>
                      <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                      <Text style={[styles.tagLabel, { color: count > 0 ? colors.foreground : colors.mutedForeground }]}>
                        {tag.label}
                      </Text>
                      {count > 0 && (
                        <Text style={[styles.tagCount, { color: colors.primary }]}>{count}x</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={[styles.slidersSection, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <SliderRow
              label="Mood"
              value={mood}
              onValueChange={setMood}
              emoji={getMoodEmoji(mood)}
              colors={colors}
            />
            <View style={[styles.sliderDivider, { backgroundColor: colors.border }]} />
            <SliderRow
              label="Energy"
              value={energy}
              onValueChange={setEnergy}
              emoji={energy >= 7 ? '⚡' : energy >= 4 ? '🔋' : '😴'}
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
            <Text style={styles.saveBtnText}>{saved ? 'Saved' : `Save entry (+${totalReward} XP)`}</Text>
          </TouchableOpacity>

          {journalEntries.length > 0 && (
            <View style={[styles.insightsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.insightHeader}>
                <Ionicons name="analytics-outline" size={16} color={colors.primary} />
                <Text style={[styles.insightTitle, { color: colors.foreground }]}>Your Journal Insights</Text>
              </View>
              <View style={styles.insightGrid}>
                <InsightBlock
                  label="Writing streak"
                  value={`${journalStreak} days`}
                  icon="flame"
                  color={colors.primary}
                  colors={colors}
                />
                <InsightBlock
                  label="Avg mood"
                  value={avgMood > 0 ? `${avgMood}/10` : '-'}
                  icon="happy"
                  color={colors.scoreGreen}
                  colors={colors}
                />
                <InsightBlock
                  label="Entries"
                  value={`${journalEntries.length}`}
                  icon="book"
                  color={colors.accent}
                  colors={colors}
                />
                <InsightBlock
                  label="Word goal"
                  value={wordCount >= 50 ? 'Met ✅' : `${50 - wordCount} left`}
                  icon="create"
                  color={wordCount >= 50 ? colors.scoreGreen : colors.scoreYellow}
                  colors={colors}
                />
              </View>
              {Object.keys(tagCounts).length > 0 && (
                <View style={styles.topTags}>
                  <Text style={[styles.topTagsTitle, { color: colors.mutedForeground }]}>
                    Top themes
                  </Text>
                  <View style={styles.topTagsRow}>
                    {Object.entries(tagCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([tagId, count]) => {
                        const def = TAG_DEFS.find(t => t.id === tagId);
                        if (!def) return null;
                        return (
                          <View key={tagId} style={[styles.topTagChip, { backgroundColor: colors.border + '80' }]}>
                            <Text style={styles.topTagEmoji}>{def.emoji}</Text>
                            <Text style={[styles.topTagLabel, { color: colors.foreground }]}>{def.label}</Text>
                            <Text style={[styles.topTagCount, { color: colors.mutedForeground }]}>{count}</Text>
                          </View>
                        );
                      })}
                  </View>
                </View>
              )}
            </View>
          )}
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
                Start writing today to build your journal streak
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
                  <View style={styles.entryMetaLeft}>
                    <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
                      {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric'
                      })}
                    </Text>
                    {entry.wordCount && entry.wordCount > 0 && (
                      <Text style={[styles.entryWordCount, { color: colors.mutedForeground }]}>
                        {entry.wordCount} words
                      </Text>
                    )}
                  </View>
                  <View style={styles.entryBadges}>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {getMoodEmoji(entry.mood)} {entry.mood}/10
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.accent }]}>
                        {entry.energy >= 7 ? '⚡' : entry.energy >= 4 ? '🔋' : '😴'} {entry.energy}/10
                      </Text>
                    </View>
                  </View>
                </View>
                {entry.tags && entry.tags.length > 0 && (
                  <View style={styles.entryTags}>
                    {entry.tags.map(tagId => {
                      const def = TAG_DEFS.find(t => t.id === tagId);
                      if (!def) return null;
                      return (
                        <View key={tagId} style={[styles.entryTagChip, { backgroundColor: colors.border + '80' }]}>
                          <Text style={styles.entryTagEmoji}>{def.emoji}</Text>
                          <Text style={[styles.entryTagLabel, { color: colors.foreground }]}>{def.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
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

function InsightBlock({ label, value, icon, color, colors }: any) {
  return (
    <View style={styles.insightBlock}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.insightValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function SliderRow({
  label,
  value,
  onValueChange,
  emoji,
  colors,
}: {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  emoji: string;
  colors: any;
}) {
  return (
    <View style={sliderStyles.row}>
      <View style={sliderStyles.labelRow}>
        <Text style={[sliderStyles.label, { color: colors.foreground }]}>{label}</Text>
        <View style={sliderStyles.labelRight}>
          <Text style={[sliderStyles.emoji, { color: colors.foreground }]}>{emoji}</Text>
          <Text style={[sliderStyles.valueLabel, { color: colors.primary }]}>{value}/10</Text>
        </View>
      </View>
      <View style={sliderStyles.dotsRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => { onValueChange(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[sliderStyles.dot, {
              backgroundColor: value >= n ? colors.primary : colors.border,
              width: value === n ? 22 : 14,
              height: value === n ? 22 : 14,
              borderRadius: value === n ? 11 : 7,
            }]}
            activeOpacity={0.7}
          />
        ))}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  row: { padding: 16, gap: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  labelRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emoji: { fontSize: 16 },
  valueLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { alignSelf: 'center' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  levelBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  gamifyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  gamifyBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  gamifyText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  gamifyDivider: { width: 1, height: 20 },
  tabRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  tabBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 16, gap: 14 },
  promptCard: {
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  promptBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  promptBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  promptText: { fontSize: 16, fontFamily: 'Inter_500Medium', lineHeight: 24 },
  inputWrap: { borderWidth: 1, overflow: 'hidden' },
  responseInput: {
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  inputMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  wordCount: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  tagToggle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  tagsSection: { gap: 8 },
  tagsTitle: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagEmoji: { fontSize: 14 },
  tagLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  tagCount: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginLeft: 2 },
  slidersSection: { borderWidth: 1, overflow: 'hidden', gap: 0 },
  sliderDivider: { height: 1, marginHorizontal: 16 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  insightsCard: { borderWidth: 1, padding: 16, gap: 14 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  insightGrid: { flexDirection: 'row', gap: 8 },
  insightBlock: { flex: 1, alignItems: 'center', gap: 4 },
  insightValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  insightLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  topTags: { gap: 8 },
  topTagsTitle: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  topTagsRow: { flexDirection: 'row', gap: 8 },
  topTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  topTagEmoji: { fontSize: 12 },
  topTagLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  topTagCount: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptySubtext: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  entryCard: { borderWidth: 1, padding: 16, gap: 10 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
  entryMetaLeft: { gap: 2 },
  entryDate: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  entryWordCount: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  entryBadges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  entryTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  entryTagChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  entryTagEmoji: { fontSize: 11 },
  entryTagLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  entryPrompt: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  entryResponse: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
});
