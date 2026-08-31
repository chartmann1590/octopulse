import { DiscoveryResult, PrinterConnection } from '../types';
import { getVersion } from './octoprint';
import * as Network from 'expo-network';

async function getLocalIp(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    return ip;
  } catch { return null; }
}

function ipToInt(ip: string) {
  return ip.split('.').reduce((acc, o) => (acc << 8) + parseInt(o,10), 0) >>> 0;
}
function intToIp(n: number) {
  return [(n>>>24)&255, (n>>>16)&255, (n>>>8)&255, n&255].join('.');
}

// Very fast lightweight probe for OctoPrint: try GET /api/version with timeout
async function probe(ip: string, port: number, timeoutMs = 1200): Promise<DiscoveryResult | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://${ip}:${port}/api/version`, { signal: controller.signal });
    if (!res.ok) return null;
    const j = await res.json().catch(()=>null);
    if (j && (j.api || j.server || j.text)) {
      return { host: ip, port, name: j.server || `OctoPrint @ ${ip}`, version: j.api || j.text, via: 'scan' };
    }
    return null;
  } catch { return null; }
  finally { clearTimeout(t); }
}

export async function scanNetwork(onProgress?: (found: DiscoveryResult, scanned: number, total: number)=>void, ports = [5000,80,8000,8080]): Promise<DiscoveryResult[]> {
  const ip = await getLocalIp();
  const results: DiscoveryResult[] = [];
  if (!ip || ip === '0.0.0.0') {
    // fallback: try common gateway guess 192.168.1.x
    const base = '192.168.1';
    const total = 254 * ports.length;
    let scanned = 0;
    const promises: Promise<void>[] = [];
    for (let i=1;i<255;i++) {
      for (const port of ports) {
        promises.push(
          probe(`${base}.${i}`, port).then(r => {
            scanned++;
            if (r) { results.push(r); onProgress?.(r, scanned, total); }
          })
        );
        if (promises.length > 40) {
          await Promise.all(promises.splice(0,20));
        }
      }
    }
    await Promise.all(promises);
    return results;
  }
  // derive subnet /24
  const parts = ip.split('.');
  const base = parts.slice(0,3).join('.');
  const total = 254 * ports.length;
  let scanned = 0;
  const concurrency = 50;
  const queue: { ip: string, port: number }[] = [];
  for (let i=1;i<255;i++) {
    const target = `${base}.${i}`;
    if (target === ip) continue;
    for (const p of ports) queue.push({ ip: target, port: p });
  }
  // Also try self
  for (const p of ports) queue.unshift({ ip, port: p });

  for (let i=0;i<queue.length;i+=concurrency) {
    const chunk = queue.slice(i, i+concurrency);
    const res = await Promise.all(chunk.map(q => probe(q.ip, q.port).then(r=>({r, q}))));
    for (const { r } of res) {
      scanned += 1;
      if (r) { results.push(r); onProgress?.(r, scanned, total); }
    }
    // small delay to not flood
    await new Promise(r=> setTimeout(r, 10));
  }
  return results;
}

// SSDP M-SEARCH for OctoPrint (many OctoPis respond as upnp)
export async function ssdpDiscover(timeoutMs = 4000): Promise<DiscoveryResult[]> {
  // Expo doesn't have UDP multicast; we simulate by fetching known SSDP? Return empty but kept for API
  // In future use react-native-udp + dgram.
  return [];
}

// mDNS via expo-network? Expo doesn't expose mDNS, we simulate with scan + some bonjour hints
export async function mdnsDiscover(): Promise<DiscoveryResult[]> {
  return [];
}

export async function discoverAll(onProgress?: any): Promise<DiscoveryResult[]> {
  const [scan] = await Promise.all([
    scanNetwork(onProgress),
    ssdpDiscover().catch(()=>[]),
    mdnsDiscover().catch(()=>[]),
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
    const res = await fetch(`${proto}://${host}:${port}/api/version`, { headers: {} });
    return res.ok;
  } catch { return false; }
}
