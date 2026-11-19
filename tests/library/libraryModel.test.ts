import { describe, expect, it } from 'vitest';
import { buildTabs, collectionsOf, keepsNative, nextSort, routeChoice, tabGames, warmPriority, type LibGame, type LibrarySnapshot } from '../../src/library/libraryModel';

const g = (appId: number, name: string, extra: Partial<LibGame> = {}): LibGame =>
    ({ appId, name, playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false, shortcut: false, ...extra });
const games = [
    g(1, 'beta', { playedMin: 30, lastPlayed: 100 }),
    g(2, 'Alpha', { playedMin: 300, lastPlayed: 300, installed: true, sizeBytes: 5e9 }),
    g(3, 'gamma', { installed: true, sizeBytes: 9e9 }),
    g(4, 'Delta'),
    g(5, 'epsilon'),
    g(6, 'Shortcut', { shortcut: true }),
];
const fx: LibrarySnapshot = {
    games, installedIds: [2, 3],
    collections: [
        { id: 'favorite', name: 'Favorites', appIds: [2, 4] },
        { id: 'uncategorized', name: 'Uncategorized', appIds: [1, 3] },
        { id: 'local-install', name: 'Locally Installed Games', appIds: [2, 3] },
        { id: 'abc', name: 'Horror', appIds: [2] },
        { id: 'empty1', name: 'Empty', appIds: [] },
    ],
};
const bare: LibrarySnapshot = { games: [g(1, 'a'), g(2, 'b', { installed: true })], installedIds: [2], collections: [] };

describe('buildTabs', () => {
    it('orders tabs: recent, all, installed, collections in Steam order, non-Steam, collections', () =>
        expect(buildTabs(fx).map(t => t.key)).toEqual(['recent', 'all', 'installed', 'col:favorite', 'col:abc', 'nonSteam', 'collections']));
    it('counts: none for recent and collections, the list size otherwise', () =>
        expect(buildTabs(fx).map(t => t.count)).toEqual([null, 5, 2, 2, 1, 1, null]));
    it('labels', () => expect(buildTabs(fx).map(t => t.label)).toEqual(['Recently played', 'All games', 'Installed', 'Favorites', 'Horror', 'Non-Steam', 'Collections']));
    it('leaves out Recently played and Non-Steam when there is nothing for them (Review Focus 1)', () =>
        expect(buildTabs(bare).map(t => t.key)).toEqual(['all', 'installed', 'collections']));
});

describe('Steam\'s own collections (PS5 probe)', () => {
    it('never makes tabs of Steam\'s type- collections such as Soundtracks', () => {
        const s = { ...fx, collections: [...fx.collections, { id: 'type-music', name: 'Soundtracks', appIds: [1] }] };
        expect(buildTabs(s).some(t => t.key === 'col:type-music')).toBe(false);
        expect(routeChoice('/library/collection/type-music', s)).toEqual({ kind: 'native' });
    });
});

describe('tabGames', () => {
    it('recent lists only played games, newest first', () => expect(tabGames(fx, 'recent', 'lastPlayed').map(x => x.appId)).toEqual([2, 1]));
    it('sorts by name, case-insensitive', () => expect(tabGames(fx, 'all', 'name').map(x => x.name)).toEqual(['Alpha', 'beta', 'Delta', 'epsilon', 'gamma']));
    it('All games leaves non-Steam shortcuts to their own tab, as Steam\'s All games does (PS5 probe)', () => expect(tabGames(fx, 'all', 'name').some(x => x.shortcut)).toBe(false));
    it('sorts by playtime, most first, ties by name', () => expect(tabGames(fx, 'all', 'playtime').map(x => x.appId)).toEqual([2, 1, 4, 5, 3]));
    it('sorts by size, largest first', () => expect(tabGames(fx, 'installed', 'size').map(x => x.appId)).toEqual([3, 2]));
    it('sorts by last played, never-played last by name', () => expect(tabGames(fx, 'all', 'lastPlayed').map(x => x.appId)).toEqual([2, 1, 4, 5, 3]));
    it('a collection tab lists its games', () => expect(tabGames(fx, 'col:favorite', 'name').map(x => x.appId)).toEqual([2, 4]));
    it('non-Steam lists shortcuts', () => expect(tabGames(fx, 'nonSteam', 'name').map(x => x.appId)).toEqual([6]));
    it('the Collections tab and unknown tabs list no games', () => {
        expect(tabGames(fx, 'collections', 'name')).toEqual([]);
        expect(tabGames(fx, 'col:nope', 'name')).toEqual([]);
    });
    it('nextSort cycles and wraps', () => {
        expect(nextSort('lastPlayed')).toBe('name');
        expect(nextSort('size')).toBe('lastPlayed');
    });
});

