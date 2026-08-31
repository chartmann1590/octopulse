import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { theme } from '../theme';
import { PrinterConnection } from '../types';
import { getCameraSettings } from '../services/octoprint';

export function CameraView({ printer }: { printer: PrinterConnection }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<'stream'|'snapshot'>('stream');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const cam = await getCameraSettings(printer);
        if (!mounted) return;
        if (cam?.streamUrl) {
          setUrl(cam.streamUrl);
          setSnapshot(cam.snapshotUrl || null);
        } else {
          // fallback guess
          const proto = printer.useHttps ? 'https' : 'http';
          setUrl(`${proto}://${printer.host}:${printer.port}/webcam/?action=stream`);
          setSnapshot(`${proto}://${printer.host}:${printer.port}/webcam/?action=snapshot`);
        }
      } catch (e:any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [printer]);

  // snapshot auto-refresh every 2s when in snapshot mode
  useEffect(() => {
    if (mode !== 'snapshot' || !snapshot) return;
    const id = setInterval(()=> setRefreshKey(k=>k+1), 2000);
    return () => clearInterval(id);
  }, [mode, snapshot]);

  const width = Dimensions.get('window').width - 32;
  const height = width * 0.56;

  if (loading) {
    return <View style={[styles.wrap, { height }]}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.hint}>Loading camera...</Text></View>;
  }
  if (error) {
    return <View style={[styles.wrap, { height }]}><Text style={styles.error}>Camera error: {error}</Text><TouchableOpacity onPress={()=> setRefreshKey(k=>k+1)} style={styles.btn}><Text style={styles.btnText}>Retry</Text></TouchableOpacity></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Camera</Text>
        <View style={styles.modeSwitch}>
          <TouchableOpacity onPress={()=>setMode('stream')} style={[styles.modeBtn, mode==='stream' && styles.modeBtnActive]}><Text style={[styles.modeText, mode==='stream' && styles.modeTextActive]}>Stream</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>setMode('snapshot')} style={[styles.modeBtn, mode==='snapshot' && styles.modeBtnActive]}><Text style={[styles.modeText, mode==='snapshot' && styles.modeTextActive]}>Snapshot</Text></TouchableOpacity>
        </View>
      </View>
      <View style={[styles.wrap, { height }]}>
        {mode==='stream' && url ? (
          <Image key={url+refreshKey} source={{ uri: url, headers: { 'X-Api-Key': printer.apiKey } as any }} style={{ width:'100%', height:'100%', backgroundColor:'#000' }} resizeMode="cover" onError={()=> setError('Stream failed, trying snapshot')} />
        ) : snapshot ? (
          <Image source={{ uri: `${snapshot}${snapshot.includes('?')?'&':'?'}t=${refreshKey}`, headers: { 'X-Api-Key': printer.apiKey } as any }} style={{ width:'100%', height:'100%', backgroundColor:'#000' }} resizeMode="cover" />
        ) : (
          <Text style={styles.hint}>No camera configured on OctoPrint</Text>
        )}
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity onPress={()=> setRefreshKey(k=>k+1)} style={styles.controlBtn}><Text style={styles.controlText}>↻ Refresh</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=> { setMode(m=> m==='stream'?'snapshot':'stream'); }} style={styles.controlBtn}><Text style={styles.controlText}>⇄ Switch</Text></TouchableOpacity>
      </View>
      <Text style={styles.url}>{url}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.bgCardElevated, borderRadius:16, borderWidth:1, borderColor: theme.colors.border, padding:12 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 },
  title: { color: theme.colors.text, fontSize:14, fontWeight:'800', letterSpacing:-0.2 },
  modeSwitch: { flexDirection:'row', backgroundColor: theme.colors.bg, borderRadius:9, padding:2, borderWidth:1, borderColor: theme.colors.border },
  modeBtn: { paddingHorizontal:10, paddingVertical:4, borderRadius:7 },
  modeBtnActive: { backgroundColor: theme.colors.primary },
  modeText: { color: theme.colors.textMuted, fontSize:11, fontWeight:'700' },
  modeTextActive: { color:'#fff' },
  wrap: { backgroundColor:'#000', borderRadius:12, overflow:'hidden', borderWidth:1, borderColor: theme.colors.border, alignItems:'center', justifyContent:'center' },
  liveBadge: { position:'absolute', top:10, left:10, backgroundColor:'rgba(0,0,0,0.7)', paddingHorizontal:8, paddingVertical:4, borderRadius:8, flexDirection:'row', alignItems:'center', gap:6 },
  liveDot: { width:8, height:8, borderRadius:4, backgroundColor: theme.colors.error },
  liveText: { color:'#fff', fontSize:10, fontWeight:'800', letterSpacing:1 },
  hint: { color: theme.colors.textMuted, fontSize:12 },
  error: { color: theme.colors.error, fontSize:12 },
  btn: { marginTop:10, backgroundColor: theme.colors.primary, paddingHorizontal:16, paddingVertical:8, borderRadius:9 },
  btnText: { color:'#fff', fontWeight:'700', fontSize:12 },
  controls: { flexDirection:'row', gap:8, marginTop:10 },
  controlBtn: { flex:1, backgroundColor: theme.colors.bg, borderWidth:1, borderColor: theme.colors.border, borderRadius:10, paddingVertical:9, alignItems:'center' },
  controlText: { color: theme.colors.text, fontSize:12, fontWeight:'700' },
  url: { color: theme.colors.textDim, fontSize:9, marginTop:6 },
});
