import { describe, expect, it, vi } from 'vitest';
import { createLibraryBindings, SHORTCUT_APP_TYPE } from '../../src/library/steamLibrary';

const ov = (appid: number, extra: Record<string, unknown> = {}) => ({ appid, display_name: `Game ${appid}`, minutes_playtime_forever: 0, rt_last_time_played: 0, ...extra });
const w3 = ov(292030, { display_name: 'The Witcher 3', minutes_playtime_forever: 2563, rt_last_time_played: 1794495475, size_on_disk: '69795378546' });
const store = (extra: Record<string, unknown> = {}) => ({
    allGamesCollection: { allApps: [w3, ov(10), ov(11)] },
    localGamesCollection: { allApps: [w3] },
    allAppsCollection: { allApps: [w3, ov(10), ov(11), ov(99, { app_type: SHORTCUT_APP_TYPE, display_name: 'Emu' }), ov(98, { app_type: 2048 })] },
    userCollections: [
        { id: 'favorite', displayName: 'Favorites', allApps: [w3, ov(500)] },
        { id: 'abc', displayName: 'Horror', allApps: [ov(10)] },
    ],
    BIsHidden: (id: number) => id === 11,
    ...extra,
});

describe('createLibraryBindings', () => {
    it('is unavailable without Steam\'s all-games collection', () => {
        const b = createLibraryBindings({}, {});
        expect(b.available()).toBe(false);
        expect(b.read()).toBeNull();
    });
    it('reads games, shortcuts, installed ids and collections', () => {
        const s = createLibraryBindings(store(), {}).read()!;
        expect(s.games).toEqual([
            { appId: 292030, name: 'The Witcher 3', playedMin: 2563, lastPlayed: 1794495475, sizeBytes: 69795378546, installed: true, shortcut: false },
            { appId: 10, name: 'Game 10', playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false, shortcut: false },
            { appId: 99, name: 'Emu', playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false, shortcut: true },
        ]);
        expect(s.installedIds).toEqual([292030]);
        expect(s.collections).toEqual([{ id: 'favorite', name: 'Favorites', appIds: [292030] }, { id: 'abc', name: 'Horror', appIds: [10] }]);
    });
    it('leaves hidden games out of games and collections', () => {
        const s = createLibraryBindings(store({ BIsHidden: (id: number) => id === 10 }), {}).read()!;
        expect(s.games.map(g => g.appId)).toEqual([292030, 11, 99]);
        expect(s.collections[1].appIds).toEqual([]);
    });
    it('a store that throws mid-read gives null and logs once (Review Focus 4)', () => {
        const log = vi.fn();
        const broken = store();
        Object.defineProperty(broken, 'userCollections', { get() { throw new Error('changed'); } });
        const b = createLibraryBindings(broken, {}, log);
        expect(b.read()).toBeNull();
        expect(b.read()).toBeNull();
        expect(log).toHaveBeenCalledTimes(1);
    });
});