describe('routeChoice', () => {
    it('maps Steam paths', () => {
        expect(routeChoice('/library', fx)).toEqual({ kind: 'ours', tab: null });
        expect(routeChoice('/library/', fx)).toEqual({ kind: 'ours', tab: null });
        expect(routeChoice('/library/tab/AllGames', fx)).toEqual({ kind: 'ours', tab: 'all' });
        expect(routeChoice('/library/tab/Installed', fx)).toEqual({ kind: 'ours', tab: 'installed' });
        expect(routeChoice('/library/tab/Favorites', fx)).toEqual({ kind: 'ours', tab: 'col:favorite' });
        expect(routeChoice('/library/tab/Collections', fx)).toEqual({ kind: 'ours', tab: 'collections' });
        expect(routeChoice('/library/collections', fx)).toEqual({ kind: 'ours', tab: 'collections' });
        expect(routeChoice('/library/tab/DesktopApps', fx)).toEqual({ kind: 'ours', tab: 'nonSteam' });
        expect(routeChoice('/library/collection/abc', fx)).toEqual({ kind: 'ours', tab: 'col:abc' });
        expect(routeChoice('/library/tab/Soundtracks', fx)).toEqual({ kind: 'native' });
        expect(routeChoice('/library/tab/GreatOnDeck', fx)).toEqual({ kind: 'native' });
    });
    it('sends hidden, empty and unknown collections to Steam (Review Focus 2)', () => {
        for (const id of ['uncategorized', 'empty1', 'nope']) expect(routeChoice(`/library/collection/${id}`, fx)).toEqual({ kind: 'native' });
    });
    it('decodes collection ids', () => {
        const s = { ...fx, collections: [{ id: 'a b', name: 'Co-op', appIds: [1] }] };
        expect(routeChoice('/library/collection/a%20b', s)).toEqual({ kind: 'ours', tab: 'col:a b' });
    });
    it('without shortcuts, DesktopApps and Favorites without a favorites collection go to Steam', () => {
        expect(routeChoice('/library/tab/DesktopApps', bare)).toEqual({ kind: 'native' });
        expect(routeChoice('/library/tab/Favorites', bare)).toEqual({ kind: 'native' });
    });
    it('keeps Steam\'s library while in the library or a game page', () => {
        for (const p of ['/library', '/library/tab/AllGames', '/library/collections', '/library/collection/abc', '/library/app/10']) expect(keepsNative(p)).toBe(true);
        for (const p of ['/library/home', '/library/downloads', '/settings', '/store']) expect(keepsNative(p)).toBe(false);
    });
});

describe('collectionsOf', () => {
    it('names a game\'s shown collections in tab order', () => expect(collectionsOf(fx, 2)).toEqual(['Favorites', 'Horror']));
    it('none for a game in no shown collection', () => expect(collectionsOf(fx, 3)).toEqual([]));
});

describe('warmPriority (Michael, PS5 check 2026-11-19)', () => {
    const p = (appId: number, extra: Partial<LibGame> = {}) => g(appId, `n${appId}`, extra);
    const snap: LibrarySnapshot = {
        games: [
            p(1, { lastPlayed: 100, installed: true }),
            p(2, { lastPlayed: 300 }),
            p(3, { lastPlayed: 200, installed: true }),
            p(4),
            p(5, { name: 'a' } as Partial<LibGame>),
            p(6, { lastPlayed: 50, shortcut: true }),
            p(7, { installed: true }),
        ],
        installedIds: [1, 3, 7],
        collections: [{ id: 'abc', name: 'Horror', appIds: [4, 2] }, { id: 'uncategorized', name: 'Uncategorized', appIds: [5, 7] }],
    };
    it('played and installed first, newest first; then played; then in a collection; then the rest', () =>
        expect(warmPriority(snap).map(x => x.appId)).toEqual([3, 1, 2, 6, 4, 5, 7]));
    it('Steam\'s own hidden collections do not count as collections', () =>
        expect(warmPriority(snap).map(x => x.appId).indexOf(5)).toBeGreaterThan(warmPriority(snap).map(x => x.appId).indexOf(4)));
});
