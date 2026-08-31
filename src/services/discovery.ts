import { DiscoveryResult, PrinterConnection } from '../types';
import * as Network from 'expo-network';

async function getLocalIp(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    return ip;
  } catch { return null; }
}

// Robust probe: try multiple endpoints, treat 401 as "found but needs key"
async function probe(ip: string, port: number, timeoutMs = 1800): Promise<DiscoveryResult | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const base = `http://${ip}:${port}`;
  try {
    // 1) Try /api/version - OctoPrint returns 401 without key, 200 with key, 200 with version JSON. Treat 401 as found.
    try {
      const res = await fetch(`${base}/api/version`, { signal: controller.signal, headers: { 'X-Api-Key': 'invalid' } as any });
      if (res.status === 401) {
        // Check if it's really OctoPrint by trying /api/settings or / without auth
        return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, version: 'needs API key', via: 'scan' };
      }
      if (res.ok) {
        const j = await res.json().catch(()=>null);
        if (j && (j.api || j.server || j.text || j.version)) {
          return { host: ip, port, name: j.server || j.text || `OctoPrint @ ${ip}`, version: j.api || j.text || j.version, via: 'scan' };
        }
      }
    } catch {}
    // 2) Try root / - should return HTML with "OctoPrint" even without auth
    try {
      const res2 = await fetch(`${base}/`, { signal: controller.signal });
      if (res2.ok) {
        const txt = await res2.text().catch(()=> '');
        if (txt.toLowerCase().includes('octoprint') || txt.includes('OctoPrint')) {
          // Try to extract title
          const m = txt.match(/<title>(.*?)<\/title>/i);
          const title = m ? m[1].trim() : `OctoPrint @ ${ip}`;
          return { host: ip, port, name: title.slice(0,40), via: 'scan' };
        }
      }
    } catch {}
    // 3) Try /api/settings with same 401 handling
    try {
      const res3 = await fetch(`${base}/api/settings`, { signal: controller.signal });
      if (res3.status === 401) {
        return { host: ip, port, name: `OctoPrint @ ${ip}:${port}`, via: 'scan' };
      }
    } catch {}
    return null;
  } catch { return null; }
  finally { clearTimeout(t); }
}

// Also try mDNS hostnames like octopi.local, octoprint.local
async function probeMdnsHosts(): Promise<DiscoveryResult[]> {
  const hosts = ['octopi.local', 'octoprint.local', 'octopi', 'octoprint'];
  const ports = [5000, 80, 8000, 8080];
  const results: DiscoveryResult[] = [];
  for (const h of hosts) {
    for (const p of ports) {
      const r = await probe(h, p, 2000).catch(()=>null);
      if (r) {
        // Keep original host string, not IP
        results.push({ ...r, host: h, via: 'mdns' as const });
      }
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
    if (!foundSet.has(key)) {
      foundSet.add(key);
      results.push(r);
    }
  };

  // Always try mDNS first (fast)
  const mdns = await probeMdnsHosts().catch(()=>[]);
  mdns.forEach(r => { push(r); onProgress?.(r, results.length, 0); });

  const scanBase = async (base: string) => {
    const queue: { ip: string, port: number }[] = [];
    for (let i=1;i<255;i++) {
      const target = `${base}.${i}`;
      for (const p of ports) queue.push({ ip: target, port: p });
    }
    const concurrency = 60;
    let scanned = 0;
    const total = queue.length + mdns.length;
    for (let i=0;i<queue.length;i+=concurrency) {
      const chunk = queue.slice(i, i+concurrency);
      const res = await Promise.all(chunk.map(q => probe(q.ip, q.port).then(r=>({r, q})).catch(()=>({r:null, q}))));
      for (const { r } of res) {
        scanned++;
        if (r) { push(r); onProgress?.(r, scanned, total); }
        else if (scanned % 50 === 0) onProgress?.(null as any, scanned, total);
      }
      await new Promise(r=> setTimeout(r, 5));
    }
  };

  if (!ip || ip === '0.0.0.0') {
    // Try common subnets
    for (const base of ['192.168.1','192.168.0','192.168.68','10.0.0','10.0.1','172.16.0']) {
      await scanBase(base);
    }
    return results;
  }

  // Try primary subnet first
  const parts = ip.split('.');
  const base = parts.slice(0,3).join('.');
  await scanBase(base);

  // If nothing found, try other common subnets as fallback (quick scan of .1, .10, .100 etc)
  if (results.length === 0) {
    const fallbackBases = ['192.168.1','192.168.0','192.168.4','192.168.68','10.0.0'].filter(b=> b!==base);
    for (const b of fallbackBases.slice(0,2)) {
      // Only scan .1-30 for fallback to be fast
      const queue: { ip: string, port: number }[] = [];
      for (let i=1;i<40;i++) for (const p of [5000,80]) queue.push({ ip: `${b}.${i}`, port: p });
      const res = await Promise.all(queue.map(q => probe(q.ip, q.port, 1200).catch(()=>null)));
      res.forEach(r=> { if (r) push(r); });
      if (results.length>0) break;
    }
  }

  return results;
}

export async function ssdpDiscover(): Promise<DiscoveryResult[]> { return []; }
export async function mdnsDiscover(): Promise<DiscoveryResult[]> { return []; }

export async function discoverAll(onProgress?: any): Promise<DiscoveryResult[]> {
  const [scan] = await Promise.all([
    scanNetwork(onProgress),
  ]);
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
    return res.ok || res.status===401;
  } catch { return false; }
}
