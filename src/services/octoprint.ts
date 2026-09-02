import { PrinterConnection, PrinterStatus, OctoFile, CameraSettings } from '../types';

export function baseUrl(p: { host: string; port: number; useHttps?: boolean }) {
  const proto = p.useHttps ? 'https' : 'http';
  const host = p.host.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `${proto}://${host}:${p.port}`;
}

export async function req(p: PrinterConnection, path: string, opts: RequestInit = {}) {
  const url = `${baseUrl(p)}${path}`;
  const headers: Record<string, string> = {
    'X-Api-Key': p.apiKey,
    'Content-Type': 'application/json',
    ...(opts.headers as any),
  };
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { ...opts, headers, signal: controller.signal });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`${res.status} ${res.statusText} ${txt.slice(0, 120)}`);
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
  let bodyPayload: any = { command, ...payload };
  if (command === 'pause') {
    bodyPayload = { command: 'pause', action: 'pause' };
  } else if (command === 'resume') {
    bodyPayload = { command: 'pause', action: 'resume' };
  } else if (command === 'toggle') {
    bodyPayload = { command: 'pause', action: 'toggle' };
  }
  return req(p, '/api/job', { method: 'POST', body: JSON.stringify(bodyPayload) });
}

export async function getFiles(p: PrinterConnection, recursive = true): Promise<{ files: OctoFile[] }> {
  return req(p, `/api/files?recursive=${recursive}`);
}

export async function printFile(p: PrinterConnection, path: string, origin = 'local') {
  const encodedPath = path.split('/').map(seg => encodeURIComponent(seg)).join('/');
  return req(p, `/api/files/${origin}/${encodedPath}`, {
    method: 'POST',
    body: JSON.stringify({ command: 'select', print: true }),
  });
}

export async function selectFile(p: PrinterConnection, path: string, origin = 'local') {
  const encodedPath = path.split('/').map(seg => encodeURIComponent(seg)).join('/');
  return req(p, `/api/files/${origin}/${encodedPath}`, {
    method: 'POST',
    body: JSON.stringify({ command: 'select', print: false }),
  });
}

export async function deleteFile(p: PrinterConnection, path: string, origin = 'local') {
  const encodedPath = path.split('/').map(seg => encodeURIComponent(seg)).join('/');
  return req(p, `/api/files/${origin}/${encodedPath}`, { method: 'DELETE' });
}

export async function getSettings(p: PrinterConnection) {
  return req(p, '/api/settings');
}

export async function getCameraSettings(p: PrinterConnection): Promise<CameraSettings> {
  const base = baseUrl(p);

  function resolve(u: string): string {
    if (!u) return '';
    let url = u.trim();
    // Replace loopback/localhost IPs returned by OctoPrint internal settings (e.g. http://127.0.0.1:8080/?action=snapshot or 0.0.0.0)
    // with the actual printer host IP so mobile devices on the network can reach the webcam stream/snapshot.
    url = url.replace(/:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0|::1)(:|\/|$)/, `://${p.host}$2`);
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  try {
    const s = await getSettings(p).catch(() => null);
    const webcam = s?.webcam || s?.plugins?.classicwebcam || s?.plugins?.multicam || {};
    const firstCam = Array.isArray(webcam.webcams) && webcam.webcams.length > 0 ? webcam.webcams[0] : null;

    let streamUrl =
      webcam.streamUrl ||
      webcam.stream ||
      webcam.stream_url ||
      firstCam?.extras?.stream ||
      firstCam?.compat?.stream ||
      s?.plugins?.classicwebcam?.stream ||
      s?.plugins?.multicam?.multicam_profiles?.[0]?.URL ||
      '';

    let snapshotUrl =
      webcam.snapshotUrl ||
      webcam.snapshot ||
      webcam.snapshot_url ||
      firstCam?.extras?.snapshot ||
      firstCam?.compat?.snapshot ||
      firstCam?.snapshotDisplay ||
      s?.plugins?.classicwebcam?.snapshot ||
      s?.plugins?.multicam?.multicam_profiles?.[0]?.snapshot ||
      '';

    let resolvedStream = streamUrl ? resolve(streamUrl) : '';
    let resolvedSnapshot = snapshotUrl ? resolve(snapshotUrl) : '';

    // If stream URL is empty, or points to port 5000 (direct OctoPrint backend) where camera is typically on port 8080
    if (!resolvedStream || resolvedStream.includes(':5000/webcam') || resolvedStream.endsWith(':5000/') || resolvedStream.includes('/webcam/?action=stream')) {
      const probe = await probeAlternateWebcamPort(p, base);
      if (probe && probe.streamUrl) {
        resolvedStream = probe.streamUrl;
        resolvedSnapshot = probe.snapshotUrl;
      }
    }

    return {
      enabled: webcam.webcamEnabled !== false,
      streamUrl: resolvedStream || `http://${p.host}:8080/stream`,
      snapshotUrl: resolvedSnapshot || `http://${p.host}:8080/snapshot`,
      flipH: !!(webcam.flipH ?? firstCam?.flipH),
      flipV: !!(webcam.flipV ?? firstCam?.flipV),
      rotate90: !!(webcam.rotate90 ?? firstCam?.rotate90),
    };
  } catch (e: any) {
    console.warn('[getCameraSettings] settings fetch failed:', e.message);
    const fallback = await probeAlternateWebcamPort(p, base);
    return {
      enabled: true,
      streamUrl: fallback.streamUrl,
      snapshotUrl: fallback.snapshotUrl,
      flipH: false,
      flipV: false,
      rotate90: false,
    };
  }
}

