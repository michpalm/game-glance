/** Steam's top bar: flush with the top edge, a thin strip across (nearly) the full width. */
export function isTopBarRect(rect: { top: number; height: number; width: number }, viewportWidth: number): boolean {
    return rect.top <= 1 && rect.height > 0 && rect.height <= 48 && viewportWidth > 0 && rect.width >= viewportWidth * 0.9;
}

/**
 * Steam's top bar element, found from your avatar's holder (its classes are hashed, `avatarHolder` is the readable
 * one) and up to the strip across the screen; null when not found. Never throws.
 */
export function findTopBar(doc: Document, viewportWidth: number): Element | null {
    try {
        let el: Element | null = doc.querySelector('[class*="avatarHolder"]');
        while (el) {
            if (isTopBarRect(el.getBoundingClientRect(), viewportWidth)) return el;
            el = el.parentElement;
        }
    } catch {
        // not found
    }
    return null;
}

/**
 * findTopBar, remembered: the bar is measured again only once Steam has replaced it (or a caller forces it). Reading
 * its rect forces a synchronous layout, and focus moves change classes on every D-pad press, so measuring on each of
 * those cost a full layout per press. Never throws.
 */
export function createTopBarFinder(doc: Document): (force?: boolean) => Element | null {
    let bar: Element | null = null;
    return (force = false) => {
        if (!force && bar?.isConnected) return bar;
        bar = findTopBar(doc, doc.defaultView?.innerWidth ?? 0);
        return bar;
    };
}

interface BarLike {
    contains(node: unknown): boolean;
    querySelector(selector: string): unknown;
}

/**
 * Whether focus is in Steam's top bar, read directly rather than from focus events: the page's focused element is
 * inside the bar, or Steam's gamepad focus (`.gpfocus`) is. While Steam's window has no system focus, Chrome still moves
 * the focused element but sends no focus events (seen on the Ally), so a bar left that way was never noticed. Pure.
 */
export function focusInTopBar(bar: BarLike | null, active: unknown): boolean {
    if (!bar) return false;
    if (active && bar.contains(active)) return true;
    return !!bar.querySelector('.gpfocus');
}
