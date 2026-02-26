import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

import { ProcessingJob, ProcessingStatus } from '../types';
import { extractAudio, burnSubtitles, createTempDir, cleanupTempDir, resetCancellation, cancelProcessing } from '../services/ffmpeg';
import { splitAudioIfNeeded, cleanupChunks } from '../utils/audio-chunker';
import { transcribeAudio } from '../services/whisper';
import { translateSRT } from '../services/claude';
import { saveSRTFile } from '../services/subtitles';
import { saveJobToHistory } from '../services/storage';
import {
  sendProcessingStartNotification,
  sendProcessingCompleteNotification,
  sendProcessingErrorNotification,
  showOngoingProcessingNotification,
  updateOngoingProcessingNotification,
  dismissOngoingProcessingNotification,
} from '../services/notifications';

type ProcessingContextType = {
  currentJob: ProcessingJob | null;
  startProcessing: (job: ProcessingJob, apiKeys: { openai: string; claude: string }) => Promise<void>;
  cancelCurrentJob: () => void;
  clearCurrentJob: () => void;
};

const ProcessingContext = createContext<ProcessingContextType | null>(null);

export const useProcessing = (): ProcessingContextType => {
  const ctx = useContext(ProcessingContext);
  if (!ctx) throw new Error('useProcessing must be used within ProcessingProvider');
  return ctx;
};

export const ProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const abortRef = useRef(false);

  const updateJob = useCallback((updates: Partial<ProcessingJob>) => {
    setCurrentJob((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      // Also save to history for persistence
      saveJobToHistory(updated).catch(() => {});
      return updated;
    });
  }, []);

  const startProcessing = useCallback(
    async (
      job: ProcessingJob,
      apiKeys: { openai: string; claude: string }
    ): Promise<void> => {
      abortRef.current = false;
      resetCancellation();
      setCurrentJob({ ...job, status: 'extracting_audio', progress: 0 });

      let tempDir = '';

      try {
        await sendProcessingStartNotification(job.videoName);
        // הצג notification דביק בסטטוס בר — מונע מ-Android להרוג את התהליך ברקע
        await showOngoingProcessingNotification(job.videoName);

        // Create temp directory
        tempDir = await createTempDir(job.id);

        // Step 1: Extract audio
        updateJob({
          status: 'extracting_audio',
          progress: 5,
          progressMessage: 'מחלץ שמע מהסרטון...',
        });

        const audioPath = await extractAudio(
          job.videoUri,
          tempDir,
          (progress) => {
            updateJob({ progress: 5 + progress * 0.15, progressMessage: `מחלץ שמע... ${Math.round(progress)}%` });
          }
        );

        if (abortRef.current) throw new Error('CANCELLED');

        // Step 2: Split audio if needed
        updateJob({ progress: 20, progressMessage: 'מכין קובצי שמע...' });

        const audioChunks = await splitAudioIfNeeded(audioPath, tempDir, (p) => {
          updateJob({ progress: 20 + p * 0.05 });
        });

        if (abortRef.current) throw new Error('CANCELLED');

        // Step 3: Transcribe
        updateJob({
          status: 'transcribing',
          progress: 25,
          progressMessage: 'שולח לתמלול (Whisper AI)...',
        });
        await updateOngoingProcessingNotification('תמלול Whisper', 25);

        const srtContent = await transcribeAudio(
          audioChunks,
          apiKeys.openai,
          job.sourceLanguage,
          (progress, message) => {
            updateJob({
              progress: 25 + progress * 0.3,
              progressMessage: message,
            });
          }
        );

        if (abortRef.current) throw new Error('CANCELLED');

        updateJob({ srtContent, progress: 55, progressMessage: 'תמלול הושלם!' });

        // Step 4: Translate
        updateJob({
          status: 'translating',
          progress: 60,
          progressMessage: 'שולח לתרגום (Claude AI)...',
        });
        await updateOngoingProcessingNotification('תרגום Claude', 60);

        const translatedSRT = await translateSRT(
          srtContent,
          job.targetLanguage,
          apiKeys.claude,
          (progress, message) => {
            updateJob({
              progress: 60 + progress * 0.2,
              progressMessage: message,
            });
          }
        );

        if (abortRef.current) throw new Error('CANCELLED');

        updateJob({ translatedSrtContent: translatedSRT, progress: 80, progressMessage: 'תרגום הושלם!' });

        // Step 5: Save SRT file
        const srtPath = await saveSRTFile(translatedSRT, tempDir, 'translated.srt');

        // Step 6: Burn subtitles
        updateJob({
          status: 'embedding_subtitles',
          progress: 82,
          progressMessage: 'מטמיע כתוביות בסרטון...',
        });
        await updateOngoingProcessingNotification('טמעת כתוביות', 82);

        const isRTL = ['he', 'ar'].includes(job.targetLanguage);
        const outputVideoPath = await burnSubtitles(
          job.videoUri,
          srtPath,
          tempDir,
          isRTL,
          (progress) => {
            updateJob({
              progress: 82 + progress * 0.15,
              progressMessage: `מטמיע כתוביות... ${Math.round(progress)}%`,
            });
          }
        );

        if (abortRef.current) throw new Error('CANCELLED');

        // Step 7: Save to media library
        updateJob({ progress: 97, progressMessage: 'שומר סרטון...' });

        const { status } = await MediaLibrary.requestPermissionsAsync();
        let finalOutputUri = outputVideoPath;

        if (status === 'granted') {
          try {
            const asset = await MediaLibrary.createAssetAsync(outputVideoPath);
            finalOutputUri = asset.uri;
          } catch {
            // If saving to gallery fails, use the temp file
          }
        }

        const completedJob: Partial<ProcessingJob> = {
          status: 'completed',
          progress: 100,
          progressMessage: 'הושלם בהצלחה! 🎉',
          completedAt: Date.now(),
          outputVideoUri: finalOutputUri,
        };

        updateJob(completedJob);
        await dismissOngoingProcessingNotification();
        await sendProcessingCompleteNotification(job.videoName);

        // Cleanup chunks (not the original audio)
        await cleanupChunks(audioChunks, audioPath);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // סיים את ה-ongoing notification בכל מקרה (סיום, ביטול, שגיאה)
        await dismissOngoingProcessingNotification().catch(() => {});

        if (errorMessage === 'CANCELLED') {
          updateJob({
            status: 'cancelled',
            progress: 0,
            progressMessage: 'עיבוד בוטל',
          });
        } else {
          updateJob({
            status: 'error',
            progress: 0,
            progressMessage: `שגיאה: ${errorMessage}`,
            error: errorMessage,
          });
          await sendProcessingErrorNotification(job.videoName, errorMessage).catch(() => {});
        }
      } finally {
        // Note: We keep the temp dir if output video is in it
        // Cleanup happens when user dismisses the job
      }
    },
    [updateJob]
  );

  const cancelCurrentJob = useCallback(() => {
    abortRef.current = true;
    cancelProcessing();
  }, []);

  const clearCurrentJob = useCallback(() => {
    setCurrentJob(null);
  }, []);

  return (
    <ProcessingContext.Provider
      value={{ currentJob, startProcessing, cancelCurrentJob, clearCurrentJob }}
    >
      {children}
    </ProcessingContext.Provider>
  );
};
