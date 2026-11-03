import { OPEN_TIMINGS } from '../home/motion';

/**
 * The game page's arrival after Spotlight Home's open transition, as a controller with its clocks injected (the hook
 * useOpenArrival runs it once per page, so a phase change can never cancel its timers). Until the page is ready
 * across two animation-frame checks it stays hidden; then it reports it, waits OPEN_TIMINGS.revealDelay, reveals, and is done once
 * the hold is over. A page not ready within OPEN_TIMINGS.readyCap is revealed anyway. Pure.
 */

export type ArrivalPhase = 'hidden' | 'revealing' | 'done';

/**
 * How long the page stays in its arriving state once revealed: until its new parts have faded in (the stylesheet
 * carries that transition; dropping it mid-way would cancel it). The glass arrives blurred, as Home's copy drew it.
 */
export function arrivalHoldMs(): number {
    return OPEN_TIMINGS.reveal;
}

export interface ArrivalDeps {
    ready(): boolean;
    now(): number;
    frame(cb: () => void): unknown;
    cancelFrame(id: unknown): void;
    setTimer(cb: () => void, ms: number): unknown;
    clearTimer(id: unknown): void;
    /** The page is ready (Home lets its copy fade). */
    onReady(): void;
    onPhase(phase: ArrivalPhase): void;
}

/** Starts the arrival; returns the stop (the page left): nothing more happens after it. */
export function runArrival(deps: ArrivalDeps): () => void {
    const started = deps.now();
    let alive = true;
    let frame: unknown = null;
    let visibleFrames = 0;
    let timer: unknown = null;
    const later = (cb: () => void, ms: number) => {
        timer = deps.setTimer(() => alive && cb(), ms);
    };
    const reveal = () => {
        deps.onPhase('revealing');
        later(() => deps.onPhase('done'), arrivalHoldMs());
    };
    const check = () => {
        if (!alive) return;
        // A loaded image can become visible in this frame before Steam has painted it. Let that frame commit
        // before releasing the bridge, and restart the check if the hero becomes hidden again.
        visibleFrames = deps.ready() ? visibleFrames + 1 : 0;
        if (visibleFrames >= 2) {
            deps.onReady();
            later(reveal, OPEN_TIMINGS.revealDelay);
            return;
        }
        if (deps.now() - started >= OPEN_TIMINGS.readyCap) return reveal();
        frame = deps.frame(check);
    };
    frame = deps.frame(check);
    return () => {
        alive = false;
        if (frame !== null) deps.cancelFrame(frame);
        if (timer !== null) deps.clearTimer(timer);
    };
}
