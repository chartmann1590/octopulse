import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { theme } from '../theme';
import { PrinterConnection, PrinterStatus } from '../types';
import { getCameraSettings, baseUrl } from '../services/octoprint';

let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {}

export function CameraView({
  printer,
  status,
  aspectRatio = 16 / 9,
}: {
  printer: PrinterConnection;
  status?: PrinterStatus;
  aspectRatio?: number;
}) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'stream' | 'snapshot'>('stream');
  const [refreshKey, setRefreshKey] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [customStream, setCustomStream] = useState('');
  const [customSnapshot, setCustomSnapshot] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const cam = await getCameraSettings(printer);
        if (!mounted) return;

        if (cam && cam.streamUrl) {
          setStreamUrl(cam.streamUrl);
          setSnapshotUrl(cam.snapshotUrl || `${cam.streamUrl.replace(/stream/, 'snapshot')}`);
          setFlipH(!!cam.flipH);
          setFlipV(!!cam.flipV);
          setRotation(cam.rotate90 ? 90 : 0);
        } else {
          const bUrl = baseUrl(printer);
          setStreamUrl(`${bUrl}/webcam/?action=stream`);
          setSnapshotUrl(`${bUrl}/webcam/?action=snapshot`);
        }
      } catch (e: any) {
        if (mounted) setError(e.message || 'Failed to load camera settings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [printer]);

  // Snapshot auto-refresh interval when in snapshot mode
  useEffect(() => {
    if (mode !== 'snapshot' || !snapshotUrl) return;
    const interval = setInterval(() => setRefreshKey(k => k + 1), 1500);
    return () => clearInterval(interval);
  }, [mode, snapshotUrl]);

  const activeStream = customStream || streamUrl;
  const activeSnapshot = customSnapshot || snapshotUrl;

  const screenWidth = Dimensions.get('window').width - 32;
  const cardHeight = Math.min(260, screenWidth / aspectRatio);

  const getTransformCss = () => {
    const transforms: string[] = [];
    if (flipH) transforms.push('scaleX(-1)');
    if (flipV) transforms.push('scaleY(-1)');
    if (rotation) transforms.push(`rotate(${rotation}deg)`);
    return transforms.length ? `transform: ${transforms.join(' ')};` : '';
  };

  const getTransformStyle = () => {
    const transforms: any[] = [];
    if (flipH) transforms.push({ scaleX: -1 });
    if (flipV) transforms.push({ scaleY: -1 });
    if (rotation) transforms.push({ rotate: `${rotation}deg` });
    return transforms;
  };

  const renderStreamContent = (isFs = false) => {
    if (!activeStream) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.hint}>No camera stream available</Text>
        </View>
      );
    }

    // HTML5 Stream Viewer using WebView for hardware-accelerated MJPEG
    if (WebView && mode === 'stream') {
      const transformCss = getTransformCss();
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
            <style>
              * { margin:0; padding:0; box-sizing:border-box; }
              html, body {
                width: 100%;
                height: 100%;
                background: #000;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
              }
              img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                ${transformCss}
              }
              #error-box {
                display: none;
                color: #ef4444;
                font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;
                font-size: 13px;
                text-align: center;
                padding: 16px;
                line-height: 1.5;
              }
            </style>
          </head>
          <body>
            <img id="stream-img" src="${activeStream}" onerror="onImgError()" onload="onImgLoad()" />
            <div id="error-box">
              <span style="font-size:22px;">📹</span><br>
              <strong>Stream reconnecting...</strong><br>
              <span style="color:#94a3b8;font-size:11px;">Connecting to camera at ${activeStream}</span>
            </div>
            <script>
              var retryTimer = null;
              var retryCount = 0;
              function showImg() {
                var img = document.getElementById('stream-img');
                var err = document.getElementById('error-box');
                if (img) img.style.display = 'block';
                if (err) err.style.display = 'none';
              }
              function onImgError() {
                var img = document.getElementById('stream-img');
                var err = document.getElementById('error-box');
                if (err) err.style.display = 'block';
                if (img) img.style.display = 'none';
                clearTimeout(retryTimer);
                retryTimer = setTimeout(function() {
                  if (img) {
                    retryCount++;
                    var base = "${activeStream}";
                    var sep = base.indexOf('?') >= 0 ? '&' : '?';
                    img.src = base + sep + '_r=' + Date.now();
                    img.style.display = 'block';
                  }
                }, 2000);
              }
              function onImgLoad() {
                showImg();
                retryCount = 0;
              }
              // Active liveness poller: Ensures multipart MJPEG stream stays displayed
              setInterval(function() {
                var img = document.getElementById('stream-img');
                if (img && img.naturalWidth > 0 && img.style.display === 'none') {
                  showImg();
                }
              }, 400);
            </script>
          </body>
        </html>
      `;

      return (
        <WebView
          key={`webview_${activeStream}_${refreshKey}_${flipH}_${flipV}_${rotation}`}
          source={{ html, baseUrl: `http://${printer.host}:${printer.port}/` }}
          containerStyle={{ width: '100%', height: '100%', backgroundColor: '#000' }}
          style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          scrollEnabled={false}
          bounces={false}
          mixedContentMode="always"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          setSupportMultipleWindows={false}
          cacheEnabled={false}
          cacheMode="LOAD_NO_CACHE"
          androidLayerType="hardware"
          androidHardwareAccelerationDisabled={false}
          onError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView stream error', nativeEvent);
          }}
          onHttpError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView http error', nativeEvent);
          }}
        />
      );
    }

    // Snapshot or Native Stream mode fallback using native Image
    const displayUri = mode === 'snapshot' && activeSnapshot
      ? `${activeSnapshot}${activeSnapshot.includes('?') ? '&' : '?'}t=${Date.now()}_${refreshKey}`
      : activeStream || activeSnapshot;

    if (displayUri) {
      return (
        <Image
          key={`img_${mode}_${refreshKey}`}
          source={{
            uri: displayUri,
            headers: { 'X-Api-Key': printer.apiKey } as any,
          }}
          style={[
            { width: '100%', height: '100%', backgroundColor: '#000' },
            { transform: getTransformStyle() },
          ]}
          resizeMode="contain"
          onError={() => setError('Camera feed failed to load')}
        />
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.hint}>Camera disconnected</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Live Camera Feed</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            onPress={() => setMode('stream')}
            style={[styles.modeBtn, mode === 'stream' && styles.modeBtnActive]}>
            <Text style={[styles.modeText, mode === 'stream' && styles.modeTextActive]}>
              Stream
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('snapshot')}
            style={[styles.modeBtn, mode === 'snapshot' && styles.modeBtnActive]}>
            <Text style={[styles.modeText, mode === 'snapshot' && styles.modeTextActive]}>
              Snapshot
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.videoContainer, { height: cardHeight }]}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.hint}>Loading camera feed...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setRefreshKey(k => k + 1)} style={styles.btnSmall}>
              <Text style={styles.btnSmallText}>↻ Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          renderStreamContent(false)
        )}

        <TouchableOpacity
          onPress={() => setFullscreen(true)}
          style={styles.fullscreenBtn}
          activeOpacity={0.8}>
          <Text style={styles.fullscreenBtnText}>⛶ Fullscreen</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          onPress={() => setRefreshKey(k => k + 1)}
          style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFlipH(v => !v)}
          style={[styles.actionBtn, flipH && styles.actionBtnActive]}>
          <Text style={[styles.actionBtnText, flipH && styles.actionBtnTextActive]}>
            ⇄ Flip H
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFlipV(v => !v)}
          style={[styles.actionBtn, flipV && styles.actionBtnActive]}>
          <Text style={[styles.actionBtnText, flipV && styles.actionBtnTextActive]}>
            ⇅ Flip V
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setRotation(r => ((r + 90) % 360) as any)}
          style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>↷ {rotation}°</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowConfig(true)}
          style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>⚙ URL</Text>
        </TouchableOpacity>
      </View>

      {/* Fullscreen Video Modal */}
      <Modal
        visible={fullscreen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setFullscreen(false)}>
        <View style={styles.fullscreenModal}>
          <View style={styles.fsTopBar}>
            <View>
              <Text style={styles.fsTitle}>{printer.name} • Live Stream</Text>
              <Text style={styles.fsSub}>{activeStream}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setFullscreen(false)}
              style={styles.fsCloseBtn}>
              <Text style={styles.fsCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fsVideoWrap}>
            {renderStreamContent(true)}

            {/* Live HUD Overlay */}
            {status && (
              <View style={styles.hudOverlay}>
                <View style={styles.hudItem}>
                  <Text style={styles.hudLabel}>HOTEND</Text>
                  <Text style={styles.hudValue}>
                    {status.temps.tool0 ? `${Math.round(status.temps.tool0.actual)}° / ${Math.round(status.temps.tool0.target)}°` : '--'}
                  </Text>
                </View>
                <View style={styles.hudItem}>
                  <Text style={styles.hudLabel}>BED</Text>
                  <Text style={styles.hudValue}>
                    {status.temps.bed ? `${Math.round(status.temps.bed.actual)}° / ${Math.round(status.temps.bed.target)}°` : '--'}
                  </Text>
                </View>
                <View style={styles.hudItem}>
                  <Text style={styles.hudLabel}>PROGRESS</Text>
                  <Text style={styles.hudValue}>
                    {status.job?.progress?.completion ? `${status.job.progress.completion.toFixed(1)}%` : '0%'}
                  </Text>
                </View>
                <View style={styles.hudItem}>
                  <Text style={styles.hudLabel}>STATE</Text>
                  <Text style={styles.hudValue}>{status.state || 'Idle'}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.fsBottomBar}>
            <TouchableOpacity
              onPress={() => setRefreshKey(k => k + 1)}
              style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>↻ Reconnect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFlipH(v => !v)}
              style={[styles.actionBtn, flipH && styles.actionBtnActive]}>
              <Text style={[styles.actionBtnText, flipH && styles.actionBtnTextActive]}>Flip H</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFlipV(v => !v)}
              style={[styles.actionBtn, flipV && styles.actionBtnActive]}>
              <Text style={[styles.actionBtnText, flipV && styles.actionBtnTextActive]}>Flip V</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRotation(r => ((r + 90) % 360) as any)}
              style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Rotate ({rotation}°)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode(m => (m === 'stream' ? 'snapshot' : 'stream'))}
              style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>
                {mode === 'stream' ? 'MJPEG Stream' : 'Snapshot'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom URL Configuration Modal */}
      <Modal
        visible={showConfig}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConfig(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Camera Stream Settings</Text>
            <Text style={styles.modalSub}>
              Override OctoPrint camera stream / snapshot URL (e.g. for Octo4a or custom camera ports).
            </Text>

            <Text style={styles.inputLabel}>MJPEG Stream URL</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={streamUrl || 'http://192.168.1.50:8080/?action=stream'}
              placeholderTextColor={theme.colors.textDim}
              value={customStream}
              onChangeText={setCustomStream}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Snapshot URL</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={snapshotUrl || 'http://192.168.1.50:8080/?action=snapshot'}
              placeholderTextColor={theme.colors.textDim}
              value={customSnapshot}
              onChangeText={setCustomSnapshot}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setCustomStream('');
                  setCustomSnapshot('');
                  setShowConfig(false);
                }}
                style={styles.modalBtnSecondary}>
                <Text style={styles.modalBtnSecondaryText}>Reset to Default</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setRefreshKey(k => k + 1);
                  setShowConfig(false);
                }}
                style={styles.modalBtnPrimary}>
                <Text style={styles.modalBtnPrimaryText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  liveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.error,
  },
  liveText: {
    color: theme.colors.error,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bg,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  modeText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  modeTextActive: {
    color: '#fff',
  },
  videoContainer: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    textAlign: 'center',
  },
  btnSmall: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  btnSmallText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  fullscreenBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fullscreenBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    borderColor: theme.colors.primary,
  },
  actionBtnText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnTextActive: {
    color: theme.colors.primary,
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  fsTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#0a0f1d',
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  fsTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  fsSub: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  fsCloseBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fsCloseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  fsVideoWrap: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  hudOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  hudItem: {
    flex: 1,
    alignItems: 'center',
  },
  hudLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  hudValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  fsBottomBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#0a0f1d',
    borderTopWidth: 1,
    borderColor: '#1e293b',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: theme.colors.bgCardElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalBtnSecondary: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBtnPrimary: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
