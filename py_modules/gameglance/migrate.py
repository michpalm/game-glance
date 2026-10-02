"""Carry data over from the plugin's previous name ("Ally Game Page"), so a rename keeps the cache and overrides."""
from __future__ import annotations

import os
import shutil

OLD_PLUGIN_DIR = "ally-game-page"


def old_data_path(settings_dir: str) -> str:
    """The old plugin's data file, next to this plugin's settings folder."""
    return os.path.join(os.path.dirname(os.path.normpath(settings_dir)), OLD_PLUGIN_DIR, "data.json")


def carry_over(old_path: str, new_path: str) -> bool:
    """Copies the old data file if this plugin has none yet. Never overwrites; the old file is left in place."""
    if os.path.exists(new_path) or not os.path.isfile(old_path):
        return False
    try:
        os.makedirs(os.path.dirname(new_path) or ".", exist_ok=True)
        shutil.copy2(old_path, new_path)
        return True
    except OSError:
        return False
