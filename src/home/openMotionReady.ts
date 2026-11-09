import { OPEN_TIMINGS } from './motion';

/** The morph timer starts before its CSS transition's first frame. Do not freeze a still-scaled card into its endpoint. */
export function waitForHomeMotion(root: HTMLElement, done: () => void): () => void {
    const win = root.ownerDocument.defaultView;
    const motions = root.getAnimations?.({ subtree: true }).filter((animation) => {
        const css = animation as CSSTransition & CSSAnimation;
        return (animation.playState === 'running' || animation.pending)
            && (css.transitionProperty === 'transform' || css.transitionProperty === 'translate'
                || /^gh-(open-|twin-)/.test(css.animationName ?? ''));
    }) ?? [];
    if (!win || motions.length === 0) { done(); return () => undefined; }
    let live = true;
    let frame: number | null = null;
    let timer: number | null = null;
    const stop = () => {
        live = false;
        if (frame !== null) win.cancelAnimationFrame(frame);
        if (timer !== null) win.clearTimeout(timer);
    };
    const finish = () => { if (!live) return; stop(); done(); };
    // An interrupted/paused browser must not strand Home. Normal completion uses Animation.finished, not this cap.
    timer = win.setTimeout(finish, OPEN_TIMINGS.morph);
    void Promise.allSettled(motions.map((animation) => animation.finished)).then(() => {
        if (live) frame = win.requestAnimationFrame(finish);
    });
    return stop;
}
