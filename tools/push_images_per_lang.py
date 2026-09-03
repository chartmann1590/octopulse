import pathlib
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SERVICE_ACCOUNT_FILE = r"H:\octo-app\secrets\github-play-publisher-octopulse-charles-2026.json"
PACKAGE = "com.charles.octopulse"
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]
creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)

base = pathlib.Path(r"H:\octo-app")
langs = sorted([p.name for p in (base/"store/listing").iterdir() if p.is_dir()])
print(f"Langs: {langs}")

# We will do one edit for all image uploads
edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
edit_id = edit["id"]
print(f"edit {edit_id}")

icon_path = base/"store/assets/icon-512.png"
fg_path = base/"store/assets/feature-graphic-1024x500.png"
phone_files = sorted((base/"store/assets/screenshots/phone").glob("*.png"))
print(f"icon {icon_path.stat().st_size}, fg {fg_path.stat().st_size}, phones {len(phone_files)}")

# For each lang, upload images
for lang in langs:
    # Skip en-US if already has images? We'll still ensure it has images, but we already did en-US earlier, so we can skip en-US to save time, but we will still verify
    # For this run, we will upload for non-en-US only to be efficient, but also verify en-US
    if lang == "en-US":
        # verify en-US already has images, skip re-upload
        try:
            lst = service.edits().images().list(packageName=PACKAGE, editId=edit_id, language=lang, imageType="icon").execute()
            if lst.get("images"):
                print(f"{lang} icon already has {len(lst['images'])} images, skipping re-upload for en-US")
                continue
        except:
            pass
    print(f"Uploading images for {lang}...")
    # Icon
    try:
        media = MediaFileUpload(str(icon_path), mimetype="image/png", resumable=False)
        resp = service.edits().images().upload(packageName=PACKAGE, editId=edit_id, language=lang, imageType="icon", media_body=media).execute()
        print(f"  icon {lang} ok")
    except Exception as e:
        print(f"  icon {lang} fail {e}")
    # Feature graphic
    try:
        media2 = MediaFileUpload(str(fg_path), mimetype="image/png", resumable=False)
        resp2 = service.edits().images().upload(packageName=PACKAGE, editId=edit_id, language=lang, imageType="featureGraphic", media_body=media2).execute()
        print(f"  fg {lang} ok")
    except Exception as e:
        print(f"  fg {lang} fail {e}")
    # Phone screenshots - need to handle that Play limits to 8 and we have 6
    for f in phone_files:
        try:
            m = MediaFileUpload(str(f), mimetype="image/png", resumable=False)
            r = service.edits().images().upload(packageName=PACKAGE, editId=edit_id, language=lang, imageType="phoneScreenshots", media_body=m).execute()
            print(f"  phone {f.name} {lang} ok")
        except Exception as e:
            print(f"  phone {f.name} {lang} fail {e}")

# Verify before commit
print("Verifying...")
for lang in langs:
    for img_type in ["icon","featureGraphic","phoneScreenshots"]:
        try:
            imgs = service.edits().images().list(packageName=PACKAGE, editId=edit_id, language=lang, imageType=img_type).execute()
            cnt = len(imgs.get("images",[]))
            print(f"  {lang} {img_type} {cnt}")
        except Exception as e:
            print(f"  {lang} {img_type} err {e}")

print("Committing...")
commit = service.edits().commit(packageName=PACKAGE, editId=edit_id).execute()
print(f"commit {commit}")
print("Done images per lang")
