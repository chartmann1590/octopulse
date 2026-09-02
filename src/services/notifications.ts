import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PrinterConnection } from '../types';
import { getPrinterState } from './octoprint';
import { formatDuration } from '../utils/format';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isProgress = notification?.request?.content?.data?.type === 'active_print';
    return {
      shouldShowAlert: true,
      shouldPlaySound: !isProgress,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('print-progress', {
      name: 'Active Print Progress',
      importance: Notifications.AndroidImportance.LOW,
      sound: undefined,
      enableVibrate: false,
      showBadge: false,
    });
    await Notifications.setNotificationChannelAsync('print-alerts', {
      name: 'Printer Alerts & Completion',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }
}

export async function ensurePermissions(): Promise<boolean> {
  await setupNotificationChannels();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendLocal(title: string, body: string, data?: any) {
  await ensurePermissions();
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      channelId: 'print-alerts',
    } as any,
    trigger: null,
  });
}

// Polling manager
type PollState = {
  lastProgress?: number;
  lastState?: string;
  lastNotifyProgress?: number;
  lastFile?: string;
  wasPrinting?: boolean;
};

const pollMap = new Map<string, PollState>();

function resolveEffectiveSettings(p: PrinterConnection, global: any) {
  const per = (p as any).notifications || {};
  return {
    enabled: per.enabled !== undefined ? per.enabled : global.notificationsEnabled,
    onComplete: per.onComplete !== undefined ? per.onComplete : global.notifyOnComplete,
    onError: per.onError !== undefined ? per.onError : global.notifyOnError,
    onProgress: per.onProgress !== undefined ? per.onProgress : global.notifyOnProgress,
    milestones: global.progressMilestones || [25, 50, 75, 90],
  };
}

export async function checkPrinterForNotification(p: PrinterConnection, settings: any) {
  try {
    const eff = resolveEffectiveSettings(p, settings);
    const st = await getPrinterState(p);
    const key = p.id;
    const prev = pollMap.get(key) || {};
    const completion = st.job?.progress?.completion || 0;
    const state = st.state || '';
    const stateLow = state.toLowerCase();
    const prevStateLow = (prev.lastState || '').toLowerCase();
    const isPrinting = !!(st.stateFlags?.printing || stateLow.includes('printing'));

    // 1) Active ongoing print notification with progress and time left
    if (isPrinting && eff.enabled) {
      const progressPercent = Math.round(completion);
      const timeLeftStr = formatDuration(st.job?.progress?.printTimeLeft);
      const timeElapsedStr = formatDuration(st.job?.progress?.printTime);
      const fileName = st.job?.file?.display || st.job?.file?.name || '3D Print';
      const nozzleTemp = st.temps?.tool0?.actual ? `${Math.round(st.temps.tool0.actual)}°` : '';
      const bedTemp = st.temps?.bed?.actual ? `${Math.round(st.temps.bed.actual)}°` : '';
      const tempStr = nozzleTemp ? ` • ${nozzleTemp}/${bedTemp}` : '';

      await Notifications.scheduleNotificationAsync({
        identifier: `active_print_${p.id}`,
        content: {
          title: `${p.name}: ${progressPercent}% (${timeLeftStr} left)`,
          body: `${fileName}${tempStr}\n⏱ ${timeElapsedStr} elapsed • ${timeLeftStr} remaining`,
          sticky: true,
          autoDismiss: false,
          sound: undefined,
          priority: Notifications.AndroidNotificationPriority.LOW,
          channelId: 'print-progress',
          color: '#0ea5e9',
          data: { printerId: p.id, type: 'active_print' },
        } as any,
        trigger: null,
      });
    } else if (!isPrinting) {
      // Dismiss ongoing notification when no longer printing
      await Notifications.dismissNotificationAsync(`active_print_${p.id}`).catch(() => {});
    }

    if (!eff.enabled) return;

    // 2) Print complete: transition from printing -> operational/finishing
    const wasPrinting = prev.wasPrinting || prevStateLow.includes('printing') || (prev.lastProgress || 0) > 5;
    if (wasPrinting && !isPrinting && (prev.lastProgress || 0) >= 80) {
      if (eff.onComplete) {
        const curFile = st.job?.file?.display || st.job?.file?.name || '';
        if (prev.lastFile !== curFile || completion !== prev.lastProgress) {
          await sendLocal(
            'Print Complete ✅',
            `${p.name}: "${st.job?.file?.display || 'Print'}" finished (${formatDuration(st.job?.progress?.printTime)} total)`,
            { printerId: p.id, type: 'complete' }
          );
        }
      }
    }

    // 3) Error detection
    const isError = stateLow.includes('error') || (stateLow.includes('offline') === false && st.stateFlags?.error);
    const wasError = prevStateLow.includes('error');
    if (isError && !wasError && eff.onError) {
      await sendLocal('Printer Error ⚠️', `${p.name}: ${state}`, { printerId: p.id, type: 'error' });
    }

    // 4) Progress milestones
    if (eff.onProgress && isPrinting) {
      for (const m of eff.milestones) {
        if (completion >= m && (prev.lastProgress || 0) < m && (prev.lastNotifyProgress || 0) < m) {
          const timeLeftStr = formatDuration(st.job?.progress?.printTimeLeft);
          await sendLocal(
            `Progress ${m}% 🖨️`,
            `${p.name} at ${completion.toFixed(1)}% (${timeLeftStr} left) - ${st.job?.file?.display || ''}`,
            { printerId: p.id, type: 'progress', milestone: m }
          );
          pollMap.set(key, {
            ...prev,
            lastNotifyProgress: m,
            lastProgress: completion,
            lastState: state,
            lastFile: st.job?.file?.display,
            wasPrinting: isPrinting,
          });
          return;
        }
      }
    }

    // Update map
    pollMap.set(key, {
      ...prev,
      lastProgress: completion,
      lastState: state,
      lastFile: st.job?.file?.display || prev.lastFile,
      wasPrinting: isPrinting,
    });
  } catch (e) {
    // ignore polling errors
  }
}

let pollingInterval: any = null;

export function startPolling(printers: PrinterConnection[], settings: any) {
  stopPolling();
  if (printers.length === 0) return;
  setupNotificationChannels();
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
