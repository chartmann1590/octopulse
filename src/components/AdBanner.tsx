import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';
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

// Resolve AdMob unit IDs from env / expo extra — never hardcode production IDs here
// Priority: EXPO_PUBLIC_* (Expo public env, available in JS bundle) -> Constants.expoConfig.extra -> TestIds fallback for dev
function getEnvId(keys: string[]): string | undefined {
  for (const k of keys) {
    // process.env is injected by Expo for EXPO_PUBLIC_ vars
    const v = (process.env as any)?.[k];
    if (v) return v;
  }
  return undefined;
}

function getExtraId(key: string): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {}) as any;
  return extra?.[key];
}

const GOOGLE_TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const GOOGLE_TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

export const BANNER_ID =
  getEnvId(['EXPO_PUBLIC_ADMOB_BANNER_ID', 'EXPO_PUBLIC_ADMOB_BANNER_AD_ID']) ||
  getExtraId('admobBannerId') ||
  (TestIds ? TestIds.BANNER : GOOGLE_TEST_BANNER);

export const INTERSTITIAL_ID =
  getEnvId(['EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID', 'EXPO_PUBLIC_ADMOB_INTERSTITIAL_AD_ID']) ||
  getExtraId('admobInterstitialId') ||
  (TestIds ? TestIds.INTERSTITIAL : GOOGLE_TEST_INTERSTITIAL);

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
  const isTest = BANNER_ID === GOOGLE_TEST_BANNER || BANNER_ID?.includes('3940256099942544');
  return (
    <View style={styles.container}>
      <View style={styles.adBox}>
        <Text style={styles.adLabel}>AD • {isTest ? 'TEST BANNER' : 'BANNER'}</Text>
        <Text style={styles.adSub}>{BANNER_ID}</Text>
        <Text style={styles.adHint}>AdMob linked • {isTest ? 'Test ID' : 'Production ID'}</Text>
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
