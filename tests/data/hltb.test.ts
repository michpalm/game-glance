import { describe, expect, it, vi } from 'vitest';
import { createCache, createOverrides } from '../../src/data/cache';
import { createHltbLookup, HltbGame, parseStat } from '../../src/data/hltb';
import { memoryKv } from '../../src/data/kv';

const STATS = { mainStat: '51.7', mainPlusStat: '103.8', completeStat: '--', allStylesStat: '80.0', gameId: 10270, lastUpdatedAt: new Date() };
const W3: HltbGame = { appId: 292030, name: 'The Witcher 3: Wild Hunt – Game of the Year Edition', isShortcut: false };

function setup(fetchStats: ReturnType<typeof vi.fn>, reachable = true) {
    const kv = memoryKv();
    const cache = createCache(kv);
    const overrides = createOverrides(kv);
    const isReachable = vi.fn(async () => reachable);
    const lookup = createHltbLookup({ fetchStats, isReachable, cache, overrides });
    return { lookup, cache, overrides, isReachable };
}

describe('parseStat', () => {
    it('parses hours and treats -- as missing', () => {
        expect(parseStat('51.7')).toBe(51.7);
        expect(parseStat('--')).toBeNull();
        expect(parseStat('0.0')).toBeNull();
        expect(parseStat(undefined)).toBeNull();
    });
});

describe('createHltbLookup', () => {
    it('returns parsed times and passes the Steam app id', async () => {
        const fetchStats = vi.fn(async () => STATS);
        const { lookup } = setup(fetchStats);
        expect(await lookup(W3)).toEqual({ status: 'found', gameId: 10270, times: { main: 51.7, mainExtras: 103.8, completionist: null } });
        expect(fetchStats).toHaveBeenCalledWith(W3.name, 292030);
    });
    it('does not pass an app id for shortcuts', async () => {
        const fetchStats = vi.fn(async () => STATS);
        const { lookup } = setup(fetchStats);
        await lookup({ appId: 3123456789, name: 'Hades', isShortcut: true });
        expect(fetchStats).toHaveBeenCalledWith('Hades', undefined);
    });
    it('retries once with the cleaned title', async () => {
        const fetchStats = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(STATS);
        const { lookup } = setup(fetchStats);
        expect((await lookup(W3)).status).toBe('found');
        expect(fetchStats).toHaveBeenNthCalledWith(2, 'The Witcher 3: Wild Hunt', 292030);
    });
    it('uses the override id and skips the retry', async () => {
        const fetchStats = vi.fn(async () => STATS);
        const { lookup, overrides } = setup(fetchStats);
        await overrides.set(292030, 999);
        await lookup(W3);
        expect(fetchStats).toHaveBeenCalledTimes(1);
        expect(fetchStats).toHaveBeenCalledWith(W3.name, 292030, 999);
    });
    it('caches found results', async () => {
        const fetchStats = vi.fn(async () => STATS);
        const { lookup } = setup(fetchStats);
        await lookup(W3);
        await lookup(W3);
        expect(fetchStats).toHaveBeenCalledTimes(1);
    });
    it('reports notFound when HLTB is reachable, and caches it', async () => {
        const fetchStats = vi.fn(async () => null);
        const { lookup } = setup(fetchStats, true);
        expect(await lookup(W3)).toEqual({ status: 'notFound' });
        await lookup(W3);
        expect(fetchStats).toHaveBeenCalledTimes(2);
    });
    it('reports unavailable when HLTB is unreachable, and does not cache it', async () => {
        const fetchStats = vi.fn(async () => null);
        const { lookup } = setup(fetchStats, false);
        expect(await lookup(W3)).toEqual({ status: 'unavailable' });
        await lookup(W3);
        expect(fetchStats).toHaveBeenCalledTimes(4);
    });
});

describe('createHltbLookup with a failing backend', () => {
    it('still returns a found result when cache reads and writes fail', async () => {
        const failing = {
            get: vi.fn(async () => { throw new Error('backend not ready'); }),
            put: vi.fn(async () => { throw new Error('disk full'); }),
            clear: vi.fn(),
        };
        const overrides = { get: vi.fn(async () => { throw new Error('backend not ready'); }) };
        const fetchStats = vi.fn(async () => STATS);
        const lookup = createHltbLookup({ fetchStats, isReachable: async () => true, cache: failing, overrides });
        expect(await lookup(W3)).toMatchObject({ status: 'found', gameId: 10270 });
        expect(fetchStats).toHaveBeenCalledWith(W3.name, 292030);
    });
});

describe('createHltbLookup with an override that finds nothing', () => {
    it('reports which override id was not found', async () => {
        const fetchStats = vi.fn(async () => null);
        const { lookup, overrides } = setup(fetchStats, true);
        await overrides.set(292030, 292030);
        expect(await lookup(W3)).toEqual({ status: 'notFound', overrideId: 292030 });
    });
});

