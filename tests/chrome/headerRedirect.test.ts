import { describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import { installHeaderRedirect } from '../../src/chrome/headerRedirect';

function setup(opts: Partial<{ enabled: boolean; busy: boolean }> = {}) {
    const { document, window } = parseHTML(`<html><body>
        <div id="steam"><div class="avatarHolder_x"><button id="avatar"></button></div><input id="field"></div>
        <div id="ours"><button id="ourBtn"></button></div>
        <div id="page"><button id="card"></button><button id="other"></button></div>
    </body></html>`);
    const $ = (id: string) => document.getElementById(id) as HTMLElement;
    const rect = (r: object) => () => ({ top: 0, left: 0, width: 0, height: 0, ...r });
    $('steam').getBoundingClientRect = rect({ top: 0, height: 40, width: 1500 }) as any;
    $('avatar').parentElement!.getBoundingClientRect = rect({ top: 4, height: 32, width: 32 }) as any;
    const state = { enabled: opts.enabled ?? true, busy: opts.busy ?? false };
    const o = {
        enabled: () => state.enabled,
        busy: () => state.busy,
        enter: vi.fn(() => true),
        inOurBar: (t: Element | null) => !!t && $('ours').contains(t),
    };
    const focus = (el: HTMLElement, from: HTMLElement | null = null) => {
        el.dispatchEvent(Object.assign(new window.Event('focusin', { bubbles: true }), { relatedTarget: from }));
    };
    // linkedom's MutationObserver never fires: capture the callback and feed it records by hand.
    const watchers: MutationCallback[] = [];
    const View = class { innerWidth = 1500; MutationObserver = class { constructor(fn: MutationCallback) { watchers.push(fn); } observe() {} disconnect() {} }; };
    Object.defineProperty(document, 'defaultView', { configurable: true, value: new View() });
    const classChanged = (el: HTMLElement) => watchers.forEach((w) => w([{ target: el, type: 'attributes' } as any], {} as any));
    const redirect = installHeaderRedirect(document as any, o);
    return { document, window, $, o, state, focus, redirect, classChanged };
}

describe('installHeaderRedirect', () => {
    it("moves focus from Steam's header into ours and remembers where it came from", () => {
        const t = setup();
        const focus = vi.spyOn(t.$('card'), 'focus');
        t.focus(t.$('avatar'), t.$('card'));
        expect(t.o.enter).toHaveBeenCalledTimes(1);
        t.redirect.leave();
        expect(focus).toHaveBeenCalledTimes(1);
    });
    it('does nothing while disabled', () => {
        const t = setup({ enabled: false });
        t.focus(t.$('avatar'), t.$('card'));
        expect(t.o.enter).not.toHaveBeenCalled();
    });
    it('does not take focus while the Search keyboard is open', () => {
        const t = setup({ busy: true });
        t.focus(t.$('field'), t.$('card'));
        expect(t.o.enter).not.toHaveBeenCalled();
    });
    it('does not bounce when focus comes from our own bar', () => {
        const t = setup();
        const card = vi.spyOn(t.$('card'), 'focus'), other = vi.spyOn(t.$('other'), 'focus');
        t.focus(t.$('avatar'), t.$('card'));
        t.focus(t.$('ourBtn'), t.$('avatar')); // our bar: not Steam's bar, no entry
        t.focus(t.$('avatar'), t.$('ourBtn')); // arrives from our bar: memory unchanged
        expect(t.o.enter).toHaveBeenCalledTimes(2);
        t.redirect.leave();
        expect(card).toHaveBeenCalledTimes(1);
        expect(other).not.toHaveBeenCalled();
    });
    it('falls back when the remembered element is gone', () => {
        const t = setup();
        const card = t.$('card'), focus = vi.spyOn(card, 'focus');
        t.focus(t.$('avatar'), card);
        card.remove();
        const fallback = vi.fn();
        t.redirect.leave(fallback);
        expect(fallback).toHaveBeenCalledTimes(1);
        expect(focus).not.toHaveBeenCalled();
    });
    it('removes its listener on dispose', () => {
        const t = setup();
        t.redirect.dispose();
        t.focus(t.$('avatar'), t.$('card'));
        expect(t.o.enter).not.toHaveBeenCalled();
    });
    it("enters on Steam's gamepad focus class too", () => {
        const t = setup();
        t.focus(t.$('card')); // last element outside both bars
        t.$('avatar').classList.add('gpfocus');
        t.classChanged(t.$('avatar'));
        expect(t.o.enter).toHaveBeenCalledTimes(1);
        t.$('field').classList.add('gpfocus'); // still in the bar: not a new arrival
        t.classChanged(t.$('field'));
        expect(t.o.enter).toHaveBeenCalledTimes(1);
        const focus = vi.spyOn(t.$('card'), 'focus');
        t.redirect.leave();
        expect(focus).toHaveBeenCalledTimes(1);
    });
});
