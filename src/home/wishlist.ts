import { fetchNoCors } from '@decky/api';
import { attempt } from '../data/attempt';
import { Cache, TTL } from '../data/cache';

export interface Deal {
    appId: number;
    name: string;
    discountPercent: number;
    deckVerified: boolean;
    /** Steam's formatted prices from price_overview (final, and the full price before the discount), when given. */
    price?: string;
    fullPrice?: string;
}

export interface WishlistDeps {
    cache: Cache;
    fetcher: typeof fetchNoCors;
    now(): number;
}

/** Apps per multi-app price request; 100 (and the full 123-item wishlist) answered 200 on the Ally. */
export const WISHLIST_CHUNK = 100;
/** Bounded work: at most this many price requests (1000 apps), at most 2 in flight. */
const MAX_CHUNKS = 10;
const CHUNK_CONCURRENCY = 2;
/** Deals shown on Home (the Recommended tab's wide second row); only these get the name and Deck report lookups. */
export const MAX_DEALS = 6;
/** Deals whose name and Deck report are looked up at once (two requests each, so at most 6 in flight). */
const DETAIL_CONCURRENCY = 3;
const REQUEST_TIMEOUT_MS = 8_000;
const DECK_VERIFIED_CATEGORY = 3;

type AnyRecord = Record<string, unknown> | undefined | null;

export function parseWishlist(json: unknown): number[] {
    const items = ((json as AnyRecord)?.response as AnyRecord)?.items;
    if (!Array.isArray(items)) return [];
    const ids: number[] = [];
    for (const item of items) {
        const id = Number((item as AnyRecord)?.appid);
        if (Number.isInteger(id) && id > 0) ids.push(id);
    }
    return ids;
}

/** Expects `{ [appId]: { success, data: { name, price_overview } } }`; keeps discounted, named apps. */
export function parseDeals(json: unknown): Deal[] {
    if (typeof json !== 'object' || json === null || Array.isArray(json)) return [];
    const deals: Deal[] = [];
    for (const [key, entry] of Object.entries(json as Record<string, AnyRecord>)) {
        const appId = Number(key);
        if (!Number.isInteger(appId) || appId <= 0 || entry?.success !== true) continue;
        const data = entry.data as AnyRecord;
        const name = data?.name;
        const overview = data?.price_overview as AnyRecord;
        const percent = Number(overview?.discount_percent);
        if (typeof name !== 'string' || name.length === 0 || !(percent > 0)) continue;
        const deal: Deal = { appId, name, discountPercent: percent, deckVerified: false };
        if (typeof overview?.final_formatted === 'string' && overview.final_formatted) deal.price = overview.final_formatted;
        if (typeof overview?.initial_formatted === 'string' && overview.initial_formatted) deal.fullPrice = overview.initial_formatted;
        deals.push(deal);
    }
    return deals;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
    });
    // The loser of the race must not surface as an unhandled rejection.
    promise.catch(() => {});
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class HttpError extends Error {
    constructor(readonly status: number) {
        super(`http ${status}`);
    }
}

/** Steam's answer for a wishlist it will not show: reachable, but private. Cached like an empty wishlist. */
const isPrivate = (error: unknown) => error instanceof HttpError && (error.status === 401 || error.status === 403);

async function getJson(fetcher: WishlistDeps['fetcher'], url: string): Promise<unknown> {
    const response = await withTimeout(Promise.resolve().then(() => fetcher(url)), REQUEST_TIMEOUT_MS);
    if (response.status !== 200) throw new HttpError(response.status);
    return withTimeout(Promise.resolve().then(() => response.json()), REQUEST_TIMEOUT_MS);
}

async function isDeckVerified(fetcher: WishlistDeps['fetcher'], appId: number): Promise<boolean> {
    try {
        const json = await getJson(fetcher, `https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport?nAppID=${appId}`);
        return Number(((json as AnyRecord)?.results as AnyRecord)?.resolved_category) === DECK_VERIFIED_CATEGORY;
    } catch {
        return false;
    }
}

async function fetchName(fetcher: WishlistDeps['fetcher'], appId: number): Promise<string | null> {
    try {
        const json = await getJson(fetcher, `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`);
        const name = (((json as AnyRecord)?.[String(appId)] as AnyRecord)?.data as AnyRecord)?.name;
        return typeof name === 'string' && name.length > 0 ? name : null;
    } catch {
        return null;
    }
}

