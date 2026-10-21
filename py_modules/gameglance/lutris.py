"""Read a game's play time from Lutris's own database (pga.db)."""
from __future__ import annotations

import os
import sqlite3
from typing import Callable


def lutris_db_paths(home: str, flatpak: bool) -> list[str]:
    """Lutris's pga.db for the Flatpak install (Bazzite's default) or the native one; the shortcut says which."""
    if flatpak:
        return [os.path.join(home, ".var", "app", "net.lutris.Lutris", "data", "lutris", "pga.db")]
    return [os.path.join(home, ".local", "share", "lutris", "pga.db")]


class LutrisLibrary:
    def __init__(self, paths_for: Callable[[bool], list[str]]):
        self._paths_for = paths_for

    def playtime(self, game_id: int, flatpak: bool) -> dict | None:
        """{"hours": float, "lastplayed": int | None} for a Lutris game id, or None when no database has it."""
        for path in self._paths_for(flatpak):
            row = self._row(path, game_id)
            if row is None:
                continue
            playtime, lastplayed = row
            try:
                return {
                    "hours": max(0.0, float(playtime or 0)),
                    "lastplayed": int(lastplayed) if lastplayed and int(lastplayed) > 0 else None,
                }
            except (TypeError, ValueError):
                continue
        return None

    @staticmethod
    def _row(path: str, game_id: int):
        con = None
        try:
            con = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=1)
            return con.execute("SELECT playtime, lastplayed FROM games WHERE id = ?", (game_id,)).fetchone()
        except (sqlite3.Error, OSError, ValueError):
            return None
        finally:
            if con is not None:
                con.close()
