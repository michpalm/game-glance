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
        expect(categories.length).toBeGreaterThanOrEqual(4);
        expect(categories.map((c) => c.name)).toEqual(
            expect.arrayContaining(['INSTALLED', 'ALL GAMES', 'FAVORITES', 'NON-STEAM'])
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
    });
});
