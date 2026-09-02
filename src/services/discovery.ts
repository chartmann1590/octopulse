import { DiscoveryResult, PrinterConnection } from '../types';

let Network: any = null;
try { Network = require('expo-network'); } catch {}

async function getLocalIp(): Promise<string | null> {
  try {
    if (Network && Network.getIpAddressAsync) {
      const ip = await Network.getIpAddressAsync();
      return ip;
    }
    return null;
  } catch { return null; }
}

function hasOctoPrintClacks(headers: Headers): boolean {
  const clacks = (headers.get('x-clacks-overhead') || '').toLowerCase();
  return clacks.includes('terry pratchett') || clacks.includes('gnu');
}

function hasOctoPrintCookies(headers: Headers): boolean {
  const cookie = (headers.get('set-cookie') || '').toLowerCase();
  return cookie.includes('csrf_token_p') || cookie.includes('session_p') || cookie.includes('octoprint');
}

function isStrictOctoPrintHtml(html: string): boolean {
  const lower = html.toLowerCase();
  if (lower.includes('<title>octoprint') || lower.includes('octoprint login') || lower.includes('window.octoprint_viewmodels') || lower.includes('static/webassets/packed/client.js')) {
    return true;
  }
  return false;
}

// Strict probe: only returns a DiscoveryResult if the target is genuinely OctoPrint
async function probe(ip: string, port: number, timeoutMs = 1500): Promise<DiscoveryResult | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const base = `http://${ip}:${port}`;
  try {
    // 1) Test /api/version
    try {
      const res = await fetch(`${base}/api/version`, { signal: controller.signal });
      const hasClacks = hasOctoPrintClacks(res.headers);
      const hasCookies = hasOctoPrintCookies(res.headers);
      const body = await res.text().catch(() => '');

      if (res.ok) {
        try {
          const j = JSON.parse(body);
          if (j && (typeof j.server === 'string' && j.server.toLowerCase().includes('octoprint') || typeof j.text === 'string' && j.text.toLowerCase().includes('octoprint') || (j.api && hasClacks))) {
            return {
              host: ip,
              port,
              name: j.server || j.text || `OctoPrint @ ${ip}`,
              version: j.api || j.version || 'Online',
              via: 'scan'
            };
          }
        } catch {}
      }

      // If auth required (HTTP 401 or 403)
      if (res.status === 401 || res.status === 403) {
        if (hasClacks || hasCookies) {
          return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, version: 'Auth required', via: 'scan' };
        }
        try {
          const j = JSON.parse(body);
          if (j && typeof j.error === 'string' && j.error.includes("You don't have the permission to access the requested resource")) {
            return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, version: 'Auth required', via: 'scan' };
          }
        } catch {}
      }
    } catch {}

    // 2) Test /plugin/appkeys/probe (OctoPrint appkeys plugin responds specifically with 204 No Content)
    try {
      const resProbe = await fetch(`${base}/plugin/appkeys/probe`, { signal: controller.signal });
      if (resProbe.status === 204 && (hasOctoPrintClacks(resProbe.headers) || hasOctoPrintCookies(resProbe.headers))) {
        return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, via: 'scan' };
      }
    } catch {}

    // 3) Test root UI / or /login
    try {
      const resRoot = await fetch(`${base}/`, { signal: controller.signal, redirect: 'follow' });
      if (hasOctoPrintClacks(resRoot.headers) || hasOctoPrintCookies(resRoot.headers)) {
        return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, via: 'scan' };
      }
      if (resRoot.ok || resRoot.status === 302 || resRoot.status === 401 || resRoot.status === 403) {
        const txt = await resRoot.text().catch(() => '');
        if (isStrictOctoPrintHtml(txt)) {
          const m = txt.match(/<title>(.*?)<\/title>/i);
          const title = m ? m[1].trim() : `OctoPrint @ ${ip}`;
          return { host: ip, port, name: title.slice(0, 48), via: 'scan' };
        }
      }
    } catch {}

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function probeMdnsHosts(): Promise<DiscoveryResult[]> {
  const hosts = ['octopi.local', 'octoprint.local', 'octopi', 'octoprint'];
  const ports = [5000, 80, 8000, 8080];
  const results: DiscoveryResult[] = [];
  for (const h of hosts) {
    for (const p of ports) {
      const r = await probe(h, p, 1800).catch(() => null);
      if (r) results.push({ ...r, host: h, via: 'mdns' as const });
    }
  }
  return results;
}

