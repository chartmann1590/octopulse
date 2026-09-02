export function formatDuration(seconds: number | undefined | null): string {
  if (seconds == null || isNaN(seconds) || seconds <= 0) return '0m';
  const totalSecs = Math.round(seconds);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatFilament(filament: any, fallbackAnalysis?: any): string {
  let totalLengthMm = 0;
  let totalVolumeCm3 = 0;

  const extract = (data: any) => {
    if (!data || typeof data !== 'object') return;
    if (typeof data.length === 'number' && !isNaN(data.length) && data.length > 0) {
      totalLengthMm += data.length;
    }
    if (typeof data.volume === 'number' && !isNaN(data.volume) && data.volume > 0) {
      totalVolumeCm3 += data.volume;
    }
    for (const key of Object.keys(data)) {
      if (key.startsWith('tool') && data[key] && typeof data[key] === 'object') {
        if (typeof data[key].length === 'number' && !isNaN(data[key].length)) {
          totalLengthMm += data[key].length;
        }
        if (typeof data[key].volume === 'number' && !isNaN(data[key].volume)) {
          totalVolumeCm3 += data[key].volume;
        }
      }
    }
  };

  extract(filament);
  if (totalLengthMm === 0 && fallbackAnalysis) {
    extract(fallbackAnalysis);
  }

  if (totalLengthMm > 0) {
    const meters = (totalLengthMm / 1000).toFixed(2);
    // Typical filament density ~1.24 g/cm3 for PLA / 1.04 g/cm3 for ABS
    const weightGrams = totalVolumeCm3 > 0 ? ` (~${(totalVolumeCm3 * 1.2).toFixed(0)}g)` : '';
    return `${meters}m${weightGrams}`;
  }

  return '—';
}
