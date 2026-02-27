import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList, SUPPORTED_LANGUAGES, SOURCE_LANGUAGES, ProcessingJob } from '../types';
import { getApiKeys, getSettings, saveSettings } from '../services/storage';
import { getVideoInfo } from '../services/ffmpeg';
import { useProcessing } from '../context/ProcessingContext';
import LanguagePicker from '../components/LanguagePicker';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function generateId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { startProcessing, currentJob } = useProcessing();

  const [selectedVideo, setSelectedVideo] = useState<{
    uri: string;
    name: string;
    size?: number;
    duration?: number;
    width?: number;
    height?: number;
  } | null>(null);

  const [targetLanguage, setTargetLanguage] = useState('he');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickVideoFromGallery = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('הרשאה נדרשת', 'נדרשת הרשאה לגשת לגלריה');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setLoading(true);

        try {
          const videoInfo = await getVideoInfo(asset.uri);
          setSelectedVideo({
            uri: asset.uri,
            name: asset.fileName || `video_${Date.now()}.mp4`,
            size: videoInfo.size || asset.fileSize,
            duration: videoInfo.duration || asset.duration || 0,
            width: videoInfo.width || asset.width,
            height: videoInfo.height || asset.height,
          });
        } catch {
          setSelectedVideo({
            uri: asset.uri,
            name: asset.fileName || `video_${Date.now()}.mp4`,
            size: asset.fileSize,
            duration: asset.duration || 0,
          });
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      Alert.alert('שגיאה', 'לא ניתן לבחור סרטון מהגלריה');
    }
  }, []);

  const pickVideoFromFiles = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setLoading(true);

        try {
          const videoInfo = await getVideoInfo(asset.uri);
          setSelectedVideo({
            uri: asset.uri,
            name: asset.name || `video_${Date.now()}.mp4`,
            size: videoInfo.size || asset.size,
            duration: videoInfo.duration,
            width: videoInfo.width,
            height: videoInfo.height,
          });
        } catch {
          setSelectedVideo({
            uri: asset.uri,
            name: asset.name || `video_${Date.now()}.mp4`,
            size: asset.size,
          });
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      Alert.alert('שגיאה', 'לא ניתן לבחור קובץ');
    }
  }, []);

  const handlePickVideo = useCallback(() => {
    Alert.alert('בחר סרטון', 'מאיפה לבחור את הסרטון?', [
      { text: 'גלריה', onPress: pickVideoFromGallery },
      { text: 'קבצים', onPress: pickVideoFromFiles },
      { text: 'ביטול', style: 'cancel' },
    ]);
  }, [pickVideoFromGallery, pickVideoFromFiles]);

  const handleStartProcessing = useCallback(async () => {
    if (!selectedVideo) {
      Alert.alert('שגיאה', 'אנא בחר סרטון תחילה');
      return;
    }

    if (currentJob && (currentJob.status === 'extracting_audio' ||
        currentJob.status === 'transcribing' ||
        currentJob.status === 'translating' ||
        currentJob.status === 'embedding_subtitles')) {
      Alert.alert('עיבוד בתהליך', 'ישנו עיבוד פעיל. המתן לסיומו.');
      return;
    }

    const apiKeys = await getApiKeys();
    if (!apiKeys) {
      Alert.alert(
        'מפתחות API חסרים',
        'אנא הכנס מפתחות API בהגדרות',
        [
          { text: 'לך להגדרות', onPress: () => navigation.navigate('Settings') },
          { text: 'ביטול', style: 'cancel' },
        ]
      );
      return;
    }

    const job: ProcessingJob = {
      id: generateId(),
      videoUri: selectedVideo.uri,
      videoName: selectedVideo.name,
      sourceLanguage,
      targetLanguage,
      status: 'idle',
      progress: 0,
      progressMessage: 'מתחיל...',
      startedAt: Date.now(),
    };

    // Save settings for next time
    await saveSettings({ targetLanguage, sourceLanguage, autoDetectLanguage: sourceLanguage === 'auto' });

    // Start processing
    startProcessing(job, { openai: apiKeys.openaiApiKey });

    // Navigate to processing screen
    navigation.navigate('Processing', { jobId: job.id });
  }, [selectedVideo, currentJob, targetLanguage, sourceLanguage, navigation, startProcessing]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'לא ידוע';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'לא ידוע';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);
  const sourceLang = SOURCE_LANGUAGES.find((l) => l.code === sourceLanguage);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>SubFlow</Text>
          <Text style={styles.heroSubtitle}>כתוביות אוטומטיות מבוססות AI</Text>
        </View>

        {/* Video Picker */}
        <TouchableOpacity
          style={styles.videoPicker}
          onPress={handlePickVideo}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#e94560" size="large" />
          ) : selectedVideo ? (
            <View style={styles.videoSelected}>
              <View style={styles.videoIconContainer}>
                <Ionicons name="videocam" size={40} color="#e94560" />
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoName} numberOfLines={2}>
                  {selectedVideo.name}
                </Text>
                <Text style={styles.videoMeta}>
                  {formatFileSize(selectedVideo.size)} •{' '}
                  {formatDuration(selectedVideo.duration)}
                  {selectedVideo.width && selectedVideo.height
                    ? ` • ${selectedVideo.width}x${selectedVideo.height}`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeVideoBtn}
                onPress={handlePickVideo}
              >
                <Ionicons name="refresh" size={20} color="#8892a4" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.videoPickerEmpty}>
              <Ionicons name="cloud-upload-outline" size={60} color="#8892a4" />
              <Text style={styles.videoPickerText}>בחר סרטון</Text>
              <Text style={styles.videoPickerSubtext}>לחץ לבחירה מהגלריה או הקבצים</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Language Selection */}
        <View style={styles.languageSection}>
          <Text style={styles.sectionTitle}>הגדרות שפה</Text>

          <View style={styles.languageRow}>
            <View style={styles.languageItem}>
              <Text style={styles.languageLabel}>שפת מקור</Text>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => setShowSourcePicker(true)}
              >
                <Text style={styles.languageButtonText}>
                  {sourceLang?.nativeName || sourceLanguage}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#8892a4" />
              </TouchableOpacity>
            </View>

            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={20} color="#e94560" />
            </View>

            <View style={styles.languageItem}>
              <Text style={styles.languageLabel}>שפת יעד</Text>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => setShowTargetPicker(true)}
              >
                <Text style={styles.languageButtonText}>
                  {targetLang?.nativeName || targetLanguage}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#8892a4" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Process Button */}
        <TouchableOpacity
          style={[
            styles.processButton,
            (!selectedVideo || loading) && styles.processButtonDisabled,
          ]}
          onPress={handleStartProcessing}
          disabled={!selectedVideo || loading}
        >
          <Ionicons name="play-circle" size={24} color="#ffffff" />
          <Text style={styles.processButtonText}>התחל עיבוד</Text>
        </TouchableOpacity>

        {/* Steps Info */}
        <View style={styles.stepsSection}>
          <Text style={styles.stepsTitle}>כיצד זה עובד:</Text>
          {[
            { icon: 'musical-notes', text: 'חילוץ שמע מהסרטון' },
            { icon: 'mic', text: 'תמלול באמצעות Whisper AI' },
            { icon: 'language', text: 'תרגום באמצעות Claude AI' },
            { icon: 'closed-captioning', text: 'הטמעת כתוביות בסרטון' },
          ].map((step, idx) => (
            <View key={idx} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <Ionicons name={step.icon as any} size={18} color="#e94560" />
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Language Pickers */}
      <LanguagePicker
        visible={showSourcePicker}
        languages={SOURCE_LANGUAGES}
        selectedCode={sourceLanguage}
        title="בחר שפת מקור"
        onSelect={(code) => {
          setSourceLanguage(code);
          setShowSourcePicker(false);
        }}
        onClose={() => setShowSourcePicker(false)}
      />

      <LanguagePicker
        visible={showTargetPicker}
        languages={SUPPORTED_LANGUAGES}
        selectedCode={targetLanguage}
        title="בחר שפת יעד"
        onSelect={(code) => {
          setTargetLanguage(code);
          setShowTargetPicker(false);
        }}
        onClose={() => setShowTargetPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f3460',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 3,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#8892a4',
    marginTop: 4,
  },
  videoPicker: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0f3460',
    borderStyle: 'dashed',
    minHeight: 140,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoPickerEmpty: {
    alignItems: 'center',
    padding: 30,
  },
  videoPickerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 12,
  },
  videoPickerSubtext: {
    fontSize: 13,
    color: '#8892a4',
    marginTop: 4,
    textAlign: 'center',
  },
  videoSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    width: '100%',
  },
  videoIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  videoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'right',
  },
  videoMeta: {
    fontSize: 12,
    color: '#8892a4',
    marginTop: 4,
    textAlign: 'right',
  },
  changeVideoBtn: {
    padding: 8,
  },
  languageSection: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'right',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageItem: {
    flex: 1,
  },
  arrowContainer: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  languageLabel: {
    fontSize: 12,
    color: '#8892a4',
    marginBottom: 6,
    textAlign: 'center',
  },
  languageButton: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  processButton: {
    backgroundColor: '#e94560',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  processButtonDisabled: {
    backgroundColor: '#4a4a6a',
    shadowOpacity: 0,
    elevation: 0,
  },
  processButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepsSection: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8892a4',
    marginBottom: 12,
    textAlign: 'right',
  },
  stepItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#b0bec5',
    textAlign: 'right',
  },
});
