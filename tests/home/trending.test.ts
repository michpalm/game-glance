import { describe, expect, it } from 'vitest';
import type { LastGames, RawFriend } from '../../src/home/friends';
import {
    mapSteamTrending, playsLabel, StoreInfo, TRENDING_AVATARS, TRENDING_MAX, TRENDING_WINDOW_MS, trendingGames, trendingLabel,
} from '../../src/home/trending';
import fixture from './fixtures/friends.json';
import steamApps from './fixtures/trending-apps.json';

// Real RawFriend shapes (placeholder ids); none of the user's friends was in game at probe time, so games are added here.
const base = fixture as RawFriend[];
const NOW = 1_791_130_000_000;
const DAY = 86_400_000;
const f = (i: number, extra: Partial<RawFriend> = {}): RawFriend => ({ ...base[i % base.length], steamId: `7656119000000010${i}`, gameAppId: 0, lastPlayedAppId: 0, ...extra });
const names: Record<number, string> = { 10: 'Game Ten', 20: 'Game Twenty' };
const appName = (id: number) => names[id] ?? '';
const owned = (id: number) => id !== 30;

describe('trendingLabel', () => {
    it('playing now wins; singular and plural', () => {
        expect(trendingLabel(3, 1)).toBe('3 friends playing');
        expect(trendingLabel(1, 0)).toBe('1 friend playing');
        expect(trendingLabel(0, 2)).toBe('2 friends played recently');
        expect(trendingLabel(0, 1)).toBe('1 friend played recently');
    });
});

describe('trendingGames', () => {
    it('counts distinct friends per game, ranked by friends, then playing now, then most recent', () => {
        const friends = [f(1, { gameAppId: 10 }), f(2, { gameAppId: 10 }), f(3), f(4), f(5)];
        const last: LastGames = {
            [f(3).steamId]: { appId: 20, name: 'Game Twenty', at: NOW - DAY },
            [f(4).steamId]: { appId: 20, name: 'Game Twenty', at: NOW - 2 * DAY },
            [f(5).steamId]: { appId: 30, name: 'Store Only', at: NOW - 3 * DAY },
        };
        const cards = trendingGames(friends, last, appName, owned, NOW);
        expect(cards.map((c) => [c.appId, c.playing, c.played, c.label, c.inLibrary])).toEqual([
            [10, 2, 0, '2 friends playing', true],
            [20, 0, 2, '2 friends played recently', true],
            [30, 0, 1, '1 friend played recently', false],
        ]);
        // A game not in the library keeps the name Steam reported.
        expect(cards[2].name).toBe('Store Only');
    });
    it('a tie on friends: playing now first, then the most recent', () => {
        const friends = [f(1, { gameAppId: 20 }), f(2)];
        const last: LastGames = { [f(2).steamId]: { appId: 10, name: '', at: NOW - DAY } };
        expect(trendingGames(friends, last, appName, owned, NOW).map((c) => c.appId)).toEqual([20, 10]);
        const older: LastGames = { [f(1).steamId]: { appId: 10, name: '', at: NOW - 3 * DAY }, [f(2).steamId]: { appId: 20, name: '', at: NOW - DAY } };
        expect(trendingGames([f(1), f(2)], older, appName, owned, NOW).map((c) => c.appId)).toEqual([20, 10]);
    });
    it('only cache entries from the last 7 days count; Steam\'s session sighting counts as recent', () => {
        const last: LastGames = { [f(1).steamId]: { appId: 10, name: '', at: NOW - TRENDING_WINDOW_MS - 1 } };
        expect(trendingGames([f(1)], last, appName, owned, NOW)).toEqual([]);
        expect(trendingGames([f(1, { lastPlayedAppId: 20 })], {}, appName, owned, NOW).map((c) => c.label)).toEqual(['1 friend played recently']);
    });
    it('a friend playing a game is not also counted as having played it; nameless games are left out; capped', () => {
        const last: LastGames = { [f(1).steamId]: { appId: 10, name: '', at: NOW - DAY } };
        expect(trendingGames([f(1, { gameAppId: 10, lastPlayedAppId: 10 })], last, appName, owned, NOW).map((c) => [c.playing, c.played])).toEqual([[1, 0]]);
        expect(trendingGames([f(1, { gameAppId: 99 })], {}, appName, owned, NOW)).toEqual([]);
        expect(trendingGames([f(1, { gameAppId: 99, gameName: 'Steam Name' })], {}, appName, owned, NOW)[0].name).toBe('Steam Name');
        const many = Array.from({ length: 12 }, (_, i) => f(i, { gameAppId: 100 + i, gameName: `G${i}` }));
        expect(trendingGames(many, {}, appName, owned, NOW)).toHaveLength(TRENDING_MAX);
        expect(trendingGames([], {}, appName, owned, NOW)).toEqual([]);
    });
});

