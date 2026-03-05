import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import * as MediaLibrary from 'expo-media-library';

import { ProcessingJob, ProcessingStatus } from '../types';
import { extractAudio, burnSubtitles, createTempDir, resetCancellation, cancelProcessing } from '../services/ffmpeg';
import { splitAudioIfNeeded, cleanupChunks } from '../utils/audio-chunker';
import { transcribeAudio, translateSRT } from '../services/gemini';
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
  startProcessing: (job: ProcessingJob, apiKeys: { gemini: string }) => Promise<void>;
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
      saveJobToHistory(updated).catch(() => {});
      return updated;
    });
  }, []);

  const startProcessing = useCallback(
    async (job: ProcessingJob, apiKeys: { gemini: string }): Promise<void> => {
      abortRef.current = false;
      resetCancellation();
      setCurrentJob({ ...job, status: 'extracting_audio', progress: 0 });

      let tempDir = '';

      try {
        await sendProcessingStartNotification(job.videoName);
        await showOngoingProcessingNotification(job.videoName);

        tempDir = await createTempDir(job.id);

        // Step 1: Extract audio
        updateJob({ status: 'extracting_audio', progress: 5, progressMessage: 'מחלץ שמע מהסרטון...' });

        const audioPath = await extractAudio(job.videoUri, tempDir, (p) => {
          updateJob({ progress: 5 + p * 0.15, progressMessage: `מחלץ שמע... ${Math.round(p)}%` });
        });

        if (abortRef.current) throw new Error('CANCELLED');

        // Step 2: Split audio if needed (8 MB per chunk for Gemini inline limit)
        updateJob({ progress: 20, progressMessage: 'מכין קובצי שמע...' });
        const audioChunks = await splitAudioIfNeeded(audioPath, tempDir, (p) => {
          updateJob({ progress: 20 + p * 0.05 });
        });

        if (abortRef.current) throw new Error('CANCELLED');

        // Step 3: Transcribe with Gemini Flash
        updateJob({ status: 'transcribing', progress: 25, progressMessage: 'מתמלל (Gemini Flash)...' });
        await updateOngoingProcessingNotification('תמלול Gemini Flash', 25);

        const srtContent = await transcribeAudio(
          audioChunks,
          apiKeys.gemini,
          job.sourceLanguage,
          (progress, message) => {
            updateJob({ progress: 25 + progress * 0.3, progressMessage: message });
          }
        );

        if (abortRef.current) throw new Error('CANCELLED');
        updateJob({ srtContent, progress: 55, progressMessage: 'תמלול הושלם!' });

        // Step 4: Translate with Gemini Flash
        updateJob({ status: 'translating', progress: 60, progressMessage: 'מתרגם (Gemini Flash)...' });
        await updateOngoingProcessingNotification('תרגום Gemini Flash', 60);

        const translatedSRT = await translateSRT(
          srtContent,
          job.targetLanguage,
          apiKeys.gemini,
          (progress, message) => {
            updateJob({ progress: 60 + progress * 0.2, progressMessage: message });
          }
        );

        if (abortRef.current) throw new Error('CANCELLED');
        updateJob({ translatedSrtContent: translatedSRT, progress: 80, progressMessage: 'תרגום הושלם!' });

        // Step 5: Save SRT file
        const srtPath = await saveSRTFile(translatedSRT, tempDir, 'translated.srt');

        // Step 6: Burn subtitles into video
        updateJob({ status: 'embedding_subtitles', progress: 82, progressMessage: 'מטמיע כתוביות בסרטון...' });
        await updateOngoingProcessingNotification('טמעת כתוביות', 82);

        const isRTL = ['he', 'ar', 'fa'].includes(job.targetLanguage);
        const outputVideoPath = await burnSubtitles(
          job.videoUri,
          srtPath,
          tempDir,
          isRTL,
          (p) => {
            updateJob({ progress: 82 + p * 0.15, progressMessage: `מטמיע כתוביות... ${Math.round(p)}%` });
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
            // Keep the temp file path if saving to gallery fails
          }
        }

        updateJob({
          status: 'completed',
          progress: 100,
          progressMessage: 'הושלם בהצלחה!',
          completedAt: Date.now(),
          outputVideoUri: finalOutputUri,
        });

        await dismissOngoingProcessingNotification();
        await sendProcessingCompleteNotification(job.videoName);
        await cleanupChunks(audioChunks, audioPath);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await dismissOngoingProcessingNotification().catch(() => {});

        if (errorMessage === 'CANCELLED') {
          updateJob({ status: 'cancelled', progress: 0, progressMessage: 'עיבוד בוטל' });
        } else {
          updateJob({
            status: 'error',
            progress: 0,
            progressMessage: `שגיאה: ${errorMessage}`,
            error: errorMessage,
          });
          await sendProcessingErrorNotification(job.videoName, errorMessage).catch(() => {});
        }
      }
    },
    [updateJob]
  );

  const cancelCurrentJob = useCallback(() => {
    abortRef.current = true;
    cancelProcessing();
  }, []);

  const clearCurrentJob = useCallback(() => setCurrentJob(null), []);

  return (
    <ProcessingContext.Provider value={{ currentJob, startProcessing, cancelCurrentJob, clearCurrentJob }}>
      {children}
    </ProcessingContext.Provider>
  );
};
