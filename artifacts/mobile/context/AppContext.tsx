import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_METRICS, DefaultMetric, PROGRAM_WEEKS } from '@/constants/program';

export interface UserProfile {
  name: string;
  currentWeek: number;
  wakeTime: string;
  bedTime: string;
  startDate: string;
  totalXP: number;
  highestStreak: number;
  badges: string[];
}

export interface TrackedMetric extends DefaultMetric {
  isCustom?: boolean;
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
  triggerReflection: string;
  nextAction: string;
}

export interface WeekTaskProgress {
  weekNumber: number;
  taskId: string;
  completed: boolean;
}

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  requirement: string;
}

export const BADGES: Badge[] = [
  { id: 'first-log', emoji: '🎯', name: 'First Step', description: 'Log your first habit', requirement: 'any-log' },
  { id: 'streak-3', emoji: '🔥', name: 'On Fire', description: '3-day streak', requirement: 'streak-3' },
  { id: 'streak-7', emoji: '✨', name: 'Week Warrior', description: '7-day streak', requirement: 'streak-7' },
  { id: 'streak-14', emoji: '💪', name: 'Two Weeks Strong', description: '14-day streak', requirement: 'streak-14' },
  { id: 'streak-30', emoji: '🏆', name: 'Unstoppable', description: '30-day streak', requirement: 'streak-30' },
  { id: 'perfect-day', emoji: '⭐', name: 'Perfect Day', description: 'Score 100% in one day', requirement: 'score-100' },
  { id: 'deep-work', emoji: '📚', name: 'Deep Work', description: 'Complete a 90-min Pomodoro session', requirement: 'focus-90' },
  { id: 'journal-5', emoji: '📖', name: 'Reflective', description: '5 journal entries', requirement: 'journal-5' },
  { id: 'journal-20', emoji: '💎', name: 'Philosopher', description: '20 journal entries', requirement: 'journal-20' },
  { id: 'week-complete', emoji: '🎉', name: 'Week Complete', description: 'Finish a full week', requirement: 'week-done' },
  { id: 'halfway', emoji: '👏', name: 'Halfway Hero', description: 'Complete Week 4', requirement: 'week-4' },
  { id: 'protocol-finish', emoji: '🏁', name: 'Protocol Master', description: 'Complete Week 8', requirement: 'week-8' },
  { id: 'returning', emoji: '🙊', name: 'Back on Track', description: 'Log after a relapse', requirement: 'post-relapse-log' },
  { id: 'early-riser', emoji: '🌅', name: 'Early Riser', description: 'Wake on time 5 days', requirement: 'wake-5' },
  { id: 'hydrated', emoji: '💧', name: 'Hydrated', description: 'Track water 5 days', requirement: 'water-5' },
];

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
  highestStreak: number;
  currentLevel: number;
  levelProgress: number;
  levelMax: number;
  badges: string[];
  dayScore: number;
  completionPct: number;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logMetric: (metricId: string, date: string, value: number, note?: string) => Promise<void>;
  getLogForDate: (metricId: string, date: string) => DailyLog | undefined;
  getLogsForDate: (date: string) => DailyLog[];
  getLogsForMetric: (metricId: string, days: number) => DailyLog[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'wordCount' | 'tags'>) => Promise<void>;
  getJournalEntryForDate: (date: string) => JournalEntry | undefined;
  addRelapseLog: (log: Omit<RelapseLog, 'id'>) => Promise<void>;
  toggleWeekTask: (weekNumber: number, taskId: string) => Promise<void>;
  isWeekTaskComplete: (weekNumber: number, taskId: string) => boolean;
  addCustomMetric: (metric: Omit<TrackedMetric, 'id' | 'isDefault' | 'isCustom'>) => Promise<void>;
  focusMinutesToday: number;
  addFocusMinutes: (minutes: number) => Promise<void>;
  addXP: (amount: number) => void;
  getStreak: () => number;
  getStreakRisk: () => boolean;
  getMissedDays: (days: number) => string[];
  getRecentActivity: (count: number) => ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'habit' | 'journal' | 'focus' | 'task' | 'relapse';
  emoji: string;
  text: string;
  time: string;
  date: string;
  xp?: number;
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

