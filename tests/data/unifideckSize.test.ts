import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetUnifideckPlaytime } from '../../src/data/unifideckPlaytime';
import { parseGameSize, resetUnifideckSize, unifideckGameSize } from '../../src/data/unifideckSize';

const key = async () => ({ store: 'gog', id: '1450711444' });

describe('parseGameSize', () => {
    it('reads the bytes from Unifideck’s envelope', () => {
        expect(parseGameSize({ success: true, error: null, data: 3435973837 })).toBe(3435973837);
    });
    it('is null for 0, failures and garbage', () => {
        for (const bad of [{ success: true, data: 0 }, { success: true, data: -1 }, { success: true, data: '5' }, { success: false, error: 'internal_error', data: 5 }, null, undefined, 5, 'x', {}]) {
            expect(parseGameSize(bad)).toBeNull();
        }
    });
});

describe('unifideckGameSize', () => {
    beforeEach(() => { resetUnifideckSize(); resetUnifideckPlaytime(); });
    it('calls get_game_size_bytes with the app id, caching per install state', async () => {
        const b = { call: vi.fn(async () => ({ success: true, error: null, data: 100 })) };
        const deps = { backend: b, key, now: () => 1 };
        expect(await unifideckGameSize(3254620658, true, deps)).toBe(100);
        expect(b.call).toHaveBeenCalledWith('loader/call_plugin_method', 'Unifideck', 'get_game_size_bytes', 3254620658);
        await Promise.all([unifideckGameSize(3254620658, true, deps), unifideckGameSize(3254620658, true, deps)]);
        expect(b.call).toHaveBeenCalledTimes(1);
        await unifideckGameSize(3254620658, false, deps);
        expect(b.call).toHaveBeenCalledTimes(2);
    });
    it('is null for a non-Unifideck shortcut, without Decky’s router, or on errors', async () => {
        const b = { call: vi.fn(async () => ({ success: true, data: 5 })) };
        expect(await unifideckGameSize(1, true, { backend: b, key: async () => null })).toBeNull();
        expect(b.call).not.toHaveBeenCalled();
        expect(await unifideckGameSize(2, true, { backend: undefined, key })).toBeNull();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const bad = { call: vi.fn(async () => { throw new Error('x'); }) };
        expect(await unifideckGameSize(3, true, { backend: bad, key })).toBeNull();
        expect(await unifideckGameSize(4, true, { backend: bad, key })).toBeNull();
        expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
        warn.mockRestore();
    });
    it('does not throw when DeckyBackend is missing', async () => {
        expect(await unifideckGameSize(9, true, { key })).toBeNull();
    });
});
