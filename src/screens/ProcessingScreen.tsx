import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList, ProcessingStatus } from '../types';
import { useProcessing } from '../context/ProcessingContext';
import ProgressBar from '../components/ProgressBar';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Processing'>;
  route: RouteProp<RootStackParamList, 'Processing'>;
};

const STATUS_ICONS: Record<ProcessingStatus, string> = {
  idle: 'hourglass-outline',
  extracting_audio: 'musical-notes-outline',
  transcribing: 'mic-outline',
  translating: 'language-outline',
  embedding_subtitles: 'closed-captioning-outline',
  completed: 'checkmark-circle',
  error: 'alert-circle',
  cancelled: 'close-circle',
};

const STATUS_COLORS: Record<ProcessingStatus, string> = {
  idle: '#8892a4',
  extracting_audio: '#2196F3',
  transcribing: '#9C27B0',
  translating: '#FF9800',
  embedding_subtitles: '#4CAF50',
  completed: '#4CAF50',
  error: '#f44336',
  cancelled: '#FF9800',
};

const STEP_LABELS: Record<string, { icon: string; label: string; range: [number, number] }> = {
  extracting_audio: { icon: 'musical-notes', label: 'חילוץ שמע', range: [5, 25] },
  transcribing: { icon: 'mic', label: 'תמלול', range: [25, 55] },
  translating: { icon: 'language', label: 'תרגום', range: [55, 80] },
  embedding_subtitles: { icon: 'closed-captioning', label: 'הטמעת כתוביות', range: [80, 100] },
};

export default function ProcessingScreen({ navigation }: Props) {
  const { currentJob, cancelCurrentJob, clearCurrentJob } = useProcessing();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'error') return;

    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );

    // Rotate animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, [currentJob?.status]);

  const handleCancel = () => {
    Alert.alert(
      'ביטול עיבוד',
      'האם אתה בטוח שברצונך לבטל את העיבוד?',
      [
        { text: 'המשך', style: 'cancel' },
        {
          text: 'בטל עיבוד',
          style: 'destructive',
          onPress: () => {
            cancelCurrentJob();
          },
        },
      ]
    );
  };

  const handleDone = () => {
    if (currentJob?.status === 'completed' && currentJob.outputVideoUri) {
      navigation.replace('VideoPreview', {
        videoUri: currentJob.outputVideoUri,
        jobId: currentJob.id,
      });
    } else {
      clearCurrentJob();
      navigation.goBack();
    }
  };

  const handleRetry = () => {
    clearCurrentJob();
    navigation.goBack();
  };

  if (!currentJob) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>לא נמצא עיבוד פעיל</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>חזור</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = ['extracting_audio', 'transcribing', 'translating', 'embedding_subtitles'].includes(
    currentJob.status
  );
  const isCompleted = currentJob.status === 'completed';
  const isError = currentJob.status === 'error';
  const isCancelled = currentJob.status === 'cancelled';

  const statusColor = STATUS_COLORS[currentJob.status];
  const statusIcon = STATUS_ICONS[currentJob.status];

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isCompleted ? '✅ הושלם!' : isError ? '❌ שגיאה' : isCancelled ? '⚠️ בוטל' : '🔄 בעיבוד...'}
          </Text>
          <Text style={styles.videoName} numberOfLines={1}>
            {currentJob.videoName}
          </Text>
        </View>

        {/* Main Status Icon */}
        <View style={styles.iconContainer}>
          {isActive ? (
            <Animated.View
              style={[
                styles.iconCircle,
                { borderColor: statusColor },
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name={statusIcon as any} size={60} color={statusColor} />
              </Animated.View>
            </Animated.View>
          ) : (
            <View style={[styles.iconCircle, { borderColor: statusColor }]}>
              <Ionicons name={statusIcon as any} size={60} color={statusColor} />
            </View>
          )}
        </View>

        {/* Progress */}
        {(isActive || isCompleted) && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressMessage}>{currentJob.progressMessage}</Text>
              <Text style={styles.progressPercent}>
                {Math.round(currentJob.progress)}%
              </Text>
            </View>
            <ProgressBar progress={currentJob.progress} color={statusColor} />
          </View>
        )}

        {/* Error Message */}
        {isError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#f44336" />
            <Text style={styles.errorMessage}>{currentJob.error || currentJob.progressMessage}</Text>
          </View>
        )}

        {/* Steps */}
        <View style={styles.stepsSection}>
          {Object.entries(STEP_LABELS).map(([key, step]) => {
            const stepStatuses = ['extracting_audio', 'transcribing', 'translating', 'embedding_subtitles'];
            const currentIdx = stepStatuses.indexOf(currentJob.status);
            const stepIdx = stepStatuses.indexOf(key);

            const isDone = stepIdx < currentIdx || isCompleted;
            const isCurrentStep = stepIdx === currentIdx && isActive;
            const isPending = stepIdx > currentIdx && !isCompleted;

            const stepColor = isDone ? '#4CAF50' : isCurrentStep ? statusColor : '#8892a4';

            return (
              <View key={key} style={styles.stepItem}>
                <View style={[styles.stepIconContainer, { backgroundColor: isDone ? '#1b3a1b' : isCurrentStep ? '#1a1a2e' : '#16213e' }]}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={18} color="#4CAF50" />
                  ) : (
                    <Ionicons name={step.icon as any} size={18} color={stepColor} />
                  )}
                </View>
                <Text style={[styles.stepLabel, { color: stepColor, fontWeight: isCurrentStep ? 'bold' : 'normal' }]}>
                  {step.label}
                </Text>
                {isDone && <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />}
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isActive && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Ionicons name="close" size={20} color="#f44336" />
              <Text style={styles.cancelButtonText}>בטל עיבוד</Text>
            </TouchableOpacity>
          )}

          {isCompleted && (
            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <Ionicons name="play-circle" size={24} color="#ffffff" />
              <Text style={styles.doneButtonText}>צפה בסרטון</Text>
            </TouchableOpacity>
          )}

          {(isError || isCancelled) && (
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Ionicons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.retryButtonText}>נסה שנית</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Elapsed Time */}
        {currentJob.startedAt && (
          <Text style={styles.elapsedTime}>
            {isCompleted && currentJob.completedAt
              ? `זמן עיבוד: ${Math.round((currentJob.completedAt - currentJob.startedAt) / 1000)} שניות`
              : 'מתבצע עיבוד...'}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  videoName: {
    fontSize: 14,
    color: '#8892a4',
    maxWidth: '90%',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    width: '100%',
    marginBottom: 32,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressMessage: {
    fontSize: 14,
    color: '#b0bec5',
    flex: 1,
    textAlign: 'right',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2a0a0a',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    gap: 10,
  },
  errorMessage: {
    flex: 1,
    fontSize: 14,
    color: '#ef9a9a',
    lineHeight: 20,
    textAlign: 'right',
  },
  stepsSection: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  stepItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  stepIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f44336',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cancelButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  elapsedTime: {
    fontSize: 12,
    color: '#8892a4',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#8892a4',
  },
});
