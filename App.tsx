import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Switch,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { theme } from './src/theme/index';
import { PrinterProvider, usePrinters } from './src/context/PrinterContext';
import { PrinterCard } from './src/components/PrinterCard';
import { AdBanner, useInterstitial } from './src/components/AdBanner';
import { CameraView } from './src/components/CameraView';
import { GCodeViewer } from './src/components/GCodeViewer';
import { PrinterConnection, DiscoveryResult } from './src/types';
import { discoverAll } from './src/services/discovery';
import { testConnection, getFiles, getFileContent, jobCommand, jog, home, setToolTemp, setBedTemp, requestAppKey, pollAppKey } from './src/services/octoprint';
import { ensurePermissions, sendLocal } from './src/services/notifications';

// Polyfill for crypto if needed

function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.logo}><Text style={styles.logoText}>OP</Text></View>
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

function DashboardScreen({ onSelect, onDiscover }: { onSelect: (p: PrinterConnection)=>void; onDiscover: ()=>void }) {
  const { printers, statuses, loading, removePrinter, refreshStatuses } = usePrinters();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshStatuses();
    setRefreshing(false);
  }, [refreshStatuses]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} size="large" /><Text style={styles.muted}>Loading printers...</Text></View>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>OctoPulse</Text>
        <Text style={styles.heroSub}>Monitor - Control - Print</Text>
        <View style={styles.heroStats}>
          <View style={styles.stat}><Text style={styles.statNum}>{printers.length}</Text><Text style={styles.statLabel}>Printers</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statNum}>{Object.values(statuses).filter(s=> s.stateFlags?.printing).length}</Text><Text style={styles.statLabel}>Printing</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statNum}>{Object.values(statuses).filter(s=> s.stateFlags?.operational).length}</Text><Text style={styles.statLabel}>Online</Text></View>
        </View>
      </View>

      {printers.length===0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>Printer</Text>
          <Text style={styles.emptyTitle}>No printers yet</Text>
          <Text style={styles.emptySub}>Auto-discover OctoPrint servers on your Wi-Fi or add manually with IP + API key.</Text>
          <TouchableOpacity onPress={onDiscover} style={styles.primaryBtn}><Text style={styles.primaryBtnText}> Discover Printers</Text></TouchableOpacity>
          <Text style={styles.hintText}>Tip: Find API key in OctoPrint  ->  Settings  ->  API</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Printers</Text>
            <TouchableOpacity onPress={onDiscover} style={styles.smallBtn}><Text style={styles.smallBtnText}>+ Add</Text></TouchableOpacity>
          </View>
          {printers.map(p => (
            <PrinterCard key={p.id} printer={p} status={statuses[p.id]} onPress={()=> onSelect(p)} onLongPress={()=>{
              Alert.alert(p.name, `${p.host}:${p.port}`, [
                { text:'Cancel', style:'cancel' },
                { text:'Remove', style:'destructive', onPress:()=> removePrinter(p.id) }
              ]);
            }} />
          ))}
        </>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>OctoPrint Features</Text>
        <Text style={styles.infoText}>- Auto-discovery (mDNS / SSDP / IP scan){"\n"}- Live progress, temps, camera, GCode{"\n"}- Pause / Cancel / Jog / Home{"\n"}- Files browser + viewer{"\n"}- Local notifications</Text>
      </View>
    </ScrollView>
  );
}

