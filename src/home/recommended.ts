import { type Deal } from './wishlist';
import { tr } from '../i18n/steamText';
import type { SubPart } from './feedLayout';

/** One wishlist sale as the Recommended tab's wide second row shows it: the discount badge, the name, the price. */
export interface DealCard {
    appId: number;
    name: string;
    /** "-50%". */
    pill: string;
    /** "$29.99 $59.99" (the full price struck through), plus "Deck verified" when Steam says so; "On your wishlist" without a price. */
    sub: string;
    /** The same line in pieces: the full price drawn struck through, as Steam's store shows a sale (no word to translate). */
    subParts: SubPart[];
}

export function dealCard(deal: Deal): DealCard {
    const price: SubPart[] = deal.price
        ? deal.fullPrice ? [{ text: deal.price }, { text: ' ' }, { text: deal.fullPrice, struck: true }] : [{ text: deal.price }]
        : [{ text: tr('onWishlist') }];
    const subParts = deal.deckVerified ? [...price, { text: ' - ' }, { text: tr('deckVerified') }] : price;
    return { appId: deal.appId, name: deal.name, pill: `-${deal.discountPercent}%`, sub: subParts.map((p) => p.text).join(''), subParts };
}

/** The deal cards, biggest discount first (ties keep the given order). */
export function dealCards(deals: Deal[]): DealCard[] {
    return [...deals].sort((a, b) => b.discountPercent - a.discountPercent).map(dealCard);
}
