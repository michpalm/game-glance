import os

import decky

from gameglance.heroic import HeroicLibrary, heroic_cache_dirs
from gameglance.kv import KvStore
from gameglance.migrate import carry_over, old_data_path
from gameglance.store_lookup import RegistryCache, store_for_appid

DATA_PATH = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "data.json")
if carry_over(old_data_path(decky.DECKY_PLUGIN_SETTINGS_DIR), DATA_PATH):
    decky.logger.info("[game-glance] carried over data from Ally Game Page")
KV = KvStore(DATA_PATH)
REGISTRY = RegistryCache(
    os.path.join(decky.DECKY_USER_HOME, ".local", "share", "unifideck", "shortcuts_registry.json")
)

HEROIC = HeroicLibrary(heroic_cache_dirs(decky.DECKY_USER_HOME))


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

    async def get_heroic_description(self, runner: str, app_name: str):
        try:
            return HEROIC.description(str(runner), str(app_name))
        except Exception:
            decky.logger.exception("[game-glance] get_heroic_description failed")
            return None

    async def get_version(self):
        # The installed version, from package.json at install time (Decky's environment); the updater compares it.
        return decky.DECKY_PLUGIN_VERSION

    async def _main(self):
        decky.logger.info("[game-glance] backend started")

    async def _unload(self):
        decky.logger.info("[game-glance] backend stopped")
