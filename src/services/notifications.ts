import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const BACKGROUND_TASK_NAME = 'SUBFLOW_BACKGROUND_PROCESSING';

// מזהה קבוע לnotification שרץ ברקע — מאפשר עדכון במקום יצירת חדש
const ONGOING_NOTIFICATION_ID = 'subflow_ongoing_processing';

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

    // ערוץ שקט לnotification שרץ ברקע — בלי צליל/רטט, רק בסטטוס בר
    // זה מונע מ-Android להרוג את התהליך כשממוזערים
    await Notifications.setNotificationChannelAsync('background_processing', {
      name: 'Background Processing (Ongoing)',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [],
      lightColor: '#4a90e2',
      showBadge: false,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus !== 'granted') {
    await Notifications.requestPermissionsAsync();
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

/**
 * מציג notification דביק שנשאר בסטטוס בר כל עוד העיבוד רץ.
 * Android מזהה אפליקציה עם notification פעיל כ"חשובה" ונמנע מלסגור אותה.
 * קורא לזה בתחילת העיבוד.
 */
export const showOngoingProcessingNotification = async (videoName: string): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: ONGOING_NOTIFICATION_ID,
      content: {
        title: '🔄 SubFlow מעבד ברקע',
        body: `${videoName} — לחץ לחזרה לאפליקציה`,
        sticky: true,      // Android: משתמש לא יכול לדחות את ה-notification
        autoDismiss: false,
        data: { type: 'ongoing_processing' },
        ...(Platform.OS === 'android' ? { channelId: 'background_processing' } : {}),
      } as Notifications.NotificationContentInput,
      trigger: null,
    });
  } catch {
    // לא קורסים אם ה-notification נכשל
  }
};

/**
 * מעדכן את ה-notification הרץ עם השלב והאחוז הנוכחיים.
 * קורא לזה עם כל שינוי משמעותי (כל שלב, כל ~10%).
 */
export const updateOngoingProcessingNotification = async (
  step: string,
  progress: number
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: ONGOING_NOTIFICATION_ID,
      content: {
        title: `🔄 SubFlow — ${step}`,
        body: `${progress}% הושלמו`,
        sticky: true,
        autoDismiss: false,
        data: { type: 'ongoing_processing', progress },
        ...(Platform.OS === 'android' ? { channelId: 'background_processing' } : {}),
      } as Notifications.NotificationContentInput,
      trigger: null,
    });
  } catch {
    // בשקט
  }
};

/**
 * מסיר את ה-notification הרץ — קורא לזה בסיום או ביטול עיבוד.
 */
export const dismissOngoingProcessingNotification = async (): Promise<void> => {
  try {
    await Notifications.dismissNotificationAsync(ONGOING_NOTIFICATION_ID);
  } catch {
    // בשקט
  }
};
