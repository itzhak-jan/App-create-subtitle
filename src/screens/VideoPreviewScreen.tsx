import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'VideoPreview'>;
  route: RouteProp<RootStackParamList, 'VideoPreview'>;
};

export default function VideoPreviewScreen({ route }: Props) {
  const { videoUri } = route.params;
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handlePlayPause = useCallback(async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  }, [isPlaying]);

  const handleSaveToGallery = useCallback(async () => {
    try {
      setIsSaving(true);
      const { status: permStatus } = await MediaLibrary.requestPermissionsAsync();

      if (permStatus !== 'granted') {
        Alert.alert('הרשאה נדרשת', 'נדרשת הרשאה לשמירה בגלריה');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(videoUri);
      Alert.alert('הצלחה! ✅', 'הסרטון נשמר לגלריה');
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את הסרטון לגלריה');
    } finally {
      setIsSaving(false);
    }
  }, [videoUri]);

  const handleShare = useCallback(async () => {
    try {
      setIsSharing(true);
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(videoUri, {
          mimeType: 'video/mp4',
          dialogTitle: 'שתף סרטון עם כתוביות',
        });
      } else {
        // Fallback for platforms without sharing support
        await Share.share({
          message: 'סרטון עם כתוביות מ-SubFlow',
          url: videoUri,
        });
      }
    } catch (error) {
      if ((error as Error).message !== 'User did not share') {
        Alert.alert('שגיאה', 'לא ניתן לשתף את הסרטון');
      }
    } finally {
      setIsSharing(false);
    }
  }, [videoUri]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const playbackStatus = status as (AVPlaybackStatus & { positionMillis?: number; durationMillis?: number }) | null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          onPlaybackStatusUpdate={(s) => {
            setStatus(s);
            if (s.isLoaded) {
              setIsPlaying(s.isPlaying);
            }
          }}
          isLooping={false}
        />

        {/* Play/Pause Overlay */}
        <TouchableOpacity style={styles.playOverlay} onPress={handlePlayPause}>
          {!isPlaying && (
            <View style={styles.playButton}>
              <Ionicons name="play" size={40} color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Time Display */}
        {playbackStatus?.isLoaded && (
          <Text style={styles.timeText}>
            {formatTime(playbackStatus.positionMillis || 0)} /{' '}
            {formatTime(playbackStatus.durationMillis || 0)}
          </Text>
        )}

        {/* Transport Controls */}
        <View style={styles.transportControls}>
          <TouchableOpacity
            style={styles.transportButton}
            onPress={async () => {
              await videoRef.current?.setPositionAsync(0);
              await videoRef.current?.pauseAsync();
            }}
          >
            <Ionicons name="play-skip-back" size={24} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playPauseButton} onPress={handlePlayPause}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#ffffff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.transportButton}
            onPress={async () => {
              if (playbackStatus?.isLoaded && playbackStatus.durationMillis) {
                await videoRef.current?.setPositionAsync(playbackStatus.durationMillis);
              }
            }}
          >
            <Ionicons name="play-skip-forward" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, isSaving && styles.actionButtonDisabled]}
            onPress={handleSaveToGallery}
            disabled={isSaving}
          >
            <Ionicons name="download" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>
              {isSaving ? 'שומר...' : 'שמור לגלריה'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton, isSharing && styles.actionButtonDisabled]}
            onPress={handleShare}
            disabled={isSharing}
          >
            <Ionicons name="share-social" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>
              {isSharing ? 'משתף...' : 'שתף'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  video: {
    flex: 1,
    width: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    paddingBottom: 24,
  },
  timeText: {
    color: '#8892a4',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  transportControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    marginBottom: 20,
  },
  transportButton: {
    padding: 8,
  },
  playPauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#e94560',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
