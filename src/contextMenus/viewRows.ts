import { createElement, Fragment, type ReactNode } from 'react';
import type { Collection, GameMenuModel, Item } from './reshape';
import type { DeveloperPage } from './developerPage';

export type Page = 'main' | 'collections' | 'manage' | 'developer';
export type IconName = 'star' | 'folder' | 'wrench' | 'code' | 'gear' | 'plus' | 'image';
export type Row = {
    key: string;
    kind: 'check' | 'page' | 'steam' | 'separator' | 'slot';
    label?: ReactNode;
    icon?: IconName;
    end?: string;
    on?: boolean;
    /** The Steam item whose action a check row runs. */
    run?: Item;
    page?: Exclude<Page, 'main'>;
    /** Steam's own element, for a steam row. */
    element?: ReactNode;
};

/** SteamGridDB's Change Artwork… item key (its own, placed before Properties by SteamGridDB itself). */
export const SGDB_CHANGE_ARTWORK = 'sgdb-change-artwork';

/** The Collections row's end text: where the game is ("Backlog", "Backlog +2"), or nothing. */
export function collectionsEnd(list: Collection[]): string {
    const inIt = list.filter((c) => c.inIt);
    return inIt.length === 0 ? '' : inIt.length === 1 ? inIt[0].name : `${inIt[0].name} +${inIt.length - 1}`;
}

/**
 * The panel's rows for one page, from Steam's own items (spec B). Pure.
 * `dev`: Developer read as a page; `null` when Steam shows none; `undefined` when unreadable (Steam's own submenu row).
 */
export function viewRows(m: GameMenuModel, page: Page, dev?: DeveloperPage | null): Row[] {
    if (page === 'collections') {
        const c = m.collections;
        if (!c) return [];
        return [
            ...c.list.map((col): Row => ({ key: `col-${col.id}`, kind: 'check', label: col.name, on: col.inIt, run: col.inIt && col.remove ? col.remove : col.add })),
            ...(c.newCollection ? [{ key: 'sep-new', kind: 'separator' } as Row, { key: 'new', kind: 'steam', icon: 'plus', element: c.newCollection } as Row] : []),
        ];
    }
    if (page === 'developer') return (dev?.items ?? []).map((element, i): Row => ({ key: `dev-${i}`, kind: 'steam', element }));
    if (page === 'manage') return (m.manage?.items ?? []).map((element, i): Row => ({ key: `manage-${i}`, kind: 'steam', element }));
    const rows: Row[] = [];
    if (m.favorite) rows.push({ key: 'favorite', kind: 'check', icon: 'star', on: m.favorite.on, run: m.favorite.item });
    if (m.collections) rows.push({ key: 'collections', kind: 'page', icon: 'folder', page: 'collections', end: collectionsEnd(m.collections.list) });
    if (m.manage) rows.push({ key: 'manage', kind: 'page', icon: 'wrench', page: 'manage', label: m.manage.label });
    m.rest.forEach((element, i) => rows.push({ key: `rest-${i}`, kind: 'steam', element }));
    if (dev) rows.push({ key: 'developer', kind: 'page', icon: 'code', page: 'developer', label: dev.label });
    else if (m.developer && dev === undefined) rows.push({ key: 'developer', kind: 'steam', icon: 'code', element: m.developer });
    let sgdbLabel: ReactNode = null;
    m.after.forEach((element, i) => {
        const key = String((element as { key?: unknown } | null)?.key ?? '');
        // SteamGridDB's item is in Steam's tree on the first render only, then SteamGridDB inserts its own copy before
        // Properties: drawing the first one here made it hop across the separator. Left to SteamGridDB; its place is held.
        if (key === SGDB_CHANGE_ARTWORK) { sgdbLabel = (element as { props?: { children?: ReactNode } }).props?.children ?? null; return; }
        rows.push({ key: `after-${i}`, kind: 'steam', element, ...(/artwork/i.test(key) ? { icon: 'image' as const } : {}) });
    });
    if (m.properties) {
        rows.push({ key: 'sep-properties', kind: 'separator' });
        // SteamGridDB's own row lands a frame later, right before Properties: a stand-in holds its place (hidden by CSS as
        // soon as the real row is there), so the box does not grow and Properties does not move.
        if (sgdbLabel != null) rows.push({ key: 'sgdb-slot', kind: 'slot', label: sgdbLabel, icon: 'image' });
        rows.push({ key: 'properties', kind: 'steam', icon: 'gear', element: m.properties });
    }
    return rows;
}

/**
 * What the panel hands Steam's menu root. SteamGridDB adds Change Artwork into any list of children the root gets,
 * "before Properties"; a page has no Properties, so its splice(-1) landed between the header and the rows. A page gives
 * the root one element (SteamGridDB skips it); the main list stays a list, so Change Artwork stays before Properties.
 */
export function rootChildren(page: Page, header: ReactNode, body: ReactNode[]): ReactNode {
    return page === 'main' ? [header, ...body] : createElement(Fragment, null, header, ...body);
}

/** NavEntryPositionPreferences.FIRST in @decky/ui. */
const NAV_ENTRY_FIRST = 0;
/** A page's group takes the first focus and hands it to its first real row: its first entries can be Steam components
 * that render nothing, and with no row claiming focus Steam focused its hidden Cancel (B then closed the menu). */
export function pageGroupFocus() {
    return { preferredFocus: true, navEntryPreferPosition: NAV_ENTRY_FIRST };
}

/** A row's classes: Properties is marked, so a plugin row right before it (SteamGridDB's) can be told apart. */
export function rowClassName(row: Pick<Row, 'key' | 'kind'>): string {
    return row.key === 'properties' ? 'gg-gm-row gg-gm-properties' : 'gg-gm-row';
}
