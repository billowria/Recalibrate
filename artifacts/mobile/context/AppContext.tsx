import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AVAILABLE_PROGRAMS, DEFAULT_METRICS, DefaultMetric, Program, PROGRAM_WEEKS } from '@/constants/program';

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
  programProgress: Record<string, ProgramProgress>;
  onboardingComplete?: boolean;
  selectedBuildMetricIds?: string[];
  selectedReduceMetricIds?: string[];
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
}

export interface DailyLog {
  id: string;
  metricId: string;
  date: string;
  value: number;
  note?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  prompt: string;
  response: string;
  mood: number;
  energy: number;
  tags?: string[];
  wordCount?: number;
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
  correlationInsights: CorrelationInsight[];
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logMetric: (metricId: string, date: string, value: number, note?: string) => Promise<void>;
  getLogForDate: (metricId: string, date: string) => DailyLog | undefined;
  getLogsForDate: (date: string) => DailyLog[];
  getLogsForMetric: (metricId: string, days: number) => DailyLog[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'wordCount' | 'tags'>) => Promise<void>;
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
  advanceProgramWeek: (programId: string) => Promise<void>;
  restartProgramWeek: (programId: string) => Promise<void>;
  getWeekGatingStatus: (programId: string) => WeekGatingStatus;
  getProgramProgress: (programId: string) => ProgramProgress | undefined;
  exportData: () => string;
  deleteAllData: () => Promise<void>;
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
  activeProgramIds: ['eight-week-recovery'],
  programProgress: {
    'eight-week-recovery': {
      currentWeek: 1,
      weekStartDate: new Date().toISOString().split('T')[0],
      completedWeeks: [],
      resetCount: 0,
    },
  },
  onboardingComplete: false,
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
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

  const sleepMetric = metrics.find(m => m.id === 'sleep-time');
  const wakeMetric = metrics.find(m => m.id === 'wake-time');
  const moodMetric = metrics.find(m => m.id === 'mood');
  const productivityMetric = metrics.find(m => m.id === 'productivity');
  const alcoholMetric = metrics.find(m => m.id === 'alcohol');
  const cigaretteMetric = metrics.find(m => m.id === 'cigarettes');

