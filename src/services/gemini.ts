import { readAsStringAsync } from 'expo-file-system/legacy';
import { SRTEntry } from '../types';
import { parseSRT, chunkSRTEntries, serializeSRT, adjustSRTTimestamps, mergeSRTChunks } from '../utils/srt-parser';
import { AudioChunk } from '../utils/audio-chunker';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-2.0-flash';

// Per-chunk size limit for translation (Gemini handles longer context than Whisper did)
const TRANSLATION_CHUNK_CHARS = 4000;

export type ProgressCallback = (progress: number, message: string) => void;

const LANGUAGE_NAMES: Record<string, string> = {
  he: 'Hebrew',
  en: 'English',
  ar: 'Arabic',
  fa: 'Persian (Farsi)',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  it: 'Italian',
  tr: 'Turkish',
};

// ─── Shared API call ──────────────────────────────────────────────────────────

const callGemini = async (
  apiKey: string,
  parts: object[],
  temperature: number = 0.1,
  maxOutputTokens: number = 8192
): Promise<string> => {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature, maxOutputTokens },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message ?? `Gemini API error ${response.status}`;

    if (response.status === 429) {
      throw new Error(`RATE_LIMIT:${msg}`);
    } else if (response.status === 400) {
      throw new Error(`BAD_REQUEST:${msg}`);
    } else if (response.status === 401 || response.status === 403) {
      throw new Error('מפתח Gemini API אינו תקין. אנא בדוק את ההגדרות.');
    }
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
  if (!text) throw new Error('Gemini returned an empty response');
  return text.trim();
};

// ─── Transcription ────────────────────────────────────────────────────────────

/**
 * Transcribe a single audio chunk to SRT using Gemini Flash.
 * Audio is sent as inline base64 (keep chunk < 8 MB to stay under request limit).
 */
const transcribeChunk = async (
  audioUri: string,
  apiKey: string,
  language: string,
  retries = 0
): Promise<string> => {
  const base64 = await readAsStringAsync(audioUri, { encoding: 'base64' });

  const langHint =
    language !== 'auto' && LANGUAGE_NAMES[language]
      ? `The audio language is ${LANGUAGE_NAMES[language]}. `
      : '';

  const prompt =
    `${langHint}Transcribe this audio into SRT subtitle format.\n` +
    `Return ONLY valid SRT content — no explanation, no markdown, no code blocks.\n` +
    `Use accurate timestamps. Each subtitle should be at most 2 lines.\n` +
    `Example:\n` +
    `1\n00:00:01,000 --> 00:00:03,500\nFirst subtitle\n\n` +
    `2\n00:00:04,000 --> 00:00:06,000\nSecond subtitle`;

  try {
    return await callGemini(
      apiKey,
      [{ inlineData: { mimeType: 'audio/aac', data: base64 } }, { text: prompt }],
      0.1
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';

    // Retry on rate limit with exponential back-off (max 3 retries)
    if (msg.startsWith('RATE_LIMIT') && retries < 3) {
      await new Promise((r) => setTimeout(r, Math.pow(2, retries) * 5000));
      return transcribeChunk(audioUri, apiKey, language, retries + 1);
    }

    // If Gemini rejects the audio (BAD_REQUEST) rethrow with a friendlier message
    if (msg.startsWith('BAD_REQUEST')) {
      throw new Error('Gemini לא הצליח לעבד את קובץ השמע. ייתכן שהקובץ פגום.');
    }

    throw error;
  }
};

/**
 * Transcribe audio (may be split into multiple chunks) to a single SRT string.
 */
export const transcribeAudio = async (
  audioChunks: AudioChunk[],
  apiKey: string,
  sourceLanguage: string = 'auto',
  onProgress?: ProgressCallback
): Promise<string> => {
  if (audioChunks.length === 0) throw new Error('No audio chunks to transcribe');

  const allEntries: SRTEntry[][] = [];

  for (let i = 0; i < audioChunks.length; i++) {
    const chunk = audioChunks[i];
    const progressBase = (i / audioChunks.length) * 100;
    const progressEnd = ((i + 1) / audioChunks.length) * 100;

    onProgress?.(
      progressBase,
      audioChunks.length > 1
        ? `מתמלל חלק ${i + 1} מתוך ${audioChunks.length}...`
        : 'שולח לתמלול (Gemini Flash)...'
    );

    const srtText = await transcribeChunk(chunk.uri, apiKey, sourceLanguage);
    const entries = parseSRT(srtText);

    // Adjust timestamps if this chunk starts later in the original audio
    const adjusted = chunk.startTime > 0
      ? adjustSRTTimestamps(entries, chunk.startTime)
      : entries;

    allEntries.push(adjusted);
    onProgress?.(progressEnd, `הושלם תמלול חלק ${i + 1}`);
  }

  return serializeSRT(mergeSRTChunks(allEntries));
};

// ─── Translation ──────────────────────────────────────────────────────────────

/**
 * Translate a single SRT chunk using Gemini Flash.
 */
const translateChunk = async (
  srtChunk: string,
  targetLanguage: string,
  apiKey: string,
  retries = 0
): Promise<string> => {
  const targetName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  const prompt =
    `Translate the following SRT subtitles to ${targetName}.\n` +
    `Rules:\n` +
    `- Preserve all SRT formatting exactly (index numbers, timestamps, blank lines)\n` +
    `- Translate ONLY the text lines — never modify numbers or timestamps\n` +
    `- Return ONLY the translated SRT with no explanation\n\n` +
    srtChunk;

  try {
    return await callGemini(apiKey, [{ text: prompt }], 0.2);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.startsWith('RATE_LIMIT') && retries < 3) {
      await new Promise((r) => setTimeout(r, Math.pow(2, retries) * 5000));
      return translateChunk(srtChunk, targetLanguage, apiKey, retries + 1);
    }
    throw error;
  }
};

