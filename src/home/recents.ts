import { GAME_APP_TYPE, SHORTCUT_APP_TYPE } from '../data/installedGames';
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

const isGameOrShortcut = (a: RawApp) => a.app_type === GAME_APP_TYPE || a.app_type === SHORTCUT_APP_TYPE;

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

/** Recently played games and non-Steam shortcuts, newest first. */
export function pickRecents(apps: RawApp[], limit = RECENTS_LIMIT): RecentGame[] {
    return apps
        .filter((a) => isGameOrShortcut(a) && (a.rt_last_time_played ?? 0) > 0)
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

/**
 * The apps to pick recents from. Steam's recent apps list comes first; when it gives fewer than `limit` played games
 * (on the Ally it gave 10, while Steam's Home shows more), the rest of the library (`all`, every app overview) fills
 * up, without hidden apps (`isHidden`) or duplicates. pickRecents then sorts by last played and keeps `limit`.
 */
export function mergeRecentSources<T extends RawApp>(recent: T[], all: T[], isHidden: (appId: number) => boolean, limit = RECENTS_LIMIT): T[] {
    if (pickRecents(recent, limit).length >= limit) return recent;
    const seen = new Set(recent.map((a) => a.appid));
    const extra = all.filter((a) => {
        if (!a || seen.has(a.appid)) return false;
        seen.add(a.appid);
        try {
            return !isHidden(a.appid);
        } catch {
            return false;
        }
    });
    return [...recent, ...extra];
}

/**
 * Home's recents: the played games (mergeRecentSources, pickRecents) and, with `includeNew` (the "New to library"
 * setting), the never-played games and shortcuts Steam itself lists in its recent games (`recent`, never the rest of
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
        if (!a || seen.has(a.appid) || !isGameOrShortcut(a) || (a.rt_last_time_played ?? 0) > 0) continue;
        const addedAt = addedTime(a);
        if (addedAt <= 0) continue;
        seen.add(a.appid);
        fresh.push({ appId: a.appid, name: a.display_name, lastPlayed: 0, playedMinutes: 0, isNew: true, addedAt });
    }
    const at = (g: RecentGame) => (g.isNew ? g.addedAt : g.lastPlayed);
    return [...played, ...fresh].sort((a, b) => at(b) - at(a)).slice(0, limit);
}

/** "Today", "Yesterday", "N days ago", then a date. Timestamps are Unix seconds. */
export function formatLastPlayed(lastPlayed: number, now: number, locale: string): string {
    const days = Math.floor((now - lastPlayed) / DAY_SECONDS);
    if (days < 1) return tr('today');
    if (days === 1) return tr('yesterday');
    if (days <= AGO_DAYS_MAX) return tr('daysAgo', [days]);
    return new Date(lastPlayed * 1000).toLocaleDateString(locale);
}
