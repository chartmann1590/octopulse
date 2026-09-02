import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrinterConnection, AppSettings } from '../types';

declare const __DEV__: boolean;

const KEYS = {
  printers: 'octopulse_printers_v2',
  settings: 'octopulse_settings_v2',
  apiKeys: 'octopulse_keys_',
};

const isSecureAvailable = async () => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

export async function savePrinters(printers: PrinterConnection[]) {
  const json = JSON.stringify(printers);
  await AsyncStorage.setItem(KEYS.printers, json);
  // also store keys securely
  const secure = await isSecureAvailable();
  if (secure) {
    for (const p of printers) {
      await SecureStore.setItemAsync(KEYS.apiKeys + p.id, p.apiKey);
    }
  }
}

export async function loadPrinters(): Promise<PrinterConnection[]> {
  const json = await AsyncStorage.getItem(KEYS.printers);
  if (!json) return [];
  try {
    const list: PrinterConnection[] = JSON.parse(json);
    const secure = await isSecureAvailable();
    if (secure) {
      for (const p of list) {
        const key = await SecureStore.getItemAsync(KEYS.apiKeys + p.id);
        if (key) p.apiKey = key;
      }
    }
    return list;
  } catch {
    return [];
  }
}

export async function removePrinterKey(id: string) {
  const secure = await isSecureAvailable();
  if (secure) {
    try { await SecureStore.deleteItemAsync(KEYS.apiKeys + id); } catch {}
  }
}

const defaultSettings: AppSettings = {
  pollIntervalMs: 3000,
  notificationsEnabled: true,
  notifyOnComplete: true,
  notifyOnError: true,
  notifyOnProgress: false,
  progressMilestones: [25, 50, 75, 90],
  theme: 'dark',
};

export async function saveSettings(s: AppSettings) {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(s));
}
export async function loadSettings(): Promise<AppSettings> {
  const j = await AsyncStorage.getItem(KEYS.settings);
  if (!j) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(j) };
  } catch { return defaultSettings; }
}

// Firebase placeholder crashlytics logging
export function logCrashlytics(msg: string, data?: any) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[Crashlytics]', msg, data);
  // real implementation uses @react-native-firebase/crashlytics when linked
}
export function logPerformance(trace: string, durationMs: number) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[Perf]', trace, durationMs + 'ms');
}
