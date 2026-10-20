import { describe, expect, it } from 'vitest';
import fixture from './fixtures/recents.json';
import { addedTime, formatLastPlayed, mergeRecentSources, pickHomeRecents, pickRecents, pickSteamHomeRecents, RECENTS_LIMIT, steamHomeTime } from '../../src/home/recents';

const DAY = 86400;

describe('pickRecents', () => {
    it('orders by last played, newest first', () => {
        const ids = pickRecents(fixture).map((g) => g.appId);
        expect(ids).toEqual([3001, 3002, 3003, 3004, 3000000001, 3005]);
    });

    it('keeps games and non-Steam shortcuts, drops never-played and non-games', () => {
        const ids = pickRecents(fixture).map((g) => g.appId);
        expect(ids).toContain(3000000001);
        expect(ids).not.toContain(3000000002);
        expect(ids).not.toContain(3006);
        expect(ids).not.toContain(3007);
    });

    it('keeps demos (Steam\'s recent games list holds them, as Steam\'s Home shows them); drops tools', () => {
        const apps = [
            { appid: 1, display_name: 'Game', app_type: 1, rt_last_time_played: 300 },
            { appid: 2, display_name: 'Demo', app_type: 8, rt_last_time_played: 200 },
            { appid: 3, display_name: 'Proton', app_type: 4, rt_last_time_played: 400 },
        ];
        expect(pickRecents(apps).map((g) => g.appId)).toEqual([1, 2]);
    });

    it('maps fields', () => {
        expect(pickRecents(fixture)[0]).toEqual({ appId: 3001, name: 'Game A', lastPlayed: 1791000000, playedMinutes: 50, isNew: false, addedAt: 0 });
    });

    it('shows as many as Steam\'s own recents list (20) by default', () => {
        expect(RECENTS_LIMIT).toBe(20);
        const many = Array.from({ length: 25 }, (_, i) => ({ appid: 5000 + i, display_name: `G${i}`, app_type: 1, rt_last_time_played: 1790000000 + i }));
        const ids = pickRecents(many).map((g) => g.appId);
        expect(ids).toHaveLength(20);
        expect(ids[0]).toBe(5024);
    });

    it('respects the limit', () => {
        expect(pickRecents(fixture, 2).map((g) => g.appId)).toEqual([3001, 3002]);
    });

    it('of an empty list is empty', () => {
        expect(pickRecents([])).toEqual([]);
    });
});

