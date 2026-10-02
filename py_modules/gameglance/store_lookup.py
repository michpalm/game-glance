"""Map a Steam shortcut app id to the store Unifideck added it from."""
from __future__ import annotations

import json
import os
from typing import Any

STORE_LABELS = {
    "epic": "Epic",
    "gog": "GOG",
    "amazon": "Amazon",
    "ubisoft": "Ubisoft",
    "xcloud": "Xbox Cloud",
    "battlenet": "Battle.net",
}
# Unifideck stores `appid` (signed) and `appid_unsigned`; see docs/verification-findings.md.
APPID_FIELDS = ("appid", "appid_unsigned", "app_id", "steam_app_id")


def load_registry(path: str) -> dict:
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _as_u32(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    try:
        return int(value) & 0xFFFFFFFF
    except (TypeError, ValueError):
        return None


def label_for_store(store: str) -> str:
    key = store.strip().lower()
    if key in STORE_LABELS:
        return STORE_LABELS[key]
    return key.capitalize() if key else "Non-Steam"


def store_for_appid(registry: dict, appid: int) -> str | None:
    target = _as_u32(appid)
    if target is None:
        return None
    for key, entry in registry.items():
        if not isinstance(key, str) or ":" not in key or not isinstance(entry, dict):
            continue
        for field in APPID_FIELDS:
            if field in entry and _as_u32(entry[field]) == target:
                return label_for_store(key.split(":", 1)[0])
    return None


class RegistryCache:
    """Reloads the registry only when the file's modification time changes."""

    def __init__(self, path: str) -> None:
        self._path = path
        self._mtime: float | None = None
        self._data: dict = {}

    def get(self) -> dict:
        try:
            mtime = os.stat(self._path).st_mtime
        except OSError:
            self._mtime = None
            self._data = {}
            return self._data
        if mtime != self._mtime:
            self._data = load_registry(self._path)
            self._mtime = mtime
        return self._data
