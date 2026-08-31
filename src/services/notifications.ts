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

export async function ensurePermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendLocal(title: string, body: string, data?: any) {
  await ensurePermissions();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: null,
  });
}

// Polling manager
type PollState = { lastProgress?: number; lastState?: string; lastNotifyProgress?: number; };

const pollMap = new Map<string, PollState>();

export async function checkPrinterForNotification(p: PrinterConnection, settings: any) {
  try {
    const st = await getPrinterState(p);
    const key = p.id;
    const prev = pollMap.get(key) || {};
    const completion = st.job.progress.completion || 0;
    const state = st.state;

    // print done
    if (prev.lastState && prev.lastState !== 'Operational' && state === 'Operational' && (prev.lastProgress || 0) > 80) {
      if (settings.notifyOnComplete) {
        await sendLocal('Print Complete ✅', `${p.name}: ${st.job.file?.display || 'print'} finished`, { printerId: p.id });
      }
    }
    // error
    if (state.toLowerCase().includes('error') && prev.lastState !== state) {
      if (settings.notifyOnError) {
        await sendLocal('Printer Error ⚠️', `${p.name}: ${state}`, { printerId: p.id });
      }
    }
    // progress milestones
    if (settings.notifyOnProgress && st.stateFlags?.printing) {
      for (const m of (settings.progressMilestones||[])) {
        if (completion >= m && (prev.lastProgress||0) < m && (prev.lastNotifyProgress||0) < m) {
          await sendLocal(`Progress ${m}%`, `${p.name} ${completion.toFixed(1)}%`, { printerId: p.id });
          pollMap.set(key, { ...prev, lastNotifyProgress: m, lastProgress: completion, lastState: state });
          return;
        }
      }
    }
    pollMap.set(key, { ...prev, lastProgress: completion, lastState: state });
  } catch (e) {
    // ignore
  }
}

let pollingInterval: any = null;
export function startPolling(printers: PrinterConnection[], settings: any) {
  stopPolling();
  if (!settings.notificationsEnabled || printers.length===0) return;
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
