import { describe, expect, it } from 'vitest';
import { PlayNextCandidate, scorePlayNext } from '../../src/home/playNext';

const c = (appId: number, playedMinutes: number, hltbMainHours: number | null = null, name = `G${appId}`): PlayNextCandidate => ({
    appId, name, playedMinutes, hltbMainHours,
});

describe('scorePlayNext', () => {
    it('ranks not started before low playtime before short HLTB', () => {
        const cards = scorePlayNext([c(3, 600, 5), c(2, 30, 40), c(1, 0, 60)], new Set());
        expect(cards.map((x) => x.appId)).toEqual([1, 2, 3]);
    });
    it('excludes the given ids and never-installed or hidden entries', () => {
        const cards = scorePlayNext([c(1, 0), c(2, 0), c(0, 0), c(4, 0, null, '')], new Set([2]));
        expect(cards.map((x) => x.appId)).toEqual([1]);
    });
    it('pills: Not started, else Play next (a short game is Play next too)', () => {
        const [a, b, d] = scorePlayNext([c(1, 0), c(2, 900, 9.5), c(3, 900, 10)], new Set());
        expect([a.pill, a.pillKey]).toEqual(['Not started', 'notStarted']);
        expect([b.pill, b.pillKey]).toEqual(['Play next', 'playNext']);
        expect([d.pill, d.pillKey]).toEqual(['Play next', 'playNext']);
    });
    it('respects the limit and an empty list', () => {
        expect(scorePlayNext([c(1, 0), c(2, 0), c(3, 0)], new Set(), 2)).toHaveLength(2);
        expect(scorePlayNext([], new Set())).toEqual([]);
    });
    it('orders low-playtime games least played first and short games shortest first', () => {
        expect(scorePlayNext([c(1, 90), c(2, 10), c(3, 50)], new Set()).map((x) => x.appId)).toEqual([2, 3, 1]);
        expect(scorePlayNext([c(1, 900, 8), c(2, 900, 2), c(3, 900, 5)], new Set()).map((x) => x.appId)).toEqual([2, 3, 1]);
    });
    it('treats an HLTB time of 0 as unknown, not short', () => {
        const [a, b] = scorePlayNext([c(1, 900, 0), c(2, 900, 4)], new Set());
        expect(a.appId).toBe(2);
        expect(b.pill).toBe('Play next');
    });
});
