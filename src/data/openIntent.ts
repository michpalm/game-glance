import type { PageLook } from '../home/openTargets';

/**
 * "Home is opening this game's page": Spotlight Home's open transition morphs Home into the page's layout, covers the
 * route change with a frozen copy of itself, and marks the open here. The game page (GameHero) reads it on its first
 * render and starts in an "arriving" state (only its new parts, or the whole page, hidden), reports here when it is
 * ready (its art loaded, its title block and Play row laid out), and the transition then lets the copy fade away.
 * Module state, never stored; like launchIntent.
 */

/** How long after the hand-over the page may still claim the open (the transition gives up on it long before). */
export const OPEN_INTENT_MS = 3000;

/** 'parts': Home morphed into the page, only the page's new parts arrive; 'all': the whole page arrives (fades in). */
export type ArriveMode = 'parts' | 'all';
/**
 * The page's look the open was made for ('steam': the Game Glance page is off, Steam's own page opens), how it arrives,
 * `eyebrow`: Home's eyebrow words at the open (the page shows the same, so nothing changes at the hand-over), and
 * `homeCloud`: whether Home showed its cloud button (false: its state was not known yet, so the page's arrives), and
 * `homeBars`: the stats whose progress bar Home's morph moved onto the page's (those bars do not arrive again), and
 * `homeDesc` / `homeHltb`: Home drew the description / the HowLongToBeat card's rest as it turned into the page
 * (home/OpenExtras), so the page shows those at once instead of letting them arrive, and `homeFamily`: Home showed
 * the family library pill (it moves in with the store pill, so the page's is there at once too), and `homeMissing`:
 * the page's stat columns Home showed no chip for (they arrive with the new parts), and `homeUninstall`: Home drew a
 * Unifideck game's Uninstall circle as it opened (homeCss .gh-open-circle), so the page's is there at once.
 */
export interface OpenIntent {
    look: PageLook | 'steam';
    mode: ArriveMode;
    eyebrow?: string;
    homeCloud?: boolean;
    homeBars?: string[];
    homeDesc?: boolean;
    homeHltb?: boolean;
    homeFamily?: boolean;
    /** Home showed the player pill: it moved in with the store pill, so the page's is there at once. */
    homePlayers?: boolean;
    homeMissing?: string[];
    homeUninstall?: boolean;
    /** Home drew a Unifideck game's size column (OpenExtras): the page shows its own at once. */
    homeSize?: boolean;
}

let pending: { appId: number; at: number; intent: OpenIntent } | null = null;
const listeners = new Set<(appId: number) => void>();

/** Home is opening `appId`'s page. */
export function markOpen(appId: number, intent: OpenIntent, now: number = Date.now()) {
    if (Number.isInteger(appId) && appId > 0) pending = { appId, at: now, intent };
}

/** The open of `appId` made within the last OPEN_INTENT_MS, or null. */
export function openPending(appId: number, now: number = Date.now()): OpenIntent | null {
    if (pending === null || pending.appId !== appId || now < pending.at || now - pending.at >= OPEN_INTENT_MS) return null;
    return pending.intent;
}

/** Whether any open is under way (Home leaving for a page must not undo what the page will need, e.g. Steam's bar hidden). */
export function openUnderway(now: number = Date.now()): boolean {
    return pending !== null && now >= pending.at && now - pending.at < OPEN_INTENT_MS;
}

/** Hears when the page being opened is ready; returns the unsubscribe. */
export function onOpenReady(listener: (appId: number) => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** The page of `appId` is ready: tells the listeners once and ends the open. Nothing for a game not being opened. */
export function reportOpenReady(appId: number) {
    if (pending === null || pending.appId !== appId) return;
    pending = null;
    for (const listener of [...listeners]) {
        try {
            listener(appId);
        } catch {
            // one broken listener must not keep the others (or the page) waiting
        }
    }
}

/** Ends the open without telling anyone (cancelled, or the page gave up waiting). */
export function clearOpen() {
    pending = null;
}
