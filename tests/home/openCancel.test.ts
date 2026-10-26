import { describe, expect, it, vi } from 'vitest';
import { listenOpenCancel, RETURN_ATTR, showCancelReturn } from '../../src/home/openCancel';
import { RETURN_TIMINGS } from '../../src/home/motion';

describe('B during the opening animation', () => {
    it('cancels the transition and consumes Back before Home can also act on it', () => {
        const doc = new EventTarget();
        const cancel = vi.fn();
        const stop = listenOpenCancel(doc, cancel);
        const event = new Event('vgp_oncancel', { cancelable: true });
        expect(doc.dispatchEvent(event)).toBe(false);
        expect(cancel).toHaveBeenCalledOnce();
        stop();
        expect(doc.dispatchEvent(new Event('vgp_oncancel', { cancelable: true }))).toBe(true);
        expect(cancel).toHaveBeenCalledOnce();
    });
    it('leaves other input alone', () => {
        const doc = new EventTarget(), cancel = vi.fn();
        const stop = listenOpenCancel(doc, cancel);
        expect(doc.dispatchEvent(new Event('vgp_onbuttondown', { cancelable: true }))).toBe(true);
        expect(cancel).not.toHaveBeenCalled();
        stop();
    });
});

const fakeRoot = (connected = true) => {
    const attrs = new Map<string, string>();
    return {
        isConnected: connected,
        offsetWidth: 0,
        setAttribute: vi.fn((k: string, v: string) => attrs.set(k, v)),
        removeAttribute: vi.fn((k: string) => attrs.delete(k)),
        hasAttribute: (k: string) => attrs.has(k),
    };
};

describe('the cancel looks like coming back', () => {
    it("marks Home's root for the return fade, and unmarks it once the fade is over", () => {
        const root = fakeRoot();
        const timers: Array<[() => void, number]> = [];
        showCancelReturn(root as unknown as HTMLElement, (fn, ms) => timers.push([fn, ms]));
        expect(RETURN_ATTR).toBe('data-gh-return');
        expect(root.hasAttribute(RETURN_ATTR)).toBe(true);
        expect(timers).toHaveLength(1);
        expect(timers[0][1]).toBe(RETURN_TIMINGS.fade + 50);
        timers[0][0]();
        expect(root.hasAttribute(RETURN_ATTR)).toBe(false);
    });
    it('a second cancel restarts the fade (unmark, then mark again)', () => {
        const root = fakeRoot();
        const later = vi.fn();
        showCancelReturn(root as unknown as HTMLElement, later);
        showCancelReturn(root as unknown as HTMLElement, later);
        expect(root.removeAttribute).toHaveBeenCalledWith(RETURN_ATTR);
        expect(root.hasAttribute(RETURN_ATTR)).toBe(true);
    });
    it('does nothing for a Home that is gone, and never throws', () => {
        const gone = fakeRoot(false);
        const later = vi.fn();
        showCancelReturn(gone as unknown as HTMLElement, later);
        expect(gone.setAttribute).not.toHaveBeenCalled();
        expect(later).not.toHaveBeenCalled();
        const broken = { isConnected: true, hasAttribute: () => { throw new Error('x'); } };
        expect(() => showCancelReturn(broken as unknown as HTMLElement, later)).not.toThrow();
    });
});
