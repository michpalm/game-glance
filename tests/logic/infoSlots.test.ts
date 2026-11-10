import { describe, expect, it } from 'vitest';
import { assignSlot, DEFAULT_SLOTS, infoSlotsOf, slotOrder, usesStat } from '../../src/logic/infoSlots';

describe('infoSlotsOf', () => {
    it('defaults to today', () => {
        expect(infoSlotsOf(undefined)).toEqual({ stats: ['played', 'size', 'achievements'], featured: 'hltb' });
    });

    it('reads junk slot by slot', () => {
        expect(infoSlotsOf({ stats: ['protondb', 'nope', 7], featured: 'size' })).toEqual({
            stats: ['protondb', 'size', 'achievements'],
            featured: 'hltb',
        });
        expect(infoSlotsOf({ stats: [null, null, null], featured: null })).toEqual({ stats: [null, null, null], featured: null });
        expect(infoSlotsOf('x')).toEqual(DEFAULT_SLOTS);
    });

    it('keeps the first of a duplicate and empties the rest', () => {
        expect(infoSlotsOf({ stats: ['played', 'played', 'hltb'], featured: 'hltb' })).toEqual({
            stats: ['played', null, 'hltb'],
            featured: null,
        });
    });
});

describe('assignSlot', () => {
    it('swaps when the stat is already placed', () => {
        expect(assignSlot(DEFAULT_SLOTS, 0, 'achievements')).toEqual({ stats: ['achievements', 'size', 'played'], featured: 'hltb' });
        expect(assignSlot(DEFAULT_SLOTS, 'featured', 'played')).toEqual({ stats: ['hltb', 'size', 'achievements'], featured: 'played' });
        expect(assignSlot(DEFAULT_SLOTS, 1, 'protondb')).toEqual({ stats: ['played', 'protondb', 'achievements'], featured: 'hltb' });
        expect(assignSlot(DEFAULT_SLOTS, 2, null)).toEqual({ stats: ['played', 'size', null], featured: 'hltb' });
    });

    it('never features Space required, and a swap that would put it there empties the featured slot instead', () => {
        expect(assignSlot(DEFAULT_SLOTS, 'featured', 'size')).toEqual(DEFAULT_SLOTS);
        expect(assignSlot(DEFAULT_SLOTS, 1, 'hltb')).toEqual({ stats: ['played', 'hltb', 'achievements'], featured: null });
    });
});

describe('slotOrder', () => {
    it('orders stats then featured', () => {
        expect(slotOrder({ stats: ['hltb', null, 'played'], featured: 'protondb' })).toEqual(['hltb', 'played', 'protondb']);
    });
});

describe('usesStat', () => {
    it('knows whether a stat is used', () => {
        expect(usesStat(DEFAULT_SLOTS, 'protondb')).toBe(false);
        expect(usesStat(DEFAULT_SLOTS, 'hltb')).toBe(true);
    });
});
