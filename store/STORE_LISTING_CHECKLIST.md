# OctoPulse — Play Store Listing Checklist

> All assets pre-generated in this repo. Upload paths refer to Play Console (play.google.com/console).

## 1. App identity (done in repo)
- [x] Package: `com.charles.octopulse` (app.json, google-services.json)
- [x] App name: OctoPulse
- [x] Hi-res icon: `store/assets/icon-512.png` (512×512, PNG-32, 309 KB) → also `store/assets/hi-res-icon.png`
- [x] Feature graphic: `store/assets/feature-graphic-1024x500.png` (1024×500) + JPEG variant
- [x] Private contact: hello@octopulse.app (appears in privacy.html + listing)
- [x] Website: https://chartmann1590.github.io/octopulse/
- [x] Privacy Policy URL: https://chartmann1590.github.io/octopulse/privacy.html (canonical)

## 2. Graphics — upload in Play Console → Store presence → Main store listing
- [x] Hi-res icon (512×512) — `store/assets/icon-512.png`
- [x] Feature graphic (1024×500) — `store/assets/feature-graphic-1024x500.png`
- [x] Phone screenshots (1080×2340, PNG, 6 pcs) — `store/assets/screenshots/phone/*.png`
  - 01-dashboard-phone.png (335 KB) — Dashboard: All your printers in one place
  - 02-discover-phone.png (393 KB) — Find printers on Wi-Fi
  - 03-pairing-phone.png (207 KB) — One-tap pairing
  - 04-detail-phone.png (341 KB) — Progress, temps & camera
  - 05-control-phone.png (372 KB) — Move, heat & manage
  - 06-gcode-phone.png (341 KB) — 2D/3D preview
  - Order in Console as listed. Requires at least 2, we provide 6 (max 8). No status bar with carrier — screenshots are clean.
  - Also copied to `fastlane/metadata/android/en-US/images/phoneScreenshots/` for fastlane supply.
- [ ] 7-inch tablet screenshots (optional) — generate from same source at 1080×1920 if tablet form factor added later.
- [ ] Promo video YouTube URL — upload `docs/video/promo.mp4` to YouTube, then paste URL (see `store/listing/en-US/promo_video.txt`).

## 3. Text — copy/paste from `store/listing/en-US/`
- [x] Title (≤50 chars): `OctoPulse – OctoPrint Companion` (29 chars) — file: `title.txt`
- [x] Short description (≤80 chars): `Control your OctoPrint 3D printer from your phone. Monitor & print on Wi-Fi.` (73 chars) — file: `short_description.txt` (verified ≤80)
- [x] Full description (≤4000 chars, currently ~3400) — file: `full_description.txt`
- [x] What's new (release notes) — file: `whats_new.txt`
- Contact details in Console:
  - Email: hello@octopulse.app
  - Phone: optional (leave blank or add if required)
  - Website: https://chartmann1590.github.io/octopulse/
  - Privacy Policy: https://chartmann1590.github.io/octopulse/privacy.html

## 4. Categorization
- Application category: **Tools** (or Productivity — Tools is most accurate for printer companion)
- Tags: 3D printing, OctoPrint, Ender, Prusa, monitor, control, G-code, camera (managed in Console automatically from description keywords)

## 5. Content rating — Play Console → Policy → Content rating
- Complete questionnaire (IARC). Answers:
  - Does it contain ads? **Yes** (AdMob)
  - Violence, sexual, language, drugs? **No**
  - User interaction? **No** (no chat)
  - Location sharing? **No**
  - Expected rating: **Everyone** (or Everyone 10+ if interstitials considered). Most AdMob banner/interstitial apps with no mature content = Everyone.

## 6. Data safety — Play Console → Policy → Data safety
Mirror of `docs/privacy.html` §8. Pre-filled declaration file: `store/data_safety.csv` + `store/data_safety.md`
- Data collected: Advertising ID, app interactions (ad taps), diagnostics (Crashlytics, Performance) — encrypted in transit: **Yes**, data deletion: **Yes** (Clear data / uninstall), not sold.
- Data NOT collected: Name, email, precise location, contacts, files.
- Provide privacy policy URL.

## 7. Target audience & content
- Target age: 13+ (not directed to children)
- Contains ads: **Yes** — disclose in listing and in-app.
- Government apps? No.

## 8. Pricing & distribution
- Free, no in-app purchases (or with ads only). Countries: all available (exclude where AdMob restricted if needed). Device catalog: phones/tablets.

## 9. Build — AAB for Play
- [x] Signing: Play App Signing (recommended). Generate upload keystore locally (see `store/PLAY_SIGNING.md`).
- Workflow: `.github/workflows/play-store.yml` builds AAB with AdMob IDs from GitHub Secrets and uploads to internal track via service account.
- Required secrets: `ADMOB_ANDROID_APP_ID`, `ADMOB_BANNER_AD_ID`, `ADMOB_INTERSTITIAL_AD_ID`, `PLAY_SERVICE_ACCOUNT_JSON` (+ optional KEYSTORE secrets if not using Play signing).
- Service account email provided after running `tools/create-play-service-account.sh` (see `store/SERVICE_ACCOUNT.md`). Add that email in Play Console → Users and permissions → Invite new user → Admin or Release Manager.

## 10. Website updated
- [x] docs/index.html has promo video, screenshots, features, FAQ, Play banner (soon badge), GitHub & BuyMeACoffee links
- [x] docs/privacy.html canonical
- [x] docs/screenshots/ + docs/video/ present
- Deployed via .github/workflows/pages.yml to https://chartmann1590.github.io/octopulse/

## 11. Pre-launch checks
- [ ] Internal testing track first → add testers (charles.h.hartmann1@gmail.com)
- [ ] Pre-launch report (automatic)
- [ ] Content rating approved
- [ ] Data safety approved
- [ ] Promote to Closed/Production after review

---

### File map (repo)
```
store/assets/icon-512.png
store/assets/feature-graphic-1024x500.png/.jpg
store/assets/screenshots/phone/*.png (6)
fastlane/metadata/android/en-US/images/{icon.png, featureGraphic.png, phoneScreenshots/*.png}
store/listing/en-US/{title,short_description,full_description,whats_new}*.txt
store/data_safety.{md,csv}
store/PLAY_SIGNING.md
store/SERVICE_ACCOUNT.md
.github/workflows/play-store.yml
```

Run `python tools/validate-store-listing.py` to verify locally before upload.
