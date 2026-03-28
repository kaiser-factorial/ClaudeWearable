/**
 * Secure storage for the Anthropic API key.
 * Uses iOS Keychain / Android Keystore — never stored in plain text.
 */

import * as SecureStore from 'expo-secure-store';

const KEY = 'anthropic_api_key';

export async function saveApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, key);
}

export async function loadApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
