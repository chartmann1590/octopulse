import React, { useMemo, useState, useEffect } from 'react';
import { AppText } from './AppText';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, G, Line, Rect, Circle } from 'react-native-svg';
import { theme } from '../theme';
import { PrinterStatus } from '../types';

type Props = {
  gcode: string;
  status?: PrinterStatus;
  maxLayers?: number;
};

type Layer = { z: number; paths: { d: string; isExtrude: boolean }[] };

function parseGCode(text: string, maxLayers = 150): Layer[] {
  if (!text) return [];
  // Cap text size to 1.5MB for fast parsing on mobile JS thread
  const safeText = text.length > 1500000 ? text.slice(0, 1500000) : text;
  const lines = safeText.split('\n');
  let x = 0, y = 0, z = 0, e = 0;
  let currentZ = 0;
  let layers: Layer[] = [];
  let currentLayer: Layer = { z: 0, paths: [] };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const semiIdx = raw.indexOf(';');
    const line = (semiIdx >= 0 ? raw.slice(0, semiIdx) : raw).trim();
    if (!line || (!line.startsWith('G0') && !line.startsWith('G1') && !line.startsWith('g0') && !line.startsWith('g1'))) continue;

    const parts = line.split(/\s+/);
    let nx = x, ny = y, nz = z, ne = e;
    let extrude = false;

    for (let j = 0; j < parts.length; j++) {
      const p = parts[j];
      if (!p) continue;
      const code = p[0].toUpperCase();
      const val = parseFloat(p.slice(1));
      if (isNaN(val)) continue;
      if (code === 'X') nx = val;
      else if (code === 'Y') ny = val;
      else if (code === 'Z') nz = val;
      else if (code === 'E') {
        ne = val;
        extrude = ne > e;
      }
    }

    if (Math.abs(nz - currentZ) > 0.001) {
      if (currentLayer.paths.length > 0) {
        layers.push(currentLayer);
        if (layers.length >= maxLayers) break;
      }
      currentZ = nz;
      currentLayer = { z: nz, paths: [] };
    }

    if (nx !== x || ny !== y) {
      if (currentLayer.paths.length < 800) {
        currentLayer.paths.push({ d: `M ${x.toFixed(2)} ${y.toFixed(2)} L ${nx.toFixed(2)} ${ny.toFixed(2)}`, isExtrude: extrude });
      }
    }
    x = nx; y = ny; z = nz; e = ne;
  }

  if (currentLayer.paths.length > 0 && layers.length < maxLayers) {
    layers.push(currentLayer);
  }

  return layers.length ? layers : [{ z: 0, paths: [] }];
}

