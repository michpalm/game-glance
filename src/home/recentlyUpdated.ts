import { LOG_PREFIX } from '../constants';

/**
 * "Recently updated" games for the What's new tab's second row. Primary source (C18): Steam's own list behind stock
 * Home's "Recently updated on this device" shelf, `window.downloadsStore.RecentlyCompleted` (completed download items
 * Steam keeps in machine storage; stock shows the installed ones, with the downloaded size, Steam's
 * update_type_info[].progress[2].bytes_total summed, and "Updated <completed_time>"). It was missed in C15 because it
 * is a separate store from the download list. Fallback: the app details' `rtLastUpdated`, the date the game page's
 * Properties show as "Last local update" (probed on the Ally: present for every installed game once its details are
 * loaded, e.g. 1791102363 for a game updated that day). Steam's other candidates were not usable: the download list
 * keeps only this session's transfers (2 items on the Ally, one without a completed time), and the store's "updated
 * apps" map behind the library's "Updated N days ago" hover was empty. Pure parts first, then the reader.
 */

export interface UpdatedSource {
    appId: number;
    name: string;
    /** Unix seconds; 0 or missing = unknown. */
    rtLastUpdated: number;
}

export interface UpdatedCard {
    appId: number;
    name: string;
    rtLastUpdated: number;
    /** "Updated Today at 11:22 AM", "Updated Yesterday", "Updated Fri, Oct 2" (Steam's list); "Updated 5 days ago" (fallback). */
    label: string;
    /** The update's downloaded size, as stock shows it ("1.7 GB"); missing for the fallback. */
    size?: string;
}

/** Steam's download progress slot for downloaded bytes (EAppUpdateProgress Download). */
const PROGRESS_DOWNLOAD = 2;

/** An item's downloaded bytes, as Steam's own shelf sums them: update_type_info[].progress[2].bytes_total. */
export function completedBytes(item: unknown): number {
    const types = (item as { update_type_info?: unknown })?.update_type_info;
    if (!Array.isArray(types)) return 0;
    return types.reduce((sum: number, t) => {
        const p = (t as { progress?: unknown })?.progress;
        const bytes = Array.isArray(p) ? Number((p[PROGRESS_DOWNLOAD] as { bytes_total?: unknown })?.bytes_total) : 0;
        return sum + (Number.isFinite(bytes) && bytes > 0 ? bytes : 0);
    }, 0);
}

/** Bytes as stock shows them: binary units, one decimal ("1.7 GB", "46.8 KB"); '' for 0. */
export function formatBytes(bytes: number, locale?: string): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = bytes;
    let u = 0;
    while (v >= 1024 && u < units.length - 1) {
        v /= 1024;
        u++;
    }
    const n = new Intl.NumberFormat(locale, { minimumFractionDigits: u === 0 ? 0 : 1, maximumFractionDigits: u === 0 ? 0 : 1 }).format(v);
    return `${n} ${units[u]}`;
}

/**
 * Steam's shelf line for an update completed at `rt` (unix s), seen at `now` (ms), in the device's local time:
 * "Updated Today at 11:22 AM", "Updated Yesterday", else "Updated Fri, Oct 2".
 */

/**
 * Valve's runtime packages that have no art and nothing to play (Steamworks Common Redistributables, 228980) are left
 * out of the row; Proton and the Steam Linux Runtime stay (they are what Steam's own shelf lists and are named in it).
 */
const HIDDEN_TOOL_APP_IDS = new Set([228980]);
export const isHiddenTool = (appId: number, name: string) => HIDDEN_TOOL_APP_IDS.has(appId) || /\bredistributables?\b/i.test(name);

export function completedLabel(rt: number, now: number, locale = 'en-US', timeZone?: string): string {
    const when = new Date(rt * 1000);
    const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const today = day(new Date(now));
    const yesterday = day(new Date(now - DAY * 1000));
    if (day(when) === today) return `Updated Today at ${new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit' }).format(when)}`;
    if (day(when) === yesterday) return 'Updated Yesterday';
    return `Updated ${new Intl.DateTimeFormat(locale, { timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(when)}`;
}

