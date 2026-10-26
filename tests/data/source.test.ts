import { describe, expect, it, vi } from 'vitest';
import { getSourceLabel } from '../../src/data/source';

describe('getSourceLabel', () => {
    it('labels Steam games without asking the backend', async () => {
        const lookup = vi.fn();
        expect(await getSourceLabel(292030, false, lookup)).toBe('Steam');
        expect(lookup).not.toHaveBeenCalled();
    });
    it('uses the backend label for shortcuts and memoizes it', async () => {
        const lookup = vi.fn(async () => 'Epic');
        expect(await getSourceLabel(3000000001, true, lookup)).toBe('Epic');
        expect(await getSourceLabel(3000000001, true, lookup)).toBe('Epic');
        expect(lookup).toHaveBeenCalledOnce();
    });
    it('falls back to Non-Steam on null or errors', async () => {
        expect(await getSourceLabel(3000000002, true, async () => null)).toBe('Non-Steam');
        expect(await getSourceLabel(3000000003, true, async () => { throw new Error('x'); })).toBe('Non-Steam');
    });
});

describe('getSourceLabel after a backend failure', () => {
    it('retries on the next call instead of remembering Non-Steam', async () => {
        const lookup = vi.fn().mockRejectedValueOnce(new Error('not ready')).mockResolvedValueOnce('GOG');
        expect(await getSourceLabel(3000000004, true, lookup)).toBe('Non-Steam');
        expect(await getSourceLabel(3000000004, true, lookup)).toBe('GOG');
    });
});

describe('getSourceLabel for games Heroic added', () => {
    it('names the Heroic store when Unifideck has no record of the game', async () => {
        expect(await getSourceLabel(3000000005, true, async () => null, 'GOG')).toBe('GOG');
    });
    it('keeps Unifideck’s label when it has one', async () => {
        expect(await getSourceLabel(3000000006, true, async () => 'Epic', 'GOG')).toBe('Epic');
    });
    it('uses the Heroic store while the backend is unavailable', async () => {
        expect(await getSourceLabel(3000000007, true, async () => { throw new Error('x'); }, 'Amazon')).toBe('Amazon');
    });
});

describe('source labels on the selection render', () => {
    it('knows Steam synchronously and exposes a resolved shortcut without another loading frame', async () => {
        const { peekSourceLabel } = await import('../../src/data/source');
        expect(peekSourceLabel(292030, false)).toBe('Steam');
        expect(peekSourceLabel(3000000101, true)).toBeUndefined();
        await getSourceLabel(3000000101, true, async () => 'GOG');
        expect(peekSourceLabel(3000000101, true)).toBe('GOG');
        expect(peekSourceLabel(3000000102, true)).toBeUndefined();
    });
    it('does not preserve a temporary failure as a known shortcut store', async () => {
        const { peekSourceLabel } = await import('../../src/data/source');
        await getSourceLabel(3000000103, true, async () => { throw Error('offline'); });
        expect(peekSourceLabel(3000000103, true)).toBeUndefined();
    });
});
