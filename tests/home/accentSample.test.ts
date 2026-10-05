import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadWithTimeout, sampleUrls } from '../../src/home/accentSample';
import { accentFor } from '../../src/home/accent';

afterEach(() => vi.useRealTimers());

describe('loadWithTimeout', () => {
    it('resolves null when the load never settles', async () => {
        vi.useFakeTimers();
        const p = loadWithTimeout<string>(() => undefined, 4000);
        await vi.advanceTimersByTimeAsync(4000);
        expect(await p).toBeNull();
    });
    it('resolves the loaded value', async () => {
        expect(await loadWithTimeout<string>((done) => done('img'), 4000)).toBe('img');
    });
});

describe('sampleUrls', () => {
    it('moves on to the next url after a stalled load', async () => {
        vi.useFakeTimers();
        const load = (url: string) => loadWithTimeout<string>((done) => { if (url === 'b') done('imgB'); }, 4000);
        const p = sampleUrls(['a', 'b'], { load, read: (img) => (img === 'imgB' ? '#112233' : null) });
        await vi.advanceTimersByTimeAsync(4000);
        expect(await p).toBe('#112233');
    });
    it('lets accentFor fall back to the default when every load stalls', async () => {
        vi.useFakeTimers();
        const cache = { get: async () => null, put: async () => undefined, clear: async () => undefined };
        const sample = () => sampleUrls(['a', 'b'], { load: () => loadWithTimeout<string>(() => undefined, 4000), read: () => '#fff000' });
        const p = accentFor(1, { cache: cache as never, sample });
        await vi.advanceTimersByTimeAsync(8000);
        expect(await p).toBe('#5fd1ae');
    });
});
