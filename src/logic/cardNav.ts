/**
 * The controller on the game page's cards (#24). The cards sit under the Play row on screen, but in Steam's focus tree
 * they come before its Play section (they live in the page's header; probed on the Ally), so Steam's own Up and Down
 * ran the wrong way: Up from Play into the cards, Down from them back to Play. Home routes these four presses itself,
 * in the screen's order: Play row, cards, optional compatibility feedback, then the page's tabs. Pure.
 */

/** Steam's d-pad button numbers in its vgp_onbuttondown events (probed on the Ally; 11 and 12 are Left and Right). */
export const DPAD_UP = 9;
export const DPAD_DOWN = 10;

/** The class on a card the controller can select. */
export const CARD_NAV = 'gg-card-nav';

/** Where focus is, for these presses: the Play row (Play, its arrow, the circles, the cloud), a card, the page's tabs. */
export type CardZone = 'play' | 'cards' | 'feedback' | 'tabs';

/**
 * The game page's controller parts, the same in both restyled looks: the D-pad routing between Play, the cards, the
 * feedback row and the tabs (in Clean, without cards, it keeps Down off Play-row controls we hide, such as Steam's
 * preferred-copy link), and the focus scrolling (feedback centred, tabs below the header). Clean takes part.
 */
export function pageNavParts(restyle: boolean, _clean: boolean): { dpad: boolean; scrolling: boolean } {
    return { dpad: restyle, scrolling: restyle };
}

/** Where `button` pressed in `zone` goes; null: Steam's own move. Without cards (Clean), Play, feedback and tabs follow each other. */
export function cardNavTarget(zone: CardZone | null, button: number, hasCards: boolean, hasFeedback = false): CardZone | null {
    if (!hasCards) {
        if (zone === 'play' && button === DPAD_DOWN) return hasFeedback ? 'feedback' : 'tabs';
        if (zone === 'feedback') return button === DPAD_UP ? 'play' : button === DPAD_DOWN ? 'tabs' : null;
        if (zone === 'tabs' && button === DPAD_UP) return hasFeedback ? 'feedback' : 'play';
        return null;
    }
    if (zone === 'play' && button === DPAD_DOWN) return 'cards';
    if (zone === 'cards') return button === DPAD_UP ? 'play' : button === DPAD_DOWN ? (hasFeedback ? 'feedback' : 'tabs') : null;
    if (zone === 'feedback') return button === DPAD_UP ? 'cards' : button === DPAD_DOWN ? 'tabs' : null;
    if (zone === 'tabs' && button === DPAD_UP) return hasFeedback ? 'feedback' : 'cards';
    return null;
}

/** The zone of `el` (the press's target): `play` is Steam's Play row's selectors, null when its classes are unknown. */
export function cardZoneOf(el: Element | null, sel: { play: string | null; tabs: string; feedback?: string | null }): CardZone | null {
    if (!el) return null;
    if (el.closest(`.${CARD_NAV}`)) return 'cards';
    if (sel.play && el.closest(sel.play)) return 'play';
    if (sel.feedback && el.closest(sel.feedback)) return 'feedback';
    if (el.closest(sel.tabs)) return 'tabs';
    return null;
}

/**
 * The element a routed press lands on: back on the Play row, the button Down left from (Steam's row remembers it, so
 * landing on Play after Down from the Controller circle sent Right on from the Controller, to Settings); on the cards,
 * the one last selected; otherwise (or when the remembered one is gone) the zone's first, as `first` finds it. Pure.
 */
export function landingFor<T>(to: CardZone, memory: { row: T | null; card: T | null; feedback?: T | null }, first: (to: CardZone) => T | null, alive: (el: T) => boolean): T | null {
    const kept = to === 'play' ? memory.row : to === 'cards' ? memory.card : to === 'feedback' ? memory.feedback ?? null : null;
    return kept !== null && alive(kept) ? kept : first(to);
}

/** The first usable response (or focusable confirmation) in a visible Steam feedback panel. */
export function firstFeedbackControl(doc: Document, selector: string | null): HTMLElement | null {
    if (!selector) return null;
    const controls = '[role="button"], button, a[href], [tabindex="0"]';
    for (const row of doc.querySelectorAll<HTMLElement>(selector)) {
        const candidates = [...(row.matches(controls) ? [row] : []), ...row.querySelectorAll<HTMLElement>(controls)];
        for (const el of candidates) {
            if (el.getBoundingClientRect().width > 0 && !el.matches('[disabled], [aria-disabled="true"]') && !el.closest('[hidden], [aria-hidden="true"]')) return el;
        }
    }
    return null;
}

/** The page's cards that are on screen (Clean keeps them in the page, hidden): the D-pad's card stops. */
export function selectableCards(doc: Document): HTMLElement[] {
    return [...doc.querySelectorAll<HTMLElement>(`.${CARD_NAV}`)].filter((el) => el.getBoundingClientRect().width > 0);
}

/**
 * `target` as an element, by what it is (an element node that can take focus), never by `instanceof`: Game Glance runs in
 * Steam's shared context, and the page's elements belong to the Big Picture window, whose HTMLElement is another one.
 * (instanceof was always false there, so Up from the cards never knew the button Down had left from.) Pure.
 */
export function asElement(target: unknown): HTMLElement | null {
    const el = target as { nodeType?: unknown; focus?: unknown } | null;
    return el && typeof el === 'object' && el.nodeType === 1 && typeof el.focus === 'function' ? (target as HTMLElement) : null;
}

/** Nearest visible target by horizontal position, shared by both directions across the two rows. */
export function cardBelowControl(source: Element | null, cards: HTMLElement[]): HTMLElement | null {
    if (!source) return null;
    const from = source.getBoundingClientRect();
    const centre = from.x + from.width / 2;
    let nearest: HTMLElement | null = null;
    let distance = Infinity;
    for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (rect.width <= 0) continue;
        const gap = Math.abs(rect.x + rect.width / 2 - centre);
        if (gap < distance) { nearest = card; distance = gap; }
    }
    return nearest;
}

/** Keep a remembered button only when it belongs above this card, never across to the other side. */
export function controlAboveCard(card: HTMLElement, cards: HTMLElement[], controls: HTMLElement[], remembered: HTMLElement | null): HTMLElement | null {
    const aligned = controls.filter((control) => cardBelowControl(control, cards) === card);
    if (remembered && aligned.includes(remembered)) return remembered;
    return cardBelowControl(card, aligned.length ? aligned : controls);
}
