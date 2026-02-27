export type Language = {
  code: string;
  name: string;
  nativeName: string;
  isRTL: boolean;
};

export type ProcessingStatus =
  | 'idle'
  | 'extracting_audio'
  | 'transcribing'
  | 'translating'
  | 'embedding_subtitles'
  | 'completed'
  | 'error'
  | 'cancelled';

export type ProcessingJob = {
  id: string;
  videoUri: string;
  videoName: string;
  thumbnailUri?: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: ProcessingStatus;
  progress: number;
  progressMessage: string;
  startedAt: number;
  completedAt?: number;
  outputVideoUri?: string;
  srtContent?: string;
  translatedSrtContent?: string;
  error?: string;
};

export type SRTEntry = {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
};

export type ApiKeys = {
  openaiApiKey: string;
};

export type AppSettings = {
  targetLanguage: string;
  sourceLanguage: string;
  autoDetectLanguage: boolean;
};

export type RootStackParamList = {
  Home: undefined;
  Setup: undefined;
  Processing: { jobId: string };
  Settings: undefined;
  History: undefined;
  VideoPreview: { videoUri: string; jobId: string };
};

export type BottomTabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', isRTL: true },
  { code: 'en', name: 'English', nativeName: 'English', isRTL: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRTL: true },
  { code: 'fr', name: 'French', nativeName: 'Français', isRTL: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', isRTL: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', isRTL: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', isRTL: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', isRTL: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', isRTL: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', isRTL: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', isRTL: false },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', isRTL: false },
];

export const SOURCE_LANGUAGES: Language[] = [
  { code: 'auto', name: 'Auto Detect', nativeName: 'זיהוי אוטומטי', isRTL: false },
  ...SUPPORTED_LANGUAGES,
];
