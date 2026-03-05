import React, { useState, useEffect } from 'react';
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
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getApiKeys().then((keys) => {
      if (keys) setGeminiKey(keys.geminiApiKey);
    }).catch(() => {});
  }, []);

  const handleSaveKeys = async () => {
    if (!geminiKey.trim()) {
      Alert.alert('שגיאה', 'אנא הכנס מפתח Gemini API');
      return;
    }
    setSaving(true);
    try {
      await saveApiKeys({ geminiApiKey: geminiKey.trim() });
      Alert.alert('הצלחה', 'מפתח ה-API נשמר בהצלחה');
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את המפתח');
    } finally {
      setSaving(false);
    }
  };

  const handleClearKeys = () => {
    Alert.alert('מחיקת מפתח', 'האם אתה בטוח שברצונך למחוק את מפתח ה-API?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק', style: 'destructive',
        onPress: async () => {
          await clearApiKeys();
          setGeminiKey('');
          navigation.replace('Setup');
        },
      },
    ]);
  };

  const handleClearHistory = () => {
    Alert.alert('מחיקת היסטוריה', 'האם אתה בטוח שברצונך למחוק את כל ההיסטוריה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק הכל', style: 'destructive',
        onPress: async () => {
          await clearHistory();
          Alert.alert('הושלם', 'ההיסטוריה נמחקה');
        },
      },
    ]);
  };

  const maskKey = (key: string): string => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* API Key Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>מפתח API</Text>

          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Gemini API Key</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}>
                <Text style={styles.helpLink}>קבל מפתח חינמי</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldDesc}>לתמלול ותרגום באמצעות Gemini Flash</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={showKey ? geminiKey : (geminiKey ? maskKey(geminiKey) : '')}
                onChangeText={setGeminiKey}
                placeholder="AIza..."
                placeholderTextColor="#8892a4"
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setShowKey(true)}
                onBlur={() => setShowKey(false)}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowKey(!showKey)}>
                <Ionicons name={showKey ? 'eye-off' : 'eye'} size={20} color="#8892a4" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveKeys}
            disabled={saving}
          >
            <Ionicons name="save" size={18} color="#ffffff" />
            <Text style={styles.saveButtonText}>{saving ? 'שומר...' : 'שמור מפתח'}</Text>
          </TouchableOpacity>

          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
            <Text style={styles.securityText}>המפתח מאוחסן בצורה מוצפנת על המכשיר בלבד</Text>
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
            <Text style={styles.dangerButtonTextFilled}>מחק מפתח API</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>SubFlow</Text>
          <Text style={styles.aboutVersion}>גרסה 1.0.0</Text>
          <Text style={styles.aboutDesc}>אפליקציית כתוביות אוטומטיות מבוססת AI</Text>
          <Text style={styles.aboutTech}>תמלול + תרגום: Gemini 2.0 Flash</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f3460' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { backgroundColor: '#16213e', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 16, textAlign: 'right' },
  fieldContainer: { marginBottom: 16 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#b0bec5' },
  helpLink: { fontSize: 12, color: '#e94560' },
  fieldDesc: { fontSize: 12, color: '#8892a4', marginBottom: 8, textAlign: 'right' },
  inputContainer: {
    flexDirection: 'row', backgroundColor: '#0f3460', borderRadius: 10,
    borderWidth: 1, borderColor: '#1a1a2e', alignItems: 'center',
  },
  input: { flex: 1, padding: 12, color: '#ffffff', fontSize: 13 },
  eyeButton: { padding: 12 },
  saveButton: {
    backgroundColor: '#e94560', borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 4, marginBottom: 12,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  securityNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1b3a1b', borderRadius: 8, padding: 10,
  },
  securityText: { flex: 1, fontSize: 12, color: '#81c784', textAlign: 'right' },
  dangerSection: { borderWidth: 1, borderColor: '#3a1a1a' },
  dangerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#f44336', borderRadius: 10, padding: 12, gap: 8, marginBottom: 10,
  },
  dangerButtonText: { color: '#f44336', fontSize: 14, fontWeight: '600' },
  dangerButtonFilled: { backgroundColor: '#f44336', borderColor: '#f44336', marginBottom: 0 },
  dangerButtonTextFilled: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  aboutSection: { alignItems: 'center', paddingVertical: 20, opacity: 0.7 },
  aboutTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', letterSpacing: 2 },
  aboutVersion: { fontSize: 12, color: '#8892a4', marginTop: 4 },
  aboutDesc: { fontSize: 13, color: '#b0bec5', marginTop: 8 },
  aboutTech: { fontSize: 11, color: '#8892a4', marginTop: 4 },
});
