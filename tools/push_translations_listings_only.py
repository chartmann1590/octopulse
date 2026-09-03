import pathlib
from google.oauth2 import service_account
from googleapiclient.discovery import build

SERVICE_ACCOUNT_FILE = r"H:\octo-app\secrets\github-play-publisher-octopulse-charles-2026.json"
PACKAGE = "com.charles.octopulse"
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]
creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)

base = pathlib.Path(r"H:\octo-app")
langs = sorted([p.name for p in (base/"store/listing").iterdir() if p.is_dir()])
print(f"Languages: {langs}")

edit = service.edits().insert(body={}, packageName=PACKAGE).execute()
edit_id = edit["id"]
print(f"edit {edit_id}")

for lang in langs:
    title = (base/f"store/listing/{lang}/title.txt").read_text(encoding="utf-8").strip()
    short = (base/f"store/listing/{lang}/short_description.txt").read_text(encoding="utf-8").strip()
    full = (base/f"store/listing/{lang}/full_description.txt").read_text(encoding="utf-8").strip()
    print(f"{lang}: title {len(title)} short {len(short)} full {len(full)}")
    body = {"language": lang, "title": title, "shortDescription": short, "fullDescription": full}
    res = service.edits().listings().update(packageName=PACKAGE, editId=edit_id, language=lang, body=body).execute()
    print(f"  {lang} updated -> {res.get('title')}")

# details
details_body = {"contactEmail": "hello@octopulse.app", "contactWebsite": "https://chartmann1590.github.io/octopulse/", "defaultLanguage": "en-US"}
d = service.edits().details().update(packageName=PACKAGE, editId=edit_id, body=details_body).execute()
print(f"details {d}")

# verify
for lang in langs:
    lst = service.edits().listings().get(packageName=PACKAGE, editId=edit_id, language=lang).execute()
    print(f"verify {lang}: {lst.get('title')}")

print("committing...")
commit = service.edits().commit(packageName=PACKAGE, editId=edit_id).execute()
print(f"commit {commit}")
print("Done listings")
