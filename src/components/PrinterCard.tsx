import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { PrinterConnection, PrinterStatus } from '../types';
import Svg, { Circle } from 'react-native-svg';

function ProgressRing({ progress, size=56, stroke=6 }: { progress: number; size?: number; stroke?: number }) {
  const r = (size - stroke)/2;
  const c = 2*Math.PI*r;
  const offset = c - (progress/100)*c;
  const color = progress >= 100 ? theme.colors.success : progress > 0 ? theme.colors.primary : theme.colors.border;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={theme.colors.border} strokeWidth={stroke} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={offset} strokeLinecap="round" rotation={-90} origin={`${size/2}, ${size/2}`} />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { alignItems:'center', justifyContent:'center'}]}>
        <Text style={{ color: theme.colors.text, fontWeight:'800', fontSize:12 }}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

export function PrinterCard({ printer, status, onPress, onLongPress }: { printer: PrinterConnection; status?: PrinterStatus; onPress?: ()=>void; onLongPress?: ()=>void }) {
  const isPrinting = status?.stateFlags?.printing || status?.state.toLowerCase().includes('printing');
  const completion = status?.job.progress.completion || 0;
  const fileName = status?.job.file?.display || status?.job.file?.name || 'Idle';
  const state = status?.state || 'Checking...';
  const bed = status?.temps.bed;
  const tool = status?.temps.tool0;
  const stateColor = isPrinting ? theme.colors.primary : status?.stateFlags?.error ? theme.colors.error : status?.stateFlags?.operational ? theme.colors.success : theme.colors.warning;
  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.85} style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex:1 }}>
          <Text style={styles.name} numberOfLines={1}>{printer.name}</Text>
          <Text style={styles.host} numberOfLines={1}>{printer.host}:{printer.port} • {state}</Text>
        </View>
        <View style={[styles.dot, { backgroundColor: stateColor }]} />
      </View>
      <View style={styles.body}>
        <View style={{ flex:1, paddingRight: 12 }}>
          <Text style={styles.file} numberOfLines={2}>{fileName}</Text>
          <View style={styles.temps}>
            <View style={styles.tempBox}>
              <Text style={styles.tempLabel}>NOZZLE</Text>
              <Text style={styles.tempValue}>{tool ? `${Math.round(tool.actual)}° / ${Math.round(tool.target)}°` : '--'}</Text>
            </View>
            <View style={styles.tempBox}>
              <Text style={styles.tempLabel}>BED</Text>
              <Text style={styles.tempValue}>{bed ? `${Math.round(bed.actual)}° / ${Math.round(bed.target)}°` : '--'}</Text>
            </View>
          </View>
          {isPrinting && status?.job.progress.printTimeLeft ? (
            <Text style={styles.timeLeft}>{Math.floor((status.job.progress.printTimeLeft||0)/60)}m left • {Math.floor((status.job.progress.printTime||0)/60)}m elapsed</Text>
          ) : null}
        </View>
        <ProgressRing progress={completion} />
      </View>
      <View style={styles.footer}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{isPrinting ? 'PRINTING' : status?.stateFlags?.paused ? 'PAUSED' : status?.stateFlags?.operational ? 'IDLE' : 'OFFLINE'}</Text>
        </View>
        <Text style={styles.tapHint}>Tap to manage →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgCardElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  header: { flexDirection:'row', alignItems:'center', marginBottom: 12 },
  name: { color: theme.colors.text, fontSize: 17, fontWeight:'800', letterSpacing: -0.3 },
  host: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, marginLeft: 10, shadowColor:'#000', shadowOpacity:0.4, shadowRadius:4 },
  body: { flexDirection:'row', alignItems:'center' },
  file: { color: theme.colors.text, fontSize: 14, fontWeight:'600', lineHeight:18 },
  temps: { flexDirection:'row', gap:12, marginTop:10 },
  tempBox: { backgroundColor: theme.colors.bg, borderRadius:10, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor: theme.colors.border },
  tempLabel: { color: theme.colors.textDim, fontSize:9, letterSpacing:1.2, fontWeight:'700' },
  tempValue: { color: theme.colors.text, fontSize:12, fontWeight:'700', marginTop:2 },
  timeLeft: { color: theme.colors.textMuted, fontSize:11, marginTop:8 },
  footer: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:14, paddingTop:12, borderTopWidth:1, borderColor: theme.colors.border },
  badge: { backgroundColor: theme.colors.primary, paddingHorizontal:10, paddingVertical:5, borderRadius:8 },
  badgeText: { color:'#fff', fontSize:10, fontWeight:'800', letterSpacing:1 },
  tapHint: { color: theme.colors.textDim, fontSize:11, fontWeight:'600' },
});
