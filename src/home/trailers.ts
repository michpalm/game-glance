import { fetchNoCors } from '@decky/api';
import { attempt } from '../data/attempt';
import { Cache, cache as defaultCache, TTL } from '../data/cache';
import { cleanTitle } from '../logic/names';

export interface GameTrailer {
    url: string;
    isHls: boolean;
    name?: string;
    thumbnail?: string;
}

export interface TrailerDeps {
    cache: Cache;
    fetcher: (url: string) => Promise<{ status: number; json(): Promise<unknown> }>;
}

const defaultDeps: TrailerDeps = {
    cache: defaultCache,
    fetcher: (url) => fetchNoCors(url),
};

const trailerMemo = new Map<number, GameTrailer | null>();

/** Clean non-alphanumeric noise from game titles for Steam store search */
export function cleanTitleForStore(name: string): string {
    return cleanTitle(name)
        .replace(/[™®©]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extracts trailer details from Steam appdetails response JSON.
 * Prefers the highlighted movie, or falls back to the first available movie.
 */
export function parseTrailerFromAppDetails(json: unknown, appId: number): GameTrailer | null {
    try {
        const entry = (json as Record<string, any> | null)?.[String(appId)];
        if (!entry || entry.success !== true) return null;
        const movies = entry.data?.movies;
        if (!Array.isArray(movies) || movies.length === 0) return null;

        const movie = movies.find((m: any) => m?.highlight) ?? movies[0];
        if (!movie) return null;

        // Try direct HLS master playlist URL first (highest quality modern Steam stream)
        const hls = movie.hls_h264;
        if (typeof hls === 'string' && hls.length > 0) {
            return {
                url: hls,
                isHls: true,
                name: typeof movie.name === 'string' ? movie.name : undefined,
                thumbnail: typeof movie.thumbnail === 'string' ? movie.thumbnail : undefined,
            };
        }

        // Fall back to direct MP4 URL on Cloudflare/Akamai CDN
        if (movie.id) {
            return {
                url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${movie.id}/movie480.mp4`,
                isHls: false,
                name: typeof movie.name === 'string' ? movie.name : undefined,
                thumbnail: typeof movie.thumbnail === 'string' ? movie.thumbnail : undefined,
            };
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Resolves a game trailer URL for a given game (by appId or name).
 * Searches Steam store if it's a shortcut or if the appId does not yield movies.
 * Caches results in memory and persistent cache.
 */
export async function getGameTrailer(
    appId: number,
    gameName: string,
    deps: TrailerDeps = defaultDeps
): Promise<GameTrailer | null> {
    if (trailerMemo.has(appId)) {
        return trailerMemo.get(appId) ?? null;
    }

    const cacheKey = `trailer:${appId}`;
    const cached = await attempt('trailer cache read', () => deps.cache.get<GameTrailer | null>(cacheKey), null);
    if (cached !== undefined && cached !== null) {
        trailerMemo.set(appId, cached);
        return cached;
    }

    let result: GameTrailer | null = null;

    // 1. If valid Steam appId (< 0x80000000), query appdetails directly
    const isDirectSteam = appId > 0 && appId < 0x80000000;
    if (isDirectSteam) {
        try {
            const resp = await deps.fetcher(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
            if (resp.status === 200) {
                result = parseTrailerFromAppDetails(await resp.json(), appId);
            }
        } catch {
            // fallback to store search
        }
    }

    // 2. If no trailer found yet and we have a name, search Steam store
    if (!result && gameName) {
        const cleaned = cleanTitleForStore(gameName);
        if (cleaned.length > 0) {
            try {
                const searchResp = await deps.fetcher(
                    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleaned)}&l=english&cc=US`
                );
                if (searchResp.status === 200) {
                    const searchJson = (await searchResp.json()) as { items?: Array<{ id: number }> };
                    const foundId = searchJson?.items?.[0]?.id;
                    if (foundId && foundId > 0) {
                        const appResp = await deps.fetcher(`https://store.steampowered.com/api/appdetails?appids=${foundId}`);
                        if (appResp.status === 200) {
                            result = parseTrailerFromAppDetails(await appResp.json(), foundId);
                        }
                    }
                }
            } catch {
                // lookup failed
            }
        }
    }

    // Cache the result (or null)
    trailerMemo.set(appId, result);
    await attempt(
        'trailer cache write',
        () => deps.cache.put(cacheKey, result, result ? TTL.description : 3600_000),
        undefined
    );

    return result;
}

/**
 * Convenience helper to resolve trailer for a game info object.
 */
export async function resolveGameTrailer(
    game: { appId: number; name?: string },
    deps: TrailerDeps = defaultDeps
): Promise<GameTrailer | null> {
    return getGameTrailer(game.appId, game.name ?? '', deps);
}
