import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoAchievements, noteDetails, resetDetailsMemo, seedAchievements, setAchievementSink } from '../../src/home/detailsMemo';
import { forgetHltb, HLTB_WARM_DELAY_MS, peekHltb, rememberHltb, resetWarmup, warmAchievements, warmHltb, warmOrder } from '../../src/home/warmup';

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
