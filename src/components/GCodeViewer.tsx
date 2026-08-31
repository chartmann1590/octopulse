import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, G, Line, Rect } from 'react-native-svg';
import { theme } from '../theme';

type Props = {
  gcode: string;
  maxLayers?: number;
};

type Layer = { z: number; paths: { d: string; isExtrude: boolean }[] };

function parseGCode(text: string): Layer[] {
  const lines = text.split('\n');
  let x=0,y=0,z=0,e=0;
  let currentZ = 0;
  let layers: Layer[] = [{ z:0, paths: [] }];
  let pending = '';
  let hasExtrusion = false;

  function ensureLayer(nz: number) {
    if (Math.abs(nz - currentZ) > 0.001 || layers.length===0) {
      currentZ = nz;
      layers.push({ z: nz, paths: [] });
    }
  }

  for (const raw of lines) {
    const line = raw.split(';')[0].trim();
    if (!line) continue;
    if (line.startsWith('G0') || line.startsWith('G1')) {
      const parts = line.split(/\s+/);
      let nx=x, ny=y, nz=z, ne=e;
      let extrude = false;
      for (const p of parts) {
        if (p.startsWith('X')) nx = parseFloat(p.slice(1));
        if (p.startsWith('Y')) ny = parseFloat(p.slice(1));
        if (p.startsWith('Z')) nz = parseFloat(p.slice(1));
        if (p.startsWith('E')) { ne = parseFloat(p.slice(1)); extrude = ne > e; }
      }
      if (Math.abs(nz - z) > 0.001) ensureLayer(nz);
      if (!isNaN(nx) && !isNaN(ny)) {
        const layer = layers[layers.length-1];
        // build path d as move
        // we accumulate per extrude param
        // Simple: push line segment as path
        // Scale will be done later
        layer.paths.push({ d: `M ${x} ${y} L ${nx} ${ny}`, isExtrude: extrude });
      }
      x=nx; y=ny; z=nz; e=ne;
    }
  }
  // Filter empty layers
  layers = layers.filter(l=> l.paths.length>0);
  return layers.slice(0, 400); // limit
}

