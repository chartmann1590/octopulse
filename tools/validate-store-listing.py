#!/usr/bin/env python3
"""Validate Play Store listing assets & metadata before upload."""
import os, sys, pathlib, struct

base = pathlib.Path(__file__).resolve().parents[1]
errors, warnings = [], []

def check_png_size(rel, expected):
    p = base / rel
    if not p.exists():
        errors.append(f"MISSING {rel}")
        return
    from PIL import Image
    im = Image.open(p)
    if im.size != expected:
        errors.append(f"{rel}: expected {expected}, got {im.size}")
    else:
        print(f"OK {rel}: {im.size} {p.stat().st_size} bytes")

def check_exists(rel):
    if not (base / rel).exists():
        errors.append(f"MISSING {rel}")
    else:
        print(f"OK {rel}")

# Required graphics
check_png_size("store/assets/icon-512.png", (512,512))
check_png_size("store/assets/feature-graphic-1024x500.png", (1024,500))
for name in ["01-dashboard","02-discover","03-pairing","04-detail","05-control","06-gcode"]:
    check_png_size(f"store/assets/screenshots/phone/{name}-phone.png", (1080,2340))

# Fastlane copies
check_png_size("fastlane/metadata/android/en-US/images/icon.png", (512,512))
check_png_size("fastlane/metadata/android/en-US/images/featureGraphic.png", (1024,500))

# Listing text limits
def check_text_limit(rel, max_len, name):
    p = base / rel
    if not p.exists():
        errors.append(f"MISSING {rel}")
        return
    t = p.read_text(encoding="utf-8").strip()
    l = len(t)
    if l > max_len:
        errors.append(f"{name} {rel}: {l} chars > {max_len}")
    else:
        print(f"OK {name}: {l}/{max_len} chars")

check_text_limit("store/listing/en-US/title.txt", 50, "Title")
check_text_limit("store/listing/en-US/short_description.txt", 80, "Short desc")
# Full desc 4000
check_text_limit("store/listing/en-US/full_description.txt", 4000, "Full desc")

# Other required files
for f in [
    "store/listing/en-US/whats_new.txt",
    "store/listing/en-US/promo_video.txt",
    "store/STORE_LISTING_CHECKLIST.md",
    "store/data_safety.md",
    "store/SERVICE_ACCOUNT.md",
    "store/PLAY_SIGNING.md",
    "docs/video/promo.mp4",
    "docs/video/poster.jpg",
]:
    check_exists(f)

# App identifier check
import json
try:
    app_json = json.loads((base / "app.json").read_text())
    pkg = app_json["expo"]["android"]["package"]
    if pkg != "com.charles.octopulse":
        warnings.append(f"app.json android.package is {pkg}, expected com.charles.octopulse")
    else:
        print(f"OK app.json package {pkg}")
    if (base / "google-services.json").exists():
        gs = json.loads((base / "google-services.json").read_text())
        gs_pkg = gs["client"][0]["client_info"]["android_client_info"]["package_name"]
        if gs_pkg != pkg:
            warnings.append(f"google-services.json package {gs_pkg} != app.json {pkg}")
        else:
            print(f"OK google-services.json package {gs_pkg}")
except Exception as e:
    warnings.append(f"app.json check failed: {e}")

# Android build.gradle namespace
gradle = (base / "android/app/build.gradle")
if gradle.exists():
    txt = gradle.read_text()
    if 'namespace "com.helloworld"' in txt or 'applicationId "com.helloworld"' in txt:
        errors.append("android/app/build.gradle still contains com.helloworld — must be com.charles.octopulse")
    elif 'com.charles.octopulse' in txt:
        print("OK build.gradle namespace/applicationId com.charles.octopulse")
    else:
        warnings.append("build.gradle namespace not found — check manually")

# Icons vs store icon consistency
try:
    from PIL import Image
    icon = Image.open(base / "assets/icon.png")
    hi = Image.open(base / "store/assets/icon-512.png")
    if icon.size != (1024,1024):
        warnings.append(f"assets/icon.png is {icon.size}, recommended 1024x1024")
    print("OK icon checks")
except Exception as e:
    warnings.append(str(e))

print("\n" + "="*60)
if warnings:
    print("Warnings:")
    for w in warnings: print(" -", w)
if errors:
    print("ERRORS:")
    for e in errors: print(" -", e)
    sys.exit(1)
else:
    print("All checks passed — ready for Play Console upload & GitHub Actions.")
