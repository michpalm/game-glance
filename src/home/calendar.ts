/**
 * Steam's Personal Calendar for the Recommended tab's first row (docs/superpowers/specs/2026-11-18-personal-calendar-row-design.md):
 * new and upcoming games picked for this account, day by day. Steam answers with app IDs, dates, ranks and flags only;
 * each shown game's name and header art come from the store's appdetails. Never throws.
 */
import { attempt } from '../data/attempt';
import { Cache, TTL } from '../data/cache';

/** Seven days back, fourteen ahead; tag 0 = every kind of game (Steam's own default). */
export const DAYS_BACK = 7;
export const DAYS_AHEAD = 14;
export const CALENDAR_URL = `https://store.steampowered.com/personalcalendardata?tag=0&days_backward=${DAYS_BACK}&days_forward=${DAYS_AHEAD}`;
/** Games per day column. */
export const GAMES_PER_DAY = 2;
const REQUEST_TIMEOUT_MS = 8_000;

export interface CalendarEntry {
    appId: number;
    /** Release time, in seconds. */
    releaseDate: number;
    /** Steam's rank for this account: lower is a better match. */
    rank: number;
    owned: boolean;
    wishlisted: boolean;
    earlyAccess: boolean;
}

export interface CalendarDay {
    /** The local date, 'YYYY-MM-DD'. */
    key: string;
    /** Local midnight of that date. */
    date: Date;
    today: boolean;
    /** The best GAMES_PER_DAY games of the day, best first. */
    games: CalendarEntry[];
}

type AnyRecord = Record<string, unknown> | null | undefined;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);

export function parseCalendar(json: unknown): CalendarEntry[] {
    const list = (json as AnyRecord)?.arrAppInfos;
    if (!Array.isArray(list)) return [];
    const out: CalendarEntry[] = [];
    for (const item of list as AnyRecord[]) {
        const appId = num(item?.nAppID), releaseDate = num(item?.nReleaseDate), rank = num(item?.nRank);
        if (!(appId > 0) || !Number.isInteger(appId) || !Number.isFinite(releaseDate) || !Number.isFinite(rank)) continue;
        out.push({ appId, releaseDate, rank, owned: item?.bIsOwned === true, wishlisted: item?.bIsWishlisted === true, earlyAccess: item?.bIsEarlyAccess === true });
    }
    return out;
}

const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** The days to show: local dates from DAYS_BACK before `now` to DAYS_AHEAD after, with games not owned; best ranks first. */
export function calendarDays(entries: CalendarEntry[], now: Date): CalendarDay[] {
    const today = midnight(now);
    const first = addDays(today, -DAYS_BACK).getTime(), last = addDays(today, DAYS_AHEAD).getTime();
    const byDay = new Map<string, { date: Date; games: CalendarEntry[] }>();
    for (const e of entries) {
        if (e.owned) continue;
        const date = midnight(new Date(e.releaseDate * 1000));
        if (date.getTime() < first || date.getTime() > last) continue;
        const key = keyOf(date);
        const slot = byDay.get(key) ?? { date, games: [] };
        slot.games.push(e);
        byDay.set(key, slot);
    }
    const todayKey = keyOf(today);
    return [...byDay.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, { date, games }]) => ({ key, date, today: key === todayKey, games: [...games].sort((a, b) => a.rank - b.rank).slice(0, GAMES_PER_DAY) }));
}

/** Where the row starts: today, else the first later day, else the last day (0 for none). */
export function calendarStart(days: CalendarDay[], now: Date): number {
    const todayKey = keyOf(midnight(now));
    const at = days.findIndex((d) => d.key >= todayKey);
    return at >= 0 ? at : Math.max(0, days.length - 1);
}

/**
 * A day column's heading: the locale's short weekday ("Mon", "Mo") and the date as day/month ("16/11"), the way
 * Steam's own calendar writes it in every language.
 */
export function dayLabel(day: CalendarDay, locale: string): { weekday: string; date: string } {
    let weekday: string;
    try {
        weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day.date);
    } catch {
        weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(day.date);
    }
    return { weekday: weekday.replace(/\.$/, ''), date: `${pad(day.date.getDate())}/${pad(day.date.getMonth() + 1)}` };
}

function withTimeout<T>(promise: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), ms);
        promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
    });
}

export interface CalendarDeps {
    cache: Cache;
    /** The calendar as JSON, requested with this Steam session's cookies (the page's own fetch). */
    fetchJson(url: string): Promise<unknown>;
    now(): number;
}

/** This account's calendar entries: cached 6 hours per Steam ID; [] on any failure (not cached). */
export async function getCalendar(steamId: string, deps: CalendarDeps): Promise<CalendarEntry[]> {
    try {
        const key = `calendar:${steamId}`;
        const cached = await attempt('cache read', () => deps.cache.get<CalendarEntry[]>(key), null);
        if (Array.isArray(cached)) return cached;
        const entries = parseCalendar(await withTimeout(Promise.resolve().then(() => deps.fetchJson(CALENDAR_URL))));
        if (entries.length > 0) await attempt('cache write', () => deps.cache.put(key, entries, TTL.calendar), undefined);
        return entries;
    } catch {
        return [];
    }
}

