import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../theme';
// Placeholder AdMob banner (test). When react-native-google-mobile-ads is linked, swap to real BannerAd.

export function AdBanner({ unitId, size }: { unitId?: string; size?: string }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(()=> setLoaded(true), 300);
    return () => clearTimeout(t);
  }, []);
  // Try to load real ads if library available
  // const BannerAd etc. require native module - guarded
  return (
    <View style={styles.container}>
      <View style={styles.adBox}>
        <Text style={styles.adLabel}>AD • TEST BANNER</Text>
        <Text style={styles.adSub}>ca-app-pub-3940256099942544/6300978111</Text>
        <Text style={styles.adHint}>{loaded ? 'Ad placeholder ready • will show real AdMob when linked' : 'Loading...'}</Text>
      </View>
    </View>
  );
}

export function InterstitialTrigger({ onShow }: { onShow?: ()=>void }) {
  // In real implementation, use InterstitialAd.createForAdRequest
  return null;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: theme.colors.bgCard,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  adBox: {
    width: '92%',
    height: 52,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adLabel: { color: theme.colors.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  adSub: { color: theme.colors.textDim, fontSize: 9, marginTop: 2 },
  adHint: { color: theme.colors.textDim, fontSize: 8, marginTop: 2 },
});
