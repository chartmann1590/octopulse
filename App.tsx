import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
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
  Linking,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { theme } from './src/theme/index';
import { PrinterProvider, usePrinters } from './src/context/PrinterContext';
import { PrinterCard } from './src/components/PrinterCard';
import { AdBanner, useInterstitial } from './src/components/AdBanner';
import { CameraView } from './src/components/CameraView';
import { GCodeViewer } from './src/components/GCodeViewer';
import { PrinterConnection, DiscoveryResult, PrinterStatus } from './src/types';
import { discoverAll } from './src/services/discovery';
import {
  testConnection,
  getFiles,
  getFileContent,
  printFile,
  deleteFile,
  jobCommand,
  jog,
  home,
  extrude,
  setToolTemp,
  setBedTemp,
  setFanSpeed,
  disableSteppers,
  emergencyStop,
  printerCommand,
  requestAppKey,
  pollAppKey,
} from './src/services/octoprint';
import { ensurePermissions, sendLocal } from './src/services/notifications';
import { formatDuration, formatFilament } from './src/utils/format';
import { TranslationProvider, useTranslation } from './src/context/TranslationContext';
import { OnboardingLanguageScreen } from './src/components/OnboardingLanguageScreen';
import { AppText } from './src/components/AppText';
import { AppTextInput } from './src/components/AppTextInput';


function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image
          source={require('./assets/icon.png')}
          style={{ width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border }}
        />
        <View style={{ flex: 1 }}>
          <AppText style={styles.headerTitle} numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  );
}

// ----------------------------------------------------
// OctoPrint Application Keys Pairing Modal Component
// ----------------------------------------------------
function AppKeysPairingModal({
  target,
  visible,
  onSuccess,
  onClose,
}: {
  target: { host: string; port: number; name?: string; useHttps?: boolean } | null;
  visible: boolean;
  onSuccess: (apiKey: string, name: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'requesting' | 'waiting' | 'approved' | 'denied' | 'error'>('requesting');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [appToken, setAppToken] = useState<string | null>(null);
  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!visible || !target) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    let isMounted = true;
    setStep('requesting');
    setErrorMessage('');
    setCountdown(60);

    const startPairing = async () => {
      try {
        const res = await requestAppKey(target.host, target.port, 'OctoPulse', target.useHttps);
        if (!isMounted) return;
        setAppToken(res.app_token);
        setStep('waiting');

        let remaining = 60;
        countdownTimerRef.current = setInterval(() => {
          remaining -= 1;
          setCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(countdownTimerRef.current);
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            if (isMounted) {
              setStep('error');
              setErrorMessage('Pairing request timed out. Please ensure you approve the request in the OctoPrint browser UI.');
            }
          }
        }, 1000);

        pollTimerRef.current = setInterval(async () => {
          if (!isMounted) return;
          try {
            const pollRes = await pollAppKey(target.host, target.port, res.app_token, target.useHttps);
            if (pollRes.status === 'approved' && pollRes.api_key) {
              clearInterval(pollTimerRef.current);
              clearInterval(countdownTimerRef.current);
              if (isMounted) {
                setStep('approved');
                setTimeout(() => {
                  onSuccess(pollRes.api_key!, target.name || `OctoPrint @ ${target.host}`);
                }, 800);
              }
            } else if (pollRes.status === 'denied') {
              clearInterval(pollTimerRef.current);
              clearInterval(countdownTimerRef.current);
              if (isMounted) {
                setStep('denied');
                setErrorMessage(pollRes.message || 'Access request was denied on the OctoPrint server.');
              }
            }
          } catch (e: any) {
            // Ignore temporary network glitches during polling
          }
        }, 1500);
      } catch (err: any) {
        if (!isMounted) return;
        setStep('error');
        setErrorMessage(err.message || 'Failed to initiate authorization request with OctoPrint.');
      }
    };

    startPairing();

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [visible, target, onSuccess]);

  if (!visible || !target) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.pairingCard}>
          <View style={styles.pairingHeader}>
            <AppText style={styles.pairingTitle}>Connect to OctoPrint</AppText>
            <AppText style={styles.pairingSubtitle}>
              {target.name || 'OctoPrint Server'} ({target.host}:{target.port})
            </AppText>
          </View>

          {step === 'requesting' && (
            <View style={styles.pairingBody}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <AppText style={styles.pairingStatusText}>Sending authorization request to OctoPrint...</AppText>
            </View>
          )}

          {step === 'waiting' && (
            <View style={styles.pairingBody}>
              <View style={styles.pulsingIconWrap}>
                <AppText style={styles.pulsingIcon}>🔔</AppText>
              </View>
              <AppText style={styles.pairingInstructionTitle}>Approve Access on OctoPrint</AppText>
              <AppText style={styles.pairingInstructionText}>
                Open your OctoPrint web interface in your computer or phone browser.
                {'\n\n'}
                A popup has appeared at the top asking for access. Click <AppText style={{ color: theme.colors.success, fontWeight: '800' }}>ALLOW</AppText> or <AppText style={{ color: theme.colors.primary, fontWeight: '800' }}>APPROVE</AppText>.
              </AppText>
              <View style={styles.countdownPill}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <AppText style={styles.countdownText}>Waiting for approval ({countdown}s)</AppText>
              </View>
            </View>
          )}

          {step === 'approved' && (
            <View style={styles.pairingBody}>
              <AppText style={styles.successIcon}>✓</AppText>
              <AppText style={styles.successTitle}>Connected Successfully!</AppText>
              <AppText style={styles.successSub}>Application key granted by OctoPrint.</AppText>
            </View>
          )}

          {step === 'denied' && (
            <View style={styles.pairingBody}>
              <AppText style={styles.errorIcon}>✕</AppText>
              <AppText style={styles.errorTitle}>Access Denied</AppText>
              <AppText style={styles.pairingInstructionText}>{errorMessage}</AppText>
            </View>
          )}

          {step === 'error' && (
            <View style={styles.pairingBody}>
              <AppText style={styles.errorIcon}>⚠️</AppText>
              <AppText style={styles.errorTitle}>Connection Failed</AppText>
              <AppText style={styles.pairingInstructionText}>{errorMessage}</AppText>
              <AppText style={styles.hintText}>
                Make sure the "Application Keys" plugin is enabled in OctoPrint Settings → Application Keys, or enter your API key manually.
              </AppText>
            </View>
          )}

          <View style={styles.pairingFooter}>
            <TouchableOpacity onPress={onClose} style={styles.pairingCancelBtn}>
              <AppText style={styles.pairingCancelText}>{step === 'approved' ? 'Done' : 'Cancel'}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ----------------------------------------------------