describe('mapSteamTrending (Steam\'s trendingStore list, real shapes)', () => {
    // Store data as Steam's store item cache returned it on the Ally (names and prices; placeholder friends).
    const store: Record<number, StoreInfo> = {
        394510: { name: 'HELLDIVERS Dive Harder Edition', header: 'https://cdn/394510/header.jpg', free: false, discountPct: 80, finalPrice: '3,99€', originalPrice: '19,99€' },
        1085660: { name: 'Destiny 2', header: 'https://cdn/1085660/header.jpg', free: true, discountPct: 0, finalPrice: '', originalPrice: '' },
        17410: { name: "Mirror's Edge", header: 'https://cdn/17410/header.jpg', free: false, discountPct: 65, finalPrice: '6,99€', originalPrice: '19,99€' },
    };
    const owned = new Set([870780, 976730]);
    const names: Record<number, string> = { 870780: 'CONTROL Ultimate Edition', 976730: 'Halo: The Master Chief Collection' };
    const lookup = {
        owned: (id: number) => owned.has(id),
        libraryName: (id: number) => names[id] ?? '',
        store: (id: number) => store[id] ?? null,
        friend: (id: number) => ({ name: `Friend ${id}`, avatarUrl: `https://avatar/${id}.jpg` }),
    };
    it('keeps Steam\'s order: owned games "In library", others with the discount and price or Free to play, store art', () => {
        const cards = mapSteamTrending(steamApps, lookup, true);
        expect(cards.map((c) => [c.appId, c.name, c.tag, c.label, c.inLibrary, c.storeArt])).toEqual([
            [870780, 'CONTROL Ultimate Edition', 'In library', '1 friend plays', true, null],
            [394510, 'HELLDIVERS Dive Harder Edition', '-80%', '1 friend plays - 3,99€ (was 19,99€)', false, 'https://cdn/394510/header.jpg'],
            [1085660, 'Destiny 2', 'Free to play', '1 friend plays', false, 'https://cdn/1085660/header.jpg'],
            [17410, "Mirror's Edge", '-65%', '6 friends play - 6,99€ (was 19,99€)', false, 'https://cdn/17410/header.jpg'],
            [976730, 'Halo: The Master Chief Collection', 'In library', '1 friend plays', true, null],
        ]);
    });
    it('avatars: Steam\'s top friends, at most 3, "+N" for the rest of the total', () => {
        const mirror = mapSteamTrending(steamApps, lookup, true)[3];
        expect(mirror.avatars).toHaveLength(TRENDING_AVATARS);
        expect(mirror.avatars[0]).toEqual({ url: 'https://avatar/1001.jpg', initial: 'F' });
        expect(mirror.moreFriends).toBe(3);
    });
    it('as stock Home: only owned games unless "show store content on Home" is on; unnamed games skipped; capped; junk tolerated', () => {
        expect(mapSteamTrending(steamApps, lookup, false).map((c) => c.appId)).toEqual([870780, 976730]);
        expect(mapSteamTrending(steamApps, { ...lookup, store: () => null }, true).map((c) => c.appId)).toEqual([870780, 976730]);
        expect(mapSteamTrending(steamApps, lookup, true, 2)).toHaveLength(2);
        expect(mapSteamTrending(null, lookup, true)).toEqual([]);
        expect(mapSteamTrending([null, { appid: -1 }, { appid: 870780 }, { appid: 870780 }], lookup, true).map((c) => c.appId)).toEqual([870780]);
        expect(playsLabel(1)).toBe('1 friend plays');
        expect(playsLabel(4)).toBe('4 friends play');
    });
});
