import { describe, expect, it } from 'vitest';
import fixture from './fixtures/recents.json';
import { formatLastPlayed, pickRecents } from '../../src/home/recents';

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