// Dashboard Screen Component
// ----------------------------------------------------
function DashboardScreen({
  onSelect,
  onDiscover,
}: {
  onSelect: (p: PrinterConnection) => void;
  onDiscover: () => void;
}) {
  const { t } = useTranslation();
  const { printers, statuses, loading, removePrinter, refreshStatuses } = usePrinters();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshStatuses();
    setRefreshing(false);
  }, [refreshStatuses]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <AppText style={styles.muted}>Loading printers...</AppText>
      </View>
    );
  }

  const printingCount = Object.values(statuses).filter(s => s?.stateFlags?.printing).length;
  const onlineCount = Object.values(statuses).filter(s => s?.stateFlags?.operational).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
      <View style={styles.hero}>
        <AppText style={styles.heroTitle}>OctoPulse</AppText>
        <AppText style={styles.heroSub}>MONITOR • CONTROL • PRINT</AppText>
        <View style={styles.heroStats}>
          <View style={styles.stat}>
            <AppText style={styles.statNum}>{printers.length}</AppText>
            <AppText style={styles.statLabel}>PRINTERS</AppText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <AppText style={styles.statNum}>{printingCount}</AppText>
            <AppText style={styles.statLabel}>PRINTING</AppText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <AppText style={styles.statNum}>{onlineCount}</AppText>
            <AppText style={styles.statLabel}>ONLINE</AppText>
          </View>
        </View>
      </View>

      {printers.length === 0 ? (
        <View style={styles.empty}>
          <AppText style={styles.emptyIcon}>🖨️</AppText>
          <AppText style={styles.emptyTitle}>No printers connected</AppText>
          <AppText style={styles.emptySub}>
            Auto-discover OctoPrint servers on your Wi-Fi network with 1-click authorization approval.
          </AppText>
          <TouchableOpacity onPress={onDiscover} style={styles.primaryBtn}>
            <AppText style={styles.primaryBtnText}>🔍 Discover Printers on Wi-Fi</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>Your Printers ({printers.length})</AppText>
            <TouchableOpacity onPress={onDiscover} style={styles.smallBtn}>
              <AppText style={styles.smallBtnText}>+ Add Printer</AppText>
            </TouchableOpacity>
          </View>
          {printers.map(p => (
            <PrinterCard
              key={p.id}
              printer={p}
              status={statuses[p.id]}
              onPress={() => onSelect(p)}
              onLongPress={() => {
                Alert.alert(p.name, `${p.host}:${p.port}`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove Printer', style: 'destructive', onPress: () => removePrinter(p.id) },
                ]);
              }}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ----------------------------------------------------
// Discover / Add Screen Component
// ----------------------------------------------------
function DiscoverScreen({ onAdded, onClose }: { onAdded: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const { addPrinter } = usePrinters();
  const { show: showInterstitial } = useInterstitial();
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState({ name: '', host: '', port: '5000', apiKey: '', useHttps: false });
  const [testing, setTesting] = useState(false);
  const [pairingTarget, setPairingTarget] = useState<{ host: string; port: number; name?: string; useHttps?: boolean } | null>(null);

  const startScan = async () => {
    setScanning(true);
    setResults([]);
    try {
      const found = await discoverAll((r: DiscoveryResult) => setResults(prev => [...prev, r]));
      setResults(found);
      if (found.length === 0) {
        Alert.alert(t('No servers discovered'), t('Could not find OctoPrint automatically. You can add it manually using IP address.'));
      }
    } catch (e: any) {
      Alert.alert('Scan failed', e.message);
    }
    setScanning(false);
  };

  useEffect(() => {
    startScan();
  }, []);

  const handlePairingSuccess = async (apiKey: string, name: string) => {
    if (!pairingTarget) return;
    const p: PrinterConnection = {
      id: `p_${Date.now()}`,
      name: manual.name || name || `OctoPrint @ ${pairingTarget.host}`,
      host: pairingTarget.host,
      port: pairingTarget.port,
      useHttps: !!pairingTarget.useHttps,
      apiKey,
      createdAt: Date.now(),
    };
    try {
      await testConnection(p);
      await addPrinter(p);
      setPairingTarget(null);
      showInterstitial();
      Alert.alert('Connected & Added!', `${p.name} is now connected.`);
      onAdded();
    } catch (err: any) {
      Alert.alert('Connection check failed', err.message);
    }
  };

  const addFromDiscovery = (d: DiscoveryResult) => {
    setPairingTarget({ host: d.host, port: d.port, name: d.name, useHttps: false });
  };

  const addManual = async () => {
    if (!manual.host) {
      Alert.alert(t('Host Required'), t('Please enter OctoPrint Host or IP address.'));
      return;
    }
    const cleanHost = manual.host.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
    const port = parseInt(manual.port, 10) || (manual.useHttps ? 443 : 5000);

    if (!manual.apiKey) {
      // Trigger application keys approval flow for manual host
      setPairingTarget({ host: cleanHost, port, name: manual.name, useHttps: manual.useHttps });
      return;
    }

    const p: PrinterConnection = {
      id: `p_${Date.now()}`,
      name: manual.name || `OctoPrint @ ${cleanHost}`,
      host: cleanHost,
      port,
      useHttps: manual.useHttps,
      apiKey: manual.apiKey.trim(),
      createdAt: Date.now(),
    };
    setTesting(true);
    try {
      await testConnection(p);
      await addPrinter(p);
      showInterstitial();
      Alert.alert('Added!', `${p.name} connected successfully.`);
      onAdded();
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message);
    }
    setTesting(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Header
        title="Add OctoPrint Server"
        subtitle="Auto-discovery or manual entry"
        right={
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <AppText style={styles.iconBtnText}>✕ Close</AppText>
          </TouchableOpacity>
        }
      />

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <AppText style={styles.cardTitle}>Discovered on Local Network ({results.length})</AppText>
          <TouchableOpacity onPress={startScan} disabled={scanning} style={styles.smallBtn}>
            <AppText style={styles.smallBtnText}>{scanning ? 'Scanning...' : '↻ Rescan'}</AppText>
          </TouchableOpacity>
        </View>

        {scanning && (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 }}>
            <ActivityIndicator color={theme.colors.primary} />
            <AppText style={styles.muted}>Scanning local subnet for OctoPrint instances...</AppText>
          </View>
        )}

        {results.length === 0 && !scanning && (
          <AppText style={[styles.muted, { marginTop: 8 }]}>
            No servers detected yet. Ensure your phone and OctoPrint are connected to the same Wi-Fi network.
          </AppText>
        )}

        {results.map((r, i) => (
          <TouchableOpacity
            key={`${r.host}:${r.port}_${i}`}
            onPress={() => addFromDiscovery(r)}
            style={styles.discoverRow}
            activeOpacity={0.8}>
            <View style={styles.discoverIcon}>
              <AppText style={{ fontSize: 20 }}>🖨️</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.discoverName}>{r.name || `OctoPrint @ ${r.host}`}</AppText>
              <AppText style={styles.discoverSub}>
                {r.host}:{r.port} • {r.via}
              </AppText>
            </View>
            <View style={styles.pairBtnBadge}>
              <AppText style={styles.pairBtnText}>Pair & Connect →</AppText>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <AppText style={styles.cardTitle}>Manual Configuration</AppText>
        <AppText style={styles.label}>Printer Name (Optional)</AppText>
        <AppTextInput
          style={styles.input}
          placeholder="e.g. Ender 3 V2 / Prusa MK4"
          placeholderTextColor={theme.colors.textDim}
          value={manual.name}
          onChangeText={v => setManual({ ...manual, name: v })}
        />

        <AppText style={styles.label}>Host / IP Address *</AppText>
        <AppTextInput
          style={styles.input}
          placeholder="192.168.1.50 or octopi.local"
          placeholderTextColor={theme.colors.textDim}
          value={manual.host}
          onChangeText={v => setManual({ ...manual, host: v })}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.label}>Port</AppText>
            <AppTextInput
              style={styles.input}
              placeholder="5000"
              keyboardType="number-pad"
              value={manual.port}
              onChangeText={v => setManual({ ...manual, port: v })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.label}>HTTPS</AppText>
            <View style={styles.switchRow}>
              <AppText style={styles.switchLabel}>{manual.useHttps ? 'Yes' : 'No'}</AppText>
              <Switch
                value={manual.useHttps}
                onValueChange={v => setManual({ ...manual, useHttps: v })}
                trackColor={{ true: theme.colors.primary }}
              />
            </View>
          </View>
        </View>

        <AppText style={styles.label}>API Key (Leave blank for 1-Click Server Approval)</AppText>
        <AppTextInput
          style={styles.input}
          placeholder="Optional: Paste key from OctoPrint Settings → API"
          placeholderTextColor={theme.colors.textDim}
          value={manual.apiKey}
          onChangeText={v => setManual({ ...manual, apiKey: v })}
          autoCapitalize="none"
          secureTextEntry
        />

        <TouchableOpacity
          onPress={addManual}
          disabled={testing}
          style={[styles.primaryBtn, testing && { opacity: 0.6 }]}>
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppText style={styles.primaryBtnText}>
              {manual.apiKey ? 'Connect with API Key' : '⚡ 1-Click Request Access & Connect'}
            </AppText>
          )}
        </TouchableOpacity>
      </View>

      <AppKeysPairingModal
        target={pairingTarget}
        visible={!!pairingTarget}
        onSuccess={handlePairingSuccess}
        onClose={() => setPairingTarget(null)}
      />
    </ScrollView>
  );
}

// ----------------------------------------------------
// Printer Detail & Control Screen Component
// ----------------------------------------------------
function PrinterDetail({ printer, onBack }: { printer: PrinterConnection; onBack: () => void }) {
  const { t } = useTranslation();
  const { statuses, refreshStatuses, settings, updateSettings, updatePrinter } = usePrinters();
  const status = statuses[printer.id];
  const [tab, setTab] = useState<'overview' | 'control' | 'gcode' | 'files' | 'terminal' | 'alerts'>('overview');
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [gcodeText, setGcodeText] = useState<string>('');
  const [gcodeLoading, setGcodeLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [jogStep, setJogStep] = useState<number>(10);
  const [extrudeAmount, setExtrudeAmount] = useState<number>(10);
  const [gcodeCommand, setGcodeCommand] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<{ time: string; text: string; type: 'cmd' | 'resp' }[]>([]);

  const loadFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const res = await getFiles(printer);
      setFiles(res.files || []);
    } catch (e: any) {}
    setFilesLoading(false);
  }, [printer]);

  useEffect(() => {
    if (tab === 'files') loadFiles();
  }, [tab, loadFiles]);

  const handleJob = async (cmd: string) => {
    try {
      if (cmd === 'cancel') {
        Alert.alert('Cancel Print?', `Are you sure you want to stop the print on ${printer.name}?`, [
          { text: 'No, Keep Printing', style: 'cancel' },
          {
            text: 'Yes, Cancel Print',
            style: 'destructive',
            onPress: async () => {
              await jobCommand(printer, 'cancel');
              await refreshStatuses();
              Alert.alert('Print Cancelled', `Print on ${printer.name} has been stopped.`);
            },
          },
        ]);
        return;
      }
      await jobCommand(printer, cmd);
      await refreshStatuses();
      Alert.alert('Command Sent', `${cmd.toUpperCase()} command executed.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleEmergencyStop = () => {
    Alert.alert('EMERGENCY STOP', `Trigger immediate emergency shutdown (M112) on ${printer.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'EMERGENCY STOP',
        style: 'destructive',
        onPress: async () => {
          try {
            await emergencyStop(printer);
            await refreshStatuses();
            Alert.alert(t('Emergency Stop Sent'), t('M112 Emergency stop signal sent.'));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handlePrintFile = (path: string, fileName: string) => {
    Alert.alert('Start Print', `Start printing "${fileName}" on ${printer.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start Print',
        onPress: async () => {
          try {
            await printFile(printer, path);
            await refreshStatuses();
            setTab('overview');
            Alert.alert('Print Started', `Printing "${fileName}"`);
          } catch (e: any) {
            Alert.alert('Failed to start print', e.message);
          }
        },
      },
    ]);
  };

  const handleDeleteFile = (path: string, fileName: string) => {
    Alert.alert('Delete File', `Delete "${fileName}" from OctoPrint?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFile(printer, path);
            await loadFiles();
            Alert.alert('File Deleted', `Deleted "${fileName}"`);
          } catch (e: any) {
            Alert.alert('Delete Failed', e.message);
          }
        },
      },
    ]);
  };

  const loadGCode = async (path: string) => {
    if (!path) return;
    setGcodeLoading(true);
    try {
      const txt = await getFileContent(printer, path);
      setGcodeText(txt);
      setSelectedFile(path);
    } catch (e: any) {
      Alert.alert('Failed to load GCode', e.message);
    }
    setGcodeLoading(false);
  };

  const handleSendTerminalGcode = async (cmd?: string) => {
    const toSend = (cmd || gcodeCommand).trim();
    if (!toSend) return;
    const timeStr = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, { time: timeStr, text: `> ${toSend}`, type: 'cmd' }]);
    if (!cmd) setGcodeCommand('');

    try {
      await printerCommand(printer, toSend);
      setTerminalLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `ok (command executed)`, type: 'resp' }]);
    } catch (e: any) {
      setTerminalLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `error: ${e.message}`, type: 'resp' }]);
    }
  };

  const isPrinting = status?.stateFlags?.printing;
  const isPaused = status?.stateFlags?.paused;
  const completion = status?.job?.progress?.completion || 0;

  return (
    <View style={styles.screen}>
      <Header
        title={printer.name}
        subtitle={`${printer.host}:${printer.port} • ${status?.state || 'Checking...'}`}
        right={
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <AppText style={styles.iconBtnText}>← Back</AppText>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Detail Hero Card */}
        <View style={styles.detailHero}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.detailFile} numberOfLines={2}>
              {status?.job?.file?.display || status?.job?.file?.name || 'No file loaded'}
            </AppText>
            <AppText style={styles.detailProgress}>
              {completion ? `${completion.toFixed(1)}%` : '0%'} • {isPrinting ? 'Printing' : isPaused ? 'Paused' : status?.state || 'Idle'}
            </AppText>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(100, completion)}%` }]} />
            </View>
            <AppText style={styles.detailTime}>
              {status?.job?.progress?.printTime ? `${formatDuration(status.job.progress.printTime)} elapsed` : ''}
              {status?.job?.progress?.printTimeLeft ? ` • ${formatDuration(status.job.progress.printTimeLeft)} remaining` : ''}
            </AppText>
          </View>
          <View style={styles.detailTemps}>
            <View style={styles.miniTemp}>
              <AppText style={styles.miniTempLabel}>NOZZLE</AppText>
              <AppText style={styles.miniTempVal}>
                {status?.temps?.tool0 ? `${Math.round(status.temps.tool0.actual)} / ${Math.round(status.temps.tool0.target)}°` : '--'}
              </AppText>
            </View>
            <View style={styles.miniTemp}>
              <AppText style={styles.miniTempLabel}>BED</AppText>
              <AppText style={styles.miniTempVal}>
                {status?.temps?.bed ? `${Math.round(status.temps.bed.actual)} / ${Math.round(status.temps.bed.target)}°` : '--'}
              </AppText>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabs}>
          {([
            { k: 'overview', label: 'OVERVIEW' },
            { k: 'control', label: 'CONTROL' },
            { k: 'gcode', label: 'G-CODE' },
            { k: 'files', label: 'FILES' },
            { k: 'terminal', label: 'TERMINAL' },
            { k: 'alerts', label: 'ALERTS' },
          ] as const).map(t => (
            <TouchableOpacity
              key={t.k}
              onPress={() => setTab(t.k as any)}
              style={[styles.tab, tab === t.k && styles.tabActive]}>
              <AppText style={[styles.tabText, tab === t.k && styles.tabTextActive]}>{t.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <View style={{ gap: 12 }}>
            <CameraView printer={printer} status={status} />

            {/* Active Print G-Code Preview Card */}
            {status?.job?.file?.name ? (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <AppText style={styles.cardTitle}>G-Code Layer Toolpaths</AppText>
                    <AppText style={styles.muted} numberOfLines={1}>
                      {status.job.file.display || status.job.file.name}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const filePath = status?.job?.file?.path || status?.job?.file?.name || '';
                      loadGCode(filePath);
                      setTab('gcode');
                    }}
                    style={[styles.smallBtn, { backgroundColor: theme.colors.primary }]}>
                    <AppText style={[styles.smallBtnText, { color: '#fff' }]}>📐 View Layers →</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <AppText style={styles.cardTitle}>Print Job Actions</AppText>
              <View style={styles.btnGrid}>
                {isPrinting ? (
                  <TouchableOpacity
                    onPress={() => handleJob('pause')}
                    style={[styles.controlBtn, { backgroundColor: theme.colors.warning }]}>
                    <AppText style={styles.controlBtnText}>⏸ Pause Print</AppText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleJob('resume')}
                    style={[styles.controlBtn, { backgroundColor: theme.colors.success }]}>
                    <AppText style={styles.controlBtnText}>▶ Resume Print</AppText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleJob('cancel')}
                  style={[styles.controlBtn, { backgroundColor: theme.colors.error }]}>
                  <AppText style={styles.controlBtnText}>■ Cancel Print</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={refreshStatuses}
                  style={[styles.controlBtn, { backgroundColor: theme.colors.primary }]}>
                  <AppText style={styles.controlBtnText}>↻ Refresh State</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleEmergencyStop}
                  style={[styles.controlBtn, { backgroundColor: '#b91c1c' }]}>
                  <AppText style={styles.controlBtnText}>⛔ Emergency Stop</AppText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.grid2}>
              <View style={styles.statCard}>
                <AppText style={styles.statCardLabel}>STATE</AppText>
                <AppText style={styles.statCardVal}>{status?.state || '—'}</AppText>
              </View>
              <View style={styles.statCard}>
                <AppText style={styles.statCardLabel}>FILE SIZE</AppText>
                <AppText style={styles.statCardVal}>
                  {status?.job?.file?.size ? `${(status.job.file.size / 1024).toFixed(1)} KB` : '—'}
                </AppText>
              </View>
              <View style={styles.statCard}>
                <AppText style={styles.statCardLabel}>PRINT TIME</AppText>
                <AppText style={styles.statCardVal}>
                  {status?.job?.progress?.printTime ? formatDuration(status.job.progress.printTime) : '—'}
                </AppText>
              </View>
              <View style={styles.statCard}>
                <AppText style={styles.statCardLabel}>FILAMENT</AppText>
                <AppText style={styles.statCardVal}>
                  {formatFilament(status?.job?.filament, (status?.job?.file as any)?.gcodeAnalysis?.filament)}
                </AppText>
              </View>
            </View>
          </View>
        )}

        {/* G-CODE TAB */}
        {tab === 'gcode' && (
          <View style={{ gap: 12 }}>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <AppText style={styles.cardTitle}>2D & 3D Layer Visualizer</AppText>
                  <AppText style={styles.muted} numberOfLines={1}>
                    {selectedFile || status?.job?.file?.display || status?.job?.file?.name || 'No file selected'}
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const filePath = selectedFile || status?.job?.file?.path || status?.job?.file?.name || '';
                    if (filePath) loadGCode(filePath);
                  }}
                  disabled={gcodeLoading}
                  style={styles.smallBtn}>
                  <AppText style={styles.smallBtnText}>{gcodeLoading ? 'Loading...' : '↻ Reload'}</AppText>
                </TouchableOpacity>
              </View>

              {gcodeLoading ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <AppText style={[styles.muted, { marginTop: 12 }]}>Downloading and parsing toolpaths...</AppText>
                </View>
              ) : gcodeText ? (
                <View style={{ marginTop: 12 }}>
                  <GCodeViewer gcode={gcodeText} status={status} />
                </View>
              ) : (
                <View style={{ padding: 24, alignItems: 'center', gap: 10 }}>
                  <AppText style={{ fontSize: 36 }}>📐</AppText>
                  <AppText style={styles.cardTitle}>No Toolpath Loaded</AppText>
                  <AppText style={[styles.muted, { textAlign: 'center', maxWidth: 280 }]}>
                    {status?.job?.file?.name
                      ? `Tap below to load toolpaths for "${status.job.file.display || status.job.file.name}"`
                      : 'Select a G-code file from the FILES tab to inspect layer toolpaths.'}
                  </AppText>
                  {status?.job?.file?.name ? (
                    <TouchableOpacity
                      onPress={() => loadGCode(status.job.file!.path || status.job.file!.name)}
                      style={[styles.primaryBtn, { marginTop: 8 }]}>
                      <AppText style={styles.primaryBtnText}>📐 Load Current Print Toolpath</AppText>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        )}

        {/* CONTROL TAB */}
        {tab === 'control' && (
          <View style={{ gap: 12 }}>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <AppText style={styles.cardTitle}>Movement & Jog</AppText>
                <TouchableOpacity
                  onPress={async () => {
                    await disableSteppers(printer);
                    Alert.alert(t('Motors Disabled'), t('Steppers turned off (M84).'));
                  }}
                  style={[styles.smallBtn, { backgroundColor: theme.colors.warning }]}>
                  <AppText style={[styles.smallBtnText, { color: '#000' }]}>⚡ Motors Off</AppText>
                </TouchableOpacity>
              </View>

              {/* Step distance selector */}
              <View style={styles.stepRow}>
                <AppText style={styles.stepLabel}>Step:</AppText>
                {[0.1, 1, 10, 50, 100].map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setJogStep(s)}
                    style={[styles.stepChip, jogStep === s && styles.stepChipActive]}>
                    <AppText style={[styles.stepChipText, jogStep === s && styles.stepChipTextActive]}>
                      {s}mm
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Jog Direction Controls */}
              <View style={styles.jogContainer}>
                <View style={styles.jogRow}>
                  <TouchableOpacity onPress={() => jog(printer, 'y', jogStep)} style={styles.jogBtn}>
                    <AppText style={styles.jogText}>+Y</AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.jogRow}>
                  <TouchableOpacity onPress={() => jog(printer, 'x', -jogStep)} style={styles.jogBtn}>
                    <AppText style={styles.jogText}>-X</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => home(printer, ['x', 'y'])} style={[styles.jogBtn, { backgroundColor: theme.colors.accent }]}>
                    <AppText style={styles.jogText}>XY ⌂</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => jog(printer, 'x', jogStep)} style={styles.jogBtn}>
                    <AppText style={styles.jogText}>+X</AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.jogRow}>
                  <TouchableOpacity onPress={() => jog(printer, 'y', -jogStep)} style={styles.jogBtn}>
                    <AppText style={styles.jogText}>-Y</AppText>
                  </TouchableOpacity>
                </View>

                {/* Z Axis & Home Row */}
                <View style={[styles.jogRow, { marginTop: 12, gap: 10 }]}>
                  <TouchableOpacity onPress={() => jog(printer, 'z', jogStep)} style={styles.jogBtn}>
                    <AppText style={styles.jogText}>+Z</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => home(printer, ['x', 'y', 'z'])} style={[styles.jogBtn, { backgroundColor: theme.colors.primary }]}>
                    <AppText style={styles.jogText}>ALL ⌂</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => home(printer, ['z'])} style={[styles.jogBtn, { backgroundColor: theme.colors.accent }]}>
                    <AppText style={styles.jogText}>Z ⌂</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => jog(printer, 'z', -jogStep)} style={styles.jogBtn}>
                    <AppText style={styles.jogText}>-Z</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Extruder Control */}
            <View style={styles.card}>
              <AppText style={styles.cardTitle}>Extruder Feed</AppText>
              <View style={styles.stepRow}>
                <AppText style={styles.stepLabel}>Amount:</AppText>
                {[5, 10, 25, 50].map(a => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setExtrudeAmount(a)}
                    style={[styles.stepChip, extrudeAmount === a && styles.stepChipActive]}>
                    <AppText style={[styles.stepChipText, extrudeAmount === a && styles.stepChipTextActive]}>
                      {a}mm
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  onPress={async () => {
                    await extrude(printer, extrudeAmount);
                    Alert.alert('Extruding', `Extruding ${extrudeAmount}mm filament`);
                  }}
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0, backgroundColor: theme.colors.success }]}>
                  <AppText style={styles.primaryBtnText}>↓ Extrude (+{extrudeAmount}mm)</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    await extrude(printer, -extrudeAmount);
                    Alert.alert('Retracting', `Retracting ${extrudeAmount}mm filament`);
                  }}
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0, backgroundColor: theme.colors.warning }]}>
                  <AppText style={[styles.primaryBtnText, { color: '#000' }]}>↑ Retract (-{extrudeAmount}mm)</AppText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Temperature Management */}
            <View style={styles.card}>
              <AppText style={styles.cardTitle}>Temperature Presets & Control</AppText>
              <TempManager printer={printer} status={status} />
            </View>

            {/* Fan Speed Control */}
            <View style={styles.card}>
              <AppText style={styles.cardTitle}>Part Cooling Fan</AppText>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                {[0, 25, 50, 75, 100].map(spd => (
                  <TouchableOpacity
                    key={spd}
                    onPress={async () => {
                      await setFanSpeed(printer, spd);
                    }}
                    style={[styles.stepChip, { flex: 1, alignItems: 'center' }]}>
                    <AppText style={styles.stepChipText}>{spd === 0 ? 'Off' : `${spd}%`}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* FILES TAB */}
        {tab === 'files' && (
          <View style={{ gap: 12 }}>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <AppText style={styles.cardTitle}>OctoPrint Files ({files.length})</AppText>
                <TouchableOpacity onPress={loadFiles} style={styles.smallBtn}>
                  <AppText style={styles.smallBtnText}>↻ Refresh</AppText>
                </TouchableOpacity>
              </View>

              {filesLoading ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
              ) : files.length === 0 ? (
                <AppText style={styles.muted}>No files stored on OctoPrint.</AppText>
              ) : (
                flattenFiles(files).slice(0, 50).map((f: any, i: number) => (
                  <View key={i} style={styles.fileCardRow}>
                    <View style={styles.fileIcon}>
                      <AppText style={{ fontSize: 18 }}>📄</AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.fileName} numberOfLines={1}>
                        {f.display || f.name}
                      </AppText>
                      <AppText style={styles.fileMeta}>
                        {(f.size / 1024).toFixed(1)} KB • {f.origin || 'local'}
                        {f.gcodeAnalysis?.estimatedPrintTime ? ` • ~${formatDuration(f.gcodeAnalysis.estimatedPrintTime)}` : ''}
                      </AppText>
                    </View>
                    <View style={styles.fileBtnGroup}>
                      <TouchableOpacity
                        onPress={() => {
                          loadGCode(f.path);
                          setTab('gcode');
                        }}
                        style={styles.filePreviewBtn}>
                        <AppText style={styles.filePreviewBtnText}>Preview</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handlePrintFile(f.path, f.display || f.name)}
                        style={styles.filePrintBtn}>
                        <AppText style={styles.filePrintBtnText}>▶ Print</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteFile(f.path, f.display || f.name)}
                        style={styles.fileDeleteBtn}>
                        <AppText style={styles.fileDeleteBtnText}>✕</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {gcodeLoading && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 14 }} />}

              {gcodeText ? (
                <View style={{ marginTop: 18 }}>
                  <AppText style={styles.cardTitle}>2D & 3D Layer Preview: {selectedFile}</AppText>
                  <GCodeViewer gcode={gcodeText} status={status} />
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* TERMINAL TAB */}
        {tab === 'terminal' && (
          <View style={{ gap: 12 }}>
            <View style={styles.card}>
              <AppText style={styles.cardTitle}>Interactive G-Code Terminal</AppText>
              <AppText style={styles.muted}>Send raw G-code commands directly to printer firmware.</AppText>

              {/* Quick G-code command chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginBottom: 8 }}>
                {[
                  { label: 'Get Temps', cmd: 'M105' },
                  { label: 'Firmware Info', cmd: 'M115' },
                  { label: 'Report Settings', cmd: 'M503' },
                  { label: 'Home All', cmd: 'G28' },
                  { label: 'Motors Off', cmd: 'M84' },
                  { label: 'Fan Max', cmd: 'M106 S255' },
                  { label: 'Fan Off', cmd: 'M107' },
                ].map(c => (
                  <TouchableOpacity
                    key={c.cmd}
                    onPress={() => handleSendTerminalGcode(c.cmd)}
                    style={styles.chipBtn}>
                    <AppText style={styles.chipBtnText}>{c.label} ({c.cmd})</AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.terminalConsole}>
                <ScrollView style={{ maxHeight: 220 }}>
                  {terminalLogs.length === 0 ? (
                    <AppText style={styles.terminalPlaceholder}>Terminal ready. Type a command below or tap a quick chip.</AppText>
                  ) : (
                    terminalLogs.map((l, i) => (
                      <AppText
                        key={i}
                        style={[
                          styles.terminalLine,
                          l.type === 'cmd' ? styles.terminalLineCmd : styles.terminalLineResp,
                        ]}>
                        [{l.time}] {l.text}
                      </AppText>
                    ))
                  )}
                </ScrollView>
              </View>

              <View style={styles.terminalInputRow}>
                <AppTextInput
                  style={styles.terminalInput}
                  placeholder="e.g. G28 X Y or M105"
                  placeholderTextColor={theme.colors.textDim}
                  value={gcodeCommand}
                  onChangeText={setGcodeCommand}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onSubmitEditing={() => handleSendTerminalGcode()}
                />
                <TouchableOpacity onPress={() => handleSendTerminalGcode()} style={styles.terminalSendBtn}>
                  <AppText style={styles.terminalSendText}>Send</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ALERTS TAB */}
        {tab === 'alerts' && (
          <View style={{ gap: 12 }}>
            <View style={styles.card}>
              <AppText style={styles.cardTitle}>Global Notification Settings</AppText>
              <View style={styles.settingRow}>
                <AppText style={styles.settingLabel}>Enable Notifications</AppText>
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={v => updateSettings({ notificationsEnabled: v })}
                  trackColor={{ true: theme.colors.primary }}
                />
              </View>
              <View style={styles.settingRow}>
                <AppText style={styles.settingLabel}>On Print Finished</AppText>
                <Switch
                  value={settings.notifyOnComplete}
                  onValueChange={v => updateSettings({ notifyOnComplete: v })}
                  trackColor={{ true: theme.colors.primary }}
                />
              </View>
              <View style={styles.settingRow}>
                <AppText style={styles.settingLabel}>On Printer Error</AppText>
                <Switch
                  value={settings.notifyOnError}
                  onValueChange={v => updateSettings({ notifyOnError: v })}
                  trackColor={{ true: theme.colors.primary }}
                />
              </View>
              <View style={styles.settingRow}>
                <AppText style={styles.settingLabel}>Progress Milestones (25/50/75/90%)</AppText>
                <Switch
                  value={settings.notifyOnProgress}
                  onValueChange={v => updateSettings({ notifyOnProgress: v })}
                  trackColor={{ true: theme.colors.primary }}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TempManager({ printer, status }: { printer: PrinterConnection; status?: any }) {
  const { t } = useTranslation();
  const [toolTemp, setToolTempLocal] = useState('200');
  const [bedTemp, setBedTempLocal] = useState('60');

  const setToolTempWrapper = (temp: number) => {
    setToolTempLocal(temp.toString());
    setToolTemp(printer, 'tool0', temp);
  };
  const setBedWrapper = (temp: number) => {
    setBedTempLocal(temp.toString());
    setBedTemp(printer, temp);
  };

  return (
    <View style={{ gap: 14, marginTop: 4 }}>
      {/* Hotend Section */}
      <View style={styles.tempBoxSection}>
        <View style={styles.rowBetween}>
          <AppText style={styles.tempLabel}>
            Nozzle (Tool0): {status?.temps?.tool0 ? `${Math.round(status.temps.tool0.actual)}° / ${Math.round(status.temps.tool0.target)}°` : '--'}
          </AppText>
          <TouchableOpacity onPress={() => setToolTempWrapper(0)} style={styles.offBtn}>
            <AppText style={styles.offBtnText}>Turn Off</AppText>
          </TouchableOpacity>
        </View>
        <View style={styles.presetRow}>
          {[
            { name: 'PLA', temp: 200 },
            { name: 'PETG', temp: 235 },
            { name: 'ABS', temp: 245 },
            { name: 'TPU', temp: 220 },
          ].map(p => (
            <TouchableOpacity key={p.name} onPress={() => setToolTempWrapper(p.temp)} style={styles.presetChip}>
              <AppText style={styles.presetChipText}>{p.name} ({p.temp}°)</AppText>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tempInputRow}>
          <AppTextInput
            style={[styles.input, { flex: 1 }]}
            value={toolTemp}
            onChangeText={setToolTempLocal}
            keyboardType="number-pad"
            placeholder="Target °C"
            placeholderTextColor={theme.colors.textDim}
          />
          <TouchableOpacity onPress={() => setToolTempWrapper(parseInt(toolTemp, 10) || 0)} style={styles.smallBtn}>
            <AppText style={styles.smallBtnText}>Set Target</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bed Section */}
      <View style={styles.tempBoxSection}>
        <View style={styles.rowBetween}>
          <AppText style={styles.tempLabel}>
            Heated Bed: {status?.temps?.bed ? `${Math.round(status.temps.bed.actual)}° / ${Math.round(status.temps.bed.target)}°` : '--'}
          </AppText>
          <TouchableOpacity onPress={() => setBedWrapper(0)} style={styles.offBtn}>
            <AppText style={styles.offBtnText}>Turn Off</AppText>
          </TouchableOpacity>
        </View>
        <View style={styles.presetRow}>
          {[
            { name: 'PLA', temp: 60 },
            { name: 'PETG', temp: 75 },
            { name: 'ABS', temp: 100 },
          ].map(p => (
            <TouchableOpacity key={p.name} onPress={() => setBedWrapper(p.temp)} style={styles.presetChip}>
              <AppText style={styles.presetChipText}>{p.name} ({p.temp}°)</AppText>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tempInputRow}>
          <AppTextInput
            style={[styles.input, { flex: 1 }]}
            value={bedTemp}
            onChangeText={setBedTempLocal}
            keyboardType="number-pad"
            placeholder="Target °C"
            placeholderTextColor={theme.colors.textDim}
          />
          <TouchableOpacity onPress={() => setBedWrapper(parseInt(bedTemp, 10) || 0)} style={styles.smallBtn}>
            <AppText style={styles.smallBtnText}>Set Target</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SettingsScreen() {
  const { t } = useTranslation();
const { settings, updateSettings, printers } = usePrinters();

  const openGitHub = () => {
    Linking.openURL('https://github.com/chartmann1590/octopulse').catch(() => {
      Alert.alert(t('Link Error'), t('Unable to open GitHub repository.'));
    });
  };

  const openIssues = () => {
    Linking.openURL('https://github.com/chartmann1590/octopulse/issues').catch(() => {
      Alert.alert(t('Link Error'), t('Unable to open GitHub issues.'));
    });
  };

  // Language & Translation state
  const {
    currentLanguage,
    currentLanguageInfo,
    isModelDownloading: langDownloading,
    downloadProgress: langProgress,
    isModelReady,
    isNativeReady: transNativeReady,
    bridgeStatus,
    supportedLanguages,
    changeLanguage,
  } = useTranslation();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [langError, setLangError] = useState<string | null>(null);

  const handleSelectLanguage = async (code: string) => {
    if (code === currentLanguage) {
      setShowLangPicker(false);
      return;
    }
    setLangError(null);
    setShowLangPicker(false);
    try {
      await changeLanguage(code);
    } catch (e: any) {
      setLangError(e?.message || 'Failed to download ML Kit model. Check internet connection.');
      Alert.alert('Language Change Failed', e?.message || 'Failed to download translation model.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Header title="Settings" subtitle="OctoPulse Preferences & Info" />

      {/* Language & Translation — FREE on-device ML Kit */}
      <View style={styles.card}>
        <AppText style={styles.cardTitle}>Language & Translation</AppText>
        <AppText style={[styles.muted, { marginBottom: 12 }]}>
          Choose your native language. OctoPulse downloads a FREE on-device ML Kit model (~30 MB) and translates every
          screen automatically. Works offline after download.
        </AppText>

        <View style={{ backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AppText style={{ fontSize: 28 }}>{currentLanguageInfo?.flag || '🇺🇸'}</AppText>
            <View style={{ flex: 1 }}>
              <AppText style={styles.settingLabel}>{currentLanguageInfo?.nativeName || 'English'}</AppText>
              <AppText style={styles.settingSub}>{currentLanguageInfo?.name || 'English'} • {currentLanguage}</AppText>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                <View style={{ backgroundColor: isModelReady || currentLanguage === 'en' ? 'rgba(34,197,94,0.15)' : langDownloading ? 'rgba(14,165,233,0.15)' : 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: isModelReady || currentLanguage === 'en' ? theme.colors.success : langDownloading ? theme.colors.primary : theme.colors.error, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                  <AppText style={{ color: isModelReady || currentLanguage === 'en' ? theme.colors.success : langDownloading ? theme.colors.primary : theme.colors.error, fontSize: 10, fontWeight: '800' }}>
                    {currentLanguage === 'en' ? 'Default' : langDownloading ? `Downloading... ${langProgress}%` : isModelReady ? '● Downloaded' : '○ Not Downloaded'}
                  </AppText>
                </View>
                {currentLanguage !== 'en' && <AppText style={{ color: theme.colors.textDim, fontSize: 10 }}>~{currentLanguageInfo?.modelSizeMb} MB • FREE • Offline</AppText>}
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowLangPicker(true)} style={[styles.smallBtn, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
            <AppText style={[styles.smallBtnText, { color: '#fff' }]}>Change Language</AppText>
          </TouchableOpacity>
        </View>

        {langDownloading && (
          <View style={{ marginTop: 12 }}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${langProgress}%` }]} />
            </View>
            <AppText style={[styles.muted, { marginTop: 6, textAlign: 'center' }]}>Downloading ML Kit model for {currentLanguageInfo?.name}... {langProgress}% • Keep app open</AppText>
          </View>
        )}

        {langError && (
          <View style={{ marginTop: 10, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: theme.colors.error, padding: 10, borderRadius: 10 }}>
            <AppText style={{ color: theme.colors.error, fontSize: 12, fontWeight: '700' }}>{langError}</AppText>
          </View>
        )}

        <View style={{ marginTop: 10, backgroundColor: 'rgba(14,165,233,0.08)', borderWidth: 1, borderColor: 'rgba(14,165,233,0.3)', padding: 10, borderRadius: 10 }}>
          <AppText style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>⚡ FREE • Offline • No API Key • Google ML Kit on-device translation</AppText>
          <AppText style={{ color: theme.colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 4 }}>{bridgeStatus}</AppText>
        </View>

        <AppText style={[styles.muted, { marginTop: 10, textAlign: 'center', fontSize: 11 }]}>
          All screens, buttons, and messages will appear in your selected language after the ML Kit is downloaded.
        </AppText>
      </View>

      {/* Language Picker Modal */}
      <Modal visible={showLangPicker} transparent animationType="fade" onRequestClose={() => setShowLangPicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.pairingCard, { maxHeight: '80%', width: '92%' }]}>
            <AppText style={styles.pairingTitle}>Select Language</AppText>
            <AppText style={styles.pairingSubtitle}>Choose your native language — FREE ML Kit download</AppText>
            <ScrollView style={{ width: '100%', marginTop: 12 }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
              {supportedLanguages.map(lang => {
                const isCurrent = lang.code === currentLanguage;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => handleSelectLanguage(lang.code)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isCurrent ? 'rgba(14,165,233,0.12)' : theme.colors.bg,
                      borderWidth: 1,
                      borderColor: isCurrent ? theme.colors.primary : theme.colors.border,
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 8,
                      gap: 12,
                    }}>
                    <AppText style={{ fontSize: 26 }}>{lang.flag}</AppText>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>{lang.nativeName}</AppText>
                      <AppText style={{ color: theme.colors.textMuted, fontSize: 11 }}>{lang.name} • {lang.code} {lang.code !== 'en' ? `• ~${lang.modelSizeMb} MB` : ''}</AppText>
                    </View>
                    {isCurrent ? (
                      <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                        <AppText style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>Current</AppText>
                      </View>
                    ) : (
                      <AppText style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '800' }}>Select →</AppText>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowLangPicker(false)} style={[styles.pairingCancelBtn, { marginTop: 12 }]}>
              <AppText style={styles.pairingCancelText}>Cancel</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notification Preferences */}
      <View style={styles.card}>
        <AppText style={styles.cardTitle}>Notifications & Live Alerts</AppText>
        <AppText style={[styles.muted, { marginBottom: 12 }]}>
          Configure ongoing print progress and completion alerts.
        </AppText>

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <AppText style={styles.settingLabel}>Global Notifications</AppText>
            <AppText style={styles.settingSub}>Master toggle for notifications and alerts</AppText>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={v => updateSettings({ notificationsEnabled: v })}
            trackColor={{ true: theme.colors.primary }}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <AppText style={styles.settingLabel}>Print Finished Alert</AppText>
            <AppText style={styles.settingSub}>Notify when a 3D print completes</AppText>
          </View>
          <Switch
            value={settings.notifyOnComplete}
            disabled={!settings.notificationsEnabled}
            onValueChange={v => updateSettings({ notifyOnComplete: v })}
            trackColor={{ true: theme.colors.primary }}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <AppText style={styles.settingLabel}>Printer Error Alerts</AppText>
            <AppText style={styles.settingSub}>Notify on thermal runaway or printer disconnects</AppText>
          </View>
          <Switch
            value={settings.notifyOnError}
            disabled={!settings.notificationsEnabled}
            onValueChange={v => updateSettings({ notifyOnError: v })}
            trackColor={{ true: theme.colors.primary }}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <AppText style={styles.settingLabel}>Milestone Updates</AppText>
            <AppText style={styles.settingSub}>Alerts at 25%, 50%, 75%, and 90% progress</AppText>
          </View>
          <Switch
            value={settings.notifyOnProgress}
            disabled={!settings.notificationsEnabled}
            onValueChange={v => updateSettings({ notifyOnProgress: v })}
            trackColor={{ true: theme.colors.primary }}
          />
        </View>
      </View>

      {/* Background Monitoring & Polling Interval */}
      <View style={styles.card}>
        <AppText style={styles.cardTitle}>Live Monitoring Frequency</AppText>
        <AppText style={[styles.muted, { marginBottom: 12 }]}>
          How frequently OctoPulse queries your OctoPrint printers.
        </AppText>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'Fast (1.5s)', val: 1500, desc: 'Real-time telemetry' },
            { label: 'Normal (3s)', val: 3000, desc: 'Balanced' },
            { label: 'Eco (5s)', val: 5000, desc: 'Battery saver' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.val}
              onPress={() => updateSettings({ pollIntervalMs: opt.val })}
              style={[
                styles.pollOptionBtn,
                settings.pollIntervalMs === opt.val && styles.pollOptionBtnActive,
              ]}>
              <AppText
                style={[
                  styles.pollOptionTitle,
                  settings.pollIntervalMs === opt.val && styles.pollOptionTitleActive,
                ]}>
                {opt.label}
              </AppText>
              <AppText
                style={[
                  styles.pollOptionDesc,
                  settings.pollIntervalMs === opt.val && styles.pollOptionDescActive,
                ]}>
                {opt.desc}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Features & Capabilities */}
      <View style={styles.card}>
        <AppText style={styles.cardTitle}>Features & Capabilities</AppText>
        <View style={{ gap: 10, marginTop: 8 }}>
          <View style={styles.featureRow}>
            <AppText style={styles.featureIcon}>⚡</AppText>
            <View style={{ flex: 1 }}>
              <AppText style={styles.featureName}>1-Click Zero-Key Pairing</AppText>
              <AppText style={styles.featureDesc}>Authorize instantly via OctoPrint Application Keys plugin</AppText>
            </View>
          </View>
          <View style={styles.featureRow}>
            <AppText style={styles.featureIcon}>📹</AppText>
            <View style={{ flex: 1 }}>
              <AppText style={styles.featureName}>30+ FPS MJPEG Live Camera Feed</AppText>
              <AppText style={styles.featureDesc}>Hardware-accelerated live stream with snapshot & HUD overlay</AppText>
            </View>
          </View>
          <View style={styles.featureRow}>
            <AppText style={styles.featureIcon}>📐</AppText>
            <View style={{ flex: 1 }}>
              <AppText style={styles.featureName}>2D & 3D Layer Visualizer</AppText>
              <AppText style={styles.featureDesc}>Inspect interactive layer toolpaths and print bounds</AppText>
            </View>
          </View>
          <View style={styles.featureRow}>
            <AppText style={styles.featureIcon}>🕹️</AppText>
            <View style={{ flex: 1 }}>
              <AppText style={styles.featureName}>Full Machine Control</AppText>
              <AppText style={styles.featureDesc}>Jog XYZ, extruder feed, heated bed/nozzle presets, and fan speed</AppText>
            </View>
          </View>
          <View style={styles.featureRow}>
            <AppText style={styles.featureIcon}>💻</AppText>
            <View style={{ flex: 1 }}>
              <AppText style={styles.featureName}>Interactive Terminal Console</AppText>
              <AppText style={styles.featureDesc}>Direct G-code terminal with quick chip macros</AppText>
            </View>
          </View>
        </View>
      </View>

      {/* Open Source & Community */}
      <View style={styles.card}>
        <AppText style={styles.cardTitle}>Open Source & Support</AppText>
        <AppText style={[styles.muted, { marginBottom: 12 }]}>
          OctoPulse is free, open-source software built for the 3D printing community.
        </AppText>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={openGitHub} style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}>
            <AppText style={styles.primaryBtnText}>⭐ GitHub Repo</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openIssues}
            style={[styles.smallBtn, { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bgCardElevated }]}>
            <AppText style={styles.smallBtnText}>🐛 Report Issue</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={styles.card}>
        <AppText style={styles.cardTitle}>About OctoPulse</AppText>
        <View style={styles.aboutRow}>
          <AppText style={styles.aboutLabel}>Version</AppText>
          <AppText style={styles.aboutValue}>1.0.0 (Release)</AppText>
        </View>
        <View style={styles.aboutRow}>
          <AppText style={styles.aboutLabel}>Connected Printers</AppText>
          <AppText style={styles.aboutValue}>{printers.length} online / registered</AppText>
        </View>
        <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
          <AppText style={styles.aboutLabel}>License</AppText>
          <AppText style={styles.aboutValue}>MIT Open Source</AppText>
        </View>
      </View>
    </ScrollView>
  );
}

