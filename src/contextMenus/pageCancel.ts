/**
 * B on one of the panel's pages. Steam's MenuRoot runs its `onCancel` prop and then always hides the menu
 * (probed 2026-11-12), so a page catches B on its own rows and stops it there instead.
 */
export function backOnCancel(back: () => void) {
    return (evt?: Event) => {
        evt?.stopPropagation?.();
        evt?.preventDefault?.();
        back();
    };
}

/**
 * Up on a page's first row, Down on its last (the page group's onMoveUp / onMoveDown). Steam's MenuRoot always adds its
 * Cancel after our rows; we hide it, but its navigation still reached it (Down past the end, and Up wrapping round from
 * the top), so the next press only came back (PS5, 2026-11-18). True: the move is handled.
 */
export function holdAtPageEdge(group: Element | null, edge: 'first' | 'last'): boolean {
    const rows = group ? [...group.querySelectorAll('.gg-gm-row')] : [];
    const row = edge === 'first' ? rows[0] : rows[rows.length - 1];
    const active = group?.ownerDocument?.activeElement;
    return Boolean(row && active && row.contains(active));
}
