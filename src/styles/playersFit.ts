/**
 * Where the player count pill goes: in the pill row (store, family, players, right to left) while the row stays right of
 * the right-hand stat card's left edge; above the pills, right-aligned, once it would cross that line (spec
 * 2026-11-12-player-count-pill). Measured, since the count's width varies; shared by Home, the page and the open copy.
 */

export type PlayersPlacement = 'row' | 'above';

/** In the row up to the line (inclusive); above past it; in the row when there is no line. */
export function playersPlacement({ pillLeft, limit }: { pillLeft: number; limit: number | null }): PlayersPlacement {
    return limit === null || pillLeft >= limit ? 'row' : 'above';
}

/** The page's card split (themeCss PAGE_LAYOUT.cards.split): the right column's share, for a row with one card. */
const SPLIT = [1.1, 1] as const;

const visible = (el: Element | null): el is HTMLElement => !!el && el.getBoundingClientRect().width > 0;

/** The page's gap between its two cards, in d units (themeCss PAGE_LAYOUT.cards.gridGap). */
const GRID_GAP = 18;

/** The right column's start in a row `x`..`x + w` with one card: where the split would put the second. */
const rightColumn = (x: number, w: number, gap: number) => x + (w - gap) * SPLIT[0] / (SPLIT[0] + SPLIT[1]) + gap;

/**
 * The fit line from the page's model (home/openTargets pageTargets' `shells`, in client px), for Home, whose own cards are
 * hidden at rest, and the open's copy: Spotlight's right-hand card, the Clean panel, or where the right column would
 * start (one card spanning the row); null without cards.
 */
export function limitFromShells(look: 'spotlight' | 'clean', shells: { x: number; w: number }[], d: number): number | null {
    if (shells.length === 0) return null;
    if (look === 'clean' || shells.length > 1) return shells[shells.length - 1].x;
    return rightColumn(shells[0].x, shells[0].w, GRID_GAP * d);
}

/**
 * The game page's fit line in client px: its right-hand stat card's left edge (the second card, or the Clean look's
 * panel); with one card, where the right column would start; null when there are no cards. (Home: limitFromShells.)
 */
export function playersLimit(root: HTMLElement): number | null {
    for (const selector of ['.gg-cards > :last-child:not(:first-child)', '.gg-clean-info']) {
        const card = root.querySelector(selector);
        if (visible(card)) return card.getBoundingClientRect().left;
    }
    const grid = root.querySelector('.gg-cards');
    if (!visible(grid)) return null;
    const box = grid.getBoundingClientRect();
    const gap = parseFloat(grid.ownerDocument.defaultView?.getComputedStyle(grid).columnGap ?? '') || 0;
    return rightColumn(box.left, box.width, gap);
}

/**
 * Keeps `holder`'s `data-players` ('row' | 'above') and `--gg-family-w` (the family pill's width, which the CSS places
 * the row pill by) up to date: the `[data-players-pill]` child is measured where the row puts it, against
 * `limitOf()` (the page's cards by default), again whenever the pills or the cards resize or the count's text changes. Returns the stop.
 */
export function observePlayersPlacement(holder: HTMLElement, root: HTMLElement, limitOf: () => number | null = () => playersLimit(root)): () => void {
    const view = holder.ownerDocument.defaultView as (Window & typeof globalThis) | null;
    let stopped = false;
    const measure = () => {
        if (stopped) return;
        const pill = holder.querySelector<HTMLElement>('[data-players-pill]');
        const family = holder.querySelector<HTMLElement>('.gg-family, .gh-family, .gh-x-family');
        // Writes only what changed: each write is a mutation the observers below would see again.
        const width = `${family ? family.offsetWidth : 0}px`; // layout px: Home's canvas is scaled
        if (holder.style.getPropertyValue('--gg-family-w') !== width) holder.style.setProperty('--gg-family-w', width);
        if (!pill) { if (holder.dataset.players !== undefined) delete holder.dataset.players; return; }
        const was = holder.dataset.players;
        if (was !== undefined) delete holder.dataset.players; // measured where the row puts it
        const next = playersPlacement({ pillLeft: pill.getBoundingClientRect().left, limit: limitOf() });
        holder.dataset.players = next;
    };
    const Resize = view?.ResizeObserver;
    const resize = Resize ? new Resize(() => measure()) : undefined;
    for (const el of [holder, ...holder.children, ...root.querySelectorAll('.gg-cards, .gg-clean-info')]) resize?.observe(el);
    const Mutation = view?.MutationObserver;
    // Attribute records are ignored even if delivered (measure writes the holder's attributes; some DOMs report them anyway).
    const text = Mutation ? new Mutation((records) => { if (records.some((r) => r.type !== 'attributes')) measure(); }) : undefined;
    // The pills coming and going, and the count's text: never attributes (measure writes those).
    text?.observe(holder, { childList: true, subtree: true, characterData: true, attributes: false });
    measure();
    return () => {
        stopped = true;
        resize?.disconnect();
        text?.disconnect();
        delete holder.dataset.players;
        holder.style.removeProperty('--gg-family-w');
    };
}

/**
 * A callback ref for a pill holder (React 19 runs its returned cleanup when the element goes): the placement watcher is
 * attached to whichever element is mounted, so a holder rebuilt on the way back to Home is placed too. `limitOf` gets the
 * holder's `.gh-root` (Home's fit line comes from the page model, home/openHome.homePlayersLimit).
 */
export function placePlayersOn(active: boolean, limitOf: (root: HTMLElement) => number | null): (el: HTMLElement | null) => (() => void) | undefined {
    return (el) => {
        const root = el?.closest<HTMLElement>('.gh-root');
        return active && el && root ? observePlayersPlacement(el, root, () => limitOf(root)) : undefined;
    };
}
