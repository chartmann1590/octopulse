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
              const translated = results[idx];
              if (translated && translated.trim().length > 0) {
                pairs[orig] = translated;
                memoryCache[orig] = translated;
              }
            });
            if (Object.keys(pairs).length > 0) {
              await addBatchToCache(lang, pairs);
            }
          } else {
            // JS fallback dictionary per item
            const pairs: Record<string, string> = {};
            for (const orig of need) {
              const fb = getFallbackTranslation(orig, lang);
              if (fb) {
                pairs[orig] = fb;
                memoryCache[orig] = fb;
              }
            }
            if (Object.keys(pairs).length > 0) {
              await addBatchToCache(lang, pairs);
            }
          }
        } catch (e) {
          // On failure, do not permanently cache English fallback so it can retry
        } finally {
          // Clean pendingQueue entries
          for (const orig of toTranslate) {
            pendingQueue.delete(`${lang}::${orig}`);
          }
          // Notify all subscribers (AppText components & TranslationContext)
          if (batchFlushListeners.size > 0) {
            const snap = { ...memoryCache };
            batchFlushListeners.forEach(cb => cb(snap));
          }
        }
      }, 30);
    }

    const handleInterval = setInterval(() => {
      if (memoryCache[text] !== undefined) {
        clearInterval(handleInterval);
        resolve(memoryCache[text]);
      }
    }, 50);
    setTimeout(() => {
      clearInterval(handleInterval);
      resolve(memoryCache[text] ?? text);
    }, 3000);
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
 */
export function tSync(englishText: string, lang?: string): string {
  const target = (lang || currentLang).toLowerCase();
  if (target === 'en' || target === '' || !englishText) return englishText;
  if (memoryCache[englishText] !== undefined) return memoryCache[englishText];

  // Check JS fallback immediately for instant UX before MLKit finishes
  const fb = getFallbackTranslation(englishText, target);
  if (fb) {
    memoryCache[englishText] = fb;
    addToTranslationCache(target, englishText, fb).catch(() => {});
    return fb;
  }

  // Enqueue native batch translation
  if (englishText.trim().length > 0 && englishText.length < 1500) {
    enqueueBatchTranslation(englishText, target).catch(() => {});
  }

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

export const CORE_STRINGS = [
  'Settings', 'OctoPulse Preferences & Info', 'Language & Translation',
  'Choose your native language. OctoPulse downloads a FREE on-device ML Kit model (~30 MB) and translates every screen automatically. Works offline after download.',
  'Change Language', 'Select Language', 'Choose your native language — FREE ML Kit download',
  'Default', 'Downloaded', 'Not Downloaded', 'Downloading...',
  'All screens, buttons, and messages will appear in your selected language after the ML Kit is downloaded.',
  'Notifications & Live Alerts', 'Configure ongoing print progress and completion alerts.',
  'Global Notifications', 'Master toggle for notifications and alerts',
  'Print Finished Alert', 'Notify when a 3D print completes',
  'Printer Error Alerts', 'Notify on thermal runaway or printer disconnects',
  'Milestone Updates', 'Alerts at 25%, 50%, 75%, and 90% progress',
  'Live Monitoring Frequency', 'How frequently OctoPulse queries your OctoPrint printers.',
  'Fast (1.5s)', 'Real-time telemetry', 'Normal (3s)', 'Balanced', 'Eco (5s)', 'Battery saver',
  'Features & Capabilities', '1-Click Zero-Key Pairing', 'Authorize instantly via OctoPrint Application Keys plugin',
  '30+ FPS MJPEG Live Camera Feed', 'Hardware-accelerated live stream with snapshot & HUD overlay',
  '2D & 3D Layer Visualizer', 'Inspect interactive layer toolpaths and print bounds',
  'Full Machine Control', 'Jog XYZ, extruder feed, heated bed/nozzle presets, and fan speed',
  'Interactive Terminal Console', 'Direct G-code terminal with quick chip macros',
  'Open Source & Support', 'OctoPulse is free, open-source software built for the 3D printing community.',
  'GitHub Repo', 'Report Issue', 'About OctoPulse', 'Version', 'Connected Printers', 'License',
  'MIT Open Source', 'Printers', 'Discover', 'Add Printer', '+ Add Printer',
  'MONITOR • CONTROL • PRINT', 'PRINTERS', 'PRINTING', 'ONLINE', 'IDLE', 'PAUSED', 'OFFLINE',
  'No printers connected', 'Auto-discover OctoPrint servers on your Wi-Fi network with 1-click authorization approval.',
  'Discover Printers on Wi-Fi', 'Your Printers', 'Add OctoPrint Server',
  'Auto-discovery or manual entry', 'Close', 'Discovered on Local Network',
  'Rescan', 'Scanning...', 'Scanning local subnet for OctoPrint instances...',
  'No servers detected yet. Ensure your phone and OctoPrint are connected to the same Wi-Fi network.',
  'Manual Configuration', 'Printer Name (Optional)', 'Host / IP Address *', 'Port', 'HTTPS', 'Yes', 'No',
  'Connect with API Key', 'Request Access & Connect',
  'OVERVIEW', 'CONTROL', 'G-CODE', 'FILES', 'TERMINAL', 'ALERTS',
  'No file loaded', 'Printing', 'Paused', 'Idle', 'Offline', 'Refresh State', 'Cancel Print', 'Pause Print', 'Resume Print',
  'Emergency Stop', 'NOZZLE', 'BED', 'Tap to manage →', 'Current', 'Done', 'Cancel', 'Connect to OctoPrint', 'Save', 'Delete',
  'Camera Feed', 'Live', 'Stream', 'Snapshot', 'Fullscreen', 'Layer View →', 'Print Job Actions',
  'Back', 'Status', 'Print Time', 'Print Time Left', 'Estimated Total', 'Extruder', 'Target', 'Actual',
  'Home All', 'Home X/Y', 'Home Z', 'Motors Off', 'Fan Off', 'Cooldown', 'Preheat PLA', 'Preheat PETG', 'Preheat ABS',
  'Send G-code command...', 'Send', 'Terminal Output', 'Auto-scroll', 'Clear Output',
  'Files on Printer', 'Upload G-Code', 'Storage', 'SD Card', 'Local Storage', 'Print File', 'Delete File'
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
      const tr = results[idx];
      if (tr && tr.trim().length > 0) {
        pairs[orig] = tr;
        memoryCache[orig] = tr;
      }
    });
    if (Object.keys(pairs).length > 0) {
      await addBatchToCache(code, pairs);
    }
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

