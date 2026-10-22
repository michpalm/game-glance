import { describe, expect, it, vi } from 'vitest';
import { topBarCopy, withSteamBarBack } from '../../src/home/openBridge';
import type { OpenBridge } from '../../src/home/openTransition';

function fakeEl() {
    const el: any = {
        style: {} as Record<string, string>,
        attrs: {} as Record<string, string>,
        children: [] as any[],
        setAttribute(k: string, v: string) { el.attrs[k] = v; },
        appendChild(c: any) { el.children.push(c); return c; },
    };
    return el;
}

function fakeBridge() {
    return { fadeIn: vi.fn(), fadeOut: vi.fn(), remove: vi.fn(), settle: vi.fn() };
}

describe('topBarCopy', () => {
    it("pins a copy of Steam's bar where it is, never catching input", () => {
        const doc: any = { createElement: () => fakeEl() };
        const clone: any = { style: {}, cloned: true };
        const bar: any = { cloneNode: vi.fn(() => clone) };
        const wrap: any = topBarCopy(bar, { left: 10, top: 0, width: 800, height: 40 }, doc);
        expect(bar.cloneNode).toHaveBeenCalledWith(true);
        expect(wrap.style).toMatchObject({ position: 'fixed', left: '10px', top: '0px', width: '800px', height: '40px', margin: '0', pointerEvents: 'none' });
        expect(wrap.attrs['aria-hidden']).toBe('true');
        expect(wrap.children).toEqual([clone]);
        expect(clone.style).toMatchObject({ position: 'relative', inset: 'auto', width: '100%', height: '100%' });
    });
});

describe('withSteamBarBack', () => {
    it("gives Steam's bar back as the copy starts fading, once", () => {
        const bridge = fakeBridge();
        const giveBack = vi.fn();
        const wrapped = withSteamBarBack(bridge as OpenBridge, giveBack);
        wrapped.fadeOut(300);
        expect(giveBack).toHaveBeenCalledTimes(1);
        expect(bridge.fadeOut).toHaveBeenCalledWith(300);
        expect(giveBack.mock.invocationCallOrder[0]).toBeLessThan(bridge.fadeOut.mock.invocationCallOrder[0]);
        wrapped.remove();
        expect(bridge.remove).toHaveBeenCalledTimes(1);
        expect(giveBack).toHaveBeenCalledTimes(1);
    });

    it('still gives it back when the copy is removed without a fade', () => {
        const bridge = fakeBridge();
        const giveBack = vi.fn();
        const wrapped = withSteamBarBack(bridge as OpenBridge, giveBack);
        wrapped.remove();
        expect(bridge.remove).toHaveBeenCalledTimes(1);
        expect(giveBack).toHaveBeenCalledTimes(1);
    });

    it('forwards fadeIn and settle, and a throwing giveBack never stops the fade', () => {
        const bridge = fakeBridge();
        const giveBack = vi.fn(() => { throw new Error('boom'); });
        const wrapped = withSteamBarBack(bridge as OpenBridge, giveBack);
        wrapped.fadeIn(150);
        wrapped.settle?.();
        expect(bridge.fadeIn).toHaveBeenCalledWith(150);
        expect(bridge.settle).toHaveBeenCalledTimes(1);
        expect(() => wrapped.fadeOut(300)).not.toThrow();
        expect(bridge.fadeOut).toHaveBeenCalledWith(300);
        wrapped.remove();
        expect(giveBack).toHaveBeenCalledTimes(1);
    });

    it('has no settle when the bridge has none', () => {
        const { settle: _s, ...bare } = fakeBridge();
        expect(withSteamBarBack(bare as OpenBridge, vi.fn()).settle).toBeUndefined();
    });
});
