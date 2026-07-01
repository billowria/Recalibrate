import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import { setBaseUrl, customFetch } from '@workspace/api-client-react';
import { registerForPushNotificationsAsync } from '@/notifications/manager';

const debuggerHost = Constants.expoConfig?.hostUri;
const host = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
const API_URL = `http://${host}:5001/api`;
setBaseUrl(API_URL);

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  requirement: string;
}

export interface TrackedMetric {
  id: string;
  name: string;
  category: string;
  inputType: string;
  unitLabel?: string;
  implementationIntention?: string;
  emoji?: string;
}

export interface DailyLog {
  id: string;
  metricId: string;
  value: number;
  date: string;
  note?: string | null;
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

export interface Exercise {
  id: string;
  userId?: string | null;
  name: string;
  muscleGroup: string;
  equipment?: string | null;
}

export interface WorkoutDayExercise {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  targetRpe?: number | null;
}

export interface WorkoutDay {
  id: string;
  programId: string;
  dayNumber: number;
  title: string;
  targetMuscleGroups: string[];
}

export interface Program {
  id: string;
  userId?: string | null;
  title: string;
  description?: string | null;
  isTemplate: boolean;
  color: string;
  emoji: string;
  totalWeeks?: number;
  weeks?: any[];
}

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutDayId?: string | null;
  startedAt: string;
  completedAt?: string | null;
  volumeScore: number;
}

export interface ExerciseLog {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  isPr: boolean;
  createdAt?: string;
}

export interface Journal {
  id: string;
  userId: string;
  date: string;
  content: string;
  mood?: string | null;
}

export interface UserProfile {
  name: string;
  wakeTime: string;
  bedTime: string;
  startDate: string;
  totalXP: number;
  highestStreak: number;
  activeProgramIds: string[];
  savedProgramIds: string[];
  onboardingComplete?: boolean;
  avatarUrl?: string;
  bio?: string;
  isProfilePublic?: boolean;
  badges?: string[];
  programProgress?: any;
  currentWeek?: number;
  selectedBuildMetricIds?: string[];
  selectedReduceMetricIds?: string[];
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Athlete',
  wakeTime: '06:00',
  bedTime: '22:30',
  startDate: new Date().toISOString().split('T')[0],
  totalXP: 0,
  highestStreak: 0,
  activeProgramIds: ['ppl-split-template'],
  savedProgramIds: ['ppl-split-template'],
  onboardingComplete: false,
  badges: [],
  programProgress: {},
  currentWeek: 1
};

export interface PomodoroSettings {
  workMinutes: number;
  shortBreak: number;
  longBreak: number;
}

