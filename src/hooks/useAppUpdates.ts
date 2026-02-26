import { useEffect, useRef, useState } from 'react';
import * as Updates from 'expo-updates';

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'downloading' }
  | { status: 'ready' }          // עדכון הורד, ממתין לרסטרט
  | { status: 'up_to_date' }
  | { status: 'error'; message: string };

/**
 * בודק ומוריד עדכוני OTA בשקט ברקע.
 * לאחר הורדה מוצלחת — מוחיל את העדכון אוטומטית
 * (רסטרט רך של ה-JS bundle, ללא סגירת האפליקציה).
 */
export function useAppUpdates() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const hasChecked = useRef(false);

  useEffect(() => {
    // ב-development ב-Expo Go — expo-updates לא פעיל
    if (!Updates.isEnabled || __DEV__) return;
    // בדיקה חד-פעמית עם mount
    if (hasChecked.current) return;
    hasChecked.current = true;

    checkAndApply();
  }, []);

  async function checkAndApply() {
    try {
      setState({ status: 'checking' });
      const result = await Updates.checkForUpdateAsync();

      if (!result.isAvailable) {
        setState({ status: 'up_to_date' });
        return;
      }

      setState({ status: 'downloading' });
      await Updates.fetchUpdateAsync();

      // מחיל את העדכון — האפליקציה תטעין מחדש את ה-bundle בשקט
      setState({ status: 'ready' });
      await Updates.reloadAsync();

    } catch (e) {
      // שגיאות רשת, שגיאות EAS — לא קורסים את האפליקציה
      const message = e instanceof Error ? e.message : 'Unknown update error';
      setState({ status: 'error', message });
    }
  }

  return state;
}
