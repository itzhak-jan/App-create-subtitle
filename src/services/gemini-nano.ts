import { Platform } from 'react-native';
import { SRTEntry } from '../types';
import { parseSRT, chunkSRTEntries, serializeSRT } from '../utils/srt-parser';

export type TranslationProgressCallback = (progress: number, message: string) => void;

// Gemini Nano context window is limited (~8k tokens).
// Use smaller chunks than Claude to stay safely within limits.
const GEMINI_NANO_CHUNK_CHARS = 1500;

/**
 * Lazily load the native module only on Android to avoid crashes on iOS/web
 */
const getNativeModule = () => {
  if (Platform.OS !== 'android') {
    throw new Error('Gemini Nano is only available on Android');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('gemini-nano').default;
};

/**
 * Returns true if Gemini Nano is available on this device.
 * Requires Android 10+ with Gemini Nano pre-installed (Pixel 8+).
 */
export const isGeminiNanoAvailable = async (): Promise<boolean> => {
  try {
    if (Platform.OS !== 'android') return false;
    const GeminiNano = getNativeModule();
    return await GeminiNano.isAvailable();
  } catch {
    return false;
  }
};

/**
 * Translate a single SRT chunk using Gemini Nano (on-device, no API key needed)
 */
const translateChunkOnDevice = async (
  srtChunk: string,
  targetLanguage: string
): Promise<string> => {
  const GeminiNano = getNativeModule();
  return await GeminiNano.translateSRT(srtChunk, targetLanguage);
};

/**
 * Extract SRT entries from the model response, handling potential formatting issues
 * (same fallback logic as the Claude service)
 */
const extractSRTFromResponse = (response: string, originalEntries: SRTEntry[]): SRTEntry[] => {
  const parsed = parseSRT(response);
  if (parsed.length > 0) return parsed;

  const lines = response.split('\n').filter((l) => l.trim());
  const textLines = lines.filter((l) => {
    const trimmed = l.trim();
    return (
      !trimmed.match(/^\d+$/) &&
      !trimmed.match(/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/) &&
      trimmed.length > 0
    );
  });

  return originalEntries.map((entry, idx) => ({
    ...entry,
    text: textLines[idx] || entry.text,
  }));
};

/**
 * Translate SRT content to the target language using Gemini Nano (on-device).
 * No API key is required — everything runs locally on the device.
 */
export const translateSRTWithGeminiNano = async (
  srtContent: string,
  targetLanguage: string,
  onProgress?: TranslationProgressCallback
): Promise<string> => {
  const entries = parseSRT(srtContent);

  if (entries.length === 0) {
    throw new Error('No subtitle entries found in SRT content');
  }

  const chunks = chunkSRTEntries(entries, GEMINI_NANO_CHUNK_CHARS);
  const translatedChunkEntries: SRTEntry[][] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progressBase = (i / chunks.length) * 100;
    const progressEnd = ((i + 1) / chunks.length) * 100;

    onProgress?.(
      progressBase,
      chunks.length > 1
        ? `מתרגם on-device: חלק ${i + 1} מתוך ${chunks.length}...`
        : 'מתרגם on-device...'
    );

    const chunkSRT = serializeSRT(chunk);
    const translatedChunkSRT = await translateChunkOnDevice(chunkSRT, targetLanguage);

    const translatedEntries = extractSRTFromResponse(translatedChunkSRT, chunk);
    translatedChunkEntries.push(translatedEntries);

    onProgress?.(progressEnd, `הושלם חלק ${i + 1}`);
  }

  // Merge all translated chunks, preserving original timestamps
  const allTranslated: SRTEntry[] = [];
  let index = 1;
  for (const chunkEntries of translatedChunkEntries) {
    for (const entry of chunkEntries) {
      allTranslated.push({ ...entry, index });
      index++;
    }
  }

  return allTranslated
    .map((entry) => `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`)
    .join('\n\n');
};
