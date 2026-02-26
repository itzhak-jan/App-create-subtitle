import { FFmpegKit, FFmpegKitConfig, ReturnCode } from 'ffmpeg-kit-react-native';
import {
  getInfoAsync,
  deleteAsync,
  makeDirectoryAsync,
  cacheDirectory,
  type FileInfo,
} from 'expo-file-system/legacy';
import { getAudioDuration } from '../utils/audio-chunker';

export type FFmpegProgressCallback = (progress: number) => void;

let isCancelled = false;

export const cancelProcessing = (): void => {
  isCancelled = true;
  FFmpegKit.cancel();
};

export const resetCancellation = (): void => {
  isCancelled = false;
};

export const isCancelRequested = (): boolean => isCancelled;

/**
 * Extract audio from video file
 * Returns the path to the extracted audio file
 */
export const extractAudio = async (
  videoUri: string,
  outputDir: string,
  onProgress?: FFmpegProgressCallback
): Promise<string> => {
  const outputPath = `${outputDir}audio_extracted.aac`;

  // Get video duration for progress tracking
  let videoDuration = 0;
  try {
    videoDuration = await getAudioDuration(videoUri);
  } catch {
    // If we can't get duration, progress will be indeterminate
  }

  if (videoDuration > 0) {
    FFmpegKitConfig.enableStatisticsCallback((stats) => {
      const time = stats.getTime() / 1000; // ms to seconds
      const progress = Math.min((time / videoDuration) * 100, 99);
      onProgress?.(progress);
    });
  }

  const command = `-i "${videoUri}" -vn -acodec aac -b:a 128k -ar 16000 -ac 1 -y "${outputPath}"`;

  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  FFmpegKitConfig.disableStatistics();

  if (isCancelled) {
    await deleteAsync(outputPath, { idempotent: true });
    throw new Error('CANCELLED');
  }

  if (!ReturnCode.isSuccess(returnCode)) {
    const output = await session.getOutput();
    throw new Error(`Audio extraction failed: ${output || 'Unknown FFmpeg error'}`);
  }

  onProgress?.(100);
  return outputPath;
};

/**
 * Burn subtitles into video
 * Creates a new video with hardcoded subtitles
 */
export const burnSubtitles = async (
  videoUri: string,
  srtPath: string,
  outputDir: string,
  isRTL: boolean = true,
  onProgress?: FFmpegProgressCallback
): Promise<string> => {
  const outputPath = `${outputDir}output_with_subtitles.mp4`;

  let videoDuration = 0;
  try {
    videoDuration = await getAudioDuration(videoUri);
  } catch {
    // Ignore
  }

  if (videoDuration > 0) {
    FFmpegKitConfig.enableStatisticsCallback((stats) => {
      const time = stats.getTime() / 1000;
      const progress = Math.min((time / videoDuration) * 100, 99);
      onProgress?.(progress);
    });
  }

  // Build subtitle filter options for RTL Hebrew support
  // Using fontsdir with bundled NotoSansHebrew font
  const subtitleStyle = [
    'FontName=Noto Sans Hebrew',
    'FontSize=22',
    'PrimaryColour=&H00FFFFFF',
    'OutlineColour=&H00000000',
    'BackColour=&H80000000',
    'Bold=1',
    'Outline=2',
    'Shadow=1',
    'Alignment=2',
    'MarginV=30',
  ].join(',');

  // Escape the SRT path for FFmpeg filter
  const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");

  const subtitleFilter = `subtitles='${escapedSrtPath}':force_style='${subtitleStyle}'`;

  const command = [
    `-i "${videoUri}"`,
    `-vf "${subtitleFilter}"`,
    `-c:v libx264`,
    `-preset fast`,
    `-crf 23`,
    `-c:a aac`,
    `-b:a 128k`,
    `-y "${outputPath}"`,
  ].join(' ');

  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  FFmpegKitConfig.disableStatistics();

  if (isCancelled) {
    await deleteAsync(outputPath, { idempotent: true });
    throw new Error('CANCELLED');
  }

  if (!ReturnCode.isSuccess(returnCode)) {
    const logs = await session.getAllLogs();
    const errorLog = logs
      .filter((l) => l.getLevel() >= 16)
      .map((l) => l.getMessage())
      .join('\n');
    throw new Error(`Subtitle embedding failed: ${errorLog || 'Unknown FFmpeg error'}`);
  }

  onProgress?.(100);
  return outputPath;
};

/**
 * Get video information (duration, resolution, etc.)
 */
export const getVideoInfo = async (videoUri: string): Promise<{
  duration: number;
  width: number;
  height: number;
  size: number;
}> => {
  return new Promise(async (resolve, _reject) => {
    const info = await getInfoAsync(videoUri);
    const size = (info as FileInfo & { size?: number }).size || 0;

    const command = `-i "${videoUri}" -v quiet -print_format json -show_streams -show_format`;
    const session = await FFmpegKit.execute(command);
    const output = await session.getOutput();

    let duration = 0;
    let width = 0;
    let height = 0;

    try {
      // Parse from logs
      const logs = await session.getAllLogs();
      const logText = logs.map((l) => l.getMessage()).join('\n');

      const durationMatch = logText.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
      if (durationMatch) {
        const h = parseInt(durationMatch[1], 10);
        const m = parseInt(durationMatch[2], 10);
        const s = parseInt(durationMatch[3], 10);
        duration = h * 3600 + m * 60 + s;
      }

      const streamMatch = logText.match(/(\d{3,4})x(\d{3,4})/);
      if (streamMatch) {
        width = parseInt(streamMatch[1], 10);
        height = parseInt(streamMatch[2], 10);
      }
    } catch {
      // Use defaults
    }

    resolve({ duration, width, height, size });
  });
};

/**
 * Create a temporary directory for processing
 */
export const createTempDir = async (jobId: string): Promise<string> => {
  const tempDir = `${cacheDirectory}subflow_${jobId}/`;
  await makeDirectoryAsync(tempDir, { intermediates: true });
  return tempDir;
};

/**
 * Clean up temporary processing directory
 */
export const cleanupTempDir = async (tempDir: string): Promise<void> => {
  try {
    await deleteAsync(tempDir, { idempotent: true });
  } catch {
    // Ignore cleanup errors
  }
};
