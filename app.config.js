// app.config.js — Expo config with AdMob IDs injected from environment / GitHub Secrets
// IMPORTANT: Production AdMob IDs are NEVER hardcoded here.
// They are read from process.env at build time. Local fallback = Google test IDs.
// Set these in .env locally (gitignored) or as GitHub Secrets for CI/EAS builds.
//
// Required env vars (all support both prefixed and non-prefixed forms):
//   ADMOB_ANDROID_APP_ID / EXPO_PUBLIC_ADMOB_ANDROID_APP_ID  -> ca-app-pub-...~...
//   ADMOB_BANNER_AD_ID   / EXPO_PUBLIC_ADMOB_BANNER_ID        -> ca-app-pub-.../...
//   ADMOB_INTERSTITIAL_AD_ID / EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID
//   ADMOB_IOS_APP_ID     / EXPO_PUBLIC_ADMOB_IOS_APP_ID       (optional, falls back to test ID)

module.exports = function ({ config }) {
  // Resolve Android App ID - used in android.config.googleMobileAdsAppId and react-native-google-mobile-ads plugin
  const androidAppId =
    process.env.ADMOB_ANDROID_APP_ID ||
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
    config.android?.config?.googleMobileAdsAppId;

  // Resolve iOS App ID - optional, defaults to existing test ID in app.json
  const existingGAdsPlugin = (config.plugins || []).find(
    (p) => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads'
  );
  const existingIosAppId = Array.isArray(existingGAdsPlugin) ? existingGAdsPlugin[1]?.iosAppId : undefined;

  const iosAppId =
    process.env.ADMOB_IOS_APP_ID ||
    process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
    existingIosAppId;

  // Banner / Interstitial — runtime values, exposed via Constants.expoConfig.extra
  // In JS bundle they are also available as process.env.EXPO_PUBLIC_ADMOB_* (Expo public env)
  const bannerId =
    process.env.ADMOB_BANNER_AD_ID ||
    process.env.EXPO_PUBLIC_ADMOB_BANNER_ID ||
    undefined;

  const interstitialId =
    process.env.ADMOB_INTERSTITIAL_AD_ID ||
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ||
    undefined;

  // Patch plugins array to inject resolved IDs
  const plugins = (config.plugins || []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads') {
      return [
        'react-native-google-mobile-ads',
        {
          androidAppId: androidAppId,
          iosAppId: iosAppId,
        },
      ];
    }
    return plugin;
  });

  // Play Store versioning — VERSION_CODE auto-increments in CI; fallback to 1
  // VERSION_NAME defaults to config.version (1.0.0); can be overridden for patch builds
  const versionCode = (() => {
    const v = process.env.VERSION_CODE || config.android?.versionCode;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  })();
  const versionName = process.env.VERSION_NAME || config.version || "1.0.0";

  return {
    ...config,
    version: versionName,
    android: {
      ...config.android,
      package: config.android?.package || "com.charles.octopulse",
      versionCode,
      config: {
        ...config.android?.config,
        googleMobileAdsAppId: androidAppId,
      },
    },
    plugins,
    extra: {
      ...config.extra,
      // Exposed to app at runtime via Constants.expoConfig.extra
      // These are set only when env is present; JS code falls back to TestIds in __DEV__
      admobBannerId: bannerId,
      admobInterstitialId: interstitialId,
      admobAndroidAppId: androidAppId,
      admobIosAppId: iosAppId,
    },
  };
};
