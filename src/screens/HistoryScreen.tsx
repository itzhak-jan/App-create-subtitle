import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ProcessingJob, RootStackParamList } from '../types';
import { getHistory, removeJobFromHistory } from '../services/storage';
import VideoCard from '../components/VideoCard';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const history = await getHistory();
    setJobs(history);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const handleOpenVideo = useCallback(
    (job: ProcessingJob) => {
      if (job.outputVideoUri) {
        navigation.navigate('VideoPreview', {
          videoUri: job.outputVideoUri,
          jobId: job.id,
        });
      }
    },
    [navigation]
  );

  const handleDelete = useCallback(
    (job: ProcessingJob) => {
      Alert.alert(
        'מחיקת רשומה',
        `האם למחוק את "${job.videoName}" מההיסטוריה?`,
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'מחק',
            style: 'destructive',
            onPress: async () => {
              await removeJobFromHistory(job.id);
              await loadHistory();
            },
          },
        ]
      );
    },
    [loadHistory]
  );

  const renderItem = ({ item }: { item: ProcessingJob }) => (
    <VideoCard
      job={item}
      onPress={() => handleOpenVideo(item)}
      onDelete={() => handleDelete(item)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={80} color="#8892a4" />
      <Text style={styles.emptyTitle}>אין היסטוריה</Text>
      <Text style={styles.emptyText}>
        סרטונים שעיבדת יופיעו כאן
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          jobs.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#e94560"
            colors={['#e94560']}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f3460',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listContentEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8892a4',
    textAlign: 'center',
    lineHeight: 22,
  },
});
