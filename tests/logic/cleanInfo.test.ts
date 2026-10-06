import { describe, expect, it } from 'vitest';
import { cleanStats } from '../../src/logic/cleanInfo';

const game = { playedMinutes: 108, achievements: { achieved: 4, total: 31 } };
const found = { status: 'found' as const, gameId: 1, times: { main: 12, mainExtras: 15, completionist: 22 } };

describe('cleanStats (the Clean look\'s info card)', () => {
    it('Played, Achievements with progress, HLTB main with the played share of it', () => {
        const stats = cleanStats(game, found, 'en-US');
        expect(stats.map((s) => s.label)).toEqual(['Played', 'Achievements', 'HLTB main']);
        expect(stats[1]).toMatchObject({ value: '4 / 31' });
        expect(stats[1].progress).toBeCloseTo(4 / 31);
        expect(stats[2].progress).toBeCloseTo(1.8 / 12);
        expect(stats[0].progress).toBeUndefined();
    });
    it('no achievements: that item is left out', () => {
        expect(cleanStats({ ...game, achievements: null }, found, 'en-US').map((s) => s.key)).toEqual(['played', 'hltb']);
        expect(cleanStats({ ...game, achievements: { achieved: 0, total: 0 } }, found, 'en-US').map((s) => s.key)).toEqual(['played', 'hltb']);
    });
    it('HowLongToBeat loading shows …, not found or unavailable shows — without a bar; past the main story the bar is full', () => {
        expect(cleanStats(game, undefined, 'en-US')[2]).toEqual({ key: 'hltb', label: 'HLTB main', value: '…' });
        expect(cleanStats(game, { status: 'notFound' }, 'en-US')[2]).toEqual({ key: 'hltb', label: 'HLTB main', value: '—' });
        expect(cleanStats(game, { status: 'unavailable' }, 'en-US')[2]).toEqual({ key: 'hltb', label: 'HLTB main', value: '—' });
        expect(cleanStats({ ...game, playedMinutes: 6000 }, found, 'en-US')[2].progress).toBe(1);
    });
});
