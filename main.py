import datetime
import os

import decky

from gameglance.heroic import HeroicLibrary, heroic_cache_dirs
from gameglance.home_errors import FILE_NAME, append_log, start_entry
from gameglance.kv import KvStore
from gameglance.lutris import LutrisLibrary, lutris_db_paths
from gameglance.migrate import carry_over, old_data_path
from gameglance.store_lookup import RegistryCache, key_for_appid, store_for_appid

DATA_PATH = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "data.json")
if carry_over(old_data_path(decky.DECKY_PLUGIN_SETTINGS_DIR), DATA_PATH):
    decky.logger.info("[game-glance] carried over data from Ally Game Page")
KV = KvStore(DATA_PATH)
REGISTRY = RegistryCache(
    os.path.join(decky.DECKY_USER_HOME, ".local", "share", "unifideck", "shortcuts_registry.json")
)

HEROIC = HeroicLibrary(heroic_cache_dirs(decky.DECKY_USER_HOME))
LUTRIS = LutrisLibrary(lambda flatpak: lutris_db_paths(decky.DECKY_USER_HOME, flatpak))


class Plugin:
    async def kv_get(self, key: str):
        return KV.get(key)

    async def kv_set(self, key: str, value) -> None:
        KV.set(key, value)

    async def kv_delete(self, key: str) -> None:
        KV.delete(key)

    async def kv_delete_prefix(self, prefix: str) -> int:
        return KV.delete_prefix(prefix)

    async def get_store(self, appid: int):
        try:
            return store_for_appid(REGISTRY.get(), int(appid))
        except Exception:
            decky.logger.exception("[game-glance] get_store failed")
            return None

    async def get_unifideck_key(self, appid: int):
        # {"store": "gog", "id": "1450711444"}: the key Unifideck's own backend takes (e.g. its get_playtime), or None.
        try:
            return key_for_appid(REGISTRY.get(), int(appid))
        except Exception:
            decky.logger.exception("[game-glance] get_unifideck_key failed")
            return None

    async def get_heroic_description(self, runner: str, app_name: str):
        try:
            return HEROIC.description(str(runner), str(app_name))
        except Exception:
            decky.logger.exception("[game-glance] get_heroic_description failed")
            return None

    async def get_lutris_playtime(self, game_id: int, flatpak: bool):
        # {"hours": 12.5, "lastplayed": 1792588711} from Lutris's pga.db (the shortcut's install), or None.
        try:
            return LUTRIS.playtime(int(game_id), bool(flatpak))
        except Exception:
            decky.logger.exception("[game-glance] get_lutris_playtime failed")
            return None

    async def log_home_error(self, entry: str) -> None:
        # Home recovered from an error (src/home/RouteGuard): kept in the plugin's own log for a bug report.
        try:
            append_log(decky.DECKY_PLUGIN_LOG_DIR, f"v{decky.DECKY_PLUGIN_VERSION} {entry}"[:8000])
        except Exception:
            decky.logger.exception("[game-glance] log_home_error failed")

    async def get_version(self):
        # The installed version, from package.json at install time (Decky's environment); the updater compares it.
        return decky.DECKY_PLUGIN_VERSION

    async def _main(self):
        decky.logger.info("[game-glance] backend started")
        # Our own log records each start-up and where it is, so a report can show the location without an error.
        try:
            now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            path = os.path.join(decky.DECKY_PLUGIN_LOG_DIR, FILE_NAME)
            append_log(decky.DECKY_PLUGIN_LOG_DIR, start_entry(decky.DECKY_PLUGIN_VERSION, now, path))
        except Exception:
            decky.logger.exception("[game-glance] start-up log entry failed")

    async def _unload(self):
        decky.logger.info("[game-glance] backend stopped")
