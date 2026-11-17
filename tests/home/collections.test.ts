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

describe('All installed games (Steam and non-Steam together)', () => {
    // Steam's Locally Installed Games holds no shortcuts (steam-home-ally.json): they come from the whole library.
    const localGames = [app(1, 'Hades', { rt_last_time_played: 100 }), app(2, 'Celeste', { rt_last_time_played: 0, rt_purchased_time: 5 }), { appid: 3, display_name: 'Proton', app_type: 4 }];
    const library = [
        ...localGames,
        app(4, 'Not installed', { rt_last_time_played: 900 }),
        app(5, 'Mario (Dolphin)', { app_type: SHORTCUT, rt_last_time_played: 300 } as never),
        app(6, 'Zelda (Yuzu)', { app_type: SHORTCUT, rt_last_time_played: 50 } as never),
        app(7, 'Hidden shortcut', { app_type: SHORTCUT, rt_last_time_played: 999 } as never),
    ];
    const g = globalThis as Record<string, unknown>;
    afterEach(() => {
        delete g.collectionStore;
        delete g.appStore;
    });
    const stubSteam = (local: unknown[], all: unknown[], collections: unknown[] = []) => {
        g.collectionStore = { localGamesCollection: { allApps: local }, userCollections: collections, BIsHidden: (id: number) => id === 7 };
        g.appStore = { allApps: all };
    };

    it('takes Steam\'s installed apps and every shortcut in the library, each once, never uninstalled Steam games', () => {
        expect(installedRowApps(localGames, library).map((a) => a.appid)).toEqual([1, 2, 3, 5, 6, 7]);
        expect(installedRowApps(localGames, [...library, library[4]]).map((a) => a.appid)).toEqual([1, 2, 3, 5, 6, 7]);
    });
    it('survives junk and a missing list', () => {
        expect(installedRowApps(undefined, [null, 7, { appid: 'x', app_type: SHORTCUT }, library[4]]).map((a) => a.appid)).toEqual([5]);
        expect(installedRowApps(localGames, undefined).map((a) => a.appid)).toEqual([1, 2, 3]);
    });
    it('is offered right after Steam\'s own collections, only with games to show', () => {
        const list = [{ id: 'favorite', name: 'Favorites', count: 1 }, { id: 'local-install', name: 'Locally Installed Games', count: 2 }, { id: 'uc-a', name: 'Backlog', count: 3 }];
        expect(withInstalledRow(list, 4).map((c) => c.id)).toEqual(['favorite', 'local-install', INSTALLED_ROW, 'uc-a']);
        expect(withInstalledRow(list.slice(2), 4).map((c) => c.id)).toEqual([INSTALLED_ROW, 'uc-a']);
        expect(withInstalledRow(list, 0)).toBe(list);
    });
    it('the picker counts the games, demos and shortcuts it would show', () => {
        stubSteam(localGames, library, [coll('local-install', 'Installed', localGames)]);
        expect(steamHomeCollections()).toEqual([
            { id: 'local-install', name: 'Locally Installed Games', count: 3 },
            { id: INSTALLED_ROW, name: 'All installed games', count: 5 },
        ]);
    });
    it('Home\'s row shows Steam and non-Steam games together, sorted, without hidden games or tools', () => {
        stubSteam(localGames, library);
        const row = readRowGames(INSTALLED_ROW, 'lastPlayed');
        expect(row.collection).toBe('All installed games');
        expect(row.games.map((x) => [x.appId, x.shortcut])).toEqual([[5, true], [1, false], [6, true], [2, false]]);
        expect(readRowGames(INSTALLED_ROW, 'name').games.map((x) => x.name)).toEqual(['Celeste', 'Hades', 'Mario (Dolphin)', 'Zelda (Yuzu)']);
    });
    it('with nothing installed, Home falls back to the recent games', () => {
        stubSteam([], []);
        expect(readRowGames(INSTALLED_ROW, 'lastPlayed')).toEqual({ games: [], collection: null });
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
