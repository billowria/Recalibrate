import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_METRICS, DefaultMetric } from '@/constants/program';

export interface UserProfile {
  name: string;
  currentWeek: number;
  wakeTime: string;
  bedTime: string;
  startDate: string;
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

interface AppContextType {
  profile: UserProfile;
  metrics: TrackedMetric[];
  dailyLogs: DailyLog[];
  journalEntries: JournalEntry[];
  relapseLogs: RelapseLog[];
  weekTaskProgress: WeekTaskProgress[];
  disciplineScore: number;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logMetric: (metricId: string, date: string, value: number, note?: string) => Promise<void>;
  getLogForDate: (metricId: string, date: string) => DailyLog | undefined;
  getLogsForDate: (date: string) => DailyLog[];
  getLogsForMetric: (metricId: string, days: number) => DailyLog[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => Promise<void>;
  getJournalEntryForDate: (date: string) => JournalEntry | undefined;
  addRelapseLog: (log: Omit<RelapseLog, 'id'>) => Promise<void>;
  toggleWeekTask: (weekNumber: number, taskId: string) => Promise<void>;
  isWeekTaskComplete: (weekNumber: number, taskId: string) => boolean;
  addCustomMetric: (metric: Omit<TrackedMetric, 'id' | 'isDefault' | 'isCustom'>) => Promise<void>;
  focusMinutesToday: number;
  addFocusMinutes: (minutes: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  currentWeek: 1,
  wakeTime: '06:00',
  bedTime: '22:30',
  startDate: new Date().toISOString().split('T')[0],
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
  for (const log of todayLogs) {
    logsByMetric[log.metricId] = log;
  }

  let totalWeight = 0;
  let earnedScore = 0;

  for (const metric of metrics) {
    const log = logsByMetric[metric.id];
    const weight = metric.scoreWeight;
    totalWeight += weight;

    if (!log) continue;

    if (metric.category === 'build') {
      if (metric.inputType === 'boolean') {
        earnedScore += log.value === 1 ? weight : 0;
      } else if (metric.inputType === 'scale') {
        earnedScore += (log.value / 10) * weight;
      } else if (metric.inputType === 'counter') {
        earnedScore += log.value >= 2 ? weight : (log.value / 2) * weight;
      }
    } else if (metric.category === 'reduce') {
      if (metric.inputType === 'boolean') {
        earnedScore += log.value === 0 ? weight : 0;
      } else if (metric.inputType === 'counter') {
        const penalty = Math.min(log.value, 10) / 10;
        earnedScore += (1 - penalty) * weight;
      }
    } else {
      earnedScore += weight * 0.6;
    }
  }

  const focusBonus = Math.min(focusMinutes / 90, 1) * 10;
  const baseScore = totalWeight > 0 ? (earnedScore / totalWeight) * 90 : 0;
  return Math.min(100, Math.round(baseScore + focusBonus));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [metrics, setMetrics] = useState<TrackedMetric[]>(DEFAULT_METRICS);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [relapseLogs, setRelapseLogs] = useState<RelapseLog[]>([]);
  const [weekTaskProgress, setWeekTaskProgress] = useState<WeekTaskProgress[]>([]);
  const [focusMinutesToday, setFocusMinutesToday] = useState<number>(0);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [
        profileRaw,
        metricsRaw,
        logsRaw,
        journalRaw,
        relapseRaw,
        progressRaw,
        focusRaw,
      ] = await Promise.all([
        AsyncStorage.getItem('profile'),
        AsyncStorage.getItem('metrics'),
        AsyncStorage.getItem('dailyLogs'),
        AsyncStorage.getItem('journalEntries'),
        AsyncStorage.getItem('relapseLogs'),
        AsyncStorage.getItem('weekTaskProgress'),
        AsyncStorage.getItem(`focusMinutes_${new Date().toISOString().split('T')[0]}`),
      ]);

      if (profileRaw) setProfile(JSON.parse(profileRaw));
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

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, []);

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

  const addJournalEntry = useCallback(async (entry: Omit<JournalEntry, 'id'>) => {
    setJournalEntries(prev => {
      const existing = prev.findIndex(e => e.date === entry.date);
      let next: JournalEntry[];
      if (existing >= 0) {
        next = prev.map((e, i) => i === existing ? { ...e, ...entry } : e);
      } else {
        next = [...prev, { id: generateId(), ...entry }];
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
    const today = new Date().toISOString().split('T')[0];
    setFocusMinutesToday(prev => {
      const next = prev + minutes;
      AsyncStorage.setItem(`focusMinutes_${today}`, String(next));
      return next;
    });
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = dailyLogs.filter(l => l.date === today);
  const disciplineScore = calculateDisciplineScore(todayLogs, metrics, focusMinutesToday);

  return (
    <AppContext.Provider value={{
      profile,
      metrics,
      dailyLogs,
      journalEntries,
      relapseLogs,
      weekTaskProgress,
      disciplineScore,
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
