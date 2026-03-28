/**
 * Wraps expo-speech-recognition for push-to-talk voice recognition.
 * Uses the device's native STT engine (no transcription API cost).
 *
 * Usage:
 *   const listener = new VoiceListener();
 *   listener.onResult = (text) => { ... };
 *   listener.onError = (msg) => { ... };
 *   await listener.start();   // call on button press-in
 *   await listener.stop();    // call on button press-out
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

  constructor() {
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
        // Ignore "no speech" errors that fire when the user releases quickly
        if (msg === 'no-speech') return;
        this.onError?.(msg);
      }),
    );
  }

  async start(locale = 'en-US'): Promise<void> {
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
  }
}
