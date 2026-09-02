# OctoPulse — Monitor • Control • Print

> Control your OctoPrint 3D printer from your Android phone. Check progress, watch the camera, and manage prints on your Wi-Fi.

**🌐 Website:** https://chartmann1590.github.io/octopulse/  
**🔒 Privacy Policy:** https://chartmann1590.github.io/octopulse/privacy.html  
**▶️ Coming soon to Google Play** — free  
**☕ Sponsor:** https://buymeacoffee.com/charleshartmann • **GitHub:** https://github.com/chartmann1590/octopulse

[![Deploy site](https://github.com/chartmann1590/octopulse/actions/workflows/pages.yml/badge.svg)](https://github.com/chartmann1590/octopulse/actions/workflows/pages.yml)

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

Data Safety for Play Console mirrors that policy. Configure the privacy policy URL in Play Console → Policy → Privacy policy.

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