  if (sleepMetric && moodMetric) {
    const sleepLogs = dailyLogs.filter(l => l.metricId === 'sleep-time' && l.value >= 0);
    const goodSleepDates = sleepLogs.filter(l => l.value === 1).map(l => l.date);
    const badSleepDates = sleepLogs.filter(l => l.value === 0).map(l => l.date);
    const moodGood = getMetricAvgOnDays('mood', goodSleepDates);
    const moodBad = getMetricAvgOnDays('mood', badSleepDates);
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
    const wakeLogs = dailyLogs.filter(l => l.metricId === 'wake-time' && l.value >= 0);
    const onTimeDates = wakeLogs.filter(l => l.value === 1).map(l => l.date);
    const lateDates = wakeLogs.filter(l => l.value === 0).map(l => l.date);
    const prodOnTime = getMetricAvgOnDays('productivity', onTimeDates);
    const prodLate = getMetricAvgOnDays('productivity', lateDates);
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
    const alcoholLogs = dailyLogs.filter(l => l.metricId === 'alcohol' && l.value >= 0);
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
    const cigLogs = dailyLogs.filter(l => l.metricId === 'cigarettes' && l.value >= 0);
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [metrics, setMetrics] = useState<TrackedMetric[]>(DEFAULT_METRICS);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [relapseLogs, setRelapseLogs] = useState<RelapseLog[]>([]);
  const [weekTaskProgress, setWeekTaskProgress] = useState<WeekTaskProgress[]>([]);
  const [focusMinutesToday, setFocusMinutesToday] = useState<number>(0);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [profileRaw, metricsRaw, logsRaw, journalRaw, relapseRaw, progressRaw, focusRaw] = await Promise.all([
        AsyncStorage.getItem('profile'),
        AsyncStorage.getItem('metrics'),
        AsyncStorage.getItem('dailyLogs'),
        AsyncStorage.getItem('journalEntries'),
        AsyncStorage.getItem('relapseLogs'),
        AsyncStorage.getItem('weekTaskProgress'),
        AsyncStorage.getItem(`focusMinutes_${new Date().toISOString().split('T')[0]}`),
      ]);
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw);
        const merged = { ...DEFAULT_PROFILE, ...parsed };
        if (!merged.activeProgramIds) merged.activeProgramIds = ['eight-week-recovery'];
        if (!merged.programProgress) {
          merged.programProgress = {
            'eight-week-recovery': {
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

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = dailyLogs.filter(l => l.date === today);
  const disciplineScore = calculateDisciplineScore(todayLogs, metrics, focusMinutesToday);
  const dayScore = computeDayScore(metrics, todayLogs);
  const completionPct = metrics.length > 0 ? Math.round((todayLogs.length / metrics.length) * 100) : 0;

  const logDates = useMemo(() => new Set(dailyLogs.map(l => l.date)), [dailyLogs]);

  const streakResult = useMemo(() => computeStreakWithGrace(logDates, new Date()), [logDates]);
  const currentStreak = streakResult.streak;
  const graceStreakActive = streakResult.graceActive;
  const highestStreak = useMemo(() => Math.max(profile.highestStreak, currentStreak), [profile.highestStreak, currentStreak]);
  const levelInfo = useMemo(() => levelFromXP(profile.totalXP), [profile.totalXP]);

  const correlationInsights = useMemo(
    () => computeCorrelationInsights(dailyLogs, metrics, journalEntries),
    [dailyLogs, metrics, journalEntries]
  );

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, []);

  const addXP = useCallback((amount: number) => {
    setProfile(prev => {
      const next = { ...prev, totalXP: prev.totalXP + amount };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, []);

  const logMetric = useCallback(async (metricId: string, date: string, value: number, note?: string) => {
    setDailyLogs(prev => {
      const existing = prev.findIndex(l => l.metricId === metricId && l.date === date);
      let next: DailyLog[];
      if (existing >= 0) {
        next = prev.map((l, i) => i === existing ? { ...l, value, ...(note !== undefined ? { note } : {}) } : l);
      } else {
        next = [...prev, { id: generateId(), metricId, date, value, note }];
      }
      AsyncStorage.setItem('dailyLogs', JSON.stringify(next));
      return next;
    });
  }, []);

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

  const addJournalEntry = useCallback(async (entry: Omit<JournalEntry, 'id' | 'wordCount' | 'tags'>) => {
    const wordCount = entry.response.trim().split(/\s+/).filter(w => w.length > 0).length;
    const detectedTags: string[] = [];
    const text = entry.response.toLowerCase();
    if (text.includes('stressed') || text.includes('anxious')) detectedTags.push('stress');
    if (text.includes('tired') || text.includes('sleep')) detectedTags.push('sleep');
    if (text.includes('craving') || text.includes('urge')) detectedTags.push('craving');
    if (text.includes('proud') || text.includes('accomplish')) detectedTags.push('win');
    if (text.includes('social') || text.includes('friend') || text.includes('family')) detectedTags.push('social');
    if (text.includes('work') || text.includes('job')) detectedTags.push('work');
    if (text.includes('exercise') || text.includes('workout') || text.includes('gym')) detectedTags.push('fitness');
    if (text.includes('meditat') || text.includes('mindful')) detectedTags.push('mindfulness');
    const enriched = { ...entry, wordCount, tags: detectedTags };
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
    setWeekTaskProgress(prev => {
      const existing = prev.findIndex(p =>
        p.weekNumber === weekNumber && p.taskId === taskId &&
        (p.programId ?? 'eight-week-recovery') === (programId ?? 'eight-week-recovery')
      );
      let next: WeekTaskProgress[];
      if (existing >= 0) {
        next = prev.map((p, i) => i === existing ? { ...p, completed: !p.completed } : p);
      } else {
        next = [...prev, { weekNumber, taskId, completed: true, programId: programId ?? 'eight-week-recovery' }];
      }
      AsyncStorage.setItem('weekTaskProgress', JSON.stringify(next));
      return next;
    });
  }, []);

  const isWeekTaskComplete = useCallback((weekNumber: number, taskId: string, programId?: string) => {
    const pid = programId ?? 'eight-week-recovery';
    return weekTaskProgress.some(p =>
      p.weekNumber === weekNumber && p.taskId === taskId && p.completed &&
      (p.programId === pid || (!p.programId && pid === 'eight-week-recovery'))
    );
  }, [weekTaskProgress]);

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
  }, []);

  const addFocusMinutes = useCallback(async (minutes: number) => {
    setFocusMinutesToday(prev => {
      const next = prev + minutes;
      AsyncStorage.setItem(`focusMinutes_${today}`, String(next));
      return next;
    });
  }, [today]);

  const enrollProgram = useCallback(async (programId: string) => {
    setProfile(prev => {
      if (prev.activeProgramIds.includes(programId)) return prev;
      const next = {
        ...prev,
        activeProgramIds: [...prev.activeProgramIds, programId],
        programProgress: {
          ...prev.programProgress,
          [programId]: { currentWeek: 1, weekStartDate: new Date().toISOString().split('T')[0], completedWeeks: [], resetCount: 0 },
        },
      };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, []);

  const unenrollProgram = useCallback(async (programId: string) => {
    setProfile(prev => {
      const next = { ...prev, activeProgramIds: prev.activeProgramIds.filter(id => id !== programId) };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, []);

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
        currentWeek: programId === 'eight-week-recovery' ? newWeek : prev.currentWeek,
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
        (p.programId === programId || (!p.programId && programId === 'eight-week-recovery'))
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
      rows.push(`${entry.date},Journal,reflection,${entry.mood},"${entry.response.replace(/"/g, "'").substring(0, 100)}"`);
    }
    return rows.join('\n');
  }, [dailyLogs, metrics, journalEntries]);

  const deleteAllData = useCallback(async () => {
    await AsyncStorage.multiRemove(['profile', 'metrics', 'dailyLogs', 'journalEntries', 'relapseLogs', 'weekTaskProgress']);
    setProfile(DEFAULT_PROFILE);
    setMetrics(DEFAULT_METRICS);
    setDailyLogs([]);
    setJournalEntries([]);
    setRelapseLogs([]);
    setWeekTaskProgress([]);
    setFocusMinutesToday(0);
  }, []);

  return (
    <AppContext.Provider value={{
      profile, metrics, dailyLogs, journalEntries, relapseLogs, weekTaskProgress,
      disciplineScore, totalXP: profile.totalXP, currentStreak, graceStreakActive,
      highestStreak, currentLevel: levelInfo.level, levelProgress: levelInfo.progress,
      levelMax: levelInfo.max, badges: profile.badges, dayScore, completionPct,
      availablePrograms: AVAILABLE_PROGRAMS, correlationInsights,
      updateProfile, logMetric, getLogForDate, getLogsForDate, getLogsForMetric,
      addJournalEntry, getJournalEntryForDate, addRelapseLog,
      toggleWeekTask, isWeekTaskComplete, addCustomMetric, deleteMetric,
      focusMinutesToday, addFocusMinutes, addXP, getStreak, getStreakRisk,
      getMissedDays, getRecentActivity, getMetricStreak, getMetricConsistency,
      enrollProgram, unenrollProgram, advanceProgramWeek, restartProgramWeek,
      getWeekGatingStatus, getProgramProgress, exportData, deleteAllData,
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
