import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForHomeMotion } from '../../src/home/openMotionReady';

const deferred = () => {
    let resolve!: () => void;
    const finished = new Promise<void>((r) => { resolve = r; });
    return { finished, resolve };
};
function setup(animations: unknown[]) {
    const frames = new Map<number, FrameRequestCallback>();
    let next = 0;
    const win = {
        setTimeout, clearTimeout,
        requestAnimationFrame: (cb: FrameRequestCallback) => { frames.set(++next, cb); return next; },
        cancelAnimationFrame: (id: number) => frames.delete(id),
    };
    const root = {ownerDocument: {defaultView: win}, getAnimations: () => animations} as unknown as HTMLElement;
    const done = vi.fn();
    return {root, done, frame: () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((cb) => cb(0)); }};
}
describe('actual Home motion endpoint', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());
    it('keeps the live movement until every transform is finished and its final frame commits', async () => {
        const a = deferred(), b = deferred();
        const f = setup([{playState:'running',transitionProperty:'transform',finished:a.finished}, {playState:'running',animationName:'gh-open-extras-in',finished:b.finished}]);
        waitForHomeMotion(f.root, f.done);
        a.resolve(); await Promise.resolve(); await Promise.resolve();
        f.frame(); expect(f.done).not.toHaveBeenCalled();
        b.resolve(); await Promise.resolve(); await Promise.resolve();
        expect(f.done).not.toHaveBeenCalled();
        f.frame(); expect(f.done).toHaveBeenCalledOnce();
        vi.advanceTimersByTime(1000); expect(f.done).toHaveBeenCalledOnce();
    });
    it('ignores unrelated activity and does not delay an already settled Home', () => {
        const f = setup([{playState:'running',animationName:'unrelated-spinner',finished:new Promise(() => {})}, {playState:'finished',transitionProperty:'transform',finished:Promise.resolve()}]);
        waitForHomeMotion(f.root, f.done);
        expect(f.done).toHaveBeenCalledOnce();
    });
    it('cancellation suppresses pending completion frames and the emergency cap', async () => {
        const a = deferred(), f = setup([{playState:'running',transitionProperty:'transform',finished:a.finished}]);
        const stop = waitForHomeMotion(f.root, f.done);
        a.resolve(); await Promise.resolve(); await Promise.resolve();
        stop(); f.frame(); vi.advanceTimersByTime(1000);
        expect(f.done).not.toHaveBeenCalled();
    });
    it('does not strand Home if the browser never finishes an animation', () => {
        const f = setup([{playState:'running',transitionProperty:'transform',finished:new Promise(() => {})}]);
        waitForHomeMotion(f.root, f.done);
        vi.advanceTimersByTime(449); expect(f.done).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1); expect(f.done).toHaveBeenCalledOnce();
    });
});