async function probeAlternateWebcamPort(p: PrinterConnection, base: string): Promise<CameraSettings> {
  const host = p.host;
  const proto = p.useHttps ? 'https' : 'http';

  // Probe fast snapshot/state endpoints (finite HTTP responses that resolve in <15ms)
  const probePairs = [
    {
      testUrl: `${proto}://${host}:8080/snapshot`,
      streamUrl: `${proto}://${host}:8080/stream`,
      snapshotUrl: `${proto}://${host}:8080/snapshot`,
    },
    {
      testUrl: `${proto}://${host}:8080/?action=snapshot`,
      streamUrl: `${proto}://${host}:8080/?action=stream`,
      snapshotUrl: `${proto}://${host}:8080/?action=snapshot`,
    },
    {
      testUrl: `${proto}://${host}:8080/state`,
      streamUrl: `${proto}://${host}:8080/stream`,
      snapshotUrl: `${proto}://${host}:8080/snapshot`,
    },
    {
      testUrl: `${proto}://${host}/webcam/?action=snapshot`,
      streamUrl: `${proto}://${host}/webcam/?action=stream`,
      snapshotUrl: `${proto}://${host}/webcam/?action=snapshot`,
    },
    {
      testUrl: `${proto}://${host}/webcam/snapshot`,
      streamUrl: `${proto}://${host}/webcam/stream`,
      snapshotUrl: `${proto}://${host}/webcam/snapshot`,
    },
    {
      testUrl: `${proto}://${host}:8081/snapshot`,
      streamUrl: `${proto}://${host}:8081/stream`,
      snapshotUrl: `${proto}://${host}:8081/snapshot`,
    },
    {
      testUrl: `${proto}://${host}:8081/?action=snapshot`,
      streamUrl: `${proto}://${host}:8081/?action=stream`,
      snapshotUrl: `${proto}://${host}:8081/?action=snapshot`,
    },
    {
      testUrl: `${base}/webcam/?action=snapshot`,
      streamUrl: `${base}/webcam/?action=stream`,
      snapshotUrl: `${base}/webcam/?action=snapshot`,
    },
  ];

  try {
    const results = await Promise.all(
      probePairs.map(async pair => {
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 1800);
          const res = await fetch(pair.testUrl, {
            method: 'GET',
            headers: { Accept: '*/*' },
            signal: controller.signal,
          });
          clearTimeout(t);
          if (res.ok || res.status === 200 || res.status === 204) {
            return pair;
          }
        } catch {}
        return null;
      })
    );

    const match = results.find(Boolean);
    if (match) {
      return {
        enabled: true,
        streamUrl: match.streamUrl,
        snapshotUrl: match.snapshotUrl,
      };
    }
  } catch {}

  return {
    enabled: true,
    streamUrl: `${proto}://${host}:8080/stream`,
    snapshotUrl: `${proto}://${host}:8080/snapshot`,
  };
}

