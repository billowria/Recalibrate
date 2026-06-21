import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, BADGES } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { AVAILABLE_PROGRAMS } from '@/constants/program';

const SCORE_WEIGHT_LABELS = [
  { label: 'Build habits', pct: 38, color: '#22c55e' },
  { label: 'Reduce habits', pct: 32, color: '#ef4444' },
  { label: 'Monitoring', pct: 20, color: '#f59e0b' },
  { label: 'Focus bonus', pct: 10, color: '#6366f1' },
];

function StatCard({ icon, label, value, color, colors }: { icon: any; label: string; value: string; color: string; colors: any }) {
  return (
    <View style={[scStyles.card, { backgroundColor: color + '0E', borderColor: color + '25', borderRadius: colors.radius }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[scStyles.val, { color: colors.foreground }]}>{value}</Text>
      <Text style={[scStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}
const scStyles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4, borderWidth: 1 },
  val: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 9, fontFamily: 'Inter_500Medium', letterSpacing: 1, textAlign: 'center' },
});

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[shStyles.label, { color: colors.mutedForeground }]}>{title}</Text>
  );
}
const shStyles = StyleSheet.create({
  label: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginTop: 4 },
});

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile, updateProfile, metrics, dailyLogs, journalEntries, relapseLogs,
    disciplineScore, totalXP, currentLevel, currentStreak, highestStreak,
    badges, levelProgress, levelMax, availablePrograms, getProgramProgress,
    exportData, deleteAllData,
  } = useApp();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [wakeInput, setWakeInput] = useState(profile.wakeTime);
  const [bedInput, setBedInput] = useState(profile.bedTime);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const totalDaysTracked = new Set(dailyLogs.map(l => l.date)).size;
  const avgDailyLogs = totalDaysTracked > 0 ? Math.round(dailyLogs.length / totalDaysTracked) : 0;
  const enrolledPrograms = availablePrograms.filter(p => profile.activeProgramIds.includes(p.id));

  const handleSaveName = () => {
    if (nameInput.trim()) updateProfile({ name: nameInput.trim() });
    setEditingName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveTimes = () => {
    updateProfile({ wakeTime: wakeInput.trim() || profile.wakeTime, bedTime: bedInput.trim() || profile.bedTime });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleExportData = async () => {
    try {
      const csv = exportData();
      if (Platform.OS === 'web') {
        Alert.alert('Data Export', `Your data contains ${csv.split('\n').length - 1} rows. In a native app, this would download as CSV.`);
        return;
      }
      await Share.share({
        title: 'Discipline OS — My Data Export',
        message: csv,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleDeleteData = () => {
    Alert.alert(
      'Delete All Data?',
      'This permanently removes all your tracking logs, journal entries, program progress, and profile. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const streakColor = currentStreak >= 14 ? colors.scoreGreen : currentStreak >= 7 ? colors.primary : colors.mutedForeground;
  const scoreColor = disciplineScore >= 75 ? colors.scoreGreen : disciplineScore >= 40 ? colors.scoreYellow : colors.scoreRed;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, {
        paddingTop: topPadding + 16,
        paddingBottom: Platform.OS === 'web' ? 140 : 120,
      }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your stats & settings</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/onboarding')}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* ─── IDENTITY CARD ─── */}
      <View style={[styles.identityCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={[styles.avatarWrap, { backgroundColor: colors.primary + '15' }]}>
          <Text style={styles.avatarEmoji}>🧭</Text>
        </View>
        <View style={styles.identityRight}>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.nameInput, { color: colors.foreground, borderColor: colors.primary, backgroundColor: colors.background }]}
                onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity onPress={handleSaveName} style={[styles.saveNameBtn, { backgroundColor: colors.primary }]} activeOpacity={0.7}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setEditingName(true); setNameInput(profile.name); }} activeOpacity={0.7} style={styles.nameRow}>
              <Text style={[styles.identityName, { color: colors.foreground }]}>
                {profile.name || 'Set your name'}
              </Text>
              <Ionicons name="pencil-outline" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          <View style={[styles.levelPill, { backgroundColor: colors.primary }]}>
            <Text style={styles.levelPillText}>LVL {currentLevel}</Text>
          </View>
          <View style={[styles.levelBarBg, { backgroundColor: colors.border }]}>
            <View style={[styles.levelBarFill, { width: `${(levelProgress / levelMax) * 100}%` as any, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>
            {totalXP} XP total · {levelMax - levelProgress} to next level
          </Text>
        </View>
      </View>

      {/* ─── STATS GRID ─── */}
      <View style={styles.statsRow}>
        <StatCard icon="flame-outline" label="Streak" value={`${currentStreak}d`} color={streakColor} colors={colors} />
        <StatCard icon="trophy-outline" label="Best" value={`${highestStreak}d`} color="#f59e0b" colors={colors} />
        <StatCard icon="calendar-outline" label="Days" value={`${totalDaysTracked}`} color={colors.primary} colors={colors} />
        <StatCard icon="book-outline" label="Journals" value={`${journalEntries.length}`} color="#6366f1" colors={colors} />
      </View>
      <View style={styles.statsRow}>
        <StatCard icon="pulse-outline" label="Today score" value={`${disciplineScore}`} color={scoreColor} colors={colors} />
        <StatCard icon="checkmark-done-outline" label="Total logs" value={`${dailyLogs.length}`} color={colors.scoreGreen} colors={colors} />
        <StatCard icon="shield-outline" label="Setbacks" value={`${relapseLogs.length}`} color={colors.scoreRed} colors={colors} />
        <StatCard icon="star-outline" label="Badges" value={`${badges.length}`} color="#f59e0b" colors={colors} />
      </View>

      {/* ─── BADGES ─── */}
      {badges.length > 0 && (
        <>
          <SectionHeader title="BADGES EARNED" colors={colors} />
          <View style={[styles.badgesCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.badgeGrid}>
              {badges.map(bId => {
                const badge = BADGES.find(b => b.id === bId);
                if (!badge) return null;
                return (
                  <View key={bId} style={[styles.badgeItem, { backgroundColor: colors.primary + '12', borderRadius: 10 }]}>
                    <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    <Text style={[styles.badgeName, { color: colors.primary }]}>{badge.name}</Text>
                    <Text style={[styles.badgeDesc, { color: colors.mutedForeground }]}>{badge.description}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}

      {/* ─── PROGRAMS ─── */}
      {enrolledPrograms.length > 0 && (
        <>
          <SectionHeader title="ACTIVE PROGRAMS" colors={colors} />
          {enrolledPrograms.map(prog => {
            const progress = getProgramProgress(prog.id);
            if (!progress) return null;
            const pct = (progress.completedWeeks.length / prog.totalWeeks) * 100;
            return (
              <View key={prog.id} style={[styles.progCard, { backgroundColor: prog.color + '0E', borderColor: prog.color + '30', borderRadius: colors.radius }]}>
                <View style={styles.progCardTop}>
                  <Text style={styles.progEmoji}>{prog.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.progTitle, { color: colors.foreground }]}>{prog.title}</Text>
                    <Text style={[styles.progMeta, { color: colors.mutedForeground }]}>
                      Week {progress.currentWeek} / {prog.totalWeeks} · {progress.completedWeeks.length} weeks complete
                    </Text>
                  </View>
                  <Text style={[styles.progPct, { color: prog.color }]}>{Math.round(pct)}%</Text>
                </View>
                <View style={[styles.progBarBg, { backgroundColor: prog.color + '20' }]}>
                  <View style={[styles.progBarFill, { width: `${pct}%` as any, backgroundColor: prog.color }]} />
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* ─── SCORE FORMULA ─── */}
      <SectionHeader title="SCORE FORMULA" colors={colors} />
      <View style={[styles.formulaCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.formulaIntro, { color: colors.mutedForeground }]}>
          Your discipline score is a weighted combination of four dimensions. It updates each time you log.
        </Text>
        {SCORE_WEIGHT_LABELS.map(w => (
          <View key={w.label} style={styles.formulaRow}>
            <View style={[styles.formulaColorDot, { backgroundColor: w.color }]} />
            <Text style={[styles.formulaLabel, { color: colors.foreground }]}>{w.label}</Text>
            <View style={[styles.formulaBarBg, { backgroundColor: colors.border }]}>
              <View style={[styles.formulaBarFill, { width: `${w.pct}%` as any, backgroundColor: w.color }]} />
            </View>
            <Text style={[styles.formulaPct, { color: w.color }]}>{w.pct}%</Text>
          </View>
        ))}
        <View style={[styles.formulaNote, { backgroundColor: colors.primary + '0E', borderRadius: 8, borderColor: colors.primary + '25' }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
          <Text style={[styles.formulaNoteText, { color: colors.mutedForeground }]}>
            Focus sessions add up to +10 bonus points. Sensitivity-masked metrics don't affect others' view.
          </Text>
        </View>
      </View>

      {/* ─── TIMES ─── */}
      <SectionHeader title="DAILY TARGETS" colors={colors} />
      <View style={[styles.timesCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.timeRow}>
          <Ionicons name="sunny-outline" size={18} color="#f59e0b" />
          <Text style={[styles.timeLabel, { color: colors.foreground }]}>Wake time</Text>
          <TextInput
            value={wakeInput}
            onChangeText={setWakeInput}
            onBlur={handleSaveTimes}
            placeholder="06:00"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
          />
        </View>
        <View style={[styles.timeDivider, { backgroundColor: colors.border }]} />
        <View style={styles.timeRow}>
          <Ionicons name="moon-outline" size={18} color="#6366f1" />
          <Text style={[styles.timeLabel, { color: colors.foreground }]}>Bed time</Text>
          <TextInput
            value={bedInput}
            onChangeText={setBedInput}
            onBlur={handleSaveTimes}
            placeholder="22:30"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
          />
        </View>
      </View>

      {/* ─── DATA SECTION ─── */}
      <SectionHeader title="YOUR DATA" colors={colors} />
      <View style={[styles.dataCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.dataStats}>
          <View style={styles.dataStat}>
            <Text style={[styles.dataStatNum, { color: colors.foreground }]}>{dailyLogs.length}</Text>
            <Text style={[styles.dataStatLabel, { color: colors.mutedForeground }]}>log entries</Text>
          </View>
          <View style={[styles.dataStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.dataStat}>
            <Text style={[styles.dataStatNum, { color: colors.foreground }]}>{journalEntries.length}</Text>
            <Text style={[styles.dataStatLabel, { color: colors.mutedForeground }]}>journals</Text>
          </View>
          <View style={[styles.dataStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.dataStat}>
            <Text style={[styles.dataStatNum, { color: colors.foreground }]}>{totalDaysTracked}</Text>
            <Text style={[styles.dataStatLabel, { color: colors.mutedForeground }]}>days tracked</Text>
          </View>
        </View>
        <Text style={[styles.dataOwnership, { color: colors.mutedForeground }]}>
          All your data lives only on this device. It is never shared or uploaded.
        </Text>
        <TouchableOpacity
          onPress={handleExportData}
          style={[styles.dataActionBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30', borderRadius: 10 }]}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dataActionTitle, { color: colors.primary }]}>Export data as CSV</Text>
            <Text style={[styles.dataActionSub, { color: colors.mutedForeground }]}>
              All logs, journals, and metrics
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeleteData}
          style={[styles.dataActionBtn, { backgroundColor: colors.destructive + '0E', borderColor: colors.destructive + '25', borderRadius: 10 }]}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dataActionTitle, { color: colors.destructive }]}>Delete all data</Text>
            <Text style={[styles.dataActionSub, { color: colors.mutedForeground }]}>
              Permanently wipe everything. Irreversible.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      {/* ─── ONBOARDING REDO ─── */}
      <TouchableOpacity
        onPress={() => router.push('/onboarding')}
        style={[styles.reOnboardBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
        <Text style={[styles.reOnboardText, { color: colors.mutedForeground }]}>Re-run setup wizard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  identityCard: { borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 28 },
  identityRight: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  saveNameBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  identityName: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  levelPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  levelPillText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
  levelBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  levelBarFill: { height: 4, borderRadius: 2 },
  xpLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  statsRow: { flexDirection: 'row', gap: 8 },
  badgesCard: { borderWidth: 1, padding: 14 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeItem: { padding: 12, alignItems: 'center', gap: 4, minWidth: 80 },
  badgeEmoji: { fontSize: 24 },
  badgeName: { fontSize: 11, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  badgeDesc: { fontSize: 9, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  progCard: { borderWidth: 1, padding: 14, gap: 8 },
  progCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progEmoji: { fontSize: 22 },
  progTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  progMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  progPct: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  progBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progBarFill: { height: 4, borderRadius: 2 },
  formulaCard: { borderWidth: 1, padding: 16, gap: 10 },
  formulaIntro: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  formulaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formulaColorDot: { width: 8, height: 8, borderRadius: 4 },
  formulaLabel: { width: 100, fontSize: 12, fontFamily: 'Inter_500Medium' },
  formulaBarBg: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  formulaBarFill: { height: 5, borderRadius: 3 },
  formulaPct: { fontSize: 11, fontFamily: 'Inter_700Bold', width: 30, textAlign: 'right' },
  formulaNote: { flexDirection: 'row', gap: 8, padding: 10, alignItems: 'flex-start', borderWidth: 1 },
  formulaNoteText: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  timesCard: { borderWidth: 1, padding: 14, gap: 0 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  timeLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  timeInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontFamily: 'Inter_700Bold', width: 80, textAlign: 'center' },
  timeDivider: { height: 1 },
  dataCard: { borderWidth: 1, padding: 14, gap: 12 },
  dataStats: { flexDirection: 'row', alignItems: 'center' },
  dataStat: { flex: 1, alignItems: 'center', gap: 2 },
  dataStatNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  dataStatLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  dataStatDivider: { width: 1, height: 30 },
  dataOwnership: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  dataActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14 },
  dataActionTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  dataActionSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  reOnboardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 13 },
  reOnboardText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
