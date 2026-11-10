import { describe, expect, it, vi } from 'vitest';
import { createCache, DAY_MS } from '../../src/data/cache';
import { memoryKv } from '../../src/data/kv';
import { createProtonLookup, parseTier, PROTON_RECHECK_MS, PROTON_REFRESH_MS, protonCacheKey, protonUrl } from '../../src/data/protondb';

const answer = (status: number, body: unknown = {}) => ({ status, json: async () => body });
const SUMMARY = { bestReportedTier: 'platinum', confidence: 'strong', score: 0.9, tier: 'gold', total: 289, trendingTier: 'platinum' };

function setup(fetcher: ReturnType<typeof vi.fn>, clock = { now: 1_000_000 }) {
    const cache = createCache(memoryKv(), () => clock.now);
    const lookup = createProtonLookup({ fetcher, cache, now: () => clock.now, timeoutMs: 50 });
    return { lookup, cache, clock };
}

describe('parseTier', () => {
    it("keeps ProtonDB's five ratings and drops everything else (pending, junk)", () => {
        for (const tier of ['platinum', 'gold', 'silver', 'bronze', 'borked']) expect(parseTier(tier)).toBe(tier);
        expect(parseTier('Gold')).toBe('gold');
        expect(parseTier('pending')).toBeNull();
        expect(parseTier(undefined)).toBeNull();
        expect(parseTier(3)).toBeNull();
    });
});

describe('createProtonLookup', () => {
    it("asks ProtonDB's summary for the app and returns its tier (the overall one, not the trend)", async () => {
        const fetcher = vi.fn(async () => answer(200, SUMMARY));
        const { lookup } = setup(fetcher);
        expect(await lookup(504230)).toMatchObject({ status: 'found', tier: 'gold' });
        expect(fetcher).toHaveBeenCalledWith(protonUrl(504230));
        expect(protonUrl(504230)).toBe('https://www.protondb.com/api/v1/reports/summaries/504230.json');
    });
    it("keeps the summary's report details (count, confidence, trending and best tiers)", async () => {
        const fetcher = vi.fn(async () => answer(200, { tier: 'platinum', total: 237, confidence: 'strong', trendingTier: 'platinum', bestReportedTier: 'platinum' }));
        const { lookup } = setup(fetcher);
        expect(await lookup(10)).toEqual({ status: 'found', tier: 'platinum', details: { total: 237, confidence: 'strong', trending: 'platinum', best: 'platinum' } });
    });
    it('a cached rating from before the details existed is returned as found and refreshed behind', async () => {
        const fetcher = vi.fn(async () => answer(200, SUMMARY));
        const { lookup, cache } = setup(fetcher);
        await cache.put(protonCacheKey(11), { status: 'found', tier: 'gold', fetchedAt: 1_000_000 }, 3650 * DAY_MS);
        expect(await lookup(11)).toEqual({ status: 'found', tier: 'gold' });
        await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
        await vi.waitFor(async () => expect(await lookup(11)).toMatchObject({ details: { total: 289, confidence: 'strong', trending: 'platinum', best: 'platinum' } }));
    });
    it('caches a rating: the second lookup does not go online', async () => {
        const fetcher = vi.fn(async () => answer(200, SUMMARY));
        const { lookup, cache } = setup(fetcher);
        await lookup(504230);
        expect(await lookup(504230)).toMatchObject({ status: 'found', tier: 'gold' });
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(await cache.get(protonCacheKey(504230))).toMatchObject({ status: 'found', tier: 'gold' });
    });
    it('no reports (404) and a pending rating are "none", remembered for a day', async () => {
        const fetcher = vi.fn(async () => answer(404));
        const { lookup, clock } = setup(fetcher);
        expect(await lookup(1)).toEqual({ status: 'none' });
        expect(await lookup(1)).toEqual({ status: 'none' });
        expect(fetcher).toHaveBeenCalledTimes(1);
        clock.now += PROTON_RECHECK_MS + 1;
        fetcher.mockResolvedValueOnce(answer(200, SUMMARY));
        expect(await lookup(1)).toEqual({ status: 'none' }); // shown at once, rechecked behind
        await vi.waitFor(async () => expect(await lookup(1)).toMatchObject({ status: 'found', tier: 'gold' }));
        const pending = setup(vi.fn(async () => answer(200, { ...SUMMARY, tier: 'pending' })));
        expect(await pending.lookup(2)).toEqual({ status: 'none' });
    });
    it('a failed request is "unavailable" and never cached', async () => {
        for (const fetcher of [vi.fn(async () => answer(503)), vi.fn(async () => { throw new Error('offline'); }), vi.fn(() => new Promise(() => undefined))]) {
            const { lookup, cache } = setup(fetcher as ReturnType<typeof vi.fn>);
            expect(await lookup(7)).toEqual({ status: 'unavailable' });
            expect(await cache.get(protonCacheKey(7))).toBeNull();
        }
    });
    it('an old rating is shown at once and refreshed behind; a failed refresh keeps it', async () => {
        const fetcher = vi.fn(async () => answer(200, SUMMARY));
        const { lookup, clock } = setup(fetcher);
        await lookup(9);
        clock.now += PROTON_REFRESH_MS + 1;
        fetcher.mockResolvedValueOnce(answer(503));
        expect(await lookup(9)).toMatchObject({ status: 'found', tier: 'gold' });
        await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
        fetcher.mockResolvedValueOnce(answer(200, { ...SUMMARY, tier: 'silver' }));
        expect(await lookup(9)).toMatchObject({ status: 'found', tier: 'gold' });
        await vi.waitFor(async () => expect(await lookup(9)).toMatchObject({ status: 'found', tier: 'silver' }));
        expect(PROTON_REFRESH_MS).toBe(7 * DAY_MS);
    });
    it('one request per game at a time', async () => {
        const fetcher = vi.fn(async () => answer(200, SUMMARY));
        const { lookup } = setup(fetcher);
        await Promise.all([lookup(5), lookup(5), lookup(5)]);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
});
