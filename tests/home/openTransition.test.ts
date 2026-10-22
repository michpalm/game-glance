import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOpenTransition, OpenDeps } from '../../src/home/openTransition';

/** Fake deps that log every call with the fake clock's time. */
function setup(over: Partial<OpenDeps> = {}) {
    const log: string[] = [];
    const at = (what: string) => log.push(`${what}@${Date.now()}`);
    let ready: (() => void) | null = null;
    const bridge = { fadeIn: vi.fn((ms: number) => at(`fadeIn(${ms})`)), fadeOut: vi.fn((ms: number) => at(`fadeOut(${ms})`)), remove: vi.fn(() => at('remove')), settle: vi.fn(() => at('settle')) };
    const undo = vi.fn(() => at('undoHome'));
    const deps: OpenDeps = {
        navigate: vi.fn((path: string) => at(`navigate ${path}`)),
        startHome: vi.fn(() => (at('startHome'), undo)),
        mountBridge: vi.fn(() => (at('mountBridge'), bridge)),
        markOpen: vi.fn(() => at('markOpen')),
        onReady: vi.fn((cb: () => void) => {
            ready = cb;
            return () => {
                ready = null;
            };
        }),
        setTimer: (fn, ms) => setTimeout(fn, ms),
        clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
        ...over,
    };
    return { t: createOpenTransition(deps), deps, log, bridge, undo, fireReady: () => ready?.() };
}