export function GCodeViewer({ gcode, maxLayers=200 }: Props) {
  const [mode, setMode] = useState<'2d'|'3d'>('2d');
  const [layerIdx, setLayerIdx] = useState(0);
  const layers = useMemo(()=> parseGCode(gcode), [gcode]);

  const currentLayers = useMemo(()=> layers.slice(0, layerIdx+1), [layers, layerIdx]);
  const bounds = useMemo(()=>{
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    for (const l of layers) for (const p of l.paths) {
      // extract coords from d
      const coords = p.d.match(/[-0-9.]+/g)?.map(Number) || [];
      for (let i=0;i<coords.length;i+=2) {
        const cx = coords[i], cy = coords[i+1];
        if (!isNaN(cx) && !isNaN(cy)) {
          minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        }
      }
    }
    if (!isFinite(minX)) { minX=0; minY=0; maxX=200; maxY=200; }
    const w = maxX-minX || 200, h = maxY-minY || 200;
    const pad = Math.max(w,h)*0.08;
    return { minX: minX-pad, minY: minY-pad, maxX: maxX+pad, maxY: maxY+pad, w: w+pad*2, h: h+pad*2 };
  }, [layers]);

  const width = Dimensions.get('window').width - 32;
  const height = width * 0.9;
  const viewBox = `${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`;

  const layer = layers[layerIdx];

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.modeSwitch}>
          <TouchableOpacity onPress={()=>setMode('2d')} style={[styles.modeBtn, mode==='2d' && styles.modeBtnActive]}><Text style={[styles.modeText, mode==='2d' && styles.modeTextActive]}>2D</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>setMode('3d')} style={[styles.modeBtn, mode==='3d' && styles.modeBtnActive]}><Text style={[styles.modeText, mode==='3d' && styles.modeTextActive]}>3D Preview</Text></TouchableOpacity>
        </View>
        <Text style={styles.layerInfo}>{layerIdx+1} / {layers.length} layers • Z {layer?.z.toFixed(2) ?? '0.00'}</Text>
      </View>

      <View style={[styles.canvasWrap, { height }]}>
        {mode==='2d' ? (
          <Svg width={width} height={height} viewBox={viewBox}>
            <Rect x={bounds.minX} y={bounds.minY} width={bounds.w} height={bounds.h} fill="#0b1220" stroke="#1e293b" strokeWidth={0.5} />
            {/* grid */}
            <G opacity={0.15}>
              {Array.from({length: 10}).map((_,i)=>{
                const x = bounds.minX + (bounds.w/10)*i;
                const y = bounds.minY + (bounds.h/10)*i;
                return (
                  <G key={i}>
                    <Line x1={x} y1={bounds.minY} x2={x} y2={bounds.maxY} stroke="#334155" strokeWidth={0.3} />
                    <Line x1={bounds.minX} y1={y} x2={bounds.maxX} y2={y} stroke="#334155" strokeWidth={0.3} />
                  </G>
                );
              })}
            </G>
            {/* layers */}
            {currentLayers.map((l, idx) => (
              <G key={idx} opacity={idx===layerIdx ? 1 : 0.35 + (idx/layers.length)*0.4}>
                {l.paths.map((p,i)=> (
                  <Path key={i} d={p.d} stroke={p.isExtrude ? (idx===layerIdx ? theme.colors.accent : theme.colors.primary) : '#475569'} strokeWidth={p.isExtrude ? 0.6 : 0.25} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </G>
            ))}
          </Svg>
        ) : (
          // Simple isometric 3D stacked layers approximation
          <Svg width={width} height={height} viewBox={viewBox}>
            <Rect x={bounds.minX} y={bounds.minY} width={bounds.w} height={bounds.h} fill="#0b1220" stroke="#1e293b" strokeWidth={0.5} />
            {layers.slice(0, layerIdx+1).map((l, idx) => {
              const offset = idx * 0.4; // z offset for iso
              const scale = 1 - idx*0.0008;
              return (
                <G key={idx} opacity={0.3 + (idx/layers.length)*0.7} transform={`translate(${offset*2}, ${-offset}) scale(${scale})`}>
                  {l.paths.filter(p=>p.isExtrude).map((p,i)=> (
                    <Path key={i} d={p.d} stroke={theme.colors.primary} strokeWidth={0.5} fill="none" opacity={0.7} />
                  ))}
                </G>
              );
            })}
          </Svg>
        )}
      </View>

      <View style={styles.sliderRow}>
        <TouchableOpacity onPress={()=> setLayerIdx(m=> Math.max(0, m-1))} style={styles.stepBtn}><Text style={styles.stepText}>−</Text></TouchableOpacity>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${((layerIdx+1)/Math.max(1,layers.length))*100}%`}]} />
          <View style={styles.sliderHandleWrap}>
            {/* thumb */}
          </View>
        </View>
        <TouchableOpacity onPress={()=> setLayerIdx(m=> Math.min(layers.length-1, m+1))} style={styles.stepBtn}><Text style={styles.stepText}>+</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.layerScroll}>
        {layers.map((l,i)=>(
          <TouchableOpacity key={i} onPress={()=>setLayerIdx(i)} style={[styles.layerChip, i===layerIdx && styles.layerChipActive]}>
            <Text style={[styles.layerChipText, i===layerIdx && styles.layerChipTextActive]}>L{i+1}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.stats}>Total paths: {layers.reduce((a,l)=>a+l.paths.filter(p=>p.isExtrude).length,0)} extrudes • Bounds {bounds.w.toFixed(0)}×{bounds.h.toFixed(0)}mm</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.bgCardElevated, borderRadius:16, borderWidth:1, borderColor: theme.colors.border, padding:12 },
  toolbar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 },
  modeSwitch: { flexDirection:'row', backgroundColor: theme.colors.bg, borderRadius:10, padding:2, borderWidth:1, borderColor: theme.colors.border },
  modeBtn: { paddingHorizontal:14, paddingVertical:6, borderRadius:8 },
  modeBtnActive: { backgroundColor: theme.colors.primary },
  modeText: { color: theme.colors.textMuted, fontSize:12, fontWeight:'700' },
  modeTextActive: { color: '#fff' },
  layerInfo: { color: theme.colors.textMuted, fontSize:11, fontWeight:'600' },
  canvasWrap: { backgroundColor: '#020617', borderRadius:12, overflow:'hidden', borderWidth:1, borderColor: theme.colors.border, alignItems:'center', justifyContent:'center' },
  sliderRow: { flexDirection:'row', alignItems:'center', marginTop:12, gap:10 },
  stepBtn: { width:38, height:38, borderRadius:10, backgroundColor: theme.colors.bg, borderWidth:1, borderColor: theme.colors.border, alignItems:'center', justifyContent:'center' },
  stepText: { color: theme.colors.text, fontSize:20, fontWeight:'700' },
  sliderTrack: { flex:1, height:8, backgroundColor: theme.colors.bg, borderRadius:8, overflow:'hidden', borderWidth:1, borderColor: theme.colors.border },
  sliderFill: { height:'100%', backgroundColor: theme.colors.accent },
  sliderHandleWrap: {},
  layerScroll: { marginTop:10, maxHeight:40 },
  layerChip: { backgroundColor: theme.colors.bg, borderWidth:1, borderColor: theme.colors.border, paddingHorizontal:10, paddingVertical:6, borderRadius:8, marginRight:6 },
  layerChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  layerChipText: { color: theme.colors.textMuted, fontSize:11, fontWeight:'700' },
  layerChipTextActive: { color: '#fff' },
  stats: { color: theme.colors.textDim, fontSize:10, marginTop:8, textAlign:'center' },
});
