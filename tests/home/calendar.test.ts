import { describe, expect, it, vi } from 'vitest';
import type { Cache } from '../../src/data/cache';
import { TTL } from '../../src/data/cache';
import { calendarDays, calendarGames, calendarStart, CALENDAR_URL, dayLabel, getCalendar, microtrailersOff, parseCalendar, parseStoreItem, type CalendarEntry } from '../../src/home/calendar';

function fakeCache(initial: Record<string, unknown> = {}): Cache & { store: Record<string, unknown>; ttls: Record<string, number> } {
    const store = { ...initial };
    const ttls: Record<string, number> = {};
    return {
        store,
        ttls,
        get: async <T>(k: string) => (k in store ? (store[k] as T) : null),
        put: async (k: string, v: unknown, ttl: number) => { store[k] = v; ttls[k] = ttl; },
        clear: async () => {},
    };
}

/** Noon local time on a day of November 2026 (Wed 18 is "today" below), in seconds. */
const day = (d: number, hour = 12) => Math.floor(new Date(2026, 10, d, hour).getTime() / 1000);
const raw = (nAppID: number, d: number, nRank: number, extra: Record<string, unknown> = {}) =>
    ({ nAppID, nReleaseDate: day(d), nRank, fWeight: 1, bIsWishlisted: false, bIsOwned: false, bIsEarlyAccess: false, ...extra });
const entry = (appId: number, d: number, rank: number, extra: Partial<CalendarEntry> = {}): CalendarEntry =>
    ({ appId, releaseDate: day(d), rank, owned: false, wishlisted: false, earlyAccess: false, ...extra });
const NOW = new Date(2026, 10, 18, 10, 30);

describe('parseCalendar', () => {
    it('reads Steam entries', () => {
        expect(parseCalendar({ arrAppInfos: [raw(5, 18, 3, { bIsWishlisted: true, bIsEarlyAccess: true })] }))
            .toEqual([entry(5, 18, 3, { wishlisted: true, earlyAccess: true })]);
    });
    it('drops broken entries and broken answers', () => {
        expect(parseCalendar({ arrAppInfos: [{ nAppID: 'x' }, raw(0, 18, 1), raw(7, 18, 1)] })).toEqual([entry(7, 18, 1)]);
        expect(parseCalendar(null)).toEqual([]);
        expect(parseCalendar('<html>')).toEqual([]);
        expect(parseCalendar({ arrAppInfos: 'no' })).toEqual([]);
    });
});

describe('calendarDays', () => {
    it('groups by local day, best two by rank, owned left out, in date order', () => {
        const days = calendarDays([entry(1, 19, 50), entry(2, 18, 9), entry(3, 18, 2), entry(4, 18, 5), entry(5, 18, 1, { owned: true })], NOW);
        expect(days.map(d => d.key)).toEqual(['2026-11-18', '2026-11-19']);
        expect(days[0].games.map(g => g.appId)).toEqual([3, 4]);
        expect(days[0].today).toBe(true);
        expect(days[1].today).toBe(false);
    });
    it('keeps 7 days back to 14 ahead; days without games are absent', () => {
        const days = calendarDays([entry(1, 10, 1), entry(2, 11, 1), entry(3, 2 + 30, 1), entry(4, 3 + 30, 1)], NOW);
        // 11 Nov is 7 back; 2 Dec is 14 ahead; 10 Nov and 3 Dec are out.
        expect(days.map(d => d.key)).toEqual(['2026-11-11', '2026-12-02']);
    });
    it('an early-morning release counts for its own local day', () => {
        expect(calendarDays([entry(1, 20, 1)].map(e => ({ ...e, releaseDate: day(20, 0) })), NOW)[0].key).toBe('2026-11-20');
    });
});

describe('calendarStart', () => {
    const days = (keys: number[]) => calendarDays(keys.map((d, i) => entry(i + 1, d, 1)), NOW);
    it('today', () => expect(calendarStart(days([16, 17, 18, 19]), NOW)).toBe(2));
    it('the first later day when today has none', () => expect(calendarStart(days([16, 17, 20]), NOW)).toBe(2));
    it('the last day when all are past', () => expect(calendarStart(days([12, 16]), NOW)).toBe(1));
    it('0 for none', () => expect(calendarStart([], NOW)).toBe(0));
});

describe('dayLabel', () => {
    it('the locale\'s short weekday, and day/month as Steam\'s own calendar writes it (also in en-US)', () => {
        const [d] = calendarDays([entry(1, 16, 1)], NOW);
        expect(dayLabel(d, 'en-GB')).toEqual({ weekday: 'Mon', date: '16/11' });
        expect(dayLabel(d, 'en-US')).toEqual({ weekday: 'Mon', date: '16/11' });
        expect(dayLabel(d, 'de-DE')).toEqual({ weekday: 'Mo', date: '16/11' });
    });
});