/** The page's own fetch, with Steam's cookies (Decky's fetchNoCors goes through the backend, which has none). */
export async function fetchCalendarJson(url: string): Promise<unknown> {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

/** Steam's store CDNs: store art and screenshots, and trailers (as Steam's own client builds them). */
const STORE_ASSETS = 'https://shared.akamai.steamstatic.com/store_item_assets/';
const TRAILERS = 'https://video.akamai.steamstatic.com/store_trailers/';
/** Screenshots kept per game for the cycle shown when microtrailers are off (Steam's store preference). */
const MAX_SHOTS = 8;

export interface GameInfo {
    appId: number;
    name: string;
    /** The store header art. */
    art: string | null;
    /** The looping, muted microtrailer Steam plays on a focused capsule (WebM, as the client plays it); null = none. */
    clip: string | null;
    /** Screenshots in the store's order, cycled instead of the clip when microtrailers are off. */
    shots: string[];
    /** A DLC's or soundtrack's game, whose clip Steam plays when the item has none. */
    parent: number | null;
}

/** One item of IStoreBrowseService/GetItems, as the calendar uses it; null when Steam has no usable item. */
export function parseStoreItem(raw: unknown): GameInfo | null {
    const item = raw as AnyRecord;
    const appId = num(item?.appid);
    if (!(appId > 0) || item?.success !== 1 || typeof item?.name !== 'string' || item.name === '') return null;
    const assets = item.assets as AnyRecord;
    const format = typeof assets?.asset_url_format === 'string' ? assets.asset_url_format : null;
    const header = typeof assets?.header === 'string' ? assets.header : null;
    const highlights = ((item.trailers as AnyRecord)?.highlights ?? []) as AnyRecord[];
    let clip: string | null = null;
    for (const trailer of Array.isArray(highlights) ? highlights : []) {
        const files = (trailer?.microtrailer ?? []) as AnyRecord[];
        const webm = Array.isArray(files) ? files.find((f) => f?.type === 'video/webm' && typeof f.filename === 'string') : undefined;
        if (webm) { clip = TRAILERS + String(webm.filename); break; }
    }
    const shotList = ((item.screenshots as AnyRecord)?.all_ages_screenshots ?? []) as AnyRecord[];
    const shots = (Array.isArray(shotList) ? shotList : [])
        .filter((x) => typeof x?.filename === 'string')
        .sort((x, y) => num(x?.ordinal) - num(y?.ordinal))
        .slice(0, MAX_SHOTS)
        .map((x) => STORE_ASSETS + String(x?.filename));
    const parent = num((item.related_items as AnyRecord)?.parent_appid);
    return {
        appId, name: item.name, art: format && header ? STORE_ASSETS + format.replace('${FILENAME}', header) : null,
        clip, shots, parent: parent > 0 ? parent : null,
    };
}

export interface GameInfoDeps {
    cache: Cache;
    fetcher(url: string): Promise<{ status: number; json(): Promise<unknown> }>;
    /** Steam's language for names ('english'), and the store's country. */
    language?: string;
    country?: string;
}

const storeItemsUrl = (appIds: number[], language: string, country: string) => `https://api.steampowered.com/IStoreBrowseService/GetItems/v1?input_json=${encodeURIComponent(JSON.stringify({
    ids: appIds.map((appid) => ({ appid })),
    context: { language, country_code: country },
    data_request: { include_assets: true, include_trailers: true, include_screenshots: true },
}))}`;

async function storeItems(appIds: number[], deps: GameInfoDeps): Promise<GameInfo[]> {
    if (appIds.length === 0) return [];
    try {
        const response = await withTimeout(Promise.resolve().then(() => deps.fetcher(storeItemsUrl(appIds, deps.language ?? 'english', deps.country ?? 'US'))));
        if (response.status !== 200) return [];
        const items = (((await withTimeout(response.json())) as AnyRecord)?.response as AnyRecord)?.store_items;
        return Array.isArray(items) ? items.map(parseStoreItem).filter((x): x is GameInfo => x !== null) : [];
    } catch {
        return [];
    }
}

/**
 * Name, header art, microtrailer and screenshots of each game, in one store request for the ones not cached (7 days
 * each). A DLC with no clip gets its parent game's, as Steam does. Games that fail are left out; never rejects.
 */
export async function calendarGames(appIds: number[], deps: GameInfoDeps): Promise<Map<number, GameInfo>> {
    const out = new Map<number, GameInfo>();
    const wanted = [...new Set(appIds)];
    const missing: number[] = [];
    for (const id of wanted) {
        const cached = await attempt('cache read', () => deps.cache.get<GameInfo>(`calendar:item:${id}`), null);
        if (cached && typeof cached.name === 'string') out.set(id, cached);
        else missing.push(id);
    }
    const found = await storeItems(missing, deps);
    const parents = [...new Set(found.filter((g) => !g.clip && g.parent !== null).map((g) => g.parent as number))];
    const parentClips = new Map((await storeItems(parents, deps)).map((g) => [g.appId, g.clip]));
    for (const game of found) {
        const info = !game.clip && game.parent !== null && parentClips.get(game.parent) ? { ...game, clip: parentClips.get(game.parent) ?? null } : game;
        out.set(info.appId, info);
        await attempt('cache write', () => deps.cache.put(`calendar:item:${info.appId}`, info, TTL.calendarApp), undefined);
    }
    return out;
}

/** Steam's "disable microtrailers" store preference (settingsStore holds the store preferences from sign-in); missing = on. */
export function microtrailersOff(store: unknown = (globalThis as { settingsStore?: unknown }).settingsStore): boolean {
    try {
        return ((store as AnyRecord)?.m_StorePreferences as AnyRecord)?.disable_microtrailers === true;
    } catch {
        return false;
    }
}
