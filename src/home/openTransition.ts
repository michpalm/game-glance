import { OPEN_TIMINGS } from './motion';
import type { OpenVariant } from './openHome';

/**
 * The open transition's timeline (spec docs/superpowers/specs/2026-10-09-open-transition-design.md). Pure: Home's
 * opening state, the bridge (a frozen copy of Home over the route change), the intent, the router and the clock are
 * injected, so the timing and every failure path are tested with fake timers.
 *
 * Home starts moving at once (startHome). At the hand-over (the morph's end, or the feed card's hero fade, or the plain
 * fade) the bridge goes up, the intent is marked and the page opens; the bridge then fades away as soon as the page
 * reports ready, or after OPEN_TIMINGS.readyCap, and is removed. Anything that cannot be started still opens the
 * page; a press while a transition runs is ignored; cancel() undoes whatever is up and never opens a page late.
 */

export interface OpenBridge {
    /** Fades the copy in over live Home (from transparent). */
    fadeIn(ms: number): void;
    fadeOut(ms: number): void;
    remove(): void;
    /** At the page's ready, before the fade: the text twins glide onto the page's text as measured (openHome.settleTwins). */
    settle?(): void;
}

export interface OpenDeps {
    navigate(path: string): void;
    /** Puts Home in its opening state; returns its undo, or null when Home cannot be measured (the page opens at once). */
    startHome(): (() => void) | null;
    /** The frozen copy of Home over the route change; null (or a throw) for none. */
    mountBridge(): OpenBridge | null;
    /** Tells the page it is arriving (data/openIntent.markOpen). */
    markOpen(): void;
    /** Hears when the page is ready (data/openIntent.onOpenReady for this game); returns the unsubscribe. */
    onReady(cb: () => void): () => void;
    /** Controller Back while Home is animating; removed before navigation. */
    listenForCancel?(cancel: () => void): () => void;
    /** B cancelled the open (listenForCancel's callback only, never another finish): Home's return look and sound. */
    onCancelled?(): void;
    setTimer(fn: () => void, ms: number): unknown;
    clearTimer(id: unknown): void;
    /** Optional diagnostics; the controller never throws. */
    warn?(message: string, error: unknown): void;
}

export interface OpenTransition {
    open(appId: number, variant: OpenVariant): void;
    cancel(): void;
}

/** How long the copy fades in over live Home before the page opens: the morph's (its moved text is drawn soft live). */
export function bridgeInFor(variant: OpenVariant): number {
    return variant === 'morph' ? OPEN_TIMINGS.bridgeIn : 0;
}

/** When Home hands over to the page, per variant (ms after the press). */
export function handOverAt(variant: OpenVariant): number {
    return variant === 'morph' ? OPEN_TIMINGS.morph : variant === 'heroFade' ? OPEN_TIMINGS.feedHero : OPEN_TIMINGS.feedUi;
}

export function createOpenTransition(deps: OpenDeps): OpenTransition {
    let running = false;
    let undoHome: (() => void) | null = null;
    let bridge: OpenBridge | null = null;
    let stopCancel: (() => void) | null = null;
    let stopReady: (() => void) | null = null;
    let timers: unknown[] = [];

    const warn = (message: string, error: unknown) => {
        try {
            deps.warn?.(message, error);
        } catch {
            // diagnostics only
        }
    };
    const safely = (what: string, fn: () => void) => {
        try {
            fn();
        } catch (error) {
            warn(what, error);
        }
    };
    const later = (fn: () => void, ms: number) => {
        try {
            timers.push(deps.setTimer(fn, ms));
            return true;
        } catch (error) {
            warn('could not schedule the open transition', error);
            return false;
        }
    };

    const clearCancel = () => {
        const stop = stopCancel;
        stopCancel = null;
        if (stop) safely('could not stop listening for Back', stop);
    };

    /** Clears every timer and listener and takes the bridge down; Home is usable again. */
    const finish = (undo: boolean) => {
        clearCancel();
        for (const id of timers) safely('could not clear a transition timer', () => deps.clearTimer(id));
        timers = [];
        const stop = stopReady;
        stopReady = null;
        if (stop) safely('could not stop listening for the page', stop);
        const b = bridge;
        bridge = null;
        if (b) safely('could not remove the bridge', () => b.remove());
        const u = undoHome;
        undoHome = null;
        if (undo && u) safely("could not restore Home", u);
        running = false;
    };

    const navigate = (path: string): boolean => {
        try {
            clearCancel();
            deps.navigate(path);
            return true;
        } catch (error) {
            warn('could not open the game page', error);
            return false;
        }
    };

    /** The bridge fades away (once), then everything is cleared; on the page's ready, its twins settle onto the page first. */
    let leaving = false;
    const leave = (ready: boolean) => {
        if (leaving || !bridge) return;
        leaving = true;
        const b = bridge;
        if (ready && b.settle) safely('could not settle the text twins', () => b.settle?.());
        safely('could not fade the bridge', () => b.fadeOut(OPEN_TIMINGS.bridgeFade));
        // Home's opening state goes too: Steam normally unmounts Home (hidden under the bridge while it leaves), but if it
        // keeps it, or brings it back on B, Home must not be left mid-open.
        if (!later(() => finish(true), OPEN_TIMINGS.bridgeFade)) finish(true);
    };

    const handOver = (path: string, fadeIn: number) => {
        try {
            bridge = deps.mountBridge();
        } catch (error) {
            warn('could not place the bridge', error);
            bridge = null;
        }
        const b = bridge;
        if (!b || fadeIn <= 0) return openPage(path);
        safely('could not fade the bridge in', () => b.fadeIn(fadeIn));
        if (!later(() => openPage(path), fadeIn)) openPage(path);
    };

    const openPage = (path: string) => {
        safely('could not mark the open', () => deps.markOpen());
        // Subscribe before navigation: a warm page can report ready during Navigate itself.
        if (bridge) {
            try {
                stopReady = deps.onReady(() => leave(true));
            } catch (error) {
                warn('could not listen for the page', error);
            }
        }
        if (!navigate(path)) return finish(true);
        // A missing bridge is a fallback, not a reason to leave Home's text and chips mid-morph.
        if (!bridge) return finish(true);
        if (!later(() => leave(false), OPEN_TIMINGS.readyCap)) leave(false);
    };

    return {
        open(appId, variant) {
            if (running) return;
            const path = `/library/app/${appId}`;
            running = true;
            leaving = false;
            try {
                undoHome = deps.startHome();
            } catch (error) {
                warn('could not start the open transition', error);
                undoHome = null;
            }
            // Without Home's opening state the page still opens, just without motion.
            if (!undoHome) {
                finish(false);
                navigate(path);
                return;
            }
            safely('could not listen for Back', () => {
                stopCancel = deps.listenForCancel?.(() => {
                    finish(true);
                    safely('could not show the cancel', () => deps.onCancelled?.());
                }) ?? null;
            });
            if (!later(() => handOver(path, bridgeInFor(variant)), handOverAt(variant))) {
                finish(true);
                navigate(path);
            }
        },
        cancel() {
            finish(true);
        },
    };
}
