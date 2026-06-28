import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import { setBaseUrl, customFetch } from '@workspace/api-client-react';
import { AVAILABLE_PROGRAMS, DEFAULT_METRICS, DefaultMetric, Program, PROGRAM_WEEKS } from '@/constants/program';
import { updateStreakRiskFromLog, registerForPushNotificationsAsync } from '@/notifications/manager';

const debuggerHost = Constants.expoConfig?.hostUri;
const host = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
const API_URL = `http://${host}:5001/api`;
setBaseUrl(API_URL);

export interface UserProfile {
  name: string;
  currentWeek: number;
  wakeTime: string;
  bedTime: string;
  startDate: string;
  totalXP: number;
  highestStreak: number;
  badges: string[];
  activeProgramIds: string[];
  savedProgramIds: string[];
  programProgress: Record<string, ProgramProgress>;
  onboardingComplete?: boolean;
  selectedBuildMetricIds?: string[];
  selectedReduceMetricIds?: string[];
  notificationSettings?: import('@/notifications/manager').NotificationSettings;
}

export interface ProgramProgress {
  currentWeek: number;
  weekStartDate: string;
  completedWeeks: number[];
  resetCount: number;
}

export interface TrackedMetric extends DefaultMetric {
  isCustom?: boolean;
  implementationIntention?: string;
  programId?: string; // set if this metric was injected by a program
}

export interface HabitContext {
  // For reduction habits (smoking, alcohol, junk food…)
  trigger?: 'stress' | 'boredom' | 'social' | 'habit' | 'craving' | 'other';
  setting?: 'home' | 'work' | 'social' | 'commute' | 'other';
  intensity?: number; // 1–5: how strong the urge was
  // For build habits (workout, deep work…)
  quality?: number; // 1–5: how good the session felt
  note?: string;   // short freeform note
}

export interface DailyLog {
  id: string;
  metricId: string;
  date: string;
  value: number;
  note?: string;
  context?: HabitContext;
}

export interface JournalEntry {
  id: string;
  date: string;
  prompt: string;
  response: string;
  // Freeform second entry (personal reflection beyond prompt)
  freeResponse?: string;
  // Replaced mood/energy with richer program context
  programContext?: {
    missedTaskIds?: string[];
    hitTaskIds?: string[];
    programId?: string;
  };
  tags?: string[];
  wordCount?: number;
  // Set to true for Sunday weekly reflections (replaces daily prompt)
  isWeeklyReflection?: boolean;
}

export interface PomodoroSettings {
  workMinutes: number;   // default 25
  shortBreak: number;    // default 5
  longBreak: number;     // default 15
}

export interface RelapseLog {
  id: string;
  date: string;
  metricId: string;
  metricName: string;
  triggerCategory: string;
  triggerReflection: string;
  nextAction: string;
  compassionStatement?: string;
}

export interface WeekTaskProgress {
  weekNumber: number;
  taskId: string;
  completed: boolean;
  programId?: string;
}

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  requirement: string;
}

export interface CorrelationInsight {
  id: string;
  icon: string;
  title: string;
  body: string;
  type: 'correlation' | 'streak' | 'trend' | 'motivation';
  color: string;
}

export interface WeekGatingStatus {
  daysTracked: number;
  daysJournaled: number;
  tasksCompleted: number;
  totalTasks: number;
  canAdvance: boolean;
  shouldRestart: boolean;
  daysSinceWeekStart: number;
  weekPassThreshold: number;
}

export const BADGES: Badge[] = [
  { id: 'first-log', emoji: '🎯', name: 'First Step', description: 'Log your first habit', requirement: 'any-log' },
  { id: 'streak-3', emoji: '🔥', name: 'On Fire', description: '3-day streak', requirement: 'streak-3' },
  { id: 'streak-7', emoji: '✨', name: 'Week Warrior', description: '7-day streak', requirement: 'streak-7' },
  { id: 'streak-14', emoji: '💪', name: 'Two Weeks Strong', description: '14-day streak', requirement: 'streak-14' },
  { id: 'streak-30', emoji: '🏆', name: 'Unstoppable', description: '30-day streak', requirement: 'streak-30' },
  { id: 'perfect-day', emoji: '⭐', name: 'Perfect Day', description: 'Score 100% in one day', requirement: 'score-100' },
  { id: 'deep-work', emoji: '📚', name: 'Deep Work', description: 'Complete a 90-min session', requirement: 'focus-90' },
  { id: 'journal-5', emoji: '📖', name: 'Reflective', description: '5 journal entries', requirement: 'journal-5' },
  { id: 'journal-20', emoji: '💎', name: 'Philosopher', description: '20 journal entries', requirement: 'journal-20' },
  { id: 'week-complete', emoji: '🎉', name: 'Week Complete', description: 'Finish a full program week', requirement: 'week-done' },
  { id: 'halfway', emoji: '👏', name: 'Halfway Hero', description: 'Complete Week 4', requirement: 'week-4' },
  { id: 'protocol-finish', emoji: '🏁', name: 'Protocol Master', description: 'Complete Week 8', requirement: 'week-8' },
  { id: 'returning', emoji: '🙊', name: 'Back on Track', description: 'Log after a relapse', requirement: 'post-relapse-log' },
  { id: 'early-riser', emoji: '🌅', name: 'Early Riser', description: 'Wake on time 5 days', requirement: 'wake-5' },
  { id: 'hydrated', emoji: '💧', name: 'Hydrated', description: 'Track water 5 days', requirement: 'water-5' },
  { id: 'grace-used', emoji: '🌿', name: 'Grace Day', description: 'Used a grace day and came back', requirement: 'grace-day' },
];

export interface ActivityItem {
  id: string;
  type: 'habit' | 'journal' | 'focus' | 'task' | 'relapse';
  emoji: string;
  text: string;
  time: string;
  date: string;
  xp?: number;
}

interface AppContextType {
  profile: UserProfile;
  metrics: TrackedMetric[];
  dailyLogs: DailyLog[];
  journalEntries: JournalEntry[];
  relapseLogs: RelapseLog[];
  weekTaskProgress: WeekTaskProgress[];
  disciplineScore: number;
  totalXP: number;
  currentStreak: number;
  graceStreakActive: boolean;
  highestStreak: number;
  currentLevel: number;
  levelProgress: number;
  levelMax: number;
  badges: string[];
  dayScore: number;
  completionPct: number;
  availablePrograms: Program[];
  createCustomProgram: (programData: Omit<Program, 'id' | 'isSystem'>) => Promise<any>;
  updateCustomProgram: (programId: string, updates: Partial<Program>) => Promise<any>;
  deleteCustomProgram: (programId: string) => Promise<void>;
  publishProgram: (programId: string, isPublished: boolean) => Promise<any>;
  correlationInsights: CorrelationInsight[];
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logMetric: (metricId: string, date: string, value: number, note?: string, context?: HabitContext) => Promise<void>;
  getLogForDate: (metricId: string, date: string) => DailyLog | undefined;
  getLogsForDate: (date: string) => DailyLog[];
  getLogsForMetric: (metricId: string, days: number) => DailyLog[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'wordCount' | 'tags'>, freeResponse?: string, manualTags?: string[]) => Promise<void>;
  getJournalEntryForDate: (date: string) => JournalEntry | undefined;
  addRelapseLog: (log: Omit<RelapseLog, 'id'>) => Promise<void>;
  toggleWeekTask: (weekNumber: number, taskId: string, programId?: string) => Promise<void>;
  isWeekTaskComplete: (weekNumber: number, taskId: string, programId?: string) => boolean;
  addCustomMetric: (metric: Omit<TrackedMetric, 'id' | 'isDefault' | 'isCustom'>) => Promise<void>;
  deleteMetric: (metricId: string) => Promise<void>;
  focusMinutesToday: number;
  addFocusMinutes: (minutes: number) => Promise<void>;
  addXP: (amount: number) => void;
  getStreak: () => number;
  getStreakRisk: () => boolean;
  getMissedDays: (days: number) => string[];
  getRecentActivity: (count: number) => ActivityItem[];
  getMetricStreak: (metricId: string) => number;
  getMetricConsistency: (metricId: string, days: number) => number;
  enrollProgram: (programId: string) => Promise<void>;
  unenrollProgram: (programId: string) => Promise<void>;
  toggleSavedProgram: (programId: string) => Promise<void>;
  advanceProgramWeek: (programId: string) => Promise<void>;
  restartProgramWeek: (programId: string) => Promise<void>;
  getWeekGatingStatus: (programId: string) => WeekGatingStatus;
  getProgramProgress: (programId: string) => ProgramProgress | undefined;
  exportData: () => string;
  deleteAllData: () => Promise<void>;
  logout: () => Promise<void>;
  login: (userId: string) => Promise<void>;
  // Pomodoro
  pomodoroSettings: PomodoroSettings;
  setPomodoroSettings: (s: Partial<PomodoroSettings>) => Promise<void>;
  // Theme Mode
  themeMode: 'system' | 'light' | 'dark';
  setThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;
  userId: string | null;
}

