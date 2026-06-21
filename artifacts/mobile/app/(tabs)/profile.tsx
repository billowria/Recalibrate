import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
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
import { PROGRAM_WEEKS } from '@/constants/program';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, metrics, dailyLogs, journalEntries, relapseLogs, disciplineScore } = useApp();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const totalDaysTracked = new Set(dailyLogs.map(l => l.date)).size;
  const avgScore = disciplineScore;
  const currentWeekData = PROGRAM_WEEKS[profile.currentWeek - 1];

  const handleSaveName = () => {
    updateProfile({ name: nameInput.trim() });
    setEditingName(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleWeekChange = (delta: number) => {
    const newWeek = Math.max(1, Math.min(8, profile.currentWeek + delta));
    if (newWeek === profile.currentWeek) return;
    Alert.alert(
      `Move to Week ${newWeek}`,
      `This will set your current program week to Week ${newWeek}. Your logged data is preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            updateProfile({ currentWeek: newWeek });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleTimeChange = (field: 'wakeTime' | 'bedTime', value: string) => {
    const cleaned = value.replace(/[^0-9:]/g, '');
    updateProfile({ [field]: cleaned });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, {
        paddingTop: topPadding + 16,
        paddingBottom: Platform.OS === 'web' ? 120 : 100,
      }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.nameSection}>
        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.nameInput, {
                color: colors.foreground,
                borderBottomColor: colors.primary,
              }]}
              autoFocus
            />
            <TouchableOpacity onPress={handleSaveName}>
              <Ionicons name="checkmark-circle" size={28} color={colors.scoreGreen} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingName(true)} style={styles.nameRow} activeOpacity={0.7}>
            <Text style={[styles.nameText, { color: colors.foreground }]}>
              {profile.name || 'Set your name'}
            </Text>
            <Ionicons name="pencil" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        <Text style={[styles.nameSubtext, { color: colors.mutedForeground }]}>
          Member since {new Date(profile.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: 'Today\'s Score', value: `${avgScore}`, icon: 'pulse', color: avgScore >= 75 ? colors.scoreGreen : avgScore >= 40 ? colors.scoreYellow : colors.scoreRed },
          { label: 'Days Tracked', value: `${totalDaysTracked}`, icon: 'calendar', color: colors.primary },
          { label: 'Journal Entries', value: `${journalEntries.length}`, icon: 'book', color: colors.accent },
          { label: 'Setbacks Logged', value: `${relapseLogs.length}`, icon: 'refresh', color: colors.scoreYellow },
        ].map(stat => (
          <View key={stat.label} style={[styles.statCard, {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          }]}>
            <Ionicons name={stat.icon as any} size={22} color={stat.color} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Current Week</Text>
        <View style={styles.weekSelector}>
          <TouchableOpacity
            onPress={() => handleWeekChange(-1)}
            style={[styles.weekBtn, { borderColor: colors.border }]}
            disabled={profile.currentWeek <= 1}
          >
            <Ionicons name="chevron-back" size={20} color={profile.currentWeek <= 1 ? colors.border : colors.foreground} />
          </TouchableOpacity>
          <View style={styles.weekCenter}>
            <Text style={[styles.weekNumber, { color: colors.primary }]}>Week {profile.currentWeek}</Text>
            <Text style={[styles.weekTheme, { color: colors.foreground }]}>{currentWeekData?.theme}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleWeekChange(1)}
            style={[styles.weekBtn, { borderColor: colors.border }]}
            disabled={profile.currentWeek >= 8}
          >
            <Ionicons name="chevron-forward" size={20} color={profile.currentWeek >= 8 ? colors.border : colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Daily Schedule</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
          Used for discipline score calculation
        </Text>
        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Ionicons name="sunny-outline" size={18} color={colors.scoreYellow} />
            <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>Wake</Text>
            <TextInput
              value={profile.wakeTime}
              onChangeText={(v) => handleTimeChange('wakeTime', v)}
              style={[styles.timeInput, { color: colors.foreground, borderBottomColor: colors.border }]}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <View style={[styles.timeDivider, { backgroundColor: colors.border }]} />
          <View style={styles.timeItem}>
            <Ionicons name="moon-outline" size={18} color={colors.accent} />
            <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>Sleep</Text>
            <TextInput
              value={profile.bedTime}
              onChangeText={(v) => handleTimeChange('bedTime', v)}
              style={[styles.timeInput, { color: colors.foreground, borderBottomColor: colors.border }]}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Philosophy</Text>
        {[
          { icon: 'analytics-outline', text: 'Self-monitoring: The act of tracking changes behavior' },
          { icon: 'home-outline', text: 'Environment > Motivation: Behavior follows context' },
          { icon: 'person-outline', text: 'Identity-based habits: Sustain what aligns with who you are' },
          { icon: 'refresh-outline', text: 'Never miss twice: A missed day is data, not failure' },
        ].map((item, i) => (
          <View key={i} style={[styles.principleRow, { borderTopColor: colors.border }]}>
            <Ionicons name={item.icon as any} size={16} color={colors.accent} />
            <Text style={[styles.principleText, { color: colors.mutedForeground }]}>{item.text}</Text>
          </View>
        ))}
      </View>

      {relapseLogs.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Setbacks</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            Logged for reflection — not judgment
          </Text>
          {relapseLogs.slice(-3).reverse().map(log => (
            <View key={log.id} style={[styles.relapseRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.relapseDate, { color: colors.mutedForeground }]}>
                {new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <View style={styles.relapseContent}>
                <Text style={[styles.relapseMetric, { color: colors.foreground }]}>{log.metricName}</Text>
                <Text style={[styles.relapseAction, { color: colors.scoreGreen }]}>→ {log.nextAction}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  nameSection: { paddingBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameText: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  nameInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    borderBottomWidth: 2,
    paddingBottom: 4,
  },
  nameSubtext: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    padding: 14,
    borderWidth: 1,
    gap: 6,
    alignItems: 'flex-start',
  },
  statValue: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  section: { borderWidth: 1, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  sectionSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: -4 },
  weekSelector: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weekBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCenter: { flex: 1, alignItems: 'center' },
  weekNumber: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  weekTheme: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeItem: { flex: 1, alignItems: 'center', gap: 6 },
  timeLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 1 },
  timeInput: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    borderBottomWidth: 1,
    paddingBottom: 4,
    textAlign: 'center',
    minWidth: 80,
  },
  timeDivider: { width: 1, height: 60, marginHorizontal: 8 },
  principleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  principleText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  relapseRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  relapseDate: { fontSize: 12, fontFamily: 'Inter_500Medium', minWidth: 48 },
  relapseContent: { flex: 1, gap: 4 },
  relapseMetric: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  relapseAction: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
