import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { bleManager, BLEStatus } from '../ble/BLEManager';
import { LEDCommand, COMMAND_DESCRIPTIONS } from '../ble/commands';
import { VoiceListener } from '../audio/VoiceListener';
import { getCommandFromClaude } from '../api/claude';
import { loadApiKey } from '../storage/apiKey';

type ProcessingState = 'idle' | 'listening' | 'thinking' | 'sending';

const STATUS_COLOR: Record<BLEStatus, string> = {
  idle: '#555',
  scanning: '#f59e0b',
  connecting: '#f59e0b',
  connected: '#22c55e',
  error: '#ef4444',
};

const COMMAND_COLOR: Record<string, string> = {
  G: '#22c55e',
  R: '#ef4444',
  Y: '#eab308',
  B: '#3b82f6',
};

export function HomeScreen() {
  const [bleStatus, setBleStatus] = useState<BLEStatus>('idle');
  const [bleMessage, setBleMessage] = useState('Not connected');
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [partialText, setPartialText] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<LEDCommand | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const voice = useRef(new VoiceListener());

  useEffect(() => {
    const unsubscribe = bleManager.onStatusChange((status, msg) => {
      setBleStatus(status);
      setBleMessage(msg ?? statusLabel(status));
    });

    const vl = voice.current;
    vl.onPartial = setPartialText;
    vl.onResult = handleTranscript;
    vl.onError = (msg) => {
      setProcessingState('idle');
      setErrorMessage(msg);
    };

    return () => {
      unsubscribe();
      vl.destroy();
    };
  }, []);

  function statusLabel(s: BLEStatus): string {
    switch (s) {
      case 'idle': return 'Not connected';
      case 'scanning': return 'Scanning...';
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'error': return 'Error';
    }
  }

  async function handleTranscript(transcript: string) {
    setLastTranscript(transcript);
    setPartialText('');
    setProcessingState('thinking');
    setErrorMessage('');

    try {
      const apiKey = await loadApiKey();
      if (!apiKey) {
        Alert.alert('No API key', 'Please add your Anthropic API key in Settings.');
        setProcessingState('idle');
        return;
      }

      const command = await getCommandFromClaude(transcript, apiKey);
      setLastCommand(command);
      setProcessingState('sending');

      await bleManager.sendCommand(command);
    } catch (e: any) {
      setErrorMessage(e.message ?? 'Something went wrong.');
    } finally {
      setProcessingState('idle');
    }
  }

  async function handleScanPress() {
    if (bleStatus === 'connected') {
      await bleManager.disconnect();
    } else {
      await bleManager.scan();
    }
  }

  async function handleSpeakStart() {
    if (!bleManager.isConnected) return;
    setProcessingState('listening');
    setPartialText('');
    setLastTranscript('');
    setErrorMessage('');
    await voice.current.start();
  }

  async function handleSpeakEnd() {
    if (processingState !== 'listening') return;
    await voice.current.stop();
    // processingState transitions to 'thinking' inside handleTranscript
  }

  const canSpeak = bleStatus === 'connected' && processingState === 'idle';
  const isSpeaking = processingState === 'listening';
  const isProcessing = processingState === 'thinking' || processingState === 'sending';

  return (
    <View style={styles.container}>
      {/* Connection bar */}
      <View style={styles.connectionBar}>
        <View style={[styles.dot, { backgroundColor: STATUS_COLOR[bleStatus] }]} />
        <Text style={styles.connectionText}>{bleMessage}</Text>
        <TouchableOpacity
          style={[
            styles.connectButton,
            bleStatus === 'connected' && styles.connectButtonActive,
            (bleStatus === 'scanning' || bleStatus === 'connecting') && styles.connectButtonBusy,
          ]}
          onPress={handleScanPress}
          disabled={bleStatus === 'scanning' || bleStatus === 'connecting'}
        >
          <Text style={styles.connectButtonText}>
            {bleStatus === 'connected'
              ? 'Disconnect'
              : bleStatus === 'scanning' || bleStatus === 'connecting'
              ? 'Searching…'
              : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Last command display */}
      <View style={styles.commandArea}>
        {lastCommand ? (
          <>
            <Text style={[styles.commandCode, { color: COMMAND_COLOR[lastCommand[0]] ?? '#fff' }]}>
              {lastCommand}
            </Text>
            <Text style={styles.commandDesc}>{COMMAND_DESCRIPTIONS[lastCommand]}</Text>
          </>
        ) : (
          <Text style={styles.commandPlaceholder}>— — —</Text>
        )}
      </View>

      {/* Transcript */}
      <View style={styles.transcriptArea}>
        {(partialText || lastTranscript) ? (
          <Text style={styles.transcriptText}>
            {partialText || lastTranscript}
          </Text>
        ) : null}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>

      {/* Speak button */}
      <View style={styles.speakArea}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.processingText}>
              {processingState === 'thinking' ? 'Asking Claude…' : 'Sending to device…'}
            </Text>
          </View>
        ) : (
          <Pressable
            style={[
              styles.speakButton,
              isSpeaking && styles.speakButtonActive,
              !canSpeak && !isSpeaking && styles.speakButtonDisabled,
            ]}
            onPressIn={handleSpeakStart}
            onPressOut={handleSpeakEnd}
            disabled={!canSpeak && !isSpeaking}
          >
            <Text style={styles.speakButtonIcon}>{isSpeaking ? '🎙' : '🎤'}</Text>
            <Text style={styles.speakButtonText}>
              {isSpeaking
                ? 'Listening…'
                : !bleManager.isConnected
                ? 'Connect first'
                : 'Hold to speak'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    paddingHorizontal: 20,
  },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectionText: {
    flex: 1,
    color: '#888',
    fontSize: 14,
  },
  connectButton: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  connectButtonActive: {
    backgroundColor: '#1a2e1a',
  },
  connectButtonBusy: {
    opacity: 0.6,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  commandArea: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commandCode: {
    fontSize: 80,
    fontWeight: '800',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  commandDesc: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
  },
  commandPlaceholder: {
    color: '#2a2a2a',
    fontSize: 48,
    letterSpacing: 12,
    fontWeight: '300',
  },
  transcriptArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
    minHeight: 60,
  },
  transcriptText: {
    color: '#aaa',
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
  },
  speakArea: {
    paddingBottom: 48,
    alignItems: 'center',
  },
  speakButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  speakButtonActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#60a5fa',
    transform: [{ scale: 1.05 }],
  },
  speakButtonDisabled: {
    borderColor: '#2a2a2a',
    opacity: 0.4,
  },
  speakButtonIcon: {
    fontSize: 40,
  },
  speakButtonText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },
  processingContainer: {
    alignItems: 'center',
    gap: 16,
    height: 160,
    justifyContent: 'center',
  },
  processingText: {
    color: '#888',
    fontSize: 14,
  },
});
