import { NativeModules, Platform } from 'react-native';
import { PrinterStatus, PrinterConnection } from '../types';
import { formatDuration } from '../utils/format';

const { OctoPulseWidgetModule } = NativeModules;

export function updateAndroidWidget(printer?: PrinterConnection, status?: PrinterStatus) {
  if (Platform.OS !== 'android' || !OctoPulseWidgetModule || !printer) return;

  try {
    const isPrinting = !!(status?.stateFlags?.printing || status?.state?.toLowerCase().includes('printing'));
    const stateStr = isPrinting ? `PRINTING ${Math.round(status?.job?.progress?.completion || 0)}%` : (status?.state || (status?.stateFlags?.operational ? 'ONLINE' : 'OFFLINE'));
    const fileName = status?.job?.file?.display || status?.job?.file?.name || (isPrinting ? 'Printing file...' : 'Ready for next print');
    const progress = status?.job?.progress?.completion || 0;

    const tool0 = status?.temps?.tool0;
    const bed = status?.temps?.bed;
    const nozzleStr = tool0 ? `${Math.round(tool0.actual)}° / ${Math.round(tool0.target)}°` : '—';
    const bedStr = bed ? `${Math.round(bed.actual)}° / ${Math.round(bed.target)}°` : '—';

    const timeLeft = status?.job?.progress?.printTimeLeft;
    const timeRemainingStr = timeLeft ? `${formatDuration(timeLeft)} left` : (isPrinting ? `${progress.toFixed(0)}%` : 'Ready');

    OctoPulseWidgetModule.updateWidgetData(
      printer.name,
      stateStr,
      fileName,
      progress,
      nozzleStr,
      bedStr,
      timeRemainingStr
    );
  } catch (e: any) {
    console.warn('[updateAndroidWidget] error:', e.message);
  }
}
