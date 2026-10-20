import { DEMO_APP_TYPE, GAME_APP_TYPE, SHORTCUT_APP_TYPE } from '../data/installedGames';
import { tr } from '../i18n/steamText';

export interface RawApp {
    appid: number;
    display_name: string;
    app_type: number;
    rt_last_time_played?: number;
    minutes_playtime_forever?: number;
    /** When the game was added to the library (Unix seconds); 0 or missing when unknown. */
    rt_purchased_time?: number;
    /** Steam's own "recent activity" time, the fallback for when it was added. */
    rt_recent_activity_time?: number;
}

export interface RecentGame {
    appId: number;
    name: string;
    lastPlayed: number;
    playedMinutes: number;
    /** Never played and in Steam's recent list as new to the library ("New to library" on Steam's Home). */
    isNew: boolean;
    /** When it was added to the library (Unix seconds), 0 when unknown. */
    addedAt: number;
}

/** What Home's games row shows: games, demos (as Steam's own Home does) and non-Steam shortcuts; never tools or soundtracks. */
export const isRowApp = (a: RawApp) => a.app_type === GAME_APP_TYPE || a.app_type === DEMO_APP_TYPE || a.app_type === SHORTCUT_APP_TYPE;

/** When `a` was added to the library: Steam's purchase time, else its recent activity time; 0 when neither is known. */
export function addedTime(a: RawApp): number {
    const purchased = Number(a.rt_purchased_time) || 0;
    if (purchased > 0) return purchased;
    const activity = Number(a.rt_recent_activity_time) || 0;
    return activity > 0 ? activity : 0;
}

/**
 * How many recents Home shows: as many as Steam's own recent games list holds (20, probed on the Ally:
 * `collectionStore.recentAppsCollection.allApps`), so no game Steam's Home offers is missing (Reddit feedback).
 */
export const RECENTS_LIMIT = 20;

/** Recently played games, demos and non-Steam shortcuts, newest first. */
export function pickRecents(apps: RawApp[], limit = RECENTS_LIMIT): RecentGame[] {
    return apps
        .filter((a) => isRowApp(a) && (a.rt_last_time_played ?? 0) > 0)
        .sort((a, b) => (b.rt_last_time_played ?? 0) - (a.rt_last_time_played ?? 0))
        .slice(0, limit)
        .map((a) => ({
            appId: a.appid,
            name: a.display_name,
            lastPlayed: a.rt_last_time_played ?? 0,
            playedMinutes: Math.max(0, a.minutes_playtime_forever ?? 0),
            isNew: false,
            addedAt: addedTime(a),
        }));
}

const DAY_SECONDS = 86400;
const AGO_DAYS_MAX = 14;

/** True for a game the user hid in Steam. `onError` is the answer when the check itself fails. */
function hiddenApp(a: RawApp | undefined, isHidden: (appId: number) => boolean, onError: boolean): boolean {
    if (!a) return true;
    try {
        return isHidden(a.appid);
    } catch {
        return onError;
    }
}

/**
 * The apps to pick recents from. Steam's recent apps list comes first; when it gives fewer than `limit` played games
 * (on the Ally it gave 10, while Steam's Home shows more), the rest of the library (`all`, every app overview) fills
 * up, without hidden apps (`isHidden`) or duplicates. Hidden apps are also dropped from Steam's own list. pickRecents then sorts by last played and keeps `limit`.
 */
export function mergeRecentSources<T extends RawApp>(recentAll: T[], all: T[], isHidden: (appId: number) => boolean, limit = RECENTS_LIMIT): T[] {
    // Steam's own recent list holds hidden games too (a hidden game that is new to the library, or one played before it was hidden).
    // A failing check keeps Steam's own games (a broken check must not empty Home); it still refuses the library's fill-ins.
    const visible = recentAll.filter((a) => !hiddenApp(a, isHidden, false));
    const recent = visible.length === recentAll.length ? recentAll : visible;
    if (pickRecents(recent, limit).length >= limit) return recent;
    const seen = new Set(recentAll.map((a) => a.appid));
    const extra = all.filter((a) => {
        if (!a || seen.has(a.appid)) return false;
        seen.add(a.appid);
        return !hiddenApp(a, isHidden, true);
    });
    return [...recent, ...extra];
}

/**
 * Home's recents: the played games (mergeRecentSources, pickRecents) and, with `includeNew` (the "New to library"
 * setting), the never-played games, demos and shortcuts Steam itself lists in its recent games (`recent`, never the rest of
 * the library) that have an added time. All newest first by their activity (last played, or added for a new game),
 * at most `limit`, each game once.
 */
