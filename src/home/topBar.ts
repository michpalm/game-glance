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

