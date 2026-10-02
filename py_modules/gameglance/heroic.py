"""Read game descriptions from Heroic Games Launcher's local library cache."""
from __future__ import annotations

import os

from gameglance.store_lookup import RegistryCache

# Runner -> Heroic's library cache file. GOG lists games under "games", Epic and Amazon under "library".
LIBRARY_FILES = {
    "gog": "gog_library.json",
    "legendary": "legendary_library.json",
    "nile": "nile_library.json",
}


def heroic_cache_dirs(home: str) -> list[str]:
    """Heroic's store_cache folder for the Flatpak install (Bazzite's default) and the native one."""
    return [
        os.path.join(home, ".var", "app", "com.heroicgameslauncher.hgl", "config", "heroic", "store_cache"),
        os.path.join(home, ".config", "heroic", "store_cache"),
    ]


def _entries(data: dict):
    for value in data.values():
        if isinstance(value, list):
            for entry in value:
                if isinstance(entry, dict):
                    yield entry


def _text(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def _description(entry: dict) -> str | None:
    extra = entry.get("extra")
    about = extra.get("about") if isinstance(extra, dict) else None
    if not isinstance(about, dict):
        return None
    return _text(about.get("shortDescription")) or _text(about.get("description")) or None


class HeroicLibrary:
    """Looks a game up by runner and Heroic app name; files are reloaded only when they change."""

    def __init__(self, dirs: list[str]) -> None:
        self._files = {
            runner: [RegistryCache(os.path.join(d, name)) for d in dirs] for runner, name in LIBRARY_FILES.items()
        }

    def description(self, runner: str, app_name: str) -> str | None:
        for cache in self._files.get(runner, []):
            for entry in _entries(cache.get()):
                if str(entry.get("app_name")) == app_name:
                    text = _description(entry)
                    if text:
                        return text
        return None
