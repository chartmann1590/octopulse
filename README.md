# OctoPulse — Monitor • Control • Print

> Control your OctoPrint 3D printer from your Android phone. Check progress, watch the camera, and manage prints on your Wi-Fi.

**🌐 Website:** https://chartmann1590.github.io/octopulse/  
**🔒 Privacy Policy:** https://chartmann1590.github.io/octopulse/privacy.html  
**▶️ Google Play:** Ready — automated publishing via GitHub → Play internal track (free)  
**☕ Sponsor:** https://buymeacoffee.com/charleshartmann • **GitHub:** https://github.com/chartmann1590/octopulse

[![Deploy site](https://github.com/chartmann1590/octopulse/actions/workflows/pages.yml/badge.svg)](https://github.com/chartmann1590/octopulse/actions/workflows/pages.yml)
[![Play Store — Build & Publish](https://github.com/chartmann1590/octopulse/actions/workflows/play-store.yml/badge.svg)](https://github.com/chartmann1590/octopulse/actions/workflows/play-store.yml)
[![Build Android](https://github.com/chartmann1590/octopulse/actions/workflows/android-build.yml/badge.svg)](https://github.com/chartmann1590/octopulse/actions/workflows/android-build.yml)

## Features

- 🔍 **Auto-discovery** — mDNS/Bonjour, SSDP & smart subnet scan; strict OctoPrint verification
- ⚡ **1-Click pairing** — official Application Keys flow (`/api/plugin/appkeys`) — just tap ALLOW in OctoPrint
- 📷 **Live camera** — MJPEG/snapshot streaming with flip/rotate & auto-reconnect
- 📐 **G-code viewer** — 2D/3D layer toolpaths, pinch-zoom & orbit
- 🎛️ **Full control** — jog XYZ, home, extrude/retract, temps/fan, emergency stop, terminal
- 🔔 **Smart alerts** — print finished / error / 25/50/75/90% milestones, per-printer toggles
- 📄 **Files** — browse, preview, start print, delete
- 📊 **Dashboard** — multi-printer status cards, progress & temps at a glance

## Quick start

```bash
pnpm install
pnpm start        # Expo
pnpm android      # run on device/emulator
```

Add your OctoPrint manually or tap **Discover Printers on Wi-Fi** → **Pair & Connect** → approve in OctoPrint browser.

## Website

The marketing site lives in [`/docs`](docs/) and is deployed to GitHub Pages via `.github/workflows/pages.yml`.

- Landing: `docs/index.html`
- Privacy Policy (required for Play Store + AdMob): `docs/privacy.html` — also available at `/privacy/`
- Assets: `docs/assets/` (icon etc.), `docs/style.css`, `docs/script.js`

Local preview:

```bash
npx serve docs
# or
python -m http.server --directory docs 8000
```

## Privacy & Ads

OctoPulse is **free and ad-supported**. Ads are served by **Google AdMob** using the Advertising ID (`AD_ID`). Print data, camera feeds and API keys never leave your device. Ads are non-intrusive (bottom banner + occasional interstitial after non-critical actions, never during printing).

Full policy: **https://chartmann1590.github.io/octopulse/privacy.html**

Data Safety for Play Console mirrors that policy — see [`store/data_safety.md`](store/data_safety.md) and [`store/STORE_LISTING_CHECKLIST.md`](store/STORE_LISTING_CHECKLIST.md). Configure the privacy policy URL in Play Console → Policy → Privacy policy.

## Play Store — Listing & Automated Publishing

All store assets are versioned in this repo and ready for Play Console:

- **Hi-res icon:** `store/assets/icon-512.png` (512×512, PNG-32)
- **Feature graphic:** `store/assets/feature-graphic-1024x500.png` (1024×500)
- **Phone screenshots:** `store/assets/screenshots/phone/*.png` (6 × 1080×2340, PNG)
- **Promo video:** `docs/video/promo.mp4` (1920×1080, 31s) + captions — upload to YouTube, paste URL in Console
- **Listing copy:** `store/listing/en-US/{title,short_description,full_description,whats_new}.txt`
- **Data safety:** `store/data_safety.md` / `.csv` mirrors privacy.html
- **Fastlane metadata:** `fastlane/metadata/android/en-US/` (also for `supply`)

**Service account (GitHub → Play):** create locally where you are authenticated as `charles.h.hartmann1@gmail.com`:

```bash
bash tools/create-play-service-account.sh
# prints: github-play-publisher@octopulse-charles-2026.iam.gserviceaccount.com
```

Add that email in **Play Console → Users and permissions → Invite new users → Admin** (or Release Manager). Store the JSON key as GitHub Secret `PLAY_SERVICE_ACCOUNT_JSON`:

```bash
gh secret set PLAY_SERVICE_ACCOUNT_JSON --repo chartmann1590/octopulse < ./secrets/github-play-publisher-octopulse-charles-2026.json
gh secret list --repo chartmann1590/octopulse | grep -E "ADMOB|PLAY"
```

**CI publish flow (`.github/workflows/play-store.yml`):**
- On push to `main` affecting app code → builds signed **AAB** (`VERSION_CODE = github.run_number`) with AdMob IDs from secrets → uploads to **internal** track (status `draft`).
- Manual `workflow_dispatch` lets you pick `internal|closed|production` and `draft|completed`.
- Also needs `ANDROID_KEYSTORE_BASE64` secrets for upload keystore if you use Play signing (see [`store/PLAY_SIGNING.md`](store/PLAY_SIGNING.md)), and `GOOGLE_SERVICES_JSON` if you keep `google-services.json` gitignored.

Validate locally before upload:

```bash
python tools/validate-store-listing.py
```

See full checklist: [`store/STORE_LISTING_CHECKLIST.md`](store/STORE_LISTING_CHECKLIST.md).

### AdMob Setup (Secure, no hardcoded IDs)

Production AdMob IDs are **never committed** to git. They are injected via env vars / GitHub Secrets and applied at build/runtime.

- **Where IDs live:** GitHub Secrets `ADMOB_ANDROID_APP_ID` (`~` App ID), `ADMOB_BANNER_AD_ID`, `ADMOB_INTERSTITIAL_AD_ID` + local gitignored `.env` (see `.env.example`)
- **Where they are applied:** `app.config.js` → `android.config.googleMobileAdsAppId` and `react-native-google-mobile-ads` plugin (`androidAppId`); `src/components/AdBanner.tsx` → `BANNER_ID` / `INTERSTITIAL_ID` via `EXPO_PUBLIC_*` / `Constants.expoConfig.extra`

Local dev (gitignored `.env`):
```bash
cp .env.example .env
# fill ADMOB_* values (ask maintainer or use `gh secret list`), then
npx expo prebuild --clean   # regenerates android/ with correct App ID
npx expo run:android
```

CI / GitHub Actions: IDs are stored as **GitHub Secrets** and injected in `.github/workflows/android-build.yml`:

```yaml
env:
  ADMOB_ANDROID_APP_ID: ${{ secrets.ADMOB_ANDROID_APP_ID }}
  EXPO_PUBLIC_ADMOB_BANNER_ID: ${{ secrets.ADMOB_BANNER_AD_ID }}
```

Verify:
```bash
gh secret list --repo chartmann1590/octopulse
npx expo config --type public | grep googleMobileAdsAppId
```

`app.config.js` reads `process.env` at build time and `src/components/AdBanner.tsx` reads `EXPO_PUBLIC_*` / `Constants.expoConfig.extra` at runtime, falling back to Google test IDs (`ca-app-pub-3940256099942544~...`) when env is absent. `app.json` keeps test IDs as safe default.

## Tech

- Expo ~57, React Native 0.86, expo-router, react-native-google-mobile-ads, Firebase (Crashlytics/Perf), expo-notifications/secure-store

## Support

Love OctoPulse? Help keep it free:

- ☕ **Buy me a coffee:** https://buymeacoffee.com/charleshartmann
- ⭐ Star the repo on [GitHub](https://github.com/chartmann1590/octopulse)
- 🐛 Report issues on [GitHub Issues](https://github.com/chartmann1590/octopulse/issues)

Every coffee helps — thank you!

## License

MIT — see [LICENSE](LICENSE)
