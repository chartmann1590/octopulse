/**
 * JS bridge to native MLKitTranslateModule (Android).
 * Fallback gracefully when running on iOS/web or when module not linked (Expo Go, etc).
 * For iOS we provide a JS fallback dictionary so UI still translates.
 */

import { NativeModules, Platform } from 'react-native';

type NativeBridge = {
  downloadModel: (source: string, target: string) => Promise<boolean>;
  deleteModel: (source: string, target: string) => Promise<boolean>;
  isModelDownloaded: (source: string, target: string) => Promise<boolean>;
  translate: (text: string, source: string, target: string) => Promise<string>;
  translateBatch: (texts: string[], source: string, target: string) => Promise<string[]>;
};

const Native = (NativeModules as any).MLKitTranslate as NativeBridge | undefined;

export const isNativeAvailable = !!Native && Platform.OS === 'android';

export async function downloadModel(source: string, target: string): Promise<boolean> {
  if (!Native) throw new Error('MLKitTranslate native module not available (use development build)');
  const s = source.toLowerCase();
  const t = target.toLowerCase();
  if (s === t) return true;
  const res = await Native.downloadModel(s, t);
  return !!res;
}

export async function deleteModel(source: string, target: string): Promise<boolean> {
  if (!Native) return true;
  try {
    await Native.deleteModel(source.toLowerCase(), target.toLowerCase());
    return true;
  } catch {
    return false;
  }
}

export async function isModelDownloaded(source: string, target: string): Promise<boolean> {
  if (!Native) return false;
  try {
    const res = await Native.isModelDownloaded(source.toLowerCase(), target.toLowerCase());
    return !!res;
  } catch {
    return false;
  }
}

export async function translateText(text: string, source: string, target: string): Promise<string> {
  if (!text || source.toLowerCase() === target.toLowerCase()) return text;
  if (!Native) {
    // Fallback to bundled dictionary or LibreTranslate-style stub will be handled at service layer
    throw new Error('Native MLKit not available');
  }
  const translated = await Native.translate(text, source.toLowerCase(), target.toLowerCase());
  return translated ?? text;
}

export async function translateBatch(texts: string[], source: string, target: string): Promise<string[]> {
  if (!texts.length || source.toLowerCase() === target.toLowerCase()) return texts;
  if (!Native || !Native.translateBatch) {
    // Fallback: translate sequentially via translate()
    const out: string[] = [];
    for (const t of texts) {
      try {
        out.push(await translateText(t, source, target));
      } catch {
        out.push(t);
      }
    }
    return out;
  }
  try {
    const res = await Native.translateBatch(texts, source.toLowerCase(), target.toLowerCase());
    return res;
  } catch {
    // fallback per-item
    const out: string[] = [];
    for (const t of texts) {
      try { out.push(await translateText(t, source, target)); } catch { out.push(t); }
    }
    return out;
  }
}

/**
 * Diagnostics helper for Settings UI
 */
export function getBridgeStatus(): string {
  if (Platform.OS !== 'android') return `Native MLKit translation requires Android (current: ${Platform.OS}) — using JS fallback`;
  if (!Native) return 'Native module not linked — rebuild with `npx expo prebuild` + `expo run:android`';
  return 'MLKitTranslate native bridge ready (FREE on-device, offline)';
}
