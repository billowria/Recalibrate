import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
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
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, BADGES } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/GlassCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { customFetch } from '@workspace/api-client-react';
import {
  NotificationSettings,
  getNotificationSettings,
  setNotificationSettings,
  requestNotificationPermissions,
  areNotificationsEnabled,
  setupAllNotifications,
} from '@/notifications/manager';

// Premium Stat Card component
function PremiumStatCard({
  icon,
  label,
  value,
  color,
  colors,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  colors: any;
}) {
  return (
    <View
      style={[
        statsStyles.card,
        {
          backgroundColor: colors.surfaceMid,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[statsStyles.iconWrapper, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={statsStyles.textWrapper}>
        <Text style={[statsStyles.value, { color: colors.text }]}>{value}</Text>
        <Text style={[statsStyles.label, { color: colors.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}

const statsStyles = StyleSheet.create({
  card: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  value: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    lineHeight: 22,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});

// Custom Premium Toggle Switch
function CustomToggle({
  active,
  onToggle,
  colors,
}: {
  active: boolean;
  onToggle: () => void;
  colors: any;
}) {
  const animatedValue = useRef(new RNAnimated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    RNAnimated.timing(animatedValue, {
      toValue: active ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [active]);

  const toggleTranslate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 18],
  });

  const toggleBg = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.brand.primary],
  });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onToggle}>
      <RNAnimated.View style={[toggleStyles.track, { backgroundColor: toggleBg }]}>
        <RNAnimated.View
          style={[
            toggleStyles.thumb,
            {
              transform: [{ translateX: toggleTranslate }],
              backgroundColor: '#FFFFFF',
            },
          ]}
        />
      </RNAnimated.View>
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  track: {
    width: 38,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    position: 'relative',
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

// Custom Pomodoro Stepper Controller
function FocusStepper({
  label,
  icon,
  color,
  value,
  onChange,
  colors,
}: {
  label: string;
  icon: string;
  color: string;
  value: number;
  onChange: (val: number) => void;
  colors: any;
}) {
  const handleDecrement = () => {
    if (value > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < 120) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + 1);
    }
  };

  return (
    <View style={stepperStyles.row}>
      <View style={[stepperStyles.left, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[stepperStyles.label, { color: colors.text }]}>{label}</Text>
      
      <View style={stepperStyles.controls}>
        <TouchableOpacity
          onPress={handleDecrement}
          style={[stepperStyles.btn, { borderColor: colors.border, backgroundColor: colors.surfaceHigh }]}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={16} color={colors.text} />
        </TouchableOpacity>
        
        <View style={stepperStyles.valueContainer}>
          <Text style={[stepperStyles.value, { color: color }]}>{value}</Text>
          <Text style={[stepperStyles.unit, { color: colors.textMuted }]}>min</Text>
        </View>
        
        <TouchableOpacity
          onPress={handleIncrement}
          style={[stepperStyles.btn, { borderColor: colors.border, backgroundColor: colors.surfaceHigh }]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  left: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueContainer: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  value: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  unit: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
  },
});

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile,
    updateProfile,
    metrics,
    dailyLogs,
    journalEntries,
    relapseLogs,
    disciplineScore,
    totalXP,
    currentLevel,
    currentStreak,
    highestStreak,
    badges,
    levelProgress,
    levelMax,
    availablePrograms,
    getProgramProgress,
    exportData,
    deleteAllData,
    logout,
    pomodoroSettings,
    setPomodoroSettings,
    themeMode,
    setThemeMode,
  } = useApp();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [wakeInput, setWakeInput] = useState(profile.wakeTime);
  const [bedInput, setBedInput] = useState(profile.bedTime);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifPermGranted, setNotifPermGranted] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    getNotificationSettings().then(setNotifSettings);
    areNotificationsEnabled().then(setNotifPermGranted);
    AsyncStorage.getItem('lastSessionEmail').then((e) => {
      if (e) setUserEmail(e);
    });
  }, []);

  const handleToggleNotif = async (key: keyof NotificationSettings) => {
    if (!notifSettings) return;
    const nextValue = !notifSettings[key];
    const next = { ...notifSettings, [key]: nextValue };
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifSettings(next);
    await setNotificationSettings({ [key]: nextValue });

    if (key === 'enabled') {
      if (nextValue) {
        const granted = await requestNotificationPermissions();
        setNotifPermGranted(granted);
        if (granted) {
          await setupAllNotifications(next);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert('Permission denied', 'Enable notifications in your device settings to use reminders.');
          setNotifSettings({ ...notifSettings, enabled: false });
          await setNotificationSettings({ enabled: false });
        }
      } else {
        await setupAllNotifications(next);
      }
    } else {
      await setupAllNotifications(next);
    }
  };

  const handleSaveName = () => {
    if (nameInput.trim()) {
      updateProfile({ name: nameInput.trim() });
    }
    setEditingName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveTimes = () => {
    updateProfile({
      wakeTime: wakeInput.trim() || profile.wakeTime,
      bedTime: bedInput.trim() || profile.bedTime,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleExportData = async () => {
    try {
      const csv = exportData();
      if (Platform.OS === 'web') {
        Alert.alert(
          'Data Export',
          `Your data contains ${csv.split('\n').length - 1} rows. In a native app, this would download as CSV.`
        );
        return;
      }
      await Share.share({
        title: 'Discipline OS — My Data Export',
        message: csv,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleTestPush = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;
      await customFetch(`/users/${userId}/test-push`, { method: 'POST' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Error', 'Could not send test push notification');
    }
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

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'You will be signed out. Your data will remain safely on this device. You can sign back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const totalDaysTracked = new Set(dailyLogs.map((l) => l.date)).size;
  const enrolledPrograms = availablePrograms.filter((p) => profile.activeProgramIds.includes(p.id));

  // Visual highlight colors
  const scoreColor = colors.getScoreColor(disciplineScore);
  const scoreGradient = colors.getScoreGradient(disciplineScore);
  const levelPct = levelMax > 0 ? (levelProgress / levelMax) * 100 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPadding + 16,
          paddingBottom: Platform.OS === 'web' ? 140 : 120,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your stats & discipline settings
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={handleLogout}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: colors.destructive + '12',
              borderColor: colors.destructive + '30',
            },
          ]}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={15} color={colors.destructive} />
          <Text style={[styles.logoutBtnText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ─── IDENTITY CARD (GLASSMORPHIC) ─── */}
      <GlassCard style={styles.identityCard} elevated>
        <View style={styles.identityHeader}>
          {/* Glowing Avatar */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={colors.gradients.primaryShort}
              style={styles.avatarGradientRing}
            >
              <View style={[styles.avatarInner, { backgroundColor: colors.surfaceMid }]}>
                <Text style={styles.avatarEmoji}>🧭</Text>
              </View>
            </LinearGradient>
            
            {/* Level Badge Overlay */}
            <LinearGradient
              colors={colors.gradients.primaryShort}
              style={styles.levelBadge}
            >
              <Text style={styles.levelBadgeText}>{currentLevel}</Text>
            </LinearGradient>
          </View>

          {/* User Details */}
          <View style={styles.identityDetails}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.nameInput,
                    {
                      color: colors.text,
                      borderColor: colors.brand.primary,
                      backgroundColor: colors.surfaceHigh,
                    },
                  ]}
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity
                  onPress={handleSaveName}
                  style={[styles.saveNameBtn, { backgroundColor: colors.brand.primary }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setEditingName(true);
                  setNameInput(profile.name);
                }}
                activeOpacity={0.7}
                style={styles.nameRow}
              >
                <Text style={[styles.identityName, { color: colors.text }]}>
                  {profile.name || 'Anonymous User'}
                </Text>
                <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            
            {userEmail ? (
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{userEmail}</Text>
            ) : null}
            
            <Text style={[styles.xpText, { color: colors.textMuted }]}>
              {totalXP} XP earned
            </Text>
          </View>
        </View>

        {/* Level Progress Bar */}
        <View style={styles.levelProgressSection}>
          <View style={styles.levelBarLabelRow}>
            <Text style={[styles.levelBarLabel, { color: colors.textSecondary }]}>Level Progress</Text>
            <Text style={[styles.levelBarVal, { color: colors.brand.primaryLight }]}>
              {levelProgress} / {levelMax} XP
            </Text>
          </View>
          <View style={[styles.levelBarBg, { backgroundColor: colors.border }]}>
            <LinearGradient
              colors={colors.gradients.primaryShort}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.levelBarFill, { width: `${levelPct}%` }]}
            />
          </View>
        </View>
      </GlassCard>

      {/* ─── AI COACH ─── */}
      <TouchableOpacity onPress={() => router.push('/coach')} activeOpacity={0.85} style={{ marginBottom: 24 }}>
        <LinearGradient
          colors={colors.gradients.primaryShort}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={24} color="#FFF" />
            </View>
            <View>
              <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: '#FFF' }}>AI Coach</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.85)' }}>Your personal behavior guide</Text>
            </View>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 12 }}>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* ─── STATS GRID ─── */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>STATISTICS INSIGHTS</Text>
      <View style={styles.statsGrid}>
        <PremiumStatCard
          icon="flame"
          label="Current Streak"
          value={`${currentStreak}d`}
          color={colors.brand.primary}
          colors={colors}
        />
        <PremiumStatCard
          icon="trophy"
          label="All-Time Best"
          value={`${highestStreak}d`}
          color={colors.brand.secondary}
          colors={colors}
        />
        <PremiumStatCard
          icon="calendar"
          label="Days Tracked"
          value={`${totalDaysTracked}`}
          color={colors.brand.success}
          colors={colors}
        />
        <PremiumStatCard
          icon="book"
          label="Journal Logs"
          value={`${journalEntries.length}`}
          color={colors.brand.calm}
          colors={colors}
        />
        <PremiumStatCard
          icon="pulse"
          label="Today's Score"
          value={`${disciplineScore}%`}
          color={scoreColor}
          colors={colors}
        />
        <PremiumStatCard
          icon="checkmark-done-circle"
          label="Total Check-ins"
          value={`${dailyLogs.length}`}
          color={colors.brand.success}
          colors={colors}
        />
        <PremiumStatCard
          icon="shield-half"
          label="Lapses Logged"
          value={`${relapseLogs.length}`}
          color={colors.brand.danger}
          colors={colors}
        />
        <PremiumStatCard
          icon="star"
          label="Badges Unlocked"
          value={`${badges.length}`}
          color={colors.brand.xp}
          colors={colors}
        />
      </View>

      {/* ─── BADGES EARNED ─── */}
      {badges.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>UNLOCKED BADGES</Text>
          <GlassCard style={styles.sectionCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
              {badges.map((bId) => {
                const badge = BADGES.find((b) => b.id === bId);
                if (!badge) return null;
                return (
                  <View
                    key={bId}
                    style={[
                      styles.badgeItem,
                      {
                        backgroundColor: colors.surfaceHigh,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.badgeIconBg}>
                      <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    </View>
                    <Text style={[styles.badgeName, { color: colors.text }]}>{badge.name}</Text>
                    <Text style={[styles.badgeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {badge.description}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </GlassCard>
        </>
      )}

      {/* ─── ACTIVE PROGRAMS ─── */}
      {enrolledPrograms.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACTIVE PROTOCOLS</Text>
          {enrolledPrograms.map((prog) => {
            const progress = getProgramProgress(prog.id);
            if (!progress) return null;
            const pct = (progress.completedWeeks.length / prog.totalWeeks) * 100;
            return (
              <GlassCard
                key={prog.id}
                style={styles.programCard}
                borderColor={prog.color + '30'}
              >
                <View style={styles.progCardTop}>
                  <Text style={styles.progEmoji}>{prog.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.progTitle, { color: colors.text }]}>{prog.title}</Text>
                    <Text style={[styles.progMeta, { color: colors.textSecondary }]}>
                      Week {progress.currentWeek} of {prog.totalWeeks} · {progress.completedWeeks.length} complete
                    </Text>
                  </View>
                  <Text style={[styles.progPct, { color: prog.color }]}>{Math.round(pct)}%</Text>
                </View>
                
                <View style={[styles.progBarBg, { backgroundColor: colors.border }]}>
                  <LinearGradient
                    colors={[prog.color, prog.color + 'A0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progBarFill, { width: `${pct}%` }]}
                  />
                </View>
              </GlassCard>
            );
          })}
        </>
      )}

      {/* ─── SCORE FORMULA BREAKDOWN ─── */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SCORE FORMULA</Text>
      <GlassCard style={styles.sectionCard}>
        <Text style={[styles.formulaIntro, { color: colors.textSecondary }]}>
          Your daily Discipline Score is a weighted combination of habits and focus. Updates dynamically as you log.
        </Text>
        {[
          { label: 'Build Habits', pct: 38, color: colors.brand.success },
          { label: 'Reduce Habits', pct: 32, color: colors.brand.danger },
          { label: 'Monitoring Check-ins', pct: 20, color: colors.brand.warning },
          { label: 'Focus Cycles', pct: 10, color: colors.brand.primary },
        ].map((w) => (
          <View key={w.label} style={styles.formulaRow}>
            <View style={[styles.formulaColorDot, { backgroundColor: w.color }]} />
            <Text style={[styles.formulaLabel, { color: colors.text }]}>{w.label}</Text>
            <View style={[styles.formulaBarBg, { backgroundColor: colors.border }]}>
              <View style={[styles.formulaBarFill, { width: `${w.pct}%`, backgroundColor: w.color }]} />
            </View>
            <Text style={[styles.formulaPct, { color: w.color }]}>{w.pct}%</Text>
          </View>
        ))}
        
        <View
          style={[
            styles.formulaNote,
            {
              backgroundColor: colors.brand.primaryGlowSoft,
              borderColor: colors.brand.primary + '20',
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={15} color={colors.brand.primaryLight} />
          <Text style={[styles.formulaNoteText, { color: colors.textSecondary }]}>
            Deep Focus Pomodoro cycles award up to +10 bonus points. Sensitivity-masked trackers do not penalize your public index.
          </Text>
        </View>
      </GlassCard>

      {/* ─── FOCUS TIMER CYCLES ─── */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>FOCUS TIMER CYCLES</Text>
      <GlassCard style={styles.sectionCard}>
        <Text style={[styles.focusTimerDesc, { color: colors.textSecondary }]}>
          Configure your deep work Pomodoro periods. Custom configurations apply instantly to your next focus session.
        </Text>
        <FocusStepper
          label="Work Session"
          icon="flame-outline"
          color={colors.brand.primary}
          value={pomodoroSettings.workMinutes}
          onChange={(val) => setPomodoroSettings({ workMinutes: val })}
          colors={colors}
        />
        <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
        <FocusStepper
          label="Short Break"
          icon="leaf-outline"
          color={colors.brand.success}
          value={pomodoroSettings.shortBreak}
          onChange={(val) => setPomodoroSettings({ shortBreak: val })}
          colors={colors}
        />
        <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
        <FocusStepper
          label="Long Break"
          icon="cafe-outline"
          color={colors.brand.warning}
          value={pomodoroSettings.longBreak}
          onChange={(val) => setPomodoroSettings({ longBreak: val })}
          colors={colors}
        />
      </GlassCard>

      {/* ─── NOTIFICATIONS & REMINDERS ─── */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>RECALIBRATE REMINDERS</Text>
      <GlassCard style={styles.sectionCard}>
        <View style={styles.notifMainRow}>
          <View style={styles.notifIconBg}>
            <Ionicons name="notifications-outline" size={16} color={colors.brand.primaryLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifLabel, { color: colors.text }]}>Push Notifications</Text>
            <Text style={[styles.notifSubtext, { color: colors.textSecondary }]}>
              Tactile triggers and evening check-in reminders
            </Text>
          </View>
          <CustomToggle
            active={notifSettings?.enabled ?? false}
            onToggle={() => handleToggleNotif('enabled')}
            colors={colors}
          />
        </View>

        {(notifSettings?.enabled ?? false) && (
          <View style={styles.subNotifsContainer}>
            <View style={[styles.settingDivider, { backgroundColor: colors.border, marginVertical: 8 }]} />
            {[
              { key: 'trackingReminder' as const, label: 'Morning setup alert', icon: 'sunny-outline' },
              { key: 'eveningReminder' as const, label: 'Evening recap prompt', icon: 'moon-outline' },
              { key: 'journalReminder' as const, label: 'Daily reflection prompt', icon: 'book-outline' },
              { key: 'streakRiskReminder' as const, label: 'Streak risk warning', icon: 'flame-outline' },
              { key: 'pomodoroReminder' as const, label: 'Focus countdown notifications', icon: 'time-outline' },
            ].map((item) => (
              <View key={item.key} style={styles.subNotifRow}>
                <Ionicons name={item.icon as any} size={15} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <Text style={[styles.subNotifText, { color: colors.text }]}>{item.label}</Text>
                <CustomToggle
                  active={notifSettings?.[item.key] ?? false}
                  onToggle={() => handleToggleNotif(item.key)}
                  colors={colors}
                />
              </View>
            ))}

            <TouchableOpacity
              onPress={handleTestPush}
              style={[
                styles.testPushBtn,
                {
                  backgroundColor: colors.brand.primaryGlowSoft,
                  borderColor: colors.brand.primary + '30',
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="paper-plane" size={14} color={colors.brand.primaryLight} />
              <Text style={[styles.testPushText, { color: colors.brand.primaryLight }]}>
                Send Test Push Notification
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </GlassCard>

      {/* ─── DAILY TARGETS ─── */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CIRCADIAN TARGETS</Text>
      <GlassCard style={styles.sectionCard}>
        <View style={styles.timeInputRow}>
          <View style={[styles.timeIconWrap, { backgroundColor: colors.brand.warning + '12' }]}>
            <Ionicons name="sunny-outline" size={18} color={colors.brand.warning} />
          </View>
          <Text style={[styles.timeLabel, { color: colors.text }]}>Wake-up Target</Text>
          <TextInput
            value={wakeInput}
            onChangeText={setWakeInput}
            onBlur={handleSaveTimes}
            placeholder="06:00"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.timeTextInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceHigh,
              },
            ]}
          />
        </View>
        <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
        <View style={styles.timeInputRow}>
          <View style={[styles.timeIconWrap, { backgroundColor: colors.brand.primary + '12' }]}>
            <Ionicons name="moon-outline" size={18} color={colors.brand.primaryLight} />
          </View>
          <Text style={[styles.timeLabel, { color: colors.text }]}>Bedtime Target</Text>
          <TextInput
            value={bedInput}
            onChangeText={setBedInput}
            onBlur={handleSaveTimes}
            placeholder="22:30"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.timeTextInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceHigh,
              },
            ]}
          />
        </View>
      </GlassCard>

      {/* ─── APPEARANCE ─── */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
      <GlassCard style={styles.sectionCard}>
        <Text style={[styles.appearanceDesc, { color: colors.textSecondary }]}>
          Choose your interface theme. System adapts to your device settings.
        </Text>
        <View style={[styles.themeSelectorContainer, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
          {[
            { mode: 'system' as const, label: 'System', icon: 'settings-outline' },
            { mode: 'light' as const, label: 'Light', icon: 'sunny-outline' },
            { mode: 'dark' as const, label: 'Dark', icon: 'moon-outline' },
          ].map((item) => {
            const active = themeMode === item.mode;
            return (
              <TouchableOpacity
                key={item.mode}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setThemeMode(item.mode);
                }}
                style={[
                  styles.themeTab,
                  active && {
                    backgroundColor: colors.brand.primary,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item.icon as any}
                  size={14}
                  color={active ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.themeTabText,
                    {
                      color: active ? '#FFFFFF' : colors.textSecondary,
                      fontFamily: active ? 'Inter_600SemiBold' : 'Inter_500Medium',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </GlassCard>

      {/* ─── DATA MANAGEMENT ─── */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DATA SENSITIVITY</Text>
      <GlassCard style={styles.sectionCard}>
        <View style={styles.dataOwnershipRow}>
          <Ionicons name="shield-checkmark" size={18} color={colors.brand.success} />
          <Text style={[styles.dataOwnershipText, { color: colors.textSecondary }]}>
            Discipline OS operates offline-first. Your metrics and reflections are stored locally on-device and are never sold or shared.
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={handleExportData}
          style={[
            styles.dataActionBtn,
            {
              backgroundColor: colors.surfaceHigh,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={18} color={colors.brand.primaryLight} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dataActionTitle, { color: colors.text }]}>Export Local Data</Text>
            <Text style={[styles.dataActionSub, { color: colors.textSecondary }]}>
              Generates a full history CSV bundle
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteData}
          style={[
            styles.dataActionBtn,
            {
              backgroundColor: colors.destructive + '12',
              borderColor: colors.destructive + '30',
              marginTop: 10,
            },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dataActionTitle, { color: colors.destructive }]}>
              Erase All Data
            </Text>
            <Text style={[styles.dataActionSub, { color: colors.destructive + 'A0' }]}>
              Irreversibly clears device memory
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.destructive} />
        </TouchableOpacity>
      </GlassCard>

      {/* ─── ONBOARDING REDO ─── */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/onboarding');
        }}
        style={[styles.reOnboardBtn, { borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh" size={14} color={colors.textSecondary} />
        <Text style={[styles.reOnboardText, { color: colors.textSecondary }]}>
          Re-run behavioral setup wizard
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  identityCard: {
    padding: 16,
    marginBottom: 8,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradientRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  levelBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  identityDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  saveNameBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  userEmail: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  xpText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  levelProgressSection: {
    marginTop: 18,
  },
  levelBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelBarLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  levelBarVal: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  levelBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    marginTop: 14,
    marginBottom: 4,
    paddingLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sectionCard: {
    padding: 16,
  },
  badgeScroll: {
    gap: 12,
    paddingRight: 16,
  },
  badgeItem: {
    width: 105,
    padding: 12,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeName: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 9,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
    height: 24,
  },
  programCard: {
    padding: 14,
    borderWidth: 1,
  },
  progCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progEmoji: {
    fontSize: 24,
  },
  progTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  progMeta: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  progPct: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  progBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  formulaIntro: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 12,
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  formulaColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  formulaLabel: {
    width: 120,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  formulaBarBg: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  formulaBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  formulaPct: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    width: 32,
    textAlign: 'right',
  },
  formulaNote: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 12,
  },
  formulaNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  settingDivider: {
    height: 1,
    marginVertical: 4,
  },
  focusTimerDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 12,
  },
  notifMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(91, 94, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  notifSubtext: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  subNotifsContainer: {
    marginTop: 8,
  },
  subNotifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  subNotifText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  testPushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 14,
  },
  testPushText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  timeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timeLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  timeTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    width: 66,
    textAlign: 'center',
  },
  dataOwnershipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  dataOwnershipText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  dataActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  dataActionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  dataActionSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  reOnboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
  },
  reOnboardText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  appearanceDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 14,
  },
  themeSelectorContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  themeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  themeTabText: {
    fontSize: 13,
  },
});
