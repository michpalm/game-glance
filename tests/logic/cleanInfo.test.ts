import { describe, expect, it } from 'vitest';
import { cleanStats, homeCleanStats } from '../../src/logic/cleanInfo';
import { pageInfoStats } from '../../src/logic/slotStats';

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

describe('cleanStats with a Unifideck size', () => {
    it('leaves the size out: no slot holds it (Space required is at the Install pill)', () => {
        expect(cleanStats(game, found, 'en-US', { key: 'size', label: 'Installed size', value: '3.2 GB' }).map((s) => s.key)).toEqual(['played', 'achievements', 'hltb']);
    });
});


describe('Home uses the same Clean content', () => {
    it('matches page stats including new games, loading HLTB, rounded progress and size ordering', () => {
        for (const hltb of [found, undefined, { status: 'notFound' as const }]) {
            const size = { key: 'size' as const, label: 'Installed size', value: '3.2 GB' };
            const chips = [{ key: 'added', label: 'Added', value: 'Today' }, { key: 'achievements', label: 'Achievements', value: '4 / 31', progress: 4 / 31 }];
            expect(homeCleanStats(chips, 108, hltb, 'en-US', size)).toEqual(cleanStats(game, hltb, 'en-US', size));
        }
    });
});

describe('cleanStats by slots', () => {
    it('the slots order them, ProtonDB with its tone, an empty featured slot drops HLTB', () => {
        const slots = { stats: ['hltb', 'played', 'protondb'], featured: null } as never;
        const stats = cleanStats(game, found, 'en-US', null, slots, { status: 'found', tier: 'gold' });
        expect(stats.map((s) => s.key)).toEqual(['hltb', 'played', 'protondb']);
        expect(stats[2]).toMatchObject({ value: 'Gold', tone: 'gold' });
    });
    it('Home matches the page with slots and ProtonDB', () => {
        const slots = { stats: ['protondb', 'played', null], featured: 'hltb' } as never;
        const chips = [{ key: 'protondb', label: 'ProtonDB', value: 'Gold', tone: 'gold' }];
        expect(homeCleanStats(chips, 108, found, 'en-US', null, slots)).toEqual(cleanStats({ ...game, achievements: null }, found, 'en-US', null, slots, { status: 'found', tier: 'gold' }));
    });
});

describe('the Full look info card with HLTB in a stat slot', () => {
    it('the page and Home twin both show played, hltb', () => {
        const slots = { stats: ['played', 'hltb', null], featured: null } as never;
        const page = pageInfoStats(cleanStats(game, found, 'en-US', null, slots), slots);
        const twin = pageInfoStats(homeCleanStats([], 108, found, 'en-US', null, slots), slots);
        expect(page.map((s) => s.key)).toEqual(['played', 'hltb']);
        expect(twin).toEqual(page);
        expect(pageInfoStats(cleanStats(game, undefined, 'en-US', null, slots), slots)[1].value).toBe('…');
    });
});