export function GCodeViewer({ gcode, status, maxLayers = 200 }: Props) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const layers = useMemo(() => parseGCode(gcode), [gcode]);

  const isPrinting = !!(status?.stateFlags?.printing || status?.state?.toLowerCase().includes('printing'));
  const completion = status?.job?.progress?.completion || 0;

  const liveLayerIndex = useMemo(() => {
    if (!isPrinting || layers.length === 0) return 0;
    return Math.min(layers.length - 1, Math.floor((completion / 100) * layers.length));
  }, [isPrinting, layers.length, completion]);

  const [layerIdx, setLayerIdx] = useState(liveLayerIndex);
  const [autoTrack, setAutoTrack] = useState<boolean>(isPrinting);

  useEffect(() => {
    if (autoTrack && isPrinting) {
      setLayerIdx(liveLayerIndex);
    }
  }, [autoTrack, isPrinting, liveLayerIndex]);

  const currentLayers = useMemo(() => layers.slice(0, layerIdx + 1), [layers, layerIdx]);
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const l of layers) {
      for (const p of l.paths) {
        const coords = p.d.match(/[-0-9.]+/g)?.map(Number) || [];
        for (let i = 0; i < coords.length; i += 2) {
          const cx = coords[i], cy = coords[i + 1];
          if (!isNaN(cx) && !isNaN(cy)) {
            minX = Math.min(minX, cx);
            maxX = Math.max(maxX, cx);
            minY = Math.min(minY, cy);
            maxY = Math.max(maxY, cy);
          }
        }
      }
    }
    if (!isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 200;
      maxY = 200;
    }
    const w = maxX - minX || 200, h = maxY - minY || 200;
    const pad = Math.max(w, h) * 0.08;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad, w: w + pad * 2, h: h + pad * 2 };
  }, [layers]);

  const width = Dimensions.get('window').width - 32;
  const height = width * 0.9;
  const viewBox = `${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`;

  const layer = layers[layerIdx];
  const lastPath = layer?.paths[layer?.paths.length - 1]?.d;
  const lastCoords = lastPath?.match(/[-0-9.]+/g)?.map(Number) || [];
  const nozzleX = lastCoords.length >= 4 ? lastCoords[2] : (bounds.minX + bounds.w / 2);
  const nozzleY = lastCoords.length >= 4 ? lastCoords[3] : (bounds.minY + bounds.h / 2);

  return (
    <View style={styles.container}>
      {/* Live printing indicator header */}
      {isPrinting && (
        <View style={styles.liveBanner}>
          <View style={styles.liveBannerLeft}>
            <View style={styles.livePulseDot} />
            <AppText style={styles.liveBannerText}>
              LIVE PRINTING • {completion.toFixed(1)}% (Layer {liveLayerIndex + 1}/{layers.length})
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => {
              const next = !autoTrack;
              setAutoTrack(next);
              if (next) setLayerIdx(liveLayerIndex);
            }}
            style={[styles.trackBtn, autoTrack && styles.trackBtnActive]}>
            <AppText style={[styles.trackBtnText, autoTrack && styles.trackBtnTextActive]}>
              {autoTrack ? '⚡ Auto-Tracking' : 'Snap to Live'}
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.toolbar}>
        <View style={styles.modeSwitch}>
          <TouchableOpacity onPress={() => setMode('2d')} style={[styles.modeBtn, mode === '2d' && styles.modeBtnActive]}>
            <AppText style={[styles.modeText, mode === '2d' && styles.modeTextActive]}>2D</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('3d')} style={[styles.modeBtn, mode === '3d' && styles.modeBtnActive]}>
            <AppText style={[styles.modeText, mode === '3d' && styles.modeTextActive]}>3D Preview</AppText>
          </TouchableOpacity>
        </View>
        <AppText style={styles.layerInfo}>
          Layer {layerIdx + 1}/{layers.length} • Z {layer?.z.toFixed(2) ?? '0.00'}mm
        </AppText>
      </View>

      <View style={[styles.canvasWrap, { height }]}>
        {mode === '2d' ? (
          <Svg width={width} height={height} viewBox={viewBox}>
            <Rect x={bounds.minX} y={bounds.minY} width={bounds.w} height={bounds.h} fill="#0b1220" stroke="#1e293b" strokeWidth={0.5} />
            {/* Grid */}
            <G opacity={0.15}>
              {Array.from({ length: 10 }).map((_, i) => {
                const x = bounds.minX + (bounds.w / 10) * i;
                const y = bounds.minY + (bounds.h / 10) * i;
                return (
                  <G key={i}>
                    <Line x1={x} y1={bounds.minY} x2={x} y2={bounds.maxY} stroke="#334155" strokeWidth={0.3} />
                    <Line x1={bounds.minX} y1={y} x2={bounds.maxX} y2={y} stroke="#334155" strokeWidth={0.3} />
                  </G>
                );
              })}
            </G>
            {/* Layers */}
            {currentLayers.map((l, idx) => (
              <G key={idx} opacity={idx === layerIdx ? 1 : 0.35 + (idx / layers.length) * 0.4}>
                {l.paths.map((p, i) => (
                  <Path
                    key={i}
                    d={p.d}
                    stroke={p.isExtrude ? (idx === layerIdx ? theme.colors.accent : theme.colors.primary) : '#475569'}
                    strokeWidth={p.isExtrude ? (idx === layerIdx ? 0.8 : 0.4) : 0.25}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </G>
            ))}

            {/* Live active nozzle toolhead indicator */}
            {isPrinting && layerIdx === liveLayerIndex && (
              <G>
                <Circle cx={nozzleX} cy={nozzleY} r={6} fill="rgba(56, 189, 248, 0.3)" />
                <Circle cx={nozzleX} cy={nozzleY} r={3} fill="#38bdf8" />
                <Line x1={nozzleX - 8} y1={nozzleY} x2={nozzleX + 8} y2={nozzleY} stroke="#38bdf8" strokeWidth={0.6} />
                <Line x1={nozzleX} y1={nozzleY - 8} x2={nozzleX} y2={nozzleY + 8} stroke="#38bdf8" strokeWidth={0.6} />
              </G>
            )}
          </Svg>
        ) : (
          // 3D Isometric View
          <Svg width={width} height={height} viewBox={viewBox}>
            <Rect x={bounds.minX} y={bounds.minY} width={bounds.w} height={bounds.h} fill="#0b1220" stroke="#1e293b" strokeWidth={0.5} />
            {layers.slice(0, layerIdx + 1).map((l, idx) => {
              const offset = idx * 0.4;
              const scale = 1 - idx * 0.0008;
              const isTop = idx === layerIdx;
              return (
                <G key={idx} opacity={0.3 + (idx / layers.length) * 0.7} transform={`translate(${offset * 2}, ${-offset}) scale(${scale})`}>
                  {l.paths.filter(p => p.isExtrude).map((p, i) => (
                    <Path
                      key={i}
                      d={p.d}
                      stroke={isTop ? theme.colors.accent : theme.colors.primary}
                      strokeWidth={isTop ? 0.8 : 0.4}
                      fill="none"
                      opacity={0.8}
                    />
                  ))}
                </G>
              );
            })}
          </Svg>
        )}
      </View>

      <View style={styles.sliderRow}>
        <TouchableOpacity
          onPress={() => {
            setAutoTrack(false);
            setLayerIdx(m => Math.max(0, m - 1));
          }}
          style={styles.stepBtn}>
          <AppText style={styles.stepText}>−</AppText>
        </TouchableOpacity>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${((layerIdx + 1) / Math.max(1, layers.length)) * 100}%` }]} />
        </View>
        <TouchableOpacity
          onPress={() => {
            setAutoTrack(false);
            setLayerIdx(m => Math.min(layers.length - 1, m + 1));
          }}
          style={styles.stepBtn}>
          <AppText style={styles.stepText}>+</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.layerScroll}>
        {layers.map((l, i) => {
          const isCurrent = i === layerIdx;
          const isLive = isPrinting && i === liveLayerIndex;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setAutoTrack(false);
                setLayerIdx(i);
              }}
              style={[
                styles.layerChip,
                isCurrent && styles.layerChipActive,
                isLive && !isCurrent && styles.layerChipLive,
              ]}>
              <AppText
                style={[
                  styles.layerChipText,
                  isCurrent && styles.layerChipTextActive,
                  isLive && !isCurrent && styles.layerChipTextLive,
                ]}>
                {isLive ? `● L${i + 1}` : `L${i + 1}`}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <AppText style={styles.stats}>
        {layers.reduce((a, l) => a + l.paths.filter(p => p.isExtrude).length, 0)} extrude segments • {bounds.w.toFixed(0)}×{bounds.h.toFixed(0)}mm bounds
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bgCardElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  liveBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  livePulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38bdf8' },
  liveBannerText: { color: theme.colors.primaryLight, fontSize: 11, fontWeight: '800' },
  trackBtn: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trackBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  trackBtnText: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700' },
  trackBtnTextActive: { color: '#fff' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bg,
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  modeBtnActive: { backgroundColor: theme.colors.primary },
  modeText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  modeTextActive: { color: '#fff' },
  layerInfo: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  canvasWrap: {
    backgroundColor: '#020617',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.bg,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sliderFill: { height: '100%', backgroundColor: theme.colors.accent },
  layerScroll: { marginTop: 10, maxHeight: 40 },
  layerChip: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  layerChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  layerChipLive: { borderColor: theme.colors.accent, backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  layerChipText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  layerChipTextActive: { color: '#fff' },
  layerChipTextLive: { color: theme.colors.accent },
  stats: { color: theme.colors.textDim, fontSize: 10, marginTop: 8, textAlign: 'center' },
});
