import { useEffect } from 'react';
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
        const clear = () => doc.querySelectorAll(`[${COVERED}]`).forEach((el) => el.removeAttribute(COVERED));
        const update = () => {
            try {
                if (away) return clear();
                // Never clear and set again: the opacity transition would flicker once a second.
                const bar = findTopBar(doc, doc.defaultView?.innerWidth ?? 0);
                doc.querySelectorAll(`[${COVERED}]`).forEach((el) => {
                    if (el !== bar) el.removeAttribute(COVERED);
                });
                if (bar && !bar.hasAttribute(COVERED)) bar.setAttribute(COVERED, '');
            } catch {
                // leave Steam's bar as it is
            }
        };
        update();
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
            clearInterval(timer);
            clear();
        };
    }, [doc, away]);
}


/** The rule the marker triggers; shipped with the status bar so it holds on every page it is drawn on. */
export const COVER_CSS = `[${COVERED}] { opacity: 0 !important; transition: none !important; }`;
