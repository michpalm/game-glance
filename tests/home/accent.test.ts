import { describe, expect, it, vi } from 'vitest';
import { accentFor, DEFAULT_ACCENT, pickAccent } from '../../src/home/accent';
import { Cache, DAY_MS, TTL } from '../../src/data/cache';

function pixels(...groups: [number[], number][]): number[] {
    return groups.flatMap(([rgb, count]) => Array.from({ length: count }, () => [...rgb, 255]).flat());
}

function hueOf(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    if (d === 0) return 0;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
}

function fakeCache(initial: Record<string, unknown> = {}) {
    const store = new Map<string, { v: unknown; ttl?: number }>(Object.entries(initial).map(([k, v]) => [k, { v }]));
    const cache: Cache = {
        get: vi.fn(async (key: string) => (store.get(key)?.v ?? null) as never),
        put: vi.fn(async (key: string, v: unknown, ttl: number) => void store.set(key, { v, ttl })),
        clear: vi.fn(async () => store.clear()),
    };
    return { cache, store };
}

describe('pickAccent', () => {
    it('picks the dominant saturated hue', () => {
        const hex = pickAccent(pixels([[255, 75, 62], 40], [[40, 80, 230], 5]))!;
        const diff = Math.abs(hueOf(hex) - hueOf('#ff4b3e'));
        expect(Math.min(diff, 360 - diff)).toBeLessThan(20);
    });
    it('ignores grey, dark and washed-out pixels and returns null', () => {
        const grey = pixels([[128, 128, 128], 10], [[20, 5, 5], 10], [[200, 180, 175], 10]);
        expect(pickAccent(grey)).toBeNull();
        expect(pickAccent([])).toBeNull();
    });
    it('prefers the heavier bucket over the larger count of dull pixels', () => {
        const hex = pickAccent(pixels([[130, 110, 60], 20], [[30, 255, 60], 8]))!;
        expect(Math.abs(hueOf(hex) - 130)).toBeLessThan(20);
    });
});

describe('accentFor', () => {
    it('returns the cached value without sampling', async () => {
        const { cache } = fakeCache({ 'accent:7': { color: '#112233' } });
        const sample = vi.fn(async () => '#ffffff');
        expect(await accentFor(7, { cache, sample })).toBe('#112233');
        expect(sample).not.toHaveBeenCalled();
    });
    it('caches a sampled colour for the long TTL', async () => {
        const { cache, store } = fakeCache();
        expect(await accentFor(7, { cache, sample: async () => '#abcdef' })).toBe('#abcdef');
        expect(store.get('accent:7')).toEqual({ v: { color: '#abcdef' }, ttl: TTL.accent });
    });
    it('returns the default and caches a miss for one day when sampling returns null', async () => {
        const { cache, store } = fakeCache();
        expect(await accentFor(7, { cache, sample: async () => null })).toBe(DEFAULT_ACCENT);
        expect(store.get('accent:7')?.ttl).toBe(DAY_MS);
        expect(await accentFor(7, { cache, sample: async () => '#ffffff' })).toBe(DEFAULT_ACCENT);
    });
    it('returns the default when sampling throws and when the cache read throws', async () => {
        const { cache } = fakeCache();
        const boom = async () => { throw new Error('tainted'); };
        expect(await accentFor(7, { cache, sample: boom })).toBe(DEFAULT_ACCENT);
        const broken: Cache = { ...cache, get: async () => { throw new Error('kv'); }, put: async () => { throw new Error('kv'); } };
        expect(await accentFor(7, { cache: broken, sample: async () => '#abcdef' })).toBe('#abcdef');
        expect(await accentFor(7, { cache: broken, sample: boom })).toBe(DEFAULT_ACCENT);
    });
    it('ignores a corrupt cache entry', async () => {
        const { cache } = fakeCache({ 'accent:7': 'garbage' });
        expect(await accentFor(7, { cache, sample: async () => '#abcdef' })).toBe('#abcdef');
    });
});

describe('pickAccent hue straddle', () => {
    it('keeps reds that straddle 0 degrees together', () => {
        const hex = pickAccent(pixels([[255, 0, 43], 6], [[255, 43, 0], 6], [[0, 255, 0], 8]))!;
        const h = hueOf(hex);
        expect(Math.min(h, 360 - h)).toBeLessThan(20);
    });
});

import { contrastRatio, legibleAccent, TEXT_BACKGROUND } from '../../src/home/accent';

describe('legibleAccent (small accent text on the dark glass #0b0d12, 4.5:1)', () => {
    const hue = (c: string) => {
        const n = parseInt(c.slice(1), 16);
        const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
        const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
        if (d === 0) return 0;
        return 60 * (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4);
    };
    const near = (a: number, b: number, tol: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) <= tol;
    it.each(['#8a1c1c', '#7a1313', '#1c2f8a', '#0a2a66', '#5b1a7a', '#2d5a1b', '#8a5a1c', '#3a3a8a'])('%s is lifted to the floor with its hue kept', (c) => {
        const out = legibleAccent(c);
        expect(contrastRatio(out, TEXT_BACKGROUND)).toBeGreaterThanOrEqual(4.5);
        expect(near(hue(out), hue(c), 4)).toBe(true);
        expect(out).not.toBe(c);
    });
    it('a dark red stays red and only just reaches the floor (not washed out to white)', () => {
        const out = legibleAccent('#8a1c1c');
        expect(contrastRatio(out, TEXT_BACKGROUND)).toBeLessThan(5.5);
    });
    it('an already bright accent is returned unchanged (lower-cased)', () => {
        expect(legibleAccent('#5FD1AE')).toBe('#5fd1ae');
        expect(legibleAccent('#ffffff')).toBe('#ffffff');
        expect(legibleAccent('#f39ac0')).toBe('#f39ac0');
    });
    it('pure black becomes a light grey that passes; unusable values give the default accent', () => {
        const out = legibleAccent('#000000');
        expect(contrastRatio(out, TEXT_BACKGROUND)).toBeGreaterThanOrEqual(4.5);
        expect(legibleAccent('nonsense')).toBe('#5fd1ae');
        expect(legibleAccent('#abc')).toBe('#5fd1ae');
    });
    it('honours another floor and background', () => {
        const out = legibleAccent('#8a1c1c', 7);
        expect(contrastRatio(out, TEXT_BACKGROUND)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(legibleAccent('#8a1c1c', 4.5, '#ffffff'), '#ffffff')).toBeGreaterThanOrEqual(1);
    });
});
