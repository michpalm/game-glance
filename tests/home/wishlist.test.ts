import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Cache } from '../../src/data/cache';
import { getWishlistDeals, parseDeals, parseWishlist, topDeals, WISHLIST_CHUNK, wishlistChunks } from '../../src/home/wishlist';
import prices from './fixtures/prices.json';
import wishlist from './fixtures/wishlist.json';

function fakeCache(initial: Record<string, unknown> = {}): Cache & { store: Record<string, unknown> } {
    const store = { ...initial };
    return {
        store,
        get: async <T>(k: string) => (k in store ? (store[k] as T) : null),
        put: async (k: string, v: unknown) => { store[k] = v; },
        clear: async () => {},
    };
}

type Resp = { status: number; json(): Promise<unknown> };
const ok = (body: unknown): Resp => ({ status: 200, json: async () => body });

interface Opts {
    wishlist?: Resp | (() => Promise<Resp>);
    prices?: Resp | (() => Promise<Resp>);
    deck?: (id: number) => Resp | Promise<Resp>;
}

function makeFetcher(o: Opts = {}) {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
        calls.push(url);
        const run = async (r: Resp | (() => Promise<Resp>)) => (typeof r === 'function' ? r() : r);
        if (url.includes('GetWishlist')) return run(o.wishlist ?? ok(wishlist));
        if (url.includes('ajaxgetdeckappcompatibilityreport')) {
            const id = Number(new URL(url).searchParams.get('nAppID'));
            return o.deck ? o.deck(id) : ok({ success: 1, results: { resolved_category: 2 } });
        }
        // price call: ids csv, filters=price_overview only; name call: single id with basic
        if (url.includes('filters=price_overview') && !url.includes('basic')) {
            if (o.prices) return run(o.prices);
            const ids = new URL(url).searchParams.get('appids')!.split(',');
            return ok(Object.fromEntries(ids.map((id) => {
                const e = (prices as Record<string, any>)[id];
                return [id, e ? { success: e.success, data: Array.isArray(e.data) ? e.data : { price_overview: e.data.price_overview } } : { success: false }];
            })));
        }
        const id = new URL(url).searchParams.get('appids')!;
        const e = (prices as Record<string, any>)[id];
        return ok({ [id]: { success: true, data: { name: e?.data?.name } } });
    });
    return { fetcher: fetcher as any, calls };
}

const NOW = 1_000_000;
const deps = (f: any, cache: Cache) => ({ cache, fetcher: f, now: () => NOW });

afterEach(() => { vi.useRealTimers(); });

describe('parseWishlist', () => {
    it('reads app ids and tolerates garbage', () => {
        expect(parseWishlist(wishlist)).toEqual([1001, 1002, 1003]);
        expect(parseWishlist(null)).toEqual([]);
        expect(parseWishlist('x')).toEqual([]);
        expect(parseWishlist({ response: {} })).toEqual([]);
        expect(parseWishlist({ response: { items: [{ appid: 'a' }, null, { appid: 5 }, { appid: -1 }] } })).toEqual([5]);
    });
});

describe('parseDeals', () => {
    it('keeps only discounted apps with name and percent', () => {
        expect(parseDeals(prices)).toEqual([{ appId: 1001, name: 'Sale Game', discountPercent: 50, deckVerified: false, price: '$29.99', fullPrice: '$59.99' }]);
        expect(parseDeals({ 7: { success: true, data: { price_overview: { discount_percent: 20 } } } })).toEqual([]);
        expect(parseDeals(undefined)).toEqual([]);
        expect(parseDeals([1])).toEqual([]);
    });
});

