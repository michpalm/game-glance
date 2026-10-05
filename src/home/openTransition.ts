/**
 * The open-to-details transition's timeline (handoff "Interactions & motion", spec section 4). Pure: the
 * overlay, the router and the clock are injected, so the timing and every failure path are tested with fake
 * timers. The overlay itself (OpenOverlay) plays the motion in CSS from these same timings: placed over the
 * source, expanding to full screen over `expand` while Home fades over `homeFade`, then fading out over
 * `overlayFade` from `navigateAt`. This module decides when to navigate and when the overlay goes.
 */

export interface DOMRectLike {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** Handoff timings, ms. */
export const TIMINGS = { expand: 480, homeFade: 300, navigateAt: 520, overlayFade: 450, removeAt: 1000 } as const;

export interface OpenTransitionDeps {
    navigate(path: string): void;
    /** Places the overlay over `rect` and starts its motion; returns its remover. May throw (no overlay then). */
    mount(rect: DOMRectLike, art: string): () => void;
    setTimer(fn: () => void, ms: number): unknown;
    clearTimer(id: unknown): void;
    /** Optional diagnostics; the controller never throws. */
    warn?(message: string, error: unknown): void;
}

export interface OpenTransition {
    /** `art`: the clone's CSS background-image value (stacked layers; '' for the ink background only). */
    open(appId: number, rect: DOMRectLike | null | undefined, art: string): void;
    cancel(): void;
}

/** A measured source worth animating from: finite, on-screen size (a 0x0 or missing rect is not). */
export function usableRect(rect: DOMRectLike | null | undefined): rect is DOMRectLike {
    if (!rect) return false;
    const { left, top, width, height } = rect;
    return [left, top, width, height].every(Number.isFinite) && width > 0 && height > 0;
}

export function createOpenTransition(deps: OpenTransitionDeps): OpenTransition {
    let running = false;
    let remove: (() => void) | null = null;
    let timers: unknown[] = [];

    const warn = (message: string, error: unknown) => {
        try {
            deps.warn?.(message, error);
        } catch {
            // diagnostics only
        }
    };

    /** Clears pending timers and removes the overlay (once); Home is usable again. */
    const finish = () => {
        for (const id of timers) {
            try {
                deps.clearTimer(id);
            } catch (error) {
                warn('could not clear a transition timer', error);
            }
        }
        timers = [];
        const removeOverlay = remove;
        remove = null;
        running = false;
        if (!removeOverlay) return;
        try {
            removeOverlay();
        } catch (error) {
            warn('could not remove the open overlay', error);
        }
    };

    /** Navigates; false when the router threw. */
    const navigate = (path: string): boolean => {
        try {
            deps.navigate(path);
            return true;
        } catch (error) {
            warn('could not open the game page', error);
            return false;
        }
    };

    return {
        open(appId, rect, art) {
            if (running) return;
            const path = `/library/app/${appId}`;
            // Without a usable source, or when the overlay cannot be placed, the page still opens, just without motion.
            if (!usableRect(rect)) {
                navigate(path);
                return;
            }
            running = true;
            try {
                remove = deps.mount(rect, art);
            } catch (error) {
                warn('could not place the open overlay', error);
                finish();
                navigate(path);
                return;
            }
            try {
                timers.push(deps.setTimer(() => {
                    if (!navigate(path)) finish();
                }, TIMINGS.navigateAt));
                timers.push(deps.setTimer(finish, TIMINGS.removeAt));
            } catch (error) {
                warn('could not schedule the open transition', error);
                finish();
                navigate(path);
            }
        },
        cancel() {
            finish();
        },
    };
}
