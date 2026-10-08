#!/usr/bin/env python3
"""
Cross-platform packaging script for Game Glance Decky plugin.
Generates out/game-glance.zip matching Decky Loader's expected distribution layout.

Usage:
    python scripts/package.py
    python scripts/package.py --skip-build
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

# Use absolute() rather than resolve() to avoid expanding mapped network drives to UNC on Windows
ROOT = Path(__file__).absolute().parent.parent
OUT_DIR = ROOT / "out"
DIST_DIR = ROOT / "dist"
PY_MODULES_DIR = ROOT / "py_modules" / "gameglance"

ROOT_FILES = [
    "plugin.json",
    "package.json",
    "main.py",
    "LICENSE",
    "THIRD_PARTY_LICENSES.md",
]


def build():
    print("==> Building frontend bundle (rollup -c)...")
    if os.name == "nt":
        # Windows: Use powershell to avoid cmd.exe UNC issues on mapped drives
        cmd = ["powershell", "-ExecutionPolicy", "Bypass", "-Command", "npx rollup -c"]
    else:
        cmd = ["npx", "rollup", "-c"]

    result = subprocess.run(cmd, cwd=str(ROOT))
    if result.returncode != 0:
        print(f"Build failed with exit code {result.returncode}", file=sys.stderr)
        sys.exit(result.returncode)


def get_version():
    try:
        pkg_json = ROOT / "package.json"
        if pkg_json.exists():
            with open(pkg_json, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("version", "unknown")
    except Exception:
        pass
    return "unknown"


def package():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = OUT_DIR / "game-glance.zip"

    print(f"\n==> Packaging into {zip_path}...")

    if not DIST_DIR.exists():
        print(f"Error: {DIST_DIR} not found. Run build first.", file=sys.stderr)
        sys.exit(1)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. Root files
        for fname in ROOT_FILES:
            fpath = ROOT / fname
            if fpath.exists():
                arcname = f"game-glance/{fname}"
                zf.write(fpath, arcname)
                print(f"  + {arcname}")
            else:
                print(f"  ! Warning: {fname} does not exist", file=sys.stderr)

        # 2. dist/ files (excluding *.map)
        for fpath in sorted(DIST_DIR.rglob("*")):
            if fpath.is_file():
                if fpath.suffix == ".map":
                    continue  # skip source maps to keep zip small
                rel_path = fpath.relative_to(DIST_DIR).as_posix()
                arcname = f"game-glance/dist/{rel_path}"
                zf.write(fpath, arcname)
                print(f"  + {arcname}")

        # 3. py_modules/gameglance/ files (excluding __pycache__ and .pyc)
        if PY_MODULES_DIR.exists():
            for fpath in sorted(PY_MODULES_DIR.rglob("*")):
                if fpath.is_file():
                    if "__pycache__" in fpath.parts or fpath.suffix in [".pyc", ".pyo"]:
                        continue
                    rel_path = fpath.relative_to(PY_MODULES_DIR).as_posix()
                    arcname = f"game-glance/py_modules/gameglance/{rel_path}"
                    zf.write(fpath, arcname)
                    print(f"  + {arcname}")

    file_size_kb = zip_path.stat().st_size / 1024
    print(f"\nSuccessfully created {zip_path.name} ({file_size_kb:.1f} KB) in {OUT_DIR}")


def main():
    parser = argparse.ArgumentParser(description="Package Game Glance plugin")
    parser.add_argument("--skip-build", action="store_true", help="Skip rollup build step")
    args = parser.parse_args()

    if not args.skip_build:
        build()
    package()


if __name__ == "__main__":
    main()
