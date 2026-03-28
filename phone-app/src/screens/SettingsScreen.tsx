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
} from 'react-native';
import { saveApiKey, loadApiKey, deleteApiKey } from '../storage/apiKey';

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.label}>Anthropic API Key</Text>
      <Text style={styles.hint}>
        {hasSavedKey
          ? 'A key is already saved. Paste a new one below to replace it.'
          : 'Enter your Anthropic API key. It will be stored securely in the device keychain.'}
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

      <Text style={styles.note}>
        The key is stored in {Platform.OS === 'ios' ? 'iOS Keychain' : 'Android Keystore'} and
        never leaves this device in plain text.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    padding: 24,
    paddingTop: 40,
  },
  label: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    color: '#888',
    fontSize: 13,
    marginBottom: 20,
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
  note: {
    color: '#444',
    fontSize: 12,
    marginTop: 24,
    lineHeight: 18,
  },
});
