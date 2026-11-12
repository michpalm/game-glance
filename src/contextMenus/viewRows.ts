import type { ReactNode } from 'react';
import type { Collection, GameMenuModel, Item } from './reshape';
import type { DeveloperPage } from './developerPage';

export type Page = 'main' | 'collections' | 'manage' | 'developer';
export type IconName = 'star' | 'folder' | 'wrench' | 'code' | 'gear' | 'plus' | 'image';
export type Row = {
    key: string;
    kind: 'check' | 'page' | 'steam' | 'separator';
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
    m.after.forEach((element, i) => {
        const key = String((element as { key?: unknown } | null)?.key ?? '');
        rows.push({ key: `after-${i}`, kind: 'steam', element, ...(/artwork/i.test(key) ? { icon: 'image' as const } : {}) });
    });
    if (m.properties) rows.push({ key: 'sep-properties', kind: 'separator' }, { key: 'properties', kind: 'steam', icon: 'gear', element: m.properties });
    return rows;
}
