import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoAchievements, noteDetails, resetDetailsMemo, seedAchievements, setAchievementSink } from '../../src/home/detailsMemo';
import {
    ART_WARM_GAP_MS, DESCRIPTION_MEMO_MAX, DESCRIPTION_WARM_DELAY_MS, forgetHltb, warmArt, warmDescriptions, knownDescription, HLTB_WARM_DELAY_MS, peekDescription, peekHltb, rememberDescription, rememberHltb, resetWarmup, warmAchievements,
    warmHltb, warmOrder, warmProton, PROTON_WARM_DELAY_MS, ProtonWarmDeps,
} from '../../src/home/warmup';
import type { ProtonResult } from '../../src/data/protondb';
import type { PlayerCount } from '../../src/data/playerCount';
import { warmPlayers, PLAYERS_WARM_DELAY_MS, type PlayersWarmDeps } from '../../src/home/warmup';

const game = (appId: number) => ({ appId, name: `Game ${appId}`, isShortcut: false });
const found = (main: number) => ({ status: 'found' as const, gameId: 1, times: { main, mainExtras: null, completionist: null } });

beforeEach(() => {
    resetWarmup();
    resetDetailsMemo();
});

describe('warmOrder', () => {
    it('is nearest the centre first, right before left on a tie, each item once', () => {
        expect(warmOrder([0, 1, 2, 3, 4], 2)).toEqual([2, 3, 1, 4, 0]);
        expect(warmOrder([0, 1, 2, 3, 4], 0)).toEqual([0, 1, 2, 3, 4]);
        expect(warmOrder([0, 1, 2], 9)).toEqual([2, 1, 0]);
        expect(warmOrder([], 3)).toEqual([]);
        expect(warmOrder(['a'], NaN)).toEqual(['a']);
    });
});

describe('the HowLongToBeat memo', () => {
    it('keeps results for the session, never "unavailable"; a game can be forgotten', () => {
        rememberHltb(1, found(20));
        rememberHltb(2, { status: 'unavailable' });
        expect(peekHltb(1)).toEqual(found(20));
        expect(peekHltb(2)).toBeUndefined();
        forgetHltb(1);
        expect(peekHltb(1)).toBeUndefined();
        rememberHltb(3, found(5));
        forgetHltb();
        expect(peekHltb(3)).toBeUndefined();
    });
});

describe('the description memo', () => {
    it('keeps a game’s description per language for the session', () => {
        rememberDescription(1, 'english', 'A ship in the dark.');
        expect(peekDescription(1, 'english')).toBe('A ship in the dark.');
        expect(peekDescription(1, 'spanish')).toBeUndefined();
        expect(peekDescription(2, 'english')).toBeUndefined();
        rememberDescription(1, 'english', 'Updated.');
        expect(peekDescription(1, 'english')).toBe('Updated.');
    });

    it('never keeps an empty description', () => {
        rememberDescription(1, 'english', '');
        rememberDescription(2, 'english', '   ');
        expect(peekDescription(1, 'english')).toBeUndefined();
        expect(peekDescription(2, 'english')).toBeUndefined();
    });

    it('is bounded: the oldest goes first', () => {
        for (let i = 0; i <= DESCRIPTION_MEMO_MAX; i++) rememberDescription(i, 'english', `text ${i}`);
        expect(peekDescription(0, 'english')).toBeUndefined();
        expect(peekDescription(DESCRIPTION_MEMO_MAX, 'english')).toBe(`text ${DESCRIPTION_MEMO_MAX}`);
    });

    it('the page shows the fetched description once it answers, until then the one Home already fetched', () => {
        rememberDescription(1, 'english', 'From Home.');
        expect(knownDescription(undefined, 1, 'english')).toBe('From Home.');
        expect(knownDescription('Fetched.', 1, 'english')).toBe('Fetched.');
        expect(knownDescription(null, 1, 'english')).toBeNull();
        expect(knownDescription(undefined, 1, undefined)).toBeUndefined();
        expect(knownDescription(undefined, 2, 'english')).toBeUndefined();
    });

    it('resetWarmup clears it', () => {
        rememberDescription(1, 'english', 'x');
        resetWarmup();
        expect(peekDescription(1, 'english')).toBeUndefined();
    });
});

