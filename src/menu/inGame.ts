/** What the In game page knows about the running game; every value is optional and only shown when trustworthy. */
export interface InGameStats { sessionMinutes: number | null; achievements: { unlocked: number; total: number } | null }
export interface InGameStores {
    overview(appId: number): { rt_last_time_locally_played?: number } | undefined;
    achievements(appId: number): { unlocked?: number; total?: number } | undefined;
}
const WEEK = 7 * 86400;
const guarded = <T>(read: () => T | undefined): T | undefined => { try { return read(); } catch { return undefined; } };

export function readInGame(appId: number, stores: InGameStores, nowSeconds: number): InGameStats {
    // rt_last_time_played can stay at an earlier launch (seen on the Ally after a session restart);
    // the local launch time matched the game process start.
    const start = guarded(() => stores.overview(appId))?.rt_last_time_locally_played;
    const elapsed = typeof start === 'number' && start > 0 ? nowSeconds - start : NaN;
    const sessionMinutes = elapsed >= 0 && elapsed <= WEEK ? Math.floor(elapsed / 60) : null;
    const progress = guarded(() => stores.achievements(appId));
    const { unlocked, total } = progress ?? {};
    const achievements = Number.isInteger(total) && total! > 0 && Number.isInteger(unlocked) && unlocked! >= 0 && unlocked! <= total! ? { unlocked: unlocked!, total: total! } : null;
    return { sessionMinutes, achievements };
}

export function formatSession(minutes: number): string {
    if (minutes < 1) return 'Under a minute this session';
    if (minutes < 60) return `${minutes} min this session`;
    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min this session`;
}

interface SteamGlobals {
    appStore?: { GetAppOverviewByAppID?(appId: number): { rt_last_time_locally_played?: number } | null };
    appAchievementProgressCache?: { m_achievementProgress?: { mapCache?: Map<number, { unlocked?: number; total?: number }> } };
}
export const browserInGameStores: InGameStores = {
    overview: appId => (globalThis as SteamGlobals).appStore?.GetAppOverviewByAppID?.(appId) ?? undefined,
    achievements: appId => (globalThis as SteamGlobals).appAchievementProgressCache?.m_achievementProgress?.mapCache?.get(appId),
};
