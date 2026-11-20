import type { LibGame, SortKey, TabKey } from './libraryModel';

/**
 * What the Library remembers for the session (spec §5): the page unmounts while a game page is open, so coming back
 * finds the same tab, sort, cover and scroll here. `native`: the user chose Steam's library (Y) for this visit.
 */
export interface LibraryMemory {
    tab: TabKey | null;
    sorts: Partial<Record<TabKey, SortKey>>;
    /** The highlighted cover's app id, per tab. */
    focus: Partial<Record<TabKey, number>>;
    scroll: Partial<Record<TabKey, number>>;
    /** The highlighted cover's index, per tab: where to land when its game has gone (uninstalled, removed). */
    index: Partial<Record<TabKey, number>>;
    /** The tab Steam's path named when this visit began: coming back on the same path restores `tab` instead. */
    entry: TabKey | null;
    native: boolean;
}

const fresh = (): LibraryMemory => ({ tab: null, sorts: {}, focus: {}, scroll: {}, index: {}, entry: null, native: false });
let current = fresh();
const listeners = new Set<() => void>();
const emit = () => { for (const fn of [...listeners]) fn(); };

export const libraryMemory = {
    get: (): LibraryMemory => current,
    set(patch: Partial<LibraryMemory>): void {
        current = { ...current, ...patch };
        emit();
    },
    subscribe(fn: () => void): () => void {
        listeners.add(fn);
        return () => { listeners.delete(fn); };
    },
    reset(): void {
        current = fresh();
        emit();
    },
};

/** The index of the remembered cover; when it is gone, the nearest index to where it was. */
export function restoreIndex(games: LibGame[], appId: number | undefined, fallbackIndex: number): number {
    if (games.length === 0) return 0;
    const at = appId === undefined ? -1 : games.findIndex(g => g.appId === appId);
    return at >= 0 ? at : Math.min(Math.max(0, fallbackIndex), games.length - 1);
}

/**
 * The tab to open. Our tab changes don't change Steam's path, so B from a game page comes back on the path the visit
 * began with: the same path as last time brings back the tab that was left; a different one opens the tab it names.
 */
export function initialTab(routeTab: TabKey | null, m: LibraryMemory): TabKey | null {
    if (routeTab === null || routeTab === m.entry) return m.tab ?? routeTab;
    return routeTab;
}

/** The cover to highlight on a tab: the remembered game, else where it was. */
export function restoreFocus(games: LibGame[], m: LibraryMemory, tab: TabKey): number {
    return restoreIndex(games, m.focus[tab], m.index[tab] ?? 0);
}