describe('openTransition', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('isRunning is false before an open, true right after it, false once the open finishes, and false after cancel()', () => {
        const { t } = setup();
        expect(t.isRunning()).toBe(false);
        t.open(620, 'morph');
        expect(t.isRunning()).toBe(true);
        vi.advanceTimersByTime(449);
        expect(t.isRunning()).toBe(true);
        t.cancel();
        expect(t.isRunning()).toBe(false);
        t.open(620, 'morph');
        expect(t.isRunning()).toBe(true);
        vi.advanceTimersByTime(10_000);
        expect(t.isRunning()).toBe(false);
    });

    it('wires controller cancellation until navigation, cancels every pending timer, and can open again', () => {
        let back: (() => void) | null = null;
        const stop = vi.fn(() => { back = null; });
        const { t, deps, undo } = setup({ listenForCancel: (cancel) => { back = cancel; return stop; } });
        t.open(620, 'morph');
        vi.advanceTimersByTime(120);
        expect(back).not.toBeNull();
        back!();
        vi.advanceTimersByTime(2000);
        expect(deps.navigate).not.toHaveBeenCalled();
        expect(undo).toHaveBeenCalledOnce();
        expect(stop).toHaveBeenCalledOnce();
        t.open(620, 'morph');
        vi.advanceTimersByTime(600);
        expect(deps.navigate).toHaveBeenCalledWith('/library/app/620');
        expect(back).toBeNull(); // once the page opens, B belongs to Steam again
    });

    it('morph: Home moves at once; at 450 the bridge fades in over it (150 ms), then the intent is marked and the page opens', () => {
        // Live Home's moved text and logo are drawn soft (raster of an animated layer); the copy is drawn crisp: it fades in
        // over Home instead of replacing it in one frame (Michael: a pop at the end of the open).
        const { t, log } = setup();
        t.open(620, 'morph');
        expect(log).toEqual(['startHome@0']);
        vi.advanceTimersByTime(449);
        expect(log).toHaveLength(1);
        vi.advanceTimersByTime(1);
        expect(log).toEqual(['startHome@0', 'mountBridge@450', 'fadeIn(150)@450']);
        vi.advanceTimersByTime(150);
        expect(log).toEqual(['startHome@0', 'mountBridge@450', 'fadeIn(150)@450', 'markOpen@600', 'navigate /library/app/620@600']);
    });

    it('the hand-over comes at 300 for a feed card (heroFade) and 220 for a plain fade', () => {
        const a = setup();
        a.t.open(1, 'heroFade');
        vi.advanceTimersByTime(300);
        expect(a.log).toContain('navigate /library/app/1@300');
        const b = setup();
        b.t.open(2, 'fade');
        vi.advanceTimersByTime(220);
        expect(b.log).toContain('navigate /library/app/2@520');
    });

    it('ready before the cap fades the bridge at once, then removes it', () => {
        const { t, log, fireReady } = setup();
        t.open(620, 'morph');
        vi.advanceTimersByTime(650);
        fireReady();
        expect(log).toContain('fadeOut(300)@650');
        vi.advanceTimersByTime(300);
        expect(log).toContain('remove@950');
    });

    it('a page that reports ready during navigation does not wait for the timeout', () => {
        const { t, deps, fireReady, bridge } = setup();
        vi.mocked(deps.navigate).mockImplementation(() => fireReady());
        t.open(620, 'morph');
        vi.advanceTimersByTime(600);
        expect(bridge.fadeOut).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(300);
        expect(bridge.remove).toHaveBeenCalledTimes(1);
    });

    it("once the bridge is gone Home's opening state is undone (Steam may keep Home, or bring it back on B: it was left mid-open)", () => {
        const { t, undo, fireReady } = setup();
        t.open(620, 'morph');
        vi.advanceTimersByTime(650);
        fireReady();
        expect(undo).not.toHaveBeenCalled();
        vi.advanceTimersByTime(300);
        expect(undo).toHaveBeenCalledTimes(1);
    });

    it('settles once when the page is ready, before the fade', () => {
        const { t, log, fireReady, bridge } = setup();
        t.open(620, 'morph');
        vi.advanceTimersByTime(600);
        fireReady();
        fireReady();
        expect(bridge.settle).toHaveBeenCalledTimes(1);
        expect(log.indexOf('settle@600')).toBeLessThan(log.indexOf('fadeOut(300)@600'));
    });
    it('no settle without ready (the cap fades the bridge as before)', () => {
        const { t, bridge } = setup();
        t.open(620, 'morph');
        vi.advanceTimersByTime(600 + 500);
        expect(bridge.fadeOut).toHaveBeenCalled();
        expect(bridge.settle).not.toHaveBeenCalled();
    });
    it('a settle that throws still fades', () => {
        const { t, fireReady, bridge } = setup();
        bridge.settle.mockImplementation(() => {
            throw new Error('x');
        });
        t.open(620, 'morph');
        vi.advanceTimersByTime(600);
        fireReady();
        expect(bridge.fadeOut).toHaveBeenCalledTimes(1);
    });
    it('no ready: the bridge leaves at the cap (500 ms after the page opened)', () => {
        const { t, log } = setup();
        t.open(620, 'morph');
        vi.advanceTimersByTime(1099);
        expect(log.some((l) => l.startsWith('fadeOut'))).toBe(false);
        vi.advanceTimersByTime(1);
        expect(log).toContain('fadeOut(300)@1100');
        vi.advanceTimersByTime(300);
        expect(log).toContain('remove@1400');
    });

    it('Home cannot be measured: the page opens at once, nothing mounted', () => {
        const { t, deps, log } = setup({ startHome: vi.fn(() => null) });
        t.open(620, 'morph');
        expect(log).toEqual(['navigate /library/app/620@0']);
        vi.advanceTimersByTime(2000);
        expect(deps.mountBridge).not.toHaveBeenCalled();
    });

    it('a plain fade or a feed card hands over without the fade-in (nothing of Home was scaled)', () => {
        const { t, log } = setup();
        t.open(1, 'heroFade');
        vi.advanceTimersByTime(300);
        expect(log).toEqual(['startHome@0', 'mountBridge@300', 'markOpen@300', 'navigate /library/app/1@300']);
    });

    it('cancel while the bridge fades in: it goes, Home is restored, and the page never opens', () => {
        const { t, deps, bridge, undo } = setup();
        t.open(620, 'morph');
        vi.advanceTimersByTime(500);
        t.cancel();
        vi.advanceTimersByTime(2000);
        expect(bridge.remove).toHaveBeenCalledTimes(1);
        expect(undo).toHaveBeenCalledTimes(1);
        expect(deps.navigate).not.toHaveBeenCalled();
    });

    it('a bridge that cannot be mounted still lets the page open at the hand-over', () => {
        const { t, log, undo } = setup({ mountBridge: vi.fn(() => { throw new Error('no body'); }) });
        t.open(620, 'morph');
        vi.advanceTimersByTime(450);
        expect(log).toContain('navigate /library/app/620@450');
        expect(undo).toHaveBeenCalledTimes(1);
    });

    it('a missing bridge restores Home so returning cannot leave its metadata hidden', () => {
        const { t, undo } = setup({ mountBridge: () => null });
        t.open(620, 'morph');
        vi.advanceTimersByTime(450);
        expect(undo).toHaveBeenCalledTimes(1);
    });

    it('a second open while one runs is ignored', () => {
        const { t, deps } = setup();
        t.open(620, 'morph');
        t.open(700, 'morph');
        vi.advanceTimersByTime(2000);
        expect(deps.navigate).toHaveBeenCalledTimes(1);
        expect(deps.navigate).toHaveBeenCalledWith('/library/app/620');
    });

    it('cancel before the hand-over undoes Home and never opens the page', () => {
        const { t, deps, undo } = setup();
        t.open(620, 'morph');
        vi.advanceTimersByTime(200);
        t.cancel();
        vi.advanceTimersByTime(2000);
        expect(undo).toHaveBeenCalledTimes(1);
        expect(deps.navigate).not.toHaveBeenCalled();
        expect(deps.mountBridge).not.toHaveBeenCalled();
    });

    it('cancel after the hand-over removes the bridge and restores Home; a later ready does nothing', () => {
        const { t, bridge, undo, fireReady } = setup();
        t.open(620, 'morph');
        vi.advanceTimersByTime(650);
        t.cancel();
        expect(bridge.remove).toHaveBeenCalledTimes(1);
        expect(undo).toHaveBeenCalledTimes(1);
        fireReady();
        vi.advanceTimersByTime(2000);
        expect(bridge.fadeOut).not.toHaveBeenCalled();
        expect(bridge.remove).toHaveBeenCalledTimes(1);
    });

    it('after it finishes, a new open runs', () => {
        const { t, deps } = setup();
        t.open(620, 'morph');
        vi.advanceTimersByTime(2000);
        t.open(700, 'fade');
        vi.advanceTimersByTime(2000);
        expect(deps.navigate).toHaveBeenCalledTimes(2);
    });

    it('a cancel by B tells Home once (its return look and sound), after Home is restored', () => {
        let back: (() => void) | null = null;
        const onCancelled = vi.fn();
        const { t, undo } = setup({ listenForCancel: (cancel) => { back = cancel; return () => { back = null; }; }, onCancelled });
        t.open(620, 'morph');
        vi.advanceTimersByTime(200);
        back!();
        expect(undo).toHaveBeenCalledOnce();
        expect(onCancelled).toHaveBeenCalledOnce();
        expect(undo.mock.invocationCallOrder[0]).toBeLessThan(onCancelled.mock.invocationCallOrder[0]);
    });
    it('no cancel hook for an open that runs to the page, or for cancel() from elsewhere', () => {
        const onCancelled = vi.fn();
        const { t, fireReady } = setup({ listenForCancel: () => () => undefined, onCancelled });
        t.open(620, 'morph');
        vi.advanceTimersByTime(600);
        fireReady();
        vi.advanceTimersByTime(2000);
        t.open(700, 'morph');
        t.cancel();
        expect(onCancelled).not.toHaveBeenCalled();
    });
    it("no cancel hook once the page has opened (the listener is gone; B is Steam's)", () => {
        let back: (() => void) | null = null;
        const onCancelled = vi.fn();
        const { t } = setup({ listenForCancel: (cancel) => { back = cancel; return () => { back = null; }; }, onCancelled });
        t.open(620, 'morph');
        vi.advanceTimersByTime(600);
        expect(back).toBeNull();
        expect(onCancelled).not.toHaveBeenCalled();
    });
    it('a throwing cancel hook still leaves Home restored and the controller usable', () => {
        let back: (() => void) | null = null;
        const { t, undo, deps } = setup({ listenForCancel: (cancel) => { back = cancel; return () => { back = null; }; }, onCancelled: () => { throw new Error('x'); } });
        t.open(620, 'morph');
        vi.advanceTimersByTime(100);
        expect(() => back!()).not.toThrow();
        expect(undo).toHaveBeenCalledOnce();
        t.open(620, 'morph');
        vi.advanceTimersByTime(600);
        expect(deps.navigate).toHaveBeenCalledWith('/library/app/620');
    });
});
