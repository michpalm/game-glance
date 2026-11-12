import { describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import { limitFromShells, observePlayersPlacement, placePlayersOn, playersLimit, playersPlacement } from '../../src/styles/playersFit';

type Box = { left: number; top?: number; width: number; height?: number };
const rect = ({ left, top = 0, width, height = 20 }: Box) => ({ x: left, y: top, left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
function place(el: Element, box: Box | (() => Box)) {
    (el as HTMLElement).getBoundingClientRect = () => rect(typeof box === 'function' ? box() : box);
}

describe('playersPlacement', () => {
    it('stays in the row up to the line, goes above past it, and stays in the row with no line', () => {
        expect(playersPlacement({ pillLeft: 1100, limit: 1200 })).toBe('above');
        expect(playersPlacement({ pillLeft: 1200, limit: 1200 })).toBe('row');
        expect(playersPlacement({ pillLeft: 10, limit: null })).toBe('row');
    });
});

describe('playersLimit', () => {
    it("is the right-hand stat card's left edge on the page and in the Clean look, never Home's hidden cards", () => {
        const page = parseHTML('<div id="r"><div class="gg-cards"><div id="a"></div><div id="b"></div></div></div>').document;
        place(page.querySelector('#a')!, { left: 40, width: 700 }); place(page.querySelector('#b')!, { left: 1200, width: 680 });
        expect(playersLimit(page.querySelector('#r') as unknown as HTMLElement)).toBe(1200);
        const clean = parseHTML('<div id="r"><div class="gg-clean-info" id="c"></div></div>').document;
        place(clean.querySelector('#c')!, { left: 1300, width: 500 });
        expect(playersLimit(clean.querySelector('#r') as unknown as HTMLElement)).toBe(1300);
        // Home's cards are hidden at rest: never a line from them (Home uses limitFromShells).
        const home = parseHTML('<div id="r"><div class="gh-normal-cards"><div id="a"></div><div id="b"></div></div></div>').document;
        place(home.querySelector('#a')!, { left: 40, width: 700 }); place(home.querySelector('#b')!, { left: 1190, width: 680 });
        expect(playersLimit(home.querySelector('#r') as unknown as HTMLElement)).toBeNull();
    });
    it("is where the right column would start with one card, and null with none", () => {
        const one = parseHTML('<div id="r"><div class="gg-cards" id="g"><div id="a"></div></div></div>').document;
        const grid = one.querySelector('#g')!;
        place(grid, { left: 0, width: 2118 }); place(one.querySelector('#a')!, { left: 0, width: 2118 });
        (one.defaultView as unknown as { getComputedStyle: (e: Element) => { columnGap: string } }).getComputedStyle = () => ({ columnGap: '18px' });
        expect(playersLimit(one.querySelector('#r') as unknown as HTMLElement)).toBeCloseTo((2118 - 18) * 1.1 / 2.1 + 18, 5);
        const none = parseHTML('<div id="r"></div>').document;
        expect(playersLimit(none.querySelector('#r') as unknown as HTMLElement)).toBeNull();
    });
});

describe('observePlayersPlacement', () => {
    function fixture(text = '20,663 playing') {
        const { document, window } = parseHTML(`<div id="r"><span class="gg-pill" id="h"><span class="gg-family" id="f"></span><span data-players-pill id="p">${text}</span></span><div class="gg-cards"><div id="a"></div><div id="b"></div></div></div>`);
        const observers: { cb: () => void; targets: Element[]; disconnect: ReturnType<typeof vi.fn> }[] = [];
        (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class { targets: Element[] = []; disconnect = vi.fn(); constructor(public cb: () => void) { observers.push(this as never); } observe(t: Element) { this.targets.push(t); } };
        const holder = document.querySelector('#h') as unknown as HTMLElement, pill = document.querySelector('#p') as unknown as HTMLElement;
        place(document.querySelector('#f')!, { left: 1315, width: 404 });
        // Home's canvas is scaled: the family pill's layout width (offsetWidth) differs from its on-screen width.
        Object.defineProperty(document.querySelector('#f')!, 'offsetWidth', { value: 323 });
        place(document.querySelector('#a')!, { left: 40, width: 780 }); place(document.querySelector('#b')!, { left: 1200, width: 680 });
        // The pill's row position: 10 px left of the family pill, as wide as its text.
        place(pill, () => ({ left: 1315 - 10 - pill.textContent!.length * 12, width: pill.textContent!.length * 12 }));
        return { document, window, holder, pill, root: document.querySelector('#r') as unknown as HTMLElement, observers };
    }
    it("writes the family pill's width and the placement, and goes above when the row would cross the line", () => {
        const f = fixture('20,663 playing'); // 14 chars: left 1137 < 1200
        const stop = observePlayersPlacement(f.holder, f.root);
        expect(f.holder.style.getPropertyValue('--gg-family-w')).toBe('323px');
        expect(f.holder.dataset.players).toBe('above');
        stop();
        expect(f.holder.dataset.players).toBeUndefined();
        for (const o of f.observers) expect(o.disconnect).toHaveBeenCalled();
    });
    it('a count that grows past the line while open moves the pill above without other events', async () => {
        const f = fixture('9,999 p'); // 7 chars: left 1221 → row
        const stop = observePlayersPlacement(f.holder, f.root);
        expect(f.holder.dataset.players).toBe('row');
        f.pill.textContent = '10,000 playing';
        await new Promise((r) => setTimeout(r, 0));
        expect(f.holder.dataset.players).toBe('above');
        stop();
    });
});

describe('limitFromShells (the page model: Home at rest and the open copy)', () => {
    const box = (x: number, w: number) => ({ x, y: 600, w, h: 260 });
    it("is the page's right-hand card, the Clean panel, or where the right column would start", () => {
        expect(limitFromShells('spotlight', [box(40, 780), box(1200, 680)], 1)).toBe(1200);
        expect(limitFromShells('clean', [box(1300, 580)], 1)).toBe(1300);
        expect(limitFromShells('spotlight', [box(40, 1840)], 1.25)).toBeCloseTo(40 + (1840 - 18 * 1.25) * 1.1 / 2.1 + 18 * 1.25, 5);
        expect(limitFromShells('spotlight', [], 1)).toBeNull();
    });
});

describe('observePlayersPlacement with a model line', () => {
    it("measures against the given line instead of the cards in the DOM (Home's are hidden at rest)", () => {
        const { document, window } = parseHTML('<div id="r"><span id="h"><span data-players-pill id="p">x</span></span><div class="gh-normal-cards"><div></div><div id="b"></div></div></div>');
        (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} disconnect() {} };
        const holder = document.querySelector('#h') as unknown as HTMLElement;
        place(document.querySelector('#p')!, { left: 1100, width: 100 });
        place(document.querySelector('#b')!, { left: 0, width: 0 });
        const stop = observePlayersPlacement(holder, document.querySelector('#r') as unknown as HTMLElement, () => 1200);
        expect(holder.dataset.players).toBe('above');
        stop();
    });
});

describe('placePlayersOn (a callback ref: the watcher lives and dies with the holder element)', () => {
    it('places each new holder it is given, and its cleanup undoes only that one', () => {
        const { document, window } = parseHTML('<div class="gh-root"><span id="a"><span class="gh-family"></span><span data-players-pill></span></span><span id="b"><span class="gh-family"></span><span data-players-pill></span></span></div>');
        (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} disconnect() {} };
        for (const f of document.querySelectorAll('.gh-family')) Object.defineProperty(f, 'offsetWidth', { value: 175 });
        const a = document.querySelector('#a') as unknown as HTMLElement, b = document.querySelector('#b') as unknown as HTMLElement;
        const ref = placePlayersOn(true, () => null);
        const stopA = ref(a)!;
        expect(a.dataset.players).toBe('row');
        expect(a.style.getPropertyValue('--gg-family-w')).toBe('175px');
        stopA(); // the old holder goes away (React 19 calls the ref's cleanup)
        const stopB = ref(b)!;
        expect(a.dataset.players).toBeUndefined();
        expect(b.dataset.players).toBe('row');
        stopB();
        expect(placePlayersOn(false, () => null)(b)).toBeUndefined();
        expect(placePlayersOn(true, () => null)(null)).toBeUndefined();
    });
});
