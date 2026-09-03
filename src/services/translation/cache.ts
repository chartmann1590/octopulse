/**
 * Persistent translation cache + storage helpers.
 * Uses AsyncStorage to persist user language choice, onboarding flag, downloaded models,
 * and per-language translation cache to avoid re-translating same strings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LANGUAGE_CODE } from './languages';

const KEYS = {
  currentLanguage: 'octopulse_translation_lang_v1',
  onboardingCompleted: 'octopulse_translation_onboarding_v1',
  modelsDownloaded: 'octopulse_translation_models_v1', // json: { "es": true, "fr": true }
  translationCache: 'octopulse_translation_cache_v1', // json: { "es": { "Hello": "Hola" }, "fr": {...} }
  pendingTranslations: 'octopulse_translation_pending_v1',
};

export async function getCurrentLanguage(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(KEYS.currentLanguage);
    return v || DEFAULT_LANGUAGE_CODE;
  } catch {
    return DEFAULT_LANGUAGE_CODE;
  }
}

export async function setCurrentLanguage(code: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.currentLanguage, code.toLowerCase());
}

export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEYS.onboardingCompleted);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboardingCompleted, completed ? 'true' : 'false');
}

export async function getDownloadedModels(): Promise<Record<string, boolean>> {
  try {
    const j = await AsyncStorage.getItem(KEYS.modelsDownloaded);
    return j ? JSON.parse(j) : {};
  } catch {
    return {};
  }
}

export async function setModelDownloaded(langCode: string, downloaded: boolean): Promise<void> {
  const map = await getDownloadedModels();
  const key = langCode.toLowerCase();
  if (downloaded) map[key] = true;
  else delete map[key];
  await AsyncStorage.setItem(KEYS.modelsDownloaded, JSON.stringify(map));
}

export async function isModelDownloadedCached(langCode: string): Promise<boolean> {
  const map = await getDownloadedModels();
  return !!map[langCode.toLowerCase()];
}

// Translation cache per language: { [langCode]: { [enText]: translated } }
type CacheMap = Record<string, Record<string, string>>;

export async function loadTranslationCache(langCode: string): Promise<Record<string, string>> {
  try {
    const j = await AsyncStorage.getItem(KEYS.translationCache);
    const all: CacheMap = j ? JSON.parse(j) : {};
    return all[langCode.toLowerCase()] || {};
  } catch {
    return {};
  }
}

export async function saveTranslationCache(langCode: string, cache: Record<string, string>): Promise<void> {
  try {
    const j = await AsyncStorage.getItem(KEYS.translationCache);
    const all: CacheMap = j ? JSON.parse(j) : {};
    all[langCode.toLowerCase()] = cache;
    // Cap size per language to avoid unbounded growth (~2000 entries, LRU via truncation)
    const entries = Object.entries(all[langCode.toLowerCase()]);
    if (entries.length > 2000) {
      const trimmed = Object.fromEntries(entries.slice(entries.length - 2000));
      all[langCode.toLowerCase()] = trimmed;
    }
    await AsyncStorage.setItem(KEYS.translationCache, JSON.stringify(all));
  } catch {}
}

export async function addToTranslationCache(langCode: string, original: string, translated: string): Promise<void> {
  const cache = await loadTranslationCache(langCode);
  cache[original] = translated;
  await saveTranslationCache(langCode, cache);
}

export async function addBatchToCache(langCode: string, pairs: Record<string, string>): Promise<void> {
  const cache = await loadTranslationCache(langCode);
  Object.assign(cache, pairs);
  await saveTranslationCache(langCode, cache);
}

export async function clearTranslationCache(langCode?: string): Promise<void> {
  if (!langCode) {
    await AsyncStorage.removeItem(KEYS.translationCache);
    return;
  }
  try {
    const j = await AsyncStorage.getItem(KEYS.translationCache);
    const all: CacheMap = j ? JSON.parse(j) : {};
    delete all[langCode.toLowerCase()];
    await AsyncStorage.setItem(KEYS.translationCache, JSON.stringify(all));
  } catch {}
}

// Helper to reset everything (dev)
export async function resetTranslationStorage(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
