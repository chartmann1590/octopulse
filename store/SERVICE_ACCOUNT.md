# Play Store Service Account — Automated Publishing via GitHub Actions

> You asked: create service account for `charles.h.hartmann1@gmail.com`, give you the email to add to Google Play, then automate publishing to Play Store via GitHub.

## Why this file exists — environment note
Local audit on 2026-09-03: `gcloud` and `firebase` CLIs were **NOT found** in this container/CI environment (checked via `gcloud config list`, `gcloud auth list`, `firebase projects:list` — all returned “command not found”). Therefore this repo **could not create the service account automatically here**. Instead, this doc gives you **exact commands to run locally** where you *do* have `gcloud`/`firebase` authenticated as `charles.h.hartmann1@gmail.com` (you indicated it's set up locally). Run them once; then paste the resulting service account email into Play Console.

If you run `tools/create-play-service-account.sh` locally, it *will* create it and print the email.

---

## What you will get
- Service account email: `github-play-publisher@octopulse-charles-2026.iam.gserviceaccount.com`
  - Project: `octopulse-charles-2026` (from `google-services.json` → `project_id`)
  - Purpose: GitHub Actions uploads AAB/APK to Play Console via Google Play Developer API
  - Naming suggestion: `github-play-publisher` (or `octopulse-github-publisher`). You can pick another name — update email accordingly (`<name>@<project>.iam.gserviceaccount.com`).

## Option A — One-command script (recommended)

From your local terminal where you are logged in as `charles.h.hartmann1@gmail.com`:

```bash
# Ensure correct account
gcloud auth list
gcloud config set account charles.h.hartmann1@gmail.com
gcloud config set project octopulse-charles-2026

# Run the helper (creates service account, enables Play API, grants permissions, creates & downloads JSON key)
bash tools/create-play-service-account.sh
# Or: bash tools/create-play-service-account.sh octopulse-charles-2026 github-play-publisher
```

The script will print:
```
Service account email: github-play-publisher@octopulse-charles-2026.iam.gserviceaccount.com
Key saved to: ./secrets/github-play-publisher-octopulse-charles-2026.json
```

**Then:**
1. Copy that email.
2. In Play Console → Users and permissions → Invite new users → paste email → give **Admin** (or at minimum **Release manager** + **View app information** + **Manage production releases**). Must be added at **account level** or at least for the OctoPulse app. No email invitation is sent — it’s a service account.
3. Enable Google Play Developer API in Cloud Console (script does this) if not already.
4. Create first app listing manually in Play Console (Play requires at least one manual upload before API can publish).

## Option B — Manual step-by-step

```bash
# 1. Set project/account
gcloud config set account charles.h.hartmann1@gmail.com
gcloud config set project octopulse-charles-2026

# 2. Enable Play Developer API
gcloud services enable androidpublisher.googleapis.com

# 3. Create service account
gcloud iam service-accounts create github-play-publisher \
  --display-name="GitHub Actions — Play Store Publisher" \
  --description="Uploads OctoPulse AAB to Play Console via GitHub Actions"

# 4. (Optional) Grant minimal IAM in GCP — not required for Play uploads but useful if you later use other GCP services
# gcloud projects add-iam-policy-binding octopulse-charles-2026 \
#   --member="serviceAccount:github-play-publisher@octopulse-charles-2026.iam.gserviceaccount.com" \
#   --role="roles/serviceusage.serviceUsageConsumer"

# 5. Create JSON key for GitHub Secret
gcloud iam service-accounts keys create ./secrets/github-play-publisher.json \
  --iam-account=github-play-publisher@octopulse-charles-2026.iam.gserviceaccount.com

# 6. Show email
gcloud iam service-accounts describe github-play-publisher@octopulse-charles-2026.iam.gserviceaccount.com --format="value(email)"
```

**Output email to give Play Console:**
```
github-play-publisher@octopulse-charles-2026.iam.gserviceaccount.com
```

## Adding to Google Play

1. Go to **Google Play Console** → **Users and permissions** → **Invite new users**
2. Email: `github-play-publisher@octopulse-charles-2026.iam.gserviceaccount.com`
3. Permissions:
   - **Account permissions → Admin** is simplest, OR:
   - **App permissions → OctoPulse → Release manager** + View app info + Manage store presence + Reply to reviews
4. Click **Invite** (no email sent).
5. Wait 5-10 min for propagation. First API upload may need you to have created the app draft manually.

## Storing key in GitHub (for automation)

```bash
# Encode JSON for secret (GitHub Secrets cannot store multiline easily via CLI without file)
gh secret set PLAY_SERVICE_ACCOUNT_JSON --repo chartmann1590/octopulse < ./secrets/github-play-publisher.json

# Verify
gh secret list --repo chartmann1590/octopulse | grep PLAY
```

Workflow `.github/workflows/play-store.yml` expects secret `PLAY_SERVICE_ACCOUNT_JSON` containing the **full JSON key content** (not base64). It will write it to `play-service-account.json` during build and use it with `r0adkll/upload-google-play`.

**Alternative if you prefer base64:** inside workflow you could decode; but current workflow expects raw JSON.

Keep the JSON file **gitignored** (`*service-account*.json` is ignored). Never commit it. The helper script stores it under `./secrets/` which is gitignored.

## Firebase vs Play — different service accounts
- This account is for **Google Play Developer API** (`androidpublisher.googleapis.com`), not Firebase.
- Firebase service accounts (firebase-adminsdk) are separate; do not reuse Firebase admin keys for Play uploads.

## Rotating / revoking
```bash
gcloud iam service-accounts keys list --iam-account=github-play-publisher@octopulse-charles-2026.iam.gserviceaccount.com
gcloud iam service-accounts keys delete <KEY_ID> --iam-account=... --quiet
# Then create new key and update GitHub secret
```

## What the GitHub workflow will do once the account is added
- On push to `main` affecting app code, it builds signed **AAB** (Android App Bundle) with AdMob IDs from GitHub Secrets, then uploads to **internal** track.
- You manually promote internal → closed → production in Play Console.
- Logs show service account email; Play Console → Users and permissions must list it.

## Need help?
If script fails with `PERMISSION_DENIED`, ensure `charles.h.hartmann1@gmail.com` is **Owner** of `octopulse-charles-2026` in GCP IAM. Also ensure Google Play Developer API is enabled.

After you add the email to Play Console, tell the assistant — then we can trigger a test build and publish to internal track.
