import { describe, expect, it } from 'vitest';
import { buildCategories, rawAppToItem } from '../../src/library/libraryData';

describe('libraryData: buildCategories', () => {
    it('creates standard categories for mock games', () => {
        const mock = [
            {
                appId: 100,
                name: 'Zelda',
                isShortcut: false,
                installed: true,
                running: false,
                playedMinutes: 4000,
                achievements: null,
                heroic: null,
                source: 'Steam',
            },
            {
                appId: 200,
                name: 'Chrono Trigger',
                isShortcut: true,
                installed: true,
                running: false,
                playedMinutes: 1200,
                achievements: null,
                heroic: null,
                source: 'GOG',
            },
        ];
        const categories = buildCategories(mock);
        expect(categories.length).toBeGreaterThanOrEqual(5);
        expect(categories.map((c) => c.name)).toEqual(
            expect.arrayContaining(['INSTALLED', 'GREAT ON DECK', 'ALL GAMES', 'FAVORITES', 'COLLECTIONS', 'NON-STEAM'])
        );
        const nonSteam = categories.find((c) => c.id === 'non-steam');
        expect(nonSteam?.count).toBe(1);
        expect(nonSteam?.games[0].name).toBe('Chrono Trigger');
    });

    it('correctly maps rawApp to library item', () => {
        const raw = {
            appid: 42,
            display_name: 'Super Game',
            installed: true,
            minutes_playtime_forever: 120,
            rt_last_time_played: 1600000000,
        };
        const item = rawAppToItem(raw, true);
        expect(item.appId).toBe(42);
        expect(item.name).toBe('Super Game');
        expect(item.running).toBe(true);
        expect(item.playedMinutes).toBe(120);
        expect(item.source).toBe('Steam');
        expect(item.isSoundtrack).toBe(false);
    });

    it('correctly identifies soundtrack apps (app_type === 8)', () => {
        const ostRaw = {
            appid: 1091500,
            display_name: 'Super Soundtrack',
            app_type: 8,
            installed: true,
            minutes_playtime_forever: 60,
        };
        const item = rawAppToItem(ostRaw, false);
        expect(item.isSoundtrack).toBe(true);
        expect(item.source).toBe('Soundtrack');
        expect(item.achievements).toBeNull();
    });

    it('creates SOUNDTRACKS category when soundtrack games exist in mock list and separates them from regular games', () => {
        const mock = [
            {
                appId: 100,
                name: 'Game 1',
                isShortcut: false,
                isSoundtrack: false,
                installed: true,
                running: false,
                playedMinutes: 100,
                achievements: null,
                heroic: null,
                source: 'Steam',
            },
            {
                appId: 200,
                name: 'Soundtrack 1',
                isShortcut: false,
                isSoundtrack: true,
                installed: true,
                running: false,
                playedMinutes: 50,
                achievements: null,
                heroic: null,
                source: 'Soundtrack',
            },
        ];
        const categories = buildCategories(mock);
        const installedCat = categories.find((c) => c.id === 'installed');
        expect(installedCat?.count).toBe(1);
        expect(installedCat?.games[0].name).toBe('Game 1');

        const soundtrackCat = categories.find((c) => c.id === 'soundtracks');
        expect(soundtrackCat).toBeDefined();
        expect(soundtrackCat?.count).toBe(1);
        expect(soundtrackCat?.games[0].name).toBe('Soundtrack 1');
    });
});
