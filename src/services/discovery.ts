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

function isOctoPrintBody(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes('octoprint') || t.includes("you don't have the permission") || t.includes('api key') || t.includes('octoprint login') || t.includes('werkzeug');
}
function isOctoPrintHeaders(headers: Headers): boolean {
  const server = (headers.get('server') || '').toLowerCase();
  const powered = (headers.get('x-powered-by') || '').toLowerCase();
  const allow = (headers.get('access-control-allow-headers') || '').toLowerCase();
  const clacks = headers.get('x-clacks-overhead') || '';
  if (clacks.includes('Terry Pratchett') || clacks.includes('GNU')) return true;
  if (server.includes('octoprint') || server.includes('werkzeug') || server.includes('python') || server.includes('tornado')) return true;
  if (allow.includes('x-api-key')) return true;
  if (powered.includes('octoprint')) return true;
  return false;
}

// Strict probe: only return result if we can verify it's OctoPrint
async function probe(ip: string, port: number, timeoutMs = 1800): Promise<DiscoveryResult | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const base = `http://${ip}:${port}`;
  try {
    // 1) Try /api/version with invalid key - OctoPrint returns 401 with JSON error, or 200 with version
    try {
      const res = await fetch(`${base}/api/version`, { signal: controller.signal, headers: { 'X-Api-Key': 'invalid-test-key-12345' } as any });
      const bodyPreview = await res.clone().text().catch(()=> '');
      const isOcto = isOctoPrintBody(bodyPreview) || isOctoPrintHeaders(res.headers);
      if (res.ok) {
        const j = await res.json().catch(()=>null);
        if (j && (j.api || j.server || j.text || j.version)) {
          if (isOcto || j.api || j.server) {
            return { host: ip, port, name: j.server || j.text || `OctoPrint @ ${ip}`, version: j.api || j.text || j.version, via: 'scan' };
          }
        }
      } else if (res.status === 401) {
        if (isOcto) {
          return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, version: 'needs API key', via: 'scan' };
        }
        try {
          const j = JSON.parse(bodyPreview);
          if (j && (j.error || '').toLowerCase().includes('permission') || (j.error || '').toLowerCase().includes('api')) {
            return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, version: 'needs API key', via: 'scan' };
          }
        } catch {}
      } else if (res.status === 403) {
        if (isOcto) return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, via: 'scan' };
      }
    } catch {}
    try {
      const resProbe = await fetch(`${base}/plugin/appkeys/probe`, { signal: controller.signal });
      if (resProbe.status === 204 || resProbe.status === 200) {
        return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, via: 'scan' };
      }
    } catch {}
    try {
      const res2 = await fetch(`${base}/`, { signal: controller.signal });
      if (res2.ok) {
        const txt = await res2.text().catch(()=> '');
        const lower = txt.toLowerCase();
        if (lower.includes('octoprint')) {
          if (lower.includes('<title') && lower.includes('octoprint')) {
            const m = txt.match(/<title>(.*?)<\/title>/i);
            const title = m ? m[1].trim() : `OctoPrint @ ${ip}`;
            if (title.toLowerCase().includes('octoprint') || lower.includes('octoprint login')) {
              return { host: ip, port, name: title.slice(0,48), via: 'scan' };
            }
          } else if (lower.includes('octoprint')) {
            if (lower.includes('octoprint') && (lower.includes('login') || lower.includes('octoprint'))) {
              const m = txt.match(/<title>(.*?)<\/title>/i);
              const title = m ? m[1].trim() : `OctoPrint @ ${ip}`;
              return { host: ip, port, name: title.slice(0,48), via: 'scan' };
            }
          }
        }
      }
    } catch {}
    try {
      const res3 = await fetch(`${base}/api/settings`, { signal: controller.signal });
      if (res3.status === 401) {
        const body = await res3.clone().text().catch(()=> '');
        if (isOctoPrintBody(body) || isOctoPrintHeaders(res3.headers)) {
          return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, via: 'scan' };
        }
      }
    } catch {}
    return null;
  } catch { return null; }
  finally { clearTimeout(t); }
}

