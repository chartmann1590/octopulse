export type PrinterConnection = {
  id: string;
  name: string;
  host: string;
  port: number;
  useHttps: boolean;
  apiKey: string;
  username?: string;
  createdAt: number;
  lastSeen?: number;
  // Per-printer notification overrides (if undefined, fallback to global AppSettings)
  notifications?: {
    enabled?: boolean; // if false, silence this printer even if global enabled
    onComplete?: boolean;
    onError?: boolean;
    onProgress?: boolean;
  };
};

export type PrinterStatus = {
  state: string;
  stateFlags: Record<string, boolean>;
  temps: {
    bed: { actual: number; target: number; offset?: number };
    tool0: { actual: number; target: number; offset?: number };
    tool1?: { actual: number; target: number };
    chamber?: { actual: number; target: number };
  };
  job: {
    file?: { name: string; display: string; size: number; origin: string; date?: number; path?: string };
    estimatedPrintTime?: number;
    lastPrintTime?: number;
    progress: { completion?: number; printTime?: number; printTimeLeft?: number; filepos?: number };
    filament?: { length?: number; volume?: number };
  };
  offsets?: Record<string, number>;
  sd?: { ready: boolean };
  resends?: any;
};

export type OctoFile = {
  name: string;
  display: string;
  path: string;
  type: string;
  typePath: string[];
  hash?: string;
  size: number;
  date: number;
  origin: string;
  refs: { resource: string; download?: string };
  gcodeAnalysis?: {
    estimatedPrintTime?: number;
    filament?: { length: number; volume: number };
    printingArea?: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };
  };
  prints?: any;
  statistics?: any;
};

export type CameraSettings = {
  enabled: boolean;
  streamUrl: string;
  snapshotUrl?: string;
  flipH?: boolean;
  flipV?: boolean;
  rotate90?: boolean;
};

export type DiscoveryResult = {
  host: string;
  port: number;
  name: string;
  version?: string;
  via: 'mdns' | 'ssdp' | 'scan' | 'bonjour' | 'manual';
  apiKeyRequired?: boolean;
};

export type GCodeLayer = {
  z: number;
  moves: { x: number; y: number; e: number; isExtrude: boolean }[];
};

export type AppSettings = {
  pollIntervalMs: number;
  notificationsEnabled: boolean;
  notifyOnComplete: boolean;
  notifyOnError: boolean;
  notifyOnProgress: boolean;
  progressMilestones: number[];
  theme: 'dark' | 'light';
};
