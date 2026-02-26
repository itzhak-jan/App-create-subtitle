import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ProcessingJob, SUPPORTED_LANGUAGES } from '../types';

type Props = {
  job: ProcessingJob;
  onPress: () => void;
  onDelete: () => void;
};

const STATUS_COLORS = {
  completed: '#4CAF50',
  error: '#f44336',
  cancelled: '#FF9800',
  processing: '#2196F3',
};

const STATUS_LABELS = {
  idle: 'ממתין',
  extracting_audio: 'מחלץ שמע',
  transcribing: 'מתמלל',
  translating: 'מתרגם',
  embedding_subtitles: 'מטמיע כתוביות',
  completed: 'הושלם',
  error: 'שגיאה',
  cancelled: 'בוטל',
};

export default function VideoCard({ job, onPress, onDelete }: Props) {
  const isCompleted = job.status === 'completed';
  const isError = job.status === 'error';
  const isCancelled = job.status === 'cancelled';

  const statusColor = isCompleted
    ? STATUS_COLORS.completed
    : isError
    ? STATUS_COLORS.error
    : isCancelled
    ? STATUS_COLORS.cancelled
    : STATUS_COLORS.processing;

  const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === job.targetLanguage);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={isCompleted ? onPress : undefined}
      activeOpacity={isCompleted ? 0.7 : 1}
    >
      {/* Left Icon */}
      <View style={[styles.iconContainer, { backgroundColor: statusColor + '22' }]}>
        {isCompleted ? (
          <Ionicons name="checkmark-circle" size={32} color={statusColor} />
        ) : isError ? (
          <Ionicons name="alert-circle" size={32} color={statusColor} />
        ) : isCancelled ? (
          <Ionicons name="close-circle" size={32} color={statusColor} />
        ) : (
          <Ionicons name="videocam" size={32} color={statusColor} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.videoName} numberOfLines={1}>
          {job.videoName}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[job.status]}
            </Text>
          </View>
          {targetLang && (
            <Text style={styles.langText}>{targetLang.nativeName}</Text>
          )}
        </View>

        <Text style={styles.dateText}>{formatDate(job.startedAt)}</Text>

        {job.error && (
          <Text style={styles.errorText} numberOfLines={1}>
            {job.error}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isCompleted && (
          <TouchableOpacity style={styles.playButton} onPress={onPress}>
            <Ionicons name="play-circle" size={28} color="#e94560" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color="#8892a4" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  videoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  langText: {
    fontSize: 12,
    color: '#8892a4',
  },
  dateText: {
    fontSize: 11,
    color: '#8892a4',
    textAlign: 'right',
  },
  errorText: {
    fontSize: 11,
    color: '#ef9a9a',
    textAlign: 'right',
  },
  actions: {
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
});
