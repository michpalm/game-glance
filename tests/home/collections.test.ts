import { afterEach, describe, expect, it } from 'vitest';
import { collectionEyebrow, homeCollections, INSTALLED_ROW, installedRowApps, pickCollectionGames, ROW_SORTS, rowSortLabel, rowSortOf, steamHomeCollections, withInstalledRow } from '../../src/home/collections';
import type { RawApp } from '../../src/home/recents';
import { readRowGames } from '../../src/home/useHomeData';

const GAME = 1;
const SHORTCUT = 1073741824;
const app = (appid: number, display_name: string, extra: Partial<RawApp & { sort_as: string }> = {}) => ({ appid, display_name, app_type: GAME, ...extra });
const coll = (id: string, displayName: string, apps: unknown[]) => ({ id, displayName, allApps: apps });

describe('homeCollections (the Games row picker)', () => {
    // The Ally's collections (2026-10-09): Steam's own, the user's, Steam ROM Manager's empty ones, soundtracks, uncategorized.
    const user = [
        coll('favorite', 'Favorites', [app(1, 'A')]),
        coll('local-install', 'Installed', [app(2, 'B')]),
        coll('uc-b', 'Backlog', [app(3, 'C'), app(4, 'D')]),
        coll('srm-x', 'Nintendo GameCube', []),
        coll('uc-a', 'Playing', [app(5, 'E')]),
        coll('type-music', 'Soundtracks', [app(6, 'F')]),
        coll('uncategorized', 'Uncategorized', [app(7, 'G')]),
    ];
    it('lists Favorites and Installed first, then the user\'s collections by name, without empty ones, soundtracks or Uncategorized', () => {
        // Steam's own two are named by Steam's tokens (their stored names keep the language they were made in); the user's as typed.
        expect(homeCollections(user)).toEqual([
            { id: 'favorite', name: 'Favorites', count: 1 },
            { id: 'local-install', name: 'Locally Installed Games', count: 1 },
            { id: 'uc-b', name: 'Backlog', count: 2 },
            { id: 'uc-a', name: 'Playing', count: 1 },
        ]);
    });
    it('survives junk', () => {
        expect(homeCollections(undefined)).toEqual([]);
        expect(homeCollections([null, 7, { id: 'x' }, coll('uc-z', '', [app(1, 'A')]), coll('', 'No id', [app(1, 'A')])] as unknown[])).toEqual([]);
    });
});

describe('pickCollectionGames', () => {
    const apps = [
        app(1, 'Zelda-like', { rt_last_time_played: 100, rt_purchased_time: 10, sort_as: 'zelda-like' }),
        app(2, 'Alpha', { rt_last_time_played: 300, rt_purchased_time: 20, sort_as: 'alpha' }),
        app(3, 'Middle', { rt_last_time_played: 0, rt_purchased_time: 50, sort_as: 'middle' }),
        app(4, 'Beta', { rt_last_time_played: 0, rt_purchased_time: 40, sort_as: 'beta' }),
        app(5, 'Hidden', { rt_last_time_played: 999, rt_purchased_time: 99 }),
        { appid: 6, display_name: 'Soundtrack', app_type: 8192 },
        app(7, 'The Shortcut', { app_type: SHORTCUT, rt_last_time_played: 200, sort_as: 'shortcut' } as never),
    ];
    const hidden = (id: number) => id === 5;
    it('last played: played games newest first, then never-played ones newest added first; no hidden games or non-games', () => {
        expect(pickCollectionGames(apps, hidden, 'lastPlayed').map((g) => g.appId)).toEqual([2, 7, 1, 3, 4]);
    });
    it('alphabetical, by Steam\'s sort name (so "The" does not count)', () => {
        expect(pickCollectionGames(apps, hidden, 'name').map((g) => g.appId)).toEqual([2, 4, 3, 7, 1]);
    });
    it('recently added first', () => {
        expect(pickCollectionGames(apps, hidden, 'added').map((g) => g.appId)).toEqual([3, 4, 2, 1, 7]);
    });
    it('keeps demos (Steam\'s app type 8) with the games, and still drops tools and soundtracks', () => {
        const withDemo = [...apps, app(8, 'A Demo', { app_type: 8, rt_last_time_played: 250 }), app(9, 'Proton', { app_type: 4, rt_last_time_played: 260 })];
        expect(pickCollectionGames(withDemo, hidden, 'lastPlayed').map((g) => g.appId)).toEqual([2, 8, 7, 1, 3, 4]);
    });
    it('keeps at most the limit, and never marks games NEW', () => {
        const picked = pickCollectionGames(apps, hidden, 'lastPlayed', 2);
        expect(picked).toHaveLength(2);
        expect(picked.every((g) => !g.isNew)).toBe(true);
    });
    it('a failing hidden check keeps the collection\'s games (it must not empty Home)', () => {
        expect(pickCollectionGames(apps.slice(0, 2), () => {
            throw new Error('x');
        }, 'name').map((g) => g.appId)).toEqual([2, 1]);
    });
});

