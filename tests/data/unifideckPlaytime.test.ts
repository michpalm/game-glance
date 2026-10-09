import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    mergePlaytime,
    parseUnifideckPlaytime,
    resetUnifideckPlaytime,
    unifideckPlaytime,
    unifideckPlaytimeForApp,
} from '../../src/data/unifideckPlaytime';

const data = (over: Record<string, unknown> = {}) => ({
    total_seconds: 16,
    store_total_secs: 4140,
    session_count: 2,
    last_played: '2026-10-07T08:00:42.780852Z',
    current_streak: 2,
    longest_streak: 2,
    is_active: false,
    ...over,
});
const ok = (over: Record<string, unknown> = {}) => ({ success: true, error: null, data: data(over) });
const LAST = Date.parse('2026-10-07T08:00:42.780852Z') / 1000;

describe('parseUnifideckPlaytime', () => {
    it('prefers the store total, and reads last played from the ISO string', () => {
        expect(parseUnifideckPlaytime(ok())).toEqual({ playedSeconds: 4140, lastPlayed: Math.floor(LAST) });
    });
    it('falls back to total_seconds when the store total is 0 or missing', () => {
        expect(parseUnifideckPlaytime(ok({ store_total_secs: 0 }))?.playedSeconds).toBe(16);
        expect(parseUnifideckPlaytime(ok({ store_total_secs: undefined }))?.playedSeconds).toBe(16);
        expect(parseUnifideckPlaytime(ok({ store_total_secs: 'x' }))?.playedSeconds).toBe(16);
    });
    it('has no played time when both are 0 or missing, but keeps last played', () => {
        expect(parseUnifideckPlaytime(ok({ store_total_secs: 0, total_seconds: 0 }))).toEqual({ playedSeconds: null, lastPlayed: Math.floor(LAST) });
    });
    it('gives null last played for a bad or empty ISO string', () => {
        for (const bad of ['yesterday', '', null, 5, undefined]) {
            expect(parseUnifideckPlaytime(ok({ last_played: bad }))?.lastPlayed).toBeNull();
        }
    });
    it('is null when there is nothing usable', () => {
        expect(parseUnifideckPlaytime(ok({ store_total_secs: 0, total_seconds: 0, last_played: null }))).toBeNull();
    });
    it('rejects failures and garbage', () => {
        expect(parseUnifideckPlaytime({ success: false, error: 'internal_error', data: { detail: 'boom' } })).toBeNull();
        for (const bad of [null, undefined, 3, 'x', [], {}, { success: true }, { success: true, data: null }, { success: true, data: 'x' }]) {
            expect(parseUnifideckPlaytime(bad)).toBeNull();
        }
    });
    it('ignores negative and non-finite seconds', () => {
        expect(parseUnifideckPlaytime(ok({ store_total_secs: -5, total_seconds: Infinity }))?.playedSeconds).toBeNull();
    });
});

describe('mergePlaytime', () => {
    const steam = { minutes: 30, lastPlayed: 1000 };
    it('keeps Steam when Unifideck did not answer', () => {
        expect(mergePlaytime(steam, null)).toEqual(steam);
        expect(mergePlaytime(steam, undefined)).toEqual(steam);
    });
    it('prefers Unifideck: seconds become minutes', () => {
        expect(mergePlaytime({ minutes: 0, lastPlayed: 0 }, { playedSeconds: 4140, lastPlayed: 5000 })).toEqual({ minutes: 69, lastPlayed: 5000 });
    });
    it('does not let a missing Unifideck value replace a Steam one', () => {
        expect(mergePlaytime(steam, { playedSeconds: null, lastPlayed: null })).toEqual(steam);
        expect(mergePlaytime(steam, { playedSeconds: null, lastPlayed: 5000 })).toEqual({ minutes: 30, lastPlayed: 5000 });
        expect(mergePlaytime(steam, { playedSeconds: 60, lastPlayed: null })).toEqual({ minutes: 1, lastPlayed: 1000 });
    });
});

describe('unifideckPlaytime fetch', () => {
    beforeEach(() => resetUnifideckPlaytime());
    const backend = (reply: unknown) => ({ call: vi.fn(async () => reply) });

    it('calls Unifideck get_playtime with positional store and id', async () => {
        const b = backend(ok());
        expect(await unifideckPlaytime('gog', '1450711444', { backend: b })).toEqual({ playedSeconds: 4140, lastPlayed: Math.floor(LAST) });
        expect(b.call).toHaveBeenCalledWith('loader/call_plugin_method', 'Unifideck', 'get_playtime', 'gog', '1450711444');
    });
    it('caches for 60 s per store:id and de-duplicates in-flight calls', async () => {
        const b = backend(ok());
        let now = 1000;
        const deps = { backend: b, now: () => now };
        await Promise.all([unifideckPlaytime('gog', '1', deps), unifideckPlaytime('gog', '1', deps)]);
        expect(b.call).toHaveBeenCalledTimes(1);
        now += 59_000;
        await unifideckPlaytime('gog', '1', deps);
        expect(b.call).toHaveBeenCalledTimes(1);
        await unifideckPlaytime('epic', '1', deps);
        expect(b.call).toHaveBeenCalledTimes(2);
        now += 2_000;
        await unifideckPlaytime('gog', '1', deps);
        expect(b.call).toHaveBeenCalledTimes(3);
    });
    it('is null without Decky\'s router, when it throws, or on a failure reply (logging at most once)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(await unifideckPlaytime('gog', '1', { backend: undefined })).toBeNull();
        const throwing = { call: vi.fn(async () => { throw new Error('no plugin'); }) };
        expect(await unifideckPlaytime('gog', '2', { backend: throwing })).toBeNull();
        expect(await unifideckPlaytime('gog', '3', { backend: throwing })).toBeNull();
        expect(await unifideckPlaytime('gog', '4', { backend: backend({ success: false, error: 'internal_error', data: { detail: 'x' } }) })).toBeNull();
        expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
        warn.mockRestore();
    });
    it('is null for an empty store or id without calling', async () => {
        const b = backend(ok());
        expect(await unifideckPlaytime('', '1', { backend: b })).toBeNull();
        expect(await unifideckPlaytime('gog', '', { backend: b })).toBeNull();
        expect(b.call).not.toHaveBeenCalled();
    });
    it('does not throw when globalThis.DeckyBackend is missing', async () => {
        expect(await unifideckPlaytime('gog', '1')).toBeNull();
    });
});

describe('unifideckPlaytimeForApp', () => {
    beforeEach(() => resetUnifideckPlaytime());
    it('looks the key up once, then fetches', async () => {
        const b = { call: vi.fn(async () => ok()) };
        const key = vi.fn(async () => ({ store: 'gog', id: '1450711444' }));
        const deps = { backend: b, key };
        expect((await unifideckPlaytimeForApp(3254620658, deps))?.playedSeconds).toBe(4140);
        await unifideckPlaytimeForApp(3254620658, deps);
        expect(key).toHaveBeenCalledTimes(1);
    });
    it('is null for a shortcut Unifideck does not know, or when the lookup fails', async () => {
        const b = { call: vi.fn(async () => ok()) };
        expect(await unifideckPlaytimeForApp(1, { backend: b, key: async () => null })).toBeNull();
        expect(await unifideckPlaytimeForApp(2, { backend: b, key: async () => { throw new Error('x'); } })).toBeNull();
        expect(b.call).not.toHaveBeenCalled();
    });
});