async function probeMdnsHosts(): Promise<DiscoveryResult[]> {
  const hosts = ['octopi.local', 'octoprint.local', 'octopi', 'octoprint'];
  const ports = [5000, 80, 8000, 8080];
  const results: DiscoveryResult[] = [];
  for (const h of hosts) {
    for (const p of ports) {
      const r = await probe(h, p, 2200).catch(()=>null);
      if (r) results.push({ ...r, host: h, via: 'mdns' as const });
    }
  }
  return results;
}

export async function scanNetwork(onProgress?: (found: DiscoveryResult, scanned: number, total: number)=>void, ports = [5000,80,8000,8080, 8081, 5001]): Promise<DiscoveryResult[]> {
  const ip = await getLocalIp();
  const results: DiscoveryResult[] = [];
  const foundSet = new Set<string>();
  const push = (r: DiscoveryResult) => {
    const key = `${r.host}:${r.port}`;
    if (!foundSet.has(key)) { foundSet.add(key); results.push(r); }
  };
  // Start mDNS scan in parallel while preparing subnet scan; don't block subnet if mDNS slow
  const mdnsPromise = probeMdnsHosts().catch(()=>[] as DiscoveryResult[]);
  const mdns = await Promise.race([mdnsPromise, new Promise<DiscoveryResult[]>(res=> setTimeout(()=> res([]), 3500))]);
  mdns.forEach(r => { push(r); onProgress?.(r, results.length, 0); });

  const scanBase = async (base: string) => {
    const queue: { ip: string, port: number }[] = [];
    for (let i=1;i<255;i++) {
      const target = `${base}.${i}`;
      for (const p of ports) queue.push({ ip: target, port: p });
    }
    const concurrency = 75;
    let scanned = 0;
    const total = queue.length + mdns.length;
    for (let i=0;i<queue.length;i+=concurrency) {
      const chunk = queue.slice(i, i+concurrency);
      const res = await Promise.all(chunk.map(q => probe(q.ip, q.port, 1500).then(r=>({r, q})).catch(()=>({r:null, q}))));
      for (const { r } of res) {
        scanned++;
        if (r) { push(r); onProgress?.(r, scanned, total); }
      }
      await new Promise(r=> setTimeout(r, 0));
    }
  };

  if (!ip || ip === '0.0.0.0') {
    for (const base of ['192.168.1','192.168.0','10.0.0']) {
      await scanBase(base);
    }
    return results;
  }
  const parts = ip.split('.');
  const base = parts.slice(0,3).join('.');
  await scanBase(base);
  if (results.length === 0) {
    const fallbackBases = ['192.168.1','192.168.0','10.0.0'].filter(b=> b!==base);
    for (const b of fallbackBases.slice(0,1)) {
      const queue: { ip: string, port: number }[] = [];
      for (let i=1;i<50;i++) for (const p of [5000,80]) queue.push({ ip: `${b}.${i}`, port: p });
      const res = await Promise.all(queue.map(q => probe(q.ip, q.port, 1500).catch(()=>null)));
      res.forEach(r=> { if (r) push(r); });
      if (results.length>0) break;
    }
  }
  return results;
}

export async function ssdpDiscover(): Promise<DiscoveryResult[]> { return []; }
export async function mdnsDiscover(): Promise<DiscoveryResult[]> { return []; }

export async function discoverAll(onProgress?: any): Promise<DiscoveryResult[]> {
  const [scan] = await Promise.all([ scanNetwork(onProgress) ]);
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

export async function quickCheck(host: string, port: number, useHttps=false) {
  const proto = useHttps ? 'https' : 'http';
  try {
    const res = await fetch(`${proto}://${host}:${port}/api/version`, { headers: { 'X-Api-Key': 'test' } as any });
    if (res.ok) {
      const j = await res.json().catch(()=>null);
      return !!(j && (j.api || j.server));
    }
    if (res.status===401) {
      const txt = await res.text().catch(()=> '');
      return txt.toLowerCase().includes('octoprint') || txt.toLowerCase().includes('permission');
    }
    return false;
  } catch { return false; }
}