function flattenFiles(files: any[]): any[] {
  const out: any[] = [];
  function walk(list: any[], prefix = '') {
    for (const f of list) {
      if (f.type === 'folder' && f.children) walk(f.children, prefix + f.name + '/');
      else out.push({ ...f, path: prefix + f.name });
    }
  }
  walk(files);
  return out.length ? out : files;
}

function AppInner() {
  const { t } = useTranslation();
const [tab, setTab] = useState<'dashboard' | 'discover' | 'settings'>('dashboard');
  const [selected, setSelected] = useState<PrinterConnection | null>(null);

  useEffect(() => {
    ensurePermissions();
  }, []);

  if (selected) {
    return <PrinterDetail printer={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {tab === 'dashboard' && <DashboardScreen onSelect={setSelected} onDiscover={() => setTab('discover')} />}
      {tab === 'discover' && (
        <DiscoverScreen
          onAdded={() => setTab('dashboard')}
          onClose={() => setTab('dashboard')}
        />
      )}
      {tab === 'settings' && <SettingsScreen />}

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => setTab('dashboard')} style={[styles.navItem, tab === 'dashboard' && styles.navItemActive]}>
          <AppText style={[styles.navIcon, tab === 'dashboard' && styles.navIconActive]}>🖨️</AppText>
          <AppText style={[styles.navText, tab === 'dashboard' && styles.navTextActive]}>Printers</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('discover')} style={[styles.navFab, tab === 'discover' && { backgroundColor: '#0284c7' }]}>
          <AppText style={styles.navFabText}>＋</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('settings')} style={[styles.navItem, tab === 'settings' && styles.navItemActive]}>
          <AppText style={[styles.navIcon, tab === 'settings' && styles.navIconActive]}>⚙️</AppText>
          <AppText style={[styles.navText, tab === 'settings' && styles.navTextActive]}>Settings</AppText>
        </TouchableOpacity>
      </View>
      <AdBanner />
    </View>
  );
}

