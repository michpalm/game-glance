import { useEffect, useState } from 'react';
import { focusElement } from '../home/homeNav';

/** The class that hides PlayCount's own badge while Game Glance's player pill stands in for it (themeCss). */
export const PLAYCOUNT_HIDDEN = 'gg-native-playcount';
const BADGE = '.playerBadge';

/** PlayCount's badge button on the page (it opens PlayCount's chart), or null when PlayCount drew none. */
export function playCountButton(doc: Document): HTMLElement | null {
    return doc.querySelector<HTMLElement>(`${BADGE} > button, ${BADGE} [role="button"]`);
}

/** Hides PlayCount's badges in `doc` (kept in the page, so its button still works); returns the undo. */
export function hidePlayCountBadge(doc: Document): () => void {
    const hidden = [...doc.querySelectorAll<HTMLElement>(BADGE)].filter((badge) => !badge.classList.contains(PLAYCOUNT_HIDDEN));
    for (const badge of hidden) badge.classList.add(PLAYCOUNT_HIDDEN);
    return () => { for (const badge of hidden) badge.classList.remove(PLAYCOUNT_HIDDEN); };
}

/**
 * A focus that lands inside the hidden badge (the D-pad can reach an invisible control) goes to our pill instead, as
 * GameSourcePill does for Unifideck's hidden switch. True when it moved focus.
 */
export function focusAwayFromBadge(target: Element | null, doc: Document, focus: (el: HTMLElement) => void): boolean {
    if (!target?.closest?.(`.${PLAYCOUNT_HIDDEN}`)) return false;
    const ours = doc.querySelector<HTMLElement>('.gg-players-choice');
    if (!ours) return false;
    focus(ours);
    return true;
}

/**
 * While `active`: hides PlayCount's badge (when it draws one, now or later) and returns a function that presses its
 * button, which opens PlayCount's chart; null when there is no badge. Its badge comes back when `active` ends.
 */
export function usePlayCountBadge(doc: Document | null, active: boolean): (() => void) | null {
    const [present, setPresent] = useState(false);
    useEffect(() => {
        if (!doc || !active) { setPresent(false); return undefined; }
        let undo: () => void = () => undefined;
        const update = () => {
            undo();
            undo = hidePlayCountBadge(doc);
            setPresent(playCountButton(doc) !== null);
        };
        update();
        const Observer = doc.defaultView?.MutationObserver;
        const observer = Observer ? new Observer((records) => { if (records.some((r) => r.type === 'childList')) update(); }) : undefined;
        observer?.observe(doc.body, { childList: true, subtree: true });
        const away = (event: Event) => { focusAwayFromBadge(event.target as Element | null, doc, (el) => focusElement(el, 'player count pill')); };
        doc.addEventListener('focusin', away, true);
        return () => { observer?.disconnect(); doc.removeEventListener('focusin', away, true); undo(); };
    }, [doc, active]);
    if (!doc || !active || !present) return null;
    return () => playCountButton(doc)?.click();
}
