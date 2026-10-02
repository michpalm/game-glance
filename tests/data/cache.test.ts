import { describe, expect, it, vi } from 'vitest';
import { createCache, createOverrides, DAY_MS } from '../../src/data/cache';
import { memoryKv } from '../../src/data/kv';

describe('cache', () => {
    it('returns values until they expire', async () => {
        let now = 1_000;
        const cache = createCache(memoryKv(), () => now);
        await cache.put('k', { a: 1 }, DAY_MS);
        expect(await cache.get('k')).toEqual({ a: 1 });
        now += DAY_MS;
        expect(await cache.get('k')).toBeNull();
    });
    it('ignores corrupt entries', async () => {
        const kv = memoryKv();
        await kv.set('cache:k', 'garbage');
        expect(await createCache(kv).get('k')).toBeNull();
    });
    it('clear removes cached data but keeps overrides', async () => {
        const kv = memoryKv();
        const cache = createCache(kv);
        const overrides = createOverrides(kv);
        await cache.put('k', 1, DAY_MS);
        await overrides.set(42, 10270);
        await cache.clear();
        expect(await cache.get('k')).toBeNull();
        expect(await overrides.get(42)).toBe(10270);
    });
});

describe('overrides', () => {
    it('removes only the exact app id and notifies listeners', async () => {
        const overrides = createOverrides(memoryKv());
        const listener = vi.fn();
        overrides.subscribe(listener);
        await overrides.set(1, 11);
        await overrides.set(12, 22);
        await overrides.remove(1);
        expect(await overrides.get(1)).toBeNull();
        expect(await overrides.get(12)).toBe(22);
        expect(listener).toHaveBeenCalledTimes(3);
        expect(overrides.version()).toBe(3);
    });
    it('treats invalid stored values as no override', async () => {
        const kv = memoryKv();
        await kv.set('override:hltb:5', 'abc');
        expect(await createOverrides(kv).get(5)).toBeNull();
    });
});
