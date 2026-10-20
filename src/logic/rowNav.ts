/**
 * D-pad order for a button row whose visual order differs from its DOM order (CSS `order` moved a button). Steam steps
 * through a row in DOM order, so the buttons must be stepped by position instead. Pure: `xs` are the buttons' left edges
 * in DOM order.
 */

/** Also step across native focus groups: Steam will otherwise stop at that group's edge. */
export function needsVisualNav(xs: number[], crossesGroups = false): boolean {
    if (crossesGroups && xs.length > 1) return true;
    for (let i = 1; i < xs.length; i++) if (xs[i] < xs[i - 1]) return true;
    return false;
}

/** The DOM index of the button next to `from` in the given direction by position, or null at the row's end. */
export function visualNeighbour(xs: number[], from: number, dir: 'left' | 'right'): number | null {
    if (from < 0 || from >= xs.length) return null;
    const byX = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x || a.i - b.i);
    const at = byX.findIndex((e) => e.i === from);
    const next = byX[dir === 'right' ? at + 1 : at - 1];
    return next ? next.i : null;
}

/**
 * Steam's gamepad focus ring is one absolutely positioned node with an outline. Its class hash changes between Steam
 * builds, so it is recognised from the rule text. The other circles replace that ring with a white fill; the
 * preferred-version link would otherwise keep the square.
 */
export function focusRingClass(cssText: string): string | null {
    const rules = cssText.matchAll(/\.([\w-]+)\s*\{([^{}]*)\}/g);
    for (const match of rules) {
        const body = match[2];
        if (body.includes('position') && body.includes('absolute') && body.includes('pointer-events') && body.includes('outline-offset')) {
            return match[1];
        }
    }
    return null;
}

/** Visible Steam status controls can refuse focus; continue in the same direction to the next usable control. */
export function focusVisualNeighbour(xs: number[], from: number, dir: 'left' | 'right', take: (index: number) => boolean): number | null {
    let next = visualNeighbour(xs, from, dir);
    while (next !== null) {
        if (take(next)) return next;
        next = visualNeighbour(xs, next, dir);
    }
    return null;
}

/** React can leave the previous gpfocus class in place during a burst; the event's own target wins. */
export function rowFocusIndex<T>(items: T[], target: T | null, highlighted: T | null, contains: (item: T, target: T) => boolean): number {
    const at = target === null ? -1 : items.findIndex((item) => contains(item, target));
    return at >= 0 ? at : highlighted === null ? -1 : items.findIndex((item) => contains(item, highlighted));
}
