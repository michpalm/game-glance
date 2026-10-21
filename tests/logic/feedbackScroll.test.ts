import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import { playRow } from '../../src/styles/theme';

vi.mock('../../src/styles/theme', () => ({ playRow: vi.fn(() => '.play') }));

import { centerFeedbackPanel, scrollPageToTop, installPageFocusScrolling } from '../../src/logic/feedbackScroll';

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

function fixture(scale = 1, native = true) {
    const { document, window } = parseHTML('<html><body><div id="port"><div id="card" class="gg-card-nav" tabindex="0">Info card</div><div class="feedback"><button id="yes">Yes</button><button id="no">No</button></div><div id="menus"><div role="tablist"><button id="tab" role="tab">Activity</button><button id="tab2" role="tab">Game Info</button></div><button id="inner">New Note</button></div><button id="outside">Outside</button></div></body></html>');
    const port = document.querySelector('#port')! as unknown as HTMLElement;
    const panel = document.querySelector('.feedback')! as unknown as HTMLElement;
    let active: Element | null = null;
    Object.defineProperty(document, 'activeElement', { get: () => active });
    Object.defineProperties(port, { clientHeight: { value: 466 }, scrollHeight: { value: 1600 } });
    port.scrollTop = 100;
    port.getBoundingClientRect = () => ({ top: 0, bottom: 466 * scale, height: 466 * scale }) as DOMRect;
    panel.getBoundingClientRect = () => ({ top: (600 - port.scrollTop) * scale, bottom: (700 - port.scrollTop) * scale, height: 100 * scale }) as DOMRect;
    const menus = document.querySelector('#menus')! as unknown as HTMLElement;
    menus.getBoundingClientRect = () => ({ top: (800 - port.scrollTop) * scale, bottom: (1600 - port.scrollTop) * scale, height: 800 * scale }) as DOMRect;
    const state = { animationRunning: true };
    if (native) Object.assign(port, { __reactFiber$test: { return: { stateNode: {
        Element: port,
        ScrollTo(top: number, behavior: string) {
            if (behavior === 'auto') state.animationRunning = false;
            port.scrollTop = top;
        },
    } } } });
    vi.stubGlobal('getComputedStyle', (el: Element) => ({ overflowY: el === port ? 'scroll' : 'visible' }));
    let id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++id, fn); return id; });
    vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame));
    const flush = () => { const current = [...frames.values()]; frames.clear(); current.forEach(fn => fn(0)); };
    const focus = (selector: string) => {
        active = document.querySelector(selector) as unknown as Element;
        active!.dispatchEvent(new window.Event('focusin', { bubbles: true }));
    };
    return { document: document as unknown as Document, panel, port, state, flush, focus };
}

describe('game-page focus scrolling', () => {
    it('centers the entire panel through Steam’s controller, cancelling its old scroll animation', () => {
        const f = fixture();
        centerFeedbackPanel(f.panel);
        expect(f.port.scrollTop).toBe(417);
        expect(f.state.animationRunning).toBe(false);
    });

    it('converts viewport distances to scroll units when Steam scales the page', () => {
        const f = fixture(2);
        centerFeedbackPanel(f.panel);
        expect(f.port.scrollTop).toBe(417);
    });

    it('centers with ordinary scrolling when Steam’s component cannot be found', () => {
        const f = fixture(1, false);
        centerFeedbackPanel(f.panel);
        expect(f.port.scrollTop).toBe(417);
    });

    it('waits for native focus scrolling and centers again when another response is selected', () => {
        const f = fixture();
        const stop = installPageFocusScrolling(f.document, '.feedback');
        f.focus('#yes');
        f.flush();
        expect(f.port.scrollTop).toBe(100);
        f.flush();
        expect(f.port.scrollTop).toBe(417);
        f.port.scrollTop = 0; // Steam's onFocusWithin starts scrolling to the game header again.
        f.focus('#no');
        f.flush(); f.flush();
        expect(f.port.scrollTop).toBe(417);
        stop();
    });

    it('does not pull the page back after focus leaves the panel or the listener is removed', () => {
        const f = fixture();
        const stop = installPageFocusScrolling(f.document, '.feedback');
        f.focus('#yes');
        f.focus('#outside');
        f.flush(); f.flush();
        expect(f.port.scrollTop).toBe(100);
        f.focus('#yes');
        stop();
        f.flush(); f.flush();
        expect(f.port.scrollTop).toBe(100);
    });

    it('returns to the top when an info card is focused on a page without feedback', () => {
        const f = fixture();
        f.panel.remove();
        const stop = installPageFocusScrolling(f.document, null);
        f.focus('#card');
        f.flush(); f.flush();
        expect(f.port.scrollTop).toBe(0);
        expect(f.state.animationRunning).toBe(false);
        expect(f.document.activeElement?.id).toBe('card');
        stop();
    });

    it('cancels a pending return to the top if focus leaves the cards', () => {
        const f = fixture();
        const stop = installPageFocusScrolling(f.document, '.feedback');
        f.focus('#card');
        f.focus('#outside');
        f.flush(); f.flush();
        expect(f.port.scrollTop).toBe(100);
        stop();
    });

    it('aligns the submenu section below Steam’s top inset when a tab is focused', () => {
        const f = fixture();
        const stop = installPageFocusScrolling(f.document, '.feedback', { selector: '#menus', inset: 40 });
        f.focus('#tab');
        f.flush(); f.flush();
        expect(f.port.scrollTop).toBe(760);
        expect(f.document.activeElement?.id).toBe('tab');
        expect(f.state.animationRunning).toBe(false);
        stop();
    });

    it('lets submenu contents scroll normally after leaving the tab header', () => {
        const f = fixture(2);
        const stop = installPageFocusScrolling(f.document, '.feedback', { selector: '#menus', inset: 40 });
        f.focus('#tab2');
        f.flush(); f.flush();
        expect(f.port.scrollTop).toBe(760);
        f.port.scrollTop = 1000;
        f.focus('#inner');
        f.flush(); f.flush();
        expect(f.port.scrollTop).toBe(1000);
        stop();
    });
});

describe('Family Sharing hero scrolling', () => {
    it('uses the anchor scroll port without loading Steam theme classes', () => {
        const f = fixture();
        scrollPageToTop(f.document.querySelector('#card') as HTMLElement);
        expect(f.port.scrollTop).toBe(0);
        expect(playRow).not.toHaveBeenCalled();
    });
    it('returns to the hero when the Family Sharing pill itself has gamepad focus', () => {
        const f = fixture();
        const family = f.document.createElement('button');
        family.className = 'gg-family gpfocus';
        f.port.appendChild(family);
        const stop = installPageFocusScrolling(f.document, null);
        f.focus('#outside');
        family.dispatchEvent(new f.document.defaultView!.Event('focusin', { bubbles: true }));
        f.flush(); f.flush();
        expect(f.port.scrollTop).toBe(0);
        expect(f.state.animationRunning).toBe(false);
        stop();
    });
    it('uses the native play row scroll port when the pill is portalled outside it', () => {
        const f = fixture();
        f.document.querySelector('#card')!.classList.add('play');
        const family = f.document.createElement('button');
        f.document.documentElement.appendChild(family);
        scrollPageToTop(family);
        expect(playRow).toHaveBeenCalledOnce();
        expect(f.port.scrollTop).toBe(0);
    });
});
