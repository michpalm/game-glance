import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endReturnGlide, returnGlideRunning, startReturnGlide, type ReturnGlideDeps } from '../../src/home/returnGlide';
import { RETURN_GLIDE } from '../../src/home/motion';

function deps(over: Partial<ReturnGlideDeps> = {}) {
    const frames: Array<() => void> = [];
    const undo = vi.fn();
    const d = {
        apply: vi.fn(() => undo),
        release: vi.fn(),
        frame: (fn: () => void) => { frames.push(fn); },
        setTimer: (fn: () => void, ms: number) => setTimeout(fn, ms),
        clearTimer: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>),
        warn: vi.fn(),
        ...over,
    };
    return { d, undo, flush: () => frames.splice(0).forEach((fn) => fn()) };
}

describe('the return glide', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => { endReturnGlide(); vi.useRealTimers(); });

    it('starts, releases on the next frame, and clears itself at the cap', () => {
        const { d, undo, flush } = deps();
        expect(startReturnGlide(d)).toBe(true);
        expect(d.apply).toHaveBeenCalledTimes(1);
        expect(returnGlideRunning()).toBe(true);
        expect(d.release).not.toHaveBeenCalled();
        flush();
        expect(d.release).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(RETURN_GLIDE.cap - 1);
        expect(undo).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(undo).toHaveBeenCalledTimes(1);
        expect(returnGlideRunning()).toBe(false);
    });

    it.each([['returns null', () => null], ['throws', () => { throw new Error('gone'); }]])('does not start when apply %s', (_n, apply) => {
        const { d } = deps({ apply });
        expect(startReturnGlide(d)).toBe(false);
        expect(returnGlideRunning()).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('ends early: undone once, never released by a late frame, timer cleared', () => {
        const { d, undo, flush } = deps();
        startReturnGlide(d);
        endReturnGlide();
        expect(undo).toHaveBeenCalledTimes(1);
        flush();
        expect(d.release).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
        endReturnGlide();
        expect(undo).toHaveBeenCalledTimes(1);
    });

    it('ending with none running is harmless', () => {
        expect(() => endReturnGlide()).not.toThrow();
    });

    it('a second start ends the first before applying', () => {
        const first = deps();
        startReturnGlide(first.d);
        const order: string[] = [];
        first.undo.mockImplementation(() => order.push('undo first'));
        const second = deps({ apply: vi.fn(() => { order.push('apply second'); return vi.fn(); }) });
        startReturnGlide(second.d);
        expect(order).toEqual(['undo first', 'apply second']);
        first.flush();
        expect(first.d.release).not.toHaveBeenCalled();
    });

    it('a throwing release or undo is reported and still ends the glide', () => {
        const { d, flush } = deps({ release: vi.fn(() => { throw new Error('release'); }), apply: vi.fn(() => () => { throw new Error('undo'); }) });
        startReturnGlide(d);
        flush();
        vi.advanceTimersByTime(RETURN_GLIDE.cap);
        expect(d.warn).toHaveBeenCalledTimes(2);
        expect(returnGlideRunning()).toBe(false);
    });
});
