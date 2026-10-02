import { describe, expect, it, vi } from 'vitest';
import { createCache } from '../../src/data/cache';
import { memoryKv } from '../../src/data/kv';
import { getDescription, parseStoreDescription, readGameInfo } from '../../src/data/steam';

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
