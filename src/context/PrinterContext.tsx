import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PrinterConnection, PrinterStatus, AppSettings } from '../types';
import { loadPrinters, savePrinters, removePrinterKey, loadSettings, saveSettings } from '../services/storage';
import { getPrinterState } from '../services/octoprint';
import { startPolling, stopPolling } from '../services/notifications';

type Ctx = {
  printers: PrinterConnection[];
  statuses: Record<string, PrinterStatus>;
  loading: boolean;
  settings: AppSettings;
  addPrinter: (p: PrinterConnection) => Promise<void>;
  removePrinter: (id: string) => Promise<void>;
  updatePrinter: (id: string, patch: Partial<PrinterConnection>) => Promise<void>;
  refreshStatuses: () => Promise<void>;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
};

const PrinterContext = createContext<Ctx>(null as any);

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const [printers, setPrinters] = useState<PrinterConnection[]>([]);
  const [statuses, setStatuses] = useState<Record<string, PrinterStatus>>({});
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({
    pollIntervalMs: 3000,
    notificationsEnabled: true,
    notifyOnComplete: true,
    notifyOnError: true,
    notifyOnProgress: false,
    progressMilestones: [25,50,75,90],
    theme: 'dark',
  });

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([loadPrinters(), loadSettings()]);
      setPrinters(p);
      setSettings(s);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (printers.length) startPolling(printers, settings);
    else stopPolling();
    return () => stopPolling();
  }, [printers, settings]);

  const persist = async (list: PrinterConnection[]) => {
    setPrinters(list);
    await savePrinters(list);
  };

  const addPrinter = async (p: PrinterConnection) => {
    const list = [...printers, p];
    await persist(list);
  };
  const removePrinter = async (id: string) => {
    const list = printers.filter(p=>p.id!==id);
    await persist(list);
    await removePrinterKey(id);
    const ns = { ...statuses }; delete ns[id]; setStatuses(ns);
  };
  const updatePrinter = async (id: string, patch: Partial<PrinterConnection>) => {
    const list = printers.map(p=> p.id===id ? { ...p, ...patch } : p);
    await persist(list);
  };
  const refreshStatuses = useCallback(async () => {
    const next: Record<string, PrinterStatus> = {};
    await Promise.all(printers.map(async p => {
      try {
        const st = await getPrinterState(p);
        next[p.id] = st;
      } catch (e) {
        // mark offline
        next[p.id] = {
          state: 'Offline',
          stateFlags: { operational: false, error: true },
          temps: { bed: { actual: 0, target: 0 }, tool0: { actual: 0, target: 0 } },
          job: { progress: {} },
        };
      }
    }));
    setStatuses(next);
  }, [printers]);

  useEffect(() => {
    if (!printers.length) return;
    refreshStatuses();
    const id = setInterval(refreshStatuses, settings.pollIntervalMs);
    return () => clearInterval(id);
  }, [printers, settings.pollIntervalMs, refreshStatuses]);

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const ns = { ...settings, ...patch };
    setSettings(ns);
    await saveSettings(ns);
  };

  return (
    <PrinterContext.Provider value={{ printers, statuses, loading, settings, addPrinter, removePrinter, updatePrinter, refreshStatuses, updateSettings }}>
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinters() {
  return useContext(PrinterContext);
}
