#!/usr/bin/env python3
import pathlib, json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SERVICE_ACCOUNT_FILE = r"H:\octo-app\secrets\github-play-publisher-octopulse-charles-2026.json"
PACKAGE = "com.charles.octopulse"
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]
creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)

base = pathlib.Path(r"H:\octo-app")
# Find all languages with listing
langs = sorted([p.name for p in (base/"store/listing").iterdir() if p.is_dir()])
print(f"Languages to push: {langs}")

# Create edit
edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
edit_id = edit["id"]
print(f"edit {edit_id}")

# For each lang, update listing
for lang in langs:
    title = (base/f"store/listing/{lang}/title.txt").read_text(encoding="utf-8").strip()
    short = (base/f"store/listing/{lang}/short_description.txt").read_text(encoding="utf-8").strip()
    full = (base/f"store/listing/{lang}/full_description.txt").read_text(encoding="utf-8").strip()
    # Validate lengths
    if len(title) > 30:
        print(f"WARNING {lang} title {len(title)} >30: {repr(title)}")
    if len(short) > 80:
        print(f"WARNING {lang} short {len(short)} >80")
    if len(full) > 4000:
        print(f"WARNING {lang} full {len(full)} >4000")
    body = {
        "language": lang,
        "title": title,
        "shortDescription": short,
        "fullDescription": full,
    }
    print(f"updating {lang}: title {len(title)} short {len(short)} full {len(full)}")
    try:
        res = service.edits().listings().update(packageName=PACKAGE, editId=edit_id, language=lang, body=body).execute()
        print(f"  -> {lang} OK {res.get('title')}")
    except Exception as e:
        print(f"  -> {lang} FAILED {e}")
        # Try to get error details
        try:
            print(e.content.decode())
        except:
            pass
        raise

# Also update details (contact) once (not per language)
try:
    details_body = {
        "contactEmail": "hello@octopulse.app",
        "contactWebsite": "https://chartmann1590.github.io/octopulse/",
        "defaultLanguage": "en-US"
    }
    d = service.edits().details().update(packageName=PACKAGE, editId=edit_id, body=details_body).execute()
    print(f"details OK {d}")
except Exception as e:
    print(f"details err {e}")

# Upload images for each language (reuse same images)
# Icon and featureGraphic are required per language, but we can upload same files for each
icon_path = base/"store/assets/icon-512.png"
fg_path = base/"store/assets/feature-graphic-1024x500.png"
phone_dir = base/"store/assets/screenshots/phone"
phone_files = sorted(phone_dir.glob("*.png"))
print(f"Uploading images for each language: icon {icon_path.stat().st_size}, fg {fg_path.stat().st_size}, phones {len(phone_files)}")
for lang in langs:
    print(f"  images for {lang}...")
    # Icon
    try:
        media = MediaFileUpload(str(icon_path), mimetype="image/png", resumable=False)
        resp = service.edits().images().upload(packageName=PACKAGE, editId=edit_id, language=lang, imageType="icon", media_body=media).execute()
        print(f"    icon {lang} ok {resp['image']['id']}")
    except Exception as e:
        print(f"    icon {lang} fail {e}")
    # Feature graphic
    try:
        media2 = MediaFileUpload(str(fg_path), mimetype="image/png", resumable=False)
        resp2 = service.edits().images().upload(packageName=PACKAGE, editId=edit_id, language=lang, imageType="featureGraphic", media_body=media2).execute()
        print(f"    fg {lang} ok {resp2['image']['id']}")
    except Exception as e:
        print(f"    fg {lang} fail {e}")
    # Phone screenshots - upload all 6
    for f in phone_files:
        try:
            m = MediaFileUpload(str(f), mimetype="image/png", resumable=False)
            r = service.edits().images().upload(packageName=PACKAGE, editId=edit_id, language=lang, imageType="phoneScreenshots", media_body=m).execute()
            print(f"    phone {f.name} {lang} ok")
        except Exception as e:
            print(f"    phone {f.name} {lang} fail {e}")

# List to verify before commit
print("Verifying listings before commit...")
for lang in langs:
    try:
        lst = service.edits().listings().get(packageName=PACKAGE, editId=edit_id, language=lang).execute()
        print(f"  {lang}: {lst.get('title')} ({len(lst.get('title',''))})")
    except Exception as e:
        print(f"  {lang} get fail {e}")
    # images count
    for img_type in ["icon","featureGraphic","phoneScreenshots"]:
        try:
            imgs = service.edits().images().list(packageName=PACKAGE, editId=edit_id, language=lang, imageType=img_type).execute()
            cnt = len(imgs.get("images",[]))
            print(f"    {img_type} {cnt}")
        except:
            pass

print("Committing...")
commit = service.edits().commit(packageName=PACKAGE, editId=edit_id).execute()
print(f"commit ok {commit}")
print("All translations pushed via API successfully!")