interface AppContextType {
  profile: UserProfile;
  exercises: Exercise[];
  programs: Program[];
  workoutDays: WorkoutDay[];
  workoutDayExercises: WorkoutDayExercise[];
  workoutSessions: WorkoutSession[];
  exerciseLogs: ExerciseLog[];
  journals: Journal[];
  userIdState: string | null;
  currentWorkoutSession: WorkoutSession | null;
  themeMode: 'system' | 'light' | 'dark';
  setThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  registerAndSync: (profile: UserProfile) => Promise<void>;
  startWorkoutSession: (workoutDayId: string) => Promise<string>;
  logExerciseSet: (exerciseId: string, setNumber: number, weight: number, reps: number, rpe?: number | null) => Promise<void>;
  finishWorkoutSession: () => Promise<void>;
  cancelWorkoutSession: () => Promise<void>;
  addJournal: (content: string, mood?: string | null) => Promise<void>;
  createCustomProgram: (
    programData: Omit<Program, 'id' | 'isTemplate'>, 
    days: { title: string; dayNumber: number; targetMuscleGroups: string[]; exercises: { exerciseId: string; targetSets: number; targetReps: number; targetRpe?: number }[] }[]
  ) => Promise<any>;
  enrollProgram: (programId: string) => Promise<void>;
  unenrollProgram: (programId: string) => Promise<void>;
  currentStreak: number;
  highestStreak: number;
  currentLevel: number;
  levelProgress: number;
  levelMax: number;
  // Legacy / Stub compatibility properties
  totalXP: number;
  userId: string | null;
  availablePrograms: Program[];
  updateCustomProgram: (programId: string, updates: Partial<Program>, days: any[]) => Promise<void>;
  toggleSavedProgram: (programId: string) => Promise<void>;
  deleteCustomProgram: (programId: string) => Promise<void>;
  publishProgram: (programId: string) => Promise<void>;
  pomodoroSettings: PomodoroSettings;
  setPomodoroSettings: (updates: Partial<PomodoroSettings>) => Promise<void>;
  addFocusMinutes: (mins: number) => Promise<void>;
  focusMinutesToday: number;
  dailyLogs: any[];
  journalEntries: any[];
  metrics: any[];
  relapseLogs: any[];
  getJournalEntryForDate: (date: string) => any;
  getLogsForDate: (date: string) => any[];
  disciplineScore: number;
  correlationInsights: any[];
  addRelapseLog: (payload: any) => Promise<void>;
  badges: string[];
  getProgramProgress: (programId: string) => any;
  exportData: () => string;
  deleteAllData: () => Promise<void>;
  addJournalEntry?: (content: string, mood?: string | null) => Promise<void>;
  addXP?: (amount: number) => Promise<void>;
  weekTaskProgress?: any[];
  isWeekTaskComplete?: (programId: string, week: number, taskId: string) => boolean;
  getWeekGatingStatus?: (programId: string, week: number) => any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getLocalDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function levelFromXP(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const currentLevelXP = Math.pow(level - 1, 2) * 100;
  const nextLevelXP = Math.pow(level, 2) * 100;
  const max = nextLevelXP - currentLevelXP;
  const progress = xp - currentLevelXP;
  return { level, progress, max };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [workoutDayExercises, setWorkoutDayExercises] = useState<WorkoutDayExercise[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);

  const [currentWorkoutSession, setCurrentWorkoutSession] = useState<WorkoutSession | null>(null);
  const [userIdState, setUserIdState] = useState<string | null>(null);
  const [themeMode, setThemeModeState] = useState<'system' | 'light' | 'dark'>('system');

  const [pomodoroSettings, setPomodoroSettingsState] = useState<PomodoroSettings>({
    workMinutes: 25,
    shortBreak: 5,
    longBreak: 15
  });
  const [focusMinutesToday, setFocusMinutesToday] = useState<number>(0);

  useEffect(() => { loadAll(); }, []);

  const setThemeMode = useCallback(async (mode: 'system' | 'light' | 'dark') => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('themeMode', mode);
  }, []);

