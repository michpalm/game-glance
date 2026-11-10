/**
 * Which game stats show on Home and the game page (docs/superpowers/specs/2026-11-10-game-info-slots): three ordered stat
 * slots and one featured slot. Each slot holds a stat or nothing. Nothing shows twice: picking a stat another slot holds
 * swaps the two slots. Space required never goes to the featured slot. Pure.
 */

export type StatId = 'played' | 'size' | 'achievements' | 'protondb' | 'hltb';

export type FeaturedId = Exclude<StatId, 'size'>;

export type SlotIndex = 0 | 1 | 2 | 'featured';

export interface GameInfoSlots {
    stats: [StatId | null, StatId | null, StatId | null];
    featured: FeaturedId | null;
}

/** The slots in settings order. */
export const SLOT_INDEXES: readonly SlotIndex[] = [0, 1, 2, 'featured'];

/** The stats in their settings order. */
export const STAT_IDS: readonly StatId[] = ['played', 'size', 'achievements', 'protondb', 'hltb'];

/** The stats the featured slot can hold: every stat but Space required. */
export const FEATURED_IDS: readonly FeaturedId[] = ['hltb', 'protondb', 'achievements', 'played'];

export const DEFAULT_SLOTS: GameInfoSlots = { stats: ['played', 'size', 'achievements'], featured: 'hltb' };

export const STAT_LABELS: Record<StatId, string> = {
    played: 'Play time',
    size: 'Space required',
    achievements: 'Achievements',
    protondb: 'ProtonDB',
    hltb: 'HowLongToBeat',
};

const isStat = (value: unknown): value is StatId => STAT_IDS.includes(value as StatId);
const isFeatured = (value: unknown): value is FeaturedId => FEATURED_IDS.includes(value as FeaturedId);

/**
 * A stored value read slot by slot: an explicit null stays empty, an invalid slot falls back to its own default, then
 * duplicates are resolved in the order stats[0], stats[1], stats[2], featured (the first keeps the stat, the rest go empty).
 */
export function infoSlotsOf(raw: unknown): GameInfoSlots {
    const value = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const list = Array.isArray(value.stats) ? value.stats : [];
    const readStat = (index: 0 | 1 | 2): StatId | null => {
        const entry = list[index];
        if (entry === null) return null;
        return isStat(entry) ? entry : DEFAULT_SLOTS.stats[index];
    };
    const readFeatured = (): FeaturedId | null => {
        if (value.featured === null) return null;
        return isFeatured(value.featured) ? value.featured : DEFAULT_SLOTS.featured;
    };
    const slots: GameInfoSlots = { stats: [readStat(0), readStat(1), readStat(2)], featured: readFeatured() };
    const seen = new Set<StatId>();
    const unique = (id: StatId | null): StatId | null => {
        if (id === null) return null;
        if (seen.has(id)) return null;
        seen.add(id);
        return id;
    };
    slots.stats = [unique(slots.stats[0]), unique(slots.stats[1]), unique(slots.stats[2])];
    slots.featured = unique(slots.featured) as FeaturedId | null;
    return slots;
}

/**
 * Puts `id` into `slot`. A stat another slot holds moves there and takes this slot's old contents (a swap); a swap that
 * would put Space required into the featured slot empties it instead. Assigning Space required to the featured slot
 * returns the slots unchanged.
 */
export function assignSlot(slots: GameInfoSlots, slot: SlotIndex, id: StatId | null): GameInfoSlots {
    if (slot === 'featured' && id === 'size') return slots;
    let next = slots;
    if (id !== null) {
        const other = slotHolding(slots, id);
        if (other !== null && other !== slot) next = withSlot(next, other, slotValue(slots, slot));
    }
    return withSlot(next, slot, id);
}

/** The stats in slot order (three stats, then the featured one), empty slots dropped. */
export function slotOrder(slots: GameInfoSlots): StatId[] {
    return [...slots.stats, slots.featured].filter((id): id is StatId => id !== null);
}

/** Whether a stat is in any slot. */
export function usesStat(slots: GameInfoSlots, id: StatId): boolean {
    return slotOrder(slots).includes(id);
}

function slotValue(slots: GameInfoSlots, slot: SlotIndex): StatId | null {
    return slot === 'featured' ? slots.featured : slots.stats[slot];
}

function slotHolding(slots: GameInfoSlots, id: StatId): SlotIndex | null {
    const index = slots.stats.indexOf(id);
    if (index !== -1) return index as 0 | 1 | 2;
    return slots.featured === id ? 'featured' : null;
}

function withSlot(slots: GameInfoSlots, slot: SlotIndex, id: StatId | null): GameInfoSlots {
    if (slot === 'featured') return { ...slots, featured: id === 'size' ? null : id };
    const stats = [...slots.stats] as GameInfoSlots['stats'];
    stats[slot] = id;
    return { ...slots, stats };
}
