import * as Notifications from 'expo-notifications';
import { PrinterConnection } from '../types';
import { getPrinterState } from './octoprint';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendLocal(title: string, body: string, data?: any) {
  await ensurePermissions();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default', priority: Notifications.AndroidNotificationPriority.HIGH } as any,
    trigger: null,
  });
}

// Polling manager
type PollState = { lastProgress?: number; lastState?: string; lastNotifyProgress?: number; lastFile?: string; };

const pollMap = new Map<string, PollState>();

function resolveEffectiveSettings(p: PrinterConnection, global: any) {
  const per = (p as any).notifications || {};
  return {
    enabled: per.enabled !== undefined ? per.enabled : global.notificationsEnabled,
    onComplete: per.onComplete !== undefined ? per.onComplete : global.notifyOnComplete,
    onError: per.onError !== undefined ? per.onError : global.notifyOnError,
    onProgress: per.onProgress !== undefined ? per.onProgress : global.notifyOnProgress,
    milestones: global.progressMilestones || [25,50,75,90],
  };
}

export async function checkPrinterForNotification(p: PrinterConnection, settings: any) {
  try {
    const eff = resolveEffectiveSettings(p, settings);
    if (!eff.enabled) return;

    const st = await getPrinterState(p);
    const key = p.id;
    const prev = pollMap.get(key) || {};
    const completion = st.job.progress.completion || 0;
    const state = st.state || '';
    const stateLow = state.toLowerCase();
    const prevStateLow = (prev.lastState || '').toLowerCase();

    // Print complete: transition from printing -> operational/finishing with high progress
    const wasPrinting = prevStateLow.includes('printing') || (prev.lastProgress || 0) > 5;
    const nowOperational = stateLow.includes('operational') || stateLow.includes('finished') || stateLow.includes('complete') || stateLow === 'operational';
    // More robust: if previous was printing and now not printing but progress was high, notify
    if (wasPrinting && !st.stateFlags?.printing && (prev.lastProgress || 0) >= 80) {
      if (eff.onComplete) {
        // Avoid duplicate if already notified for same file
        const curFile = st.job.file?.display || st.job.file?.name || '';
        if (prev.lastFile !== curFile || completion !== prev.lastProgress) {
          await sendLocal('Print Complete ✅', `${p.name}: ${st.job.file?.display || 'print'} finished at ${completion.toFixed(1)}%`, { printerId: p.id, type: 'complete' });
        }
      }
    }
    // Also detect explicit "PrintDone" state or Operational after 95%+ even if flags missing
    if (prev.lastState && prev.lastState !== state && stateLow.includes('operational') && (prev.lastProgress || 0) > 85 && eff.onComplete) {
      // Only if we haven't just notified
      const lastFile = prev.lastFile || '';
      const curFileNow = st.job.file?.display || '';
      if (lastFile !== curFileNow || (prev.lastProgress || 0) !== completion) {
        // de-dupe: only if not already sent via above block
        if (!wasPrinting || st.stateFlags?.printing) {
          // fallback handled; but keep for edge case
        }
      }
    }

    // Error detection
    const isError = stateLow.includes('error') || stateLow.includes('offline') === false && st.stateFlags?.error;
    const wasError = prevStateLow.includes('error');
    if (isError && !wasError) {
      if (eff.onError) {
        await sendLocal('Printer Error ⚠️', `${p.name}: ${state}`, { printerId: p.id, type: 'error' });
      }
    }
    if (st.stateFlags?.paused && !(pollMap.get(key)?.lastState || '').toLowerCase().includes('paused')) {
      if (eff.onError) {
        // treat pause as info if user wants error notices - optional but helpful
        // Uncomment if desired: await sendLocal('Print Paused ⏸️', `${p.name} paused at ${completion.toFixed(1)}%`, { printerId: p.id });
      }
    }

    // Progress milestones
    if (eff.onProgress && st.stateFlags?.printing) {
      for (const m of eff.milestones) {
        if (completion >= m && (prev.lastProgress || 0) < m && (prev.lastNotifyProgress || 0) < m) {
          await sendLocal(`Progress ${m}% 🖨️`, `${p.name} ${completion.toFixed(1)}% - ${st.job.file?.display || ''}`, { printerId: p.id, type: 'progress', milestone: m });
          pollMap.set(key, { ...prev, lastNotifyProgress: m, lastProgress: completion, lastState: state, lastFile: st.job.file?.display });
          return;
        }
      }
    }

    // Update map
    pollMap.set(key, { ...prev, lastProgress: completion, lastState: state, lastFile: st.job.file?.display || prev.lastFile });
  } catch (e) {
    // ignore polling errors
  }
}

let pollingInterval: any = null;

export function startPolling(printers: PrinterConnection[], settings: any) {
  stopPolling();
  if (!settings.notificationsEnabled || printers.length === 0) return;
  // also need at least one printer that hasn't disabled per-printer
  const anyEnabled = printers.some(p => {
    const per = (p as any).notifications;
    if (per && per.enabled === false) return false;
    return true;
  });
  // Even if all per-printer disabled, still keep interval but check will no-op; we can still start to handle global toggles
  pollingInterval = setInterval(async () => {
    for (const p of printers) {
      await checkPrinterForNotification(p, settings);
    }
  }, settings.pollIntervalMs || 3000);
}

export function stopPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = null;
}

export function getPollState(printerId: string): PollState | undefined {
  return pollMap.get(printerId);
}

export function clearPollState(printerId?: string) {
  if (printerId) pollMap.delete(printerId);
  else pollMap.clear();
}
