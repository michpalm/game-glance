import { describe, expect, it } from 'vitest';
import { cardsRowClass, hltbLookupKey } from '../../src/components/GameHero';
import { DEFAULT_SLOTS } from '../../src/logic/infoSlots';

describe("the game page's wiring of the Game info slots", () => {
    it('HowLongToBeat is looked up only while a slot shows it', () => {
        expect(hltbLookupKey(DEFAULT_SLOTS, 42, 3)).toBe('hltb:42:3');
        expect(hltbLookupKey({ stats: ['hltb', 'size', 'achievements'], featured: 'protondb' }, 42, 0)).toBe('hltb:42:0');
        expect(hltbLookupKey({ stats: ['played', 'size', 'achievements'], featured: 'protondb' }, 42, 0)).toBeNull();
        expect(hltbLookupKey({ stats: ['played', 'size', 'achievements'], featured: null }, 42, 0)).toBeNull();
    });
    it('the cards row is single (the info card spans it) when nothing is featured', () => {
        expect(cardsRowClass(null)).toBe('gg-cards gg-cards-single');
        expect(cardsRowClass('hltb')).toBe('gg-cards');
        expect(cardsRowClass('achievements')).toBe('gg-cards');
    });
});