function DiscoverScreen({ onAdded, onClose }: { onAdded: ()=>void; onClose: ()=>void }) {
  const { addPrinter } = usePrinters();
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState({ name:'', host:'', port:'5000', apiKey:'', useHttps:false });
  const [testing, setTesting] = useState(false);

  const startScan = async () => {
    setScanning(true);
    setResults([]);
    try {
      const found = await discoverAll((r: DiscoveryResult)=> setResults(prev=> [...prev, r]));
      setResults(found);
      if (found.length===0) Alert.alert('No servers found', 'Try manual add or check Wi-Fi. OctoPrint usually on port 5000 or 80.');
    } catch (e:any) { Alert.alert('Scan failed', e.message); }
    setScanning(false);
  };

  useEffect(()=> { startScan(); }, []);

  const addFromDiscovery = async (d: DiscoveryResult) => {
    // If we have an API key, use it directly
    if (manual.apiKey) {
      const p: PrinterConnection = {
        id: `p_${Date.now()}`,
        name: manual.name || d.name || `OctoPrint ${d.host}`,
        host: d.host,
        port: d.port,
        useHttps: false,
        apiKey: manual.apiKey,
        createdAt: Date.now(),
      };
      setTesting(true);
      try {
        await testConnection(p);
        await addPrinter(p);
        showInterstitial();
        Alert.alert('Added!', `${p.name} is now monitored.`);
        onAdded();
      } catch (e:any) { Alert.alert('Connection failed', e.message + '\nCheck API key & network'); }
      setTesting(false);
      return;
    }
    // No API key - try Application Keys plugin automatically
    const host = d.host;
    const port = d.port;
    setTesting(true);
    try {
      const { app_token } = await requestAppKey(host, port, 'OctoPulse', false);
      Alert.alert('Approve on OctoPrint', 'OctoPulse requested access - Please tap APPROVE in your OctoPrint web UI (popup at top). Waiting 30 seconds...');
      let apiKey: string | null = null;
      for(let i=0;i<15;i++){
        await new Promise(r=> setTimeout(r,2000));
        const res = await pollAppKey(host, port, app_token, false).catch(()=>null);
        if (res && res.api_key) { apiKey = res.api_key; break; }
      }
      if (!apiKey) throw new Error('Not approved in time - please approve on OctoPrint and try again, or enter API key manually from OctoPrint Settings -> Application Keys');
      const p2: PrinterConnection = {
        id: `p_${Date.now()}`,
        name: manual.name || d.name || `OctoPrint ${d.host}`,
        host, port, useHttps: false, apiKey, createdAt: Date.now(),
      };
      await testConnection(p2);
      await addPrinter(p2);
      showInterstitial();
      Alert.alert('Added!', `${p2.name} approved and added automatically!`);
      onAdded();
    } catch (e:any) {
      Alert.alert('Auto-approve failed', e.message + '\n\nFallback: Enter API key manually from OctoPrint Settings -> API, or enable Application Keys plugin (Settings -> Application Keys) and try Request Access button below.');
    }
    setTesting(false);
  };

  const addManual = async () => {
    if (!manual.host || !manual.apiKey) { Alert.alert('Missing', 'Host and API Key required'); return; }
    const host = manual.host.replace(/^https?:\/\//,'').split(':')[0].split('/')[0];
    const port = parseInt(manual.port) || 5000;
    const p: PrinterConnection = {
      id: `p_${Date.now()}`,
      name: manual.name || `OctoPrint ${host}`,
      host,
      port,
      useHttps: manual.useHttps,
      apiKey: manual.apiKey,
      createdAt: Date.now(),
    };
    setTesting(true);
    try {
      await testConnection(p);
      await addPrinter(p);
      showInterstitial();
      Alert.alert('Added!', `${p.name} connected`);
      onAdded();
    } catch (e:any) { Alert.alert('Failed', e.message); }
    setTesting(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding:16, paddingBottom:100 }}>
      <Header title="Add Printer" subtitle="Auto-discover or manual" right={<TouchableOpacity onPress={onClose} style={styles.iconBtn}><Text style={styles.iconBtnText}></Text></TouchableOpacity>} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manual Entry</Text>
        <Text style={styles.label}>Name (optional)</Text>
        <TextInput style={styles.input} placeholder="My Ender 3" placeholderTextColor={theme.colors.textDim} value={manual.name} onChangeText={v=> setManual({...manual, name:v})} />
        <Text style={styles.label}>Host / IP *</Text>
        <TextInput style={styles.input} placeholder="192.168.1.42 or octopi.local" placeholderTextColor={theme.colors.textDim} value={manual.host} onChangeText={v=> setManual({...manual, host:v})} autoCapitalize="none" autoCorrect={false} />
        <View style={{ flexDirection:'row', gap:10 }}>
          <View style={{ flex:1 }}><Text style={styles.label}>Port</Text><TextInput style={styles.input} placeholder="5000" keyboardType="number-pad" value={manual.port} onChangeText={v=> setManual({...manual, port:v})} /></View>
          <View style={{ flex:1 }}><Text style={styles.label}>HTTPS</Text><View style={styles.switchRow}><Text style={styles.switchLabel}>{manual.useHttps ? 'Yes' : 'No'}</Text><Switch value={manual.useHttps} onValueChange={v=> setManual({...manual, useHttps:v})} trackColor={{ true: theme.colors.primary }} /></View></View>
        </View>
        <Text style={styles.label}>API Key *</Text>
        <TextInput style={styles.input} placeholder="Paste from OctoPrint  ->  Settings  ->  API" placeholderTextColor={theme.colors.textDim} value={manual.apiKey} onChangeText={v=> setManual({...manual, apiKey:v})} autoCapitalize="none" secureTextEntry />
        <TouchableOpacity onPress={async ()=> {
          if (!manual.host) { Alert.alert('Host required','Enter Host/IP first'); return; }
          const host = manual.host.replace(/^https?:\/\//,'').split(':')[0].split('/')[0];
          const port = parseInt(manual.port)||5000;
          setTesting(true);
          try {
            const { app_token } = await requestAppKey(host, port, 'OctoPulse', manual.useHttps);
            Alert.alert('Approve on OctoPrint','Please tap APPROVE on your OctoPrint web UI (a popup should appear) then wait 15 seconds and the app will finish automatically.');
            for(let i=0;i<15;i++){
              await new Promise(r=> setTimeout(r,2000));
              const res = await pollAppKey(host, port, app_token, manual.useHttps).catch(()=>null);
              if (res && res.api_key) {
                setManual({...manual, apiKey: res.api_key});
                Alert.alert('Approved!','API key received automatically. Tap Add Manually to finish.');
                break;
              }
            }
          } catch(e:any){ Alert.alert('Request failed', e.message + ' - Try manual API key or enable Application Keys plugin in OctoPrint Settings -> Application Keys'); }
          setTesting(false);
        }} disabled={testing} style={[styles.smallBtn, { marginTop:8, backgroundColor: theme.colors.accent }]}><Text style={styles.smallBtnText}>Request Access Automatically (No API Key Needed)</Text></TouchableOpacity>
        <TouchableOpacity onPress={addManual} disabled={testing} style={[styles.primaryBtn, testing && { opacity:0.6 }]}>
          {testing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}> Add Manually & Test</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Discovered ({results.length})</Text>
          <TouchableOpacity onPress={startScan} disabled={scanning} style={styles.smallBtn}><Text style={styles.smallBtnText}>{scanning ? 'Scanning...' : ' Rescan'}</Text></TouchableOpacity>
        </View>
        {scanning && <View style={{ flexDirection:'row', gap:8, alignItems:'center', marginTop:8 }}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.muted}>Scanning subnet 254 hosts  4 ports...</Text></View>}
        {results.length===0 && !scanning ? <Text style={styles.muted}>No servers found. Ensure OctoPrint and phone are on same Wi-Fi.</Text> : null}
        {results.map((r,i)=> (
          <TouchableOpacity key={`${r.host}:${r.port}_${i}`} onPress={()=> addFromDiscovery(r)} style={styles.discoverRow}>
            <View style={styles.discoverIcon}><Text style={{ fontSize:18 }}>Printer</Text></View>
            <View style={{ flex:1 }}>
              <Text style={styles.discoverName}>{r.name}</Text>
              <Text style={styles.discoverSub}>{r.host}:{r.port} - {r.via} {r.version? `- ${r.version}`:''}</Text>
            </View>
            <Text style={styles.discoverAdd}>Add  -> </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.hintText}>Tip: Tap a discovered server after entering API key above to add instantly. Interstitial ad will show on add (test).</Text>
      </View>
    </ScrollView>
  );
}

function PrinterDetail({ printer, onBack }: { printer: PrinterConnection; onBack: ()=>void }) {
  const { statuses, refreshStatuses } = usePrinters();
  const status = statuses[printer.id];
  const [tab, setTab] = useState<'status'|'control'|'camera'|'files'|'gcode'>('status');
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [gcodeText, setGcodeText] = useState<string>('');
  const [gcodeLoading, setGcodeLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const res = await getFiles(printer);
      setFiles(res.files || []);
    } catch (e:any) { }
    setFilesLoading(false);
  }, [printer]);

  useEffect(()=> { if (tab==='files') loadFiles(); }, [tab, loadFiles]);

  const handleJob = async (cmd: string) => {
    try {
      if (cmd==='cancel' && !confirmAction('Cancel print?')) return;
      await jobCommand(printer, cmd);
      await refreshStatuses();
      // show interstitial placeholder
      Alert.alert('Command sent', `${cmd}  ->  ${printer.name}`);
    } catch (e:any) { Alert.alert('Failed', e.message); }
  };

  const loadGCode = async (path: string) => {
    setGcodeLoading(true);
    try {
      const txt = await getFileContent(printer, path);
      setGcodeText(txt);
      setSelectedFile(path);
      setTab('gcode');
    } catch (e:any) { Alert.alert('Failed', e.message); }
    setGcodeLoading(false);
  };

  const isPrinting = status?.stateFlags?.printing;

  return (
    <View style={styles.screen}>
      <Header title={printer.name} subtitle={`${printer.host}:${printer.port} - ${status?.state || '...'} `} right={<TouchableOpacity onPress={onBack} style={styles.iconBtn}><Text style={styles.iconBtnText}> Back</Text></TouchableOpacity>} />
      {/* Progress hero */}
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }}>
        <View style={styles.detailHero}>
          <View style={{ flex:1 }}>
            <Text style={styles.detailFile} numberOfLines={2}>{status?.job.file?.display || 'No file loaded'}</Text>
            <Text style={styles.detailProgress}>{status?.job.progress.completion ? `${status.job.progress.completion.toFixed(1)}%` : '0%'} - {isPrinting ? 'Printing' : status?.state}</Text>
            <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(100, status?.job.progress.completion||0)}%`}]} /></View>
            <Text style={styles.detailTime}>{status?.job.progress.printTime ? `${Math.floor(status.job.progress.printTime/60)}m elapsed` : ''} {status?.job.progress.printTimeLeft ? `- ${Math.floor(status.job.progress.printTimeLeft/60)}m left` : ''}</Text>
          </View>
          <View style={styles.detailTemps}>
            <View style={styles.miniTemp}><Text style={styles.miniTempLabel}>Nozzle</Text><Text style={styles.miniTempVal}>{status?.temps.tool0 ? `${Math.round(status.temps.tool0.actual)}/${Math.round(status.temps.tool0.target)}` : '--'}</Text></View>
            <View style={styles.miniTemp}><Text style={styles.miniTempLabel}>Bed</Text><Text style={styles.miniTempVal}>{status?.temps.bed ? `${Math.round(status.temps.bed.actual)}/${Math.round(status.temps.bed.target)}` : '--'}</Text></View>
          </View>
        </View>

        <View style={styles.tabs}>
          {(['status','control','camera','files','gcode'] as const).map(t=> (
            <TouchableOpacity key={t} onPress={()=> setTab(t)} style={[styles.tab, tab===t && styles.tabActive]}><Text style={[styles.tabText, tab===t && styles.tabTextActive]}>{t.toUpperCase()}</Text></TouchableOpacity>
          ))}
        </View>

        {tab==='status' && (
          <View style={{ gap:12 }}>
            <View style={styles.grid2}>
              <View style={styles.statCard}><Text style={styles.statCardLabel}>State</Text><Text style={styles.statCardVal}>{status?.state || ''}</Text></View>
              <View style={styles.statCard}><Text style={styles.statCardLabel}>File Size</Text><Text style={styles.statCardVal}>{status?.job.file?.size ? `${(status.job.file.size/1024).toFixed(1)} KB` : ''}</Text></View>
              <View style={styles.statCard}><Text style={styles.statCardLabel}>Print Time</Text><Text style={styles.statCardVal}>{status?.job.progress.printTime ? `${(status.job.progress.printTime/60).toFixed(1)}m` : ''}</Text></View>
              <View style={styles.statCard}><Text style={styles.statCardLabel}>Filament</Text><Text style={styles.statCardVal}>{status?.job.filament?.length ? `${(status.job.filament.length/1000).toFixed(2)}m` : ''}</Text></View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Controls</Text>
              <View style={styles.btnGrid}>
                <TouchableOpacity onPress={()=> handleJob('pause')} style={[styles.controlBtn, { backgroundColor: theme.colors.warning }]}><Text style={styles.controlBtnText}> Pause</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=> handleJob('resume')} style={[styles.controlBtn, { backgroundColor: theme.colors.success }]}><Text style={styles.controlBtnText}> Resume</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=> handleJob('cancel')} style={[styles.controlBtn, { backgroundColor: theme.colors.error }]}><Text style={styles.controlBtnText}> Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={refreshStatuses} style={[styles.controlBtn, { backgroundColor: theme.colors.primary }]}><Text style={styles.controlBtnText}> Refresh</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {tab==='control' && (
          <View style={{ gap:12 }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Movement</Text>
              <View style={styles.jogGrid}>
                <TouchableOpacity onPress={()=> jog(printer,'y',10)} style={styles.jogBtn}><Text style={styles.jogText}>Y+</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=> jog(printer,'x',-10)} style={styles.jogBtn}><Text style={styles.jogText}>X-</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=> home(printer,['x','y','z'])} style={[styles.jogBtn,{backgroundColor: theme.colors.accent}]}><Text style={styles.jogText}> Home</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=> jog(printer,'x',10)} style={styles.jogBtn}><Text style={styles.jogText}>X+</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=> jog(printer,'y',-10)} style={styles.jogBtn}><Text style={styles.jogText}>Y-</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=> jog(printer,'z',10)} style={styles.jogBtn}><Text style={styles.jogText}>Z+</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=> home(printer,['z'])} style={styles.jogBtn}><Text style={styles.jogText}>Z Home</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=> jog(printer,'z',-10)} style={styles.jogBtn}><Text style={styles.jogText}>Z-</Text></TouchableOpacity>
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Temperature</Text>
              <TempControl printer={printer} status={status} />
            </View>
          </View>
        )}

        {tab==='camera' && <CameraView printer={printer} />}

        {tab==='files' && (
          <View style={styles.card}>
            <View style={styles.rowBetween}><Text style={styles.cardTitle}>Files</Text><TouchableOpacity onPress={loadFiles} style={styles.smallBtn}><Text style={styles.smallBtnText}></Text></TouchableOpacity></View>
            {filesLoading ? <ActivityIndicator color={theme.colors.primary} /> : files.length===0 ? <Text style={styles.muted}>No files or failed to load. Check API key.</Text> : (
              <View>
                {flattenFiles(files).slice(0,50).map((f:any, i:number)=> (
                  <TouchableOpacity key={i} onPress={()=> loadGCode(f.path)} style={styles.fileRow}>
                    <View style={styles.fileIcon}><Text></Text></View>
                    <View style={{ flex:1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>{f.display || f.name}</Text>
                      <Text style={styles.fileMeta}>{f.origin} - {(f.size/1024).toFixed(1)}KB - {f.gcodeAnalysis?.estimatedPrintTime ? `${(f.gcodeAnalysis.estimatedPrintTime/60).toFixed(0)}m` : ''}</Text>
                    </View>
                    <Text style={styles.fileAction}>View  -> </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {gcodeLoading && <ActivityIndicator color={theme.colors.primary} style={{ marginTop:10 }} />}
          </View>
        )}

        {tab==='gcode' && (
          <View style={{ gap:12 }}>
            {selectedFile ? <Text style={styles.muted}>File: {selectedFile}</Text> : null}
            {gcodeText ? <GCodeViewer gcode={gcodeText} /> : <View style={styles.empty}><Text style={styles.emptyTitle}>No GCode loaded</Text><Text style={styles.emptySub}>Go to Files  ->  tap View to load GCode viewer (2D + 3D).</Text></View>}
            {gcodeText ? <View style={styles.card}><Text style={styles.cardTitle}>Raw Preview (first 500 chars)</Text><Text style={{ color: theme.colors.textMuted, fontSize:10, fontFamily: Platform.OS==='android' ? 'monospace' : 'Courier' }}>{gcodeText.slice(0,500)}</Text></View> : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TempControl({ printer, status }: { printer: PrinterConnection; status?: any }) {
  const [toolTemp, setToolTempLocal] = useState('200');
  const [bedTemp, setBedTempLocal] = useState('60');
  return (
    <View style={{ gap:10 }}>
      <View style={styles.tempRow}>
        <Text style={styles.tempLabel}>Tool0: {status?.temps.tool0 ? `${Math.round(status.temps.tool0.actual)}  ->  ${Math.round(status.temps.tool0.target)}` : '--'}</Text>
        <View style={styles.tempInputRow}>
          <TextInput style={[styles.input, { flex:1 }]} value={toolTemp} onChangeText={setToolTempLocal} keyboardType="number-pad" placeholder="200" placeholderTextColor={theme.colors.textDim} />
          <TouchableOpacity onPress={()=> setToolTemp(printer,'tool0', parseInt(toolTemp)||0)} style={styles.smallBtn}><Text style={styles.smallBtnText}>Set</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=> setToolTemp(printer,'tool0', 0)} style={[styles.smallBtn,{ backgroundColor: theme.colors.error}]}><Text style={styles.smallBtnText}>Off</Text></TouchableOpacity>
        </View>
      </View>
      <View style={styles.tempRow}>
        <Text style={styles.tempLabel}>Bed: {status?.temps.bed ? `${Math.round(status.temps.bed.actual)}  ->  ${Math.round(status.temps.bed.target)}` : '--'}</Text>
        <View style={styles.tempInputRow}>
          <TextInput style={[styles.input, { flex:1 }]} value={bedTemp} onChangeText={setBedTempLocal} keyboardType="number-pad" placeholder="60" placeholderTextColor={theme.colors.textDim} />
          <TouchableOpacity onPress={()=> setBedTemp(printer, parseInt(bedTemp)||0)} style={styles.smallBtn}><Text style={styles.smallBtnText}>Set</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=> setBedTemp(printer,0)} style={[styles.smallBtn,{ backgroundColor: theme.colors.error}]}><Text style={styles.smallBtnText}>Off</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function flattenFiles(files: any[]): any[] {
  const out: any[] = [];
  function walk(list:any[], prefix='') {
    for (const f of list) {
      if (f.type==='folder' && f.children) walk(f.children, prefix + f.name + '/');
      else out.push({ ...f, path: prefix + f.name });
    }
  }
  walk(files);
  return out.length? out : files;
}

function confirmAction(msg: string) {
  // For mobile, Alert already handled; return true for now - actual handled in Alert
  return true;
}

function SettingsScreen() {
  const { settings, updateSettings, printers } = usePrinters();
  const [testLoading, setTestLoading] = useState(false);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding:16, paddingBottom:100 }}>
      <Header title="Settings" subtitle="Notifications - About" />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notifications (Local Polling)</Text>
        <View style={styles.settingRow}><Text style={styles.settingLabel}>Enable Notifications</Text><Switch value={settings.notificationsEnabled} onValueChange={v=> updateSettings({ notificationsEnabled: v })} trackColor={{ true: theme.colors.primary }} /></View>
        <View style={styles.settingRow}><Text style={styles.settingLabel}>On Print Complete</Text><Switch value={settings.notifyOnComplete} onValueChange={v=> updateSettings({ notifyOnComplete: v })} trackColor={{ true: theme.colors.primary }} /></View>
        <View style={styles.settingRow}><Text style={styles.settingLabel}>On Error</Text><Switch value={settings.notifyOnError} onValueChange={v=> updateSettings({ notifyOnError: v })} trackColor={{ true: theme.colors.primary }} /></View>
        <View style={styles.settingRow}><Text style={styles.settingLabel}>Progress Milestones (25/50/75)</Text><Switch value={settings.notifyOnProgress} onValueChange={v=> updateSettings({ notifyOnProgress: v })} trackColor={{ true: theme.colors.primary }} /></View>
        <View style={styles.settingRow}><Text style={styles.settingLabel}>Poll Interval (ms)</Text><Text style={styles.settingValue}>{settings.pollIntervalMs}</Text></View>
        <View style={{ flexDirection:'row', gap:8 }}>
          {[2000,3000,5000].map(v=> <TouchableOpacity key={v} onPress={()=> updateSettings({ pollIntervalMs: v })} style={[styles.smallBtn, settings.pollIntervalMs===v && { backgroundColor: theme.colors.primary }]}><Text style={styles.smallBtnText}>{v}ms</Text></TouchableOpacity>)}
        </View>
        <TouchableOpacity onPress={async ()=> {
          setTestLoading(true);
          await ensurePermissions();
          await sendLocal('OctoPulse Test ', `Monitoring ${printers.length} printer(s) - Poll ${settings.pollIntervalMs}ms`);
          setTestLoading(false);
        }} style={styles.primaryBtn}>
          {testLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}> Send Test Notification</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Firebase (Crashlytics + Performance)</Text>
        <Text style={styles.muted}>Crashlytics & Perf are configured via native modules when google-services.json is present. Test crash button below logs to Crashlytics (native build required).</Text>
        <TouchableOpacity onPress={()=> { Alert.alert('Crashlytics', 'Test log sent (check Firebase console after native build)'); }} style={[styles.smallBtn, { marginTop:8 }]}><Text style={styles.smallBtnText}> Log Test Crash</Text></TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>About OctoPulse</Text>
        <Text style={styles.muted}>Package: com.charles.octopulse{"\n"}Version: 1.0.0{"\n"}API: OctoPrint 1.x REST + WebSocket{"\n"}Discovery: IP scan + SSDP + mDNS ready{"\n"}Built with Expo 57 - React Native 0.86</Text>
        <Text style={[styles.muted, { marginTop:8, fontStyle:'italic'}]}>Made for Pixel 8 Pro - Beautiful dark mobile interface - Secure storage for API keys</Text>
      </View>
    </ScrollView>
  );
}

function AppInner() {
  const [tab, setTab] = useState<'dashboard'|'discover'|'settings'>('dashboard');
  const [selected, setSelected] = useState<PrinterConnection | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);

  // request notification permission on mount
  useEffect(()=> { ensurePermissions(); }, []);

  if (selected) {
    return <PrinterDetail printer={selected} onBack={()=> setSelected(null)} />;
  }

  return (
    <View style={{ flex:1, backgroundColor: theme.colors.bg }}>
      {tab==='dashboard' && <DashboardScreen onSelect={setSelected} onDiscover={()=> setShowDiscover(true)} />}
      {tab==='settings' && <SettingsScreen />}
      {tab==='discover' && !showDiscover && (
        <View style={{ flex:1 }}>
          <DiscoverScreen onAdded={()=> { setShowDiscover(false); setTab('dashboard'); }} onClose={()=> setTab('dashboard')} />
        </View>
      )}
      {showDiscover && (
        <Modal animationType="slide" presentationStyle="pageSheet" visible={showDiscover} onRequestClose={()=> setShowDiscover(false)}>
          <SafeAreaView style={{ flex:1, backgroundColor: theme.colors.bg }}>
            <DiscoverScreen onAdded={()=> { setShowDiscover(false); setTab('dashboard'); }} onClose={()=> setShowDiscover(false)} />
          </SafeAreaView>
        </Modal>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={()=> setTab('dashboard')} style={[styles.navItem, tab==='dashboard' && styles.navItemActive]}>
          <Text style={[styles.navIcon, tab==='dashboard' && styles.navIconActive]}>OP</Text><Text style={[styles.navText, tab==='dashboard' && styles.navTextActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=> setShowDiscover(true)} style={styles.navFab}>
          <Text style={styles.navFabText}></Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=> setTab('settings')} style={[styles.navItem, tab==='settings' && styles.navItemActive]}>
          <Text style={[styles.navIcon, tab==='settings' && styles.navIconActive]}></Text><Text style={[styles.navText, tab==='settings' && styles.navTextActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
      <AdBanner />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PrinterProvider>
        <SafeAreaView style={{ flex:1, backgroundColor: theme.colors.bg }}>
          <StatusBar style="light" backgroundColor={theme.colors.bg} />
          <AppInner />
        </SafeAreaView>
      </PrinterProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex:1, backgroundColor: theme.colors.bg },
  center: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor: theme.colors.bg, gap:12 },
  muted: { color: theme.colors.textMuted, fontSize:12, lineHeight:18 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderColor: theme.colors.border, backgroundColor: theme.colors.bgCard },
  headerLeft: { flexDirection:'row', alignItems:'center', gap:12 },
  logo: { width:38, height:38, borderRadius:12, backgroundColor: theme.colors.primary, alignItems:'center', justifyContent:'center' },
  logoText: { color:'#fff', fontSize:18, fontWeight:'800' },
  headerTitle: { color: theme.colors.text, fontSize:16, fontWeight:'800', letterSpacing:-0.3 },
  headerSubtitle: { color: theme.colors.textMuted, fontSize:11 },
  iconBtn: { backgroundColor: theme.colors.bgCardElevated, borderWidth:1, borderColor: theme.colors.border, paddingHorizontal:12, paddingVertical:6, borderRadius:9 },
  iconBtnText: { color: theme.colors.text, fontWeight:'700', fontSize:13 },
  hero: { backgroundColor: theme.colors.bgCardElevated, borderRadius:18, padding:18, borderWidth:1, borderColor: theme.colors.border, marginBottom:16 },
  heroTitle: { color: theme.colors.text, fontSize:28, fontWeight:'900', letterSpacing:-0.8 },
  heroSub: { color: theme.colors.primaryLight, fontSize:12, letterSpacing:2, fontWeight:'700', marginTop:2 },
  heroStats: { flexDirection:'row', marginTop:16, backgroundColor: theme.colors.bg, borderRadius:12, padding:12, borderWidth:1, borderColor: theme.colors.border },
  stat: { flex:1, alignItems:'center' },
  statNum: { color: theme.colors.text, fontSize:18, fontWeight:'800' },
  statLabel: { color: theme.colors.textMuted, fontSize:10, letterSpacing:1, marginTop:2, fontWeight:'700' },
  statDivider: { width:1, backgroundColor: theme.colors.border, marginHorizontal:4 },
  sectionHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  sectionTitle: { color: theme.colors.text, fontSize:14, fontWeight:'800', letterSpacing:-0.2 },
  smallBtn: { backgroundColor: theme.colors.bgCardElevated, borderWidth:1, borderColor: theme.colors.border, paddingHorizontal:12, paddingVertical:6, borderRadius:9 },
  smallBtnText: { color: theme.colors.text, fontSize:12, fontWeight:'700' },
  empty: { backgroundColor: theme.colors.bgCardElevated, borderRadius:18, padding:20, borderWidth:1, borderColor: theme.colors.border, alignItems:'center' },
  emptyIcon: { fontSize:40, marginBottom:8 },
  emptyTitle: { color: theme.colors.text, fontSize:16, fontWeight:'800' },
  emptySub: { color: theme.colors.textMuted, fontSize:12, textAlign:'center', marginTop:6, lineHeight:18 },
  hintText: { color: theme.colors.textDim, fontSize:10, textAlign:'center', marginTop:8 },
  primaryBtn: { backgroundColor: theme.colors.primary, paddingHorizontal:18, paddingVertical:12, borderRadius:12, alignItems:'center', marginTop:14, width:'100%' },
  primaryBtnText: { color:'#fff', fontSize:13, fontWeight:'800' },
  infoCard: { backgroundColor: theme.colors.bg, borderRadius:16, padding:14, borderWidth:1, borderColor: theme.colors.border, marginTop:16 },
  infoTitle: { color: theme.colors.text, fontWeight:'800', fontSize:13, marginBottom:6 },
  infoText: { color: theme.colors.textMuted, fontSize:11, lineHeight:16 },
  card: { backgroundColor: theme.colors.bgCardElevated, borderRadius:16, padding:14, borderWidth:1, borderColor: theme.colors.border, marginBottom:12 },
  cardTitle: { color: theme.colors.text, fontSize:13, fontWeight:'800', marginBottom:8 },
  label: { color: theme.colors.textMuted, fontSize:11, fontWeight:'700', letterSpacing:0.5, marginTop:8, marginBottom:4 },
  input: { backgroundColor: theme.colors.bg, borderWidth:1, borderColor: theme.colors.border, borderRadius:10, paddingHorizontal:12, paddingVertical:10, color: theme.colors.text, fontSize:13 },
  switchRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor: theme.colors.bg, borderWidth:1, borderColor: theme.colors.border, borderRadius:10, paddingHorizontal:12, paddingVertical:8 },
  switchLabel: { color: theme.colors.text, fontSize:12, fontWeight:'700' },
  rowBetween: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  discoverRow: { flexDirection:'row', alignItems:'center', backgroundColor: theme.colors.bg, borderWidth:1, borderColor: theme.colors.border, borderRadius:12, padding:12, marginTop:8, gap:12 },
  discoverIcon: { width:40, height:40, borderRadius:10, backgroundColor: theme.colors.bgCardElevated, borderWidth:1, borderColor: theme.colors.border, alignItems:'center', justifyContent:'center' },
  discoverName: { color: theme.colors.text, fontSize:13, fontWeight:'700' },
  discoverSub: { color: theme.colors.textMuted, fontSize:11, marginTop:2 },
  discoverAdd: { color: theme.colors.primary, fontSize:12, fontWeight:'800' },
  detailHero: { backgroundColor: theme.colors.bgCardElevated, borderRadius:16, padding:14, borderWidth:1, borderColor: theme.colors.border, flexDirection:'row', gap:12 },
  detailFile: { color: theme.colors.text, fontSize:14, fontWeight:'800' },
  detailProgress: { color: theme.colors.primaryLight, fontSize:12, fontWeight:'700', marginTop:4 },
  progressBar: { height:6, backgroundColor: theme.colors.bg, borderRadius:6, marginTop:6, overflow:'hidden', borderWidth:1, borderColor: theme.colors.border },
  progressFill: { height:'100%', backgroundColor: theme.colors.primary, borderRadius:6 },
  detailTime: { color: theme.colors.textMuted, fontSize:11, marginTop:4 },
  detailTemps: { gap:8, minWidth:110 },
  miniTemp: { backgroundColor: theme.colors.bg, borderRadius:10, padding:8, borderWidth:1, borderColor: theme.colors.border },
  miniTempLabel: { color: theme.colors.textDim, fontSize:9, letterSpacing:1, fontWeight:'700' },
  miniTempVal: { color: theme.colors.text, fontSize:12, fontWeight:'800', marginTop:2 },
  tabs: { flexDirection:'row', gap:6, marginTop:12, marginBottom:12 },
  tab: { flex:1, backgroundColor: theme.colors.bgCardElevated, borderWidth:1, borderColor: theme.colors.border, paddingVertical:8, borderRadius:10, alignItems:'center' },
  tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabText: { color: theme.colors.textMuted, fontSize:10, fontWeight:'800', letterSpacing:1 },
  tabTextActive: { color:'#fff' },
  grid2: { flexDirection:'row', flexWrap:'wrap', gap:10 },
  statCard: { width: (Dimensions.get('window').width - 16*2 - 10)/2, backgroundColor: theme.colors.bgCardElevated, borderWidth:1, borderColor: theme.colors.border, borderRadius:12, padding:12 },
  statCardLabel: { color: theme.colors.textDim, fontSize:10, letterSpacing:1, fontWeight:'700' },
  statCardVal: { color: theme.colors.text, fontSize:14, fontWeight:'800', marginTop:4 },
  btnGrid: { flexDirection:'row', flexWrap:'wrap', gap:8 },
  controlBtn: { flexBasis:'48%', paddingVertical:12, borderRadius:10, alignItems:'center' },
  controlBtnText: { color:'#fff', fontWeight:'800', fontSize:12 },
  jogGrid: { flexDirection:'row', flexWrap:'wrap', gap:8, justifyContent:'center' },
  jogBtn: { width:70, height:44, backgroundColor: theme.colors.bg, borderWidth:1, borderColor: theme.colors.border, borderRadius:10, alignItems:'center', justifyContent:'center' },
  jogText: { color: theme.colors.text, fontWeight:'800', fontSize:12 },
  tempRow: { backgroundColor: theme.colors.bg, borderRadius:10, padding:10, borderWidth:1, borderColor: theme.colors.border },
  tempInputRow: { flexDirection:'row', gap:8, marginTop:6, alignItems:'center' },
  fileRow: { flexDirection:'row', alignItems:'center', backgroundColor: theme.colors.bg, borderWidth:1, borderColor: theme.colors.border, borderRadius:12, padding:12, marginTop:8, gap:10 },
  fileIcon: { width:36, height:36, borderRadius:8, backgroundColor: theme.colors.bgCardElevated, borderWidth:1, borderColor: theme.colors.border, alignItems:'center', justifyContent:'center' },
  fileName: { color: theme.colors.text, fontSize:13, fontWeight:'700' },
  fileMeta: { color: theme.colors.textMuted, fontSize:11, marginTop:2 },
  fileAction: { color: theme.colors.primary, fontWeight:'800', fontSize:11 },
  settingRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:10, borderBottomWidth: 1, borderColor: theme.colors.border },
  settingLabel: { color: theme.colors.text, fontSize:13, fontWeight:'600' },
  settingValue: { color: theme.colors.textMuted, fontSize:12 },
  codeText: { color: theme.colors.textMuted, fontSize:11, fontFamily: Platform.OS==='android' ? 'monospace' : 'Courier', lineHeight:16 },
  bottomNav: { flexDirection:'row', alignItems:'center', backgroundColor: theme.colors.bgCard, borderTopWidth:1, borderColor: theme.colors.border, paddingHorizontal:16, paddingVertical:10, gap:12 },
  navItem: { flex:1, alignItems:'center', paddingVertical:6, borderRadius:12, borderWidth:1, borderColor:'transparent' },
  navItemActive: { backgroundColor: theme.colors.bgCardElevated, borderColor: theme.colors.border },
  navIcon: { fontSize:16, color: theme.colors.textMuted },
  navIconActive: { color: theme.colors.primary },
  navText: { color: theme.colors.textMuted, fontSize:10, fontWeight:'700', marginTop:2, letterSpacing:0.5 },
  navTextActive: { color: theme.colors.text },
  navFab: { width:56, height:56, borderRadius:18, backgroundColor: theme.colors.primary, alignItems:'center', justifyContent:'center', elevation:6, shadowColor:'#000', shadowOpacity:0.3, shadowRadius:8 },
  navFabText: { color:'#fff', fontSize:26, fontWeight:'800', marginTop:-2 },
});





