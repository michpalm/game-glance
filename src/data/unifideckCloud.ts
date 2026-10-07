import { LOG_PREFIX } from '../constants';
import type { CloudState } from '../home/cloud';
import { PlaytimeDeps, unifideckKeyFor, UnifideckKey } from './unifideckPlaytime';

/**
 * A Unifideck game's cloud-save state for Home's cloud button, derived as Unifideck's own cloud button derives it
 * (read 2026-10-07 from its CloudSaveButton): `get_cloud_save_status(store, gameId)` says whether a sync is running,
 * whether the save folder was found, whether the store has cloud support, and the local and cloud save times. Steam's
 * own Cloud status is empty for these shortcuts. The button is read only on Home: A does nothing (its manual
 * download / upload window is Unifideck's).
 */
export interface UnifideckCloudStatus {
    supported?: unknown;
    in_progress?: unknown;
    cloud_supported?: unknown;
    save_path_resolved?: unknown;
    has_local_saves?: unknown;
    has_cloud_saves?: unknown;
    local_snapshot?: { timestamp?: unknown } | null;
    remote_snapshot?: { timestamp?: unknown } | null;
}

/** Unifideck treats local and cloud as in sync within this many seconds (the store keeps whole seconds). */
export const TS_SYNC_TOLERANCE_S = 2;

const ts = (s: { timestamp?: unknown } | null | undefined): number => (typeof s?.timestamp === 'number' && Number.isFinite(s.timestamp) ? s.timestamp : 0);

/**
 * The button's state, or null when Unifideck's own button would not show (store without cloud saves, or no cloud support
 * for the game). Pure.
 */
export function unifideckCloudState(status: UnifideckCloudStatus | null | undefined): CloudState | null {
    if (!status || status.supported !== true || status.cloud_supported === false) return null;
    const base = { status: 0, action: 'none' as const };
    if (status.in_progress === true) return { ...base, tone: 'busy', icon: { save: true }, label: 'Cloud saves: syncing' };
    if (status.save_path_resolved !== true) return { ...base, tone: 'bad', icon: { error: true }, label: 'Cloud saves: save folder not found' };
    const hasLocal = status.has_local_saves === true;
    const hasCloud = status.has_cloud_saves === true || !!status.remote_snapshot;
    const apart = hasCloud && hasLocal && ts(status.local_snapshot) > 0 && ts(status.remote_snapshot) > 0 && Math.abs(ts(status.local_snapshot) - ts(status.remote_snapshot)) > TS_SYNC_TOLERANCE_S;
    if ((hasCloud && !hasLocal) || apart) return { ...base, tone: 'busy', icon: { save: true }, label: 'Cloud saves: a newer save is available' };
    if (!hasCloud && hasLocal) return { ...base, tone: 'busy', icon: { save: true }, label: 'Cloud saves: not uploaded yet' };
    if (hasCloud && hasLocal) return { ...base, tone: 'ok', icon: { uploaded: true }, label: 'Cloud saves: in sync' };
    return { ...base, tone: 'off', icon: {}, label: 'Cloud saves: nothing saved yet' };
}

/** The usable status of Unifideck's reply; null for a failure or garbage. */
export function parseCloudStatus(response: unknown): UnifideckCloudStatus | null {
    try {
        const r = response as { success?: unknown; data?: unknown } | null;
        if (!r || r.success !== true || !r.data || typeof r.data !== 'object') return null;
        return r.data as UnifideckCloudStatus;
    } catch {
        return null;
    }
}

interface DeckyBackendLike {
    call(route: string, ...args: unknown[]): Promise<unknown>;
}
const deckyBackend = (): DeckyBackendLike | undefined => (globalThis as { DeckyBackend?: DeckyBackendLike }).DeckyBackend;

// The status can take a while on Unifideck's side (it asks the store), so it is cached and asked once at a time.
const TTL_MS = 10_000;
const cache = new Map<number, { at: number; value: Promise<CloudState | null> }>();
let logged = false;

/** Forget everything (tests). */
export function resetUnifideckCloud(): void {
    cache.clear();
    logged = false;
}

/** The cloud button state for a Unifideck shortcut app id; null when it is not a Unifideck game, has no cloud saves, or nothing answers. Cached 10 s. */
export async function unifideckCloudForApp(
    appId: number,
    deps: PlaytimeDeps & { key?: (appId: number) => Promise<UnifideckKey | null> } = {},
): Promise<CloudState | null> {
    try {
        const key = await unifideckKeyFor(appId, deps.key);
        if (!key) return null;
        const now = (deps.now ?? Date.now)();
        const hit = cache.get(appId);
        if (hit && now - hit.at < TTL_MS) return await hit.value;
        const backend = 'backend' in deps ? deps.backend : deckyBackend();
        const value = (async () => {
            try {
                if (!backend?.call) return null;
                return unifideckCloudState(parseCloudStatus(await backend.call('loader/call_plugin_method', 'Unifideck', 'get_cloud_save_status', key.store, key.id)));
            } catch (error) {
                if (!logged) {
                    logged = true;
                    console.warn(`${LOG_PREFIX} Unifideck cloud saves unavailable`, error);
                }
                return null;
            }
        })();
        cache.set(appId, { at: now, value });
        return await value;
    } catch {
        return null;
    }
}
