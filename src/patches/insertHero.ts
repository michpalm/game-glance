/* eslint-disable @typescript-eslint/no-explicit-any */
export type InsertResult = 'inserted' | 'present' | 'noContainer' | 'noAnchor' | 'error';

type Finder = (tree: any, predicate: (node: any) => boolean) => any;

/**
 * Inserts `element` into Steam's game page tree just before Steam's overview block (Play row + tabs).
 * The theme CSS then overlays it under the Play row; Steam's own structure never changes.
 * Pure (no @decky/ui import) and never throws, so a Steam update can only make it do nothing.
 */
export function insertHero(ret: any, innerClass: string | undefined, element: { key: unknown }, find: Finder): InsertResult {
    try {
        if (!ret || !innerClass) return 'noContainer';
        const container = find(
            ret,
            (x: any) => Array.isArray(x?.props?.children) && typeof x?.props?.className === 'string' && x.props.className.includes(innerClass),
        )?.props?.children as any[] | undefined;
        if (!container) return 'noContainer';
        if (container.some((child) => child?.key === element.key)) return 'present';
        const index = container.findIndex(
            (child) =>
                child?.props?.childFocusDisabled !== undefined &&
                child?.props?.navRef !== undefined &&
                child?.props?.children?.props?.details !== undefined &&
                child?.props?.children?.props?.overview !== undefined,
        );
        if (index < 0) return 'noAnchor';
        container.splice(index, 0, element);
        return 'inserted';
    } catch {
        return 'error';
    }
}
