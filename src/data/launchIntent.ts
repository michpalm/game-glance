/**
 * "Home just launched this game": Steam opens the game's page when a game starts (its launch screen lives there), so
 * after Play on Spotlight Home the page shows for a moment before Steam's launch screen. Home marks the launch here;
 * the game page (GameHero) reads it and shows only the dimmed art from its first frame (styles/launchOverlay).
 * Module state, never stored.
 */

/** How long after Play on Home the game page waits for Steam's launch screen before showing normally. */
export const LAUNCH_INTENT_MS = 8000;

let intent: { appId: number; at: number } | null = null;
let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
    version++;
    for (const fn of [...listeners]) fn();
};

/** Told whenever a launch is marked or cleared (Home's chrome claim re-reads launchPending then; useSyncExternalStore). */
export function subscribeLaunch(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
/** Changes on every mark and clear. */
export const launchVersion = (): number => version;

/** Play on Home launched `appId`. */
export function markLaunch(appId: number, now: number = Date.now()) {
    if (Number.isInteger(appId) && appId > 0) {
        intent = { appId, at: now };
        changed();
    }
}

/** Whether Home launched `appId` within the last LAUNCH_INTENT_MS. */
export function launchPending(appId: number, now: number = Date.now()): boolean {
    return intent !== null && intent.appId === appId && now >= intent.at && now - intent.at < LAUNCH_INTENT_MS;
}

/** The launch screen came and went (or the page gave up waiting): the page shows normally from now on. */
export function clearLaunch() {
    if (intent === null) return;
    intent = null;
    changed();
}