describe('warmDescriptions', () => {
    const g = (appId: number, isShortcut = false) => ({ appId, name: `Game ${appId}`, isShortcut });
    const deps = (cached: Record<number, string | null>, over: Partial<Parameters<typeof warmDescriptions>[2]> = {}) => ({
        readCached: vi.fn(async (appId: number) => (appId in cached ? cached[appId] : undefined)),
        fetch: vi.fn(async (game: { appId: number }) => `Fetched ${game.appId}.`),
        allowNetwork: () => true,
        sleep: vi.fn(async () => undefined),
        ...over,
    });
    it('puts what the disk cache has into the memo at once, without going online or pausing', async () => {
        const d = deps({ 1: 'One.', 2: null });
        await warmDescriptions([g(1), g(2)], 'english', d, () => false);
        expect(peekDescription(1, 'english')).toBe('One.');
        // A cached "none" is not looked up again.
        expect(peekDescription(2, 'english')).toBeUndefined();
        expect(d.fetch).not.toHaveBeenCalled();
        expect(d.sleep).not.toHaveBeenCalled();
    });
    it('fetches a game with nothing cached when allowed, then pauses; calls onResult for each it learned', async () => {
        const d = deps({ 1: 'One.' });
        const seen: number[] = [];
        await warmDescriptions([g(1), g(3)], 'english', d, () => false, (id) => seen.push(id));
        expect(d.fetch).toHaveBeenCalledTimes(1);
        expect(peekDescription(3, 'english')).toBe('Fetched 3.');
        expect(d.sleep).toHaveBeenCalledWith(DESCRIPTION_WARM_DELAY_MS);
        expect(seen).toEqual([1, 3]);
    });
    it('never goes online when the pre-load setting is off', async () => {
        const d = deps({}, { allowNetwork: () => false });
        await warmDescriptions([g(1), g(2, true)], 'english', d, () => false);
        expect(d.fetch).not.toHaveBeenCalled();
    });
    it("a non-Steam game has no disk entry of its own: it is looked up (Heroic's local copy, or the store) when allowed", async () => {
        const d = deps({});
        await warmDescriptions([g(9, true)], 'english', d, () => false);
        expect(d.readCached).not.toHaveBeenCalled();
        expect(peekDescription(9, 'english')).toBe('Fetched 9.');
    });
    it('skips games already known and stops when cancelled', async () => {
        rememberDescription(1, 'english', 'Known.');
        const d = deps({ 2: 'Two.' });
        let stop = false;
        await warmDescriptions([g(1), g(2), g(3)], 'english', d, () => stop, (id) => {
            if (id === 2) stop = true;
        });
        expect(d.readCached).toHaveBeenCalledTimes(1);
        expect(d.fetch).not.toHaveBeenCalled();
    });
});

describe('warmArt', () => {
    it("resolves each game's hero art in turn (loaded and decoded), skipping the known ones, with a gap between games", async () => {
        const known = new Set([2]);
        const resolved: number[] = [];
        const deps = {
            has: (id: number) => known.has(id),
            resolve: vi.fn(async (id: number) => {
                resolved.push(id);
            }),
            sleep: vi.fn(async () => undefined),
        };
        await warmArt([1, 2, 3], deps, () => false);
        expect(resolved).toEqual([1, 3]);
        expect(deps.sleep).toHaveBeenCalledWith(ART_WARM_GAP_MS);
        expect(deps.sleep).toHaveBeenCalledTimes(2);
    });
    it('stops when cancelled', async () => {
        let stop = false;
        const deps = { has: () => false, resolve: vi.fn(async () => { stop = true; }), sleep: vi.fn(async () => undefined) };
        await warmArt([1, 2, 3], deps, () => stop);
        expect(deps.resolve).toHaveBeenCalledTimes(1);
    });
});

