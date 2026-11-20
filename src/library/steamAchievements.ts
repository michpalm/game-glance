/**
 * Steam's achievement progress cache (`window.appAchievementProgressCache`, read from steamui/sp.js 2026-11-19): Steam's
 * own Library calls GetAchievementProgress(appId) per capsule, which returns the cached percentage and queues one batched
 * request (100 ms) for every game it lacks. With Steam's Library replaced, Game Glance's asks the same way.
 */
interface ProgressCache {
    m_achievementProgress?: { mapCache?: Map<number, { unlocked?: unknown; total?: unknown }> };
    GetAchievementProgress?(appId: number): unknown;
}
const steamCache = () => (globalThis as { appAchievementProgressCache?: ProgressCache }).appAchievementProgressCache;

/** A game's unlocked and total achievements from Steam's cache; undefined while unknown. */
export function readSteamProgress(cache: ProgressCache | undefined = steamCache(), appId: number): { achieved: number; total: number } | undefined {
    try {
        const entry = cache?.m_achievementProgress?.mapCache?.get(appId);
        const achieved = Number(entry?.unlocked), total = Number(entry?.total);
        return entry && Number.isFinite(achieved) && Number.isFinite(total) ? { achieved, total } : undefined;
    } catch {
        return undefined;
    }
}

/** Asks Steam for the games its cache lacks (it batches them into one request). Returns how many were asked; never throws. */
export function requestSteamProgress(cache: ProgressCache | undefined = steamCache(), appIds: number[]): number {
    let asked = 0;
    try {
        if (typeof cache?.GetAchievementProgress !== 'function') return 0;
        for (const id of appIds) {
            if (readSteamProgress(cache, id)) continue;
            cache.GetAchievementProgress(id);
            asked++;
        }
    } catch {
        return asked;
    }
    return asked;
}