function computeStreak(logDates: Set<string>, endDate: Date) {
  let streak = 0;
  const d = new Date(endDate);
  d.setHours(0, 0, 0, 0);
  while (d.getTime() >= new Date('2024-01-01').getTime()) {
    const ds = d.toISOString().split('T')[0];
    if (logDates.has(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
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
      if (profileRaw) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(profileRaw) });
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
  const currentStreak = useMemo(() => computeStreak(logDates, new Date()), [logDates]);
  const highestStreak = useMemo(() => Math.max(profile.highestStreak, currentStreak), [profile.highestStreak, currentStreak]);
  const levelInfo = useMemo(() => levelFromXP(profile.totalXP), [profile.totalXP]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, []);

  const addXP = useCallback((amount: number, reason?: string) => {
    setProfile(prev => {
      const next = { ...prev, totalXP: prev.totalXP + amount };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, []);

  const checkBadges = useCallback(() => {
    const newBadges: string[] = [];
    const earned = new Set(profile.badges);
    const totalLogs = dailyLogs.length;
    const totalJournals = journalEntries.length;
    const totalRelapses = relapseLogs.length;
    const wakeCount = dailyLogs.filter(l => l.metricId === 'wake-time' && l.value > 0).length;
    const waterCount = dailyLogs.filter(l => l.metricId === 'water' && l.value > 0).length;

    if (totalLogs > 0 && !earned.has('first-log')) newBadges.push('first-log');
    if (currentStreak >= 3 && !earned.has('streak-3')) newBadges.push('streak-3');
    if (currentStreak >= 7 && !earned.has('streak-7')) newBadges.push('streak-7');
    if (currentStreak >= 14 && !earned.has('streak-14')) newBadges.push('streak-14');
    if (currentStreak >= 30 && !earned.has('streak-30')) newBadges.push('streak-30');
    if (dayScore >= 100 && !earned.has('perfect-day')) newBadges.push('perfect-day');
    if (focusMinutesToday >= 90 && !earned.has('deep-work')) newBadges.push('deep-work');
    if (totalJournals >= 5 && !earned.has('journal-5')) newBadges.push('journal-5');
    if (totalJournals >= 20 && !earned.has('journal-20')) newBadges.push('journal-20');
    if (wakeCount >= 5 && !earned.has('early-riser')) newBadges.push('early-riser');
    if (waterCount >= 5 && !earned.has('hydrated')) newBadges.push('hydrated');
    if (totalRelapses > 0 && !earned.has('returning')) newBadges.push('returning');

    const programWeeksComplete = [1,2,3,4,5,6,7,8].map((wn: number) => {
      const week = PROGRAM_WEEKS[wn - 1];
      if (!week) return false;
      return week.tasks.every((t: { id: string }) => weekTaskProgress.some(p => p.weekNumber === wn && p.taskId === t.id && p.completed));
    });
    if (programWeeksComplete.some(Boolean) && !earned.has('week-complete')) newBadges.push('week-complete');
    if (programWeeksComplete.slice(0,4).every(Boolean) && !earned.has('halfway')) newBadges.push('halfway');
    if (programWeeksComplete.every(Boolean) && !earned.has('protocol-finish')) newBadges.push('protocol-finish');

    if (newBadges.length > 0) {
      setProfile(prev => {
        const next = { ...prev, badges: [...prev.badges, ...newBadges] };
        AsyncStorage.setItem('profile', JSON.stringify(next));
        return next;
      });
    }
  }, [dailyLogs, journalEntries, relapseLogs, currentStreak, dayScore, focusMinutesToday, weekTaskProgress, profile.badges]);

  const logMetric = useCallback(async (metricId: string, date: string, value: number, note?: string) => {
    setDailyLogs(prev => {
      const existing = prev.findIndex(l => l.metricId === metricId && l.date === date);
      let next: DailyLog[];
      if (existing >= 0) {
        next = prev.map((l, i) => i === existing ? { ...l, value, note } : l);
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

  const addJournalEntry = useCallback(async (entry: Omit<JournalEntry, 'id' | 'wordCount' | 'tags'>) => {
    const wordCount = entry.response.trim().split(/\s+/).filter(w => w.length > 0).length;
    const detectedTags: string[] = [];
    const text = entry.response.toLowerCase();
    if (text.includes('stressed') || text.includes('anxious') || text.includes('overwhelm')) detectedTags.push('stress');
    if (text.includes('tired') || text.includes('sleep') || text.includes('exhaust')) detectedTags.push('sleep');
    if (text.includes('craving') || text.includes('urge') || text.includes('tempt')) detectedTags.push('craving');
    if (text.includes('proud') || text.includes('accomplish') || text.includes('achiev')) detectedTags.push('win');
    if (text.includes('social') || text.includes('friend') || text.includes('family') || text.includes('alone')) detectedTags.push('social');
    if (text.includes('work') || text.includes('job') || text.includes('career')) detectedTags.push('work');
    if (text.includes('exercise') || text.includes('workout') || text.includes('gym') || text.includes('run')) detectedTags.push('fitness');
    if (text.includes('meditat') || text.includes('mindful') || text.includes('breath')) detectedTags.push('mindfulness');
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

  const toggleWeekTask = useCallback(async (weekNumber: number, taskId: string) => {
    setWeekTaskProgress(prev => {
      const existing = prev.findIndex(p => p.weekNumber === weekNumber && p.taskId === taskId);
      let next: WeekTaskProgress[];
      if (existing >= 0) {
        next = prev.map((p, i) => i === existing ? { ...p, completed: !p.completed } : p);
      } else {
        next = [...prev, { weekNumber, taskId, completed: true }];
      }
      AsyncStorage.setItem('weekTaskProgress', JSON.stringify(next));
      return next;
    });
  }, []);

  const isWeekTaskComplete = useCallback((weekNumber: number, taskId: string) => {
    return weekTaskProgress.some(p => p.weekNumber === weekNumber && p.taskId === taskId && p.completed);
  }, [weekTaskProgress]);

  const addCustomMetric = useCallback(async (metric: Omit<TrackedMetric, 'id' | 'isDefault' | 'isCustom'>) => {
    const newMetric: TrackedMetric = {
      ...metric,
      id: generateId(),
      isDefault: false,
      isCustom: true,
    };
    setMetrics(prev => {
      const next = [...prev, newMetric];
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
  }, []);

  const getStreak = useCallback(() => currentStreak, [currentStreak]);

  const getStreakRisk = useCallback(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    return !logDates.has(yesterdayStr);
  }, [logDates]);

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
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = dailyLogs.filter(l => l.date === today);
    for (const log of todayLogs) {
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
    if (journalToday) {
      items.push({
        id: journalToday.id, type: 'journal', date: today,
        emoji: '📝', text: 'Journal entry saved', time: 'Today', xp: 25,
      });
    }
    if (focusMinutesToday > 0) {
      items.push({
        id: generateId(), type: 'focus', date: today,
        emoji: '🎨', text: `${focusMinutesToday} min deep work`, time: 'Today', xp: Math.min(focusMinutesToday, 10),
      });
    }
    items.sort((a, b) => b.text.localeCompare(a.text));
    return items.slice(0, count);
  }, [dailyLogs, metrics, journalEntries, focusMinutesToday]);

  return (
    <AppContext.Provider value={{
      profile,
      metrics,
      dailyLogs,
      journalEntries,
      relapseLogs,
      weekTaskProgress,
      disciplineScore,
      totalXP: profile.totalXP,
      currentStreak,
      highestStreak,
      currentLevel: levelInfo.level,
      levelProgress: levelInfo.progress,
      levelMax: levelInfo.max,
      badges: profile.badges,
      dayScore,
      completionPct,
      updateProfile,
      logMetric,
      getLogForDate,
      getLogsForDate,
      getLogsForMetric,
      addJournalEntry,
      getJournalEntryForDate,
      addRelapseLog,
      toggleWeekTask,
      isWeekTaskComplete,
      addCustomMetric,
      focusMinutesToday,
      addFocusMinutes,
      addXP,
      getStreak,
      getStreakRisk,
      getMissedDays,
      getRecentActivity,
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
