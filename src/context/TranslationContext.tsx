import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORTED_LANGUAGES, Language, DEFAULT_LANGUAGE_CODE, getLanguageByCode } from '../services/translation/languages';
import {
  getCurrentLanguage,
  setCurrentLanguage,
  isOnboardingCompleted,
  setOnboardingCompleted,
  getDownloadedModels,
  setModelDownloaded,
  isModelDownloadedCached,
} from '../services/translation/cache';
import { initTranslationCache, tSync, tAsync, ensureModelDownloaded, onCacheUpdate, getCurrentLanguageCode } from '../services/translation';
import { isNativeAvailable, getBridgeStatus, isModelDownloaded } from '../services/translation/mlkit';

type TranslationContextType = {
  currentLanguage: string;
  currentLanguageInfo: Language | undefined;
  isOnboardingDone: boolean;
  isHydrated: boolean;
  isModelDownloading: boolean;
  downloadProgress: number;
  isModelReady: boolean;
  isNativeReady: boolean;
  bridgeStatus: string;
  supportedLanguages: Language[];
  t: (text: string) => string;
  tAsync: (text: string) => Promise<string>;
  changeLanguage: (code: string) => Promise<void>;
  downloadModelFor: (code: string) => Promise<void>;
  completeOnboardingAndSetLanguage: (code: string) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  refreshCache: () => void;
  version: number; // increment to trigger re-renders when cache updates
};

const TranslationContext = createContext<TranslationContextType>(null as any);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguageState] = useState<string>(DEFAULT_LANGUAGE_CODE);
  const [isOnboardingDone, setIsOnboardingDone] = useState<boolean>(false);
  const [isModelDownloading, setIsModelDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isModelReady, setIsModelReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);

  // Initialize from storage
  useEffect(() => {
    (async () => {
      const [lang, onboarding] = await Promise.all([getCurrentLanguage(), isOnboardingCompleted()]);
      const normalized = (lang || DEFAULT_LANGUAGE_CODE).toLowerCase();
      setCurrentLanguageState(normalized);
      setIsOnboardingDone(onboarding);
      await initTranslationCache(normalized);
      if (normalized === 'en') {
        setIsModelReady(true);
      } else {
        let ready = await isModelDownloadedCached(normalized);
        if (!ready && isNativeAvailable) {
          try {
            ready = await isModelDownloaded('en', normalized);
            if (ready) {
              await setModelDownloaded(normalized, true);
            }
          } catch {}
        }
        setIsModelReady(ready);
      }
      setInitialLoading(false);
    })();
  }, []);

  // Listen for cache updates from translation service batch flush
  useEffect(() => {
    const unsub = onCacheUpdate(() => {
      setVersion(v => v + 1);
    });
    return unsub;
  }, []);

  const currentLanguageInfo = useMemo(() => getLanguageByCode(currentLanguage), [currentLanguage]);

  const t = useCallback(
    (text: string) => {
      // Avoid translating empty or emoji-only etc but still handle fallback
      if (!text || typeof text !== 'string') return text as any;
      // version dep ensures re-render after cache populates
      void version;
      return tSync(text, currentLanguage);
    },
    [currentLanguage, version]
  );

  const tAsyncFn = useCallback(
    async (text: string) => {
      return tAsync(text, currentLanguage);
    },
    [currentLanguage]
  );

  const downloadModelFor = useCallback(
    async (code: string) => {
      const target = code.toLowerCase();
      if (target === 'en') {
        setIsModelReady(true);
        setVersion(v => v + 1);
        return;
      }
      setIsModelDownloading(true);
      setDownloadProgress(5);
      try {
        await ensureModelDownloaded(target, p => setDownloadProgress(p));
        await setModelDownloaded(target, true);
        if (target === currentLanguage) {
          setIsModelReady(true);
        }
        setVersion(v => v + 1);
      } finally {
        setIsModelDownloading(false);
      }
    },
    [currentLanguage]
  );

  const changeLanguage = useCallback(
    async (code: string) => {
      const target = code.toLowerCase();
      // Persist choice immediately so UI switches even before model finishes
      await setCurrentLanguage(target);
      setCurrentLanguageState(target);
      await initTranslationCache(target);
      setVersion(v => v + 1);

      if (target === 'en') {
        setIsModelReady(true);
        return;
      }

      const already = await isModelDownloadedCached(target);
      if (already) {
        setIsModelReady(true);
        return;
      }

      // Need to download model for new language
      setIsModelReady(false);
      setIsModelDownloading(true);
      setDownloadProgress(5);
      try {
        await ensureModelDownloaded(target, p => setDownloadProgress(p));
        await setModelDownloaded(target, true);
        setIsModelReady(true);
        setVersion(v => v + 1);
      } catch (e: any) {
        // Keep language but mark not ready; UI will show retry
        setIsModelReady(false);
        throw e;
      } finally {
        setIsModelDownloading(false);
      }
    },
    []
  );

  const completeOnboardingAndSetLanguage = useCallback(
    async (code: string) => {
      const target = code.toLowerCase();
      // If english, complete immediately
      if (target === 'en') {
        await setCurrentLanguage('en');
        setCurrentLanguageState('en');
        await initTranslationCache('en');
        await setOnboardingCompleted(true);
        setIsOnboardingDone(true);
        setIsModelReady(true);
        setVersion(v => v + 1);
        return;
      }

      // Download model before marking onboarding complete so user sees progress
      setIsModelDownloading(true);
      setDownloadProgress(5);
      try {
        await ensureModelDownloaded(target, p => setDownloadProgress(p));
        await setModelDownloaded(target, true);
        await setCurrentLanguage(target);
        setCurrentLanguageState(target);
        await initTranslationCache(target);
        await setOnboardingCompleted(true);
        setIsOnboardingDone(true);
        setIsModelReady(true);
        setVersion(v => v + 1);
      } finally {
        setIsModelDownloading(false);
      }
    },
    []
  );

  const skipOnboarding = useCallback(async () => {
    await setCurrentLanguage('en');
    setCurrentLanguageState('en');
    await initTranslationCache('en');
    await setOnboardingCompleted(true);
    setIsOnboardingDone(true);
    setIsModelReady(true);
  }, []);

  const refreshCache = useCallback(() => setVersion(v => v + 1), []);

  const value: TranslationContextType = {
    currentLanguage,
    currentLanguageInfo,
    isOnboardingDone,
    isHydrated: !initialLoading,
    isModelDownloading,
    downloadProgress,
    isModelReady,
    isNativeReady: isNativeAvailable,
    bridgeStatus: getBridgeStatus(),
    supportedLanguages: SUPPORTED_LANGUAGES,
    t,
    tAsync: tAsyncFn,
    changeLanguage,
    downloadModelFor,
    completeOnboardingAndSetLanguage,
    skipOnboarding,
    refreshCache,
    version,
  };

  // While initial loading, still render children but onboarding gate will handle
  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used within TranslationProvider');
  return ctx;
}

// Helper hook for components that need translated string state that updates when cache fills
export function useTranslatedText(englishText: string): string {
  const { t, version } = useTranslation();
  // version ensures update
  void version;
  return t(englishText);
}
