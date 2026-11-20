import { fetchNoCors } from '@decky/api';
import { attempt } from './attempt';
import { Cache, cache, DAY_MS } from './cache';
import { withTimeout } from './hltb';
import { parseTier, ProtonTier } from '../logic/protonTier';

export { parseTier, PROTON_COLOURS, PROTON_TIERS } from '../logic/protonTier';
export type { ProtonTier } from '../logic/protonTier';

/** What ProtonDB's summary says besides the rating: how many reports, how sure, and the trending and best tiers (null: not in the summary). */
export interface ProtonDetails {
    total: number | null;
    confidence: string | null;
    trending: ProtonTier | null;
    best: ProtonTier | null;
}

export type ProtonResult =
    | { status: 'found'; tier: ProtonTier; details?: ProtonDetails } // no details: an entry cached before they were kept (a fetch always writes them)
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
            // Always kept, with what the summary has: a found result without details is fetched again (lacksDetails).
            const details: ProtonDetails = {
                total: typeof body?.total === 'number' ? body.total : null,
                confidence: typeof body?.confidence === 'string' ? body.confidence : null,
                trending: parseTier(body?.trendingTier),
                best: parseTier(body?.bestReportedTier),
            };
            return { status: 'found', tier, details };
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

    /** The cached answer, and whether it is due to be asked again (old, or cached before the details were kept). */
    async function read(appId: number): Promise<{ known: ProtonResult | null; due: boolean }> {
        const cached = await attempt('cache read', () => deps.cache.get<Stored>(protonCacheKey(appId)), null);
        if (!cached || (cached.status !== 'found' && cached.status !== 'none')) return { known: null, due: true };
        const age = now() - (cached.fetchedAt ?? 0);
        const outdated = age >= (cached.status === 'found' ? PROTON_REFRESH_MS : PROTON_RECHECK_MS);
        const lacksDetails = cached.status === 'found' && !cached.details; // cached before the details were kept: fetch them behind
        return { known: strip(cached), due: outdated || lacksDetails };
    }

    async function lookup(appId: number): Promise<ProtonResult> {
        const { known, due } = await read(appId);
        if (!known) return refresh(appId, null);
        if (due) refresh(appId, known).catch(() => undefined);
        return known;
    }

    /** The cached answer only (however old), never online: null when nothing is cached. For Home's warm-up. */
    async function cachedOnly(appId: number): Promise<ProtonResult | null> {
        return (await read(appId)).known;
    }

    /**
     * For the pre-loads: asks ProtonDB, and waits for it, only when nothing is cached or the answer is due; `fetched` says
     * whether it went online (so a run can pause after it). An unreachable ProtonDB reads as unavailable.
     */
    async function prefetch(appId: number): Promise<{ status: ProtonResult['status']; fetched: boolean }> {
        const { known, due } = await read(appId);
        if (known && !due) return { status: known.status, fetched: false };
        const result = await refresh(appId, known);
        // A refresh that failed returns the known answer: it still went online, and ProtonDB did not answer.
        return { status: result === known && known !== null ? 'unavailable' : result.status, fetched: true };
    }

    return Object.assign(lookup, { cachedOnly, prefetch });
}

export const lookupProton = createProtonLookup({ fetcher: (url) => fetchNoCors(url), cache });