describe('wishlistChunks and topDeals', () => {
    it('chunks by size, capped at 10 chunks', () => {
        expect(wishlistChunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
        expect(wishlistChunks([], 100)).toEqual([]);
        expect(wishlistChunks(Array.from({ length: 2000 }, (_, i) => i + 1))).toHaveLength(10);
    });
    it('sorts by discount, ties in wishlist order, and caps the count', () => {
        const d = (appId: number, discountPercent: number) => ({ appId, name: String(appId), discountPercent, deckVerified: false });
        expect(topDeals([d(1, 20), d(2, 50), d(3, 20), d(4, 50), d(5, 10)]).map((x) => x.appId)).toEqual([2, 4, 1, 3, 5]);
        expect(topDeals(Array.from({ length: 9 }, (_, i) => d(i + 1, 10 + i)))).toHaveLength(6);
        expect(topDeals([d(1, 20)], 0)).toEqual([]);
    });
});

describe('getWishlistDeals', () => {
    it('returns cached deals without fetching', async () => {
        const deals = [{ appId: 1, name: 'A', discountPercent: 10, deckVerified: true }];
        const { fetcher } = makeFetcher();
        const cache = fakeCache();
        await cache.put('wishlist:deals2:76561190000000000', deals, 1);
        const out = await getWishlistDeals('76561190000000000', deps(fetcher, cache));
        expect(out).toEqual(deals);
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('fetches, marks deals, and caches them', async () => {
        const { fetcher } = makeFetcher();
        const cache = fakeCache();
        const out = await getWishlistDeals('s1', deps(fetcher, cache));
        expect(out).toEqual([{ appId: 1001, name: 'Sale Game', discountPercent: 50, deckVerified: false, price: '$29.99', fullPrice: '$59.99' }]);
        expect(Object.keys(cache.store)).toHaveLength(1);
    });

    it('returns [] when the wishlist is private, empty, non-200, malformed or the fetch throws', async () => {
        const cases: Opts['wishlist'][] = [
            { status: 404, json: async () => ({}) },
            { status: 400, json: async () => ({}) },
            { status: 500, json: async () => wishlist },
            { status: 200, json: async () => { throw new Error('bad json'); } },
            ok('garbage'),
            async () => { throw new Error('offline'); },
        ];
        for (const w of cases) {
            const { fetcher } = makeFetcher({ wishlist: w });
            const cache = fakeCache();
            await expect(getWishlistDeals('s1', deps(fetcher, cache))).resolves.toEqual([]);
            expect(Object.keys(cache.store)).toHaveLength(0);
        }
    });

    it('returns [] for a private or empty wishlist', async () => {
        for (const w of [ok({ response: {} }), ok({ response: { items: [] } })]) {
            const { fetcher } = makeFetcher({ wishlist: w });
            await expect(getWishlistDeals('s1', deps(fetcher, fakeCache()))).resolves.toEqual([]);
        }
    });

    it('returns [] when the price lookup fails', async () => {
        for (const p of [{ status: 400, json: async () => null }, ok(null), async () => { throw new Error('x'); }]) {
            const { fetcher } = makeFetcher({ prices: p as any });
            await expect(getWishlistDeals('s1', deps(fetcher, fakeCache()))).resolves.toEqual([]);
        }
    });

    it('never rejects when the cache throws', async () => {
        const { fetcher } = makeFetcher();
        const bad: Cache = { get: async () => { throw new Error('kv'); }, put: async () => { throw new Error('kv'); }, clear: async () => {} };
        await expect(getWishlistDeals('s1', deps(fetcher, bad))).resolves.toHaveLength(1);
    });

    it('marks deck verified from the report and treats a failed report as not verified', async () => {
        const verified = makeFetcher({ deck: () => ok({ success: 1, results: { resolved_category: 3 } }) });
        expect((await getWishlistDeals('s1', deps(verified.fetcher, fakeCache())))[0].deckVerified).toBe(true);
        for (const deck of [
            () => ({ status: 500, json: async () => ({}) }),
            () => { throw new Error('offline'); },
            () => ok({ success: 1 }),
            () => ok(null),
        ]) {
            const f = makeFetcher({ deck: deck as any });
            const out = await getWishlistDeals('s1', deps(f.fetcher, fakeCache()));
            expect(out[0].deckVerified).toBe(false);
        }
    });

    it('prices the whole wishlist in chunks of 100 (123 apps -> 100 + 23)', async () => {
        const items = Array.from({ length: 123 }, (_, i) => ({ appid: 2000 + i }));
        const { fetcher, calls } = makeFetcher({ wishlist: ok({ response: { items } }) });
        await getWishlistDeals('s1', deps(fetcher, fakeCache()));
        const chunks = calls.filter((u) => u.includes('filters=price_overview')).map((u) => new URL(u).searchParams.get('appids')!.split(',').map(Number));
        expect(chunks.map((c) => c.length)).toEqual([100, 23]);
        expect(chunks.flat()).toEqual(items.map((i) => i.appid));
        expect(WISHLIST_CHUNK).toBe(100);
    });

    it('chunk boundaries: exactly 100 is one request, 101 is two', async () => {
        for (const [n, sizes] of [[100, [100]], [101, [100, 1]], [1, [1]]] as const) {
            const items = Array.from({ length: n }, (_, i) => ({ appid: 3000 + i }));
            const { fetcher, calls } = makeFetcher({ wishlist: ok({ response: { items } }) });
            await getWishlistDeals('s1', deps(fetcher, fakeCache()));
            const chunks = calls.filter((u) => u.includes('filters=price_overview')).map((u) => new URL(u).searchParams.get('appids')!.split(','));
            expect(chunks.map((c) => c.length)).toEqual(sizes);
        }
    });

    it('bounds the work for a huge wishlist', async () => {
        const items = Array.from({ length: 5000 }, (_, i) => ({ appid: 10000 + i }));
        const { fetcher, calls } = makeFetcher({ wishlist: ok({ response: { items } }) });
        await getWishlistDeals('s1', deps(fetcher, fakeCache()));
        const priced = calls.filter((u) => u.includes('filters=price_overview'));
        expect(priced.length).toBeLessThanOrEqual(10);
    });

    // A big anonymised wishlist: discounts only on apps far past the first 12.
    const bigWishlist = Array.from({ length: 123 }, (_, i) => ({ appid: 5000 + i }));
    const bigDiscounts: Record<number, number> = { 5020: 30, 5055: 75, 5099: 10, 5110: 90, 5122: 50 };
    const bigPrices = (ids: string[]) => ok(Object.fromEntries(ids.map((id) => [id, { success: true, data: { price_overview: { discount_percent: bigDiscounts[Number(id)] ?? 0 } } }])));
    function bigFetcher(failChunk?: number) {
        const calls: string[] = [];
        let chunk = 0;
        const fetcher = vi.fn(async (url: string) => {
            calls.push(url);
            if (url.includes('GetWishlist')) return ok({ response: { items: bigWishlist } });
            if (url.includes('ajaxgetdeckappcompatibilityreport')) return ok({ success: 1, results: { resolved_category: 3 } });
            const ids = new URL(url).searchParams.get('appids')!.split(',');
            if (url.includes('filters=price_overview')) {
                const n = chunk++;
                if (n === failChunk) return { status: 500, json: async () => ({}) };
                return bigPrices(ids);
            }
            return ok({ [ids[0]]: { success: true, data: { name: `Game ${ids[0]}` } } });
        });
        return { fetcher: fetcher as any, calls };
    }

    it('finds discounts beyond the first 12 and returns up to 6, biggest discount first', async () => {
        const { fetcher } = bigFetcher();
        const out = await getWishlistDeals('s1', deps(fetcher, fakeCache()));
        expect(out.map((d) => [d.appId, d.discountPercent])).toEqual([[5110, 90], [5055, 75], [5122, 50], [5020, 30], [5099, 10]]);
        expect(out[0]).toEqual({ appId: 5110, name: 'Game 5110', discountPercent: 90, deckVerified: true });
    });

    it('fetches names and Deck reports only for the deals shown, at most 3 deals (6 requests) at a time', async () => {
        const { fetcher, calls } = bigFetcher();
        let inFlight = 0;
        let peak = 0;
        const counting = vi.fn(async (url: string) => {
            const detail = url.includes('filters=basic') || url.includes('ajaxgetdeckappcompatibilityreport');
            if (detail) peak = Math.max(peak, ++inFlight);
            await new Promise((r) => setTimeout(r, 1));
            try {
                return await fetcher(url);
            } finally {
                if (detail) inFlight--;
            }
        });
        await getWishlistDeals('s1', deps(counting as any, fakeCache()));
        const names = calls.filter((u) => u.includes('filters=basic')).map((u) => new URL(u).searchParams.get('appids'));
        const decks = calls.filter((u) => u.includes('ajaxgetdeckappcompatibilityreport')).map((u) => new URL(u).searchParams.get('nAppID'));
        expect(names.sort()).toEqual(['5020', '5055', '5099', '5110', '5122']);
        expect(decks.sort()).toEqual(['5020', '5055', '5099', '5110', '5122']);
        expect(peak).toBeLessThanOrEqual(6);
    });

    it('skips a failed chunk and still counts the others', async () => {
        const { fetcher } = bigFetcher(0); // the first 100 fail; 5110 and 5122 live in the second chunk
        const cache = fakeCache();
        const out = await getWishlistDeals('s1', deps(fetcher, cache));
        expect(out.map((d) => d.appId)).toEqual([5110, 5122]);
        expect(Object.keys(cache.store)).toHaveLength(1);
    });

    it('caches a private wishlist (401/403) as empty for the short TTL', async () => {
        for (const status of [401, 403]) {
            const ttls: number[] = [];
            const cache = fakeCache();
            const recording: Cache = { ...cache, put: async (k, v, ttl) => { ttls.push(ttl); await cache.put(k, v, ttl); } };
            const { fetcher } = makeFetcher({ wishlist: { status, json: async () => ({}) } });
            await expect(getWishlistDeals('s1', deps(fetcher, recording))).resolves.toEqual([]);
            expect(Object.values(cache.store)).toEqual([[]]);
            expect(ttls).toEqual([30 * 60_000]);
            await getWishlistDeals('s1', deps(fetcher, cache));
            expect(fetcher).toHaveBeenCalledTimes(1);
        }
    });

    it('does not cache when every price chunk fails', async () => {
        const cache = fakeCache();
        const { fetcher } = makeFetcher({ prices: { status: 500, json: async () => ({}) } });
        await expect(getWishlistDeals('s1', deps(fetcher, cache))).resolves.toEqual([]);
        expect(Object.keys(cache.store)).toHaveLength(0);
    });

    it('caches found deals for 6 hours', async () => {
        const ttls: number[] = [];
        const cache = fakeCache();
        const recording: Cache = { ...cache, put: async (k, v, ttl) => { ttls.push(ttl); await cache.put(k, v, ttl); } };
        await getWishlistDeals('s1', deps(makeFetcher().fetcher, recording));
        expect(ttls).toEqual([6 * 3_600_000]);
    });

    it('does not hang when the network is slow', async () => {
        vi.useFakeTimers();
        const { fetcher } = makeFetcher({ wishlist: () => new Promise<Resp>(() => {}) });
        const promise = getWishlistDeals('s1', deps(fetcher, fakeCache()));
        await vi.advanceTimersByTimeAsync(8_001);
        await expect(promise).resolves.toEqual([]);
    });

    it('treats a slow deck report as not verified', async () => {
        vi.useFakeTimers();
        const { fetcher } = makeFetcher({ deck: () => new Promise<Resp>(() => {}) });
        const promise = getWishlistDeals('s1', deps(fetcher, fakeCache()));
        await vi.advanceTimersByTimeAsync(20_000);
        const out = await promise;
        expect(out[0].deckVerified).toBe(false);
    });

    it('caches a valid empty result briefly and re-fetches after the TTL', async () => {
        let t = NOW;
        const store: Record<string, { v: unknown; exp: number }> = {};
        const cache: Cache = {
            get: async <T>(k: string) => (store[k] && store[k].exp > t ? (store[k].v as T) : null),
            put: async (k, v, ttl) => { store[k] = { v, exp: t + ttl }; },
            clear: async () => {},
        };
        const { fetcher } = makeFetcher({ wishlist: ok({ response: {} }) });
        const d = { cache, fetcher, now: () => t };
        await expect(getWishlistDeals('s1', d)).resolves.toEqual([]);
        const first = fetcher.mock.calls.length;
        t += 29 * 60_000;
        await getWishlistDeals('s1', d);
        expect(fetcher.mock.calls.length).toBe(first);
        t += 2 * 60_000;
        await getWishlistDeals('s1', d);
        expect(fetcher.mock.calls.length).toBeGreaterThan(first);
    });

    it('caches a wishlist with no discounted items, but not a failure', async () => {
        const noDeals = ok({ 1001: { success: true, data: { price_overview: { discount_percent: 0 } } } });
        const cache = fakeCache();
        await getWishlistDeals('s1', deps(makeFetcher({ prices: noDeals }).fetcher, cache));
        expect(Object.keys(cache.store)).toHaveLength(1);
        const failed = fakeCache();
        await getWishlistDeals('s1', deps(makeFetcher({ wishlist: { status: 500, json: async () => ({}) } }).fetcher, failed));
        expect(Object.keys(failed.store)).toHaveLength(0);
    });
});
