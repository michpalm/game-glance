import { GameInfoSlots, slotOrder } from './infoSlots';

/** Home's "added" chip stands in for Played (a game new to the library), so it takes Played's slot. */
const slotKey = (key: string): string => (key === 'added' ? 'played' : key);

/**
 * The items whose key is in a slot, in slot order (three stats, then the featured one). An item no slot holds is dropped,
 * a slot with no item closes up. Pure.
 */
export function orderBySlots<T extends { key: string }>(items: T[], slots: GameInfoSlots): T[] {
    const out: T[] = [];
    for (const id of slotOrder(slots)) {
        const item = items.find((i) => slotKey(i.key) === id);
        if (item) out.push(item);
    }
    return out;
}

/** The Full look's info card: only the three stat slots, in order (the featured stat has its own card). Pure. */
export function pageInfoStats<T extends { key: string }>(items: T[], slots: GameInfoSlots): T[] {
    return orderBySlots(items, { stats: slots.stats, featured: null });
}
