import { describe, expect, it } from 'vitest';
import { collectionEyebrow, homeCollections, pickCollectionGames, ROW_SORTS, rowSortLabel, rowSortOf } from '../../src/home/collections';
import type { RawApp } from '../../src/home/recents';

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
