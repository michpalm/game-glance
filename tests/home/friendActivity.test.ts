import { describe, expect, it, vi } from 'vitest';
import { createFriendActivity, parseActivity } from '../../src/home/friendActivity';

const ach = (strName: string, rtUnlocked: number) => ({ strName, rtUnlocked, bAchieved: true });
/** Steam's appActivityStore entry for one game: days → achievements by account id → the unlock event. */
const game = (days: Array<Record<number, Array<ReturnType<typeof ach>>>>) => ({
    m_mapActivityByDay: new Map(days.map((users, i) => [i, {
        m_mapAchievementsByUser: new Map(Object.entries(users).map(([acc, list]) => [Number(acc), { rtEventTime: list[0]?.rtUnlocked ?? 0, m_rgAchievements: list }])),
    }])),
});

describe('parseActivity (one friend\'s unlocks in one game)', () => {
    it('picks the newest unlock for the friend', () => {
        const g = game([{ 7: [ach('Old', 100_000)] }, { 7: [ach('Hole in One', 200_000), ach('Par', 199_000)], 8: [ach('Not theirs', 300_000)] }]);
        expect(parseActivity(g, 7)).toEqual({ latest: { name: 'Hole in One', at: 200_000 }, lastSession: 2 });
    });
    it('counts the unlocks of the last session: within 6 h of the newest', () => {
        const h = 3600;
        const g = game([{ 7: [ach('A', 100 * h), ach('B', 98 * h), ach('C', 90 * h)] }]);
        expect(parseActivity(g, 7).lastSession).toBe(2);
    });
    it('nothing for the friend, unknown shapes and junk give an empty result', () => {
        const empty = { latest: null, lastSession: 0 };
        expect(parseActivity(game([{ 8: [ach('A', 1)] }]), 7)).toEqual(empty);
        for (const junk of [null, undefined, 5, 'x', {}, { m_mapActivityByDay: 3 }, { m_mapActivityByDay: new Map([[1, null]]) }]) expect(parseActivity(junk, 7)).toEqual(empty);
        expect(parseActivity(game([{ 7: [{ strName: 7, rtUnlocked: 'x' } as never] }]), 7)).toEqual(empty);
    });
    it('skips achievements not achieved', () => {
        expect(parseActivity(game([{ 7: [{ strName: 'Locked', rtUnlocked: 0, bAchieved: false } as never] }]), 7).latest).toBeNull();
    });
});

describe('createFriendActivity', () => {
    it('asks Steam for each game\'s activity at most once per 5 minutes', () => {
        let t = 0;
        const fetch = vi.fn();
        const a = createFriendActivity({ fetch, activity: () => undefined }, () => t);
        a.want([1, 2, 1]);
        a.want([1]);
        expect(fetch.mock.calls.map(c => c[0])).toEqual([1, 2]);
        t = 5 * 60_000;
        a.want([1]);
        expect(fetch).toHaveBeenCalledTimes(3);
    });
    it('reads Steam\'s cache; a game Steam has not loaded gives null', () => {
        const store = new Map<number, unknown>([[1, game([{ 7: [ach('A', 50)] }])]]);
        const a = createFriendActivity({ fetch: () => {}, activity: id => store.get(id) }, () => 0);
        expect(a.get(1, 7)?.latest?.name).toBe('A');
        expect(a.get(2, 7)).toBeNull();
        expect(a.get(1, 0)).toBeNull();
    });
    it('a throwing Steam call never throws out (Review Focus 2)', () => {
        const a = createFriendActivity({ fetch: () => { throw new Error('x'); }, activity: () => { throw new Error('y'); } }, () => 0);
        expect(() => a.want([1])).not.toThrow();
        expect(a.get(1, 7)).toBeNull();
    });
});

import { achievementLine } from '../../src/home/friendActivity';

describe('achievementLine', () => {
    const NOW = 1_795_000_000_000, S = NOW / 1000;
    it('one unlock in the last session: its name and when; several: how many', () => {
        expect(achievementLine({ latest: { name: 'Hole in One', at: S - 12 * 60 }, lastSession: 1 }, NOW)).toBe('Hole in One · 12 min ago');
        expect(achievementLine({ latest: { name: 'Par', at: S - 3 * 3600 }, lastSession: 3 }, NOW)).toBe('3 achievements · last session');
    });
    it('nothing known: no line', () => {
        expect(achievementLine({ latest: null, lastSession: 0 }, NOW)).toBe('');
        expect(achievementLine(null, NOW)).toBe('');
    });
});
