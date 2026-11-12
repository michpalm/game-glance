import { RETURN_GLIDE } from './motion';

/**
 * The way back's glide timeline (spec docs/superpowers/specs/2026-11-12-page-return-glide-design.md): Home's start state
 * (closeMotion.applyClosing), released to 'to' on the next frame, cleared at RETURN_GLIDE.cap or as soon as Home is used
 * (endReturnGlide). One at a time; a module singleton, as Home remounts. Never throws.
 */

export interface ReturnGlideDeps {
    /** Home's closing start state (closeMotion.applyClosing); null: no glide. */
    apply(): (() => void) | null;
    /** Sets data-gh-closing to 'to'. */
    release(): void;
    frame(fn: () => void): void;
    setTimer(fn: () => void, ms: number): unknown;
    clearTimer(id: unknown): void;
    warn?(message: string, error: unknown): void;
}

let current: { undo: () => void; timer: unknown; deps: ReturnGlideDeps } | null = null;
let generation = 0;

const report = (deps: ReturnGlideDeps, message: string, error: unknown) => {
    try {
        deps.warn?.(message, error);
    } catch {
        // diagnostics only
    }
};

/** Ends a running glide at once: everything at rest, variables and attribute removed. Safe when none runs. */
export function endReturnGlide(): void {
    const glide = current;
    current = null;
    ++generation;
    if (!glide) return;
    try {
        glide.deps.clearTimer(glide.timer);
    } catch (error) {
        report(glide.deps, 'could not clear the return glide timer', error);
    }
    try {
        glide.undo();
    } catch (error) {
        report(glide.deps, 'could not end the return glide', error);
    }
}

/** Starts the glide; false (nothing left set) when it cannot. One runs at a time. */
export function startReturnGlide(deps: ReturnGlideDeps): boolean {
    endReturnGlide();
    let undo: (() => void) | null;
    try {
        undo = deps.apply();
    } catch (error) {
        report(deps, 'could not start the return glide', error);
        return false;
    }
    if (!undo) return false;
    const own = ++generation;
    let timer: unknown;
    try {
        timer = deps.setTimer(() => { if (own === generation) endReturnGlide(); }, RETURN_GLIDE.cap);
    } catch (error) {
        report(deps, 'could not schedule the return glide', error);
        try { undo(); } catch { /* nothing more to do */ }
        return false;
    }
    current = { undo, timer, deps };
    try {
        deps.frame(() => {
            if (own !== generation) return;
            try {
                deps.release();
            } catch (error) {
                report(deps, 'could not release the return glide', error);
            }
        });
    } catch (error) {
        report(deps, 'could not wait a frame for the return glide', error);
        endReturnGlide();
        return false;
    }
    return true;
}

export function returnGlideRunning(): boolean {
    return current !== null;
}
