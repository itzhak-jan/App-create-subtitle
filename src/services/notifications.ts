import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const BACKGROUND_TASK_NAME = 'SUBFLOW_BACKGROUND_PROCESSING';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const setupNotifications = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('processing', {
      name: 'Video Processing',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a1a2e',
    });

    await Notifications.setNotificationChannelAsync('completed', {
      name: 'Processing Complete',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#4CAF50',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return;
};

export const sendProcessingStartNotification = async (videoName: string): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎬 SubFlow - עיבוד התחיל',
      body: `מתחיל לעבד: ${videoName}`,
      data: { type: 'processing_start' },
    },
    trigger: null,
  });
};

export const sendProcessingCompleteNotification = async (videoName: string): Promise<string | undefined> => {
  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ SubFlow - הושלם בהצלחה!',
        body: `הסרטון "${videoName}" מוכן עם כתוביות`,
        data: { type: 'processing_complete' },
        ...(Platform.OS === 'android' ? { channelId: 'completed' } : {}),
      },
      trigger: null,
    });
    return notifId;
  } catch {
    return undefined;
  }
};

export const sendProcessingErrorNotification = async (videoName: string, error: string): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '❌ SubFlow - שגיאה',
      body: `שגיאה בעיבוד "${videoName}": ${error}`,
      data: { type: 'processing_error' },
    },
    trigger: null,
  });
};

export const sendProgressNotification = async (
  step: string,
  progress: number
): Promise<void> => {
  // Only send milestone notifications to avoid spam
  if (progress % 25 === 0 && progress > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔄 SubFlow - בעיבוד',
        body: `${step} (${progress}%)`,
        data: { type: 'processing_progress' },
        ...(Platform.OS === 'android' ? { channelId: 'processing' } : {}),
      },
      trigger: null,
    });
  }
};
