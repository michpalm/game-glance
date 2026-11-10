import { fetchNoCors } from '@decky/api';
import { attempt } from './attempt';
import { Cache, cache, DAY_MS } from './cache';
import { withTimeout } from './hltb';
import { parseTier, ProtonTier } from '../logic/protonTier';

export { parseTier, PROTON_COLOURS, PROTON_TIERS } from '../logic/protonTier';
export type { ProtonTier } from '../logic/protonTier';

/** What ProtonDB's summary says besides the rating: how many reports, how sure, and the trending and best tiers. */
export interface ProtonDetails {
    total: number;
    confidence: string;
    trending: ProtonTier | null;
    best: ProtonTier | null;
}

export type ProtonResult =
    | { status: 'found'; tier: ProtonTier; details?: ProtonDetails } // no details: an entry cached before they were kept
    | { status: 'none' } // ProtonDB has no rating for the game (no reports, or still pending)
    | { status: 'unavailable' };

type Stored = Exclude<ProtonResult, { status: 'unavailable' }> & { fetchedAt: number };

/** A rating is refreshed behind the scenes after a week; "no rating" is asked again after a day. */
export const PROTON_REFRESH_MS = 7 * DAY_MS;
export const PROTON_RECHECK_MS = DAY_MS;
/** Kept however old (shown at once, then refreshed), as HowLongToBeat's times are. */
const KEEP_MS = 3650 * DAY_MS;
/** Decky's proxy has no time limit of its own (see HLTB_TIMEOUT_MS): a request that never answers reads as unavailable. */
export const PROTON_TIMEOUT_MS = 15_000;

export function protonUrl(appId: number): string {
    return `https://www.protondb.com/api/v1/reports/summaries/${appId}.json`;
}

export function protonCacheKey(appId: number): string {
    return `protondb:${appId}`;
}

export interface ProtonDeps {
    fetcher(url: string): Promise<{ status: number; json(): Promise<unknown> }>;
    cache: Cache;
    now?: () => number;
    timeoutMs?: number;
}

const strip = ({ fetchedAt: _fetchedAt, ...result }: Stored): ProtonResult => result;

/**
 * A Steam game's ProtonDB rating by its app id (ProtonDB knows no other games). Cached: a known answer is returned at
 * once and, when old, refreshed in the background; a failed request is never cached and never replaces a known rating.
 */
export function createProtonLookup(deps: ProtonDeps) {
    const now = deps.now ?? Date.now;
    const limit = deps.timeoutMs ?? PROTON_TIMEOUT_MS;
    const inflight = new Map<number, Promise<ProtonResult>>();

    async function ask(appId: number): Promise<ProtonResult> {
        try {
            const response = await deps.fetcher(protonUrl(appId));
            if (response.status === 404) return { status: 'none' }; // ProtonDB's answer for a game with no reports
            if (response.status !== 200) return { status: 'unavailable' };
            const body = (await response.json()) as { tier?: unknown; total?: unknown; confidence?: unknown; trendingTier?: unknown; bestReportedTier?: unknown } | null;
            const tier = parseTier(body?.tier);
            if (!tier) return { status: 'none' };
            const details: ProtonDetails | undefined =
                typeof body?.total === 'number' && typeof body.confidence === 'string'
                    ? { total: body.total, confidence: body.confidence, trending: parseTier(body.trendingTier), best: parseTier(body.bestReportedTier) }
                    : undefined;
            return details ? { status: 'found', tier, details } : { status: 'found', tier };
        } catch {
            return { status: 'unavailable' };
        }
    }

    function refresh(appId: number, previous: ProtonResult | null): Promise<ProtonResult> {
        let pending = inflight.get(appId);
        if (!pending) {
            pending = withTimeout<ProtonResult>(ask(appId), limit, { status: 'unavailable' })
                .then(async (result) => {
                    if (result.status === 'unavailable') return previous ?? result;
                    await attempt('cache write', () => deps.cache.put<Stored>(protonCacheKey(appId), { ...result, fetchedAt: now() }, KEEP_MS), undefined);
                    return result;
                })
                .finally(() => inflight.delete(appId));
            inflight.set(appId, pending);
        }
        return pending;
    }

    return async function lookup(appId: number): Promise<ProtonResult> {
        const cached = await attempt('cache read', () => deps.cache.get<Stored>(protonCacheKey(appId)), null);
        if (!cached || (cached.status !== 'found' && cached.status !== 'none')) return refresh(appId, null);
        const known = strip(cached);
        const age = now() - (cached.fetchedAt ?? 0);
        const outdated = age >= (cached.status === 'found' ? PROTON_REFRESH_MS : PROTON_RECHECK_MS);
        const lacksDetails = cached.status === 'found' && !cached.details; // cached before the details were kept: fetch them behind
        if (outdated || lacksDetails) refresh(appId, known).catch(() => undefined);
        return known;
    };
}

export const lookupProton = createProtonLookup({ fetcher: (url) => fetchNoCors(url), cache });
