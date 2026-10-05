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

/** Recently played games and non-Steam shortcuts, newest first. */
export function pickRecents(apps: RawApp[], limit = 10): RecentGame[] {
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
export function formatLastPlayed(lastPlayed: number, now: number, locale: string): string {
    const days = Math.floor((now - lastPlayed) / DAY_SECONDS);
    if (days < 1) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days <= AGO_DAYS_MAX) return `${days} days ago`;
    return new Date(lastPlayed * 1000).toLocaleDateString(locale);
}
