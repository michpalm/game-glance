import { fetchNoCors } from '@decky/api';
import { cleanTitle } from '../../logic/names';
import { HltbTimes } from '../../logic/progress';
import { HLTBGameStats } from '../../vendor/hltb-for-deck/hooks/GameInfoData';
import { fetchHltbGameStats } from '../../vendor/hltb-for-deck/hooks/HltbApi';
import { attempt } from '../attempt';
import { Cache, cache, Overrides, overrides, TTL } from '../cache';

export type HltbResult =
    // rating: HowLongToBeat's players' rating in percent (null: none); absent in an entry cached before it was kept.
    | { status: 'found'; gameId: number; times: HltbTimes; rating?: number | null }
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
    /** How long one lookup (HowLongToBeat's search, or the reachability check) may take; HLTB_TIMEOUT_MS by default. */
    timeoutMs?: number;
}

/**
 * A HowLongToBeat lookup normally answers within a second or two. A request that never answers (Decky's proxy has no
 * time limit; seen on the Ally after a network blip) left the game page's card waiting and the pre-load stuck, so a
 * lookup gives up after this long: unavailable, nothing cached, a game's earlier times kept, and asked again next time.
 */
export const HLTB_TIMEOUT_MS = 20_000;

/** `promise`, or `fallback` once `ms` have passed without an answer. */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
    });
    return Promise.race([promise, late]).finally(() => clearTimeout(timer));
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
        rating: typeof stats.reviewScore === 'number' && stats.reviewScore > 0 ? stats.reviewScore : null,
    };
}

/** Where a game's HLTB result is cached (also read directly by Spotlight Home's Play next). */
export function hltbCacheKey(appId: number, overrideId: number | null): string {
    return `hltb:${appId}:${overrideId ?? 'auto'}`;
}

export type PrefetchOutcome = { status: HltbResult['status']; fetched: boolean };

type Found = Extract<HltbResult, { status: 'found' }>;
type Stored = HltbResult & { fetchedAt?: number }; // fetchedAt: when found times or "no match" were fetched (missing in old entries)

/** The cached times a refresh keeps if it fails: only found ones ("no match" has none to keep). */
function foundOrNull(stored: Stored | null): Found | null {
    return stored?.status === 'found' ? (strip(stored) as Found) : null;
}

function strip(stored: Stored): HltbResult {
    const { fetchedAt: _fetchedAt, ...result } = stored;
    return result as HltbResult;
}

/**
 * Found times are kept and shown however old; after TTL.hltbRefresh they are refreshed in the background
 * (old times stay if the refresh fails). "No match" is kept and shown at once too; after TTL.hltbRecheck it is checked
 * again in the background, and a match found then is cached and shown the next time the game's page loads ("no match"
 * stays when HowLongToBeat can't be reached). "Unavailable" is never cached.
 */
export function createHltbLookup(deps: HltbDeps) {
    const now = deps.now ?? Date.now;
    const inflight = new Map<string, Promise<HltbResult>>();
    /** Keys refetched for a missing rating this session: a refetch that fails is not repeated on every page visit. */
    const askedRating = new Set<string>();

    async function read(game: HltbGame) {
        const overrideId = await attempt('override read', () => deps.overrides.get(game.appId), null);
        const key = hltbCacheKey(game.appId, overrideId);
        const cached = await attempt('cache read', () => deps.cache.get<Stored>(key), null);
        const usable = cached && (cached.status === 'found' || cached.status === 'notFound') ? cached : null;
        const age = usable ? now() - (usable.fetchedAt ?? 0) : 0;
        const stale = usable !== null && age >= (usable.status === 'found' ? TTL.hltbRefresh : TTL.hltbRecheck);
        return { overrideId, key, cached: usable, stale };
    }

    const limit = deps.timeoutMs ?? HLTB_TIMEOUT_MS;

    /** fetchSearch within the time limit: no answer reads as unavailable, keeping a game's earlier times. */
    function fetchFresh(game: HltbGame, overrideId: number | null, key: string, previous: Found | null): Promise<HltbResult> {
        return withTimeout(fetchSearch(game, overrideId, key, previous), limit, previous ?? { status: 'unavailable' });
    }

    async function fetchSearch(game: HltbGame, overrideId: number | null, key: string, previous: Found | null): Promise<HltbResult> {
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
        const reachable = await withTimeout(deps.isReachable(), limit, false);
        if (previous) return reachable ? previous : { status: 'unavailable' }; // keep the old times either way
        if (reachable) {
            const notFound: HltbResult = overrideId !== null ? { status: 'notFound', overrideId } : { status: 'notFound' };
            await attempt('cache write', () => deps.cache.put<Stored>(key, { ...notFound, fetchedAt: now() }, TTL.hltbNotFound), undefined);
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
            // Found times cached before the rating was kept are fetched again behind, once, when a page asks (not by
            // "fetch all" or the pre-load, which would refetch the whole library at once).
            const lacksRating = cached.status === 'found' && !('rating' in cached) && !askedRating.has(key);
            if (lacksRating) askedRating.add(key);
            if (stale || lacksRating) refresh(game, overrideId, key, foundOrNull(cached)).catch(() => undefined);
            return strip(cached);
        }
        return refresh(game, overrideId, key, null);
    }

    /** For "fetch all": skips fresh results, otherwise fetches (or refreshes) and waits for it. */
    async function prefetch(game: HltbGame): Promise<PrefetchOutcome> {
        const { overrideId, key, cached, stale } = await read(game);
        if (cached && !stale) return { status: cached.status, fetched: false };
        const previous = foundOrNull(cached);
        const result = await refresh(game, overrideId, key, previous);
        return { status: result.status, fetched: true };
    }

    /** The cached result only (fresh or stale), never online: null when nothing usable is cached. */
    async function cachedOnly(game: HltbGame): Promise<HltbResult | null> {
        const { cached } = await read(game);
        return cached ? strip(cached) : null;
    }

    return Object.assign(lookup, { prefetch, cachedOnly });
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
