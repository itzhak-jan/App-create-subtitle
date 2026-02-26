import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiKeys, AppSettings, ProcessingJob } from '../types';

// Keys for secure storage
const OPENAI_API_KEY = 'openai_api_key';
const CLAUDE_API_KEY = 'claude_api_key';

// Keys for regular storage
const SETTINGS_KEY = 'app_settings';
const HISTORY_KEY = 'processing_history';

export const saveApiKeys = async (keys: ApiKeys): Promise<void> => {
  await SecureStore.setItemAsync(OPENAI_API_KEY, keys.openaiApiKey);
  await SecureStore.setItemAsync(CLAUDE_API_KEY, keys.claudeApiKey);
};

export const getApiKeys = async (): Promise<ApiKeys | null> => {
  const openaiApiKey = await SecureStore.getItemAsync(OPENAI_API_KEY);
  const claudeApiKey = await SecureStore.getItemAsync(CLAUDE_API_KEY);

  if (!openaiApiKey || !claudeApiKey) {
    return null;
  }

  return { openaiApiKey, claudeApiKey };
};

export const clearApiKeys = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(OPENAI_API_KEY);
  await SecureStore.deleteItemAsync(CLAUDE_API_KEY);
};

export const hasApiKeys = async (): Promise<boolean> => {
  const openaiKey = await SecureStore.getItemAsync(OPENAI_API_KEY);
  const claudeKey = await SecureStore.getItemAsync(CLAUDE_API_KEY);
  return !!(openaiKey && claudeKey);
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getSettings = async (): Promise<AppSettings> => {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return {
      targetLanguage: 'he',
      sourceLanguage: 'auto',
      autoDetectLanguage: true,
    };
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

  // Keep only last 50 jobs
  const trimmed = history.slice(0, 50);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
};

export const getHistory = async (): Promise<ProcessingJob[]> => {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as ProcessingJob[];
};

export const removeJobFromHistory = async (jobId: string): Promise<void> => {
  const history = await getHistory();
  const filtered = history.filter((j) => j.id !== jobId);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
};

export const clearHistory = async (): Promise<void> => {
  await AsyncStorage.removeItem(HISTORY_KEY);
};