describe('warmHltb', () => {
    const deps = (cached: Record<number, ReturnType<typeof found> | { status: 'notFound' }>, over: Partial<Parameters<typeof warmHltb>[1]> = {}) => {
        const store = { ...cached } as Record<number, unknown>;
        return {
            readCached: vi.fn(async (g: { appId: number }) => (store[g.appId] as never) ?? null),
            prefetch: vi.fn(async (g: { appId: number }) => {
                store[g.appId] = found(9);
                return { status: 'found' as const, fetched: true };
            }),
            allowNetwork: () => true,
            sleep: vi.fn(async () => undefined),
            ...over,
        };
    };
    it('reads the disk cache without going online or pausing', async () => {
        const d = deps({ 1: found(20), 2: { status: 'notFound' } });
        await warmHltb([game(1), game(2)], d, () => false);
        expect(peekHltb(1)).toEqual(found(20));
        expect(peekHltb(2)).toEqual({ status: 'notFound' });
        expect(d.prefetch).not.toHaveBeenCalled();
        expect(d.sleep).not.toHaveBeenCalled();
    });
    it('looks up a game with nothing cached online, then pauses; calls onResult for each', async () => {
        const d = deps({ 1: found(20) });
        const seen: number[] = [];
        await warmHltb([game(1), game(2)], d, () => false, (id) => seen.push(id));
        expect(d.prefetch).toHaveBeenCalledTimes(1);
        expect(peekHltb(2)).toEqual(found(9));
        expect(d.sleep).toHaveBeenCalledWith(HLTB_WARM_DELAY_MS);
        expect(seen).toEqual([1, 2]);
    });
    it('never goes online when the pre-load setting is off: only what is cached', async () => {
        const d = deps({ 1: found(20) }, { allowNetwork: () => false });
        await warmHltb([game(1), game(2)], d, () => false);
        expect(d.prefetch).not.toHaveBeenCalled();
        expect(peekHltb(1)).toBeDefined();
        expect(peekHltb(2)).toBeUndefined();
    });
    it('stops when HowLongToBeat cannot be reached, and when cancelled; skips games already known', async () => {
        const offline = deps({}, { prefetch: vi.fn(async () => ({ status: 'unavailable' as const, fetched: false })) });
        await warmHltb([game(1), game(2), game(3)], offline, () => false);
        expect(offline.prefetch).toHaveBeenCalledTimes(1);
        expect(peekHltb(2)).toBeUndefined();
        const d = deps({ 1: found(1), 2: found(2) });
        let calls = 0;
        await warmHltb([game(1), game(2)], d, () => ++calls > 2);
        expect(peekHltb(2)).toBeUndefined();
        rememberHltb(5, found(5));
        const d2 = deps({});
        await warmHltb([game(5)], d2, () => false);
        expect(d2.readCached).not.toHaveBeenCalled();
    });
});

describe('warmAchievements', () => {
    it('asks for each game in turn, stops waiting once its counts are known, and unregisters', async () => {
        const unregister = vi.fn();
        const register = vi.fn((appId: number, cb: (d: unknown) => void) => {
            setTimeout(() => cb({ achievements: { nTotal: appId, nAchieved: 1 } }), 5);
            return { unregister };
        });
        const deps = { has: (id: number) => memoAchievements(id) !== undefined, register, sleep: async () => undefined };
        const t0 = Date.now();
        await warmAchievements([10, 20], deps, () => false, (id, details) => noteDetails(id, details), 1000);
        expect(Date.now() - t0).toBeLessThan(500); // not the 1000 ms wait
        expect(memoAchievements(10)).toEqual({ achieved: 1, total: 10 });
        expect(memoAchievements(20)).toEqual({ achieved: 1, total: 20 });
        expect(unregister).toHaveBeenCalledTimes(2);
    });
    it('gives up on a game with no achievements after the wait, asks each game once per session, skips known ones', async () => {
        const register = vi.fn(() => ({ unregister: () => undefined }));
        const deps = { has: (id: number) => memoAchievements(id) !== undefined, register, sleep: async () => undefined };
        seedAchievements(3, { achieved: 0, total: 5 });
        await warmAchievements([1, 3], deps, () => false, () => undefined, 20);
        expect(register).toHaveBeenCalledTimes(1);
        await warmAchievements([1], deps, () => false, () => undefined, 20);
        expect(register).toHaveBeenCalledTimes(1); // already tried this session
    });
    it('stops when cancelled and survives a registration that throws', async () => {
        const boom = { has: () => false, register: () => { throw new Error('x'); }, sleep: async () => undefined };
        await expect(warmAchievements([7], boom, () => false, () => undefined, 20)).resolves.toBeUndefined();
        const register = vi.fn(() => undefined);
        await warmAchievements([8, 9], { has: () => false, register, sleep: async () => undefined }, () => true, () => undefined, 20);
        expect(register).not.toHaveBeenCalled();
    });
});

