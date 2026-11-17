import { SHORTCUT_APP_TYPE } from '../data/installedGames';
import { PhraseKey, tr } from '../i18n/steamText';
import { addedTime, isRowApp, RawApp, RECENTS_LIMIT, RecentGame } from './recents';

/**
 * Home's games row from one of Steam's collections instead of the recent games (Quick Access → Games row). Steam's
 * collections (`collectionStore.userCollections`, probed on the Ally 2026-10-09): `favorite`, `local-install`, the
 * user's own (`uc-…`), Steam ROM Manager's (`srm-…`, often empty), the type collections (`type-music`: Soundtracks)
 * and `uncategorized` (most of the library). Pure.
 */

/** What the Games row shows: Steam's recent games (the default) or a collection's id. */
export const RECENT_ROW = 'recent';

/**
 * Every game installed here, Steam's and non-Steam shortcuts (emulators, Heroic, Lutris…) together. Not one of Steam's
 * collections: Steam's Locally Installed Games leaves the shortcuts out (probed on the Ally: none in its list, while
 * shortcuts played here were in the others). Steam's collection ids never start with `gg-`.
 */
export const INSTALLED_ROW = 'gg-installed';
export const INSTALLED_ROW_NAME = 'All installed games';

export const ROW_SORTS = ['lastPlayed', 'name', 'added'] as const;
export type RowSort = (typeof ROW_SORTS)[number];

/** A stored sort, else last played (the default, and what an unknown value reads as). */
export function rowSortOf(value: unknown): RowSort {
    return (ROW_SORTS as readonly unknown[]).includes(value) ? (value as RowSort) : 'lastPlayed';
}

export interface HomeCollection {
    id: string;
    name: string;
    count: number;
}

interface CollectionLike {
    id?: unknown;
    displayName?: unknown;
    allApps?: unknown;
}

/**
 * Steam's own two collections by Steam's own words: their stored names (`displayName` is a plain stored string) keep the
 * language Steam had when it made them. The user's collections keep their own names.
 */
const STEAM_NAMES: Record<string, () => string> = { favorite: () => tr('favorites'), 'local-install': () => tr('localGames') };

/** Steam's own collections first, in this order; the user's follow by name. */
const FIRST = ['favorite', 'local-install'];
/** Not offered: the type collections (Soundtracks…) and Uncategorized (most of the library, no choice made). */
const offered = (id: string) => id !== 'uncategorized' && !id.startsWith('type-');

/** The collections the Games row can show: offered ones with a name and at least one app. */
export function homeCollections(collections: unknown): HomeCollection[] {
    if (!Array.isArray(collections)) return [];
    const list: HomeCollection[] = [];
    for (const c of collections as Array<CollectionLike | null | undefined>) {
        if (!c || typeof c !== 'object') continue;
        const id = typeof c.id === 'string' ? c.id : '';
        const name = typeof c.displayName === 'string' ? c.displayName : '';
        const count = Array.isArray(c.allApps) ? c.allApps.length : 0;
        if (!id || !name || count === 0 || !offered(id)) continue;
        list.push({ id, name: STEAM_NAMES[id]?.() ?? name, count });
    }
    const rank = (c: HomeCollection) => (FIRST.includes(c.id) ? FIRST.indexOf(c.id) : FIRST.length);
    return list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/**
 * The apps of the All installed games row: Steam's installed apps (`localGames`, its Locally Installed Games) and every
 * non-Steam shortcut in the library (`library`, all app overviews), each once. Junk is skipped. Pure.
 */
export function installedRowApps<T extends RawApp>(localGames: unknown, library: unknown): T[] {
    const seen = new Set<number>();
    const apps: T[] = [];
    const add = (a: T | null | undefined) => {
        if (!a || typeof a !== 'object' || !Number.isInteger(a.appid) || seen.has(a.appid)) return;
        seen.add(a.appid);
        apps.push(a);
    };
    if (Array.isArray(localGames)) (localGames as T[]).forEach(add);
    if (Array.isArray(library)) (library as T[]).forEach((a) => { if (a?.app_type === SHORTCUT_APP_TYPE) add(a); });
    return apps;
}

/**
 * The picker's list with All installed games (`count` games) right after Steam's own two collections; unchanged when
 * there is none.
 */
export function withInstalledRow(list: HomeCollection[], count: number): HomeCollection[] {
    if (count <= 0) return list;
    const at = list.filter((c) => FIRST.includes(c.id)).length;
    return [...list.slice(0, at), { id: INSTALLED_ROW, name: INSTALLED_ROW_NAME, count }, ...list.slice(at)];
}

const sortName = (a: RawApp & { sort_as?: unknown }) => (typeof a.sort_as === 'string' && a.sort_as ? a.sort_as : a.display_name ?? '').toLowerCase();

/**
 * A collection's games for the row: games, demos and shortcuts only (recents.isRowApp), none the user hid in Steam (a failing check keeps the
 * game: it must not empty Home), sorted by `sort` (last played: played newest first, then never-played newest added
 * first; name: Steam's sort name, so a leading "The" does not count; added: newest added first), at most `limit`.
 */
export function pickCollectionGames<T extends RawApp & { sort_as?: unknown }>(apps: T[], isHidden: (appId: number) => boolean, sort: RowSort, limit = RECENTS_LIMIT): RecentGame[] {
    const visible = apps.filter((a) => {
        if (!a || !isRowApp(a)) return false;
        try {
            return !isHidden(a.appid);
        } catch {
            return true;
        }
    });
    const played = (a: T) => Number(a.rt_last_time_played) || 0;
    const compare: Record<RowSort, (a: T, b: T) => number> = {
        lastPlayed: (a, b) => played(b) - played(a) || addedTime(b) - addedTime(a),
        name: (a, b) => sortName(a).localeCompare(sortName(b)),
        added: (a, b) => addedTime(b) - addedTime(a) || played(b) - played(a),
    };
    return visible
        .sort(compare[sort])
        .slice(0, limit)
        .map((a) => ({
            appId: a.appid,
            name: a.display_name,
            lastPlayed: played(a),
            playedMinutes: Math.max(0, Number(a.minutes_playtime_forever) || 0),
            isNew: false,
            addedAt: addedTime(a),
        }));
}

const SORT_PHRASES: Record<RowSort, PhraseKey> = { lastPlayed: 'sortLastPlayed', name: 'sortName', added: 'sortAdded' };

/** A sort's name as Steam's library names it ("Last Played", "Alphabetical", "Date Added to Library"), in Steam's language. */
export function rowSortLabel(sort: RowSort): string {
    return tr(SORT_PHRASES[sort]);
}

/** Steam's "Sort By:" without its colon, for a field label. */
export function sortByLabel(): string {
    return tr('sortBy').replace(/\s*[:：]\s*$/, '');
}

/**
 * Steam's collections as the Games row picker offers them, with All installed games, read live (empty when Steam's
 * store is not there).
 */
export function steamHomeCollections(): HomeCollection[] {
    try {
        const steam = globalThis as unknown as { collectionStore?: { userCollections?: unknown; localGamesCollection?: { allApps?: unknown } }; appStore?: { allApps?: unknown } };
        const installed = installedRowApps(steam.collectionStore?.localGamesCollection?.allApps, steam.appStore?.allApps).filter(isRowApp).length;
        return withInstalledRow(homeCollections(steam.collectionStore?.userCollections), installed);
    } catch {
        return [];
    }
}

/** The eyebrow with the collection's name in front ("Backlog · Last played · Yesterday"); unchanged for the recent games. */
export function collectionEyebrow(collection: string | null, line: string): string {
    return collection ? `${collection} · ${line}` : line;
}
