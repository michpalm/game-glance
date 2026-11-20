import type { ReactElement, ReactNode } from 'react';

/** A Steam MenuItem (`kt`) element. */
export type Item = ReactElement<{ onSelected?: (e: unknown) => void; disabled?: boolean; children?: ReactNode }>;
export type Collection = { id: string; name: string; inIt: boolean; add: Item; remove: Item | null };
export type GameMenuModel = {
    name: string;
    favorite: { on: boolean; item: Item } | null;
    collections: { list: Collection[]; newCollection: Item | null } | null;
    manage: { label: ReactNode; items: ReactNode[] } | null;
    /** additionalActions and family items, in Steam's order, as Steam built them. */
    rest: ReactNode[];
    /** Steam's Developer submenu (its items are built inside it, so it stays Steam's). */
    developer: ReactNode | null;
    /** Rows other plugins add after Developer (e.g. SteamGridDB's Change Artwork), as they built them. */
    after: ReactNode[];
    properties: Item | null;
    /** Steam's own MenuItem and separator components, for the panel's rows. */
    types: { tz: unknown; kt: unknown; K5: unknown };
};

type El = { type: unknown; key: string | null; props: Record<string, unknown> };
const isEl = (v: unknown): v is El => Boolean(v) && typeof v === 'object' && 'type' in (v as object) && 'props' in (v as object);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v.flat() : v === undefined ? [] : [v]);
/** A Steam submenu (`Vs`): an element with a label and its items as children. */
const isSub = (v: unknown): v is El => isEl(v) && 'label' in v.props && Array.isArray(v.props.children);

/**
 * Steam's game menu (Rt.render's MenuRoot, slots as probed 2026-11-12) as the panel's model; null for any other shape, so
 * the panel falls back to Steam's own menu. Never throws.
 */
export function reshapeGameMenu(root: unknown): GameMenuModel | null {
    try {
        if (!isEl(root)) return null;
        const c = root.props.children;
        // Ten slots (probed 2026-11-12); other plugins may add rows before the last (SteamGridDB adds Change Artwork).
        if (!Array.isArray(c) || c.length < 10) return null;
        const [, extra, removeFav, addFav, addTo, removeFrom, family, manage, dev] = c;
        const after = c.slice(9, -1), tail = c[c.length - 1];
        if (!isSub(addTo)) return null;
        const addKids = list(addTo.props.children);
        const newCollection = addKids.find((k) => isEl(k) && k.key === 'add-all-to-new') as El | undefined;
        if (!newCollection) return null;
        // Steam's MenuItem type, from New collection… (always there); every other item is checked against it.
        const kt = newCollection.type;
        const isItem = (v: unknown): v is El => isEl(v) && v.type === kt;
        // [last] is Properties after a separator, or false in Steam's kiosk mode.
        const tailKids = isEl(tail) ? list(tail.props.children) : [];
        if (tail && !isEl(tail)) return null;
        const last = tailKids[tailKids.length - 1];
        const properties = isItem(last) ? last : null;
        if (isEl(tail) && !properties) return null;
        const sep = tailKids.find((k) => isEl(k) && k !== properties) as El | undefined;
        if (removeFav && !isItem(removeFav) || addFav && !isItem(addFav) || removeFrom && !isSub(removeFrom) || manage && !isSub(manage)) return null;
        const removes = new Map<string, El>();
        for (const k of isSub(removeFrom) ? list(removeFrom.props.children) : [])
            if (isItem(k) && k.key?.startsWith('remove-from-')) removes.set(k.key.slice('remove-from-'.length), k);
        const collections: Collection[] = [];
        for (const k of addKids) {
            if (!isItem(k) || !k.key?.startsWith('add-to-')) continue;
            const id = k.key.slice('add-to-'.length), remove = removes.get(id) ?? null;
            collections.push({ id, name: String(k.props.children ?? ''), inIt: Boolean(remove), add: k as unknown as Item, remove: remove as unknown as Item | null });
        }
        const fav = isItem(removeFav) ? removeFav : isItem(addFav) ? addFav : null;
        return {
            name: typeof root.props.label === 'string' ? root.props.label : '',
            favorite: fav ? { on: fav === removeFav, item: fav as unknown as Item } : null,
            collections: { list: collections, newCollection: newCollection as unknown as Item },
            manage: isSub(manage) ? { label: manage.props.label as ReactNode, items: list(manage.props.children) as ReactNode[] } : null,
            rest: [extra, family].filter(Boolean) as ReactNode[],
            developer: (dev as ReactNode) || null,
            after: after.filter(Boolean) as ReactNode[],
            properties: properties as unknown as Item | null,
            types: { tz: root.type, kt, K5: sep?.type ?? null },
        };
    } catch {
        return null;
    }
}