export function pickHomeRecents<T extends RawApp>({ recent, all, isHidden, includeNew, limit = RECENTS_LIMIT }: {
    recent: T[];
    all: T[];
    isHidden(appId: number): boolean;
    includeNew: boolean;
    limit?: number;
}): RecentGame[] {
    const played = pickRecents(mergeRecentSources(recent, all, isHidden, limit), limit);
    if (!includeNew) return played;
    const seen = new Set(played.map((g) => g.appId));
    const fresh: RecentGame[] = [];
    for (const a of recent) {
        if (!a || seen.has(a.appid) || !isRowApp(a) || (a.rt_last_time_played ?? 0) > 0 || hiddenApp(a, isHidden, false)) continue;
        const addedAt = addedTime(a);
        if (addedAt <= 0) continue;
        seen.add(a.appid);
        fresh.push({ appId: a.appid, name: a.display_name, lastPlayed: 0, playedMinutes: 0, isNew: true, addedAt });
    }
    const at = (g: RecentGame) => (g.isNew ? g.addedAt : g.lastPlayed);
    return [...played, ...fresh].sort((a, b) => at(b) - at(a)).slice(0, limit);
}

/** An app overview with the fields Steam's own Home row sorts by. */
export interface SteamHomeApp extends RawApp {
    rt_last_time_locally_played?: number;
    rt_last_time_played_or_installed?: number;
    local_per_client_data?: { installed?: boolean } | null;
}

/** Where Steam's Home puts the games played only on other devices: from the 16th place (Steam's Home module). */
export const ELSEWHERE_AT = 15;

/**
 * Steam's Home sort time (its Home module's own): the latest of played on this device, bought, and, for a game
 * installed here, played-or-installed. Pure.
 */
export function steamHomeTime(a: SteamHomeApp): number {
    const local = Number(a.rt_last_time_locally_played) || 0;
    const bought = Number(a.rt_purchased_time) || 0;
    const installed = a.local_per_client_data?.installed ? Number(a.rt_last_time_played_or_installed) || 0 : 0;
    return Math.max(local, bought, installed);
}

/**
 * Home's games row in the order Steam's own Home shows it (SteamOS 3.8.28's Home module, read on the Deck and the
 * Ally, 2026-10-20): the games played on this device (`localPlayed`), bought lately (`recentPurchased`) and installed
 * here (`localGames`), newest first by steamHomeTime, the first of the played-here list always first; then Steam's
 * account-wide recent list (`recent`: games played on other devices too) from the 16th place on. Steam's own lists
 * (their `visibleApps`, without hidden games) are taken as they are. Then, as Steam does, what the row does not show
 * goes (here: everything but games, demos and shortcuts, and hidden games), and at most `limit` stay. A game Steam's
 * servers never saw played but played here has its local time as its last played (it is not new to the library);
 * never-played games are new to the library, left out with `includeNew` off.
 */
export function pickSteamHomeRecents<T extends SteamHomeApp>({ recent, localPlayed, recentPurchased, localGames, isHidden, includeNew, limit = RECENTS_LIMIT }: {
    recent: T[];
    localPlayed: T[];
    recentPurchased: T[];
    localGames: T[];
    isHidden(appId: number): boolean;
    includeNew: boolean;
    limit?: number;
}): RecentGame[] {
    const seen = new Set<number>();
    const fresh = (list: T[]) => list.filter((a) => {
        if (!a || seen.has(a.appid)) return false;
        seen.add(a.appid);
        return true;
    });
    const here = fresh(localPlayed);
    const first = here.shift();
    const rest = [...here, ...fresh(recentPurchased), ...fresh(localGames)].sort((a, b) => steamHomeTime(b) - steamHomeTime(a));
    const ordered = first ? [first, ...rest] : rest;
    ordered.splice(ELSEWHERE_AT, 0, ...fresh(recent));
    const games: RecentGame[] = [];
    for (const a of ordered) {
        if (games.length >= limit) break;
        if (!isRowApp(a) || hiddenApp(a, isHidden, false)) continue;
        const lastPlayed = (Number(a.rt_last_time_played) || 0) > 0 ? Number(a.rt_last_time_played) : Number(a.rt_last_time_locally_played) || 0;
        const isNew = lastPlayed <= 0;
        if (isNew && !includeNew) continue;
        games.push({ appId: a.appid, name: a.display_name, lastPlayed, playedMinutes: Math.max(0, Number(a.minutes_playtime_forever) || 0), isNew, addedAt: addedTime(a) });
    }
    return games;
}

/**
 * "Today", "Yesterday", "N days ago", then a date with its month named, in the language's own order ("Aug 24", "24 Aug",
 * "24. Aug."), and the year when it is not this one. Never all numbers: Steam has one English, so 10/12 read as October
 * in the US order to people for whom it is 12 December (#57). Timestamps are Unix seconds.
 */
export function formatLastPlayed(lastPlayed: number, now: number, locale: string): string {
    const days = Math.floor((now - lastPlayed) / DAY_SECONDS);
    if (days < 1) return tr('today');
    if (days === 1) return tr('yesterday');
    if (days <= AGO_DAYS_MAX) return tr('daysAgo', [days]);
    const when = new Date(lastPlayed * 1000);
    const thisYear = when.getFullYear() === new Date(now * 1000).getFullYear();
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', ...(thisYear ? {} : { year: 'numeric' as const }) }).format(when);
}
