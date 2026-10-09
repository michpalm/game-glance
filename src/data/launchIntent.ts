/**
 * "Home just launched this game": Steam opens the game's page when a game starts (its launch screen lives there), so
 * after Play on Spotlight Home the page shows for a moment before Steam's launch screen. Home marks the launch here;
 * the game page (GameHero) reads it and shows only the dimmed art from its first frame (styles/launchOverlay).
 * Module state, never stored.
 */

/** How long after Play on Home the game page waits for Steam's launch screen before showing normally. */
export const LAUNCH_INTENT_MS = 8000;

let intent: { appId: number; at: number } | null = null;

/** Play on Home launched `appId`. */
export function markLaunch(appId: number, now: number = Date.now()) {
    if (Number.isInteger(appId) && appId > 0) intent = { appId, at: now };
}

/** Whether Home launched `appId` within the last LAUNCH_INTENT_MS. */
export function launchPending(appId: number, now: number = Date.now()): boolean {
    return intent !== null && intent.appId === appId && now >= intent.at && now - intent.at < LAUNCH_INTENT_MS;
}

/** The launch screen came and went (or the page gave up waiting): the page shows normally from now on. */
export function clearLaunch() {
    intent = null;
}
