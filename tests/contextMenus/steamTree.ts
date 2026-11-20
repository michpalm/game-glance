import { createElement, Fragment, type ReactElement } from 'react';

/** Fakes of Steam's menu components, in the shape Rt.render builds (probed 2026-11-12). */
export const tz = (p: object) => p as unknown as null;
export const kt = (p: object) => p as unknown as null;
export const Vs = (p: object) => p as unknown as null;
export const K5 = () => null;
export const Family = () => null;
export const Dev = () => null;

const item = (key: string | null, children: unknown, extra: object = {}) =>
    createElement(kt, { key: key ?? undefined, onSelected: () => key, children, ...extra } as Record<string, unknown>);

export function steamTree(o: { fav?: boolean; collections?: { id: string; name: string; in: boolean }[]; manage?: boolean; properties?: boolean; plugin?: boolean | string } = {}): ReactElement {
    const cols = o.collections ?? [{ id: 'a', name: 'Backlog', in: false }, { id: 'b', name: 'Playing', in: true }];
    const addItems = [...cols.map((c) => item(`add-to-${c.id}`, c.name, { disabled: c.in })), ...(cols.length ? [createElement(K5, { key: 'add-all-to-new-separator' })] : []), item('add-all-to-new', 'New collection…')];
    const removeItems = cols.filter((c) => c.in).map((c) => item(`remove-from-${c.id}`, c.name));
    return createElement(tz, { label: 'Portal 2' } as Record<string, unknown>,
        false,
        undefined,
        o.fav ? item(null, 'Remove from Favorites') : false,
        o.fav ? false : item(null, 'Add to Favorites'),
        createElement(Vs, { label: 'Add to', children: addItems } as Record<string, unknown>),
        removeItems.length ? createElement(Vs, { label: 'Remove from', children: removeItems } as Record<string, unknown>) : false,
        createElement(Family, { rgApps: [] } as Record<string, unknown>),
        o.manage === false ? false : createElement(Vs, { label: 'Manage', children: [item('Uninstall', 'Uninstall'), item(null, 'Hide this game')] } as Record<string, unknown>),
        createElement(Dev, { rgApps: [] } as Record<string, unknown>),
        ...(o.plugin ? [item(typeof o.plugin === 'string' ? o.plugin : 'sgdb-change-artwork', 'Change Artwork...')] : []),
        o.properties === false ? false : createElement(Fragment, null, createElement(K5), item(null, 'Properties…')),
    );
}
