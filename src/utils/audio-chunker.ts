import { getInfoAsync, deleteAsync, type FileInfo } from 'expo-file-system/legacy';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';

const MAX_CHUNK_SIZE_MB = 24; // Keep under 25MB limit
const MAX_CHUNK_SIZE_BYTES = MAX_CHUNK_SIZE_MB * 1024 * 1024;
const OVERLAP_SECONDS = 2; // Overlap to avoid cutting mid-sentence

export type AudioChunk = {
  uri: string;
  startTime: number; // seconds
  duration: number;  // seconds
  index: number;
};

/**
 * Get audio file size in bytes
 */
const getFileSize = async (uri: string): Promise<number> => {
  const info = await getInfoAsync(uri);
  if (!info.exists) throw new Error(`File not found: ${uri}`);
  return (info as FileInfo & { size: number }).size || 0;
};

/**
 * Get audio duration in seconds using FFprobe via FFmpeg
 */
export const getAudioDuration = async (audioUri: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const command = `-i "${audioUri}" -show_entries format=duration -v quiet -of csv="p=0"`;

    FFmpegKit.execute(command).then((session) => {
      session.getOutput().then((output) => {
        const duration = parseFloat(output?.trim() || '0');
        if (isNaN(duration) || duration <= 0) {
          // Try alternative method
          session.getAllLogs().then((logs) => {
            const logText = logs.map((l) => l.getMessage()).join('\n');
            const match = logText.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
            if (match) {
              const h = parseInt(match[1], 10);
              const m = parseInt(match[2], 10);
              const s = parseInt(match[3], 10);
              const cs = parseInt(match[4], 10);
              resolve(h * 3600 + m * 60 + s + cs / 100);
            } else {
              reject(new Error('Could not determine audio duration'));
            }
          });
        } else {
          resolve(duration);
        }
      });
    });
  });
};

/**
 * Split audio file into chunks if it exceeds the size limit
 * Returns array of AudioChunk objects with file URIs
 */
export const splitAudioIfNeeded = async (
  audioUri: string,
  tempDir: string,
  onProgress?: (progress: number) => void
): Promise<AudioChunk[]> => {
  const fileSize = await getFileSize(audioUri);

  if (fileSize <= MAX_CHUNK_SIZE_BYTES) {
    // No splitting needed
    const duration = await getAudioDuration(audioUri);
    return [
      {
        uri: audioUri,
        startTime: 0,
        duration,
        index: 0,
      },
    ];
  }

  // Calculate chunk duration based on file size ratio
  const duration = await getAudioDuration(audioUri);
  const numChunks = Math.ceil(fileSize / MAX_CHUNK_SIZE_BYTES) + 1;
  const chunkDuration = Math.floor(duration / numChunks);

  const chunks: AudioChunk[] = [];
  let currentStart = 0;
  let chunkIndex = 0;

  while (currentStart < duration) {
    const chunkEnd = Math.min(currentStart + chunkDuration + OVERLAP_SECONDS, duration);
    const actualDuration = chunkEnd - currentStart;

    const chunkPath = `${tempDir}chunk_${chunkIndex}.aac`;

    const command = `-i "${audioUri}" -ss ${currentStart} -t ${actualDuration} -acodec aac -b:a 128k -y "${chunkPath}"`;

    await new Promise<void>((resolve, reject) => {
      FFmpegKit.execute(command).then(async (session) => {
        const returnCode = await session.getReturnCode();
        if (ReturnCode.isSuccess(returnCode)) {
          resolve();
        } else {
          const output = await session.getOutput();
          reject(new Error(`FFmpeg chunk error: ${output}`));
        }
      });
    });

    chunks.push({
      uri: chunkPath,
      startTime: currentStart,
      duration: actualDuration,
      index: chunkIndex,
    });

    onProgress?.((chunkIndex / numChunks) * 100);

    // Move to next chunk start, stepping back by overlap to avoid cut sentences
    currentStart = chunkEnd - OVERLAP_SECONDS;
    chunkIndex++;

    if (currentStart >= duration) break;
  }

  return chunks;
};

/**
 * Clean up temporary audio chunk files
 */
export const cleanupChunks = async (chunks: AudioChunk[], originalUri: string): Promise<void> => {
  for (const chunk of chunks) {
    if (chunk.uri !== originalUri) {
      try {
        await deleteAsync(chunk.uri, { idempotent: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
};