/** Splits `ids` into request-sized chunks, at most `MAX_CHUNKS` of them. */
export function wishlistChunks(ids: number[], size = WISHLIST_CHUNK): number[][] {
    const step = Math.max(1, Math.floor(size));
    const chunks: number[][] = [];
    for (let i = 0; i < ids.length && chunks.length < MAX_CHUNKS; i += step) chunks.push(ids.slice(i, i + step));
    return chunks;
}

/** The discounted apps of each chunk (placeholder names), in wishlist order; a failed chunk is skipped. Throws when all fail. */
async function priceAll(fetcher: WishlistDeps['fetcher'], ids: number[]): Promise<Deal[]> {
    const chunks = wishlistChunks(ids);
    const results: (Deal[] | null)[] = new Array(chunks.length).fill(null);
    let next = 0;
    const worker = async () => {
        while (next < chunks.length) {
            const index = next++;
            try {
                const priced = await getJson(fetcher, `https://store.steampowered.com/api/appdetails?appids=${chunks[index].join(',')}&filters=price_overview`);
                if (typeof priced !== 'object' || priced === null || Array.isArray(priced)) continue;
                results[index] = parseDeals(withPlaceholderNames(priced));
            } catch {
                // skipped: the other chunks still count
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(CHUNK_CONCURRENCY, chunks.length) }, worker));
    if (results.every((r) => r === null)) throw new Error('price lookup failed');
    return results.flatMap((r) => r ?? []);
}

/** The biggest discounts first; ties keep wishlist order (Array.prototype.sort is stable). */
export function topDeals(deals: Deal[], count = MAX_DEALS): Deal[] {
    return [...deals].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, Math.max(0, count));
}

async function loadDeals(steamId: string, fetcher: WishlistDeps['fetcher']): Promise<Deal[]> {
    const raw = await getJson(fetcher, `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${encodeURIComponent(steamId)}`);
    if (typeof (raw as AnyRecord)?.response !== 'object' || (raw as AnyRecord)?.response === null) throw new Error('malformed wishlist'); // a failure, not an empty list
    const wishlist = parseWishlist(raw);
    if (wishlist.length === 0) return [];
    // Steam answers a multi-app appdetails request only for filters=price_overview (400 with `basic`),
    // so the whole wishlist is priced in chunks and names are fetched separately, only for the deals shown.
    const top = topDeals(await priceAll(fetcher, wishlist));
    const named: (Deal | null)[] = [];
    for (let i = 0; i < top.length; i += DETAIL_CONCURRENCY) {
        named.push(...await Promise.all(top.slice(i, i + DETAIL_CONCURRENCY).map(async (deal) => {
            const [name, deckVerified] = await Promise.all([fetchName(fetcher, deal.appId), isDeckVerified(fetcher, deal.appId)]);
            return name ? { ...deal, name, deckVerified } : null;
        })));
    }
    return named.filter((deal): deal is Deal => deal !== null);
}

/** The price response has no names yet; give each entry a placeholder so parseDeals keeps the discounted ones. */
function withPlaceholderNames(json: unknown): unknown {
    if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(json as Record<string, AnyRecord>)) {
        const data = entry?.data as AnyRecord;
        if (entry?.success === true && data && !Array.isArray(data)) out[key] = { success: true, data: { ...data, name: key } };
    }
    return out;
}

/**
 * The wishlist's biggest discounts (at most MAX_DEALS), biggest first. Never rejects; `[]` on any failure, which is
 * not cached. A private wishlist (HTTP 401/403) is cached as empty for the short TTL, like a valid empty one, so the
 * request carrying the Steam ID does not repeat on every Home open.
 */
export async function getWishlistDeals(steamId: string, deps: WishlistDeps): Promise<Deal[]> {
    try {
        // v2: six deals with prices (the old key held three without).
        const key = `wishlist:deals2:${steamId}`;
        const cached = await attempt('cache read', () => deps.cache.get<Deal[]>(key), null);
        if (Array.isArray(cached)) return cached;
        let deals: Deal[];
        try {
            deals = await loadDeals(steamId, deps.fetcher);
        } catch (error) {
            if (!isPrivate(error)) throw error;
            deals = [];
        }
        await attempt('cache write', () => deps.cache.put(key, deals, deals.length > 0 ? TTL.wishlist : TTL.wishlistEmpty), undefined);
        return deals;
    } catch {
        return [];
    }
}
