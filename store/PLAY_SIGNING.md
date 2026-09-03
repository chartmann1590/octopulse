# Play Signing & Upload Keystore

## Recommended: Let Google manage signing (Play App Signing)

You do NOT need to create a keystore manually if you use Play App Signing (recommended). Play generates & guards the final signing key. You just provide an **upload key**.

The GitHub workflow `play-store.yml` supports both modes:

### Mode 1 — Play App Signing (recommended, easiest)
- In Play Console → Setup → App signing → choose **"Let Google manage and protect your app signing key"** (default for new apps).
- First AAB upload determines the upload key. For Expo projects, EAS or Gradle will generate a temporary debug keystore if you don't provide one. For production, generate an upload keystore once and reuse it.

To generate an upload keystore locally (one-time):

```bash
keytool -genkeypair -v -keystore octopulse-upload.keystore \
  -alias octopulse -keyalg RSA -keysize 2048 -validity 9125 \
  -storepass "YOUR_STORE_PASSWORD" -keypass "YOUR_KEY_PASSWORD" \
  -dname "CN=Charles Hartmann, OU=OctoPulse, O=OctoPulse, L=, S=, C=US"

# Base64 for GitHub Secret
openssl base64 -in octopulse-upload.keystore -out octopulse-upload.keystore.base64

gh secret set ANDROID_KEYSTORE_BASE64 --repo chartmann1590/octopulse < octopulse-upload.keystore.base64
gh secret set ANDROID_KEYSTORE_PASSWORD --repo chartmann1590/octopulse --body "YOUR_STORE_PASSWORD"
gh secret set ANDROID_KEY_ALIAS --repo chartmann1590/octopulse --body "octopulse"
gh secret set ANDROID_KEY_PASSWORD --repo chartmann1590/octopulse --body "YOUR_KEY_PASSWORD"

# Keep octopulse-upload.keystore backed up securely (password manager, encrypted drive) — gitignored by *.jks / *keystore*
```

Workflow reads those 4 secrets, decodes keystore, and signs the AAB. If secrets are absent, it falls back to debug keystore (internal testing only, NOT for production).

### Mode 2 — You manage signing key
- Generate as above but treat it as your final signing key and opt out of Play signing in Console. Not recommended.

## Gradle config
- Upload keystore is decoded in workflow to `android/app/upload.keystore` and referenced via `gradle.properties` overrides.
- Versioning: `android/app/build.gradle` now uses `applicationId com.charles.octopulse`, `versionCode` from `expo.versionCode` or env `VERSION_CODE`, `versionName` from `app.json` version.

## Verifying
- After first upload to Play Console → App bundle explorer → you should see signing certificate. Download `Der` and keep fingerprint.
- Subsequent builds must use SAME upload keystore — changing it requires contacting Play support.

## EAS alternative
If you use `eas build`, set `credentialsSource: local` or let EAS manage credentials, and configure `eas.json` to use same keystore. Env vars `ADMOB_*` are still injected via GitHub Secrets.

