import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../types';
import { saveApiKeys } from '../services/storage';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Setup'>;
};

export default function SetupScreen({ navigation }: Props) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [showOpenai, setShowOpenai] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!openaiKey.trim()) {
      Alert.alert('שגיאה', 'אנא הכנס מפתח OpenAI API');
      return;
    }

    if (!openaiKey.startsWith('sk-')) {
      Alert.alert('שגיאה', 'מפתח OpenAI API חייב להתחיל ב-sk-');
      return;
    }

    setLoading(true);
    try {
      await saveApiKeys({
        openaiApiKey: openaiKey.trim(),
      });

      navigation.replace('Home');
    } catch (error) {
      Alert.alert('שגיאה', 'אירעה שגיאה בשמירת מפתח ה-API. נסה שנית.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo / Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="film" size={60} color="#e94560" />
            </View>
            <Text style={styles.title}>SubFlow</Text>
            <Text style={styles.subtitle}>אפליקציית כתוביות מתקדמת</Text>
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>ברוך הבא! 👋</Text>
            <Text style={styles.welcomeText}>
              SubFlow משתמשת ב-AI לתמלול ותרגום כתוביות אוטומטי.
              {'\n\n'}
              התמלול מתבצע דרך Whisper AI (OpenAI).{'\n'}
              התרגום מתבצע on-device דרך Gemini Nano — בחינם, ללא אינטרנט.
            </Text>
          </View>

          {/* Gemini Nano badge */}
          <View style={styles.geminiNotice}>
            <Ionicons name="phone-portrait" size={16} color="#4fc3f7" />
            <Text style={styles.geminiText}>
              תרגום Gemini Nano פועל ישירות על המכשיר — ללא עלויות API
            </Text>
          </View>

          {/* OpenAI Key */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>מפתח OpenAI API</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}
              >
                <Text style={styles.helpLink}>קבל מפתח →</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionDesc}>
              משמש לתמלול השמע באמצעות Whisper AI
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={openaiKey}
                onChangeText={setOpenaiKey}
                placeholder="sk-..."
                placeholderTextColor="#8892a4"
                secureTextEntry={!showOpenai}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowOpenai(!showOpenai)}
              >
                <Ionicons
                  name={showOpenai ? 'eye-off' : 'eye'}
                  size={20}
                  color="#8892a4"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Ionicons name="lock-closed" size={16} color="#4CAF50" />
            <Text style={styles.securityText}>
              המפתח מאוחסן בצורה מאובטחת על המכשיר בלבד ולא נשלח לשרתינו
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'שומר...' : 'התחל להשתמש באפליקציה →'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e94560',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#8892a4',
    marginTop: 4,
  },
  welcomeSection: {
    marginBottom: 16,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'right',
  },
  welcomeText: {
    fontSize: 14,
    color: '#b0bec5',
    lineHeight: 22,
    textAlign: 'right',
  },
  geminiNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d2b3e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1565c0',
  },
  geminiText: {
    flex: 1,
    fontSize: 12,
    color: '#4fc3f7',
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'right',
  },
  helpLink: {
    fontSize: 13,
    color: '#e94560',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#8892a4',
    marginBottom: 8,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0f3460',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: 14,
    color: '#ffffff',
    fontSize: 14,
  },
  eyeButton: {
    padding: 14,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b3a1b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#81c784',
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
