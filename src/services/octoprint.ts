import { PrinterConnection, PrinterStatus, OctoFile, CameraSettings } from '../types';

function baseUrl(p: PrinterConnection) {
  const proto = p.useHttps ? 'https' : 'http';
  const host = p.host.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `${proto}://${host}:${p.port}`;
}

async function req(p: PrinterConnection, path: string, opts: RequestInit = {}) {
  const url = `${baseUrl(p)}${path}`;
  const headers: Record<string, string> = {
    'X-Api-Key': p.apiKey,
    'Content-Type': 'application/json',
    ...(opts.headers as any),
  };
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { ...opts, headers, signal: controller.signal });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`${res.status} ${res.statusText} ${txt.slice(0,120)}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    return await res.text();
  } finally {
    clearTimeout(to);
  }
}

export async function testConnection(p: PrinterConnection) {
  const start = Date.now();
  const v = await req(p, '/api/version');
  const printer = await req(p, '/api/printer').catch(() => null);
  return { version: v, printer, ms: Date.now() - start };
}

export async function getVersion(p: PrinterConnection) {
  return req(p, '/api/version');
}
export async function getPrinterState(p: PrinterConnection): Promise<PrinterStatus> {
  const printer = await req(p, '/api/printer');
  const job = await req(p, '/api/job');
  // merge
  return {
    state: printer.state?.text || 'Unknown',
    stateFlags: printer.state?.flags || {},
    temps: {
      bed: printer.temperature?.bed || { actual: 0, target: 0 },
      tool0: printer.temperature?.tool0 || { actual: 0, target: 0 },
      tool1: printer.temperature?.tool1,
      chamber: printer.temperature?.chamber,
    },
    job: {
      file: job.job?.file,
      estimatedPrintTime: job.job?.estimatedPrintTime,
      lastPrintTime: job.job?.lastPrintTime,
      progress: job.progress || {},
      filament: job.job?.filament,
    },
    sd: printer.sd,
    offsets: printer.offsets,
  } as PrinterStatus;
}

export async function getJob(p: PrinterConnection) {
  return req(p, '/api/job');
}
export async function jobCommand(p: PrinterConnection, command: string, payload: any = {}) {
  return req(p, '/api/job', { method: 'POST', body: JSON.stringify({ command, ...payload }) });
}

export async function getFiles(p: PrinterConnection, recursive = true): Promise<{ files: OctoFile[] }> {
  return req(p, `/api/files?recursive=${recursive}`);
}
export async function getSettings(p: PrinterConnection) {
  return req(p, '/api/settings');
}
export async function getCameraSettings(p: PrinterConnection): Promise<CameraSettings | null> {
  try {
    const s = await getSettings(p);
    const webcam = s.webcam || s.plugins?.classicwebcam || {};
    const streamUrl = webcam.streamUrl || '/webcam/?action=stream';
    const snapshotUrl = webcam.snapshotUrl || '/webcam/?action=snapshot';
    // resolve relative to base
    const base = baseUrl(p);
    const resolve = (u: string) => u.startsWith('http') ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`;
    return {
      enabled: webcam.webcamEnabled !== false,
      streamUrl: resolve(streamUrl),
      snapshotUrl: resolve(snapshotUrl),
      flipH: webcam.flipH,
      flipV: webcam.flipV,
      rotate90: webcam.rotate90,
    };
  } catch { return null; }
}

export async function getFileContent(p: PrinterConnection, path: string): Promise<string> {
  // download gcode
  const url = `${baseUrl(p)}/api/files/local/${encodeURIComponent(path)}`;
  // Actually use download link; simpler fetch via /downloads/files/local/<path>
  // Try direct downloads
  const dl = `${baseUrl(p)}/downloads/files/local/${path}`;
  const headers = { 'X-Api-Key': p.apiKey } as any;
  const res = await fetch(dl, { headers });
  if (!res.ok) throw new Error('download failed ' + res.status);
  return await res.text();
}

export async function printerCommand(p: PrinterConnection, command: string) {
  return req(p, '/api/printer/command', { method: 'POST', body: JSON.stringify({ command }) });
}
export async function jog(p: PrinterConnection, axis: 'x'|'y'|'z', amount: number) {
  const cmd: any = {}; cmd[axis] = amount;
  return req(p, '/api/printer/printhead', { method: 'POST', body: JSON.stringify({ command: 'jog', ...cmd }) });
}
export async function home(p: PrinterConnection, axes: string[]) {
  return req(p, '/api/printer/printhead', { method: 'POST', body: JSON.stringify({ command: 'home', axes }) });
}
export async function setToolTemp(p: PrinterConnection, tool: string, temp: number) {
  const target: any = {}; target[tool] = temp;
  return req(p, '/api/printer/tool', { method: 'POST', body: JSON.stringify({ command: 'target', targets: target }) });
}
export async function setBedTemp(p: PrinterConnection, temp: number) {
  return req(p, '/api/printer/bed', { method: 'POST', body: JSON.stringify({ command: 'target', target: temp }) });
}
export async function connectPrinter(p: PrinterConnection) {
  return req(p, '/api/connection', { method: 'POST', body: JSON.stringify({ command: 'connect' }) });
}
export async function disconnectPrinter(p: PrinterConnection) {
  return req(p, '/api/connection', { method: 'POST', body: JSON.stringify({ command: 'disconnect' }) });
}
export async function getSystemCommands(p: PrinterConnection) {
  return req(p, '/api/system/commands').catch(() => null);
}
export async function uploadFile(p: PrinterConnection, filename: string, content: string) {
  // not implemented for v1 - would need multipart
  throw new Error('upload not implemented');
}

export async function requestAppKey(host: string, port: number, appName = "OctoPulse", useHttps=false) {
  const proto = useHttps ? 'https' : 'http';
  const url = `${proto}://${host}:${port}/plugin/appkeys/request`;
  const controller = new AbortController();
  const t = setTimeout(()=> controller.abort(), 8000);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: appName }), signal: controller.signal });
    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      throw new Error(`AppKeys not available (${res.status}) ${txt.slice(0,80)} - Enable Application Keys plugin in OctoPrint settings or use manual API key`);
    }
    return await res.json() as { app_token: string };
  } finally { clearTimeout(t); }
}
export async function pollAppKey(host: string, port: number, appToken: string, useHttps=false) {
  const proto = useHttps ? 'https' : 'http';
  const url = `${proto}://${host}:${port}/plugin/appkeys/request/${appToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Poll failed ${res.status}`);
  const j = await res.json();
  // OctoPrint returns { api_key: "xxx" } when approved, { api_key: null } while pending
  return j as { api_key: string | null, api_key_pending?: boolean };
}
export async function probeAppKeys(host: string, port: number, useHttps=false): Promise<boolean> {
  const proto = useHttps ? 'https' : 'http';
  try {
    const res = await fetch(`${proto}://${host}:${port}/plugin/appkeys/request`, { method: 'OPTIONS' });
    return res.status !== 404;
  } catch { return true; }
}

// Helper to build snapshot URL with api key bypass if needed
export function snapshotUrlWithKey(p: PrinterConnection, snap: string) {
  // OctoPrint webcam often doesn't need api key, but add as query if needed
  return snap;
}