/**
 * Steam's recently completed updates as cards: installed games only (as stock), newest first, one per app, at most
 * `max`, with the size and Steam's line. `installed(appId)`: the game's name when it is installed here, else ''.
 */
export function fromCompleted(items: unknown, installed: (appId: number) => string, now: number, max = UPDATED_MAX, locale?: string, timeZone?: string): UpdatedCard[] {
    if (!Array.isArray(items)) return [];
    const best = new Map<number, UpdatedCard>();
    for (const it of items) {
        const o = it as { appid?: unknown; completed?: unknown; completed_time?: unknown };
        const appId = Number(o?.appid);
        const rt = Number(o?.completed_time);
        if (!Number.isInteger(appId) || appId <= 0 || !Number.isFinite(rt) || rt <= 0) continue;
        const name = installed(appId);
        if (!name || isHiddenTool(appId, name)) continue;
        if ((best.get(appId)?.rtLastUpdated ?? 0) >= rt) continue;
        best.set(appId, { appId, name, rtLastUpdated: rt, label: completedLabel(rt, now, locale, timeZone), size: formatBytes(completedBytes(it), locale) || undefined });
    }
    return [...best.values()].sort((a, b) => b.rtLastUpdated - a.rtLastUpdated).slice(0, Math.max(0, max));
}

/** Only updates this recent count. */
export const UPDATED_MAX_AGE_DAYS = 30;
/** Cards in the row. */
export const UPDATED_MAX = 12;

const DAY = 86_400;

/** The card's line for an update at `rt` (unix s) seen at `now` (unix s), in whole days. A future time reads today. */
export function updatedLabel(rt: number, now: number): string {
    const days = Math.max(0, Math.floor((now - rt) / DAY));
    if (days === 0) return 'Updated today';
    if (days === 1) return 'Updated yesterday';
    return `Updated ${days} days ago`;
}

/**
 * The row's games: known update times within `maxAgeDays`, newest first, one card per game (the newest time wins),
 * at most `max`. Unknown times, broken ids and nameless games are dropped. Pure.
 */
export function pickRecentlyUpdated(sources: UpdatedSource[], now: number, maxAgeDays = UPDATED_MAX_AGE_DAYS, max = UPDATED_MAX): UpdatedCard[] {
    const best = new Map<number, UpdatedSource>();
    for (const s of sources) {
        if (!Number.isInteger(s.appId) || s.appId <= 0 || !s.name) continue;
        const rt = Number(s.rtLastUpdated);
        if (!Number.isFinite(rt) || rt <= 0 || now - rt > maxAgeDays * DAY) continue;
        const old = best.get(s.appId);
        if (!old || rt > old.rtLastUpdated) best.set(s.appId, { ...s, rtLastUpdated: rt });
    }
    return [...best.values()]
        .sort((a, b) => b.rtLastUpdated - a.rtLastUpdated)
        .slice(0, Math.max(0, max))
        .map((s) => ({ appId: s.appId, name: s.name, rtLastUpdated: s.rtLastUpdated, label: updatedLabel(s.rtLastUpdated, now) }));
}

/** Installed games to look at: Steam games (app_type 1, not shortcuts) installed on this device, at most `max`. */
export function installedGames(apps: unknown[], max = 80): Array<{ appId: number; name: string }> {
    const out: Array<{ appId: number; name: string }> = [];
    for (const a of apps) {
        const o = a as { appid?: unknown; display_name?: unknown; installed?: unknown; app_type?: unknown; BIsModOrShortcut?(): boolean };
        if (o?.installed !== true || o.app_type !== 1) continue;
        try {
            if (o.BIsModOrShortcut?.()) continue;
        } catch {
            continue;
        }
        const appId = Number(o.appid);
        if (!Number.isInteger(appId) || appId <= 0) continue;
        const name = typeof o.display_name === 'string' ? o.display_name : '';
        if (isHiddenTool(appId, name)) continue;
        out.push({ appId, name });
        if (out.length >= max) break;
    }
    return out;
}