export async function getFileContent(p: PrinterConnection, path: string): Promise<string> {
  const encodedPath = path.split('/').map(seg => encodeURIComponent(seg)).join('/');
  const base = baseUrl(p);
  const headers = { 'X-Api-Key': p.apiKey } as any;
  const dl = `${base}/downloads/files/local/${encodedPath}`;
  try {
    const res = await fetch(dl, { headers });
    if (res.ok) return await res.text();
  } catch {}
  const dl2 = `${base}/api/files/local/${encodedPath}?download=true`;
  const res2 = await fetch(dl2, { headers });
  if (!res2.ok) throw new Error('Download failed: ' + res2.status);
  const ct = res2.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const j = await res2.json().catch(() => null);
    if (j && j.download) {
      const targetUrl = j.download.startsWith('http') ? j.download : `${base}${j.download}`;
      const res3 = await fetch(targetUrl, { headers });
      if (!res3.ok) throw new Error('Download redirect failed');
      return await res3.text();
    }
  }
  return await res2.text();
}

export async function printerCommand(p: PrinterConnection, command: string) {
  return req(p, '/api/printer/command', { method: 'POST', body: JSON.stringify({ command }) });
}

export async function sendGcodeCommands(p: PrinterConnection, commands: string[]) {
  return req(p, '/api/printer/command', { method: 'POST', body: JSON.stringify({ commands }) });
}

export async function jog(p: PrinterConnection, axis: 'x' | 'y' | 'z', amount: number, speed?: number) {
  const cmd: any = { command: 'jog', [axis]: amount };
  if (speed) cmd.speed = speed;
  return req(p, '/api/printer/printhead', { method: 'POST', body: JSON.stringify(cmd) });
}

export async function home(p: PrinterConnection, axes: string[]) {
  return req(p, '/api/printer/printhead', { method: 'POST', body: JSON.stringify({ command: 'home', axes }) });
}

export async function extrude(p: PrinterConnection, amount: number, speed?: number) {
  const cmd: any = { command: 'extrude', amount };
  if (speed) cmd.speed = speed;
  return req(p, '/api/printer/tool', { method: 'POST', body: JSON.stringify(cmd) });
}

export async function setToolTemp(p: PrinterConnection, tool: string, temp: number) {
  const target: any = {};
  target[tool] = temp;
  return req(p, '/api/printer/tool', { method: 'POST', body: JSON.stringify({ command: 'target', targets: target }) });
}

export async function setBedTemp(p: PrinterConnection, temp: number) {
  return req(p, '/api/printer/bed', { method: 'POST', body: JSON.stringify({ command: 'target', target: temp }) });
}

export async function setFanSpeed(p: PrinterConnection, speedPercent: number) {
  if (speedPercent <= 0) {
    return printerCommand(p, 'M107');
  }
  const pwm = Math.min(255, Math.max(0, Math.round((speedPercent / 100) * 255)));
  return printerCommand(p, `M106 S${pwm}`);
}

export async function disableSteppers(p: PrinterConnection) {
  return printerCommand(p, 'M84');
}

export async function emergencyStop(p: PrinterConnection) {
  return printerCommand(p, 'M112');
}

export async function connectPrinter(p: PrinterConnection) {
  return req(p, '/api/connection', { method: 'POST', body: JSON.stringify({ command: 'connect' }) });
}

export async function disconnectPrinter(p: PrinterConnection) {
  return req(p, '/api/connection', { method: 'POST', body: JSON.stringify({ command: 'disconnect' }) });
}

// ----------------------------------------------------
// OctoPrint Application Keys Authentication Protocol
// ----------------------------------------------------

export async function probeAppKeys(host: string, port: number, useHttps = false): Promise<boolean> {
  const proto = useHttps ? 'https' : 'http';
  const urls = [
    `${proto}://${host}:${port}/plugin/appkeys/probe`,
    `${proto}://${host}:${port}/api/plugin/appkeys/probe`,
  ];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, { method: 'GET', signal: controller.signal, headers: { Accept: '*/*' } as any });
      clearTimeout(t);
      if (res.status === 204 || res.status === 200) return true;
    } catch {}
  }
  return false;
}

