/** Game Glance's Library (spec 2026-11-19-library-page-design §2, §4): its tabs, sorting and which Steam paths it takes. */

export interface LibGame {
    appId: number;
    name: string;
    /** Minutes played, all time. */
    playedMin: number;
    /** Unix seconds; 0: never played. */
    lastPlayed: number;
    /** Bytes on disk; 0 when not installed or unknown. */
    sizeBytes: number;
    installed: boolean;
    shortcut: boolean;
}
export interface LibCollection { id: string; name: string; appIds: number[] }
export interface LibrarySnapshot { games: LibGame[]; installedIds: number[]; collections: LibCollection[] }

export type TabKey = 'recent' | 'all' | 'installed' | 'nonSteam' | 'collections' | `col:${string}`;
export interface LibTab { key: TabKey; label: string; count: number | null }
export type SortKey = 'lastPlayed' | 'name' | 'playtime' | 'size';
export const SORTS: SortKey[] = ['lastPlayed', 'name', 'playtime', 'size'];
export const SORT_LABELS: Record<SortKey, string> = { lastPlayed: 'Last played', name: 'Name', playtime: 'Playtime', size: 'Size on disk' };
/** Steam's own collections that repeat another tab (Uncategorized, Locally Installed Games) or are never shown (hidden). */
export const HIDDEN_COLLECTIONS = ['uncategorized', 'local-install', 'hidden'];
const FAVORITES = 'favorite';

/** The user's collections that get a tab: not hidden, not empty, in Steam's order. */
/** Steam's own type collections (`type-music` is Soundtracks, a tab Steam keeps) are never Game Glance tabs either. */
const isHidden = (id: string) => HIDDEN_COLLECTIONS.includes(id) || id.startsWith('type-');
const shownCollections = (s: LibrarySnapshot) => s.collections.filter(c => !isHidden(c.id) && c.appIds.length > 0);
/** Steam's All games leaves non-Steam shortcuts out (530 on the PS5, its 4 shortcuts apart): they have their own tab. */
const steamGames = (s: LibrarySnapshot) => s.games.filter(g => !g.shortcut);
const colKey = (id: string): TabKey => `col:${id}`;

export function buildTabs(s: LibrarySnapshot): LibTab[] {
    const tabs: LibTab[] = [];
    if (s.games.some(g => g.lastPlayed > 0)) tabs.push({ key: 'recent', label: 'Recently played', count: null });
    tabs.push({ key: 'all', label: 'All games', count: steamGames(s).length });
    tabs.push({ key: 'installed', label: 'Installed', count: s.games.filter(g => g.installed).length });
    for (const c of shownCollections(s)) tabs.push({ key: colKey(c.id), label: c.name, count: c.appIds.length });
    const shortcuts = s.games.filter(g => g.shortcut).length;
    if (shortcuts > 0) tabs.push({ key: 'nonSteam', label: 'Non-Steam', count: shortcuts });
    tabs.push({ key: 'collections', label: 'Collections', count: null });
    return tabs;
}

const byName = (a: LibGame, b: LibGame) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
const descending = (pick: (g: LibGame) => number) => (a: LibGame, b: LibGame) => pick(b) - pick(a) || byName(a, b);
const SORTERS: Record<SortKey, (a: LibGame, b: LibGame) => number> = {
    lastPlayed: descending(g => g.lastPlayed), name: byName, playtime: descending(g => g.playedMin), size: descending(g => g.sizeBytes),
};

export function tabGames(s: LibrarySnapshot, key: TabKey, sort: SortKey): LibGame[] {
    let list: LibGame[];
    if (key === 'recent') list = s.games.filter(g => g.lastPlayed > 0);
    else if (key === 'all') list = steamGames(s);
    else if (key === 'installed') list = s.games.filter(g => g.installed);
    else if (key === 'nonSteam') list = s.games.filter(g => g.shortcut);
    else if (key.startsWith('col:')) {
        const ids = new Set(shownCollections(s).find(c => colKey(c.id) === key)?.appIds ?? []);
        list = s.games.filter(g => ids.has(g.appId));
    } else list = [];
    return [...list].sort(SORTERS[sort]);
}

export const nextSort = (sort: SortKey): SortKey => SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length];

export type RouteChoice = { kind: 'ours'; tab: TabKey | null } | { kind: 'native' };
const NATIVE: RouteChoice = { kind: 'native' };

/** Which Steam Library paths Game Glance's Library shows, and on which tab; anything else stays Steam's. */
export function routeChoice(path: string, s: LibrarySnapshot): RouteChoice {
    const p = path.replace(/\/+$/, '');
    const has = (key: TabKey) => buildTabs(s).some(t => t.key === key);
    const ours = (key: TabKey | null): RouteChoice => (key === null || has(key) ? { kind: 'ours', tab: key } : NATIVE);
    if (p === '/library') return ours(null);
    if (p === '/library/collections') return ours('collections');
    const col = /^\/library\/collection\/([^/]+)$/.exec(p);
    if (col) {
        try { return ours(colKey(decodeURIComponent(col[1]))); } catch { return NATIVE; }
    }
    const tab = /^\/library\/tab\/([^/]+)$/.exec(p)?.[1];
    switch (tab) {
        case 'AllGames': return ours('all');
        case 'Installed': return ours('installed');
        case 'Favorites': return ours(colKey(FAVORITES));
        case 'Collections': return ours('collections');
        case 'DesktopApps': return ours('nonSteam');
        default: return NATIVE;
    }
}

/** Paths during which a chosen "Steam's library" stays chosen: the Library's own and a game page opened from it. */
export function keepsNative(path: string): boolean {
    return /^\/library(\/(tab|collection|collections|app)(\/.*)?)?\/?$/.test(path);
}

/** The names of a game's collections that have tabs, in tab order. */
export function collectionsOf(s: LibrarySnapshot, appId: number): string[] {
    return shownCollections(s).filter(c => c.appIds.includes(appId)).map(c => c.name);
}

/**
 * The order the Library warms its facts in, across all games whatever the tab (Michael, PS5 check 2026-11-19): played
 * and installed, then played, both newest first; then games in one of the user's collections; then the rest. Each
 * group by last played, then name.
 */
export function warmPriority(s: LibrarySnapshot): LibGame[] {
    const inCollection = new Set(shownCollections(s).flatMap(c => c.appIds));
    const group = (g: LibGame) => (g.lastPlayed > 0 ? (g.installed ? 0 : 1) : inCollection.has(g.appId) ? 2 : 3);
    return [...s.games].sort((a, b) => group(a) - group(b) || SORTERS.lastPlayed(a, b));
}
