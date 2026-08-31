import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../theme';

let BannerAd: any = null;
let BannerAdSize: any = null;
let InterstitialAd: any = null;
let AdEventType: any = null;
let TestIds: any = null;

try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  InterstitialAd = ads.InterstitialAd;
  AdEventType = ads.AdEventType;
  TestIds = ads.TestIds;
} catch {}

const BANNER_ID = TestIds ? TestIds.BANNER : 'ca-app-pub-3940256099942544/6300978111';
const INTERSTITIAL_ID = TestIds ? TestIds.INTERSTITIAL : 'ca-app-pub-3940256099942544/1033173712';

export function AdBanner({ unitId, size }: { unitId?: string; size?: string }) {
  if (BannerAd && BannerAdSize) {
    return (
      <View style={styles.container}>
        <BannerAd
          unitId={unitId || BANNER_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={(e:any)=> console.log('Banner failed', e)}
        />
      </View>
    );
  }
  // Fallback placeholder if native module not linked (Expo Go)
  return (
    <View style={styles.container}>
      <View style={styles.adBox}>
        <Text style={styles.adLabel}>AD • TEST BANNER</Text>
        <Text style={styles.adSub}>ca-app-pub-3940256099942544/6300978111</Text>
        <Text style={styles.adHint}>AdMob linked • Test ID</Text>
      </View>
    </View>
  );
}

export function useInterstitial() {
  const [loaded, setLoaded] = useState(false);
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    if (!InterstitialAd || !AdEventType) return;
    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
    const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => setLoaded(true));
    const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      interstitial.load();
    });
    interstitial.load();
    setAd(interstitial);
    return () => { unsubLoaded(); unsubClosed(); };
  }, []);

  const show = () => {
    if (ad && loaded) {
      ad.show();
      return true;
    }
    return false;
  };
  return { loaded, show };
}

export function InterstitialTrigger({ onShow }: { onShow?: ()=>void }) { return null; }

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: theme.colors.bgCard,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 54,
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
