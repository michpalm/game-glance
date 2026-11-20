import { isValidElement, type ReactElement, type ReactNode } from 'react';

export type DeveloperPage = { label: ReactNode; items: ReactNode[] };

/**
 * Steam's Developer entry (`Xt`, probed 2026-11-12) is a plain function component that builds its own submenu
 * (`Vs` with label and items) from hooks. Called inline here, from the panel's own render, its hooks run there and
 * its items can be listed on a page in place.
 *
 * Returns the page; `null` when Steam shows no Developer menu; `undefined` when it cannot be read this way
 * (then the panel keeps Steam's own submenu). Must be called on every render of the same component (hooks).
 */
export function expandDeveloper(element: unknown): DeveloperPage | null | undefined {
    if (!isValidElement(element)) return undefined;
    const type = element.type as unknown as { (props: unknown): unknown; prototype?: { isReactComponent?: unknown } };
    if (typeof type !== 'function' || type.prototype?.isReactComponent) return undefined;
    let out: unknown;
    try { out = type(element.props); } catch { return undefined; }
    if (out === null) return null;
    if (!isValidElement(out)) return undefined;
    const props = (out as ReactElement<{ label?: ReactNode; children?: unknown }>).props;
    if (props.label == null || !Array.isArray(props.children)) return undefined;
    return { label: props.label, items: props.children.filter(Boolean) as ReactNode[] };
}
