import { LOG_PREFIX } from '../constants';
import { PlaytimeDeps, unifideckKeyFor, UnifideckKey } from './unifideckPlaytime';

/**
 * A Unifideck game's size in bytes, from the same loader route its own Play row uses (`get_game_size_bytes(appId)`:
 * the download size while not installed, the size on disk once installed; its reply is {success, error, data: bytes}).
 * Chosen over reading ~/.local/share/unifideck/game_sizes.json: that file only caches download sizes (and "unknown"
 * ones), while the route also answers the installed size.
 */
export function parseGameSize(response: unknown): number | null {
    try {
        const r = response as { success?: unknown; data?: unknown } | null;
        if (!r || r.success !== true) return null;
        return typeof r.data === 'number' && Number.isFinite(r.data) && r.data > 0 ? r.data : null;
    } catch {
        return null;
    }
}

interface DeckyBackendLike {
    call(route: string, ...args: unknown[]): Promise<unknown>;
}
const deckyBackend = (): DeckyBackendLike | undefined => (globalThis as { DeckyBackend?: DeckyBackendLike }).DeckyBackend;

const TTL_MS = 60_000;
// Keyed by app and install state, as Unifideck does: the number means something else once the install finishes.
const cache = new Map<string, { at: number; value: Promise<number | null> }>();
let logged = false;

/** Forget everything (tests). */
export function resetUnifideckSize(): void {
    cache.clear();
    logged = false;
}

/** The size in bytes for a Unifideck shortcut; null when unknown, not a Unifideck game, or Decky's router or Unifideck is missing or errors. Cached 60 s. */
export async function unifideckGameSize(
    appId: number,
    installed: boolean,
    deps: PlaytimeDeps & { key?: (appId: number) => Promise<UnifideckKey | null> } = {},
): Promise<number | null> {
    try {
        if (!(await unifideckKeyFor(appId, deps.key))) return null;
        const now = (deps.now ?? Date.now)();
        const id = `${appId}:${installed ? 1 : 0}`;
        const hit = cache.get(id);
        if (hit && now - hit.at < TTL_MS) return await hit.value;
        const backend = 'backend' in deps ? deps.backend : deckyBackend();
        const value = (async () => {
            try {
                if (!backend?.call) return null;
                return parseGameSize(await backend.call('loader/call_plugin_method', 'Unifideck', 'get_game_size_bytes', appId));
            } catch (error) {
                if (!logged) {
                    logged = true;
                    console.warn(`${LOG_PREFIX} Unifideck size unavailable`, error);
                }
                return null;
            }
        })();
        cache.set(id, { at: now, value });
        return await value;
    } catch {
        return null;
    }
}