describe('achievements kept across restarts (the sink and seeding)', () => {
    it('hands new or changed counts to the sink, not repeats; seeding fills the memo without writing back', () => {
        const sink = vi.fn();
        setAchievementSink(sink);
        noteDetails(5, { achievements: { nTotal: 10, nAchieved: 2 } });
        noteDetails(5, { achievements: { nTotal: 10, nAchieved: 2 } });
        noteDetails(5, { achievements: { nTotal: 10, nAchieved: 3 } });
        expect(sink.mock.calls).toEqual([[5, { achieved: 2, total: 10 }], [5, { achieved: 3, total: 10 }]]);
        seedAchievements(6, { achieved: 1, total: 4 });
        expect(memoAchievements(6)).toEqual({ achieved: 1, total: 4 });
        expect(sink).toHaveBeenCalledTimes(2);
        seedAchievements(5, { achieved: 0, total: 99 }); // a fresher value already known stays
        expect(memoAchievements(5)).toEqual({ achieved: 3, total: 10 });
        for (const bad of [null, undefined, 'x', { total: 0 }, { total: -1 }, { total: NaN }]) seedAchievements(7, bad);
        expect(memoAchievements(7)).toBeUndefined();
    });
    it('a sink that throws does not break noting details', () => {
        setAchievementSink(() => { throw new Error('disk'); });
        expect(() => noteDetails(8, { achievements: { nTotal: 3, nAchieved: 0 } })).not.toThrow();
        expect(memoAchievements(8)).toEqual({ achieved: 0, total: 3 });
    });
});

