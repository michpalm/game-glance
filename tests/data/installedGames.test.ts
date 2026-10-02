import { describe, expect, it, vi } from 'vitest';
import { InstalledGamesDeps, listInstalledGames } from '../../src/data/installedGames';

const SHORTCUT = 1073741824;

function deps(over: Partial<InstalledGamesDeps> = {}): InstalledGamesDeps {
    return {
        steamInstalled: () => [
            { appid: 2032010, display_name: 'NORCO', app_type: 1 },
            { appid: 9, display_name: 'Tainted Grail Demo', app_type: 8 },
        ],
        shortcuts: () => [
            { appid: 2657861989, display_name: 'Chained Echoes', app_type: SHORTCUT },
            { appid: 4260993573, display_name: 'Diablo III', app_type: SHORTCUT },
            { appid: 3000000001, display_name: 'spotify', app_type: SHORTCUT },
        ],
        launchOptions: vi.fn(async (appId: number) => (appId === 2657861989 ? '"heroic://launch?appName=2067731250&runner=gog"' : '')),
        unifideckStore: vi.fn(async (appId: number) => (appId === 4260993573 ? 'Battle.net' : null)),
        ...over,
    };
}

describe('listInstalledGames', () => {
    it('lists installed Steam games, skipping demos and other non-game items', async () => {
        const games = await listInstalledGames(deps());
        expect(games).toContainEqual({ appId: 2032010, name: 'NORCO', isShortcut: false, heroic: null });
        expect(games.some((g) => g.appId === 9)).toBe(false);
    });
    it('adds shortcuts that Heroic or Unifideck added, but not app shortcuts', async () => {
        const games = await listInstalledGames(deps());
        expect(games).toContainEqual({ appId: 2657861989, name: 'Chained Echoes', isShortcut: true, heroic: { runner: 'gog', appName: '2067731250' } });
        expect(games).toContainEqual({ appId: 4260993573, name: 'Diablo III', isShortcut: true, heroic: null });
        expect(games.some((g) => g.name === 'spotify')).toBe(false);
    });
    it('skips a shortcut it cannot check instead of failing the whole list', async () => {
        const games = await listInstalledGames(deps({
            launchOptions: vi.fn(async () => { throw new Error('no details'); }),
            unifideckStore: vi.fn(async () => { throw new Error('backend not ready'); }),
        }));
        expect(games.map((g) => g.name)).toEqual(['NORCO']);
    });
    it('copes with Steam’s lists being unavailable', async () => {
        const games = await listInstalledGames(deps({ steamInstalled: () => { throw new Error('x'); }, shortcuts: () => [] }));
        expect(games).toEqual([]);
    });
});
