import { RefObject, useEffect, useState } from 'react';

/** How often the page looks for Steam's launch overlay while it is open (a single selector lookup). */
export const LAUNCH_POLL_MS = 250;

/** The bits of a DOM element and document the check reads, so it can be tested without a DOM. */
interface El {
    getClientRects(): { length: number };
    contains(other: unknown): boolean;
}
interface Doc {
    querySelector(selector: string): El | null;
    querySelectorAll(selector: string): ArrayLike<El>;
}

/**
 * Whether Steam's launch overlay is on screen and the page may hide its text under it: the overlay exists, is rendered
 * (an element with no boxes is display: none or detached), and is not inside anything that would hide (if Steam ever
 * moves it into the page, hiding the page would hide the overlay too, so nothing hides). Never throws.
 */
export function launchOverlayShown(doc: Doc | null | undefined, overlay: string | null, hide: string[]): boolean {
    if (!doc || !overlay) return false;
    try {
        const el = doc.querySelector(overlay);
        if (!el || el.getClientRects().length === 0) return false;
        for (const selector of hide) {
            const list = doc.querySelectorAll(selector);
            for (let i = 0; i < list.length; i++) if (list[i].contains(el)) return false;
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * True while Steam's launch overlay is shown over the page that `ref` is on. Plugin code runs in SharedJSContext, so
 * the page's own document (Steam's Big Picture window) is read from the element. Polled while the page is open; any
 * failure reads as "not shown", which leaves the page as it is.
 */
export function useLaunchOverlay(ref: RefObject<HTMLElement | null>, overlay: string | null, hide: string[]): boolean {
    const [shown, setShown] = useState(false);
    const key = `${overlay ?? ''}|${hide.join(',')}`;
    useEffect(() => {
        if (!overlay) return undefined;
        const check = () => setShown(launchOverlayShown(ref.current?.ownerDocument as Doc | undefined, overlay, hide));
        check();
        const timer = setInterval(check, LAUNCH_POLL_MS);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ref, key]);
    return shown;
}
