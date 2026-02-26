import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import RootNavigator from './src/navigation/RootNavigator';
import { setupNotifications } from './src/services/notifications';
import { useAppUpdates } from './src/hooks/useAppUpdates';

export default function App() {
  // בודק ומוריד עדכוני OTA בשקט ברקע בכל פתיחת האפליקציה
  useAppUpdates();

  useEffect(() => {
    setupNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#1a1a2e" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
