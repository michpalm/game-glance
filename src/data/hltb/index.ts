import { fetchNoCors } from '@decky/api';
import { cleanTitle } from '../../logic/names';
import { HltbTimes } from '../../logic/progress';
import { HLTBGameStats } from '../../vendor/hltb-for-deck/hooks/GameInfoData';
import { fetchHltbGameStats } from '../../vendor/hltb-for-deck/hooks/HltbApi';
import { attempt } from '../attempt';
import { Cache, cache, Overrides, overrides, TTL } from '../cache';

export type HltbResult =
    | { status: 'found'; gameId: number; times: HltbTimes }
    | { status: 'notFound'; overrideId?: number }
    | { status: 'unavailable' };

export interface HltbGame {
    appId: number;
    name: string;
    isShortcut: boolean;
}

export interface HltbDeps {
    fetchStats(name: string, appId?: number, hltbGameId?: number): Promise<HLTBGameStats | null>;
    isReachable(): Promise<boolean>;
    cache: Cache;
    overrides: Pick<Overrides, 'get'>;
    now?: () => number;
}

export function parseStat(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const n = Number.parseFloat(value);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function toFound(stats: HLTBGameStats): HltbResult {
    return {
        status: 'found',
        gameId: stats.gameId,
        times: {
            main: parseStat(stats.mainStat),
            mainExtras: parseStat(stats.mainPlusStat),
            completionist: parseStat(stats.completeStat),
        },
    };
}

export type PrefetchOutcome = { status: HltbResult['status']; fetched: boolean };

type Found = Extract<HltbResult, { status: 'found' }>;
type Stored = HltbResult & { fetchedAt?: number }; // fetchedAt: when found times were fetched (missing in old entries)

function strip(stored: Stored): HltbResult {
    const { fetchedAt: _fetchedAt, ...result } = stored;
    return result as HltbResult;
}

/**
 * Found times are kept and shown however old; after TTL.hltbRefresh they are refreshed in the background
 * (old times stay if the refresh fails). "No match" expires after TTL.hltbNotFound; "unavailable" is never cached.
 */
export function createHltbLookup(deps: HltbDeps) {
    const now = deps.now ?? Date.now;
    const inflight = new Map<string, Promise<HltbResult>>();

    async function read(game: HltbGame) {
        const overrideId = await attempt('override read', () => deps.overrides.get(game.appId), null);
        const key = `hltb:${game.appId}:${overrideId ?? 'auto'}`;
        const cached = await attempt('cache read', () => deps.cache.get<Stored>(key), null);
        const usable = cached && (cached.status === 'found' || cached.status === 'notFound') ? cached : null;
        const stale = usable?.status === 'found' && now() - (usable.fetchedAt ?? 0) >= TTL.hltbRefresh;
        return { overrideId, key, cached: usable, stale };
    }

    async function fetchFresh(game: HltbGame, overrideId: number | null, key: string, previous: Found | null): Promise<HltbResult> {
        const steamAppId = game.isShortcut ? undefined : game.appId;
        let stats: HLTBGameStats | null;
        if (overrideId !== null) {
            stats = await deps.fetchStats(game.name, steamAppId, overrideId);
        } else {
            stats = await deps.fetchStats(game.name, steamAppId);
            const cleaned = cleanTitle(game.name);
            if (!stats && cleaned !== game.name) {
                stats = await deps.fetchStats(cleaned, steamAppId);
            }
        }

        if (stats) {
            const found = toFound(stats);
            await attempt('cache write', () => deps.cache.put<Stored>(key, { ...found, fetchedAt: now() }, TTL.hltbFound), undefined);
            return found;
        }
        const reachable = await deps.isReachable();
        if (previous) return reachable ? previous : { status: 'unavailable' }; // keep the old times either way
        if (reachable) {
            const notFound: HltbResult = overrideId !== null ? { status: 'notFound', overrideId } : { status: 'notFound' };
            await attempt('cache write', () => deps.cache.put(key, notFound, TTL.hltbNotFound), undefined);
            return notFound;
        }
        return { status: 'unavailable' };
    }

    /** One fetch per game at a time, however many pages or prefetches ask for it. */
    function refresh(game: HltbGame, overrideId: number | null, key: string, previous: Found | null): Promise<HltbResult> {
        let pending = inflight.get(key);
        if (!pending) {
            pending = fetchFresh(game, overrideId, key, previous).finally(() => inflight.delete(key));
            inflight.set(key, pending);
        }
        return pending;
    }

    async function lookup(game: HltbGame): Promise<HltbResult> {
        const { overrideId, key, cached, stale } = await read(game);
        if (cached) {
            if (stale) refresh(game, overrideId, key, strip(cached) as Found).catch(() => undefined);
            return strip(cached);
        }
        return refresh(game, overrideId, key, null);
    }

    /** For "fetch all": skips fresh results, otherwise fetches (or refreshes) and waits for it. */
    async function prefetch(game: HltbGame): Promise<PrefetchOutcome> {
        const { overrideId, key, cached, stale } = await read(game);
        if (cached && !stale) return { status: cached.status, fetched: false };
        const previous = cached ? (strip(cached) as Found) : null;
        const result = await refresh(game, overrideId, key, previous);
        return { status: result.status, fetched: true };
    }

    return Object.assign(lookup, { prefetch });
}

async function isHltbReachable(): Promise<boolean> {
    try {
        const response = await fetchNoCors('https://howlongtobeat.com/', { method: 'GET' });
        return response.status > 0 && response.status < 500;
    } catch {
        return false;
    }
}

export const lookupHltb = createHltbLookup({
    fetchStats: fetchHltbGameStats,
    isReachable: isHltbReachable,
    cache,
    overrides,
});