  // Helper to sync local data to the cloud
  const syncWithCloud = useCallback(async (
    userId: string,
    currentProfile: UserProfile,
    currentExercises: Exercise[],
    currentPrograms: Program[],
    currentDays: WorkoutDay[],
    currentDayExs: WorkoutDayExercise[],
    currentSessions: WorkoutSession[],
    currentLogs: ExerciseLog[],
    currentJournals: Journal[]
  ) => {
    try {
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
          exercises: currentExercises.map(e => ({
            id: e.id,
            userId: e.userId || null,
            name: e.name,
            muscleGroup: e.muscleGroup,
            equipment: e.equipment || null
          })),
          programs: currentPrograms.map(p => ({
            id: p.id,
            userId: p.userId || null,
            title: p.title,
            description: p.description || null,
            isTemplate: p.isTemplate,
            color: p.color,
            emoji: p.emoji
          })),
          workoutDays: currentDays.map(d => ({
            id: d.id,
            programId: d.programId,
            dayNumber: d.dayNumber,
            title: d.title,
            targetMuscleGroups: d.targetMuscleGroups
          })),
          workoutDayExercises: currentDayExs.map(de => ({
            id: de.id,
            workoutDayId: de.workoutDayId,
            exerciseId: de.exerciseId,
            sortOrder: de.sortOrder,
            targetSets: de.targetSets,
            targetReps: de.targetReps,
            targetRpe: de.targetRpe || null
          })),
          workoutSessions: currentSessions.map(s => ({
            id: s.id,
            userId: s.userId,
            workoutDayId: s.workoutDayId || null,
            startedAt: s.startedAt,
            completedAt: s.completedAt || null,
            volumeScore: s.volumeScore
          })),
          exerciseLogs: currentLogs.map(l => ({
            id: l.id,
            workoutSessionId: l.workoutSessionId,
            exerciseId: l.exerciseId,
            setNumber: l.setNumber,
            weight: l.weight,
            reps: l.reps,
            rpe: l.rpe || null,
            isPr: l.isPr
          })),
          journals: currentJournals.map(j => ({
            id: j.id,
            userId: j.userId,
            date: j.date,
            content: j.content,
            mood: j.mood || null
          }))
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
        
        await syncWithCloud(
          result.userId,
          currentProfile,
          exercises,
          programs,
          workoutDays,
          workoutDayExercises,
          workoutSessions,
          exerciseLogs,
          journals
        );

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
  }, [exercises, programs, workoutDays, workoutDayExercises, workoutSessions, exerciseLogs, journals, syncWithCloud]);

  async function loadAll() {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeModeState(savedTheme as any);
      }

      const savedPomodoro = await AsyncStorage.getItem('pomodoroSettings');
      if (savedPomodoro) setPomodoroSettingsState(JSON.parse(savedPomodoro));
      
      const savedFocus = await AsyncStorage.getItem('focusMinutesToday');
      if (savedFocus) setFocusMinutesToday(parseInt(savedFocus, 10));

      const savedUserId = await AsyncStorage.getItem('userId');
      if (savedUserId) {
        setUserIdState(savedUserId);
        
        try {
          const latest = await customFetch<any>(`/users/${savedUserId}/data`);
          if (latest) {
            const finalProfile = {
              ...DEFAULT_PROFILE,
              ...latest.profile,
              badges: latest.profile.badges || [],
            };
            setProfile(finalProfile);
            setExercises(latest.exercises || []);
            setPrograms(latest.programs || []);
            setWorkoutDays(latest.workoutDays || []);
            setWorkoutDayExercises(latest.workoutDayExercises || []);
            setWorkoutSessions(latest.workoutSessions || []);
            setExerciseLogs(latest.exerciseLogs || []);
            setJournals(latest.journals || []);

            await Promise.all([
              AsyncStorage.setItem('profile', JSON.stringify(finalProfile)),
              AsyncStorage.setItem('exercises', JSON.stringify(latest.exercises || [])),
              AsyncStorage.setItem('programs', JSON.stringify(latest.programs || [])),
              AsyncStorage.setItem('workoutDays', JSON.stringify(latest.workoutDays || [])),
              AsyncStorage.setItem('workoutDayExercises', JSON.stringify(latest.workoutDayExercises || [])),
              AsyncStorage.setItem('workoutSessions', JSON.stringify(latest.workoutSessions || [])),
              AsyncStorage.setItem('exerciseLogs', JSON.stringify(latest.exerciseLogs || [])),
              AsyncStorage.setItem('journals', JSON.stringify(latest.journals || []))
            ]);
            console.log('Startup cloud synchronization complete');
            return;
          }
        } catch (err) {
          console.warn('Could not sync with cloud on startup, reading local storage:', err);
        }
      }

      // Read local storage fallback
      const [profileRaw, exRaw, prRaw, wdRaw, wdeRaw, wsRaw, elRaw, jrRaw, activeSessionRaw] = await Promise.all([
        AsyncStorage.getItem('profile'),
        AsyncStorage.getItem('exercises'),
        AsyncStorage.getItem('programs'),
        AsyncStorage.getItem('workoutDays'),
        AsyncStorage.getItem('workoutDayExercises'),
        AsyncStorage.getItem('workoutSessions'),
        AsyncStorage.getItem('exerciseLogs'),
        AsyncStorage.getItem('journals'),
        AsyncStorage.getItem('currentWorkoutSession')
      ]);

      if (profileRaw) setProfile(JSON.parse(profileRaw));
      if (exRaw) setExercises(JSON.parse(exRaw));
      if (prRaw) setPrograms(JSON.parse(prRaw));
      if (wdRaw) setWorkoutDays(JSON.parse(wdRaw));
      if (wdeRaw) setWorkoutDayExercises(JSON.parse(wdeRaw));
      if (wsRaw) setWorkoutSessions(JSON.parse(wsRaw));
      if (elRaw) setExerciseLogs(JSON.parse(elRaw));
      if (jrRaw) setJournals(JSON.parse(jrRaw));
      if (activeSessionRaw) setCurrentWorkoutSession(JSON.parse(activeSessionRaw));
    } catch (err) {
      console.error('Failed to load storage:', err);
    }
  }

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

  const login = useCallback(async (userId: string) => {
    await AsyncStorage.setItem('userId', userId);
    setUserIdState(userId);
    try {
      const latest = await customFetch<any>(`/users/${userId}/data`);
      if (latest) {
        setProfile(latest.profile);
        setExercises(latest.exercises || []);
        setPrograms(latest.programs || []);
        setWorkoutDays(latest.workoutDays || []);
        setWorkoutDayExercises(latest.workoutDayExercises || []);
        setWorkoutSessions(latest.workoutSessions || []);
        setExerciseLogs(latest.exerciseLogs || []);
        setJournals(latest.journals || []);

        await Promise.all([
          AsyncStorage.setItem('profile', JSON.stringify(latest.profile)),
          AsyncStorage.setItem('exercises', JSON.stringify(latest.exercises || [])),
          AsyncStorage.setItem('programs', JSON.stringify(latest.programs || [])),
          AsyncStorage.setItem('workoutDays', JSON.stringify(latest.workoutDays || [])),
          AsyncStorage.setItem('workoutDayExercises', JSON.stringify(latest.workoutDayExercises || [])),
          AsyncStorage.setItem('workoutSessions', JSON.stringify(latest.workoutSessions || [])),
          AsyncStorage.setItem('exerciseLogs', JSON.stringify(latest.exerciseLogs || [])),
          AsyncStorage.setItem('journals', JSON.stringify(latest.journals || []))
        ]);
        console.log('Login synchronization complete');
      }
    } catch (e) {
      console.warn('Login offline fallback:', e);
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.clear();
    setUserIdState(null);
    setProfile(DEFAULT_PROFILE);
    setExercises([]);
    setPrograms([]);
    setWorkoutDays([]);
    setWorkoutDayExercises([]);
    setWorkoutSessions([]);
    setExerciseLogs([]);
    setJournals([]);
    setCurrentWorkoutSession(null);
  }, []);

  const startWorkoutSession = useCallback(async (workoutDayId: string) => {
    const newSessionId = generateId();
    const newSession: WorkoutSession = {
      id: newSessionId,
      userId: userIdState || 'local-user',
      workoutDayId,
      startedAt: new Date().toISOString(),
      volumeScore: 0
    };
    setCurrentWorkoutSession(newSession);
    await AsyncStorage.setItem('currentWorkoutSession', JSON.stringify(newSession));
    return newSessionId;
  }, [userIdState]);

  const logExerciseSet = useCallback(async (
    exerciseId: string, 
    setNumber: number, 
    weight: number, 
    reps: number, 
    rpe?: number | null
  ) => {
    if (!currentWorkoutSession) return;
    
    setExerciseLogs(prev => {
      const existing = prev.findIndex(
        l => l.workoutSessionId === currentWorkoutSession.id && 
             l.exerciseId === exerciseId && 
             l.setNumber === setNumber
      );
      let next: ExerciseLog[];
      const values = {
        id: generateId(),
        workoutSessionId: currentWorkoutSession.id,
        exerciseId,
        setNumber,
        weight,
        reps,
        rpe,
        isPr: false // Checked on finish
      };
      
      if (existing >= 0) {
        next = prev.map((l, i) => i === existing ? { ...l, weight, reps, rpe } : l);
      } else {
        next = [...prev, values];
      }
      AsyncStorage.setItem('exerciseLogs', JSON.stringify(next));
      return next;
    });
  }, [currentWorkoutSession]);

  const finishWorkoutSession = useCallback(async () => {
    if (!currentWorkoutSession) return;

    const sessionLogs = exerciseLogs.filter(l => l.workoutSessionId === currentWorkoutSession.id);
    const volumeScore = sessionLogs.reduce((sum, log) => sum + (log.weight * log.reps), 0);

    const completedSession: WorkoutSession = {
      ...currentWorkoutSession,
      completedAt: new Date().toISOString(),
      volumeScore
    };

    // Calculate XP: 100 XP base + 10 XP per logged exercise + 1 XP per 100kg volume
    const loggedExercisesCount = new Set(sessionLogs.map(l => l.exerciseId)).size;
    const baseXP = 100;
    const exerciseXP = loggedExercisesCount * 10;
    const volumeXP = Math.floor(volumeScore / 100);
    const earnedXP = baseXP + exerciseXP + volumeXP;

    // Check PRs: update logs with PR flags if they beat previous best weight/reps combo
    const finalLogs = exerciseLogs.map(log => {
      if (log.workoutSessionId !== currentWorkoutSession.id) return log;
      
      const previousLogs = exerciseLogs.filter(
        l => l.exerciseId === log.exerciseId && 
             l.workoutSessionId !== currentWorkoutSession.id
      );
      const isBest = previousLogs.every(prev => log.weight > prev.weight || (log.weight === prev.weight && log.reps > prev.reps));
      return { ...log, isPr: isBest };
    });

    setExerciseLogs(finalLogs);
    await AsyncStorage.setItem('exerciseLogs', JSON.stringify(finalLogs));

    setWorkoutSessions(prev => {
      const next = [...prev, completedSession];
      AsyncStorage.setItem('workoutSessions', JSON.stringify(next));
      return next;
    });

    setCurrentWorkoutSession(null);
    await AsyncStorage.removeItem('currentWorkoutSession');

    // Update Profile XP & Streaks
    setProfile(prev => {
      const next = { ...prev, totalXP: prev.totalXP + earnedXP };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });

    if (userIdState) {
      await syncWithCloud(
        userIdState,
        { ...profile, totalXP: profile.totalXP + earnedXP },
        exercises,
        programs,
        workoutDays,
        workoutDayExercises,
        [...workoutSessions, completedSession],
        finalLogs,
        journals
      );
    }
  }, [currentWorkoutSession, exerciseLogs, userIdState, exercises, programs, workoutDays, workoutDayExercises, workoutSessions, journals, profile, syncWithCloud]);

  const cancelWorkoutSession = useCallback(async () => {
    if (!currentWorkoutSession) return;
    
    // Delete logs of the cancelled session
    setExerciseLogs(prev => {
      const next = prev.filter(l => l.workoutSessionId !== currentWorkoutSession.id);
      AsyncStorage.setItem('exerciseLogs', JSON.stringify(next));
      return next;
    });

    setCurrentWorkoutSession(null);
    await AsyncStorage.removeItem('currentWorkoutSession');
  }, [currentWorkoutSession]);

  const addJournal = useCallback(async (content: string, mood?: string | null) => {
    const newJournal: Journal = {
      id: generateId(),
      userId: userIdState || 'local-user',
      date: getLocalDateString(),
      content,
      mood: mood || null
    };

    setJournals(prev => {
      const next = [...prev, newJournal];
      AsyncStorage.setItem('journals', JSON.stringify(next));
      return next;
    });

    if (userIdState) {
      await syncWithCloud(
        userIdState,
        profile,
        exercises,
        programs,
        workoutDays,
        workoutDayExercises,
        workoutSessions,
        exerciseLogs,
        [...journals, newJournal]
      );
    }
  }, [userIdState, profile, exercises, programs, workoutDays, workoutDayExercises, workoutSessions, exerciseLogs, journals, syncWithCloud]);

  const createCustomProgram = useCallback(async (
    programData: Omit<Program, 'id' | 'isTemplate'>, 
    daysData: { title: string; dayNumber: number; targetMuscleGroups: string[]; exercises: { exerciseId: string; targetSets: number; targetReps: number; targetRpe?: number }[] }[]
  ) => {
    const programId = `custom-${Date.now()}`;
    const newProgram: Program = {
      id: programId,
      userId: userIdState || 'local-user',
      title: programData.title,
      description: programData.description || null,
      isTemplate: false,
      color: programData.color || '#7C3AED',
      emoji: programData.emoji || '💪'
    };

    const newDays: WorkoutDay[] = [];
    const newDayExs: WorkoutDayExercise[] = [];

    daysData.forEach(d => {
      const dayId = generateId();
      newDays.push({
        id: dayId,
        programId,
        dayNumber: d.dayNumber,
        title: d.title,
        targetMuscleGroups: d.targetMuscleGroups
      });

      d.exercises.forEach((ex, idx) => {
        newDayExs.push({
          id: generateId(),
          workoutDayId: dayId,
          exerciseId: ex.exerciseId,
          sortOrder: idx + 1,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetRpe: ex.targetRpe || null
        });
      });
    });

    setPrograms(prev => {
      const next = [...prev, newProgram];
      AsyncStorage.setItem('programs', JSON.stringify(next));
      return next;
    });

    setWorkoutDays(prev => {
      const next = [...prev, ...newDays];
      AsyncStorage.setItem('workoutDays', JSON.stringify(next));
      return next;
    });

    setWorkoutDayExercises(prev => {
      const next = [...prev, ...newDayExs];
      AsyncStorage.setItem('workoutDayExercises', JSON.stringify(next));
      return next;
    });

    if (userIdState) {
      await syncWithCloud(
        userIdState,
        profile,
        exercises,
        [...programs, newProgram],
        [...workoutDays, ...newDays],
        [...workoutDayExercises, ...newDayExs],
        workoutSessions,
        exerciseLogs,
        journals
      );
    }

    return newProgram;
  }, [userIdState, profile, exercises, programs, workoutDays, workoutDayExercises, workoutSessions, exerciseLogs, journals, syncWithCloud]);

  const enrollProgram = useCallback(async (programId: string) => {
    if (profile.activeProgramIds.includes(programId)) return;
    
    const nextProfile = {
      ...profile,
      activeProgramIds: [...profile.activeProgramIds, programId],
    };
    setProfile(nextProfile);
    await AsyncStorage.setItem('profile', JSON.stringify(nextProfile));

    if (userIdState) {
      await syncWithCloud(
        userIdState,
        nextProfile,
        exercises,
        programs,
        workoutDays,
        workoutDayExercises,
        workoutSessions,
        exerciseLogs,
        journals
      );
    }
  }, [profile, userIdState, exercises, programs, workoutDays, workoutDayExercises, workoutSessions, exerciseLogs, journals, syncWithCloud]);

  const unenrollProgram = useCallback(async (programId: string) => {
    const nextProfile = {
      ...profile,
      activeProgramIds: profile.activeProgramIds.filter(id => id !== programId),
    };
    setProfile(nextProfile);
    await AsyncStorage.setItem('profile', JSON.stringify(nextProfile));

    if (userIdState) {
      await syncWithCloud(
        userIdState,
        nextProfile,
        exercises,
        programs,
        workoutDays,
        workoutDayExercises,
        workoutSessions,
        exerciseLogs,
        journals
      );
    }
  }, [profile, userIdState, exercises, programs, workoutDays, workoutDayExercises, workoutSessions, exerciseLogs, journals, syncWithCloud]);

  const setPomodoroSettings = useCallback(async (updates: Partial<PomodoroSettings>) => {
    setPomodoroSettingsState(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem('pomodoroSettings', JSON.stringify(next));
      return next;
    });
  }, []);

  const addFocusMinutes = useCallback(async (mins: number) => {
    setFocusMinutesToday(prev => {
      const next = prev + mins;
      AsyncStorage.setItem('focusMinutesToday', String(next));
      return next;
    });
    setProfile(prev => {
      const next = { ...prev, totalXP: prev.totalXP + Math.floor(mins * 0.5) };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleSavedProgram = useCallback(async (programId: string) => {
    const isSaved = profile.savedProgramIds?.includes(programId);
    const nextSaved = isSaved
      ? (profile.savedProgramIds || []).filter(id => id !== programId)
      : [...(profile.savedProgramIds || []), programId];
    
    const nextProfile = {
      ...profile,
      savedProgramIds: nextSaved
    };
    setProfile(nextProfile);
    await AsyncStorage.setItem('profile', JSON.stringify(nextProfile));

    if (userIdState) {
      await syncWithCloud(
        userIdState,
        nextProfile,
        exercises,
        programs,
        workoutDays,
        workoutDayExercises,
        workoutSessions,
        exerciseLogs,
        journals
      );
    }
  }, [profile, userIdState, exercises, programs, workoutDays, workoutDayExercises, workoutSessions, exerciseLogs, journals, syncWithCloud]);

  const deleteCustomProgram = useCallback(async (programId: string) => {
    setPrograms(prev => {
      const next = prev.filter(p => p.id !== programId);
      AsyncStorage.setItem('programs', JSON.stringify(next));
      return next;
    });
    setWorkoutDays(prev => {
      const next = prev.filter(d => d.programId !== programId);
      AsyncStorage.setItem('workoutDays', JSON.stringify(next));
      return next;
    });
    const dayIds = workoutDays.filter(d => d.programId === programId).map(d => d.id);
    setWorkoutDayExercises(prev => {
      const next = prev.filter(de => !dayIds.includes(de.workoutDayId));
      AsyncStorage.setItem('workoutDayExercises', JSON.stringify(next));
      return next;
    });

    if (userIdState) {
      try {
        await customFetch(`/programs/${programId}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn('Could not delete program from cloud:', err);
      }
    }
  }, [userIdState, workoutDays]);

  const publishProgram = useCallback(async (programId: string) => {
    if (!userIdState) return;
    try {
      const prog = programs.find(p => p.id === programId);
      if (!prog) return;
      
      const progDays = workoutDays.filter(d => d.programId === programId);
      const dayIds = progDays.map(d => d.id);
      const progDayExs = workoutDayExercises.filter(de => dayIds.includes(de.workoutDayId));

      await customFetch(`/programs/${programId}/publish`, {
        method: 'POST',
        body: JSON.stringify({
          program: prog,
          days: progDays,
          dayExercises: progDayExs
        })
      });
      
      setPrograms(prev => {
        const next = prev.map(p => p.id === programId ? { ...p, isTemplate: true } : p);
        AsyncStorage.setItem('programs', JSON.stringify(next));
        return next;
      });
    } catch (err) {
      console.warn('Could not publish program to cloud:', err);
    }
  }, [userIdState, programs, workoutDays, workoutDayExercises]);

  const updateCustomProgram = useCallback(async (
    programId: string,
    programData: Partial<Program>,
    daysData: { id?: string; title: string; dayNumber: number; targetMuscleGroups: string[]; exercises: { exerciseId: string; targetSets: number; targetReps: number; targetRpe?: number }[] }[]
  ) => {
    setPrograms(prev => {
      const next = prev.map(p => p.id === programId ? { ...p, ...programData } : p);
      AsyncStorage.setItem('programs', JSON.stringify(next));
      return next;
    });

    const newDays: WorkoutDay[] = [];
    const newDayExs: WorkoutDayExercise[] = [];

    daysData.forEach(d => {
      const dayId = d.id || generateId();
      newDays.push({
        id: dayId,
        programId,
        dayNumber: d.dayNumber,
        title: d.title,
        targetMuscleGroups: d.targetMuscleGroups
      });

      d.exercises.forEach((ex, idx) => {
        newDayExs.push({
          id: generateId(),
          workoutDayId: dayId,
          exerciseId: ex.exerciseId,
          sortOrder: idx + 1,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetRpe: ex.targetRpe || null
        });
      });
    });

    setWorkoutDays(prev => {
      const filtered = prev.filter(d => d.programId !== programId);
      const next = [...filtered, ...newDays];
      AsyncStorage.setItem('workoutDays', JSON.stringify(next));
      return next;
    });

    const dayIdsToRemove = workoutDays.filter(d => d.programId === programId).map(d => d.id);
    setWorkoutDayExercises(prev => {
      const filtered = prev.filter(de => !dayIdsToRemove.includes(de.workoutDayId));
      const next = [...filtered, ...newDayExs];
      AsyncStorage.setItem('workoutDayExercises', JSON.stringify(next));
      return next;
    });

    if (userIdState) {
      await syncWithCloud(
        userIdState,
        profile,
        exercises,
        programs.map(p => p.id === programId ? { ...p, ...programData } : p),
        [...workoutDays.filter(d => d.programId !== programId), ...newDays],
        [...workoutDayExercises.filter(de => !dayIdsToRemove.includes(de.workoutDayId)), ...newDayExs],
        workoutSessions,
        exerciseLogs,
        journals
      );
    }
  }, [userIdState, profile, exercises, programs, workoutDays, workoutDayExercises, workoutSessions, exerciseLogs, journals, syncWithCloud]);

  const addRelapseLog = useCallback(async (payload: any) => {}, []);

  const thisWeekSessionsCount = useMemo(() => {
    const startOfWeek = new Date();
    const currentDay = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(startOfWeek.setDate(diff));
    monday.setHours(0,0,0,0);

    return workoutSessions.filter(
      s => s.completedAt && new Date(s.completedAt).getTime() >= monday.getTime()
    ).length;
  }, [workoutSessions]);

  const activeDaysForScore = useMemo(() => {
    const activeId = profile.activeProgramIds[0];
    if (!activeId) return [];
    return workoutDays.filter(d => d.programId === activeId);
  }, [profile.activeProgramIds, workoutDays]);

  const disciplineScore = useMemo(() => {
    const totalTargetWorkouts = activeDaysForScore.length || 3;
    return Math.round((thisWeekSessionsCount / totalTargetWorkouts) * 100);
  }, [thisWeekSessionsCount, activeDaysForScore.length]);

  const currentStreak = useMemo(() => {
    const completedDates = new Set(
      workoutSessions
        .filter(s => s.completedAt)
        .map(s => s.completedAt!.split('T')[0])
    );
    
    let streak = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const todayStr = d.toISOString().split('T')[0];
    
    if (!completedDates.has(todayStr)) {
      d.setDate(d.getDate() - 1);
    }
    
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (completedDates.has(dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [workoutSessions]);

  const highestStreak = useMemo(() => Math.max(profile.highestStreak, currentStreak), [profile.highestStreak, currentStreak]);
  const levelInfo = useMemo(() => levelFromXP(profile.totalXP), [profile.totalXP]);

  const exportData = useCallback(() => {
    const rows = ['Date,Workout Day,Exercise,Set,Weight,Reps,RPE,PR'];
    for (const session of workoutSessions) {
      const day = workoutDays.find(d => d.id === session.workoutDayId);
      const sessionLogs = exerciseLogs.filter(l => l.workoutSessionId === session.id);
      
      for (const log of sessionLogs) {
        const ex = exercises.find(e => e.id === log.exerciseId);
        const dateStr = session.completedAt ? session.completedAt.split('T')[0] : session.startedAt.split('T')[0];
        rows.push(`${dateStr},"${day?.title || 'Unknown'}","${ex?.name || 'Unknown'}",${log.setNumber},${log.weight},${log.reps},${log.rpe || ''},${log.isPr ? 'Yes' : 'No'}`);
      }
    }
    return rows.join('\n');
  }, [workoutSessions, workoutDays, exerciseLogs, exercises]);

  const deleteAllData = useCallback(async () => {
    await AsyncStorage.clear();
    setUserIdState(null);
    setProfile(DEFAULT_PROFILE);
    setExercises([]);
    setPrograms([]);
    setWorkoutDays([]);
    setWorkoutDayExercises([]);
    setWorkoutSessions([]);
    setExerciseLogs([]);
    setJournals([]);
    setCurrentWorkoutSession(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        profile,
        exercises,
        programs,
        workoutDays,
        workoutDayExercises,
        workoutSessions,
        exerciseLogs,
        journals,
        userIdState,
        currentWorkoutSession,
        themeMode,
        setThemeMode,
        updateProfile,
        login,
        logout,
        registerAndSync,
        startWorkoutSession,
        logExerciseSet,
        finishWorkoutSession,
        cancelWorkoutSession,
        addJournal,
        createCustomProgram,
        enrollProgram,
        unenrollProgram,
        currentStreak,
        highestStreak,
        currentLevel: levelInfo.level,
        levelProgress: levelInfo.progress,
        levelMax: levelInfo.max,
        // Legacy / Stub compatibility values
        totalXP: profile.totalXP,
        userId: userIdState,
        availablePrograms: programs,
        updateCustomProgram,
        toggleSavedProgram,
        deleteCustomProgram,
        publishProgram,
        pomodoroSettings,
        setPomodoroSettings,
        addFocusMinutes,
        focusMinutesToday,
        dailyLogs: [],
        journalEntries: journals,
        metrics: [],
        relapseLogs: [],
        getJournalEntryForDate: (date: string) => journals.find(j => j.date === date),
        getLogsForDate: (date: string) => [],
        disciplineScore,
        correlationInsights: [],
        addRelapseLog,
        badges: profile.badges || [],
        getProgramProgress: (programId: string) => ({ currentWeek: 1, completedWeeks: [] }),
        exportData,
        deleteAllData,
        addJournalEntry: addJournal,
        addXP: async (amount: number) => {
          setProfile(prev => {
            const next = { ...prev, totalXP: prev.totalXP + amount };
            AsyncStorage.setItem('profile', JSON.stringify(next));
            return next;
          });
        },
        weekTaskProgress: [],
        isWeekTaskComplete: () => false,
        getWeekGatingStatus: () => ({ gated: false, completed: 0, total: 0 }),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
