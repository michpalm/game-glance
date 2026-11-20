import { describe, expect, it, vi } from 'vitest';
import { createCache } from '../../src/data/cache';
import { InstalledGame } from '../../src/data/installedGames';
import { memoryKv } from '../../src/data/kv';
import { prefetchGameData, PrefetchGameDeps } from '../../src/data/prefetchGame';

const NORCO: InstalledGame = { appId: 2032010, name: 'NORCO', isShortcut: false, heroic: null };
const ECHOES: InstalledGame = { appId: 2657861989, name: 'Chained Echoes', isShortcut: true, heroic: { runner: 'gog', appName: '2067731250' } };
const DIABLO: InstalledGame = { appId: 4260993573, name: 'Diablo III', isShortcut: true, heroic: null };

function deps(over: Partial<PrefetchGameDeps> = {}): PrefetchGameDeps {
    return {
        hltb: vi.fn(async () => ({ status: 'found' as const, fetched: false })),
        cache: createCache(memoryKv()),
        steamDescription: vi.fn(async () => 'Steam text'),
        shortcutDescription: vi.fn(async () => 'Shortcut text'),
        shortcutCached: vi.fn(async () => false),
        proton: null,
        ...over,
    };
}

describe('prefetchGameData', () => {
    it('loads the times and the Steam description of a Steam game, in the Steam language', async () => {
        const d = deps();
        expect(await prefetchGameData(NORCO, 'swedish', d)).toEqual({ status: 'found', fetched: true });
        expect(d.hltb).toHaveBeenCalledWith(NORCO);
        expect(d.steamDescription).toHaveBeenCalledWith(2032010, 'swedish');
    });
    it('skips a description that is already cached', async () => {
        const d = deps();
        await d.cache.put('desc:2032010:english', { text: 'Cached' }, 1000);
        expect(await prefetchGameData(NORCO, 'english', d)).toEqual({ status: 'found', fetched: false });
        expect(d.steamDescription).not.toHaveBeenCalled();
    });
    it('loads shortcut descriptions; Heroic ones are read locally, so no pause is needed', async () => {
        const d = deps();
        expect(await prefetchGameData(ECHOES, 'english', d)).toEqual({ status: 'found', fetched: false });
        expect(d.shortcutDescription).toHaveBeenCalledWith(ECHOES, 'english');
        expect(await prefetchGameData(DIABLO, 'english', d)).toEqual({ status: 'found', fetched: true });
    });
    it("a shortcut whose Steam match and description are cached goes nowhere, so no pause (#48: 500 cached Unifideck games took 8 minutes)", async () => {
        const d = deps({ shortcutCached: vi.fn(async () => true) });
        expect(await prefetchGameData(DIABLO, 'english', d)).toEqual({ status: 'found', fetched: false });
        expect(d.shortcutCached).toHaveBeenCalledWith(DIABLO, 'english');
    });
    it('stops at the times when HowLongToBeat is unreachable (offline)', async () => {
        const d = deps({ hltb: vi.fn(async () => ({ status: 'unavailable' as const, fetched: true })) });
        expect(await prefetchGameData(NORCO, 'english', d)).toEqual({ status: 'unavailable', fetched: true });
        expect(d.steamDescription).not.toHaveBeenCalled();
    });
    it('still reports the times when the description fails', async () => {
        const d = deps({ steamDescription: vi.fn(async () => { throw new Error('store down'); }) });
        expect(await prefetchGameData(NORCO, 'english', d)).toEqual({ status: 'found', fetched: true });
    });
});

describe('prefetchGameData: ProtonDB', () => {
    it("caches a Steam game's rating when ProtonDB is in a slot, and counts going online", async () => {
        const proton = vi.fn(async () => ({ fetched: true }));
        const d = deps({ proton, hltb: vi.fn(async () => ({ status: 'found' as const, fetched: false })) });
        await d.cache.put('desc:2032010:english', { text: 'x' }, 1e9);
        expect(await prefetchGameData(NORCO, 'english', d)).toEqual({ status: 'found', fetched: true });
        expect(proton).toHaveBeenCalledWith(NORCO);
    });
    it('a cached rating costs nothing', async () => {
        const d = deps({ proton: vi.fn(async () => ({ fetched: false })), hltb: vi.fn(async () => ({ status: 'found' as const, fetched: false })) });
        await d.cache.put('desc:2032010:english', { text: 'x' }, 1e9);
        expect(await prefetchGameData(NORCO, 'english', d)).toEqual({ status: 'found', fetched: false });
    });
    it('for a non-Steam game too (its Steam match is asked), never when ProtonDB is in no slot (null)', async () => {
        const proton = vi.fn(async () => ({ fetched: true }));
        await prefetchGameData(DIABLO, 'english', deps({ proton }));
        expect(proton).toHaveBeenCalledWith(DIABLO);
        expect((await prefetchGameData(NORCO, 'english', deps({ proton: null }))).status).toBe('found');
    });
    it('a ProtonDB failure does not fail the game', async () => {
        const d = deps({ proton: vi.fn(async () => { throw new Error('down'); }) });
        expect((await prefetchGameData(NORCO, 'english', d)).status).toBe('found');
    });
});
