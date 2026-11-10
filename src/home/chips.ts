import { formatAchievements, formatBytes, formatHours, minutesToHours } from '../logic/format';
import { formatLastPlayed } from './recents';
import { tr } from '../i18n/steamText';
import type { ProtonTier } from '../logic/protonTier';
import type { GameInfoSlots } from '../logic/infoSlots';
import { orderBySlots } from '../logic/slotStats';

export interface Chip {
    key: string;
    label: string;
    value: string;
    /** 0..1; drawn as a thin bar under the value. */
    progress?: number;
    /** A coloured mark before the value, by name (the ProtonDB chip: its rating; homeCss colours it). */
    tone?: string;
}

export interface GameChipInput {
    playedMinutes: number;
    achievements: { achieved: number; total: number } | null;
    /** Unix seconds; shown in the eyebrow under the title ("Last played · Today"), no longer as a chip. */
    lastPlayed: number;
    hltbMainHours: number | null;
    /** Set for a game new to the library (never played): when it was added. Replaces Played and Last played. */
    addedAt?: number;
    /** A Steam game not installed: its installed flag, and the space Steam says it needs (the chip right of Played). */
    installed?: boolean;
    spaceBytes?: number | null;
    /** The game's ProtonDB rating; null or missing (not a Steam game, no rating, not known yet) leaves the chip out. */
    protonTier?: ProtonTier | null;
}

/** The game's chips: everything it has, in the order of the user's info slots (a slot with nothing to show closes up). */
export function gameChips(i: GameChipInput & { slots: GameInfoSlots }, now: number, locale: string): Chip[] {
    const playedHours = minutesToHours(i.playedMinutes);
    const isNew = typeof i.addedAt === 'number' && i.addedAt > 0;
    const chips: Chip[] = isNew
        ? [{ key: 'added', label: tr('added'), value: formatLastPlayed(i.addedAt as number, now, locale) }]
        : [{ key: 'played', label: tr('played'), value: formatHours(playedHours, locale) }];
    const space = i.installed === false && typeof i.spaceBytes === 'number' ? formatBytes(i.spaceBytes, locale) : null;
    if (space) chips.splice(1, 0, { key: 'size', label: tr('spaceRequired'), value: space });
    if (i.achievements && i.achievements.total > 0) {
        const { achieved, total } = i.achievements;
        chips.push({
            key: 'achievements',
            label: tr('achievements'),
            value: formatAchievements({ achieved, total }),
            progress: Math.min(1, Math.max(0, achieved / total)),
        });
    }
    if (i.hltbMainHours !== null && i.hltbMainHours > 0) {
        chips.push({
            key: 'hltb',
            label: 'HLTB main',
            value: formatHours(i.hltbMainHours, locale),
            progress: Math.min(1, playedHours / i.hltbMainHours),
        });
    } else {
        chips.push({ key: 'hltb', label: 'HLTB main', value: '—' });
    }
    // ProtonDB's own names for its ratings (Platinum ... Borked), as its site writes them: not translated.
    if (i.protonTier) chips.push({ key: 'protondb', label: 'ProtonDB', value: i.protonTier[0].toUpperCase() + i.protonTier.slice(1), tone: i.protonTier });
    return orderBySlots(chips, i.slots);
}

export interface LibraryChipInput {
    games: number;
    installed: number;
    favorites: number;
    storageBytes: number | null;
}

function formatCount(n: number, locale: string): string {
    try {
        return new Intl.NumberFormat(locale).format(n);
    } catch {
        return String(n);
    }
}

function formatGigabytes(bytes: number, locale: string): string {
    const gb = bytes / 1024 ** 3;
    try {
        return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(gb)} GB`;
    } catch {
        return `${gb.toFixed(1)} GB`;
    }
}

export function libraryChips(i: LibraryChipInput, locale: string): Chip[] {
    const chips: Chip[] = [
        { key: 'games', label: tr('games'), value: formatCount(i.games, locale) },
        { key: 'installed', label: tr('installed'), value: formatCount(i.installed, locale) },
        { key: 'favorites', label: tr('favorites'), value: formatCount(i.favorites, locale) },
    ];
    if (i.storageBytes !== null) chips.push({ key: 'storage', label: tr('storage'), value: formatGigabytes(i.storageBytes, locale) });
    return chips;
}

type SizedApp = { size_on_disk?: string | number };
type CollectionGlobals = {
    collectionStore?: {
        allGamesCollection?: { allApps?: SizedApp[] };
        localGamesCollection?: { allApps?: SizedApp[] };
        BIsFavorite?(app: unknown): boolean;
    };
};
const steam = globalThis as unknown as CollectionGlobals;

/**
 * Install size source (probed on the Ally, 2026-10-03): `size_on_disk` on each app in
 * `collectionStore.localGamesCollection.allApps` is a byte count as a string (e.g. "7997085707").
 * Summed over the installed games it gave 209867996485 for 21 apps. `appDetailsStore` had no
 * `strSizeOnDisk` for them, so it is not used. Returns null when nothing is readable.
 */
export function readStorageBytes(): number | null {
    try {
        const apps = steam.collectionStore?.localGamesCollection?.allApps;
        if (!apps) return null;
        let total = 0;
        for (const app of apps) {
            const size = Number(app.size_on_disk);
            if (Number.isFinite(size) && size > 0) total += size;
        }
        return total > 0 ? total : null;
    } catch {
        return null;
    }
}

export function readLibraryCounts(): { games: number; installed: number; favorites: number } {
    try {
        const store = steam.collectionStore;
        const all = store?.allGamesCollection?.allApps ?? [];
        const installed = store?.localGamesCollection?.allApps?.length ?? 0;
        const favorites = store?.BIsFavorite ? all.filter((app) => store.BIsFavorite?.(app)).length : 0;
        return { games: all.length, installed, favorites };
    } catch {
        return { games: 0, installed: 0, favorites: 0 };
    }
}
