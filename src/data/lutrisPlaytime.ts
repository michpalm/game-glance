import { callable } from '@decky/api';
import { LOG_PREFIX } from '../constants';
import { LutrisRef } from '../logic/lutris';
import { UnifideckPlaytime } from './unifideckPlaytime';

/**
 * Play time as Lutris itself keeps it, for the games it added to Steam. Lutris counts the game's own run time (a
 * monotonic clock: the device's sleep is not counted) and includes play started from Lutris, which Steam's shortcut
 * count does not see. It is the launcher's own record, so a Lutris game shows Lutris's, as Unifideck's games show
 * Unifideck's. (Steam's own numbers were right: R3APER's Red Dead Redemption 2 read 223.4 h on Home and 38.6 h on the
 * game page, until Home read it the way the page does, steamPlayedMinutes.)
 * Read by the backend from Lutris's pga.db (hours, last played in Unix seconds).
 */
const getPlaytime = callable<[gameId: number, flatpak: boolean], unknown>('get_lutris_playtime');

/** The usable part of the backend's reply; null for nothing, garbage, or a reply with neither value (0 hours counts as none). */
export function parseLutrisPlaytime(response: unknown): UnifideckPlaytime | null {
    try {
        const r = response as { hours?: unknown; lastplayed?: unknown } | null;
        if (!r || typeof r !== 'object') return null;
        const hours = typeof r.hours === 'number' && Number.isFinite(r.hours) && r.hours > 0 ? r.hours : null;
        const playedSeconds = hours === null ? null : Math.round(hours * 3600);
        const lastPlayed = typeof r.lastplayed === 'number' && Number.isFinite(r.lastplayed) && r.lastplayed > 0 ? Math.floor(r.lastplayed) : null;
        return playedSeconds === null && lastPlayed === null ? null : { playedSeconds, lastPlayed };
    } catch {
        return null;
    }
}

export interface LutrisPlaytimeDeps {
    call?: (gameId: number, flatpak: boolean) => Promise<unknown>;
    now?: () => number;
}

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: Promise<UnifideckPlaytime | null> }>();
let logged = false;

/** Forget everything (tests). */
export function resetLutrisPlaytime(): void {
    cache.clear();
    logged = false;
}

/** Lutris's play time for a Lutris game; null when the backend or the game is missing or errors. Cached 60 s. */
export function lutrisPlaytime(ref: LutrisRef, deps: LutrisPlaytimeDeps = {}): Promise<UnifideckPlaytime | null> {
    const now = (deps.now ?? Date.now)();
    const id = `${ref.gameId}:${ref.flatpak}`;
    const hit = cache.get(id);
    if (hit && now - hit.at < TTL_MS) return hit.value;
    const call = deps.call ?? getPlaytime;
    const value = (async () => {
        try {
            return parseLutrisPlaytime(await call(ref.gameId, ref.flatpak));
        } catch (error) {
            if (!logged) {
                logged = true;
                console.warn(`${LOG_PREFIX} Lutris play time unavailable`, error);
            }
            return null;
        }
    })();
    cache.set(id, { at: now, value });
    return value;
}
