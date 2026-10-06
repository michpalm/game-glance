import { describe, expect, it } from 'vitest';
import fixture from './fixtures/recents.json';
import { formatLastPlayed, mergeRecentSources, pickRecents, RECENTS_LIMIT } from '../../src/home/recents';

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
        expect(pickRecents(fixture)[0]).toEqual({ appId: 3001, name: 'Game A', lastPlayed: 1791000000, playedMinutes: 50 });
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
    it('leaves a complete Steam list as it is', () => {
        const recent = Array.from({ length: 20 }, (_, i) => app(100 + i, 2000 + i));
        expect(mergeRecentSources(recent, [app(500, 9999)], () => false)).toBe(recent);
    });
    it('a throwing hidden check drops that app; no library adds nothing', () => {
        const recent = [app(1, 10)];
        expect(mergeRecentSources(recent, [app(2, 20)], () => { throw new Error('x'); })).toEqual(recent);
        expect(mergeRecentSources(recent, [], () => false)).toEqual(recent);
    });
});
