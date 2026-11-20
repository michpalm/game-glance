import { describe, expect, it } from 'vitest';
import { assignSlot, DEFAULT_SLOTS, infoSlotsOf, slotOrder, usesStat } from '../../src/logic/infoSlots';

describe('infoSlotsOf', () => {
    it('defaults to Play time and Achievements, the third slot empty (ProtonDB is opt-in), HowLongToBeat featured', () => {
        expect(infoSlotsOf(undefined)).toEqual({ stats: ['played', 'achievements', null], featured: 'hltb' });
    });

    it('reads junk slot by slot', () => {
        expect(infoSlotsOf({ stats: ['protondb', 'nope', 7], featured: 'nope' })).toEqual({
            stats: ['protondb', 'achievements', null],
            featured: 'hltb',
        });
        expect(infoSlotsOf({ stats: [null, null, null], featured: null })).toEqual({ stats: [null, null, null], featured: null });
        expect(infoSlotsOf('x')).toEqual(DEFAULT_SLOTS);
    });

    it('a slot saved with Space required (now at the Install button) reads as empty, not as its default', () => {
        expect(infoSlotsOf({ stats: ['played', 'size', 'achievements'], featured: 'hltb' })).toEqual({ stats: ['played', null, 'achievements'], featured: 'hltb' });
        expect(infoSlotsOf({ stats: ['played', 'achievements', null], featured: 'size' }).featured).toBe('hltb');
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
        expect(assignSlot(DEFAULT_SLOTS, 0, 'achievements')).toEqual({ stats: ['achievements', 'played', null], featured: 'hltb' });
        expect(assignSlot(DEFAULT_SLOTS, 'featured', 'played')).toEqual({ stats: ['hltb', 'achievements', null], featured: 'played' });
        expect(assignSlot(DEFAULT_SLOTS, 2, 'protondb')).toEqual({ stats: ['played', 'achievements', 'protondb'], featured: 'hltb' });
        expect(assignSlot(DEFAULT_SLOTS, 1, null)).toEqual({ stats: ['played', null, null], featured: 'hltb' });
    });

    it('a stat moved out of the featured slot into an empty one leaves the featured slot empty', () => {
        expect(assignSlot(DEFAULT_SLOTS, 2, 'hltb')).toEqual({ stats: ['played', 'achievements', 'hltb'], featured: null });
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
