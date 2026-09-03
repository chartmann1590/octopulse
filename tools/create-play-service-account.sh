#!/usr/bin/env bash
# create-play-service-account.sh — Create Google Play service account for GitHub Actions auto-publish
# Usage: bash tools/create-play-service-account.sh [PROJECT_ID] [SERVICE_ACCOUNT_NAME]
# Defaults: PROJECT_ID=octopulse-charles-2026, NAME=github-play-publisher
# Auth must be: gcloud auth login with charles.h.hartmann1@gmail.com and Owner role on project.
set -euo pipefail

PROJECT_ID="${1:-octopulse-charles-2026}"
SA_NAME="${2:-github-play-publisher}"
SA_DISPLAY="GitHub Actions — Play Store Publisher"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_DIR="./secrets"
KEY_FILE="${KEY_DIR}/${SA_NAME}-${PROJECT_ID}.json"

echo "→ Project: ${PROJECT_ID}"
echo "→ Service account: ${SA_NAME} (${SA_EMAIL})"
echo ""

# Verify gcloud exists
if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI not found. Install from https://cloud.google.com/sdk/docs/install"
  echo "And run: gcloud auth login --account=charles.h.hartmann1@gmail.com"
  exit 1
fi

# Show current account
echo "→ Current gcloud account:"
gcloud config get-value account || true
gcloud auth list --filter=status:ACTIVE --format="value(account)" || true
echo ""

# Ensure correct project
gcloud config set project "${PROJECT_ID}" || {
  echo "Failed to set project ${PROJECT_ID}. Are you Owner for this project?"
  exit 1
}

# Verify Firebase project exists (optional, just informational)
if command -v firebase >/dev/null 2>&1; then
  echo "→ Firebase projects (first 5):"
  firebase projects:list --json 2>/dev/null | head -c 2000 || echo "(firebase list failed — continuing)"
  echo ""
fi

# Enable required APIs
echo "→ Enabling Google Play Developer API (androidpublisher)..."
gcloud services enable androidpublisher.googleapis.com --project="${PROJECT_ID}" || true
echo "→ (Also enabling Cloud Resource Manager API for IAM...)"
gcloud services enable cloudresourcemanager.googleapis.com --project="${PROJECT_ID}" || true
echo ""

# Create service account (idempotent)
if gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "→ Service account already exists: ${SA_EMAIL}"
else
  echo "→ Creating service account ${SA_NAME}..."
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="${SA_DISPLAY}" \
    --description="Uploads OctoPulse AAB to Play Console via GitHub Actions" \
    --project="${PROJECT_ID}"
  echo "✓ Created"
fi
echo ""

# Show service account
gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" --format="value(email)"
echo ""

# Create directory for key
mkdir -p "${KEY_DIR}"
# Respect .gitignore — secrets/* is ignored

# Create key if not exists or --force
if [[ -f "${KEY_FILE}" ]]; then
  echo "→ Key file already exists: ${KEY_FILE}"
  echo "  Remove it first if you want to regenerate (then update GitHub secret): rm \"${KEY_FILE}\""
else
  echo "→ Creating JSON key for ${SA_EMAIL}..."
  gcloud iam service-accounts keys create "${KEY_FILE}" \
    --iam-account="${SA_EMAIL}" \
    --project="${PROJECT_ID}"
  chmod 600 "${KEY_FILE}"
  echo "✓ Key saved to: ${KEY_FILE}"
fi
echo ""

echo "======================================================================"
echo "SERVICE ACCOUNT READY"
echo "======================================================================"
echo "Email to add to Google Play Console:"
echo ""
echo "  ${SA_EMAIL}"
echo ""
echo "Steps in Play Console:"
echo "  1. Go to https://play.google.com/console"
echo "  2. Select OctoPulse app (create if not yet created)"
echo "  3. Users and permissions → Invite new users → Paste email above"
echo "  4. Give role: Admin (or Release Manager for just publishing)"
echo "  5. Click Invite (no email is sent)"
echo ""
echo "GitHub Secret setup (run from repo root):"
echo ""
if [[ -f "${KEY_FILE}" ]]; then
  echo "  gh secret set PLAY_SERVICE_ACCOUNT_JSON --repo chartmann1590/octopulse < \"${KEY_FILE}\""
  echo ""
  echo "Verify:"
  echo "  gh secret list --repo chartmann1590/octopulse | grep PLAY"
else
  echo "  (Key not created yet — see above)"
fi
echo ""
echo "Also ensure AdMob secrets are set:"
echo "  gh secret list --repo chartmann1590/octopulse | grep ADMOB"
echo "  # Required: ADMOB_ANDROID_APP_ID, ADMOB_BANNER_AD_ID, ADMOB_INTERSTITIAL_AD_ID"
echo ""
echo "Next: trigger the workflow — push to main or run manually:"
echo "  gh workflow run play-store.yml --repo chartmann1590/octopulse -f track=internal"
echo "======================================================================"
