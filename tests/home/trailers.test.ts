import { describe, expect, it, vi } from 'vitest';
import { createCache } from '../../src/data/cache';
import { memoryKv } from '../../src/data/kv';
import { cleanTitleForStore, getGameTrailer, parseTrailerFromAppDetails } from '../../src/home/trailers';

describe('cleanTitleForStore', () => {
    it('removes symbols like ™, ®, © and trims spaces', () => {
        expect(cleanTitleForStore('The Witcher® 3: Wild Hunt™')).toBe('The Witcher 3: Wild Hunt');
        expect(cleanTitleForStore('Cyberpunk 2077©')).toBe('Cyberpunk 2077');
    });
});

describe('parseTrailerFromAppDetails', () => {
    it('returns null on invalid response or empty movies', () => {
        expect(parseTrailerFromAppDetails(null, 123)).toBeNull();
        expect(parseTrailerFromAppDetails({}, 123)).toBeNull();
        expect(parseTrailerFromAppDetails({ '123': { success: false } }, 123)).toBeNull();
        expect(parseTrailerFromAppDetails({ '123': { success: true, data: { movies: [] } } }, 123)).toBeNull();
    });

    it('extracts HLS trailer when present', () => {
        const json = {
            '1145360': {
                success: true,
                data: {
                    movies: [
                        {
                            id: 256801252,
                            name: 'Launch Trailer',
                            hls_h264: 'https://video.steam.com/trailer/hls_master.m3u8',
                            highlight: true,
                        },
                    ],
                },
            },
        };
        const result = parseTrailerFromAppDetails(json, 1145360);
        expect(result).toEqual({
            url: 'https://video.steam.com/trailer/hls_master.m3u8',
            isHls: true,
            fallbackUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256801252/movie480.mp4',
            name: 'Launch Trailer',
            thumbnail: undefined,
        });
    });

    it('prefers highlighted movie over first movie', () => {
        const json = {
            '100': {
                success: true,
                data: {
                    movies: [
                        { id: 1, name: 'Teaser', hls_h264: 'https://video.steam.com/teaser.m3u8', highlight: false },
                        { id: 2, name: 'Main Trailer', hls_h264: 'https://video.steam.com/main.m3u8', highlight: true },
                    ],
                },
            },
        };
        const result = parseTrailerFromAppDetails(json, 100);
        expect(result?.name).toBe('Main Trailer');
        expect(result?.url).toBe('https://video.steam.com/main.m3u8');
    });

    it('falls back to CDN MP4 URL when HLS is not available', () => {
        const json = {
            '620': {
                success: true,
                data: {
                    movies: [
                        { id: 5787, name: 'Demo', highlight: true },
                    ],
                },
            },
        };
        const result = parseTrailerFromAppDetails(json, 620);
        expect(result).toEqual({
            url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/5787/movie480.mp4',
            isHls: false,
            fallbackUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/5787/movie480.mp4',
            name: 'Demo',
            thumbnail: undefined,
        });
    });
});

describe('getGameTrailer', () => {
    it('fetches direct Steam trailer and caches result', async () => {
        const cache = createCache(memoryKv());
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({
                '1145360': {
                    success: true,
                    data: {
                        movies: [{ id: 256801252, name: 'Trailer', hls_h264: 'https://video.steam.com/hades.m3u8' }],
                    },
                },
            }),
        });

        const trailer = await getGameTrailer(1145360, 'Hades', { cache, fetcher });
        expect(trailer?.url).toBe('https://video.steam.com/hades.m3u8');
        expect(fetcher).toHaveBeenCalledWith('https://store.steampowered.com/api/appdetails?appids=1145360');

        // Second call should hit cache without network fetch
        fetcher.mockClear();
        const cached = await getGameTrailer(1145360, 'Hades', { cache, fetcher });
        expect(cached?.url).toBe('https://video.steam.com/hades.m3u8');
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('searches store by name for shortcut games', async () => {
        const cache = createCache(memoryKv());
        const fetcher = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('storesearch')) {
                return {
                    status: 200,
                    json: async () => ({ items: [{ id: 292030 }] }),
                };
            }
            if (url.includes('appdetails?appids=292030')) {
                return {
                    status: 200,
                    json: async () => ({
                        '292030': {
                            success: true,
                            data: {
                                movies: [{ id: 51105, name: 'Witcher Trailer', hls_h264: 'https://video.steam.com/witcher.m3u8' }],
                            },
                        },
                    }),
                };
            }
            return { status: 404, json: async () => ({}) };
        });

        const shortcutAppId = 0x80000005;
        const trailer = await getGameTrailer(shortcutAppId, 'The Witcher 3', { cache, fetcher });
        expect(trailer?.url).toBe('https://video.steam.com/witcher.m3u8');
    });
});
