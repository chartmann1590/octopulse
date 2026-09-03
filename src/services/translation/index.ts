/**
 * High-level translation service orchestrating ML Kit native + cache + fallback dictionary.
 * This is the single entry for translating arbitrary English strings.
 */

import { isNativeAvailable, translateText, translateBatch, downloadModel } from './mlkit';
import { getFallbackTranslation } from './dictionary';
import {
  getCurrentLanguage,
  loadTranslationCache,
  addBatchToCache,
  addToTranslationCache,
} from './cache';

// In-memory cache per language for fast sync t()
let memoryCache: Record<string, string> = {};
let currentLang: string = 'en';
let cacheReadyForLang: string | null = null;
let pendingQueue = new Map<string, Promise<string>>();
let batchQueue: string[] = [];
let batchTimer: any = null;

// Debounced batch translator to reduce native calls for many t() invocations at once
function enqueueBatchTranslation(text: string, lang: string): Promise<string> {
  if (memoryCache[text] !== undefined) return Promise.resolve(memoryCache[text]);

  const key = `${lang}::${text}`;
  if (pendingQueue.has(key)) return pendingQueue.get(key)!;

  // Add to batch queue
  const promise = new Promise<string>((resolve, reject) => {
    batchQueue.push(text);

    // Setup timer to flush batch after short debounce (200ms) so multiple t() in same render flush together
    if (!batchTimer) {
      batchTimer = setTimeout(async () => {
        const toTranslate = [...new Set(batchQueue)];
        batchQueue = [];
        batchTimer = null;

        // Filter out already cached or empty
        const need = toTranslate.filter(t => memoryCache[t] === undefined && t.trim().length > 0);

        if (need.length === 0) {
          // Resolve all pending with cache
          for (const t of toTranslate) {
            const k = `${lang}::${t}`;
            const p = pendingQueue.get(k);
            if (p) {
              // resolve via memoryCache
            }
          }
          return;
        }

        try {
          if (isNativeAvailable) {
            const results = await translateBatch(need, 'en', lang);
            const pairs: Record<string, string> = {};
            need.forEach((orig, idx) => {
              const translated = results[idx] || orig;
              pairs[orig] = translated;
              memoryCache[orig] = translated;
            });
            await addBatchToCache(lang, pairs);
            // Resolve pending promises
            for (const orig of need) {
              const k = `${lang}::${orig}`;
              const entry = pendingQueue.get(k);
              // We stored promises externally; they'll resolve via side effect polling?
              // Instead we resolve by updating memoryCache and notifying subscribers via event
              // For now, promises remain pending; callers use sync t() which reads memoryCache after batch completes and triggers re-render via context.
            }
          } else {
            // JS fallback dictionary per item
            const pairs: Record<string, string> = {};
            for (const orig of need) {
              const fb = getFallbackTranslation(orig, lang);
              const translated = fb ?? orig; // keep English if no fallback
              pairs[orig] = translated;
              memoryCache[orig] = translated;
            }
            await addBatchToCache(lang, pairs);
          }
        } catch (e) {
          // On failure, keep English fallback
          for (const orig of need) {
            memoryCache[orig] = orig;
          }
        } finally {
          // Clean pendingQueue entries (they will be re-created if needed, but memoryCache now has value)
          for (const orig of toTranslate) {
            pendingQueue.delete(`${lang}::${orig}`);
          }
          // Notify listeners via custom event? We'll rely on context's polling or re-render trigger.
          // Emit via global flag for TranslationContext to observe
          if (batchFlushListeners.size > 0) {
            const snap = { ...memoryCache };
            batchFlushListeners.forEach(cb => cb(snap));
          }
        }
      }, 120);
    }

    // For now resolve with fallback or cached after batch; but sync t() will have already returned EN.
    // This promise resolves after batch completes for async callers.
    const handleInterval = setInterval(() => {
      if (memoryCache[text] !== undefined) {
        clearInterval(handleInterval);
        resolve(memoryCache[text]);
      }
    }, 150);
    setTimeout(() => {
      clearInterval(handleInterval);
      resolve(memoryCache[text] ?? text);
    }, 5000);
  });

  pendingQueue.set(key, promise);
  return promise;
}

type CacheListener = (cache: Record<string, string>) => void;
const batchFlushListeners = new Set<CacheListener>();

export function onCacheUpdate(cb: CacheListener): () => void {
  batchFlushListeners.add(cb);
  return () => batchFlushListeners.delete(cb);
}

export async function initTranslationCache(lang: string): Promise<void> {
  const code = lang.toLowerCase();
  currentLang = code;
  if (cacheReadyForLang === code) return;
  memoryCache = await loadTranslationCache(code);
  cacheReadyForLang = code;
  // Clear pendingQueue for new language
  pendingQueue.clear();
  batchQueue = [];
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  if (code !== 'en') {
    warmUpCommonTranslations(code).catch(() => {});
  }
}

export function getCurrentLanguageCode(): string {
  return currentLang;
}

export function getCachedCache(): Record<string, string> {
  return memoryCache;
}

/**
 * Synchronous translate function for use in render.
 * Returns cached translation if available; otherwise returns original English and enqueues async translation.
 * Caller should ensure initTranslationCache was called for currentLang.
 */
