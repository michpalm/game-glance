import { describe, expect, it, vi } from 'vitest';
import { createCache } from '../../src/data/cache';
import { memoryKv } from '../../src/data/kv';
import { getDescription, parseStoreDescription, playedMinutesOf, readGameInfo } from '../../src/data/steam';

describe('readGameInfo', () => {
    it('reads a Steam game with achievements', () => {
        const info = readGameInfo(
            { appid: 292030, display_name: 'The Witcher 3: Wild Hunt', minutes_playtime_forever: '2406', app_type: 1 },
            { achievements: { nAchieved: 13, nTotal: 78 } },
        );
        expect(info).toEqual({
            appId: 292030, name: 'The Witcher 3: Wild Hunt', isShortcut: false, playedMinutes: 2406,
            achievements: { achieved: 13, total: 78 }, heroic: null,
        });
    });
    it('detects shortcuts and hides achievements', () => {
        const info = readGameInfo({ appid: 3123456789, display_name: 'Hades', minutes_playtime_forever: 30, app_type: 1073741824 }, { achievements: { nAchieved: 1, nTotal: 5 } });
        expect(info.isShortcut).toBe(true);
        expect(info.achievements).toBeNull();
    });
    it("a shortcut's play time is Steam's local one from its details (the overview's is 0 for shortcuts: #52, ES-DE on the Deck)", () => {
        const info = readGameInfo({ appid: 4203820957, display_name: 'EmulationStationDE', minutes_playtime_forever: 0, app_type: 1073741824 }, { nPlaytimeForever: 21 });
        expect(info.playedMinutes).toBe(21);
    });
    it("a Steam game's play time is the overview's, as before 3.4.0, even when its details say more (RDR2: 200+ h for ~40)", () => {
        expect(readGameInfo({ appid: 1174180, app_type: 1, minutes_playtime_forever: 2400 }, { nPlaytimeForever: 12000 }).playedMinutes).toBe(2400);
        expect(playedMinutesOf(0, 21)).toBe(0);
        expect(playedMinutesOf(undefined, 21)).toBe(0);
        expect(playedMinutesOf('2406', 2400)).toBe(2406);
        expect(playedMinutesOf(30, NaN)).toBe(30);
    });
    it("a shortcut's play time is the larger of the overview's and the details' (3.4.0, #52), ignoring junk", () => {
        expect(playedMinutesOf(0, 21, true)).toBe(21);
        expect(playedMinutesOf(30, 0, true)).toBe(30);
        expect(playedMinutesOf(30, undefined, true)).toBe(30);
        expect(playedMinutesOf('2406', 2400, true)).toBe(2406);
        expect(playedMinutesOf(undefined, undefined, true)).toBe(0);
        expect(playedMinutesOf(-3, 'x', true)).toBe(0);
    });
    it('reads the Heroic link of a shortcut Heroic added', () => {
        const info = readGameInfo(
            { appid: 2657861989, display_name: 'Chained Echoes', app_type: 1073741824 },
            { strShortcutLaunchOptions: 'run com.heroicgameslauncher.hgl --no-gui "heroic://launch?appName=2067731250&runner=gog"' },
        );
        expect(info.heroic).toEqual({ runner: 'gog', appName: '2067731250' });
    });
    it('ignores launch options on Steam games', () => {
        const info = readGameInfo({ appid: 5, app_type: 1 }, { strShortcutLaunchOptions: 'heroic://launch/gog/1' });
        expect(info.heroic).toBeNull();
    });
    it('tolerates missing data', () => {
        expect(readGameInfo(undefined, undefined)).toEqual({ appId: 0, name: '', isShortcut: false, playedMinutes: 0, achievements: null, heroic: null });
        expect(readGameInfo({ appid: 1, minutes_playtime_forever: 'x' }, { achievements: { nAchieved: 0, nTotal: 0 } }).achievements).toBeNull();
    });
});

describe('parseStoreDescription', () => {
    it('extracts and cleans the short description', () => {
        const json = { '292030': { success: true, data: { short_description: 'Hunt &amp; slay<br>monsters.' } } };
        expect(parseStoreDescription(json, 292030)).toBe('Hunt & slay monsters.');
    });
    it('returns null for failures and empty text', () => {
        expect(parseStoreDescription({ '1': { success: false } }, 1)).toBeNull();
        expect(parseStoreDescription({ '1': { success: true, data: { short_description: ' <p></p> ' } } }, 1)).toBeNull();
        expect(parseStoreDescription(null, 1)).toBeNull();
    });
});

describe('getDescription', () => {
    it('fetches once, then serves from cache', async () => {
        const cache = createCache(memoryKv());
        const fetcher = vi.fn(async () => ({ status: 200, json: async () => ({ '5': { success: true, data: { short_description: 'Hi' } } }) }));
        expect(await getDescription(5, 'english', { cache, fetcher })).toBe('Hi');
        expect(await getDescription(5, 'english', { cache, fetcher })).toBe('Hi');
        expect(fetcher).toHaveBeenCalledOnce();
        expect(fetcher).toHaveBeenCalledWith('https://store.steampowered.com/api/appdetails?appids=5&l=english');
    });
    it('does not cache errors', async () => {
        const cache = createCache(memoryKv());
        const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: 500, json: async () => ({}) });
        expect(await getDescription(6, 'english', { cache, fetcher })).toBeNull();
        expect(await getDescription(6, 'english', { cache, fetcher })).toBeNull();
        expect(fetcher).toHaveBeenCalledTimes(2);
    });
});

describe('getDescription with a failing backend', () => {
    it('still returns the text when cache reads and writes fail', async () => {
        const cache = {
            get: vi.fn(async () => { throw new Error('backend not ready'); }),
            put: vi.fn(async () => { throw new Error('disk full'); }),
            clear: vi.fn(),
        };
        const fetcher = vi.fn(async () => ({ status: 200, json: async () => ({ '7': { success: true, data: { short_description: 'Hello' } } }) }));
        expect(await getDescription(7, 'english', { cache, fetcher })).toBe('Hello');
    });
});

describe('getDescription keeps descriptions', () => {
    it('serves a cached description for a year without fetching again', async () => {
        const clock = { t: 0 };
        const cache = createCache(memoryKv(), () => clock.t);
        const fetcher = vi.fn(async () => ({ status: 200, json: async () => ({ '8': { success: true, data: { short_description: 'Kept' } } }) }));
        await getDescription(8, 'english', { cache, fetcher });
        clock.t += 300 * 86_400_000;
        expect(await getDescription(8, 'english', { cache, fetcher })).toBe('Kept');
        expect(fetcher).toHaveBeenCalledOnce();
    });
});
