import { callable } from '@decky/api';
import { LOG_PREFIX } from '../constants';

/**
 * Play time as Unifideck itself shows it, for the games it added (GOG, Epic, ...). Steam has no play time for those
 * shortcuts, so our Played and Last played would read 0 / never. Unifideck's frontend prefers the store's cross-device
 * total (store_total_secs) over its own (total_seconds), and its own last_played over Steam's; we do the same.
 * Asked through Decky's loader router (`loader/call_plugin_method`, as the updater does); never per-plugin connect().
 */
export interface UnifideckPlaytime {
    /** Seconds played, or null when Unifideck has none (0 counts as none). */
    playedSeconds: number | null;
    /** Last played as Unix seconds, or null. */
    lastPlayed: number | null;
}

const positive = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

/** The usable part of Unifideck's get_playtime reply; null for a failure, garbage, or a reply with neither value. */
export function parseUnifideckPlaytime(response: unknown): UnifideckPlaytime | null {
    try {
        const r = response as { success?: unknown; data?: unknown } | null;
        if (!r || r.success !== true) return null;
        const d = r.data as { store_total_secs?: unknown; total_seconds?: unknown; last_played?: unknown } | null;
        if (!d || typeof d !== 'object') return null;
        const playedSeconds = positive(d.store_total_secs) ?? positive(d.total_seconds);
        const ms = typeof d.last_played === 'string' && d.last_played !== '' ? Date.parse(d.last_played) : NaN;
        const lastPlayed = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : null;
        return playedSeconds === null && lastPlayed === null ? null : { playedSeconds, lastPlayed };
    } catch {
        return null;
    }
}

/** Unifideck's values over Steam's where it has them; a missing or 0 Unifideck value never replaces Steam's. */
export function mergePlaytime(
    steam: { minutes: number; lastPlayed: number },
    unifideck: UnifideckPlaytime | null | undefined,
): { minutes: number; lastPlayed: number } {
    if (!unifideck) return steam;
    return {
        minutes: unifideck.playedSeconds !== null ? Math.floor(unifideck.playedSeconds / 60) : steam.minutes,
        lastPlayed: unifideck.lastPlayed !== null ? unifideck.lastPlayed : steam.lastPlayed,
    };
}

interface DeckyBackendLike {
    call(route: string, ...args: unknown[]): Promise<unknown>;
}
const deckyBackend = (): DeckyBackendLike | undefined => (globalThis as { DeckyBackend?: DeckyBackendLike }).DeckyBackend;

export interface PlaytimeDeps {
    backend?: DeckyBackendLike | undefined;
    now?: () => number;
}

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: Promise<UnifideckPlaytime | null> }>();
let logged = false;

/** Forget everything (tests). */
export function resetUnifideckPlaytime(): void {
    cache.clear();
    keys.clear();
    logged = false;
}

function logOnce(error: unknown): void {
    if (logged) return;
    logged = true;
    console.warn(`${LOG_PREFIX} Unifideck play time unavailable`, error);
}

/** Unifideck's play time for "<store>:<id>"; null when Decky's router or Unifideck is missing or errors. Cached 60 s. */
export function unifideckPlaytime(store: string, gameId: string, deps: PlaytimeDeps = {}): Promise<UnifideckPlaytime | null> {
    if (!store || !gameId) return Promise.resolve(null);
    const now = (deps.now ?? Date.now)();
    const id = `${store}:${gameId}`;
    const hit = cache.get(id);
    if (hit && now - hit.at < TTL_MS) return hit.value;
    const backend = 'backend' in deps ? deps.backend : deckyBackend();
    const value = (async () => {
        try {
            if (!backend?.call) return null;
            return parseUnifideckPlaytime(await backend.call('loader/call_plugin_method', 'Unifideck', 'get_playtime', store, gameId));
        } catch (error) {
            logOnce(error);
            return null;
        }
    })();
    cache.set(id, { at: now, value });
    return value;
}

export interface UnifideckKey {
    store: string;
    id: string;
}

const getKey = callable<[appid: number], UnifideckKey | null>('get_unifideck_key');
const keys = new Map<number, Promise<UnifideckKey | null>>();

/** Unifideck's key ({store, id}) for a Steam shortcut app id, once per app; null when it is not a Unifideck game or the lookup fails. */
export async function unifideckKeyFor(appId: number, key: (appId: number) => Promise<UnifideckKey | null> = getKey): Promise<UnifideckKey | null> {
    try {
        let pending = keys.get(appId);
        if (!pending) {
            pending = key(appId);
            keys.set(appId, pending);
            pending.catch(() => keys.delete(appId)); // backend not ready yet: look again next time
        }
        return await pending;
    } catch {
        return null;
    }
}

/** Unifideck's play time for a Steam shortcut app id; null when it is not a Unifideck game or nothing answers. */
export async function unifideckPlaytimeForApp(
    appId: number,
    deps: PlaytimeDeps & { key?: (appId: number) => Promise<UnifideckKey | null> } = {},
): Promise<UnifideckPlaytime | null> {
    try {
        const key = await unifideckKeyFor(appId, deps.key);
        return key ? await unifideckPlaytime(key.store, key.id, deps) : null;
    } catch {
        return null;
    }
}
