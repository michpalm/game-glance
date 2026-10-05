import { formatHours, minutesToHours } from '../logic/format';
import { formatLastPlayed } from './recents';

export interface Chip {
    key: string;
    label: string;
    value: string;
    /** 0..1; drawn as a thin bar under the value. */
    progress?: number;
}

export interface GameChipInput {
    playedMinutes: number;
    achievements: { achieved: number; total: number } | null;
    lastPlayed: number;
    hltbMainHours: number | null;
}

export function gameChips(i: GameChipInput, now: number, locale: string): Chip[] {
    const playedHours = minutesToHours(i.playedMinutes);
    const chips: Chip[] = [{ key: 'played', label: 'Played', value: formatHours(playedHours, locale) }];
    if (i.achievements && i.achievements.total > 0) {
        const { achieved, total } = i.achievements;
        chips.push({
            key: 'achievements',
            label: 'Achievements',
            value: `${achieved} / ${total}`,
            progress: Math.min(1, Math.max(0, achieved / total)),
        });
    }
    chips.push({ key: 'lastPlayed', label: 'Last played', value: formatLastPlayed(i.lastPlayed, now, locale) });
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
    return chips;
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
        { key: 'games', label: 'Games', value: formatCount(i.games, locale) },
        { key: 'installed', label: 'Installed', value: formatCount(i.installed, locale) },
        { key: 'favorites', label: 'Favorites', value: formatCount(i.favorites, locale) },
    ];
    if (i.storageBytes !== null) chips.push({ key: 'storage', label: 'Storage', value: formatGigabytes(i.storageBytes, locale) });
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
