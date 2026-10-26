import { useEffect } from 'react';
import { openUnderway } from '../data/openIntent';
import { findTopBar } from './topBar';

export const COVERED = 'data-gg-covered';
const QUICK_MS = 50;
const QUICK_TICKS = 60; // 3 s

/**
 * Home and the game page: while our bar is up, Steam's own top bar (search,
 * controller, Wi-Fi, battery, clock, avatar) is see-through (opacity, so it stays focusable for the D-pad; no fade, so it is gone at once). When focus
 * enters it, `away` is set: Steam's bar shows and ours fades. Marked with an attribute the page's CSS reacts to, which Steam's
 * own rendering never touches; cleared when the bar goes.
 */
export function useHideSteamBar(doc: Document | null, away: boolean): void {
    useEffect(() => {
        if (!doc) return undefined;
        const release = holdCover(doc);
        const clear = () => doc.querySelectorAll(`[${COVERED}]`).forEach((el) => el.removeAttribute(COVERED));
        const update = () => {
            try {
                if (away) return clear();
                coverBar(doc, findTopBar(doc, doc.defaultView?.innerWidth ?? 0));
            } catch {
                // leave Steam's bar as it is
            }
        };
        update();
        // A mutation observer runs before the next paint, so Steam's bar is covered as its route change draws it (the
        // timer alone can let it show for a frame behind ours, which flickered on the game page's entry).
        const win = doc.defaultView;
        const observer = win && win.MutationObserver ? new win.MutationObserver(update) : null;
        observer?.observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
        // Quick at first so the bar is hidden as the page opens, then once a second (Steam may re-render its bar).
        let ticks = 0;
        let timer = setInterval(() => {
            update();
            if (++ticks === QUICK_TICKS) {
                clearInterval(timer);
                timer = setInterval(update, 1000);
            }
        }, QUICK_MS);
        return () => {
            observer?.disconnect();
            clearInterval(timer);
            // Only the last bar to go gives Steam's back: Steam keeps Home mounted through its exit animation, well after
            // the game page's bar took the cover over (its clearing showed Steam's bar for a frame). While an open is
            // under way, the page's bar may not be up yet; the bridge carries a copy of ours meanwhile.
            if (release() && !openUnderway()) clear();
        };
    }, [doc, away]);
}


const holders = new WeakMap<object, number>();

/**
 * One more bar (Home's or a game page's) wants Steam's top bar covered in `doc`. Returns its release, which says whether
 * it was the last one (only then is Steam's bar given back); a second call does nothing and says false.
 */
export function holdCover(doc: object): () => boolean {
    holders.set(doc, (holders.get(doc) ?? 0) + 1);
    handedOver.delete(doc);
    let held = true;
    return () => {
        if (!held) return false;
        held = false;
        const left = (holders.get(doc) ?? 1) - 1;
        holders.set(doc, left);
        return left === 0;
    };
}

const handedOver = new WeakMap<object, boolean>();

/**
 * Covers `bar` (the marker set) and uncovers any other element; never clears and sets the same bar again, the opacity
 * transition would flicker once a second. Once Steam's bar has been handed back (`handBarBack`), it clears instead: Home can
 * still be mounted when the open's copy starts to fade, and its ticks would otherwise cover the bar again.
 */
export function coverBar(doc: Document, bar: Element | null): void {
    if (handedOver.get(doc)) return clearSteamBarCover(doc);
    doc.querySelectorAll(`[${COVERED}]`).forEach((el) => {
        if (el !== bar) el.removeAttribute(COVERED);
    });
    if (bar && !bar.hasAttribute(COVERED)) bar.setAttribute(COVERED, '');
}

/**
 * The open transition to Steam's own page gives Steam's top bar back and keeps it back: no holder covers it again until a
 * new Home or game page mounts (`holdCover`), as Steam's bar fades in under the copy.
 */
export function handBarBack(doc: Document): void {
    handedOver.set(doc, true);
    clearSteamBarCover(doc);
}

/** Gives Steam's top bar back (the marker removed), e.g. after the open transition to Steam's own page. */
export function clearSteamBarCover(doc: Document | null | undefined) {
    try {
        doc?.querySelectorAll(`[${COVERED}]`).forEach((el) => el.removeAttribute(COVERED));
    } catch {
        // leave it
    }
}

/** The rule the marker triggers; shipped with the status bar so it holds on every page it is drawn on. */
export const COVER_CSS = `[${COVERED}] { opacity: 0 !important; transition: none !important; }`;