export function tSync(englishText: string, lang?: string): string {
  const target = (lang || currentLang).toLowerCase();
  if (target === 'en' || target === '' || !englishText) return englishText;
  if (memoryCache[englishText] !== undefined) return memoryCache[englishText];

  // Check JS fallback immediately for instant UX before MLKit finishes
  const fb = getFallbackTranslation(englishText, target);
  if (fb) {
    memoryCache[englishText] = fb;
    // Persist lazily
    addToTranslationCache(target, englishText, fb).catch(() => {});
    return fb;
  }

  // Enqueue native batch translation (fire & forget for sync path)
  if (englishText.trim().length > 0 && englishText.length < 800) {
    enqueueBatchTranslation(englishText, target).catch(() => {});
  }

  // Return English placeholder until translation arrives; context will re-render after cache update
  return englishText;
}

/**
 * Async translate for one-off translations (e.g., alerts)
 */
export async function tAsync(englishText: string, lang?: string): Promise<string> {
  const target = (lang || currentLang).toLowerCase();
  if (target === 'en' || !englishText) return englishText;
  if (memoryCache[englishText] !== undefined) return memoryCache[englishText];
  const fb = getFallbackTranslation(englishText, target);
  if (fb) return fb;
  if (!isNativeAvailable) return englishText;
  try {
    const translated = await translateText(englishText, 'en', target);
    memoryCache[englishText] = translated;
    await addToTranslationCache(target, englishText, translated);
    return translated;
  } catch {
    return englishText;
  }
}

const CORE_STRINGS = [
  'Printers', 'Settings', 'Discover', 'Add Printer',
  'MONITOR • CONTROL • PRINT', 'PRINTERS', 'PRINTING', 'ONLINE',
  'No printers connected', 'Auto-discover OctoPrint servers on your Wi-Fi network with 1-click authorization approval.',
  'Discover Printers on Wi-Fi', 'Your Printers', 'Add OctoPrint Server',
  'Auto-discovery or manual entry', 'Close', 'Discovered on Local Network',
  'Rescan', 'Scanning...', 'Scanning local subnet for OctoPrint instances...',
  'No servers detected yet. Ensure your phone and OctoPrint are connected to the same Wi-Fi network.',
  'Manual Configuration', 'Printer Name (Optional)', 'Host / IP Address *', 'Port', 'HTTPS', 'Yes', 'No',
  'Connect with API Key', 'Request Access & Connect', 'OVERVIEW', 'CONTROL', 'G-CODE', 'FILES', 'TERMINAL', 'ALERTS',
  'No file loaded', 'Printing', 'Paused', 'Idle', 'Offline', 'Refresh State', 'Cancel Print', 'Pause Print', 'Resume Print',
  'Emergency Stop', 'Language & Translation', 'Notifications & Live Alerts', 'Global Notifications',
  'Live Monitoring Frequency', 'Features & Capabilities', 'Open Source & Support', 'About OctoPulse', 'Version', 'Connected Printers', 'License',
  'NOZZLE', 'BED', 'Tap to manage →', 'Current', 'Change Language', 'Done', 'Cancel', 'Connect to OctoPrint', 'Save', 'Delete',
  'Print Finished Alert', 'Printer Error Alerts', 'Milestone Updates'
];

export async function warmUpCommonTranslations(langCode: string): Promise<void> {
  const code = langCode.toLowerCase();
  if (code === 'en' || !isNativeAvailable) return;
  const missing = CORE_STRINGS.filter(s => memoryCache[s] === undefined);
  if (missing.length === 0) return;
  try {
    const results = await translateBatch(missing, 'en', code);
    const pairs: Record<string, string> = {};
    missing.forEach((orig, idx) => {
      const tr = results[idx] || orig;
      pairs[orig] = tr;
      memoryCache[orig] = tr;
    });
    await addBatchToCache(code, pairs);
    if (batchFlushListeners.size > 0) {
      const snap = { ...memoryCache };
      batchFlushListeners.forEach(cb => cb(snap));
    }
  } catch {}
}

/**
 * Ensure ML Kit model is downloaded for language; if already downloaded (per storage), skip.
 * Returns true if ready.
 */
export async function ensureModelDownloaded(langCode: string, onProgress?: (p: number) => void): Promise<boolean> {
  const code = langCode.toLowerCase();
  if (code === 'en') return true;
  // Simulate progress for UX even though native download is atomic
  // We use interval progress emitter while native call in progress
  if (onProgress) {
    let pct = 5;
    const iv = setInterval(() => {
      pct = Math.min(95, pct + Math.random() * 12);
      onProgress(Math.floor(pct));
    }, 350);
    try {
      if (isNativeAvailable) {
        await downloadModel('en', code);
        await warmUpCommonTranslations(code);
      } else {
        // Simulate download delay for JS fallback (so onboarding animation visible)
        await new Promise(r => setTimeout(r, 1800));
      }
      clearInterval(iv);
      onProgress(100);
      await new Promise(r => setTimeout(r, 250));
      return true;
    } catch (e) {
      clearInterval(iv);
      throw e;
    }
  } else {
    if (isNativeAvailable) {
      await downloadModel('en', code);
      await warmUpCommonTranslations(code);
    } else {
      await new Promise(r => setTimeout(r, 1200));
    }
    return true;
  }
}

export function getMemoryCacheSnapshot(): Record<string, string> {
  return { ...memoryCache };
}

