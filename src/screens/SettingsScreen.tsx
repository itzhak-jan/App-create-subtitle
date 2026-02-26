import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { getApiKeys, saveApiKeys, clearApiKeys, clearHistory } from '../services/storage';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [showOpenai, setShowOpenai] = useState(false);
  const [showClaude, setShowClaude] = useState(false);
  const [saving, setSaving] = useState(false);
  const [_keysLoaded, setKeysLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const keys = await getApiKeys();
      if (keys) {
        setOpenaiKey(keys.openaiApiKey);
        setClaudeKey(keys.claudeApiKey);
      }
      setKeysLoaded(true);
    } catch {
      setKeysLoaded(true);
    }
  };

  const handleSaveKeys = async () => {
    if (!openaiKey.trim() || !claudeKey.trim()) {
      Alert.alert('שגיאה', 'אנא מלא את שני מפתחות ה-API');
      return;
    }

    setSaving(true);
    try {
      await saveApiKeys({
        openaiApiKey: openaiKey.trim(),
        claudeApiKey: claudeKey.trim(),
      });
      Alert.alert('הצלחה', 'מפתחות ה-API נשמרו בהצלחה');
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את המפתחות');
    } finally {
      setSaving(false);
    }
  };

  const handleClearKeys = () => {
    Alert.alert(
      'מחיקת מפתחות',
      'האם אתה בטוח שברצונך למחוק את מפתחות ה-API?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            await clearApiKeys();
            setOpenaiKey('');
            setClaudeKey('');
            Alert.alert('הושלם', 'מפתחות ה-API נמחקו');
            navigation.replace('Setup');
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'מחיקת היסטוריה',
      'האם אתה בטוח שברצונך למחוק את כל ההיסטוריה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק הכל',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            Alert.alert('הושלם', 'ההיסטוריה נמחקה');
          },
        },
      ]
    );
  };

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* API Keys Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>מפתחות API</Text>

          {/* OpenAI */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>OpenAI API Key</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}>
                <Text style={styles.helpLink}>קבל מפתח</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldDesc}>לתמלול באמצעות Whisper AI</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={showOpenai ? openaiKey : (openaiKey ? maskApiKey(openaiKey) : '')}
                onChangeText={setOpenaiKey}
                placeholder="sk-..."
                placeholderTextColor="#8892a4"
                secureTextEntry={!showOpenai}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setShowOpenai(true)}
                onBlur={() => setShowOpenai(false)}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowOpenai(!showOpenai)}
              >
                <Ionicons name={showOpenai ? 'eye-off' : 'eye'} size={20} color="#8892a4" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Claude */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Claude API Key</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://console.anthropic.com/api-keys')}>
                <Text style={styles.helpLink}>קבל מפתח</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldDesc}>לתרגום כתוביות באמצעות Claude AI</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={showClaude ? claudeKey : (claudeKey ? maskApiKey(claudeKey) : '')}
                onChangeText={setClaudeKey}
                placeholder="sk-ant-..."
                placeholderTextColor="#8892a4"
                secureTextEntry={!showClaude}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setShowClaude(true)}
                onBlur={() => setShowClaude(false)}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowClaude(!showClaude)}
              >
                <Ionicons name={showClaude ? 'eye-off' : 'eye'} size={20} color="#8892a4" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveKeys}
            disabled={saving}
          >
            <Ionicons name="save" size={18} color="#ffffff" />
            <Text style={styles.saveButtonText}>{saving ? 'שומר...' : 'שמור מפתחות'}</Text>
          </TouchableOpacity>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
            <Text style={styles.securityText}>
              מפתחות מאוחסנים בצורה מוצפנת על המכשיר בלבד
            </Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { color: '#f44336' }]}>אזור מסוכן</Text>

          <TouchableOpacity style={styles.dangerButton} onPress={handleClearHistory}>
            <Ionicons name="trash" size={18} color="#f44336" />
            <Text style={styles.dangerButtonText}>מחק היסטוריה</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.dangerButton, styles.dangerButtonFilled]} onPress={handleClearKeys}>
            <Ionicons name="key" size={18} color="#ffffff" />
            <Text style={styles.dangerButtonTextFilled}>מחק מפתחות API</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>SubFlow</Text>
          <Text style={styles.aboutVersion}>גרסה 1.0.0</Text>
          <Text style={styles.aboutDesc}>
            אפליקציית כתוביות אוטומטיות מבוססת AI
          </Text>
          <Text style={styles.aboutTech}>
            מופעל על ידי OpenAI Whisper ו-Claude AI
          </Text>
        </View>
      </ScrollView>
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
  section: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'right',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b0bec5',
  },
  helpLink: {
    fontSize: 12,
    color: '#e94560',
  },
  fieldDesc: {
    fontSize: 12,
    color: '#8892a4',
    marginBottom: 8,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f3460',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a1a2e',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
  },
  eyeButton: {
    padding: 12,
  },
  saveButton: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1b3a1b',
    borderRadius: 8,
    padding: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#81c784',
    textAlign: 'right',
  },
  dangerSection: {
    borderWidth: 1,
    borderColor: '#3a1a1a',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  dangerButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButtonFilled: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
    marginBottom: 0,
  },
  dangerButtonTextFilled: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  aboutSection: {
    alignItems: 'center',
    paddingVertical: 20,
    opacity: 0.7,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  aboutVersion: {
    fontSize: 12,
    color: '#8892a4',
    marginTop: 4,
  },
  aboutDesc: {
    fontSize: 13,
    color: '#b0bec5',
    marginTop: 8,
  },
  aboutTech: {
    fontSize: 11,
    color: '#8892a4',
    marginTop: 4,
  },
});
