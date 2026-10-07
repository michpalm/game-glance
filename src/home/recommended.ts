import { type Deal } from './wishlist';
import { tr } from '../i18n/steamText';

/** One wishlist sale as the Recommended tab's wide second row shows it: the discount badge, the name, the price. */
export interface DealCard {
    appId: number;
    name: string;
    /** "-50%". */
    pill: string;
    /** "$29.99 - was $59.99", plus "Deck verified" when Steam says so; "On your wishlist" without a price. */
    sub: string;
}

export function dealCard(deal: Deal): DealCard {
    const price = deal.price ? (deal.fullPrice ? `${deal.price} - was ${deal.fullPrice}` : deal.price) : '';
    const parts = [price || tr('onWishlist'), ...(deal.deckVerified ? [tr('deckVerified')] : [])];
    return { appId: deal.appId, name: deal.name, pill: `-${deal.discountPercent}%`, sub: parts.join(' - ') };
}

/** The deal cards, biggest discount first (ties keep the given order). */
export function dealCards(deals: Deal[]): DealCard[] {
    return [...deals].sort((a, b) => b.discountPercent - a.discountPercent).map(dealCard);
}