const DAY = 86_400_000;
const NEWER = { ...STATS, mainStat: '50.0' };

function clocked(fetchStats: ReturnType<typeof vi.fn>, reachable = true) {
    const clock = { t: 1_000_000 };
    const kv = memoryKv();
    const cache = createCache(kv, () => clock.t);
    const overrides = createOverrides(kv);
    const lookup = createHltbLookup({ fetchStats, isReachable: async () => reachable, cache, overrides, now: () => clock.t });
    return { lookup, clock };
}

describe('createHltbLookup keeps found times', () => {
    it('still serves found times long after a week, without fetching again', async () => {
        const fetchStats = vi.fn(async () => STATS);
        const { lookup, clock } = clocked(fetchStats);
        await lookup(W3);
        clock.t += 29 * DAY;
        expect(await lookup(W3)).toEqual({ status: 'found', gameId: 10270, times: { main: 51.7, mainExtras: 103.8, completionist: null } });
        expect(fetchStats).toHaveBeenCalledTimes(1);
    });
    it('shows month-old times right away and refreshes them in the background', async () => {
        const fetchStats = vi.fn().mockResolvedValueOnce(STATS).mockResolvedValue(NEWER);
        const { lookup, clock } = clocked(fetchStats);
        await lookup(W3);
        clock.t += 31 * DAY;
        expect(await lookup(W3)).toMatchObject({ status: 'found', times: { main: 51.7 } });
        await vi.waitFor(() => expect(fetchStats).toHaveBeenCalledTimes(2));
        await vi.waitFor(async () => expect(await lookup(W3)).toMatchObject({ times: { main: 50 } }));
    });
    it('refreshes a stale game only once, however often the page opens', async () => {
        const fetchStats = vi.fn().mockResolvedValueOnce(STATS).mockResolvedValue(NEWER);
        const { lookup, clock } = clocked(fetchStats);
        await lookup(W3);
        clock.t += 31 * DAY;
        await Promise.all([lookup(W3), lookup(W3), lookup(W3)]);
        await vi.waitFor(() => expect(fetchStats).toHaveBeenCalledTimes(2));
        await new Promise((r) => setTimeout(r, 0));
        expect(fetchStats).toHaveBeenCalledTimes(2);
    });
    it('keeps the old times when a refresh finds nothing or HowLongToBeat is unreachable', async () => {
        for (const reachable of [true, false]) {
            const fetchStats = vi.fn().mockResolvedValueOnce(STATS).mockResolvedValue(null);
            const { lookup, clock } = clocked(fetchStats, reachable);
            await lookup(W3);
            clock.t += 31 * DAY;
            await lookup(W3);
            await vi.waitFor(() => expect(fetchStats.mock.calls.length).toBeGreaterThanOrEqual(2));
            await new Promise((r) => setTimeout(r, 0));
            expect(await lookup(W3)).toMatchObject({ status: 'found', times: { main: 51.7 } });
        }
    });
    it('still retries "no match" after a day', async () => {
        const fetchStats = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValue(STATS);
        const { lookup, clock } = clocked(fetchStats);
        expect(await lookup(W3)).toEqual({ status: 'notFound' });
        clock.t += DAY + 1;
        expect(await lookup(W3)).toMatchObject({ status: 'found' });
    });
});

describe('createHltbLookup prefetch', () => {
    it('fetches games that are not cached yet', async () => {
        const fetchStats = vi.fn(async () => STATS);
        const { lookup } = clocked(fetchStats);
        expect(await lookup.prefetch(W3)).toEqual({ status: 'found', fetched: true });
    });
    it('skips games with fresh results, including recent "no match"', async () => {
        const fetchStats = vi.fn().mockResolvedValueOnce(STATS).mockResolvedValue(null);
        const { lookup } = clocked(fetchStats);
        await lookup(W3);
        expect(await lookup.prefetch(W3)).toEqual({ status: 'found', fetched: false });
        const hades = { appId: 1145360, name: 'Hades', isShortcut: false };
        await lookup(hades);
        const calls = fetchStats.mock.calls.length;
        expect(await lookup.prefetch(hades)).toEqual({ status: 'notFound', fetched: false });
        expect(fetchStats).toHaveBeenCalledTimes(calls);
    });
    it('waits for the refresh of stale results, keeping old times if it fails', async () => {
        const fetchStats = vi.fn().mockResolvedValueOnce(STATS).mockResolvedValueOnce(NEWER).mockResolvedValue(null);
        const { lookup, clock } = clocked(fetchStats, false);
        await lookup(W3);
        clock.t += 31 * DAY;
        expect(await lookup.prefetch(W3)).toEqual({ status: 'found', fetched: true });
        expect(await lookup(W3)).toMatchObject({ times: { main: 50 } });
        clock.t += 31 * DAY;
        expect(await lookup.prefetch(W3)).toEqual({ status: 'unavailable', fetched: true });
        expect(await lookup(W3)).toMatchObject({ times: { main: 50 } });
    });
});