describe('All installed games', () => {
    const localGames = [app(1, 'Steam installed', { rt_last_time_played: 10 }), app(2, 'Steam uninstalled', { rt_last_time_played: 50 })];
    const library = [...localGames, app(3, 'Shortcut', { app_type: SHORTCUT, rt_last_time_played: 30 } as never)];
    const globals = globalThis as Record<string, unknown>;
    afterEach(() => {
        delete globals.collectionStore;
        delete globals.appStore;
    });

    it('keeps Steam’s Locally Installed Games collection unchanged and adds a distinct shortcut-aware choice after it', () => {
        const steamCollections = [coll('local-install', 'Installed', [localGames[0]]), coll('uc-backlog', 'Backlog', [localGames[1]])];
        expect(homeCollections(steamCollections)).toEqual([
            { id: 'local-install', name: 'Locally Installed Games', count: 1 },
            { id: 'uc-backlog', name: 'Backlog', count: 1 },
        ]);
        expect(withInstalledRow(homeCollections(steamCollections), 2)).toEqual([
            { id: 'local-install', name: 'Locally Installed Games', count: 1 },
            { id: INSTALLED_ROW, name: 'All installed games', count: 2 },
            { id: 'uc-backlog', name: 'Backlog', count: 1 },
        ]);
    });

    it('uses Steam’s installed apps plus non-Steam shortcuts for the new choice, without adding uninstalled Steam games', () => {
        expect(installedRowApps([localGames[0]], library).map(a => a.appid)).toEqual([1, 3]);
    });

    it('renders Steam’s collection as before and the new choice with the shortcut', () => {
        globals.collectionStore = {
            localGamesCollection: { allApps: [localGames[0]] },
            userCollections: [coll('local-install', 'Installed', [localGames[0]])],
            BIsHidden: () => false,
        };
        globals.appStore = { allApps: library };
        expect(steamHomeCollections().map(c => c.id)).toEqual(['local-install', INSTALLED_ROW]);
        expect(readRowGames('local-install', 'lastPlayed').games.map(g => g.appId)).toEqual([1]);
        expect(readRowGames(INSTALLED_ROW, 'lastPlayed').games.map(g => g.appId)).toEqual([3, 1]);
    });
});

describe('rowSortOf / collectionEyebrow', () => {
    it('names the sorts as Steam\'s library does', () => {
        expect(ROW_SORTS.map(rowSortLabel)).toEqual(['Last Played', 'Alphabetical', 'Date Added to Library']);
    });
    it('reads a stored sort, anything else is last played', () => {
        expect(ROW_SORTS).toEqual(['lastPlayed', 'name', 'added']);
        expect(rowSortOf('name')).toBe('name');
        expect(rowSortOf('bogus')).toBe('lastPlayed');
        expect(rowSortOf(undefined)).toBe('lastPlayed');
    });
    it('puts the collection\'s name before the game\'s line', () => {
        expect(collectionEyebrow('Backlog', 'Last played · Yesterday')).toBe('Backlog · Last played · Yesterday');
        expect(collectionEyebrow(null, 'Last played · Yesterday')).toBe('Last played · Yesterday');
    });
});
