import { describe, expect, it, vi } from 'vitest';
import { createCache } from '../../src/data/cache';
import { memoryKv } from '../../src/data/kv';
import { createPlayerCountLookup, parsePlayers, playersCacheKey, playersUrl, PLAYERS_HOME_MAX_AGE_MS, PLAYERS_PAGE_MAX_AGE_MS, PLAYERS_POLL_MS } from '../../src/data/playerCount';

const answer = (status: number, body: unknown = {}) => ({ status, json: async () => body });
const count = (n: unknown, result: unknown = 1) => ({ response: { result, player_count: n } });
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

function setup(fetcher: ReturnType<typeof vi.fn>, clock = { now: 1_000_000 }) {
    const cache = createCache(memoryKv(), () => clock.now);
    const lookup = createPlayerCountLookup({ fetcher, cache, now: () => clock.now, timeoutMs: 50 });
    return { lookup, cache, clock };
}

describe('parsePlayers', () => {
    it("reads Steam's current player count, 0 included, and nothing else", () => {
        expect(parsePlayers(count(20663))).toBe(20663);
        expect(parsePlayers(count(0))).toBe(0);
        expect(parsePlayers(count(20663, 42))).toBeNull();
        expect(parsePlayers({ response: { result: 1 } })).toBeNull();
        expect(parsePlayers(count(-1))).toBeNull();
        expect(parsePlayers(count(1.5))).toBeNull();
        expect(parsePlayers(count('12'))).toBeNull();
        expect(parsePlayers(null)).toBeNull();
    });
});

describe('createPlayerCountLookup', () => {
    it('keeps the timings the spec fixes', () => {
        expect(PLAYERS_HOME_MAX_AGE_MS).toBe(300_000);
        expect(PLAYERS_PAGE_MAX_AGE_MS).toBe(60_000);
        expect(PLAYERS_POLL_MS).toBe(300_000);
        expect(playersUrl(292030)).toBe('https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=292030');
        expect(playersCacheKey(292030)).toBe('players:292030');
    });
    it('asks Steam once, then answers from the cache while the count is young enough', async () => {
        const fetcher = vi.fn(async () => answer(200, count(20663)));
        const { lookup } = setup(fetcher);
        expect(await lookup(292030, PLAYERS_PAGE_MAX_AGE_MS)).toEqual({ status: 'found', count: 20663 });
        expect(fetcher).toHaveBeenCalledWith(playersUrl(292030));
        expect(await lookup(292030, PLAYERS_PAGE_MAX_AGE_MS)).toEqual({ status: 'found', count: 20663 });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it('returns an old count at once and refreshes it behind', async () => {
        const fetcher = vi.fn(async () => answer(200, count(100)));
        const { lookup, clock } = setup(fetcher);
        await lookup(10, PLAYERS_HOME_MAX_AGE_MS);
        fetcher.mockImplementation(async () => answer(200, count(120)));
        clock.now += PLAYERS_PAGE_MAX_AGE_MS + 1;
        expect(await lookup(10, PLAYERS_HOME_MAX_AGE_MS)).toEqual({ status: 'found', count: 100 }); // young for Home
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(await lookup(10, PLAYERS_PAGE_MAX_AGE_MS)).toEqual({ status: 'found', count: 100 }); // old for the page: shown, refreshed
        await flush();
        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(await lookup(10, PLAYERS_PAGE_MAX_AGE_MS)).toEqual({ status: 'found', count: 120 });
    });
    it('keeps the known count when Steam fails, and never caches a failure', async () => {
        for (const fail of [async () => answer(500), async () => { throw new Error('offline'); }, () => new Promise(() => undefined)]) {
            const fetcher = vi.fn(async () => answer(200, count(7)));
            const { lookup, clock, cache } = setup(fetcher);
            await lookup(10, PLAYERS_PAGE_MAX_AGE_MS);
            fetcher.mockImplementation(fail as never);
            clock.now += PLAYERS_PAGE_MAX_AGE_MS + 1;
            const before = await cache.get(playersCacheKey(10));
            expect(await lookup(10, PLAYERS_PAGE_MAX_AGE_MS)).toEqual({ status: 'found', count: 7 });
            await new Promise((r) => setTimeout(r, 80));
            expect(await cache.get(playersCacheKey(10))).toEqual(before);
            const fresh = setup(vi.fn(fail as never));
            expect(await fresh.lookup(11, PLAYERS_PAGE_MAX_AGE_MS)).toEqual({ status: 'unavailable' });
            expect(await fresh.cache.get(playersCacheKey(11))).toBeNull();
        }
    });
    it("caches Steam's no-count answer (result 42) as none", async () => {
        const { lookup, cache } = setup(vi.fn(async () => answer(200, count(0, 42))));
        expect(await lookup(10, PLAYERS_PAGE_MAX_AGE_MS)).toEqual({ status: 'none' });
        expect(await cache.get(playersCacheKey(10))).toMatchObject({ status: 'none' });
    });
    it('makes one request for concurrent lookups of the same game', async () => {
        const fetcher = vi.fn(async () => answer(200, count(3)));
        const { lookup } = setup(fetcher);
        await Promise.all([lookup(10, PLAYERS_PAGE_MAX_AGE_MS), lookup(10, PLAYERS_PAGE_MAX_AGE_MS)]);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it('cachedOnly never goes online; prefetch says whether it did and when a refresh failed', async () => {
        const fetcher = vi.fn(async () => answer(200, count(5)));
        const { lookup, clock } = setup(fetcher);
        expect(await lookup.cachedOnly(10)).toBeNull();
        expect(fetcher).not.toHaveBeenCalled();
        expect(await lookup.prefetch(10, PLAYERS_HOME_MAX_AGE_MS)).toEqual({ status: 'found', fetched: true });
        expect(await lookup.prefetch(10, PLAYERS_HOME_MAX_AGE_MS)).toEqual({ status: 'found', fetched: false });
        expect(await lookup.cachedOnly(10)).toEqual({ status: 'found', count: 5 });
        fetcher.mockImplementation(async () => answer(429));
        clock.now += PLAYERS_HOME_MAX_AGE_MS + 1;
        expect(await lookup.prefetch(10, PLAYERS_HOME_MAX_AGE_MS)).toEqual({ status: 'unavailable', fetched: true });
        expect(await lookup.cachedOnly(10)).toEqual({ status: 'found', count: 5 });
    });
});
