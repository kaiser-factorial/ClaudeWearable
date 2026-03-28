import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { saveApiKey, loadApiKey, deleteApiKey } from '../storage/apiKey';

const RESPONSES = [
  { code: 'GS', color: '#22c55e', label: 'Green Solid', meaning: 'Yes, confident' },
  { code: 'GP', color: '#22c55e', label: 'Green Pulse', meaning: 'Yes, gentle' },
  { code: 'GC', color: '#22c55e', label: 'Green Chase', meaning: 'Yes, enthusiastic' },
  { code: 'RS', color: '#ef4444', label: 'Red Solid', meaning: 'No, firm' },
  { code: 'RF', color: '#ef4444', label: 'Red Flicker', meaning: 'Warning / urgent' },
  { code: 'YP', color: '#eab308', label: 'Yellow Pulse', meaning: 'Uncertain / maybe' },
  { code: 'BS', color: '#3b82f6', label: 'Blue Solid', meaning: 'Neutral info' },
  { code: 'PS', color: '#a855f7', label: 'Purple Solid', meaning: 'Creative / imaginative' },
  { code: 'PP', color: '#a855f7', label: 'Purple Pulse', meaning: 'Deep / philosophical' },
];

export function SettingsScreen() {
  const [keyInput, setKeyInput] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);

  useEffect(() => {
    loadApiKey().then(k => setHasSavedKey(!!k));
  }, []);

  async function handleSave() {
    const trimmed = keyInput.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      Alert.alert('Invalid key', 'Anthropic API keys start with "sk-ant-".');
      return;
    }
    await saveApiKey(trimmed);
    setHasSavedKey(true);
    setKeyInput('');
    Alert.alert('Saved', 'API key stored securely on this device.');
  }

  async function handleDelete() {
    Alert.alert('Remove API key', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteApiKey();
          setHasSavedKey(false);
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* API Key Section */}
        <Text style={styles.sectionTitle}>API Key</Text>
        <Text style={styles.hint}>
          {hasSavedKey
            ? 'A key is already saved. Paste a new one below to replace it.'
            : 'Enter your Anthropic API key. Stored securely in the device keychain.'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="sk-ant-..."
          placeholderTextColor="#555"
          value={keyInput}
          onChangeText={setKeyInput}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, !keyInput.trim() && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!keyInput.trim()}
        >
          <Text style={styles.buttonText}>Save Key</Text>
        </TouchableOpacity>

        {hasSavedKey && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteText}>Remove saved key</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>

      {/* Response Guide */}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Response Guide</Text>
      <Text style={styles.hint}>
        The AI chooses a color and animation based on the meaning of your question.
      </Text>

      <View style={styles.responseList}>
        {RESPONSES.map((r) => (
          <View key={r.code} style={styles.responseRow}>
            <View style={[styles.colorDot, { backgroundColor: r.color }]} />
            <Text style={styles.responseCode}>{r.code}</Text>
            <View style={styles.responseInfo}>
              <Text style={styles.responseLabel}>{r.label}</Text>
              <Text style={styles.responseMeaning}>{r.meaning}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* About */}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>About</Text>

      <Text style={styles.aboutText}>
        Claude Wearable turns your voice into light. Ask a question, and an AI interprets
        your intent and responds through colored LED animations on an Adafruit Circuit
        Playground Bluefruit.
      </Text>

      <Text style={styles.aboutText}>
        Voice is transcribed on-device using native speech recognition (no audio leaves
        your phone). Sensor data from the wearable gives the AI real-world context.
      </Text>

      <View style={styles.creatorsSection}>
        <Text style={styles.creatorsTitle}>Created by</Text>
        <Text style={styles.creatorName}>Corina Kaiser</Text>
        <Text style={styles.creatorRole}>Design, hardware, & vision</Text>
        <Text style={styles.creatorName}>Claude</Text>
        <Text style={styles.creatorRole}>Code, architecture, & debugging</Text>
      </View>

      <Text style={styles.footerText}>
        Built with Expo, React Native, CircuitPython, and a lot of patience with iOS 26.
      </Text>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  content: {
    padding: 24,
    paddingTop: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  hint: {
    color: '#888',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 28,
  },
  responseList: {
    gap: 10,
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  responseCode: {
    color: '#666',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '600',
    width: 24,
  },
  responseInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseLabel: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  responseMeaning: {
    color: '#777',
    fontSize: 12,
  },
  aboutText: {
    color: '#999',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  creatorsSection: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  creatorsTitle: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  creatorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  creatorRole: {
    color: '#777',
    fontSize: 12,
    marginBottom: 10,
  },
  footerText: {
    color: '#444',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 40,
  },
});
