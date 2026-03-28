/**
 * Wraps expo-speech-recognition for push-to-talk voice recognition.
 * Uses the device's native STT engine (no transcription API cost).
 *
 * Listeners are registered lazily on first start() call to avoid
 * triggering native speech recognition APIs before the app is fully ready
 * (which crashes on iOS 26).
 */

import {
  ExpoSpeechRecognitionModule,
  addSpeechRecognitionListener,
} from 'expo-speech-recognition';

export class VoiceListener {
  onResult: ((transcript: string) => void) | null = null;
  onError: ((message: string) => void) | null = null;
  onPartial: ((partial: string) => void) | null = null;

  private subscriptions: { remove(): void }[] = [];
  private initialized = false;

  constructor() {
    // Don't register native listeners here — defer to init()
    console.log('🟡 [VoiceListener] constructor (no native calls)');
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;
    console.log('🟡 [VoiceListener] init — registering native listeners');
    try {
      this.subscriptions.push(
        addSpeechRecognitionListener('result', (e) => {
          const text = e.results?.[0]?.transcript;
          if (text && e.isFinal) {
            this.onResult?.(text);
          } else if (text) {
            this.onPartial?.(text);
          }
        }),
        addSpeechRecognitionListener('error', (e) => {
          const msg = e.error ?? 'Speech recognition error';
          if (msg === 'no-speech') return;
          this.onError?.(msg);
        }),
      );
      console.log('🟡 [VoiceListener] native listeners registered OK');
    } catch (e) {
      console.error('🔴 [VoiceListener] failed to register listeners:', e);
    }
  }

  async start(locale = 'en-US'): Promise<void> {
    // Register listeners on first use
    this.init();

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      this.onError?.('Microphone permission denied');
      return;
    }

    try {
      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        continuous: true,
      });
    } catch (e: any) {
      this.onError?.(e.message ?? 'Could not start voice recognition');
    }
  }

  async stop(): Promise<void> {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore — may already be stopped
    }
  }

  async cancel(): Promise<void> {
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // ignore
    }
  }

  destroy() {
    this.subscriptions.forEach((s) => s.remove());
    this.subscriptions = [];
    this.initialized = false;
  }
}
