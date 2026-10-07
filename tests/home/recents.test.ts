import { describe, expect, it } from 'vitest';
import fixture from './fixtures/recents.json';
import { addedTime, formatLastPlayed, mergeRecentSources, pickHomeRecents, pickRecents, RECENTS_LIMIT } from '../../src/home/recents';

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
        expect(formatLastPlayed(now - 40 * DAY, now, 'en')).toBe(new Date((now - 40 * DAY) * 1000).toLocaleDateString('en'));
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
