#!/usr/bin/env python3
"""Create a local, unpublished, validated FocusFlow source ZIP."""
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / "extension"
manifest = json.loads((EXT / "manifest.json").read_text(encoding="utf-8"))
version = manifest.get("version", "")
if manifest.get("manifest_version") != 3 or not re.fullmatch(r"\d+\.\d+\.\d+", version):
    raise SystemExit("Invalid manifest version")
required = [
    manifest.get("background", {}).get("service_worker"),
    manifest.get("action", {}).get("default_popup"),
    manifest.get("action", {}).get("default_icon"),
    manifest.get("options_page"),
]
required.extend(manifest.get("icons", {}).values())
for group in manifest.get("web_accessible_resources", []):
    required.extend(group.get("resources", []))
for item in required:
    if not item or Path(item).is_absolute() or ".." in Path(item).parts or not (EXT / item).is_file():
        raise SystemExit(f"Missing or unsafe manifest asset: {item}")
files = sorted(p for p in EXT.rglob("*") if p.is_file())
if not files:
    raise SystemExit("Extension folder is empty")
for p in files:
    if p.is_symlink():
        raise SystemExit(f"Symlinks are not allowed in package: {p}")
    if p.suffix.lower() in {".env", ".pem", ".key"} or p.name.startswith(".env"):
        raise SystemExit(f"Possible secret file in package: {p}")
output = ROOT / "dist" / f"FocusFlow-v{version}-unpacked.zip"
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for p in files:
        z.write(p, arcname=(Path("extension") / p.relative_to(EXT)).as_posix())
with zipfile.ZipFile(output) as z:
    assert z.testzip() is None
    assert "extension/manifest.json" in z.namelist()
print(f"Validated local archive: {output.relative_to(ROOT)} ({len(files)} files)")
print("Not published. Extract and select extension/ with Chrome Load unpacked.")
