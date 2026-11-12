import { fetchNoCors } from '@decky/api';
import { attempt } from './attempt';
import { Cache, cache, DAY_MS } from './cache';
import { withTimeout } from './hltb';

/** How many people are playing a Steam game now (Steam's GetNumberOfCurrentPlayers). */
export type PlayerCount = { status: 'found'; count: number } | { status: 'none' } | { status: 'unavailable' };

type Stored = Exclude<PlayerCount, { status: 'unavailable' }> & { fetchedAt: number };

/** Home asks again after 5 minutes; the game page after 1, then every 5 while it stays open (PlayCount's own interval). */
export const PLAYERS_HOME_MAX_AGE_MS = 5 * 60_000;
export const PLAYERS_PAGE_MAX_AGE_MS = 60_000;
export const PLAYERS_POLL_MS = 5 * 60_000;
/** Kept a day: an old count still shows at once, then is refreshed. */
const KEEP_MS = DAY_MS;
/** Decky's proxy has no time limit of its own: a request that never answers reads as unavailable. */
export const PLAYERS_TIMEOUT_MS = 15_000;

export function playersUrl(appId: number): string {
    return `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`;
}

export function playersCacheKey(appId: number): string {
    return `players:${appId}`;
}

/** The count from Steam's answer, 0 included; null for any other shape (result 42: Steam has no count for the app). */
export function parsePlayers(body: unknown): number | null {
    const response = (body as { response?: { result?: unknown; player_count?: unknown } } | null)?.response;
    const n = response?.player_count;
    return response?.result === 1 && typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : null;
}

export interface PlayerCountDeps {
    fetcher(url: string): Promise<{ status: number; json(): Promise<unknown> }>;
    cache: Cache;
    now?: () => number;
    timeoutMs?: number;
}

const strip = ({ fetchedAt: _fetchedAt, ...result }: Stored): PlayerCount => result as PlayerCount;

/**
 * A Steam game's current player count, cached. A known count is returned at once and, when older than the caller's
 * `maxAgeMs`, refreshed in the background; a failed request is never cached and never replaces a known count.
 */
export function createPlayerCountLookup(deps: PlayerCountDeps) {
    const now = deps.now ?? Date.now;
    const limit = deps.timeoutMs ?? PLAYERS_TIMEOUT_MS;
    const inflight = new Map<number, Promise<PlayerCount>>();

    async function ask(appId: number): Promise<PlayerCount> {
        try {
            const response = await deps.fetcher(playersUrl(appId));
            if (response.status !== 200) return { status: 'unavailable' };
            const count = parsePlayers(await response.json());
            return count === null ? { status: 'none' } : { status: 'found', count };
        } catch {
            return { status: 'unavailable' };
        }
    }

    function refresh(appId: number, previous: PlayerCount | null): Promise<PlayerCount> {
        let pending = inflight.get(appId);
        if (!pending) {
            pending = withTimeout<PlayerCount>(ask(appId), limit, { status: 'unavailable' })
                .then(async (result) => {
                    if (result.status === 'unavailable') return previous ?? result;
                    await attempt('cache write', () => deps.cache.put<Stored>(playersCacheKey(appId), { ...result, fetchedAt: now() }, KEEP_MS), undefined);
                    return result;
                })
                .finally(() => inflight.delete(appId));
            inflight.set(appId, pending);
        }
        return pending;
    }

    async function read(appId: number, maxAgeMs: number): Promise<{ known: PlayerCount | null; due: boolean }> {
        const cached = await attempt('cache read', () => deps.cache.get<Stored>(playersCacheKey(appId)), null);
        if (!cached || (cached.status !== 'found' && cached.status !== 'none')) return { known: null, due: true };
        return { known: strip(cached), due: now() - (cached.fetchedAt ?? 0) >= maxAgeMs };
    }

    async function lookup(appId: number, maxAgeMs: number): Promise<PlayerCount> {
        const { known, due } = await read(appId, maxAgeMs);
        if (!known) return refresh(appId, null);
        if (due) refresh(appId, known).catch(() => undefined);
        return known;
    }

    /** The cached answer only (however old), never online: null when nothing is cached. */
    async function cachedOnly(appId: number): Promise<PlayerCount | null> {
        return (await read(appId, Infinity)).known;
    }

    /** For the warm-up: goes online, and waits, only when nothing is cached or the answer is older than `maxAgeMs`. */
    async function prefetch(appId: number, maxAgeMs: number): Promise<{ status: PlayerCount['status']; fetched: boolean }> {
        const { known, due } = await read(appId, maxAgeMs);
        if (known && !due) return { status: known.status, fetched: false };
        const result = await refresh(appId, known);
        return { status: result === known && known !== null ? 'unavailable' : result.status, fetched: true };
    }

    return Object.assign(lookup, { cachedOnly, prefetch });
}

export const lookupPlayers = createPlayerCountLookup({ fetcher: (url) => fetchNoCors(url), cache });
