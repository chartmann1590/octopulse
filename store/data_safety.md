# OctoPulse — Play Console Data Safety Declaration

Mirror of https://chartmann1590.github.io/octopulse/privacy.html §8

## Overview answers (fill in Play Console → Policy → Data safety → Next)

**Does your app collect or share any of the required user data types?** YES

**Is all of the user data collected by your app encrypted in transit?** YES
- Expo/HTTPS where OctoPrint allows; AdMob/Firebase use TLS. Local LAN HTTP is device-to-printer only inside user's Wi-Fi (never to our servers), but globally we declare YES (Play requires TLS for collected types — AdMob/Crashlytics are TLS).

**Do you provide a way for users to request that their data be deleted?** YES
- In-app: remove printers, clear data. System: Settings → Apps → OctoPulse → Storage → Clear data / Uninstall. Waitlist email: email hello@octopulse.app with subject "Delete my waitlist email" (removed within 30 days). Declare YES and provide deletion URL if Play asks: `https://chartmann1590.github.io/octopulse/privacy.html#rights`

---

## Data types collected (Play's categories)

| Category | Type | Collected? | Shared? | Purpose | Optional? |
|---|---|---|---|---|---|
| Device or other IDs | Advertising ID (`AD_ID`) | Yes | Yes (to Google AdMob per their SDK) | Advertising / marketing | No — required for ads; user can reset/delete at system level |
| App activity | App interactions (ad taps, interstitial views) | Yes | Yes (to AdMob) | Advertising, analytics | No |
| App info and performance | Crash logs, performance diagnostics | Yes | Yes (to Firebase Crashlytics/Performance) | Analytics, diagnostics | Yes — to fix bugs |
| App info and performance | Device model / OS version | Yes | Yes (to Firebase) | Analytics | Yes |

**Not collected:** Name, Email (unless user voluntarily emails waitlist — declare as optional contact if you add email collection), Precise location, Approximate location, Personal files, Photos/videos, Audio, Contacts, Calendar, Health, Financial, etc.

If Play adds "Email" because of waitlist notify form (which emails hello@octopulse.app via mailto, not stored centrally unless manually collected), you may declare Email as **Optional, Not shared**, purpose **App functionality**, encryption YES, deletion YES. Or clarify that website waitlist email is stored only to notify launch and optional.

## Data sharing statement
- Data is **not sold** (Play’s “sold” definition). It is **shared** with Google services (AdMob, Firebase) per their SDK processing as data processors. Check “Shared” for those SDK types.

## Additional notes for reviewer
- OctoPrint host/IP, API keys, printer nicknames: stored **locally only** on device via AsyncStorage / SecureStore, **not collected** by us — do NOT declare as collected in Data safety (it's on-device only). Camera feeds & G-code: on-device only.
- No Location permission — network discovery scans subnet locally, not GPS.
- SDKs: Google Mobile Ads (AdMob) — https://policies.google.com/privacy ; Firebase Crashlytics/Performance — https://firebase.google.com/support/privacy

## URLs to paste
- Privacy Policy: `https://chartmann1590.github.io/octopulse/privacy.html`
- Deletion: same URL anchor `#rights` or `#contact`; Play may require a dedicated deletion URL — use `https://chartmann1590.github.io/octopulse/privacy.html#rights` and note email `hello@octopulse.app`.

## Checklist in Console
1. Go to Policy → Data safety → Get started
2. Answer YES to collects/shares
3. Check categories above, set purposes, toggle Encrypted YES, Deletion YES
4. Review and submit — must match this file and privacy.html exactly. Reviewer compares Data safety vs Privacy policy vs actual permissions (`AD_ID` → must be declared).