describe('warmProton', () => {
    const rated: ProtonResult = { status: 'found', tier: 'gold', details: { total: 9, confidence: 'good', trending: null, best: null } };
    function protonDeps(over: Partial<ProtonWarmDeps> = {}, disk = new Map<number, ProtonResult>()) {
        const memo = new Map<number, ProtonResult>();
        const d: ProtonWarmDeps & { memo: Map<number, ProtonResult> } = {
            memo,
            known: (id) => memo.has(id),
            readCached: vi.fn(async (id: number) => disk.get(id) ?? null),
            prefetch: vi.fn(async (id: number) => { disk.set(id, rated); return { status: 'found' as const, fetched: true }; }),
            seed: (id, r) => { if (r.status === 'found' && !r.details) return false; memo.set(id, r); return true; },
            allowNetwork: () => true,
            sleep: vi.fn(async () => undefined),
            ...over,
        };
        return d;
    }
    it('the disk cache first: a cached rating reaches the chip without going online', async () => {
        const d = protonDeps({}, new Map([[1, rated]]));
        const got: number[] = [];
        await warmProton([1], d, () => false, (id) => got.push(id));
        expect(d.memo.get(1)).toEqual(rated);
        expect(d.prefetch).not.toHaveBeenCalled();
        expect(got).toEqual([1]);
    });
    it('then online, one game at a time, pausing after each fetch', async () => {
        const d = protonDeps();
        await warmProton([1, 2], d, () => false);
        expect(d.prefetch).toHaveBeenNthCalledWith(1, 1);
        expect(d.prefetch).toHaveBeenNthCalledWith(2, 2);
        expect(d.sleep).toHaveBeenCalledWith(PROTON_WARM_DELAY_MS);
        expect([...d.memo.keys()]).toEqual([1, 2]);
    });
    it('an old cache entry without details is asked again online', async () => {
        const d = protonDeps({}, new Map([[1, { status: 'found', tier: 'gold' } as ProtonResult]]));
        await warmProton([1], d, () => false);
        expect(d.prefetch).toHaveBeenCalledWith(1);
        expect(d.memo.get(1)).toEqual(rated);
    });
    it('skips games the chip knows, stays offline when the setting says so, stops when ProtonDB is unreachable or cancelled', async () => {
        const known = protonDeps();
        known.memo.set(1, rated);
        await warmProton([1], known, () => false);
        expect(known.readCached).not.toHaveBeenCalled();
        const offline = protonDeps({ allowNetwork: () => false });
        await warmProton([1, 2], offline, () => false);
        expect(offline.prefetch).not.toHaveBeenCalled();
        const down = protonDeps({ prefetch: vi.fn(async () => ({ status: 'unavailable' as const, fetched: true })) });
        await warmProton([1, 2], down, () => false);
        expect(down.prefetch).toHaveBeenCalledTimes(1);
        const cancelled = protonDeps();
        await warmProton([1, 2], cancelled, () => true);
        expect(cancelled.readCached).not.toHaveBeenCalled();
    });
});

describe('warmPlayers', () => {
    const found = (count: number): PlayerCount => ({ status: 'found', count });
    function deps(over: Partial<PlayersWarmDeps> = {}, disk = new Map<number, PlayerCount>()) {
        const memo = new Map<number, number>();
        const d: PlayersWarmDeps & { memo: Map<number, number> } = {
            memo,
            known: (id) => memo.has(id),
            readCached: vi.fn(async (id: number) => disk.get(id) ?? null),
            prefetch: vi.fn(async (id: number) => { if (disk.has(id)) return { status: 'found' as const, fetched: false }; disk.set(id, found(id * 10)); return { status: 'found' as const, fetched: true }; }),
            seed: (id, r) => { if (r.status !== 'found') return false; memo.set(id, r.count); return true; },
            allowNetwork: () => true,
            sleep: vi.fn(async () => undefined),
            ...over,
        };
        return d;
    }
    it('seeds cached counts without going online, and fetches the rest one at a time with a pause', async () => {
        const d = deps({}, new Map([[1, found(5)]]));
        const got: number[] = [];
        await warmPlayers([1, 2], d, () => false, (id) => got.push(id));
        expect(d.memo.get(1)).toBe(5);
        expect(d.memo.get(2)).toBe(20);
        expect(d.prefetch).toHaveBeenCalledTimes(2); // a cached count is asked only when due (prefetch decides)
        expect(d.sleep).toHaveBeenCalledTimes(1); // the pause follows only the request that went online
        expect(d.sleep).toHaveBeenCalledWith(PLAYERS_WARM_DELAY_MS);
        expect(got).toEqual([1, 2]);
    });
    it('stays offline when pre-loading is off', async () => {
        const d = deps({ allowNetwork: () => false });
        await warmPlayers([1], d, () => false);
        expect(d.prefetch).not.toHaveBeenCalled();
    });
    it('stops the pass when Steam is unavailable (rate limit), keeping what it already seeded', async () => {
        const d = deps({ prefetch: vi.fn(async () => ({ status: 'unavailable' as const, fetched: true })) }, new Map([[1, found(5)]]));
        await warmPlayers([1, 2, 3], d, () => false);
        expect(d.prefetch).toHaveBeenCalledTimes(1);
        expect(d.memo.get(1)).toBe(5);
    });
    it('stops when cancelled', async () => {
        const d = deps();
        await warmPlayers([1, 2], d, () => true);
        expect(d.readCached).not.toHaveBeenCalled();
    });
});
