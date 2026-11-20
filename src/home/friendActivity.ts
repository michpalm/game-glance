/**
 * A friend's achievements in one game, from Steam's own game Activity store (`window.appActivityStore`, the data behind a
 * game page's activity; spike 2026-11-19 on the PS5): `m_mapAppActivity.get(appId).m_mapActivityByDay` → each day's
 * `m_mapAchievementsByUser`, keyed by the friend's account id → `{ rtEventTime, m_rgAchievements: [{ strName,
 * rtUnlocked, bAchieved, ... }] }`. Steam fills it with `FetchLatestActivity(appId)`, which Steam itself calls with just
 * the app id (game page, app exit, screenshots). Nothing here throws; anything unexpected reads as nothing.
 */

import { ago } from './friends';

export interface Unlock { name: string; at: number /* Unix s */ }
export interface FriendAchievements {
    latest: Unlock | null;
    /** Unlocks in the friend's last session in this game: within 6 h of the newest. */
    lastSession: number;
}

const EMPTY: FriendAchievements = { latest: null, lastSession: 0 };
const SESSION_S = 6 * 3600;
/** How often a game's activity is asked for again. */
export const ACTIVITY_TTL_MS = 5 * 60_000;

const values = (m: unknown): unknown[] => {
    try { return m && typeof (m as Map<unknown, unknown>).values === 'function' ? Array.from((m as Map<unknown, unknown>).values()) : []; } catch { return []; }
};
const getKey = (m: unknown, key: number): unknown => {
    try { return m && typeof (m as Map<unknown, unknown>).get === 'function' ? (m as Map<unknown, unknown>).get(key) : undefined; } catch { return undefined; }
};

/** One friend's unlocks in one game's activity (Steam's store entry for that game). */
export function parseActivity(game: unknown, accountId: number): FriendAchievements {
    if (!game || typeof game !== 'object' || !(accountId > 0)) return EMPTY;
    const unlocks: Unlock[] = [];
    for (const day of values((game as { m_mapActivityByDay?: unknown }).m_mapActivityByDay)) {
        if (!day || typeof day !== 'object') continue;
        const event = getKey((day as { m_mapAchievementsByUser?: unknown }).m_mapAchievementsByUser, accountId) as { m_rgAchievements?: unknown } | undefined;
        let list: unknown[] = [];
        try { list = event && event.m_rgAchievements ? Array.from(event.m_rgAchievements as ArrayLike<unknown>) : []; } catch { list = []; }
        for (const a of list) {
            const { strName, rtUnlocked, bAchieved } = (a ?? {}) as { strName?: unknown; rtUnlocked?: unknown; bAchieved?: unknown };
            if (bAchieved === false || typeof strName !== 'string' || !strName || typeof rtUnlocked !== 'number' || !(rtUnlocked > 0)) continue;
            unlocks.push({ name: strName, at: rtUnlocked });
        }
    }
    if (unlocks.length === 0) return EMPTY;
    const latest = unlocks.reduce((a, b) => (b.at > a.at ? b : a));
    return { latest, lastSession: unlocks.filter(u => u.at > latest.at - SESSION_S).length };
}

/** Steam's side: ask for a game's activity, read what Steam has for it. */
export interface ActivitySteam { fetch(appId: number): void; activity(appId: number): unknown }

export function createFriendActivity(steam: ActivitySteam, now: () => number, ttlMs = ACTIVITY_TTL_MS) {
    const asked = new Map<number, number>();
    return {
        /** Asks Steam for these games' activity, each at most once per `ttlMs`. */
        want(appIds: number[]): void {
            for (const appId of appIds) {
                if (!(appId > 0)) continue;
                const at = asked.get(appId);
                if (at !== undefined && now() - at < ttlMs) continue;
                asked.set(appId, now());
                try { steam.fetch(appId); } catch { /* Steam's own call failed: the card shows without achievements */ }
            }
        },
        /** The friend's unlocks in this game from Steam's cache; null when Steam has none for the game or the friend is unknown. */
        get(appId: number, accountId: number): FriendAchievements | null {
            if (!(appId > 0) || !(accountId > 0)) return null;
            let game: unknown;
            try { game = steam.activity(appId); } catch { return null; }
            return game ? parseActivity(game, accountId) : null;
        },
    };
}

/** Steam's own store, or null when it is not there. */
export function steamActivity(): ActivitySteam | null {
    const store = (globalThis as { appActivityStore?: { FetchLatestActivity?(appId: number): unknown; m_mapAppActivity?: { get?(appId: number): unknown } } }).appActivityStore;
    if (!store || typeof store.FetchLatestActivity !== 'function') return null;
    return {
        fetch: appId => { void store.FetchLatestActivity!(appId); },
        activity: appId => store.m_mapAppActivity?.get?.(appId),
    };
}

/** The card's achievement line: one unlock in the last session by name and when, several by count; '' when none. */
export function achievementLine(a: FriendAchievements | null, nowMs: number): string {
    if (!a?.latest) return '';
    return a.lastSession > 1 ? `${a.lastSession} achievements · last session` : `${a.latest.name} · ${ago(a.latest.at, nowMs)}`;
}
