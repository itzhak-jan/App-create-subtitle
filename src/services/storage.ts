import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiKeys, AppSettings, ProcessingJob } from '../types';

const GEMINI_API_KEY_STORE = 'gemini_api_key';
const SETTINGS_KEY = 'app_settings';
const HISTORY_KEY = 'processing_history';

export const saveApiKeys = async (keys: ApiKeys): Promise<void> => {
  await SecureStore.setItemAsync(GEMINI_API_KEY_STORE, keys.geminiApiKey);
};

export const getApiKeys = async (): Promise<ApiKeys | null> => {
  const geminiApiKey = await SecureStore.getItemAsync(GEMINI_API_KEY_STORE);
  if (!geminiApiKey) return null;
  return { geminiApiKey };
};

export const clearApiKeys = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(GEMINI_API_KEY_STORE);
};

export const hasApiKeys = async (): Promise<boolean> => {
  const key = await SecureStore.getItemAsync(GEMINI_API_KEY_STORE);
  return !!key;
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getSettings = async (): Promise<AppSettings> => {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { targetLanguage: 'he', sourceLanguage: 'auto', autoDetectLanguage: true };
  }
  return JSON.parse(raw) as AppSettings;
};

export const saveJobToHistory = async (job: ProcessingJob): Promise<void> => {
  const history = await getHistory();
  const existingIndex = history.findIndex((j) => j.id === job.id);

  if (existingIndex >= 0) {
    history[existingIndex] = job;
  } else {
    history.unshift(job);
  }

  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
};

export const getHistory = async (): Promise<ProcessingJob[]> => {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as ProcessingJob[];
};

export const removeJobFromHistory = async (jobId: string): Promise<void> => {
  const history = await getHistory();
  await AsyncStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history.filter((j) => j.id !== jobId))
  );
};

export const clearHistory = async (): Promise<void> => {
  await AsyncStorage.removeItem(HISTORY_KEY);
};
