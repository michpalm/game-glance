import { RefObject, useEffect, useRef, useState } from 'react';
import { clearLaunch, launchPending } from '../data/launchIntent';

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
 * Whether the page hides its text: while Steam's launch screen is shown, and, when Home just launched this game
 * (`pending`, data/launchIntent), from the page's first frame until that screen has come and gone, so the page never
 * shows between Play on Home and the launch screen. A launch screen that never comes ends with `pending`.
 */
export function launchHidden({ pending, overlayShown, overlaySeen }: { pending: boolean; overlayShown: boolean; overlaySeen: boolean }): boolean {
    return overlayShown || (pending && !overlaySeen);
}

/**
 * True while the page that `ref` is on should hide its text for a launch (launchHidden): Steam's launch overlay is shown,
 * or Home just launched `appId` and the overlay has not come and gone yet. Plugin code runs in SharedJSContext, so the
 * page's own document (Steam's Big Picture window) is read from the element. Polled while the page is open; any
 * failure reads as "not shown", which leaves the page as it is. Without the overlay's class nothing hides.
 */
export function useLaunchOverlay(ref: RefObject<HTMLElement | null>, overlay: string | null, hide: string[], appId = 0): boolean {
    // Starts hidden for a launch from Home, so the very first frame has no text (no fade from a visible page).
    const [hidden, setHidden] = useState(() => overlay !== null && launchPending(appId));
    const seen = useRef(false);
    const key = `${overlay ?? ''}|${hide.join(',')}|${appId}`;
    useEffect(() => {
        if (!overlay) return undefined;
        seen.current = false;
        const check = () => {
            const overlayShown = launchOverlayShown(ref.current?.ownerDocument as Doc | undefined, overlay, hide);
            if (overlayShown) seen.current = true;
            const pending = launchPending(appId);
            // Once the launch screen has come and gone, this launch is over: back to the page as normal.
            if (seen.current && !overlayShown && pending) clearLaunch();
            setHidden(launchHidden({ pending, overlayShown, overlaySeen: seen.current }));
        };
        check();
        const timer = setInterval(check, LAUNCH_POLL_MS);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ref, key]);
    return hidden;
}
