import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList, BottomTabParamList } from '../types';
import { hasApiKeys } from '../services/storage';
import { ProcessingProvider } from '../context/ProcessingContext';

import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import VideoPreviewScreen from '../screens/VideoPreviewScreen';
import SetupScreen from '../screens/SetupScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#16213e',
        },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#8892a4',
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'בית',
          tabBarLabel: 'בית',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
          headerTitle: 'SubFlow',
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          title: 'היסטוריה',
          tabBarLabel: 'היסטוריה',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" color={color} size={size} />
          ),
          headerTitle: 'היסטוריה',
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'הגדרות',
          tabBarLabel: 'הגדרות',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" color={color} size={size} />
          ),
          headerTitle: 'הגדרות',
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [hasKeys, setHasKeys] = useState<boolean | null>(null);

  useEffect(() => {
    hasApiKeys().then(setHasKeys);
  }, []);

  if (hasKeys === null) {
    return null; // Loading
  }

  return (
    <ProcessingProvider>
      <Stack.Navigator
        initialRouteName={hasKeys ? 'Home' : 'Setup'}
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#0f3460' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Setup"
          component={SetupScreen}
          options={{ title: 'הגדרה ראשונית', headerShown: false }}
        />
        <Stack.Screen
          name="Processing"
          component={ProcessingScreen}
          options={{ title: 'עיבוד סרטון', headerShown: false }}
        />
        <Stack.Screen
          name="VideoPreview"
          component={VideoPreviewScreen}
          options={{ title: 'תצוגה מקדימה' }}
        />
      </Stack.Navigator>
    </ProcessingProvider>
  );
}
