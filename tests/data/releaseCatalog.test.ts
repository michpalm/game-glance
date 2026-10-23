import { describe, expect, it, vi } from 'vitest';
import { createCache, DAY_MS } from '../../src/data/cache';
import { memoryKv } from '../../src/data/kv';
import { createReleaseCatalog, pickVersionCatalog } from '../../src/data/releaseCatalog';

const release = (version: string, extra = {}) => ({ tag_name: `v${version}`, draft: false, prerelease: false,
    assets: [{ name: 'game-glance.zip', browser_download_url: `https://github.com/michpalm/game-glance/releases/download/v${version}/game-glance.zip` }], ...extra });

describe('version catalog', () => {
    it('keeps every installable stable version from 3.5.0, sorted numerically', () => {
        const rows = ['3.4.1', '3.5.0', '3.5.2', '3.10.0', '4.0.0'].map((v) => release(v));
        rows.push(release('5.0.0-rc.1'), release('5.0.0', { draft: true }), release('6.0.0', { prerelease: true }), release('7.0.0', { assets: [] }));
        expect(pickVersionCatalog([...rows, null, { tag_name: 'latest' }, release('3.5.0')]).map((r) => r.version))
            .toEqual(['4.0.0', '3.10.0', '3.5.2', '3.5.0']);
    });
    it('reads all pages, including an empty page after an exactly full page', async () => {
        const pages: number[] = [];
        const full = Array.from({ length: 100 }, (_, i) => release(`4.0.${i}`));
        const catalog = createReleaseCatalog(async (page) => { pages.push(page); return page === 1 ? full : page === 2 ? [release('3.5.0')] : []; }, createCache(memoryKv()));
        expect((await catalog.load()).releases.at(-1)?.version).toBe('3.5.0');
        expect(pages).toEqual([1, 2]);
        const exactPages: number[] = [];
        await createReleaseCatalog(async (page) => { exactPages.push(page); return page === 1 ? full : []; }, createCache(memoryKv())).load();
        expect(exactPages).toEqual([1, 2]);
    });
    it('retains a complete catalog across restarts when a later page fails', async () => {
        let now = 100;
        const store = createCache(memoryKv(), () => now);
        await createReleaseCatalog(async () => [release('3.5.0')], store).load();
        now += DAY_MS + 1;
        const fetch = vi.fn(async (page: number) => {
            if (page === 2) throw Error('offline');
            return Array.from({ length: 100 }, () => release('4.0.0'));
        });
        expect(await createReleaseCatalog(fetch, store).load()).toMatchObject({ stale: true, releases: [{ version: '3.5.0' }] });
    });
    it('shares in-flight work, reuses fresh results, and allows explicit refresh', async () => {
        const fetch = vi.fn(async () => [release('3.5.0')]);
        const catalog = createReleaseCatalog(fetch, createCache(memoryKv()));
        await Promise.all([catalog.load(), catalog.load(true)]);
        expect(fetch).toHaveBeenCalledTimes(1);
        await catalog.load();
        expect(fetch).toHaveBeenCalledTimes(1);
        await catalog.load(true);
        expect(fetch).toHaveBeenCalledTimes(2);
    });
    it('rejects invalid pages with no previous list, but accepts a complete empty list', async () => {
        await expect(createReleaseCatalog(async () => ({ message: 'rate limited' }), createCache(memoryKv())).load()).rejects.toThrow();
        await expect(createReleaseCatalog(async (page) => {
            if (page === 2) throw Error('later page');
            return Array.from({ length: 100 }, () => release('4.0.0'));
        }, createCache(memoryKv())).load()).rejects.toThrow('later page');
        expect(await createReleaseCatalog(async () => [], createCache(memoryKv())).load()).toEqual({ releases: [], stale: false });
    });
});

it('deduplicates equivalent shortened tags and prefers the first installable asset', () => {
    const first = release('3.5.0');
    const shorter = release('3.5');
    expect(pickVersionCatalog([first, shorter])).toEqual([{ version: '3.5.0', url: first.assets[0].browser_download_url, sha256: '' }]);
});
