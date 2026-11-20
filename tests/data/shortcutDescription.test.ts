import { describe, expect, it, vi } from 'vitest';
import { createCache } from '../../src/data/cache';
import { memoryKv } from '../../src/data/kv';
import { findSteamAppId, getShortcutDescription, shortcutDescriptionCached, ShortcutDescriptionDeps } from '../../src/data/shortcutDescription';

const search = (items: Array<{ type?: string; id: number; name: string }>) => ({ status: 200, json: async () => ({ total: items.length, items }) });

const ECHOES = [
    { type: 'app', id: 1229240, name: 'Chained Echoes' },
    { type: 'app', id: 3350260, name: 'Chained Echoes: Ashes of Elrant' },
];

function deps(over: Partial<ShortcutDescriptionDeps> = {}): ShortcutDescriptionDeps {
    return {
        cache: createCache(memoryKv()),
        heroicDescription: vi.fn(async () => null),
        fetcher: vi.fn(async () => search(ECHOES)),
        steamDescription: vi.fn(async (appId: number) => `Steam text for ${appId}`),
        ...over,
    };
}

describe('getShortcutDescription for games Heroic added', () => {
    it('uses Heroic’s cached description without going online', async () => {
        const d = deps({ heroicDescription: vi.fn(async () => 'Take up your <b>sword</b>.') });
        const text = await getShortcutDescription({ name: 'Chained Echoes', heroic: { runner: 'gog', appName: '2067731250' } }, 'english', d);
        expect(text).toBe('Take up your sword.');
        expect(d.heroicDescription).toHaveBeenCalledWith('gog', '2067731250');
        expect(d.fetcher).not.toHaveBeenCalled();
    });
    it('falls back to Steam when Heroic has no text or fails', async () => {
        const empty = deps({ heroicDescription: vi.fn(async () => '  ') });
        expect(await getShortcutDescription({ name: 'Chained Echoes', heroic: { runner: 'gog', appName: '1' } }, 'english', empty)).toBe('Steam text for 1229240');
        const failing = deps({ heroicDescription: vi.fn(async () => { throw new Error('backend not ready'); }) });
        expect(await getShortcutDescription({ name: 'Chained Echoes', heroic: { runner: 'gog', appName: '1' } }, 'english', failing)).toBe('Steam text for 1229240');
    });
});

describe('getShortcutDescription for other shortcuts', () => {
    it('gets the Steam description, in the Steam language, of the game with exactly the same name', async () => {
        const d = deps();
        expect(await getShortcutDescription({ name: 'Chained Echoes', heroic: null }, 'swedish', d)).toBe('Steam text for 1229240');
        expect(d.steamDescription).toHaveBeenCalledWith(1229240, 'swedish');
        expect(d.heroicDescription).not.toHaveBeenCalled();
    });
    it('shows nothing when Steam has no game with that exact name', async () => {
        const d = deps({ fetcher: vi.fn(async () => search([{ type: 'app', id: 9, name: 'Diablo IV' }])) });
        expect(await getShortcutDescription({ name: 'Diablo III', heroic: null }, 'english', d)).toBeNull();
        expect(d.steamDescription).not.toHaveBeenCalled();
    });
    it('shows nothing for a shortcut without a name', async () => {
        const d = deps();
        expect(await getShortcutDescription({ name: '  ', heroic: null }, 'english', d)).toBeNull();
        expect(d.fetcher).not.toHaveBeenCalled();
    });
});

