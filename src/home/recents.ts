import { GAME_APP_TYPE, SHORTCUT_APP_TYPE } from '../data/installedGames';

export interface RawApp {
    appid: number;
    display_name: string;
    app_type: number;
    rt_last_time_played?: number;
    minutes_playtime_forever?: number;
}

export interface RecentGame {
    appId: number;
    name: string;
    lastPlayed: number;
    playedMinutes: number;
}

/**
 * How many recents Home shows: as many as Steam's own recent games list holds (20, probed on the Ally:
 * `collectionStore.recentAppsCollection.allApps`), so no game Steam's Home offers is missing (Reddit feedback).
 */
export const RECENTS_LIMIT = 20;

/** Recently played games and non-Steam shortcuts, newest first. */
export function pickRecents(apps: RawApp[], limit = RECENTS_LIMIT): RecentGame[] {
    return apps
        .filter((a) => (a.app_type === GAME_APP_TYPE || a.app_type === SHORTCUT_APP_TYPE) && (a.rt_last_time_played ?? 0) > 0)
        .sort((a, b) => (b.rt_last_time_played ?? 0) - (a.rt_last_time_played ?? 0))
        .slice(0, limit)
        .map((a) => ({
            appId: a.appid,
            name: a.display_name,
            lastPlayed: a.rt_last_time_played ?? 0,
            playedMinutes: Math.max(0, a.minutes_playtime_forever ?? 0),
        }));
}

const DAY_SECONDS = 86400;
const AGO_DAYS_MAX = 14;

/** "Today", "Yesterday", "N days ago", then a date. Timestamps are Unix seconds. */
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

export function formatLastPlayed(lastPlayed: number, now: number, locale: string): string {
    const days = Math.floor((now - lastPlayed) / DAY_SECONDS);
    if (days < 1) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days <= AGO_DAYS_MAX) return `${days} days ago`;
    return new Date(lastPlayed * 1000).toLocaleDateString(locale);
}
