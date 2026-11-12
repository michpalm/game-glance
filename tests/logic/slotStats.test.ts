import { describe, expect, it } from 'vitest';
import { DEFAULT_SLOTS } from '../../src/logic/infoSlots';
import { orderBySlots, pageInfoStats } from '../../src/logic/slotStats';

const k = (keys: string[]) => keys.map((key) => ({ key }));

describe('orderBySlots', () => {
    it('keeps what a slot holds, in slot order, featured last', () => {
        const slots = { stats: ['hltb', 'played', null] as [string, string, null], featured: 'achievements' } as never;
        expect(orderBySlots(k(['played', 'size', 'achievements', 'hltb']), slots).map((i) => i.key)).toEqual(['hltb', 'played', 'achievements']);
    });
    it('added counts as played', () => {
        expect(orderBySlots(k(['added', 'hltb']), DEFAULT_SLOTS).map((i) => i.key)).toEqual(['added', 'hltb']);
    });
});

describe('pageInfoStats', () => {
    it('only the three stat slots', () => {
        expect(pageInfoStats(k(['played', 'size', 'achievements', 'hltb']), DEFAULT_SLOTS).map((i) => i.key)).toEqual(['played', 'achievements']);
    });
});