function xpForLevel(level: number) { return Math.floor(level * level * 100 + level * 50); }
function levelFromXP(xp: number) {
  let level = 1, needed = 100;
  while (xp >= needed) { xp -= needed; level++; needed = xpForLevel(level); }
  return { level, progress: xp, max: needed };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  currentWeek: 1,
  wakeTime: '06:00',
  bedTime: '22:30',
  startDate: new Date().toISOString().split('T')[0],
  totalXP: 0,
  highestStreak: 0,
  badges: [],
  activeProgramIds: ['dopamine-detox-protocol'],
  savedProgramIds: ['dopamine-detox-protocol'],
  programProgress: {
    'dopamine-detox-protocol': {
      currentWeek: 1,
      weekStartDate: new Date().toISOString().split('T')[0],
      completedWeeks: [],
      resetCount: 0,
    },
  },
  onboardingComplete: false,
};

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateDeterministicId(str1: string, str2: string): string {
  const hashStr = str1 + '|' + str2;
  let hash = 0;
  for (let i = 0; i < hashStr.length; i++) {
    const char = hashStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  let hex = Math.abs(hash).toString(16).padEnd(32, 'b');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function calculateDisciplineScore(
  todayLogs: DailyLog[],
  metrics: TrackedMetric[],
  focusMinutes: number
): number {
  const logsByMetric: Record<string, DailyLog> = {};
  for (const log of todayLogs) { logsByMetric[log.metricId] = log; }
  let totalWeight = 0, earnedScore = 0;
  for (const metric of metrics) {
    const log = logsByMetric[metric.id];
    const weight = metric.scoreWeight;
    totalWeight += weight;
    if (!log) continue;
    if (metric.category === 'build') {
      if (metric.inputType === 'boolean') earnedScore += log.value === 1 ? weight : 0;
      else if (metric.inputType === 'scale') earnedScore += (log.value / 10) * weight;
      else if (metric.inputType === 'counter') earnedScore += log.value >= 2 ? weight : (log.value / 2) * weight;
    } else if (metric.category === 'reduce') {
      if (metric.inputType === 'boolean') earnedScore += log.value === 0 ? weight : 0;
      else if (metric.inputType === 'counter') earnedScore += (1 - Math.min(log.value, 10) / 10) * weight;
    } else {
      earnedScore += weight * 0.6;
    }
  }
  const focusBonus = Math.min(focusMinutes / 90, 1) * 10;
  const baseScore = totalWeight > 0 ? (earnedScore / totalWeight) * 90 : 0;
  return Math.min(100, Math.round(baseScore + focusBonus));
}

function computeDayScore(metrics: TrackedMetric[], logs: DailyLog[]) {
  const logsByMetric: Record<string, DailyLog> = {};
  for (const log of logs) { logsByMetric[log.metricId] = log; }
  const completed = metrics.filter(m => {
    const log = logsByMetric[m.id];
    if (!log) return false;
    if (m.category === 'build') return log.value > 0;
    if (m.category === 'reduce') return log.value === 0;
    return true;
  }).length;
  return Math.round((completed / Math.max(metrics.length, 1)) * 100);
}

function computeStreakWithGrace(logDates: Set<string>, endDate: Date, graceDays: number = 1): { streak: number; graceActive: boolean } {
  let streak = 0;
  let graceUsed = 0;
  let graceActive = false;
  const d = new Date(endDate);
  d.setHours(0, 0, 0, 0);
  while (d.getTime() >= new Date('2024-01-01').getTime()) {
    const ds = d.toISOString().split('T')[0];
    if (logDates.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (graceUsed < graceDays && streak > 0) {
      graceUsed++;
      graceActive = true;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return { streak, graceActive };
}

function datesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  const d = new Date(start);
  while (d <= end) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function computeCorrelationInsights(
  dailyLogs: DailyLog[],
  metrics: TrackedMetric[],
  journalEntries: JournalEntry[]
): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];
  const allDates = [...new Set(dailyLogs.map(l => l.date))].sort();
  if (allDates.length < 7) {
    insights.push({
      id: 'motivation-start',
      icon: '🧠',
      title: 'Self-monitoring changes behavior',
      body: 'Research shows that simply tracking a habit makes you 40% more likely to follow through. You\'re already ahead.',
      type: 'motivation',
      color: '#6366f1',
    });
    return insights;
  }

  const getMetricAvgOnDays = (metricId: string, dates: string[]) => {
    const logs = dailyLogs.filter(l => l.metricId === metricId && dates.includes(l.date) && l.value >= 0);
    if (logs.length === 0) return null;
    return logs.reduce((s, l) => s + l.value, 0) / logs.length;
  };

  const sleepMetric = metrics.find(m => m.id === '00000000-0000-4000-8000-000000000006' || m.name === 'Slept on time');
  const wakeMetric = metrics.find(m => m.id === '00000000-0000-4000-8000-000000000001' || m.name === 'Wake on time');
  const moodMetric = metrics.find(m => m.id === '00000000-0000-4000-8000-000000000010' || m.name === 'Mood');
  const productivityMetric = metrics.find(m => m.id === '00000000-0000-4000-8000-000000000011' || m.name === 'Productivity');
  const alcoholMetric = metrics.find(m => m.id === '00000000-0000-4000-8000-000000000008' || m.name === 'Alcohol');
  const cigaretteMetric = metrics.find(m => m.id === '00000000-0000-4000-8000-000000000007' || m.name === 'Cigarettes');

  if (sleepMetric && moodMetric) {
    const sleepLogs = dailyLogs.filter(l => l.metricId === sleepMetric.id && l.value >= 0);
    const goodSleepDates = sleepLogs.filter(l => l.value === 1).map(l => l.date);
    const badSleepDates = sleepLogs.filter(l => l.value === 0).map(l => l.date);
    const moodGood = getMetricAvgOnDays(moodMetric.id, goodSleepDates);
    const moodBad = getMetricAvgOnDays(moodMetric.id, badSleepDates);
    if (moodGood !== null && moodBad !== null && goodSleepDates.length >= 3 && badSleepDates.length >= 2) {
      const diff = Math.abs(moodGood - moodBad);
      if (diff >= 1) {
        insights.push({
          id: 'sleep-mood',
          icon: '😴',
          title: `Sleep → Mood: +${diff.toFixed(1)} pts`,
          body: `Your mood scores ${diff.toFixed(1)} points higher on days you sleep on time (${moodGood.toFixed(1)} vs ${moodBad.toFixed(1)} out of 10). Sleep is your biggest lever.`,
          type: 'correlation',
          color: '#6366f1',
        });
      }
    }
  }

  if (wakeMetric && productivityMetric) {
    const wakeLogs = dailyLogs.filter(l => l.metricId === wakeMetric.id && l.value >= 0);
    const onTimeDates = wakeLogs.filter(l => l.value === 1).map(l => l.date);
    const lateDates = wakeLogs.filter(l => l.value === 0).map(l => l.date);
    const prodOnTime = getMetricAvgOnDays(productivityMetric.id, onTimeDates);
    const prodLate = getMetricAvgOnDays(productivityMetric.id, lateDates);
    if (prodOnTime !== null && prodLate !== null && onTimeDates.length >= 3) {
      const diff = prodOnTime - prodLate;
      if (diff >= 0.8) {
        insights.push({
          id: 'wake-productivity',
          icon: '⚡',
          title: `Early wake → +${diff.toFixed(1)} productivity`,
          body: `You rate your productivity ${diff.toFixed(1)} points higher on days you wake on time. Your morning sets the tone for everything.`,
          type: 'correlation',
          color: '#f59e0b',
        });
      }
    }
  }

  if (alcoholMetric) {
    const alcoholLogs = dailyLogs.filter(l => l.metricId === alcoholMetric.id && l.value >= 0);
    const drinkDays = alcoholLogs.filter(l => l.value > 0).map(l => l.date);
    const soberDays = alcoholLogs.filter(l => l.value === 0).map(l => l.date);
    if (drinkDays.length >= 2 && soberDays.length >= 2) {
      const totalDays = drinkDays.length + soberDays.length;
      const soberPct = Math.round((soberDays.length / totalDays) * 100);
      if (soberPct >= 60) {
        insights.push({
          id: 'alcohol-trend',
          icon: '📈',
          title: `${soberPct}% alcohol-free days`,
          body: `You've been alcohol-free ${soberDays.length} out of ${totalDays} tracked days. That's real progress — keep the number climbing.`,
          type: 'trend',
          color: '#22c55e',
        });
      }
    }
  }

  if (cigaretteMetric) {
    const cigLogs = dailyLogs.filter(l => l.metricId === cigaretteMetric.id && l.value >= 0);
    if (cigLogs.length >= 7) {
      const firstWeekAvg = cigLogs.slice(0, 7).reduce((s, l) => s + l.value, 0) / 7;
      const lastWeekAvg = cigLogs.slice(-7).reduce((s, l) => s + l.value, 0) / 7;
      const reduction = firstWeekAvg - lastWeekAvg;
      if (reduction > 0) {
        insights.push({
          id: 'cigarette-trend',
          icon: '🚬',
          title: `Down ${reduction.toFixed(1)} cigarettes/day`,
          body: `You started at ~${firstWeekAvg.toFixed(1)}/day. Now you're at ~${lastWeekAvg.toFixed(1)}/day. Reduction, not perfection — you're doing it.`,
          type: 'trend',
          color: '#22c55e',
        });
      }
    }
  }

  const last7dates = allDates.slice(-7);
  const daysLoggedLast7 = last7dates.filter(d => dailyLogs.some(l => l.date === d)).length;
  if (daysLoggedLast7 === 7) {
    insights.push({
      id: 'perfect-week',
      icon: '🔥',
      title: '7 days straight — momentum is real',
      body: 'You\'ve logged every single day this week. Consistency at this level becomes identity. This is who you are now.',
      type: 'streak',
      color: '#f59e0b',
    });
  } else if (daysLoggedLast7 >= 5) {
    insights.push({
      id: 'strong-week',
      icon: '💪',
      title: `${daysLoggedLast7}/7 days this week`,
      body: 'Strong consistency. Two more days like this and you\'ll hit the perfect week — keep going.',
      type: 'streak',
      color: '#6366f1',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'motivation-default',
      icon: '🎯',
      title: 'Every day you track is data',
      body: 'Patterns emerge after 14 days. Correlations surface after 30. Keep logging — the insights are coming.',
      type: 'motivation',
      color: '#6366f1',
    });
  }

  return insights;
}

const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreak: 5,
  longBreak: 15,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [metrics, setMetrics] = useState<TrackedMetric[]>(DEFAULT_METRICS);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [relapseLogs, setRelapseLogs] = useState<RelapseLog[]>([]);
  const [weekTaskProgress, setWeekTaskProgress] = useState<WeekTaskProgress[]>([]);
  const [focusMinutesToday, setFocusMinutesToday] = useState<number>(0);
  const [userIdState, setUserIdState] = useState<string | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<Program[]>(AVAILABLE_PROGRAMS);
  const [pomodoroSettings, setPomodoroSettingsState] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);

  useEffect(() => { loadAll(); }, []);

  const [themeMode, setThemeModeState] = useState<'system' | 'light' | 'dark'>('system');

  const setThemeMode = useCallback(async (mode: 'system' | 'light' | 'dark') => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('themeMode', mode);
  }, []);

  const setPomodoroSettings = useCallback(async (updates: Partial<PomodoroSettings>) => {
    setPomodoroSettingsState(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem('pomodoroSettings', JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshPrograms = useCallback(async (userId: string) => {
    try {
      const progs = await customFetch<Program[]>(`/programs?authorId=${userId}`);
      if (progs && Array.isArray(progs)) {
        const parsedProgs = progs.map(p => {
          if (p.description && p.description.startsWith('{')) {
            try {
              const parsed = JSON.parse(p.description);
              if (parsed.customImageBase64) {
                p.imageUrl = parsed.customImageBase64;
              }
            } catch {}
          }
          return p;
        });
        const merged = [...parsedProgs];
        for (const sp of AVAILABLE_PROGRAMS) {
          if (!merged.some(p => p.id === sp.id)) {
            merged.unshift(sp);
          }
        }
        setAvailablePrograms(merged);
        await AsyncStorage.setItem('availablePrograms', JSON.stringify(merged));
      }
    } catch (err) {
      console.warn('Could not refresh programs list:', err);
    }
  }, []);

  // Helper to sync local data to the cloud in the background
  const syncWithCloud = useCallback(async (
    userId: string,
    currentProfile: UserProfile,
    currentMetrics: TrackedMetric[],
    currentLogs: DailyLog[],
    currentJournal: JournalEntry[],
    currentRelapse: RelapseLog[],
    currentTasks: WeekTaskProgress[],
    currentFocus: number
  ) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const progProgress = Object.keys(currentProfile.programProgress).map(programId => ({
        programId,
        currentWeek: currentProfile.programProgress[programId].currentWeek,
        weekStartDate: currentProfile.programProgress[programId].weekStartDate,
        completedWeeks: currentProfile.programProgress[programId].completedWeeks,
        resetCount: currentProfile.programProgress[programId].resetCount,
      }));

      await customFetch(`/users/${userId}/sync`, {
        method: 'POST',
        body: JSON.stringify({
          profile: {
            name: currentProfile.name,
            wakeTime: currentProfile.wakeTime,
            bedTime: currentProfile.bedTime,
            startDate: currentProfile.startDate,
            totalXP: currentProfile.totalXP,
            highestStreak: currentProfile.highestStreak,
            onboardingComplete: currentProfile.onboardingComplete || false,
            activeProgramIds: currentProfile.activeProgramIds,
            savedProgramIds: currentProfile.savedProgramIds || [...currentProfile.activeProgramIds],
          },
          metrics: currentMetrics.map(m => ({
            id: m.id,
            name: m.name,
            category: m.category,
            inputType: m.inputType,
            scoreWeight: m.scoreWeight,
            isCustom: m.isCustom || false,
            implementationIntention: m.implementationIntention || null,
          })),
          dailyLogs: currentLogs.map(l => ({
            id: l.id,
            metricId: l.metricId,
            date: l.date,
            value: l.value,
            note: l.note || null,
          })),
          journalEntries: currentJournal.map(j => ({
            id: j.id,
            date: j.date,
            prompt: j.prompt,
            response: j.response,
            freeResponse: j.freeResponse || null,
            isWeeklyReflection: j.isWeeklyReflection || false,
            programContext: j.programContext || null,
            tags: j.tags || [],
            wordCount: j.wordCount || 0,
          })),
          relapseLogs: currentRelapse.map(r => ({
            id: r.id,
            date: r.date,
            metricId: r.metricId,
            triggerCategory: r.triggerCategory,
            triggerReflection: r.triggerReflection,
            nextAction: r.nextAction,
            compassionStatement: r.compassionStatement || null,
          })),
          programProgress: progProgress,
          weekTaskProgress: currentTasks.map(t => ({
            programId: t.programId || 'dopamine-detox-protocol',
            weekNumber: t.weekNumber,
            taskId: t.taskId,
            completed: t.completed,
          })),
          focusLogs: [
            {
              id: '00000000-0000-4000-8000-000000000012',
              date: todayStr,
              minutes: currentFocus
            }
          ]
        })
      });
      console.log('Background cloud sync complete');
    } catch (err) {
      console.warn('Cloud sync offline or failed:', err);
    }
  }, []);

  const registerAndSync = useCallback(async (currentProfile: UserProfile) => {
    try {
      const result = await customFetch<{ userId: string }>('/users/register', {
        method: 'POST',
        body: JSON.stringify({
          name: currentProfile.name,
          startDate: currentProfile.startDate,
          wakeTime: currentProfile.wakeTime,
          bedTime: currentProfile.bedTime
        })
      });

      if (result.userId) {
        await AsyncStorage.setItem('userId', result.userId);
        setUserIdState(result.userId);
        console.log('Registered user device in cloud:', result.userId);
        
        // Initial sync of existing local data
        await syncWithCloud(
          result.userId,
          currentProfile,
          metrics,
          dailyLogs,
          journalEntries,
          relapseLogs,
          weekTaskProgress,
          focusMinutesToday
        );

        // Refresh programs list
        await refreshPrograms(result.userId).catch(console.warn);

        // Fetch and save push token
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await customFetch(`/users/${result.userId}/push-token`, {
            method: 'POST',
            body: JSON.stringify({ token })
          }).catch(console.warn);
        }
      }
    } catch (err) {
      console.warn('Could not register device in cloud:', err);
    }
  }, [metrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress, focusMinutesToday, syncWithCloud, refreshPrograms]);

  async function loadAll() {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeModeState(savedTheme as any);
      }

      const savedUserId = await AsyncStorage.getItem('userId');
      if (savedUserId) {
        setUserIdState(savedUserId);
        
        // Pull latest state from cloud on startup to synchronize changes
        try {
          const latest = await customFetch<any>(`/users/${savedUserId}/data`);
          if (latest) {
            const programProgressDict: Record<string, any> = {};
            if (latest.programProgress && Array.isArray(latest.programProgress)) {
              latest.programProgress.forEach((p: any) => {
                programProgressDict[p.programId] = {
                  currentWeek: p.currentWeek,
                  weekStartDate: p.weekStartDate,
                  completedWeeks: p.completedWeeks || [],
                  resetCount: p.resetCount || 0,
                };
              });
            }
            const finalProfile = {
              ...DEFAULT_PROFILE,
              ...latest.profile,
              badges: latest.profile.badges || [],
              programProgress: programProgressDict,
            };
            setProfile(finalProfile);
            setMetrics(latest.metrics);
            setDailyLogs(latest.dailyLogs);
            setJournalEntries(latest.journalEntries);
            setRelapseLogs(latest.relapseLogs);
            setWeekTaskProgress(latest.weekTaskProgress);

            const todayStr = new Date().toISOString().split('T')[0];
            const todayFocus = latest.focusLogs.find((fl: any) => fl.date === todayStr);
            if (todayFocus) {
              setFocusMinutesToday(todayFocus.minutes);
              await AsyncStorage.setItem(`focusMinutes_${todayStr}`, String(todayFocus.minutes));
            }

            await Promise.all([
              AsyncStorage.setItem('profile', JSON.stringify(finalProfile)),
              AsyncStorage.setItem('metrics', JSON.stringify(latest.metrics)),
              AsyncStorage.setItem('dailyLogs', JSON.stringify(latest.dailyLogs)),
              AsyncStorage.setItem('journalEntries', JSON.stringify(latest.journalEntries)),
              AsyncStorage.setItem('relapseLogs', JSON.stringify(latest.relapseLogs)),
              AsyncStorage.setItem('weekTaskProgress', JSON.stringify(latest.weekTaskProgress))
            ]);
            console.log('Synchronized client with database on load');

            // Refresh programs
            refreshPrograms(savedUserId).catch(console.warn);

            // Refresh push token and send to server
            registerForPushNotificationsAsync().then(token => {
              if (token) {
                customFetch(`/users/${savedUserId}/push-token`, {
                  method: 'POST',
                  body: JSON.stringify({ token })
                }).catch(console.warn);
              }
            });

            return;
          }
        } catch (err) {
          console.log('Could not fetch cloud data on startup, using local cache:', err);
        }
      }

      // Fallback: load strictly from local storage
      const [profileRaw, metricsRaw, logsRaw, journalRaw, relapseRaw, progressRaw, focusRaw, progsRaw, pomRaw] = await Promise.all([
        AsyncStorage.getItem('profile'),
        AsyncStorage.getItem('metrics'),
        AsyncStorage.getItem('dailyLogs'),
        AsyncStorage.getItem('journalEntries'),
        AsyncStorage.getItem('relapseLogs'),
        AsyncStorage.getItem('weekTaskProgress'),
        AsyncStorage.getItem(`focusMinutes_${new Date().toISOString().split('T')[0]}`),
        AsyncStorage.getItem('availablePrograms'),
        AsyncStorage.getItem('pomodoroSettings'),
      ]);
      if (pomRaw) { try { setPomodoroSettingsState({ ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(pomRaw) }); } catch {} }
      if (progsRaw) {
        try {
          setAvailablePrograms(JSON.parse(progsRaw));
        } catch {}
      }
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw);
        const merged = { ...DEFAULT_PROFILE, ...parsed };
        if (!merged.activeProgramIds) merged.activeProgramIds = ['dopamine-detox-protocol'];
        if (!merged.savedProgramIds) merged.savedProgramIds = [...merged.activeProgramIds];
        if (!merged.programProgress) {
          merged.programProgress = {
            'dopamine-detox-protocol': {
              currentWeek: merged.currentWeek ?? 1,
              weekStartDate: merged.startDate ?? new Date().toISOString().split('T')[0],
              completedWeeks: [],
              resetCount: 0,
            },
          };
        }
        setProfile(merged);
      }
      if (metricsRaw) {
        const saved: TrackedMetric[] = JSON.parse(metricsRaw);
        const defaults = DEFAULT_METRICS.filter(d => !saved.find(s => s.id === d.id));
        setMetrics([...saved, ...defaults]);
      }
      if (logsRaw) setDailyLogs(JSON.parse(logsRaw));
      if (journalRaw) setJournalEntries(JSON.parse(journalRaw));
      if (relapseRaw) setRelapseLogs(JSON.parse(relapseRaw));
      if (progressRaw) setWeekTaskProgress(JSON.parse(progressRaw));
      if (focusRaw) setFocusMinutesToday(parseInt(focusRaw, 10));
    } catch {}
  }

  // Auto-sync debounced state changes to cloud in the background
  useEffect(() => {
    if (!userIdState) return;

    const timer = setTimeout(() => {
      syncWithCloud(userIdState, profile, metrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress, focusMinutesToday);
    }, 1500);

    return () => clearTimeout(timer);
  }, [userIdState, profile, metrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress, focusMinutesToday, syncWithCloud]);

  const filteredMetrics = useMemo(() => {
    if (!profile.activeProgramIds || profile.activeProgramIds.length === 0) {
      return metrics;
    }

    const activeTaskIds = new Set<string>();
    for (const programId of profile.activeProgramIds) {
      const prog = availablePrograms.find(p => p.id === programId);
      const progress = profile.programProgress[programId];
      if (!prog || !progress) continue;

      const weekData = prog.weeks[progress.currentWeek - 1];
      if (!weekData) continue;

      for (const task of weekData.tasks) {
        const isHabitTask = (task as any).isHabit || (task as any).metricCategory;
        if (isHabitTask) {
          activeTaskIds.add(generateDeterministicId(userIdState || 'default', task.id));
        }
      }
    }

    return metrics.filter(m => activeTaskIds.has(m.id));
  }, [metrics, profile.activeProgramIds, profile.programProgress, availablePrograms, userIdState]);

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = dailyLogs.filter(l => l.date === today);
  const disciplineScore = calculateDisciplineScore(todayLogs, filteredMetrics, focusMinutesToday);
  const dayScore = computeDayScore(filteredMetrics, todayLogs);
  const completedFilteredCount = todayLogs.filter(l => {
    const m = filteredMetrics.find(fm => fm.id === l.metricId);
    if (!m) return false;
    if (m.category === 'build') return l.value > 0;
    if (m.category === 'reduce') return l.value === 0;
    return true;
  }).length;
  const completionPct = filteredMetrics.length > 0 ? Math.round((completedFilteredCount / filteredMetrics.length) * 100) : 0;

  const logDates = useMemo(() => new Set(dailyLogs.map(l => l.date)), [dailyLogs]);

  const streakResult = useMemo(() => computeStreakWithGrace(logDates, new Date()), [logDates]);
  const currentStreak = streakResult.streak;
  const graceStreakActive = streakResult.graceActive;
  const highestStreak = useMemo(() => Math.max(profile.highestStreak, currentStreak), [profile.highestStreak, currentStreak]);
  const levelInfo = useMemo(() => levelFromXP(profile.totalXP), [profile.totalXP]);

  const correlationInsights = useMemo(
    () => computeCorrelationInsights(dailyLogs, filteredMetrics, journalEntries),
    [dailyLogs, filteredMetrics, journalEntries]
  );

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      
      if (next.onboardingComplete && !userIdState) {
        registerAndSync(next);
      }
      return next;
    });
  }, [userIdState, registerAndSync]);

  const addXP = useCallback((amount: number) => {
    setProfile(prev => {
      const next = { ...prev, totalXP: prev.totalXP + amount };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, []);

  const logMetric = useCallback(async (metricId: string, date: string, value: number, note?: string, context?: HabitContext) => {
    setDailyLogs(prev => {
      const existing = prev.findIndex(l => l.metricId === metricId && l.date === date);
      let next: DailyLog[];
      const updates: Partial<DailyLog> = { value };
      if (note !== undefined) updates.note = note;
      if (context !== undefined) updates.context = context;
      if (existing >= 0) {
        next = prev.map((l, i) => i === existing ? { ...l, ...updates } : l);
      } else {
        next = [...prev, { id: generateId(), metricId, date, value, note, context }];
      }
      AsyncStorage.setItem('dailyLogs', JSON.stringify(next));
      return next;
    });
    
    const currentStreakVal = currentStreak;
    if (currentStreakVal > 0) {
      updateStreakRiskFromLog(currentStreakVal);
    }

    // Two-Way Sync: if this logged metric is a program habit, update task completion
    if (userIdState) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (date === todayStr) {
        const isCompleted = value > 0;
        for (const programId of profile.activeProgramIds) {
          const prog = availablePrograms.find(p => p.id === programId);
          const progress = profile.programProgress[programId];
          if (!prog || !progress) continue;
          
          const weekData = prog.weeks[progress.currentWeek - 1];
          if (!weekData) continue;
          
          for (const task of weekData.tasks) {
            const isHabitTask = (task as any).isHabit || (task as any).metricCategory;
            if (isHabitTask) {
              const taskMetricId = generateDeterministicId(userIdState, task.id);
              if (taskMetricId === metricId) {
                setWeekTaskProgress(prev => {
                  const existing = prev.findIndex(p =>
                    p.weekNumber === progress.currentWeek && p.taskId === task.id &&
                    (p.programId ?? 'dopamine-detox-protocol') === programId
                  );
                  let next: WeekTaskProgress[];
                  if (existing >= 0) {
                    next = prev.map((p, i) => i === existing ? { ...p, completed: isCompleted } : p);
                  } else {
                    next = [...prev, { weekNumber: progress.currentWeek, taskId: task.id, completed: isCompleted, programId }];
                  }
                  AsyncStorage.setItem('weekTaskProgress', JSON.stringify(next));
                  return next;
                });
              }
            }
          }
        }
      }
    }
  }, [currentStreak, userIdState, profile.activeProgramIds, profile.programProgress, availablePrograms]);

  const getLogForDate = useCallback((metricId: string, date: string) => {
    return dailyLogs.find(l => l.metricId === metricId && l.date === date);
  }, [dailyLogs]);

  const getLogsForDate = useCallback((date: string) => {
    return dailyLogs.filter(l => l.date === date);
  }, [dailyLogs]);

  const getLogsForMetric = useCallback((metricId: string, days: number) => {
    const result: DailyLog[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = dailyLogs.find(l => l.metricId === metricId && l.date === dateStr);
      result.unshift(log ?? { id: '', metricId, date: dateStr, value: -1 });
    }
    return result;
  }, [dailyLogs]);

  const getMetricStreak = useCallback((metricId: string): number => {
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return 0;
    let streak = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    while (d.getTime() >= new Date('2024-01-01').getTime()) {
      const ds = d.toISOString().split('T')[0];
      const log = dailyLogs.find(l => l.metricId === metricId && l.date === ds);
      if (!log) break;
      const good = metric.category === 'build'
        ? log.value > 0
        : metric.category === 'reduce'
          ? log.value === 0
          : true;
      if (good) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }, [dailyLogs, metrics]);

  const getMetricConsistency = useCallback((metricId: string, days: number): number => {
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return 0;
    let successes = 0, total = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const log = dailyLogs.find(l => l.metricId === metricId && l.date === ds);
      if (log) {
        total++;
        const good = metric.category === 'build' ? log.value > 0 : metric.category === 'reduce' ? log.value === 0 : true;
        if (good) successes++;
      }
    }
    return total > 0 ? Math.round((successes / total) * 100) : 0;
  }, [dailyLogs, metrics]);

  const addJournalEntry = useCallback(async (entry: Omit<JournalEntry, 'id' | 'wordCount' | 'tags'>, freeResponse?: string, manualTags?: string[]) => {
    const allText = ((entry.response || '') + ' ' + (freeResponse || '')).trim();
    const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length;
    const detectedTags: string[] = [];
    const text = allText.toLowerCase();
    if (text.includes('stressed') || text.includes('anxious')) detectedTags.push('stress');
    if (text.includes('tired') || text.includes('sleep')) detectedTags.push('sleep');
    if (text.includes('craving') || text.includes('urge')) detectedTags.push('craving');
    if (text.includes('proud') || text.includes('accomplish') || text.includes('win')) detectedTags.push('win');
    if (text.includes('social') || text.includes('friend') || text.includes('family')) detectedTags.push('social');
    if (text.includes('work') || text.includes('job') || text.includes('productive')) detectedTags.push('work');
    if (text.includes('exercise') || text.includes('workout') || text.includes('gym') || text.includes('train')) detectedTags.push('fitness');
    if (text.includes('meditat') || text.includes('mindful') || text.includes('breath')) detectedTags.push('mindfulness');
    if (text.includes('relapse') || text.includes('slipped') || text.includes('failed')) detectedTags.push('relapse');
    const mergedTags = Array.from(new Set([...detectedTags, ...(manualTags || [])]));
    const enriched: Omit<JournalEntry, 'id'> = {
      ...entry,
      freeResponse: freeResponse?.trim() || undefined,
      wordCount,
      tags: mergedTags,
    };
    setJournalEntries(prev => {
      const existing = prev.findIndex(e => e.date === entry.date);
      let next: JournalEntry[];
      if (existing >= 0) {
        next = prev.map((e, i) => i === existing ? { ...e, ...enriched } : e);
      } else {
        next = [...prev, { id: generateId(), ...enriched }];
      }
      AsyncStorage.setItem('journalEntries', JSON.stringify(next));
      return next;
    });
  }, []);

  const getJournalEntryForDate = useCallback((date: string) => {
    return journalEntries.find(e => e.date === date);
  }, [journalEntries]);

  const addRelapseLog = useCallback(async (log: Omit<RelapseLog, 'id'>) => {
    setRelapseLogs(prev => {
      const next = [...prev, { id: generateId(), ...log }];
      AsyncStorage.setItem('relapseLogs', JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleWeekTask = useCallback(async (weekNumber: number, taskId: string, programId?: string) => {
    const pid = programId ?? 'dopamine-detox-protocol';
    let wasComplete = false;
    setWeekTaskProgress(prev => {
      const existing = prev.findIndex(p =>
        p.weekNumber === weekNumber && p.taskId === taskId &&
        (p.programId ?? 'dopamine-detox-protocol') === pid
      );
      let next: WeekTaskProgress[];
      if (existing >= 0) {
        wasComplete = prev[existing].completed;
        next = prev.map((p, i) => i === existing ? { ...p, completed: !p.completed } : p);
      } else {
        wasComplete = false;
        next = [...prev, { weekNumber, taskId, completed: true, programId: pid }];
      }
      AsyncStorage.setItem('weekTaskProgress', JSON.stringify(next));
      return next;
    });

    // Two-Way Sync: if this is a program habit, log it in dailyLogs!
    const prog = availablePrograms.find(p => p.id === pid);
    if (prog && userIdState) {
      const weekData = prog.weeks[weekNumber - 1];
      const task = weekData?.tasks.find(t => t.id === taskId);
      const isHabitTask = task && ((task as any).isHabit || (task as any).metricCategory);
      if (task && isHabitTask) {
        const metricId = generateDeterministicId(userIdState, task.id);
        const value = !wasComplete ? 1 : 0;
        setDailyLogs(prev => {
          const date = new Date().toISOString().split('T')[0];
          const existing = prev.findIndex(l => l.metricId === metricId && l.date === date);
          let next: DailyLog[];
          if (existing >= 0) {
            next = prev.map((l, i) => i === existing ? { ...l, value } : l);
          } else {
            next = [...prev, { id: generateId(), metricId, date, value }];
          }
          AsyncStorage.setItem('dailyLogs', JSON.stringify(next));
          return next;
        });
      }
    }
  }, [availablePrograms, userIdState]);

  const isWeekTaskComplete = useCallback((weekNumber: number, taskId: string, programId?: string) => {
    const pid = programId ?? 'dopamine-detox-protocol';
    return weekTaskProgress.some(p =>
      p.weekNumber === weekNumber && p.taskId === taskId && p.completed &&
      (p.programId === pid || (!p.programId && pid === 'dopamine-detox-protocol'))
    );
  }, [weekTaskProgress]);

  // Dynamic Habit Injection Effect
  useEffect(() => {
    if (!userIdState || !profile.activeProgramIds) return;

    let metricsUpdated = false;
    const currentMetrics = [...metrics];

    for (const programId of profile.activeProgramIds) {
      const prog = availablePrograms.find(p => p.id === programId);
      const progress = profile.programProgress[programId];
      if (!prog || !progress) continue;

      const weekData = prog.weeks[progress.currentWeek - 1];
      if (!weekData) continue;

      for (const task of weekData.tasks) {
        const isHabitTask = (task as any).isHabit || (task as any).metricCategory;
        if (isHabitTask) {
          const deterministicId = generateDeterministicId(userIdState, task.id);
          const alreadyExists = currentMetrics.some(m => m.id === deterministicId);
          if (!alreadyExists) {
            currentMetrics.push({
              id: deterministicId,
              name: task.title,
              category: (task as any).metricCategory ?? 'build',
              inputType: (task as any).metricInputType ?? 'boolean',
              unitLabel: (task as any).metricUnitLabel ?? '',
              isSensitive: false,
              scoreWeight: (task as any).metricScoreWeight ?? 5,
              emoji: prog.emoji ?? '📋',
              isCustom: true,
              isDefault: false,
              implementationIntention: task.description,
              programId: prog.id,
            } as any);
            metricsUpdated = true;
          }
        }
      }
    }

    if (metricsUpdated) {
      setMetrics(currentMetrics);
      AsyncStorage.setItem('metrics', JSON.stringify(currentMetrics));
      console.log('Injected active program habits into user metrics');
    }
  }, [userIdState, profile.activeProgramIds, profile.programProgress, availablePrograms, metrics]);

  const enrollProgram = useCallback(async (programId: string) => {
    if (profile.activeProgramIds.includes(programId)) return;
    
    const nextProfile = {
      ...profile,
      activeProgramIds: [...profile.activeProgramIds, programId],
      programProgress: {
        ...profile.programProgress,
        [programId]: { currentWeek: 1, weekStartDate: new Date().toISOString().split('T')[0], completedWeeks: [], resetCount: 0 },
      },
    };
    
    setProfile(nextProfile);
    await AsyncStorage.setItem('profile', JSON.stringify(nextProfile));
    
    if (userIdState) {
      await syncWithCloud(userIdState, nextProfile, metrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress, focusMinutesToday);
    }
  }, [profile, userIdState, metrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress, focusMinutesToday, syncWithCloud]);

  const unenrollProgram = useCallback(async (programId: string) => {
    const nextMetrics = metrics.filter(m => (m as any).programId !== programId);
    setMetrics(nextMetrics);
    await AsyncStorage.setItem('metrics', JSON.stringify(nextMetrics));

    const nextProfile = {
      ...profile,
      activeProgramIds: profile.activeProgramIds.filter(id => id !== programId)
    };
    setProfile(nextProfile);
    await AsyncStorage.setItem('profile', JSON.stringify(nextProfile));
    
    if (userIdState) {
      await syncWithCloud(userIdState, nextProfile, nextMetrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress, focusMinutesToday);
    }
  }, [profile, userIdState, metrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress, focusMinutesToday, syncWithCloud]);

  const toggleSavedProgram = useCallback(async (programId: string) => {
    const isSaved = profile.savedProgramIds?.includes(programId);
    const nextSaved = isSaved
      ? profile.savedProgramIds.filter(id => id !== programId)
      : [...(profile.savedProgramIds || []), programId];
    
    const nextProfile = { ...profile, savedProgramIds: nextSaved };
    setProfile(nextProfile);
    await AsyncStorage.setItem('profile', JSON.stringify(nextProfile));
    
    if (userIdState) {
      await syncWithCloud(userIdState, nextProfile, metrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress, focusMinutesToday);
    }
  }, [profile, userIdState, metrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress, focusMinutesToday, syncWithCloud]);

  const createCustomProgram = useCallback(async (programData: Omit<Program, 'id' | 'isSystem'>) => {
    if (!userIdState) return;
    try {
      const newProg = await customFetch<Program>('/programs', {
        method: 'POST',
        body: JSON.stringify({
          ...programData,
          authorId: userIdState,
        }),
      });
      if (newProg) {
        if (newProg.description && newProg.description.startsWith('{')) {
          try {
            const parsed = JSON.parse(newProg.description);
            if (parsed.customImageBase64) newProg.imageUrl = parsed.customImageBase64;
          } catch {}
        }
        setAvailablePrograms(prev => {
          const next = [...prev, newProg];
          AsyncStorage.setItem('availablePrograms', JSON.stringify(next));
          return next;
        });
        return newProg;
      }
    } catch (err) {
      console.error('Failed to create custom program:', err);
      throw err;
    }
  }, [userIdState]);

  const updateCustomProgram = useCallback(async (programId: string, updates: Partial<Program>) => {
    try {
      const updated = await customFetch<Program>(`/programs/${programId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (updated) {
        if (updated.description && updated.description.startsWith('{')) {
          try {
            const parsed = JSON.parse(updated.description);
            if (parsed.customImageBase64) updated.imageUrl = parsed.customImageBase64;
          } catch {}
        }
        setAvailablePrograms(prev => {
          const next = prev.map(p => p.id === programId ? { ...p, ...updated } : p);
          AsyncStorage.setItem('availablePrograms', JSON.stringify(next));
          return next;
        });
        return updated;
      }
    } catch (err) {
      console.error('Failed to update custom program:', err);
      throw err;
    }
  }, []);

  const deleteCustomProgram = useCallback(async (programId: string) => {
    try {
      await customFetch(`/programs/${programId}`, {
        method: 'DELETE',
      });
      setAvailablePrograms(prev => {
        const next = prev.filter(p => p.id !== programId);
        AsyncStorage.setItem('availablePrograms', JSON.stringify(next));
        return next;
      });
      if (profile.activeProgramIds.includes(programId)) {
        await unenrollProgram(programId);
      }
      if (profile.savedProgramIds?.includes(programId)) {
        await toggleSavedProgram(programId);
      }
    } catch (err) {
      console.error('Failed to delete custom program:', err);
      throw err;
    }
  }, [profile.activeProgramIds, unenrollProgram]);

  const publishProgram = useCallback(async (programId: string, isPublished: boolean) => {
    try {
      const updated = await customFetch<Program>(`/programs/${programId}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished }),
      });
      if (updated) {
        setAvailablePrograms(prev => {
          const next = prev.map(p => p.id === programId ? { ...p, isPublished } : p);
          AsyncStorage.setItem('availablePrograms', JSON.stringify(next));
          return next;
        });
        return updated;
      }
    } catch (err) {
      console.error('Failed to publish program:', err);
      throw err;
    }
  }, []);

  const addCustomMetric = useCallback(async (metric: Omit<TrackedMetric, 'id' | 'isDefault' | 'isCustom'>) => {
    const newMetric: TrackedMetric = { ...metric, id: generateId(), isDefault: false, isCustom: true };
    setMetrics(prev => {
      const next = [...prev, newMetric];
      AsyncStorage.setItem('metrics', JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteMetric = useCallback(async (metricId: string) => {
    setMetrics(prev => {
      const next = prev.filter(m => m.id !== metricId);
      AsyncStorage.setItem('metrics', JSON.stringify(next));
      return next;
    });
    setDailyLogs(prev => {
      const next = prev.filter(l => l.metricId !== metricId);
      AsyncStorage.setItem('dailyLogs', JSON.stringify(next));
      return next;
    });
  }, []);

  const addFocusMinutes = useCallback(async (minutes: number) => {
    setFocusMinutesToday(prev => {
      const next = prev + minutes;
      AsyncStorage.setItem(`focusMinutes_${today}`, String(next));
      return next;
    });
  }, [today]);



  const getWeekGatingStatus = useCallback((programId: string): WeekGatingStatus => {
    const prog = AVAILABLE_PROGRAMS.find(p => p.id === programId);
    const progress = profile.programProgress[programId];
    if (!prog || !progress) {
      return { daysTracked: 0, daysJournaled: 0, tasksCompleted: 0, totalTasks: 0, canAdvance: false, shouldRestart: false, daysSinceWeekStart: 0, weekPassThreshold: 5 };
    }
    const weekData = prog.weeks[progress.currentWeek - 1];
    if (!weekData) {
      return { daysTracked: 0, daysJournaled: 0, tasksCompleted: 0, totalTasks: 0, canAdvance: false, shouldRestart: false, daysSinceWeekStart: 0, weekPassThreshold: 5 };
    }
    const weekStart = progress.weekStartDate;
    const todayStr = new Date().toISOString().split('T')[0];
    const weekDays = datesBetween(weekStart, todayStr);
    const daysSinceWeekStart = weekDays.length - 1;
    const PASS_THRESHOLD = 5;
    const daysTracked = weekDays.filter(d => dailyLogs.filter(l => l.date === d).length > 0).length;
    const daysJournaled = weekDays.filter(d => journalEntries.some(e => e.date === d)).length;
    const tasksCompleted = weekData.tasks.filter(t => isWeekTaskComplete(progress.currentWeek, t.id, programId)).length;
    const totalTasks = weekData.tasks.length;
    const canAdvance = daysTracked >= PASS_THRESHOLD && daysJournaled >= 1 && tasksCompleted >= Math.ceil(totalTasks * 0.5);
    const shouldRestart = daysSinceWeekStart >= 14 && !canAdvance;
    return { daysTracked, daysJournaled, tasksCompleted, totalTasks, canAdvance, shouldRestart, daysSinceWeekStart, weekPassThreshold: PASS_THRESHOLD };
  }, [profile.programProgress, dailyLogs, journalEntries, isWeekTaskComplete]);

  const advanceProgramWeek = useCallback(async (programId: string) => {
    const prog = AVAILABLE_PROGRAMS.find(p => p.id === programId);
    const progress = profile.programProgress[programId];
    if (!prog || !progress) return;
    const newWeek = Math.min(progress.currentWeek + 1, prog.totalWeeks);
    const newCompletedWeeks = progress.completedWeeks.includes(progress.currentWeek)
      ? progress.completedWeeks : [...progress.completedWeeks, progress.currentWeek];
    setProfile(prev => {
      const next = {
        ...prev,
        currentWeek: programId === 'dopamine-detox-protocol' ? newWeek : prev.currentWeek,
        programProgress: {
          ...prev.programProgress,
          [programId]: { ...progress, currentWeek: newWeek, weekStartDate: new Date().toISOString().split('T')[0], completedWeeks: newCompletedWeeks },
        },
      };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, [profile.programProgress]);

  const restartProgramWeek = useCallback(async (programId: string) => {
    const progress = profile.programProgress[programId];
    if (!progress) return;
    setWeekTaskProgress(prev => {
      const next = prev.filter(p => !(
        (p.programId === programId || (!p.programId && programId === 'dopamine-detox-protocol'))
        && p.weekNumber === progress.currentWeek
      ));
      AsyncStorage.setItem('weekTaskProgress', JSON.stringify(next));
      return next;
    });
    setProfile(prev => {
      const next = {
        ...prev,
        programProgress: {
          ...prev.programProgress,
          [programId]: { ...progress, weekStartDate: new Date().toISOString().split('T')[0], resetCount: (progress.resetCount ?? 0) + 1 },
        },
      };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, [profile.programProgress]);

  const getProgramProgress = useCallback((programId: string) => {
    return profile.programProgress[programId];
  }, [profile.programProgress]);

  const getStreak = useCallback(() => currentStreak, [currentStreak]);

  const getStreakRisk = useCallback(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    return !logDates.has(yesterdayStr) && !logDates.has(today);
  }, [logDates, today]);

  const getMissedDays = useCallback((days: number) => {
    const missed: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (!logDates.has(ds)) missed.push(ds);
    }
    return missed;
  }, [logDates]);

  const getRecentActivity = useCallback((count: number): ActivityItem[] => {
    const items: ActivityItem[] = [];
    const todayLogsArr = dailyLogs.filter(l => l.date === today);
    for (const log of todayLogsArr) {
      const metric = metrics.find(m => m.id === log.metricId);
      if (!metric) continue;
      const isGood = metric.category === 'build' ? log.value > 0 : (metric.category === 'reduce' ? log.value === 0 : true);
      items.push({
        id: log.id, type: 'habit', date: log.date,
        emoji: isGood ? '✔' : '✗',
        text: `${metric.name} ${metric.inputType === 'boolean' ? (isGood ? 'done' : 'skipped') : `set to ${log.value}`}`,
        time: 'Today', xp: isGood ? 10 : 0,
      });
    }
    const journalToday = journalEntries.find(e => e.date === today);
    if (journalToday) items.push({ id: journalToday.id, type: 'journal', date: today, emoji: '📝', text: 'Journal entry saved', time: 'Today', xp: 25 });
    if (focusMinutesToday > 0) items.push({ id: generateId(), type: 'focus', date: today, emoji: '🎯', text: `${focusMinutesToday} min deep work`, time: 'Today', xp: Math.min(focusMinutesToday, 10) });
    return items.slice(0, count);
  }, [dailyLogs, metrics, journalEntries, focusMinutesToday, today]);

  const exportData = useCallback(() => {
    const rows = ['Date,Metric,Category,Value,Note'];
    for (const log of dailyLogs) {
      const metric = metrics.find(m => m.id === log.metricId);
      if (!metric) continue;
      rows.push(`${log.date},"${metric.name}",${metric.category},${log.value},"${log.note ?? ''}"`);
    }
    for (const entry of journalEntries) {
      rows.push(`${entry.date},Journal,reflection,${(entry.wordCount ?? 0)},"${entry.response.replace(/"/g, "'").substring(0, 100)}"`);
    }
    return rows.join('\n');
  }, [dailyLogs, metrics, journalEntries]);

  const deleteAllData = useCallback(async () => {
    await AsyncStorage.multiRemove(['profile', 'metrics', 'dailyLogs', 'journalEntries', 'relapseLogs', 'weekTaskProgress', 'themeMode']);
    setProfile(DEFAULT_PROFILE);
    setMetrics(DEFAULT_METRICS);
    setDailyLogs([]);
    setJournalEntries([]);
    setRelapseLogs([]);
    setWeekTaskProgress([]);
    setFocusMinutesToday(0);
    setThemeModeState('system');
  }, []);

  const logout = useCallback(async () => {
    // Clear all session and user data from device storage
    await AsyncStorage.multiRemove([
      'userId',
      'lastSessionName',
      'lastSessionEmail',
      'profile',
      'metrics',
      'dailyLogs',
      'journalEntries',
      'relapseLogs',
      'weekTaskProgress',
      'themeMode',
    ]);
    // Reset context state
    setUserIdState(null);
    setProfile(DEFAULT_PROFILE);
    setMetrics(DEFAULT_METRICS);
    setDailyLogs([]);
    setJournalEntries([]);
    setRelapseLogs([]);
    setWeekTaskProgress([]);
    setFocusMinutesToday(0);
    setThemeModeState('system');
  }, []);

  const login = useCallback(async (userId: string) => {
    await AsyncStorage.setItem('userId', userId);
    setUserIdState(userId);
    
    try {
      const latest = await customFetch<any>(`/users/${userId}/data`);
      if (latest) {
        const programProgressDict: Record<string, any> = {};
        if (latest.programProgress && Array.isArray(latest.programProgress)) {
          latest.programProgress.forEach((p: any) => {
            programProgressDict[p.programId] = {
              currentWeek: p.currentWeek,
              weekStartDate: p.weekStartDate,
              completedWeeks: p.completedWeeks || [],
              resetCount: p.resetCount || 0,
            };
          });
        }
        const finalProfile = {
          ...DEFAULT_PROFILE,
          ...latest.profile,
          badges: latest.profile.badges || [],
          programProgress: programProgressDict,
        };
        setProfile(finalProfile);
        setMetrics(latest.metrics);
        setDailyLogs(latest.dailyLogs);
        setJournalEntries(latest.journalEntries);
        setRelapseLogs(latest.relapseLogs);
        setWeekTaskProgress(latest.weekTaskProgress);

        const todayStr = new Date().toISOString().split('T')[0];
        const todayFocus = latest.focusLogs.find((fl: any) => fl.date === todayStr);
        if (todayFocus) {
          setFocusMinutesToday(todayFocus.minutes);
          await AsyncStorage.setItem(`focusMinutes_${todayStr}`, String(todayFocus.minutes));
        }

        await Promise.all([
          AsyncStorage.setItem('profile', JSON.stringify(finalProfile)),
          AsyncStorage.setItem('metrics', JSON.stringify(latest.metrics)),
          AsyncStorage.setItem('dailyLogs', JSON.stringify(latest.dailyLogs)),
          AsyncStorage.setItem('journalEntries', JSON.stringify(latest.journalEntries)),
          AsyncStorage.setItem('relapseLogs', JSON.stringify(latest.relapseLogs)),
          AsyncStorage.setItem('weekTaskProgress', JSON.stringify(latest.weekTaskProgress))
        ]);
        
        console.log('Login synchronization complete');
        
        refreshPrograms(userId).catch(console.warn);

        registerForPushNotificationsAsync().then(token => {
          if (token) {
            customFetch(`/users/${userId}/push-token`, {
              method: 'POST',
              body: JSON.stringify({ token })
            }).catch(console.warn);
          }
        });
      }
    } catch (err) {
      console.warn('Could not fetch cloud data on login:', err);
    }
  }, [refreshPrograms]);

  return (
    <AppContext.Provider value={{
      profile, metrics: filteredMetrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress,
      disciplineScore, totalXP: profile.totalXP, currentStreak, graceStreakActive,
      highestStreak, currentLevel: levelInfo.level, levelProgress: levelInfo.progress,
      levelMax: levelInfo.max, badges: profile.badges, dayScore, completionPct,
      availablePrograms, createCustomProgram, updateCustomProgram, deleteCustomProgram, publishProgram, correlationInsights,
      updateProfile, logMetric, getLogForDate, getLogsForDate, getLogsForMetric,
      addJournalEntry, getJournalEntryForDate, addRelapseLog,
      toggleWeekTask, isWeekTaskComplete, addCustomMetric, deleteMetric,
      focusMinutesToday, addFocusMinutes, addXP, getStreak, getStreakRisk,
      getMissedDays, getRecentActivity, getMetricStreak, getMetricConsistency,
      enrollProgram, unenrollProgram, toggleSavedProgram, advanceProgramWeek, restartProgramWeek,
      getWeekGatingStatus, getProgramProgress, exportData, deleteAllData, logout, login,
      pomodoroSettings, setPomodoroSettings,
      themeMode, setThemeMode,
      userId: userIdState,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