describe('getCalendar', () => {
    it('fetches once, caches for 6 hours', async () => {
        const cache = fakeCache();
        const fetchJson = vi.fn(async () => ({ arrAppInfos: [raw(9, 18, 1)] }));
        expect(await getCalendar('765', { cache, fetchJson, now: () => 0 })).toEqual([entry(9, 18, 1)]);
        expect(fetchJson).toHaveBeenCalledWith(CALENDAR_URL);
        expect(cache.ttls['calendar:765']).toBe(TTL.calendar);
        expect(TTL.calendar).toBe(6 * 3_600_000);
        await getCalendar('765', { cache, fetchJson, now: () => 0 });
        expect(fetchJson).toHaveBeenCalledTimes(1);
    });
    it('a failure gives [] and caches nothing', async () => {
        const cache = fakeCache();
        expect(await getCalendar('765', { cache, fetchJson: async () => { throw new Error('401'); }, now: () => 0 })).toEqual([]);
        expect(cache.store).toEqual({});
    });
    it('an answer with nothing usable is not cached', async () => {
        const cache = fakeCache();
        expect(await getCalendar('765', { cache, fetchJson: async () => '<html>', now: () => 0 })).toEqual([]);
        expect(cache.store).toEqual({});
    });
});

describe('parseStoreItem', () => {
    const item = (extra: Record<string, unknown> = {}) => ({
        appid: 5, success: 1, visible: true, name: 'Five',
        assets: { asset_url_format: 'steam/apps/5/${FILENAME}?t=1', header: 'abc/header.jpg' },
        screenshots: { all_ages_screenshots: [{ filename: 'steam/apps/5/ss1.jpg?t=1', ordinal: 2 }, { filename: 'steam/apps/5/ss0.jpg?t=1', ordinal: 1 }] },
        trailers: { highlights: [{ microtrailer: [{ filename: '5/9/clip.mp4', type: 'video/mp4' }, { filename: '5/9/clip.webm', type: 'video/webm' }] }] },
        ...extra,
    });
    it('name, header art, the WebM microtrailer and the screenshots in order', () => {
        expect(parseStoreItem(item())).toEqual({
            appId: 5, name: 'Five',
            art: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5/abc/header.jpg?t=1',
            clip: 'https://video.akamai.steamstatic.com/store_trailers/5/9/clip.webm',
            shots: ['https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5/ss0.jpg?t=1', 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5/ss1.jpg?t=1'],
            parent: null,
        });
    });
    it('no trailer: no clip; a DLC names its parent game', () => {
        expect(parseStoreItem(item({ trailers: {}, related_items: { parent_appid: 4 } }))).toMatchObject({ clip: null, parent: 4 });
    });
    it('a failed or nameless item is null', () => {
        expect(parseStoreItem({ appid: 5, success: 2 })).toBeNull();
        expect(parseStoreItem(item({ name: '' }))).toBeNull();
        expect(parseStoreItem(null)).toBeNull();
    });
});

describe('calendarGames', () => {
    const resp = (body: unknown) => ({ status: 200, json: async () => body });
    const item = (appid: number, extra: Record<string, unknown> = {}) => ({ appid, success: 1, name: `Game ${appid}`, ...extra });
    const clip = (id: number) => ({ trailers: { highlights: [{ microtrailer: [{ filename: `${id}/c.webm`, type: 'video/webm' }] }] } });
    const ids = (url: string) => (JSON.parse(new URL(url).searchParams.get('input_json') ?? '{}').ids ?? []).map((x: { appid: number }) => x.appid);
    it('asks for every game in one request, caches each for 7 days', async () => {
        const cache = fakeCache();
        const fetcher = vi.fn(async (url: string) => resp({ response: { store_items: ids(url).map((id: number) => item(id, clip(id))) } }));
        const out = await calendarGames([1, 2, 2], { cache, fetcher });
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(ids(fetcher.mock.calls[0][0])).toEqual([1, 2]);
        expect(out.get(1)).toMatchObject({ name: 'Game 1', clip: 'https://video.akamai.steamstatic.com/store_trailers/1/c.webm' });
        expect(cache.ttls['calendar:item:2']).toBe(TTL.calendarApp);
        await calendarGames([1, 2], { cache, fetcher });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it('a DLC without a clip plays its parent game\'s', async () => {
        const cache = fakeCache();
        const fetcher = vi.fn(async (url: string) => resp({ response: { store_items: ids(url).map((id: number) => (id === 7 ? item(7, { related_items: { parent_appid: 6 } }) : item(id, clip(id)))) } }));
        const out = await calendarGames([7], { cache, fetcher });
        expect(out.get(7)).toMatchObject({ name: 'Game 7', clip: 'https://video.akamai.steamstatic.com/store_trailers/6/c.webm' });
    });
    it('a game that fails is left out and not cached; a failed request gives none', async () => {
        const cache = fakeCache();
        const out = await calendarGames([3], { cache, fetcher: async () => resp({ response: { store_items: [{ appid: 3, success: 2 }] } }) });
        expect(out.has(3)).toBe(false);
        expect(cache.store).toEqual({});
        expect((await calendarGames([3], { cache, fetcher: async () => { throw new Error('x'); } })).size).toBe(0);
    });
});

describe('microtrailersOff', () => {
    it('reads Steam\'s store preference; missing = on', () => {
        expect(microtrailersOff({ m_StorePreferences: { disable_microtrailers: true } })).toBe(true);
        expect(microtrailersOff({ m_StorePreferences: {} })).toBe(false);
        expect(microtrailersOff(undefined)).toBe(false);
    });
});
