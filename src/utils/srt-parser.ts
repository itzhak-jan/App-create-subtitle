import { SRTEntry } from '../types';

/**
 * Parse SRT string content into an array of SRTEntry objects
 */
export const parseSRT = (srtContent: string): SRTEntry[] => {
  const entries: SRTEntry[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const index = parseInt(lines[0].trim(), 10);
    if (isNaN(index)) continue;

    const timeLine = lines[1].trim();
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
    );
    if (!timeMatch) continue;

    const text = lines.slice(2).join('\n').trim();

    entries.push({
      index,
      startTime: timeMatch[1],
      endTime: timeMatch[2],
      text,
    });
  }

  return entries;
};

/**
 * Serialize SRTEntry array back to SRT string
 */
export const serializeSRT = (entries: SRTEntry[]): string => {
  return entries
    .map(
      (entry) =>
        `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`
    )
    .join('\n\n');
};

/**
 * Convert SRT timestamp to seconds
 */
export const srtTimeToSeconds = (time: string): number => {
  const [hourMin, ms] = time.split(',');
  const [hours, minutes, seconds] = hourMin.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms, 10) / 1000;
};

/**
 * Convert seconds to SRT timestamp
 */
export const secondsToSrtTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds % 1) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${padMs(ms)}`;
};

const pad = (n: number): string => n.toString().padStart(2, '0');
const padMs = (n: number): string => n.toString().padStart(3, '0');

/**
 * Split SRT entries into chunks suitable for translation API calls
 * Each chunk will have at most maxEntries entries or maxChars characters
 */
export const chunkSRTEntries = (
  entries: SRTEntry[],
  maxChars: number = 3000
): SRTEntry[][] => {
  const chunks: SRTEntry[][] = [];
  let currentChunk: SRTEntry[] = [];
  let currentChars = 0;

  for (const entry of entries) {
    const entryStr = `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`;
    const entryChars = entryStr.length;

    if (currentChars + entryChars > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChars = 0;
    }

    currentChunk.push(entry);
    currentChars += entryChars;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};

/**
 * Merge SRT chunks back into a single array, renumbering indices
 */
export const mergeSRTChunks = (chunks: SRTEntry[][]): SRTEntry[] => {
  const merged: SRTEntry[] = [];
  let index = 1;

  for (const chunk of chunks) {
    for (const entry of chunk) {
      merged.push({ ...entry, index });
      index++;
    }
  }

  return merged;
};

/**
 * Adjust SRT timestamps by an offset in seconds
 */
export const adjustSRTTimestamps = (entries: SRTEntry[], offsetSeconds: number): SRTEntry[] => {
  return entries.map((entry) => ({
    ...entry,
    startTime: secondsToSrtTime(srtTimeToSeconds(entry.startTime) + offsetSeconds),
    endTime: secondsToSrtTime(srtTimeToSeconds(entry.endTime) + offsetSeconds),
  }));
};
