import { requireNativeModule } from 'expo-modules-core';

export interface GeminiNanoNativeModule {
  isAvailable(): Promise<boolean>;
  translateSRT(srtContent: string, targetLanguage: string): Promise<string>;
}

const GeminiNanoNative = requireNativeModule<GeminiNanoNativeModule>('GeminiNano');

export default GeminiNanoNative;