export async function requestAppKey(
  host: string,
  port: number,
  appName = 'OctoPulse',
  useHttps = false
): Promise<{ app_token: string }> {
  const proto = useHttps ? 'https' : 'http';
  const endpoints = [
    `${proto}://${host}:${port}/plugin/appkeys/request`,
    `${proto}://${host}:${port}/api/plugin/appkeys/request`,
  ];

  // Quick pre-flight probe to give a helpful error if plugin is disabled (common on fresh OctoPrint installs where Access Control bypass is enabled)
  // We don't strictly require probe success, just note it for error messaging
  let probeOk: boolean | null = null;
  try { probeOk = await probeAppKeys(host, port, useHttps); } catch {}

  let lastError: any = null;

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    try {
      let res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ app: appName }),
        signal: controller.signal,
      });

      // Handle 409 Conflict: A request with this app name is already pending on OctoPrint
      if (res.status === 409) {
        const txt = await res.text().catch(() => '');
        try {
          const j = JSON.parse(txt);
          if (j.app_token) {
            clearTimeout(t);
            return { app_token: j.app_token };
          }
        } catch {}
        const loc = res.headers.get('Location') || res.headers.get('location') || '';
        if (loc) {
          const m = loc.match(/\/([^\/]+)\/?$/);
          if (m) {
            clearTimeout(t);
            return { app_token: m[1] };
          }
        }

        // Re-request with a random suffix so OctoPrint immediately issues a fresh pending authorization
        const uniqueName = `${appName} (${Math.floor(1000 + Math.random() * 9000)})`;
        const retryRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ app: uniqueName }),
          signal: controller.signal,
        });
        if (retryRes.status === 201 || retryRes.status === 202 || retryRes.ok) {
          res = retryRes;
        }
      }

      if (res.status === 201 || res.status === 202 || res.ok) {
        clearTimeout(t);
        const loc = res.headers.get('Location') || res.headers.get('location') || '';
        let appToken = '';
        if (loc) {
          const m = loc.match(/\/([^\/]+)\/?$/);
          if (m) appToken = m[1];
        }
        try {
          const json = await res.json();
          if (json && json.app_token) appToken = json.app_token;
        } catch {}

        if (appToken) {
          return { app_token: appToken };
        }
      }

      const errTxt = await res.text().catch(() => '');
      const hint = probeOk === false ? ' (Application Keys probe failed — is Access Control enabled and the Application Keys plugin active in OctoPrint Settings?)' : '';
      lastError = new Error(`AppKeys request returned ${res.status}: ${errTxt.slice(0, 140)}${hint}`);
    } catch (e: any) {
      lastError = e;
    } finally {
      clearTimeout(t);
    }
  }

  // Provide friendlier guidance when no OctoPrint is reachable
  if (lastError && lastError.message && lastError.message.includes('Network request failed')) {
    throw new Error(`Cannot reach ${host}:${port} over ${proto.toUpperCase()}. Ensure phone and OctoPrint are on the same Wi-Fi, port is correct, and firewall allows the connection. (${lastError.message})`);
  }
  throw lastError || new Error(`Could not request Application Key from ${host}:${port}. Is this an OctoPrint server with Application Keys enabled?`);
}

export type PollResult = {
  status: 'pending' | 'approved' | 'denied' | 'error';
  api_key: string | null;
  message?: string;
};

export async function pollAppKey(
  host: string,
  port: number,
  appToken: string,
  useHttps = false
): Promise<PollResult> {
  const proto = useHttps ? 'https' : 'http';
  const urls = [
    `${proto}://${host}:${port}/plugin/appkeys/request/${encodeURIComponent(appToken)}`,
    `${proto}://${host}:${port}/api/plugin/appkeys/request/${encodeURIComponent(appToken)}`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(t);

      // 202 Accepted: Still waiting for user approval on OctoPrint
      if (res.status === 202) {
        return { status: 'pending', api_key: null };
      }

      // 200 OK: User clicked APPROVE
      if (res.status === 200 || res.status === 201) {
        const data = await res.json().catch(() => null);
        if (data && data.api_key) {
          return { status: 'approved', api_key: data.api_key };
        }
        if (typeof data === 'string' && data.length > 8) {
          return { status: 'approved', api_key: data.trim() };
        }
      }

      // 404 Not Found: User clicked DENY or token expired
      if (res.status === 404) {
        return { status: 'denied', api_key: null, message: 'Access was denied on OctoPrint.' };
      }

      if (res.status === 401 || res.status === 403) {
        return { status: 'denied', api_key: null, message: 'Unauthorized by OctoPrint.' };
      }
    } catch (e) {
      // Continue to fallback
    }
  }

  return { status: 'pending', api_key: null };
}
