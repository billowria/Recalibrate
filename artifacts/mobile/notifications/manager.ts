import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const NOTIF_SETTINGS_KEY = 'notificationSettings';

export interface NotificationSettings {
  enabled: boolean;
  trackingReminder: boolean;
  eveningReminder: boolean;
  streakRiskReminder: boolean;
  pomodoroReminder: boolean;
  journalReminder: boolean;
  morningReminderTime: string;
  eveningReminderTime: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  trackingReminder: true,
  eveningReminder: true,
  streakRiskReminder: true,
  pomodoroReminder: true,
  journalReminder: true,
  morningReminderTime: '08:00',
  eveningReminderTime: '21:00',
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const raw = await AsyncStorage.getItem(NOTIF_SETTINGS_KEY);
  if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
}

export async function setNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const current = await getNotificationSettings();
  const next = { ...current, ...settings };
  await AsyncStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const perm = await Notifications.getPermissionsAsync() as any;
  if (perm.status === 'granted') return true;
  const newPerm = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  }) as any;
  return newPerm.status === 'granted';
}

export async function areNotificationsEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const perm = await Notifications.getPermissionsAsync() as any;
  return perm.status === 'granted';
}

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const hasPerm = await requestNotificationPermissions();
  if (!hasPerm) return undefined;

  // We explicitly configure Notifications handler so pushes in foreground show banners
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as any),
  });

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? '9fd10cbb-b359-45e1-b574-48194033942f';
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("Expo Push Token:", token);
    return token;
  } catch (e) {
    console.warn("Failed to fetch expo push token", e);
    return undefined;
  }
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  title: string,
  body: string,
  id: string
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as any,
    identifier: id,
  });
}

export async function scheduleStreakRiskReminder(
  hour: number,
  minute: number,
  streakLength: number
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔥 ${streakLength}-day streak at risk`,
      body: 'You haven\'t logged today yet. Tap to protect your streak.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as any,
    identifier: 'streak-risk',
  });
}

export async function scheduleImmediateNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export async function scheduleInstant(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    } as any,
  });
}

export async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function setupAllNotifications(settings: NotificationSettings) {
  await cancelAllNotifications();
  if (!settings.enabled) return;

  const [morningH, morningM] = settings.morningReminderTime.split(':').map(Number);
  const [eveningH, eveningM] = settings.eveningReminderTime.split(':').map(Number);

  if (settings.trackingReminder) {
    await scheduleDailyReminder(
      morningH,
      morningM,
      '☀️ Good morning',
      'Start your day with discipline. Log your morning habits now.',
      'morning-reminder'
    );
  }

  if (settings.eveningReminder) {
    await scheduleDailyReminder(
      eveningH,
      eveningM,
      '🌙 Evening check-in',
      'Wrap your day. Log your habits and reflect on your progress.',
      'evening-reminder'
    );
  }

  if (settings.journalReminder) {
    await scheduleDailyReminder(
      20,
      0,
      '📝 Daily journal',
      'Take a moment to write your reflection for today.',
      'journal-reminder'
    );
  }

  if (settings.streakRiskReminder) {
    await scheduleStreakRiskReminder(18, 0, 0);
  }

  if (settings.pomodoroReminder) {
    await scheduleDailyReminder(
      10,
      0,
      '⏱️ Focus time',
      'Start a deep work session with the Pomodoro timer.',
      'pomodoro-reminder'
    );
  }
}

export async function refreshStreakRiskNotification(streakLength: number, hasLoggedToday: boolean) {
  const settings = await getNotificationSettings();
  if (!settings.enabled || !settings.streakRiskReminder) return;

  await cancelNotification('streak-risk');

  if (streakLength > 0 && !hasLoggedToday) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔥 ${streakLength}-day streak at risk`,
        body: 'You haven\'t logged today yet. Tap to protect your streak.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3600,
        repeats: false,
      } as any,
      identifier: 'streak-risk',
    });
  }
}

export async function updateStreakRiskFromLog(streakLength: number) {
  await cancelNotification('streak-risk');
  const settings = await getNotificationSettings();
  if (settings.enabled && settings.streakRiskReminder && streakLength > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `✅ Streak safe — ${streakLength} days`,
        body: 'Great job keeping your streak alive. See you tomorrow!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        repeats: false,
      } as any,
    });
  }
}