describe('findSteamAppId', () => {
    it('searches the Steam store by name', async () => {
        const d = deps();
        expect(await findSteamAppId('Chained Echoes', d)).toBe(1229240);
        expect(d.fetcher).toHaveBeenCalledWith('https://store.steampowered.com/api/storesearch/?term=Chained%20Echoes&l=english&cc=US');
    });
    it('ignores results that are not games', async () => {
        const d = deps({ fetcher: vi.fn(async () => search([{ type: 'bundle', id: 5, name: 'Chained Echoes' }])) });
        expect(await findSteamAppId('Chained Echoes', d)).toBeNull();
    });
    it('remembers matches and misses, so the search runs once', async () => {
        const d = deps();
        await findSteamAppId('Chained Echoes', d);
        expect(await findSteamAppId('Chained Echoes', d)).toBe(1229240);
        const miss = deps({ fetcher: vi.fn(async () => search([])) });
        await findSteamAppId('Diablo III', miss);
        expect(await findSteamAppId('Diablo III', miss)).toBeNull();
        expect(d.fetcher).toHaveBeenCalledOnce();
        expect(miss.fetcher).toHaveBeenCalledOnce();
    });
    it('does not remember network failures', async () => {
        const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: 503, json: async () => ({}) });
        const d = deps({ fetcher });
        expect(await findSteamAppId('Chained Echoes', d)).toBeNull();
        expect(await findSteamAppId('Chained Echoes', d)).toBeNull();
        expect(fetcher).toHaveBeenCalledTimes(2);
    });
    it('copes with odd responses and a failing cache', async () => {
        const broken = { get: vi.fn(async () => { throw new Error('x'); }), put: vi.fn(async () => { throw new Error('x'); }), clear: vi.fn() };
        expect(await findSteamAppId('Chained Echoes', deps({ cache: broken }))).toBe(1229240);
        expect(await findSteamAppId('Chained Echoes', deps({ fetcher: vi.fn(async () => ({ status: 200, json: async () => ({ items: 'nope' }) })) }))).toBeNull();
    });
});

describe('findSteamAppId keeps matches', () => {
    it('remembers a found match for a year, but a miss only for a day', async () => {
        const clock = { t: 0 };
        const cache = createCache(memoryKv(), () => clock.t);
        const d = deps({ cache });
        await findSteamAppId('Chained Echoes', d);
        clock.t += 300 * 86_400_000;
        expect(await findSteamAppId('Chained Echoes', d)).toBe(1229240);
        expect(d.fetcher).toHaveBeenCalledOnce();
        const miss = deps({ cache, fetcher: vi.fn(async () => search([])) });
        await findSteamAppId('Diablo III', miss);
        clock.t += 86_400_000 + 1;
        await findSteamAppId('Diablo III', miss);
        expect(miss.fetcher).toHaveBeenCalledTimes(2);
    });
});

describe('shortcutDescriptionCached', () => {
    const game = { name: 'Diablo III', heroic: null };
    it("true when its Steam match is known and that game's description is cached, or no match was found (a remembered miss)", async () => {
        const cache = createCache(memoryKv());
        expect(await shortcutDescriptionCached(game, 'english', cache)).toBe(false);
        await cache.put('steammatch:diablo iii', { id: 200 }, 1000);
        expect(await shortcutDescriptionCached(game, 'english', cache)).toBe(false);
        await cache.put('desc:200:english', { text: 'Hell' }, 1000);
        expect(await shortcutDescriptionCached(game, 'english', cache)).toBe(true);
        expect(await shortcutDescriptionCached(game, 'swedish', cache)).toBe(false);
        const miss = createCache(memoryKv());
        await miss.put('steammatch:diablo iii', { id: null }, 1000);
        expect(await shortcutDescriptionCached(game, 'english', miss)).toBe(true);
    });
    it('a nameless game goes nowhere: cached', async () => {
        expect(await shortcutDescriptionCached({ name: '  ', heroic: null }, 'english', createCache(memoryKv()))).toBe(true);
    });
});

describe('cachedSteamAppId', () => {
    it('reads the remembered match only: id, null for a miss, undefined when never asked', async () => {
        const { cachedSteamAppId } = await import('../../src/data/shortcutDescription');
        const store = new Map<string, unknown>([['steammatch:the messenger', { id: 764790 }], ['steammatch:pathologic', { id: null }]]);
        const cache = { get: async (key: string) => (store.has(key) ? store.get(key) : null) } as never;
        expect(await cachedSteamAppId('The Messenger ', cache)).toBe(764790);
        expect(await cachedSteamAppId('Pathologic', cache)).toBeNull();
        expect(await cachedSteamAppId('Unknown', cache)).toBeUndefined();
    });
});
