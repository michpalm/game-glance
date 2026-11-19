import { LOG_PREFIX } from '../constants';
import type { LibCollection, LibGame, LibrarySnapshot } from './libraryModel';

/** Steam's app type for a non-Steam shortcut. */
export const SHORTCUT_APP_TYPE = 1073741824;

export interface LibraryBindings { available(): boolean; read(): LibrarySnapshot | null }

interface Overview { appid?: unknown; display_name?: unknown; minutes_playtime_forever?: unknown; rt_last_time_played?: unknown; size_on_disk?: unknown; app_type?: unknown }
interface Store {
    allGamesCollection?: { allApps?: Overview[] };
    localGamesCollection?: { allApps?: Overview[] };
    allAppsCollection?: { allApps?: Overview[] };
    userCollections?: { id?: unknown; displayName?: unknown; allApps?: Overview[] }[];
    BIsHidden?(appId: number): boolean;
}

const num = (v: unknown) => { const n = typeof v === 'string' ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : 0; };
const list = (v: unknown): Overview[] => (Array.isArray(v) ? v : []);

/**
 * Reads Steam's library into a snapshot (spec §6). Read only: the collections' app lists, their overviews' fields and
 * BIsHidden. Any throw (Steam changed) gives null, so the gate shows Steam's own Library; it is logged once.
 */
export function createLibraryBindings(collectionStore: unknown, _appStore: unknown, log: (e: unknown) => void = e => console.warn(`${LOG_PREFIX} Library: Steam's library could not be read`, e)): LibraryBindings {
    const store = () => (collectionStore ?? {}) as Store;
    let logged = false;
    const available = () => { try { return Array.isArray(store().allGamesCollection?.allApps); } catch { return false; } };
    const read = (): LibrarySnapshot | null => {
        if (!available()) return null;
        try {
            const s = store();
            const hidden = (id: number) => (typeof s.BIsHidden === 'function' ? s.BIsHidden(id) === true : false);
            const local = new Set(list(s.localGamesCollection?.allApps).map(o => num(o.appid)));
            const shortcuts = list(s.allAppsCollection?.allApps).filter(o => num(o.app_type) === SHORTCUT_APP_TYPE);
            const games: LibGame[] = [], seen = new Set<number>();
            for (const o of [...list(s.allGamesCollection?.allApps), ...shortcuts]) {
                const appId = num(o.appid);
                if (!appId || seen.has(appId) || hidden(appId)) continue;
                seen.add(appId);
                games.push({
                    appId, name: typeof o.display_name === 'string' && o.display_name ? o.display_name : `App ${appId}`,
                    playedMin: num(o.minutes_playtime_forever), lastPlayed: num(o.rt_last_time_played), sizeBytes: num(o.size_on_disk),
                    installed: local.has(appId), shortcut: num(o.app_type) === SHORTCUT_APP_TYPE,
                });
            }
            // Only games the snapshot lists: a collection's soundtracks, tools and hidden games are not its tab's games.
            const collections: LibCollection[] = list(s.userCollections as unknown).map(c => {
                const col = c as { id?: unknown; displayName?: unknown; allApps?: Overview[] };
                return { id: String(col.id ?? ''), name: String(col.displayName ?? ''), appIds: list(col.allApps).map(o => num(o.appid)).filter(id => seen.has(id)) };
            }).filter(c => c.id && c.name);
            return { games, installedIds: games.filter(g => g.installed).map(g => g.appId), collections };
        } catch (error) {
            if (!logged) { logged = true; log(error); }
            return null;
        }
    };
    return { available, read };
}

let shared: LibraryBindings | null = null;
/** The bindings on Steam's own stores, made on first use (the stores load after the plugin). */
export function sharedLibraryBindings(): LibraryBindings {
    const g = globalThis as Record<string, unknown>;
    return shared ??= createLibraryBindings(g.collectionStore, g.appStore);
}
