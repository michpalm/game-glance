import { describe, expect, it } from 'vitest';
import { dealCard, dealCards } from '../../src/home/recommended';
import type { Deal } from '../../src/home/wishlist';

const deal = (appId: number, discountPercent = 40, extra: Partial<Deal> = {}): Deal => ({ appId, name: `D${appId}`, discountPercent, deckVerified: false, ...extra });

describe('dealCard', () => {
    it('discount badge, name, the price and the full price struck through (no word to translate)', () => {
        expect(dealCard(deal(10, 50, { price: '$29.99', fullPrice: '$59.99' }))).toEqual({
            appId: 10, name: 'D10', pill: '-50%', sub: '$29.99 $59.99',
            subParts: [{ text: '$29.99' }, { text: ' ' }, { text: '$59.99', struck: true }],
        });
        expect(dealCard(deal(13, 50, { price: '$1', fullPrice: '$2', deckVerified: true })).subParts).toEqual([
            { text: '$1' }, { text: ' ' }, { text: '$2', struck: true }, { text: ' - ' }, { text: 'Deck verified' },
        ]);
    });
    it('Deck verified after the price; no price reads On your wishlist', () => {
        expect(dealCard(deal(11, 40, { price: '$9.99', deckVerified: true })).sub).toBe('$9.99 - Deck verified');
        expect(dealCard(deal(12)).sub).toBe('On your wishlist');
    });
});

describe('dealCards', () => {
    it('biggest discount first, ties in the given order', () => {
        expect(dealCards([deal(1, 20), deal(2, 75), deal(3, 20), deal(4, 50)]).map((c) => c.appId)).toEqual([2, 4, 1, 3]);
        expect(dealCards([])).toEqual([]);
    });
});