describe('formatLastPlayed', () => {
    const now = 1791050000;
    it('says Today, Yesterday, then N days ago, then a date', () => {
        expect(formatLastPlayed(now - 60, now, 'en')).toBe('Today');
        expect(formatLastPlayed(now - DAY, now, 'en')).toBe('Yesterday');
        expect(formatLastPlayed(now - 3 * DAY, now, 'en')).toBe('3 days ago');
        expect(formatLastPlayed(now - 40 * DAY, now, 'en-US')).toBe('Aug 24');
    });
    it("a date names its month, in the language's own order, so it can't be misread (#57: 10/12 is October to some, 12 December to others)", () => {
        expect(formatLastPlayed(now - 40 * DAY, now, 'en-GB')).toBe('24 Aug');
        expect(formatLastPlayed(now - 40 * DAY, now, 'de-DE')).toBe('24. Aug.');
        for (const locale of ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE']) expect(formatLastPlayed(now - 40 * DAY, now, locale), locale).not.toMatch(/^[\d\s./-]+$/);
    });
    it('a date from an earlier year has the year', () => {
        expect(formatLastPlayed(now - 400 * DAY, now, 'en-US')).toBe('Aug 29, 2025');
    });
});

describe('mergeRecentSources', () => {
    const app = (appid: number, played: number, app_type = 1) => ({ appid, display_name: `G${appid}`, app_type, rt_last_time_played: played });

    it('fills Steam\'s short recent list up to 20 from the library, newest first, without hidden apps or duplicates', () => {
        const recent = Array.from({ length: 10 }, (_, i) => app(100 + i, 2000 + i));
        const library = [...recent, ...Array.from({ length: 15 }, (_, i) => app(200 + i, 1000 + i)), app(999, 5000), app(300, 0), app(301, 1500, 3)];
        const hidden = (id: number) => id === 999;
        const ids = pickRecents(mergeRecentSources(recent, library, hidden)).map((g) => g.appId);
        expect(ids).toHaveLength(20);
        expect(ids.slice(0, 10)).toEqual(Array.from({ length: 10 }, (_, i) => 109 - i));
        expect(ids.slice(10)).toEqual(Array.from({ length: 10 }, (_, i) => 214 - i));
        expect(ids).not.toContain(999);
        expect(ids).not.toContain(300);
        expect(ids).not.toContain(301);
    });
    it('drops the hidden games from Steam\'s own list too (a hidden game that is new to the library, or played before it was hidden)', () => {
        const recent = [app(1, 300), app(2, 200), app(3, 100)];
        const out = mergeRecentSources(recent, [], (id) => id === 2);
        expect(out.map((a) => a.appid)).toEqual([1, 3]);
        const full = Array.from({ length: 20 }, (_, i) => app(100 + i, 2000 + i));
        expect(pickRecents(mergeRecentSources(full, [], (id) => id === 105))).toHaveLength(19); // a complete list is no excuse
    });
    it('leaves a complete Steam list as it is', () => {
        const recent = Array.from({ length: 20 }, (_, i) => app(100 + i, 2000 + i));
        expect(mergeRecentSources(recent, [app(500, 9999)], () => false)).toBe(recent);
    });
    it('a throwing hidden check keeps Steam\'s own games and drops the library\'s fill-ins; no library adds nothing', () => {
        const recent = [app(1, 10)];
        expect(mergeRecentSources(recent, [app(2, 20)], () => { throw new Error('x'); })).toEqual(recent);
        expect(mergeRecentSources(recent, [], () => false)).toEqual(recent);
    });
});

describe('pickHomeRecents (New to library)', () => {
    const played = (appid: number, at: number) => ({ appid, display_name: `P${appid}`, app_type: 1, rt_last_time_played: at, minutes_playtime_forever: 60 });
    const fresh = (appid: number, added: number, app_type = 1) => ({ appid, display_name: `N${appid}`, app_type, rt_last_time_played: 0, rt_purchased_time: added });
    const none = () => false;

    it('off: exactly the played games, as before', () => {
        const recent = [played(1, 300), fresh(2, 400), played(3, 100)];
        const games = pickHomeRecents({ recent, all: [], isHidden: none, includeNew: false });
        expect(games.map((g) => g.appId)).toEqual([1, 3]);
        expect(games.every((g) => !g.isNew)).toBe(true);
    });
    it('on: Steam\'s unplayed games join the row, ordered with the played ones by when they were added', () => {
        const recent = [played(1, 300), fresh(2, 400), played(3, 100), fresh(4, 200)];
        const games = pickHomeRecents({ recent, all: [], isHidden: none, includeNew: true });
        expect(games.map((g) => [g.appId, g.isNew])).toEqual([[2, true], [1, false], [4, true], [3, false]]);
        expect(games[0]).toMatchObject({ lastPlayed: 0, playedMinutes: 0, addedAt: 400 });
    });
    it('only from Steam\'s recent list (never the rest of the library); tools and games without an added time stay out', () => {
        const recent = [played(1, 300), fresh(5, 0), fresh(6, 500, 4)];
        const all = [fresh(7, 900)];
        const games = pickHomeRecents({ recent, all, isHidden: none, includeNew: true });
        expect(games.map((g) => g.appId)).toEqual([1]);
    });
    it('at most 20 in total, newest first', () => {
        const recent = [...Array.from({ length: 15 }, (_, i) => played(100 + i, 1000 + i)), ...Array.from({ length: 10 }, (_, i) => fresh(200 + i, 2000 + i))];
        const games = pickHomeRecents({ recent, all: [], isHidden: none, includeNew: true });
        expect(games).toHaveLength(RECENTS_LIMIT);
        expect(games.slice(0, 10).every((g) => g.isNew)).toBe(true);
    });
    it('added time: purchase time, else recent activity, else 0', () => {
        expect(addedTime({ appid: 1, display_name: '', app_type: 1, rt_purchased_time: 10, rt_recent_activity_time: 20 })).toBe(10);
        expect(addedTime({ appid: 1, display_name: '', app_type: 1, rt_recent_activity_time: 20 })).toBe(20);
        expect(addedTime({ appid: 1, display_name: '', app_type: 1 })).toBe(0);
    });
});

describe('pickHomeRecents never shows a hidden game, new to the library or not', () => {
    const app = (appid: number, played: number, added = 0) => ({ appid, display_name: `G${appid}`, app_type: 1, rt_last_time_played: played, rt_original_release_date: 0, rt_purchased_time: added, rt_recent_activity_time: added });
    it('skips a hidden never-played game in Steam\'s list (it was shown as "new to library")', () => {
        const recent = [app(1, 500), app(261570, 0, 1700000000)];
        const games = pickHomeRecents({ recent, all: recent, isHidden: (id) => id === 261570, includeNew: true });
        expect(games.map((g) => g.appId)).toEqual([1]);
    });
});

describe("pickSteamHomeRecents: Steam's own Home row order (SteamOS 3.8.28, its Home module's recent games)", () => {
    // Steam's Home: games played on this device, recent purchases and installed games, newest first by steamHomeTime
    // (the most recently played here always first); games played only elsewhere (its account-wide recent list) from
    // the 16th place on. Probed on the Deck and the Ally, 2026-10-20 (Reddit, 3.4: an uninstalled Warframe played on a
    // PC led Game Glance's row; Steam's Home showed it far back).
    const here = (appid: number, local: number, extra: Record<string, unknown> = {}) => ({ appid, display_name: `L${appid}`, app_type: 1, rt_last_time_played: local, rt_last_time_locally_played: local, local_per_client_data: { installed: true }, rt_last_time_played_or_installed: local, minutes_playtime_forever: 30, ...extra });
    const elsewhere = (appid: number, at: number) => ({ appid, display_name: `E${appid}`, app_type: 1, rt_last_time_played: at, rt_recent_activity_time: at, minutes_playtime_forever: 90 });
    const installed = (appid: number, at: number, extra: Record<string, unknown> = {}) => ({ appid, display_name: `I${appid}`, app_type: 1, local_per_client_data: { installed: true }, rt_last_time_played_or_installed: at, rt_purchased_time: 1, ...extra });
    const none = () => false;
    const empty = { recent: [], localPlayed: [], recentPurchased: [], localGames: [] };

    it('steamHomeTime: the latest of played here, bought, and (installed only) played-or-installed', () => {
        expect(steamHomeTime({ appid: 1, display_name: '', app_type: 1, rt_last_time_locally_played: 5, rt_purchased_time: 9 })).toBe(9);
        expect(steamHomeTime(installed(1, 50))).toBe(50);
        expect(steamHomeTime({ ...installed(1, 50), local_per_client_data: { installed: false } })).toBe(1);
        expect(steamHomeTime({ appid: 1, display_name: '', app_type: 1 })).toBe(0);
    });
    it('a game played only on another device comes after the games played or installed here, never first (Warframe)', () => {
        const games = pickSteamHomeRecents({ ...empty, recent: [elsewhere(9, 900), here(1, 500)], localPlayed: [here(1, 500)], localGames: [here(1, 500), installed(2, 300)], isHidden: none, includeNew: true });
        expect(games.map((g) => g.appId)).toEqual([1, 2, 9]);
    });
    it('the most recently played here is first even when an installed or bought game is newer; the rest by steamHomeTime', () => {
        const localPlayed = [here(1, 100), here(2, 400)];
        const games = pickSteamHomeRecents({ ...empty, localPlayed, recentPurchased: [{ appid: 3, display_name: 'B', app_type: 1, rt_purchased_time: 300 }], localGames: [installed(4, 900)], isHidden: none, includeNew: true });
        expect(games.map((g) => g.appId)).toEqual([1, 4, 2, 3]);
    });
    it('games played elsewhere start at the 16th place when there are more than 15 here; at most 20', () => {
        const localGames = Array.from({ length: 18 }, (_, i) => installed(100 + i, 1000 - i));
        const recent = [elsewhere(900, 5000), elsewhere(901, 4000), elsewhere(902, 3000), elsewhere(903, 2000), elsewhere(904, 1000), elsewhere(905, 500)];
        const ids = pickSteamHomeRecents({ ...empty, recent, localGames, isHidden: none, includeNew: true }).map((g) => g.appId);
        expect(ids).toHaveLength(RECENTS_LIMIT);
        expect(ids.slice(0, 15)).toEqual(Array.from({ length: 15 }, (_, i) => 100 + i));
        expect(ids.slice(15)).toEqual([900, 901, 902, 903, 904]);
    });
    it('Steam counts tools in the first 15 and drops them after (as its Home does), so they can pull elsewhere games forward', () => {
        const localGames = [installed(1, 900), installed(2, 800, { app_type: 4, display_name: 'Proton' }), ...Array.from({ length: 14 }, (_, i) => installed(10 + i, 700 - i))];
        const ids = pickSteamHomeRecents({ ...empty, recent: [elsewhere(99, 5000)], localGames, isHidden: none, includeNew: true }).map((g) => g.appId);
        expect(ids[14]).toBe(99);
        expect(ids).not.toContain(2);
    });
    it('each game once, never a hidden one, and the lists Steam gives are taken as they are (its visibleApps)', () => {
        const games = pickSteamHomeRecents({ recent: [elsewhere(9, 10), here(1, 50)], localPlayed: [here(1, 50), here(1, 50)], recentPurchased: [installed(2, 20)], localGames: [installed(2, 20), installed(3, 30)], isHidden: (id) => id === 3, includeNew: true });
        expect(games.map((g) => g.appId)).toEqual([1, 2, 9]);
    });
    it('a game played here but unknown to Steam\'s servers is not "new to library" (AC and Death\'s Door on the Deck); last played falls back to here', () => {
        const ac = { ...here(15100, 0), rt_last_time_played: 0, rt_last_time_locally_played: 777 };
        const [game] = pickSteamHomeRecents({ ...empty, localPlayed: [ac], isHidden: none, includeNew: true });
        expect(game).toMatchObject({ appId: 15100, lastPlayed: 777, isNew: false });
        const titan = { ...here(4540, 0), rt_last_time_played: 10, rt_last_time_locally_played: 999 };
        expect(pickSteamHomeRecents({ ...empty, localPlayed: [titan], isHidden: none, includeNew: true })[0].lastPlayed).toBe(10);
    });
    it('never-played games (bought or installed) are "new to library" with their added time, and left out with includeNew off', () => {
        const bought = { appid: 3, display_name: 'B', app_type: 1, rt_purchased_time: 300 };
        const lists = { ...empty, localPlayed: [here(1, 100)], recentPurchased: [bought] };
        expect(pickSteamHomeRecents({ ...lists, isHidden: none, includeNew: true }).map((g) => [g.appId, g.isNew, g.addedAt])).toEqual([[1, false, 0], [3, true, 300]]);
        expect(pickSteamHomeRecents({ ...lists, isHidden: none, includeNew: false }).map((g) => g.appId)).toEqual([1]);
    });
    it('keeps games, demos and shortcuts only; a throwing hidden check keeps the game', () => {
        const localGames = [installed(1, 90), installed(2, 80, { app_type: 8 }), installed(3, 70, { app_type: 1073741824 }), installed(4, 60, { app_type: 2048 })];
        expect(pickSteamHomeRecents({ ...empty, localGames, isHidden: () => { throw new Error('x'); }, includeNew: true }).map((g) => g.appId)).toEqual([1, 2, 3]);
    });
});
