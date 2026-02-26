import { writeAsStringAsync, readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { parseSRT, serializeSRT } from '../utils/srt-parser';

/**
 * Save SRT content to a file
 */
export const saveSRTFile = async (srtContent: string, outputDir: string, filename: string = 'subtitles.srt'): Promise<string> => {
  const srtPath = `${outputDir}${filename}`;
  await writeAsStringAsync(srtPath, srtContent, {
    encoding: EncodingType.UTF8,
  });
  return srtPath;
};

/**
 * Read SRT file content
 */
export const readSRTFile = async (srtPath: string): Promise<string> => {
  const content = await readAsStringAsync(srtPath, {
    encoding: EncodingType.UTF8,
  });
  return content;
};

/**
 * Validate SRT content
 */
export const validateSRT = (srtContent: string): { valid: boolean; entryCount: number; error?: string } => {
  try {
    const entries = parseSRT(srtContent);
    if (entries.length === 0) {
      return { valid: false, entryCount: 0, error: 'No subtitle entries found' };
    }
    return { valid: true, entryCount: entries.length };
  } catch (error) {
    return {
      valid: false,
      entryCount: 0,
      error: error instanceof Error ? error.message : 'Invalid SRT format',
    };
  }
};

/**
 * Clean up SRT content (fix common formatting issues)
 */
export const cleanSRT = (srtContent: string): string => {
  const entries = parseSRT(srtContent);

  // Remove empty text entries
  const cleaned = entries.filter((e) => e.text.trim().length > 0);

  // Renumber
  const renumbered = cleaned.map((entry, idx) => ({
    ...entry,
    index: idx + 1,
  }));

  return serializeSRT(renumbered);
};

/**
 * Get subtitle statistics
 */
export const getSRTStats = (srtContent: string): {
  entryCount: number;
  totalWords: number;
  duration: string;
} => {
  const entries = parseSRT(srtContent);

  const totalWords = entries.reduce((sum, entry) => {
    return sum + entry.text.split(/\s+/).filter(Boolean).length;
  }, 0);

  const lastEntry = entries[entries.length - 1];
  const duration = lastEntry ? lastEntry.endTime : '00:00:00,000';

  return {
    entryCount: entries.length,
    totalWords,
    duration,
  };
};