type Registration = { unregister?(): void } | undefined;
type AppsApi = { RegisterForAppDetails?(appId: number, cb: (details: { rtLastUpdated?: unknown } | undefined) => void): Registration };
type Globals = {
    SteamClient?: { Apps?: AppsApi };
    appStore?: { allApps?: unknown[]; GetAppOverviewByAppID?(appId: number): { display_name?: string; local_per_client_data?: { installed?: boolean } } | null | undefined };
    downloadsStore?: { RecentlyCompleted?: unknown };
};

/** Steam's own recently completed list as cards, or null when the store is missing, empty or throws. */
export function readSteamRecentlyCompleted(now: number = Date.now()): UpdatedCard[] | null {
    try {
        const g = globalThis as unknown as Globals;
        const items = g.downloadsStore?.RecentlyCompleted;
        if (!Array.isArray(items)) return null;
        const cards = fromCompleted(items, (id) => {
            const o = g.appStore?.GetAppOverviewByAppID?.(id);
            return o?.local_per_client_data?.installed ? String(o.display_name ?? '') : '';
        }, now);
        return cards.length > 0 ? cards : null;
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not read Steam's recently completed list`, error);
        return null;
    }
}

/** Details lookups in flight at once, and how long one may take. */
const DETAILS_CONCURRENCY = 6;
const DETAILS_TIMEOUT_MS = 2500;
/** The list is kept this long for the session. */
const MEMO_MS = 10 * 60_000;

let memo: { at: number; cards: UpdatedCard[] } | null = null;

/** One game's rtLastUpdated: registers for its details (Steam answers in ~0.5-0.9 s on the Ally), then unregisters. */
function readLastUpdated(api: AppsApi, appId: number): Promise<number> {
    return new Promise((resolve) => {
        let done = false;
        let reg: Registration;
        const finish = (rt: number) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            // The callback can run before RegisterForAppDetails returns; unregister once it has.
            setTimeout(() => {
                try {
                    reg?.unregister?.();
                } catch {
                    // already gone
                }
            }, 0);
            resolve(rt);
        };
        const timer = setTimeout(() => finish(0), DETAILS_TIMEOUT_MS);
        try {
            reg = api.RegisterForAppDetails?.(appId, (details) => finish(Number(details?.rtLastUpdated) || 0));
            if (!api.RegisterForAppDetails) finish(0);
        } catch {
            finish(0);
        }
    });
}

/**
 * The recently updated games: Steam's own list when it has one, else the details-based fallback (local IPC with Steam
 * only, no network, kept for 10 minutes; `isCancelled` stops the scan between games). Never rejects: [] when the API is missing or anything fails.
 */
export async function loadRecentlyUpdated(now: () => number = Date.now, isCancelled: () => boolean = () => false): Promise<UpdatedCard[]> {
    // Steam's own list first: an in-memory read, so it is fresh on every Home open.
    const steam = readSteamRecentlyCompleted(now());
    if (steam) return steam;
    if (memo && now() - memo.at < MEMO_MS) return memo.cards;
    try {
        const g = globalThis as unknown as Globals;
        const api = g.SteamClient?.Apps;
        const apps = g.appStore?.allApps;
        if (!api?.RegisterForAppDetails || !Array.isArray(apps)) return [];
        const games = installedGames(apps);
        const sources: UpdatedSource[] = [];
        let next = 0;
        const worker = async () => {
            while (next < games.length && !isCancelled()) {
                const game = games[next++];
                sources.push({ ...game, rtLastUpdated: await readLastUpdated(api, game.appId) });
            }
        };
        await Promise.all(Array.from({ length: Math.min(DETAILS_CONCURRENCY, games.length) }, worker));
        if (isCancelled()) return []; // Home left: stop scanning, and never memoise a partial list
        const cards = pickRecentlyUpdated(sources, Math.floor(now() / 1000));
        memo = { at: now(), cards };
        return cards;
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: recently updated failed`, error);
        return [];
    }
}

/** Forgets the session list (tests). */
export function resetRecentlyUpdated() {
    memo = null;
}
