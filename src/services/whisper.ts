import { getInfoAsync } from 'expo-file-system/legacy';
import { SRTEntry } from '../types';
import { parseSRT, adjustSRTTimestamps, mergeSRTChunks } from '../utils/srt-parser';
import { AudioChunk } from '../utils/audio-chunker';

const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export type WhisperProgressCallback = (progress: number, message: string) => void;

/**
 * Transcribe a single audio file using OpenAI Whisper API
 * Returns SRT formatted string
 */
const transcribeAudioFile = async (
  audioUri: string,
  apiKey: string,
  language?: string
): Promise<string> => {
  // Read the file as base64
  const fileInfo = await getInfoAsync(audioUri);
  if (!fileInfo.exists) {
    throw new Error(`Audio file not found: ${audioUri}`);
  }

  // Use fetch with FormData for multipart upload
  const formData = new FormData();

  // Append file using the React Native format
  const fileUri = audioUri.startsWith('file://') ? audioUri : `file://${audioUri}`;
  const fileName = audioUri.split('/').pop() || 'audio.aac';
  const fileType = fileName.endsWith('.mp3') ? 'audio/mpeg' : 'audio/aac';

  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: fileType,
  } as unknown as Blob);

  formData.append('model', 'whisper-1');
  formData.append('response_format', 'srt');

  if (language && language !== 'auto') {
    formData.append('language', language);
  }

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // Don't set Content-Type - let fetch set it with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Whisper API error: ${response.status}`;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }

    if (response.status === 429) {
      throw new Error(`חריגה ממגבלת קצב ה-API. אנא המתן ונסה שנית. (${errorMessage})`);
    } else if (response.status === 401) {
      throw new Error('מפתח ה-API של OpenAI אינו תקין. אנא בדוק את ההגדרות.');
    } else if (response.status === 413) {
      throw new Error('קובץ האודיו גדול מדי. מנסה לפצל לחלקים...');
    }

    throw new Error(errorMessage);
  }

  const srtContent = await response.text();
  return srtContent;
};

/**
 * Transcribe audio with automatic chunking if needed
 * Returns merged SRT content
 */
export const transcribeAudio = async (
  audioChunks: AudioChunk[],
  apiKey: string,
  sourceLanguage: string = 'auto',
  onProgress?: WhisperProgressCallback
): Promise<string> => {
  if (audioChunks.length === 0) {
    throw new Error('No audio chunks to transcribe');
  }

  const allEntries: SRTEntry[][] = [];

  for (let i = 0; i < audioChunks.length; i++) {
    const chunk = audioChunks[i];
    const progressBase = (i / audioChunks.length) * 100;
    const progressEnd = ((i + 1) / audioChunks.length) * 100;

    onProgress?.(
      progressBase,
      audioChunks.length > 1
        ? `תמלול חלק ${i + 1} מתוך ${audioChunks.length}...`
        : 'שולח לתמלול...'
    );

    let srtContent: string | null = null;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries && srtContent === null) {
      try {
        srtContent = await transcribeAudioFile(
          chunk.uri,
          apiKey,
          sourceLanguage !== 'auto' ? sourceLanguage : undefined
        );
      } catch (error) {
        if (retries === maxRetries - 1) throw error;

        // Wait before retry (rate limiting)
        const waitTime = Math.pow(2, retries) * 2000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        retries++;
      }
    }

    if (!srtContent) {
      throw new Error(`Failed to transcribe chunk ${i + 1}`);
    }

    // Parse and adjust timestamps for chunks
    const entries = parseSRT(srtContent);
    const adjustedEntries = chunk.startTime > 0
      ? adjustSRTTimestamps(entries, chunk.startTime)
      : entries;

    allEntries.push(adjustedEntries);

    onProgress?.(progressEnd, `הושלם תמלול חלק ${i + 1}`);
  }

  // Merge all chunks and renumber
  const mergedEntries = mergeSRTChunks(allEntries);

  // Convert back to SRT string
  const mergedSRT = mergedEntries
    .map(
      (entry) =>
        `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`
    )
    .join('\n\n');

  return mergedSRT;
};