function RootGate() {
  const { isOnboardingDone, isHydrated } = useTranslation();
  if (!isHydrated) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <AppText style={styles.muted}>Loading OctoPulse...</AppText>
      </View>
    );
  }
  if (!isOnboardingDone) {
    return <OnboardingLanguageScreen />;
  }
  return <AppInner />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TranslationProvider>
        <PrinterProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
            <StatusBar style="light" />
            <RootGate />
          </SafeAreaView>
        </PrinterProvider>
      </TranslationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg, gap: 12 },
  muted: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgCard,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  headerSubtitle: { color: theme.colors.textMuted, fontSize: 11 },
  iconBtn: {
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  iconBtnText: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
  hero: {
    backgroundColor: theme.colors.bgCardElevated,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  heroTitle: { color: theme.colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  heroSub: { color: theme.colors.primaryLight, fontSize: 11, letterSpacing: 2, fontWeight: '800', marginTop: 2 },
  heroStats: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: theme.colors.bg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: theme.colors.textMuted, fontSize: 9, letterSpacing: 1, marginTop: 2, fontWeight: '800' },
  statDivider: { width: 1, backgroundColor: theme.colors.border, marginHorizontal: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  smallBtn: {
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  smallBtnText: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  empty: {
    backgroundColor: theme.colors.bgCardElevated,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 44, marginBottom: 8 },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  emptySub: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  hintText: { color: theme.colors.textDim, fontSize: 10, textAlign: 'center', marginTop: 8 },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
    width: '100%',
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  infoCard: {
    backgroundColor: theme.colors.bg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 16,
  },
  infoTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 13, marginBottom: 6 },
  infoText: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 18 },
  card: {
    backgroundColor: theme.colors.bgCardElevated,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  cardTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchLabel: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 12,
  },
  discoverIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverName: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  discoverSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  pairBtnBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pairBtnText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  detailHero: {
    backgroundColor: theme.colors.bgCardElevated,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    gap: 12,
  },
  detailFile: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  detailProgress: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '700', marginTop: 4 },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.bg,
    borderRadius: 6,
    marginTop: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 6 },
  detailTime: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4 },
  detailTemps: { gap: 8, minWidth: 110 },
  miniTemp: {
    backgroundColor: theme.colors.bg,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  miniTempLabel: { color: theme.colors.textDim, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  miniTempVal: { color: theme.colors.text, fontSize: 12, fontWeight: '800', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 12 },
  tab: {
    flex: 1,
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabText: { color: theme.colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  tabTextActive: { color: '#fff' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: (Dimensions.get('window').width - 16 * 2 - 10) / 2,
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
  },
  statCardLabel: { color: theme.colors.textDim, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  statCardVal: { color: theme.colors.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  btnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  controlBtn: { flexBasis: '48%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  controlBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 8 },
  stepLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  stepChip: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stepChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  stepChipText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  stepChipTextActive: { color: '#fff' },
  jogContainer: { alignItems: 'center', marginTop: 8 },
  jogRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 4 },
  jogBtn: {
    width: 68,
    height: 44,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jogText: { color: theme.colors.text, fontWeight: '800', fontSize: 12 },
  tempBoxSection: {
    backgroundColor: theme.colors.bg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tempLabel: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  offBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offBtnText: { color: theme.colors.error, fontSize: 10, fontWeight: '700' },
  presetRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  presetChip: {
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  presetChipText: { color: theme.colors.text, fontSize: 10, fontWeight: '700' },
  tempInputRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  fileCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  fileIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.colors.bgCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  fileMeta: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
  fileBtnGroup: { flexDirection: 'row', gap: 6 },
  filePreviewBtn: {
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filePreviewBtnText: { color: theme.colors.text, fontSize: 10, fontWeight: '700' },
  filePrintBtn: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filePrintBtnText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  fileDeleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  fileDeleteBtnText: { color: theme.colors.error, fontSize: 10, fontWeight: '800' },
  chipBtn: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  chipBtnText: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700' },
  terminalConsole: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    minHeight: 140,
    marginTop: 6,
  },
  terminalPlaceholder: { color: theme.colors.textDim, fontSize: 11, fontStyle: 'italic' },
  terminalLine: { fontSize: 10, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier', marginVertical: 1 },
  terminalLineCmd: { color: theme.colors.primaryLight, fontWeight: '700' },
  terminalLineResp: { color: '#94a3b8' },
  terminalInputRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  terminalInput: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: 12,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  terminalSendBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  terminalSendText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navItemActive: { opacity: 1 },
  navIcon: { fontSize: 18, color: theme.colors.textMuted },
  navIconActive: { color: theme.colors.primary },
  navText: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  navTextActive: { color: theme.colors.text },
  navFab: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  navFabText: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: -2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pairingCard: {
    backgroundColor: theme.colors.bgCardElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  pairingHeader: { alignItems: 'center', marginBottom: 16 },
  pairingTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900' },
  pairingSubtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
  pairingBody: { alignItems: 'center', width: '100%', marginVertical: 12 },
  pulsingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pulsingIcon: { fontSize: 32 },
  pairingInstructionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  pairingInstructionText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  countdownText: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  pairingStatusText: { color: theme.colors.textMuted, fontSize: 13, marginTop: 12 },
  successIcon: { fontSize: 44, color: theme.colors.success, marginBottom: 8 },
  successTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  successSub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
  errorIcon: { fontSize: 44, color: theme.colors.error, marginBottom: 8 },
  errorTitle: { color: theme.colors.error, fontSize: 17, fontWeight: '800' },
  pairingFooter: { width: '100%', marginTop: 16 },
  pairingCancelBtn: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  pairingCancelText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  settingLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  settingSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  settingDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 6 },
  pollOptionBtn: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  pollOptionBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pollOptionTitle: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  pollOptionTitleActive: { color: '#fff' },
  pollOptionDesc: { color: theme.colors.textDim, fontSize: 9, marginTop: 2, textAlign: 'center' },
  pollOptionDescActive: { color: '#e0f2fe' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  featureIcon: { fontSize: 20 },
  featureName: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  featureDesc: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  aboutLabel: { color: theme.colors.textMuted, fontSize: 12 },
  aboutValue: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
});
