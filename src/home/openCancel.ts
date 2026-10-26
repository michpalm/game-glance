import { RETURN_TIMINGS } from './motion';

/** B cancels a pending Home open before a zone handler or Steam's router can also act on it. */
export function listenOpenCancel(doc: EventTarget, cancel: () => void): () => void {
    const onCancel = (event: Event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancel();
    };
    doc.addEventListener('vgp_oncancel', onCancel, { capture: true });
    return () => doc.removeEventListener('vgp_oncancel', onCancel, { capture: true });
}

/** Marks Home's root while a cancelled open fades back in (homeCss matches it like the way back's gh-back). */
export const RETURN_ATTR = 'data-gh-return';

/**
 * Home's own way back (homeCss gh-return-in) for a cancelled open. Home stays mounted, so its gh-back state (a React
 * class set on mount) cannot be reused; the attribute is plain DOM that React never rewrites. A second cancel before the
 * fade is over restarts it. Cosmetic: it never throws.
 */
export function showCancelReturn(root: HTMLElement, later: (fn: () => void, ms: number) => unknown = (fn, ms) => setTimeout(fn, ms)): void {
    try {
        if (!root.isConnected) return;
        if (root.hasAttribute(RETURN_ATTR)) {
            root.removeAttribute(RETURN_ATTR);
            // Reading the layout restarts the CSS animation when the attribute comes back.
            void root.offsetWidth;
        }
        root.setAttribute(RETURN_ATTR, '');
        later(() => {
            try {
                root.removeAttribute(RETURN_ATTR);
            } catch {
                // cosmetic only
            }
        }, RETURN_TIMINGS.fade + 50);
    } catch {
        // cosmetic only
    }
}
