import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadFamilyCopyCount, peekFamilyCopyCount } from '../../src/data/familyCopies';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('family-copy session cache', () => {
    it('deduplicates a pending lookup and retains both positive and zero counts for revisits', async () => {
        let answer!: (v: unknown[]) => void;
        const lookup = vi.fn(() => new Promise<unknown[]>(resolve => { answer = resolve; }));
        const first = loadFamilyCopyCount(101, false, lookup);
        const second = loadFamilyCopyCount(101, false, lookup);
        await Promise.resolve();
        expect(peekFamilyCopyCount(101)).toBeUndefined();
        answer([{}, {}]);
        expect(await first).toBe(2);
        expect(await second).toBe(2);
        expect(peekFamilyCopyCount(101)).toBe(2);
        expect(await loadFamilyCopyCount(101, false, lookup)).toBe(2);
        expect(lookup).toHaveBeenCalledOnce();
        await loadFamilyCopyCount(102, false, async () => []);
        expect(peekFamilyCopyCount(102)).toBe(0);
    });
    it('keeps the last known count during refresh or failure, then accepts ownership changes', async () => {
        await loadFamilyCopyCount(103, false, async () => [{}, {}]);
        let answer!: (v: unknown[]) => void;
        const refresh = loadFamilyCopyCount(103, true, () => new Promise(resolve => { answer = resolve; }));
        await Promise.resolve();
        expect(peekFamilyCopyCount(103)).toBe(2);
        answer([{}]);
        await refresh;
        expect(peekFamilyCopyCount(103)).toBe(1);
        await expect(loadFamilyCopyCount(103, true, async () => { throw Error('offline'); })).rejects.toThrow('offline');
        expect(peekFamilyCopyCount(103)).toBe(1);
    });
    it('does not share ownership across accounts, including late old-account responses', async () => {
        vi.stubGlobal('App', { m_CurrentUser: { strSteamID: 'account-a' } });
        let answer!: (v: unknown[]) => void;
        const pending = loadFamilyCopyCount(104, false, () => new Promise(resolve => { answer = resolve; }));
        await Promise.resolve();
        vi.stubGlobal('App', { m_CurrentUser: { strSteamID: 'account-b' } });
        answer([{}, {}]); await pending;
        expect(peekFamilyCopyCount(104)).toBeUndefined();
        await loadFamilyCopyCount(104, false, async () => [{}]);
        expect(peekFamilyCopyCount(104)).toBe(1);
    });
    it('never asks Steam for non-Steam shortcuts', async () => {
        const lookup = vi.fn();
        for (const id of [0, -2, 4294967294]) expect(await loadFamilyCopyCount(id, false, lookup)).toBe(0);
        expect(lookup).not.toHaveBeenCalled();
    });
    it('refreshes expired counts without blanking the synchronous value', async () => {
        await loadFamilyCopyCount(105, false, async () => [{}, {}]);
        vi.useFakeTimers(); vi.setSystemTime(Date.now() + 30_001);
        const lookup = vi.fn(async () => []);
        const refresh = loadFamilyCopyCount(105, false, lookup);
        expect(peekFamilyCopyCount(105)).toBe(2);
        await refresh;
        expect(peekFamilyCopyCount(105)).toBe(0);
        expect(lookup).toHaveBeenCalledOnce();
    });

});