/**
 * Extract SRT entries from model response, with fallback for malformed output.
 */
const extractSRTFromResponse = (response: string, originalEntries: SRTEntry[]): SRTEntry[] => {
  // Strip markdown code fences if model wrapped the SRT in them
  const cleaned = response.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = parseSRT(cleaned);
  if (parsed.length > 0) return parsed;

  // Fallback: strip index/timestamp lines and map text to original entries
  const textLines = cleaned
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return t && !t.match(/^\d+$/) && !t.match(/\d{2}:\d{2}:\d{2},\d{3}/);
    });

  return originalEntries.map((entry, idx) => ({
    ...entry,
    text: textLines[idx] || entry.text,
  }));
};

/**
 * Translate SRT content to the target language using Gemini Flash.
 */
export const translateSRT = async (
  srtContent: string,
  targetLanguage: string,
  apiKey: string,
  onProgress?: ProgressCallback
): Promise<string> => {
  const entries = parseSRT(srtContent);
  if (entries.length === 0) throw new Error('No subtitle entries found in SRT content');

  const chunks = chunkSRTEntries(entries, TRANSLATION_CHUNK_CHARS);
  const translatedChunks: SRTEntry[][] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progressBase = (i / chunks.length) * 100;
    const progressEnd = ((i + 1) / chunks.length) * 100;

    onProgress?.(
      progressBase,
      chunks.length > 1
        ? `מתרגם חלק ${i + 1} מתוך ${chunks.length}...`
        : 'מתרגם (Gemini Flash)...'
    );

    const chunkSRT = serializeSRT(chunk);
    const translatedSRT = await translateChunk(chunkSRT, targetLanguage, apiKey);
    translatedChunks.push(extractSRTFromResponse(translatedSRT, chunk));

    onProgress?.(progressEnd, `הושלם תרגום חלק ${i + 1}`);
  }

  // Merge chunks and renumber
  let index = 1;
  return translatedChunks
    .flat()
    .map((entry) => {
      const line = `${index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`;
      index++;
      return line;
    })
    .join('\n\n');
};