export async function scanNetwork(
  onProgress?: (found: DiscoveryResult, scanned: number, total: number) => void,
  ports = [5000, 80, 8000, 8080, 8081, 5001]
): Promise<DiscoveryResult[]> {
  const ip = await getLocalIp();
  const results: DiscoveryResult[] = [];
  const foundSet = new Set<string>();
  const push = (r: DiscoveryResult) => {
    const key = `${r.host}:${r.port}`;
    if (!foundSet.has(key)) {
      foundSet.add(key);
      results.push(r);
    }
  };

  // Start mDNS probe in background
  const mdnsPromise = probeMdnsHosts().catch(() => [] as DiscoveryResult[]);
  const mdns = await Promise.race([mdnsPromise, new Promise<DiscoveryResult[]>(res => setTimeout(() => res([]), 2500))]);
  mdns.forEach(r => {
    push(r);
    onProgress?.(r, results.length, 0);
  });

  const scanBase = async (base: string) => {
    const queue: { ip: string; port: number }[] = [];
    for (let i = 1; i < 255; i++) {
      const target = `${base}.${i}`;
      for (const p of ports) queue.push({ ip: target, port: p });
    }
    const concurrency = 60;
    let scanned = 0;
    const total = queue.length + mdns.length;
    for (let i = 0; i < queue.length; i += concurrency) {
      const chunk = queue.slice(i, i + concurrency);
      const res = await Promise.all(
        chunk.map(q => probe(q.ip, q.port, 1500).then(r => ({ r, q })).catch(() => ({ r: null, q })))
      );
      for (const { r } of res) {
        scanned++;
        if (r) {
          push(r);
          onProgress?.(r, scanned, total);
        }
      }
      await new Promise(r => setTimeout(r, 0));
    }
  };

  if (!ip || ip === '0.0.0.0') {
    for (const base of ['192.168.1', '192.168.0', '10.0.0']) {
      await scanBase(base);
    }
    return results;
  }
  const parts = ip.split('.');
  const base = parts.slice(0, 3).join('.');
  await scanBase(base);
  return results;
}

export async function ssdpDiscover(): Promise<DiscoveryResult[]> { return []; }
export async function mdnsDiscover(): Promise<DiscoveryResult[]> { return []; }

export async function discoverAll(onProgress?: any): Promise<DiscoveryResult[]> {
  const [scan] = await Promise.all([scanNetwork(onProgress)]);
  const map = new Map<string, DiscoveryResult>();
  for (const r of scan) map.set(`${r.host}:${r.port}`, r);
  return Array.from(map.values());
}

export function discoveryToPrinter(d: DiscoveryResult, apiKey: string, name?: string): PrinterConnection {
  return {
    id: `${d.host}_${d.port}_${Date.now()}`,
    name: name || d.name || `OctoPrint ${d.host}`,
    host: d.host,
    port: d.port,
    useHttps: false,
    apiKey,
    createdAt: Date.now(),
  };
}

export async function quickCheck(host: string, port: number, useHttps = false) {
  const proto = useHttps ? 'https' : 'http';
  try {
    const res = await fetch(`${proto}://${host}:${port}/api/version`, { headers: { 'X-Api-Key': 'test' } as any });
    if (hasOctoPrintClacks(res.headers) || hasOctoPrintCookies(res.headers)) return true;
    if (res.ok) {
      const j = await res.json().catch(() => null);
      return !!(j && (j.api || j.server));
    }
    if (res.status === 401 || res.status === 403) {
      const txt = await res.text().catch(() => '');
      return txt.toLowerCase().includes('octoprint') || txt.toLowerCase().includes('permission');
    }
    return false;
  } catch {
    return false;
  }
}
