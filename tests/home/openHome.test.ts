import { describe, expect, it, vi } from 'vitest';
import { STANDARD_HERO_ASPECT, fitMask } from '../../src/home/heroFit';
import { applyOpening, measureCanvasScale, extrasFlags, readChipTexts, extrasParts, lineMeasure, measureHome, missingStats, mountTwins, readTwinTexts, restTwinsOnExtras, settleTwins, viewportSize, openVariant, pageStatsFromChips, readExtrasAsked } from '../../src/home/openHome';
import type { TwinSpec } from '../../src/home/openTwins';
import { BRIDGE_FADE_EASE, mountOpenBridge } from '../../src/home/openBridge';

describe('openVariant', () => {
    it('morphs only the selected game with its full hero art onto the restyled page', () => {
        expect(openVariant({ sameGame: true, heroMode: 'full', pageRestyled: true })).toBe('morph');
    });
    it('a game without full hero art fades (its art would not match the page header)', () => {
        expect(openVariant({ sameGame: true, heroMode: 'fallback', pageRestyled: true })).toBe('fade');
        expect(openVariant({ sameGame: true, heroMode: 'none', pageRestyled: true })).toBe('fade');
    });
    it('another game (a feed card) crossfades to its hero', () => {
        expect(openVariant({ sameGame: false, heroMode: 'full', pageRestyled: true })).toBe('heroFade');
        expect(openVariant({ sameGame: false, heroMode: 'none', pageRestyled: true })).toBe('heroFade');
    });
    it("Steam's own page (Game Glance page off) fades", () => {
        expect(openVariant({ sameGame: true, heroMode: 'full', pageRestyled: false })).toBe('fade');
    });
});

/** A minimal element: a box, attributes, and children found by selector. */
interface FakeEl {
    getBoundingClientRect(): { left: number; top: number; width: number; height: number };
    getAttribute(name: string): string | null;
    querySelector(sel: string): FakeEl | null;
    querySelectorAll(sel: string): FakeEl[];
}
function el(x: number, y: number, w: number, h: number, attrs: Record<string, string> = {}, one: Record<string, FakeEl> = {}, all: Record<string, FakeEl[]> = {}): FakeEl {
    return {
        getBoundingClientRect: () => ({ left: x, top: y, width: w, height: h }),
        getAttribute: (n) => attrs[n] ?? null,
        querySelector: (s) => one[s] ?? null,
        querySelectorAll: (s) => all[s] ?? [],
    };
}
function chip(key: string | null, x: number, bar: boolean) {
    return el(x, 360, 100, 70, key ? { 'data-chip': key } : {}, {
        '.gh-chip-label': el(x + 15, 373, 70, 12),
        '.gh-chip-value': el(x + 15, 390, 70, 25),
        ...(bar ? { '.gh-chip-bar': el(x + 15, 419, 70, 3) } : {}),
    });
}
function home(withPlay = true) {
    const circles = [el(300, 460, 56, 56, { 'data-action': 'controller' }), el(366, 460, 56, 56, { 'data-action': 'menu' }), el(435, 460, 56, 56, { 'data-action': 'info' })];
    return el(0, 0, 1500, 844, {}, {
        '.gh-canvas': el(0, 0, 1500, 843.75),
        '.gh-title-slot': el(25, 188, 645, 121),
        '.gh-eyebrow': el(25, 328, 645, 15),
        ...(withPlay ? { '.gh-actions .gh-btn[data-action="play"]': el(20, 459, 271, 58) } : {}),
        '.gh-source': el(1377, 472, 103, 33),
    }, {
        '.gh-actions .gh-btn-circle': circles,
        '.gh-chip': [chip('played', 25, false), chip('achievements', 144, true), chip(null, 288, true)],
    });
}

describe('measureCanvasScale', () => {
    const rootFor = (width: string, drawn = 1499.988037109375) => ({
        ownerDocument: { defaultView: { getComputedStyle: () => ({ width }) } },
        querySelector: () => ({ offsetWidth: 1326, getBoundingClientRect: () => ({ width: drawn }) }),
    }) as unknown as Element;

    it('keeps the grown canvas fractional width so the glass lands on its unscaled crisp border', () => {
        // Recorded Ally: growth makes the logical canvas fractional; offsetWidth rounds it up.
        const scale = measureCanvasScale(rootFor('1325.5px'));
        const ringX = 1037.5;
        expect(scale).toBeCloseTo(1.1316394093620332, 12);
        expect((ringX / scale) * (1499.988037109375 / 1325.5)).toBeCloseTo(ringX, 8);
        expect(Math.abs((ringX / (1499.988037109375 / 1326)) * scale - ringX)).toBeGreaterThan(0.39);
    });
    it('keeps whole-width canvases and rejects missing, hidden or invalid geometry', () => {
        expect(measureCanvasScale(rootFor('1440px', 1500))).toBeCloseTo(1500 / 1440, 12);
        for (const width of ['0px', 'auto', 'NaN', '-1px']) expect(measureCanvasScale(rootFor(width))).toBe(0);
        expect(measureCanvasScale(rootFor('1325.5px', 0))).toBe(0);
        expect(measureCanvasScale({ querySelector: () => null } as unknown as Element)).toBe(0);
    });
});

describe('measureHome', () => {
    it("reads Home's boxes: circles in order with the info button's index, chips by data-chip", () => {
        const r = measureHome(home() as unknown as Element);
        expect(r).not.toBeNull();
        expect(r!.play).toEqual({ x: 20, y: 459, w: 271, h: 58 });
        expect(r!.circles).toHaveLength(3);
        expect(r!.infoCircle).toBe(2);
        expect(r!.chips.map((c) => c.key)).toEqual(['played', 'achievements', '']);
        expect(r!.chips[0].bar).toBeNull();
        expect(r!.chips[1].bar).toEqual({ x: 159, y: 419, w: 70, h: 3 });
        expect(r!.canvas.w).toBe(1500);
        // The extras layer is placed in the root's px.
        expect(r!.root).toEqual({ x: 0, y: 0, w: 1500, h: 844 });
    });
    it('knows a text title from a logo (a text title grows to the page size, a logo does not)', () => {
        const withText = home();
        const q = withText.querySelector;
        withText.querySelector = (sel: string) => (sel === '.gh-title-slot .gh-title' ? el(25, 250, 300, 58) : q(sel));
        expect(measureHome(withText as unknown as Element)!.titleText).toBe(true);
        expect(measureHome(home() as unknown as Element)!.titleText).toBe(false);
    });
    it('is null when something required is missing (no Play pill: the Library card)', () => {
        expect(measureHome(home(false) as unknown as Element)).toBeNull();
        expect(measureHome(null)).toBeNull();
    });
});

/** A root that records what applyOpening does, with a frame callback we run by hand. */
function fakeRoot() {
    const props = new Map<string, string>();
    const attrs = new Map<string, string>();
    const frames: Array<() => void> = [];
    const root = {
        style: { setProperty: (n: string, v: string) => props.set(n, v), removeProperty: (n: string) => props.delete(n) },
        setAttribute: (n: string, v: string) => attrs.set(n, v),
        removeAttribute: (n: string) => attrs.delete(n),
        ownerDocument: { defaultView: { requestAnimationFrame: (cb: () => void) => frames.push(cb) } },
    };
    return { root: root as unknown as HTMLElement, props, attrs, frames };
}

describe('applyOpening', () => {
    it('sets the variables and the start frame, then the motion on the next frame', () => {
        const f = fakeRoot();
        applyOpening(f.root, 'morph', [{ name: '--gho-title', value: 'translate(1px, 2px)' }, { name: '--gho-shell-count', value: '2' }], null);
        expect(f.props.get('--gho-title')).toBe('translate(1px, 2px)');
        expect(f.attrs.get('data-gh-opening')).toBe('morph');
        expect(f.attrs.get('data-gh-phase')).toBe('from');
        expect(f.attrs.get('data-gh-shells')).toBe('2');
        f.frames.splice(0).forEach((cb) => cb());
        expect(f.attrs.get('data-gh-phase')).toBe('to');
    });
    it('twins that cannot be drawn: the morph still starts, without them (Home\'s own text morphs)', () => {
        const f = fakeRoot();
        const twin: TwinSpec = { name: 'title', role: 'title', text: 'X', x: 0, y: 0, origin: 'base', from: 'none', to: 'none', accent: false };
        expect(() => applyOpening(f.root, 'morph', [], null, '', [twin])).not.toThrow();
        expect(f.attrs.get('data-gh-opening')).toBe('morph');
        expect(f.attrs.has('data-gh-twins')).toBe(false);
    });
    it("a feed card's game: its hero art as a variable", () => {
        const f = fakeRoot();
        applyOpening(f.root, 'heroFade', [], 'https://steamloopback.host/assets/10/library_hero.jpg');
        expect(f.props.get('--gho-hero')).toBe('url("https://steamloopback.host/assets/10/library_hero.jpg")');
    });
    it("a feed card's game in Fit: the standard hero fade beside its art (its size is not known yet), gone on undo", () => {
        const f = fakeRoot();
        const undo = applyOpening(f.root, 'heroFade', [], 'https://steamloopback.host/assets/10/library_hero.jpg');
        expect(f.props.get('--gho-hero-mask')).toBe(fitMask(STANDARD_HERO_ASPECT, 16 / 9));
        undo();
        expect(f.props.has('--gho-hero-mask')).toBe(false);
    });
    it("marks the parts Home draws as it turns into the page (data-gh-extras), none when it has none", () => {
        const f = fakeRoot();
        applyOpening(f.root, 'morph', [], null, 'desc hltb');
        expect(f.attrs.get('data-gh-extras')).toBe('desc hltb');
        const g = fakeRoot();
        applyOpening(g.root, 'morph', [], null, '');
        expect(g.attrs.has('data-gh-extras')).toBe(false);
    });
    it('undo (cancel before the hand-over) removes every trace, and a pending frame then does nothing', () => {
        const f = fakeRoot();
        const undo = applyOpening(f.root, 'morph', [{ name: '--gho-title', value: 'translate(1px, 2px)' }], 'x', 'desc');
        undo();
        f.frames.splice(0).forEach((cb) => cb());
        expect(f.props.size).toBe(0);
        expect(f.attrs.size).toBe(0);
    });
});

describe('viewportSize', () => {
    it("the window's exact size (the page lays out from 100vw / 100vh, fractional at a 2.32 pixel ratio), not innerWidth's rounding", () => {
        expect(viewportSize({ innerWidth: 828, innerHeight: 466, visualViewport: { width: 828.0172, height: 466.3793 } })).toEqual({ width: 828.0172, height: 466.3793 });
        expect(viewportSize({ innerWidth: 828, innerHeight: 466 })).toEqual({ width: 828, height: 466 });
        expect(viewportSize({ innerWidth: 828, innerHeight: 466, visualViewport: { width: 0, height: 0 } })).toEqual({ width: 828, height: 466 });
    });
    it('and its pixel ratio, where the page draws its borders and edges (whole device px)', () => {
        expect(viewportSize({ innerWidth: 828, innerHeight: 466, devicePixelRatio: 2.32 }).dpr).toBe(2.32);
        expect(viewportSize({ innerWidth: 828, innerHeight: 466 }).dpr).toBeUndefined();
    });
});

describe('missingStats', () => {
    it("the page's stat columns Home showed no chip for (they arrive instead of popping in at the hand-over)", () => {
        expect(missingStats(['added', 'achievements', 'hltb'])).toEqual(['played']);
        expect(missingStats(['played', 'achievements', 'hltb'])).toEqual([]);
        expect(missingStats(['played'])).toEqual(['achievements', 'hltb']);
        // A column Home drew in its extras layer is there at the hand-over: it does not arrive.
        expect(missingStats(['added', 'achievements', 'hltb'], 'desc played')).toEqual([]);
    });
});

describe('extrasParts', () => {
    const found = (main: number | null) => ({ status: 'found' as const, gameId: 1, times: { main, mainExtras: 12, completionist: 24 } });
    it('the description when Home has its text; the HowLongToBeat card when it found the game with a Main time', () => {
        expect(extrasParts('A ship in the dark.', found(9))).toBe('desc hltb');
        expect(extrasParts(null, found(9))).toBe('hltb');
        expect(extrasParts('  ', undefined)).toBe('');
        // No match: Home draws the card's "No Matches Found" too, so it does not arrive after the hand-over (ES-DE on the Deck).
        expect(extrasParts('Text', { status: 'notFound' })).toBe('desc hltb');
        expect(extrasParts(null, { status: 'unavailable' })).toBe('');
    });
    it('no Main time: no card (the page\'s "—" there would have nothing of Home\'s under it)', () => {
        expect(extrasParts(null, found(null))).toBe('');
    });
    it("a new game's Play time (Home shows its Added chip instead): Home draws the page's column, so it is there at the hand-over", () => {
        expect(extrasParts(null, undefined, undefined, true)).toBe('played');
        expect(extrasParts('Text', undefined, 'Steam', true)).toBe('desc pills played');
        expect(extrasParts(null, undefined, undefined, false)).toBe('');
    });
    it("the page's own store pill (and family pill in it) when Home knows the store: drawn at the page's size, it hands over unchanged", () => {
        expect(extrasParts(null, undefined, 'Steam')).toBe('pills');
        expect(extrasParts('Text', found(9), 'GOG')).toBe('desc hltb pills');
        expect(extrasParts(null, undefined, '')).toBe('');
    });
});

describe('extrasFlags', () => {
    it("tells the page which of its parts Home drew (they show at once instead of arriving)", () => {
        expect(extrasFlags('desc hltb')).toEqual({ homeDesc: true, homeHltb: true });
        expect(extrasFlags('hltb')).toEqual({ homeHltb: true });
        expect(extrasFlags('')).toEqual({});
    });
});

describe('readExtrasAsked', () => {
    const text = (t: string) => ({ ...el(0, 0, 0, 0), textContent: t });
    const column = (label: string, value: string) => ({
        ...el(0, 0, 0, 0),
        querySelector: (sel: string) => (sel === '.gh-x-label' ? text(label) : sel === '.gh-x-value' ? text(value) : null),
    });
    it("reads the layer's HowLongToBeat columns after Main, and whether it has a bar", () => {
        const root = el(0, 0, 1500, 844, {}, { '.gh-open-extras .gh-x-bar': el(0, 0, 1, 1) }, {
            '.gh-open-extras .gh-x-stats > div': [column('Main', '9 h'), column('+ Extras', '12 h'), column('100%', '24 h')],
        });
        expect(readExtrasAsked(root as unknown as Element)).toEqual({
            columns: [{ key: 'mainExtras', label: '+ Extras', value: '12 h' }, { key: 'completionist', label: '100%', value: '24 h' }],
            bar: true,
        });
    });
    it('no card in the layer: no columns, no bar', () => {
        expect(readExtrasAsked(el(0, 0, 1500, 844) as unknown as Element)).toEqual({ columns: [], bar: false });
    });
});

describe('pageStatsFromChips', () => {
    const chips = [
        { key: 'played', label: 'Play Time', value: '1.9 h', bar: false },
        { key: 'achievements', label: 'Achievements', value: '0 / 49', bar: true },
        { key: 'hltb', label: 'HLTB main', value: '9.1 h', bar: true },
    ];
    it("Spotlight: the info card's stats, then HowLongToBeat's Main; achievements as everywhere ('0 / 49')", () => {
        expect(pageStatsFromChips(chips, 'spotlight')).toEqual([
            { key: 'played', label: 'Play Time', value: '1.9 h', bar: false },
            { key: 'achievements', label: 'Achievements', value: '0 / 49', bar: false },
            { key: 'hltb', label: 'Main', value: '9.1 h', bar: false },
        ]);
    });
    it('Clean: the same order with bars where Home had them', () => {
        expect(pageStatsFromChips(chips, 'clean').map((s) => [s.key, s.label, s.value, s.bar])).toEqual([
            ['played', 'Play Time', '1.9 h', false], ['achievements', 'Achievements', '0 / 49', true], ['hltb', 'HLTB main', '9.1 h', true],
        ]);
    });
    it("Spotlight: HowLongToBeat without a time ('—', no match) is no column of the page's card, so it has no target (it landed alone in the card)", () => {
        const none = [chips[0], { key: 'hltb', label: 'HLTB main', value: '—', bar: false }];
        expect(pageStatsFromChips(none, 'spotlight').map((s) => s.key)).toEqual(['played']);
        expect(pageStatsFromChips(none, 'clean').map((s) => s.key)).toEqual(['played', 'hltb']);
    });
    it("a new game's Added chip: the page still shows Play time (0 h), and nothing else of Home's is invented", () => {
        const stats = pageStatsFromChips([{ key: 'added', label: 'Added', value: 'Today', bar: false }, chips[2]], 'clean');
        expect(stats.map((s) => s.key)).toEqual(['played', 'hltb']);
        expect(stats[0].value).toBe('0 h');
    });
});

describe('mountOpenBridge', () => {
    function fakeDom() {
        const appended: Array<{ style: Record<string, string>; children: unknown[]; remove(): void }> = [];
        const make = () => {
            const node = {
                style: {} as Record<string, string>,
                children: [] as unknown[],
                className: '',
                attrs: {} as Record<string, string>,
                setAttribute(n: string, v: string) { node.attrs[n] = v; },
                appendChild(c: unknown) { node.children.push(c); },
                remove: vi.fn(),
            };
            return node;
        };
        const clone = { ...make(), classList: { add: vi.fn(), remove: vi.fn() } };
        const doc = { body: { appendChild: (c: never) => appended.push(c) }, createElement: () => make() };
        const root = {
            ownerDocument: doc,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 1500, height: 844 }),
            cloneNode: vi.fn(() => clone),
        };
        return { root: root as unknown as HTMLElement, appended, clone };
    }
    it("puts a frozen copy of Home over Home's box, then fades and removes it", () => {
        const f = fakeDom();
        const bridge = mountOpenBridge(f.root);
        expect(f.appended).toHaveLength(1);
        const box = f.appended[0];
        expect(box.style).toMatchObject({ position: 'fixed', left: '0px', top: '0px', width: '1500px', height: '844px', pointerEvents: 'none' });
        expect(box.children).toEqual([f.clone]);
        expect(f.clone.classList.add).toHaveBeenCalledWith('gh-bridge');
        // Not Home's "just back" state (its UI fading in): in the copy that fade replayed from 0, blanking the title, Play
        // row and stats at the hand-over (opened within 1.5 s of B; recorded on the Ally).
        expect(f.clone.classList.remove).toHaveBeenCalledWith('gh-back');
        bridge.fadeOut(120);
        expect(box.style.opacity).toBe('0');
        expect(box.style.transition).toBe(`opacity 120ms ${BRIDGE_FADE_EASE}`);
        // Front-loaded (the page's new parts show through soon) and soft at the end.
        expect(BRIDGE_FADE_EASE).toBe('cubic-bezier(.2,.65,.3,1)');
        bridge.remove();
        expect(box.remove).toHaveBeenCalled();
    });
    it('fades in over live Home from transparent, so the copy cross-fades instead of replacing Home in one frame', () => {
        const f = fakeDom();
        const bridge = mountOpenBridge(f.root);
        const box = f.appended[0];
        const seen: string[] = [];
        let value = '';
        Object.defineProperty(box.style, 'opacity', { get: () => value, set: (v: string) => { seen.push(v); value = v; }, configurable: true });
        bridge.fadeIn(150);
        expect(seen).toEqual(['0', '1']);
        expect(box.style.transition).toBe('opacity 150ms ease-in-out');
    });
    it('leaves out the parts of Home that are gone by the hand-over (the game row, tabs and feed): half the layout work', () => {
        const f = fakeDom();
        const dropped = [{ remove: vi.fn() }, { remove: vi.fn() }];
        const asked: string[] = [];
        (f.clone as unknown as { querySelectorAll(sel: string): unknown[] }).querySelectorAll = (sel: string) => {
            asked.push(sel);
            return dropped;
        };
        mountOpenBridge(f.root, '', [], ['.gh-recents', '.gh-feed']);
        expect(asked).toEqual(['.gh-recents, .gh-feed']);
        for (const d of dropped) expect(d.remove).toHaveBeenCalled();
    });
    it("carries the given stylesheet while it is up (Steam's page-enter fade switched off)", () => {
        const f = fakeDom();
        mountOpenBridge(f.root, '.x { opacity: 1 }');
        const box = f.appended[0] as unknown as { children: Array<{ textContent?: string }> };
        expect(box.children.some((c) => c.textContent === '.x { opacity: 1 }')).toBe(true);
    });
    it('carries copies of the given extra layers (our status bar) above the copy of Home', () => {
        const f = fakeDom();
        const bar = { cloneNode: vi.fn(() => ({ id: 'bar-copy' })) };
        mountOpenBridge(f.root, '', [bar as unknown as Element]);
        const box = f.appended[0] as unknown as { children: unknown[] };
        expect(box.children[box.children.length - 1]).toEqual({ id: 'bar-copy' });
    });
    it('throws when Home has no usable box (the controller then opens the page without it)', () => {
        const f = fakeDom();
        (f.root as unknown as { getBoundingClientRect: () => unknown }).getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });
        expect(() => mountOpenBridge(f.root)).toThrow();
    });
});

describe('the Unifideck size in the open (Home draws it)', () => {
    const chips = [{ key: 'played', label: 'Play Time', value: '0 h', bar: false }, { key: 'hltb', label: 'HLTB Main', value: '12 h', bar: true }];
    it('the page stats put it right after Played, as the page does', () => {
        const size = { label: 'Space required', value: '1.6 GB' };
        expect(pageStatsFromChips(chips, 'spotlight', size).map((s) => s.key)).toEqual(['played', 'size', 'hltb']);
        expect(pageStatsFromChips(chips, 'clean', size)[1]).toEqual({ key: 'size', label: 'Space required', value: '1.6 GB', bar: false });
        expect(pageStatsFromChips(chips, 'clean').map((s) => s.key)).toEqual(['played', 'hltb']);
    });
    it("is one of the extras' parts when Home knows it", () => {
        expect(extrasParts(null, undefined, 'GOG', false, true)).toBe('pills size');
        expect(extrasParts(null, undefined, 'GOG', false, false)).toBe('pills');
    });
});

describe('extrasFlags for the size', () => {
    it('the page shows the size column at once when Home drew it', () => {
        expect(extrasFlags('pills size')).toEqual({ homeSize: true });
        expect(extrasFlags('desc hltb')).toEqual({ homeDesc: true, homeHltb: true });
    });
});

describe("a Steam game's Space Required chip (not installed): the page's size stat, handed over unchanged", () => {
    const home = [
        { key: 'played', label: 'Played', value: '0 h', bar: false },
        { key: 'size', label: 'Space Required', value: '659 MB', bar: false },
        { key: 'hltb', label: 'HLTB main', value: '5 h', bar: true },
    ];
    it('the page shows the same Space Required, right of Played, with no size passed in', () => {
        expect(pageStatsFromChips(home, 'spotlight').map((s) => [s.key, s.label, s.value])).toEqual([
            ['played', 'Played', '0 h'],
            ['size', 'Space Required', '659 MB'],
            ['hltb', 'Main', '5 h'],
        ]);
    });
    it('no size stat when Home shows none', () => {
        expect(pageStatsFromChips(home.filter((c) => c.key !== 'size'), 'spotlight').map((s) => s.key)).toEqual(['played', 'hltb']);
    });
});

describe("the page's size stat when Home's chip drew it (a Steam game's Space Required)", () => {
    it('Home showed the size chip: the page is told, so its size stat is not hidden while it arrives', () => {
        expect(extrasFlags('', ['played', 'size', 'hltb'])).toEqual({ homeSize: true });
        expect(extrasFlags('', ['played', 'hltb'])).toEqual({});
    });
});

describe('text twins on Home', () => {
    /** Just enough of an element for mountTwins: children, attributes, text and style variables. */
    function fakeEl(tag = 'div') {
        const el = {
            tag,
            attrs: {} as Record<string, string>,
            vars: {} as Record<string, string>,
            className: '',
            textContent: '',
            children: [] as unknown[],
            parent: null as null | { children: unknown[] },
            style: { setProperty(n: string, v: string) { el.vars[n] = v; } },
            setAttribute(n: string, v: string) { el.attrs[n] = v; },
            appendChild(c: { parent: unknown }) { el.children.push(c); c.parent = el; return c; },
            remove() { if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1); },
            ownerDocument: null as unknown,
        };
        return el;
    }
    const spec = (name: string): TwinSpec => ({ name, role: 'label', text: `T-${name}`, x: 10, y: 20, origin: 'midline', from: 'translate(1px, 2px) scale(0.5)', to: 'none', accent: name === 'value-hltb' });
    it('mountTwins creates one element per spec with its text and variables, and removes them', () => {
        const root = fakeEl();
        root.ownerDocument = { createElement: () => fakeEl() };
        const remove = mountTwins(root as unknown as HTMLElement, [spec('label-played'), spec('value-hltb')]);
        expect(root.children).toHaveLength(1);
        const layer = root.children[0] as ReturnType<typeof fakeEl>;
        expect(layer.className).toBe('gh-open-twins');
        const [a, b] = layer.children as Array<ReturnType<typeof fakeEl>>;
        expect(a.className).toBe('gh-twin');
        expect(a.attrs).toMatchObject({ 'data-twin': 'label-played', 'data-role': 'label', 'data-origin': 'midline' });
        expect(a.textContent).toBe('T-label-played');
        expect(a.vars).toEqual({ '--t-x': '10px', '--t-y': '20px', '--t-from': 'translate(1px, 2px) scale(0.5)', '--t-to': 'none' });
        expect(a.attrs['data-accent']).toBeUndefined();
        expect(b.attrs['data-accent']).toBe('');
        remove();
        expect(root.children).toHaveLength(0);
    });
    it("mountTwins puts the twins of one page card in one layer at that card, placed inside it (the page's card is a layer: its text is snapped there)", () => {
        const root = fakeEl();
        root.ownerDocument = { createElement: () => fakeEl() };
        mountTwins(root as unknown as HTMLElement, [{ ...spec('label-played'), card: { x: 4, y: 5 } }, spec('eyebrow'), { ...spec('value-played'), card: { x: 4, y: 5 } }]);
        const layer = root.children[0] as ReturnType<typeof fakeEl>;
        const [card, eyebrow] = layer.children as Array<ReturnType<typeof fakeEl>>;
        expect(layer.children).toHaveLength(2);
        expect(card.className).toBe('gh-twin-card');
        expect(card.vars).toEqual({ '--t-card-x': '4px', '--t-card-y': '5px' });
        const inside = card.children as Array<ReturnType<typeof fakeEl>>;
        expect(inside.map((c) => c.attrs['data-twin'])).toEqual(['label-played', 'value-played']);
        expect(inside[0].vars).toMatchObject({ '--t-x': '6px', '--t-y': '15px' });
        expect(eyebrow.className).toBe('gh-twin');
        expect(eyebrow.vars).toMatchObject({ '--t-x': '10px', '--t-y': '20px' });
    });
    it('mountTwins places a lifted twin by its top, with no share of its height to shift by', () => {
        const root = fakeEl();
        root.ownerDocument = { createElement: () => fakeEl() };
        mountTwins(root as unknown as HTMLElement, [{ ...spec('value-hltb'), y: 682.45, lift: 18.75, card: { x: 4, y: 593.1 } }]);
        const t = ((root.children[0] as ReturnType<typeof fakeEl>).children[0] as ReturnType<typeof fakeEl>).children[0] as ReturnType<typeof fakeEl>;
        expect(t.vars).toMatchObject({ '--t-y': `${Math.round((682.45 - 18.75 - 593.1) * 10000) / 10000}px`, '--t-shift': '0%' });
    });
    it("restTwinsOnExtras rests Spotlight's HowLongToBeat time twin on the extras' own (hidden) time, laid out as the page's, inside its card layer", () => {
        const rect = (left: number, top: number) => ({ getBoundingClientRect: () => ({ left, top, width: 40, height: 37.5 }) });
        const vars: Record<string, string> = {};
        const twin = { ...rect(0, 0), parentElement: rect(985.9375, 593.1146), style: { setProperty: (n: string, v: string) => void (vars[n] = v) } };
        const hidden = rect(1011.703125, 663.671875);
        const asked: string[] = [];
        const root = {
            querySelector: (sel: string) => {
                asked.push(sel);
                return sel === '.gh-twin[data-twin="value-hltb"]' ? twin : sel === '.gh-x-card[data-for="hltb"] .gh-x-stats > div:first-child .gh-x-value' ? hidden : null;
            },
        };
        restTwinsOnExtras(root as unknown as HTMLElement);
        expect(vars).toEqual({ '--t-x': `${1011.703125 - 985.9375}px`, '--t-y': `${663.671875 - 593.1146}px`, '--t-shift': '0%' });
    });
    it('restTwinsOnExtras leaves a twin as it is when the extras have nothing laid out there', () => {
        const vars: Record<string, string> = {};
        const twin = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }), parentElement: null, style: { setProperty: (n: string, v: string) => void (vars[n] = v) } };
        const hidden = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) };
        restTwinsOnExtras({ querySelector: (sel: string) => (sel.startsWith('.gh-twin') ? twin : hidden) } as unknown as HTMLElement);
        expect(vars).toEqual({});
    });
    it('mountTwins gives a pill twin its box as variables', () => {
        const root = fakeEl();
        root.ownerDocument = { createElement: () => fakeEl() };
        mountTwins(root as unknown as HTMLElement, [{ ...spec('play'), role: 'playLabel', origin: 'pill', box: { w: 354.2, h: 62.5, inset: 60.42 } }]);
        const t = (root.children[0] as ReturnType<typeof fakeEl>).children[0] as ReturnType<typeof fakeEl>;
        expect(t.vars).toMatchObject({ '--t-w': '354.2px', '--t-h': '62.5px', '--t-inset': '60.42px' });
    });
    it('mountTwins with no specs adds nothing', () => {
        const root = fakeEl();
        root.ownerDocument = { createElement: () => fakeEl() };
        mountTwins(root as unknown as HTMLElement, [])();
        expect(root.children).toHaveLength(0);
    });
    it('readTwinTexts: the title, eyebrow and Play label as shown; null title for a logo', () => {
        const q = (map: Record<string, string | null>) => ({ querySelector: (sel: string) => (map[sel] == null ? null : { textContent: map[sel] }) }) as unknown as Element;
        expect(readTwinTexts(q({ '.gh-title-slot .gh-title': 'Cronos', '.gh-eyebrow': 'Last played', '.gh-btn[data-action="play"] .gh-btn-label': 'Play' }))).toEqual({ title: 'Cronos', eyebrow: 'Last played', play: 'Play' });
        expect(readTwinTexts(q({ '.gh-eyebrow': 'Last played', '.gh-btn[data-action="play"] .gh-btn-label': 'Play' })).title).toBeNull();
    });
});

describe('settleTwins', () => {
    const rect = (x: number, y: number, w = 50, h = 10) => ({ getBoundingClientRect: () => ({ left: x, top: y, width: w, height: h }) });
    it("glides each twin onto its page text as measured, within the guards; leaves the others", () => {
        const vars: Record<string, Record<string, string>> = {};
        const twin = (name: string, x: number, y: number) => ({
            ...rect(x, y),
            getAttribute: () => name,
            style: { setProperty: (n: string, v: string) => ((vars[name] ??= {})[n] = v) },
        });
        const copy = { querySelectorAll: () => [twin('title', 10, 20), twin('eyebrow', 10, 40), twin('play', 10, 60)] } as unknown as HTMLElement;
        const page = { title: rect(11.5, 19.5), eyebrow: rect(30, 40), play: null } as Record<string, unknown>;
        const doc = { querySelector: (sel: string) => page[sel] ?? null } as unknown as Document;
        settleTwins(copy, doc, { title: 'title', eyebrow: 'eyebrow', play: 'play' });
        expect(vars.title).toEqual({ '--t-dx': '1.5px', '--t-dy': '-0.5px' });
        expect(vars.eyebrow).toBeUndefined();
        expect(vars.play).toBeUndefined();
    });
});

describe('settleTwins measures text, not layout boxes', () => {
    it("a page text in a stretched box (the titleblock's full width, a column's width) still glides: its text extent is measured", () => {
        const vars: Record<string, string> = {};
        // The page's eyebrow box spans the 640-unit column; its text is 90 px wide, 1.5 px off the twin's.
        const pageEl = { getBoundingClientRect: () => ({ left: 25, top: 400, width: 640, height: 14 }), text: { left: 26.5, top: 400, width: 90, height: 14 } };
        const twinEl = {
            getBoundingClientRect: () => ({ left: 25, top: 400, width: 90, height: 14 }),
            text: { left: 25, top: 400, width: 90, height: 14 },
            getAttribute: () => 'eyebrow',
            style: { setProperty: (n: string, v: string) => (vars[n] = v) },
        };
        const doc = {
            querySelector: () => pageEl,
            createRange: () => {
                let on: { text: object } | null = null;
                return { selectNodeContents: (el: { text: object }) => (on = el), getBoundingClientRect: () => on!.text };
            },
        } as unknown as Document;
        const copy = { querySelectorAll: () => [twinEl] } as unknown as HTMLElement;
        settleTwins(copy, doc, { eyebrow: '.gg-eyebrow' });
        expect(vars).toEqual({ '--t-dx': '1.5px', '--t-dy': '0px' });
    });
});

describe('settleTwins: the extras layer too', () => {
    it('glides an element with data-settle onto its page text', () => {
        const vars: Record<string, string> = {};
        const el = {
            getBoundingClientRect: () => ({ left: 1125.6836, top: 662.8906, width: 90.82, height: 39.063 }),
            getAttribute: (n: string) => (n === 'data-settle' ? 'x-value-mainExtras' : null),
            style: { setProperty: (n: string, v: string) => (vars[n] = v) },
        };
        const page = { getBoundingClientRect: () => ({ left: 1125.6958, top: 662.8784, width: 90.82, height: 39.063 }) };
        const copy = { querySelectorAll: (sel: string) => (sel.includes('[data-settle]') ? [el] : []) } as unknown as HTMLElement;
        const doc = { querySelector: (sel: string) => (sel === 'P' ? page : null) } as unknown as Document;
        settleTwins(copy, doc, { 'x-value-mainExtras': 'P' });
        expect(vars).toEqual({ '--t-dx': '0.0122px', '--t-dy': '-0.0122px' });
    });
});

describe('lineMeasure', () => {
    it("measures a 'normal' line in Home's document at the role's weight and size, once per size, and leaves nothing behind", () => {
        const made: Array<{ style: Record<string, string>; removed: boolean }> = [];
        const doc = {
            createElement: () => {
                const el = {
                    style: {} as Record<string, string>,
                    textContent: '',
                    removed: false,
                    getBoundingClientRect: () => ({ height: parseFloat(el.style.fontSize) * (el.style.fontWeight === '700' ? 1.43 : 1.4) }),
                    remove() { el.removed = true; },
                };
                made.push(el);
                return el;
            },
            defaultView: { getComputedStyle: () => ({ fontFamily: '"Motiva Sans"' }) },
        };
        const root = { ownerDocument: doc, appendChild: (c: unknown) => c };
        const lines = lineMeasure(root as unknown as Element);
        expect(lines('label', 8.75)).toBeCloseTo(8.75 * 1.43, 6);
        expect(lines('label', 8.75)).toBeCloseTo(8.75 * 1.43, 6);
        expect(made).toHaveLength(1);
        expect(made[0].style).toMatchObject({ lineHeight: 'normal', fontWeight: '700', fontFamily: '"Motiva Sans"', visibility: 'hidden' });
        expect(made[0].removed).toBe(true);
        expect(lines('caption', 10)).toBeCloseTo(14, 6);
        expect(made[1].style.fontWeight).toBe('400');
    });
    it('nothing measurable: 0, so pageTargets keeps its constants', () => {
        expect(lineMeasure({ ownerDocument: null } as unknown as Element)('label', 9)).toBe(0);
    });
});

describe('hidden chips (#55: Steam\'s scale hid them)', () => {
    const hidden = (key: string) => el(0, 0, 0, 0, { 'data-chip': key }, { '.gh-chip-label': el(0, 0, 0, 0), '.gh-chip-value': el(0, 0, 0, 0) });
    it('are not measured, so no stat twin flies in from the corner', () => {
        const root = home();
        const withHidden = { ...root, querySelectorAll: (s: string) => (s === '.gh-chip' ? [hidden('played'), hidden('hltb')] : root.querySelectorAll(s)) };
        expect(measureHome(withHidden as unknown as Element)!.chips).toEqual([]);
    });
    it('are not read as Home\'s stats, so the page\'s own columns fade in', () => {
        const root = { querySelectorAll: (s: string) => (s === '.gh-chip' ? [hidden('played')] : []) };
        expect(readChipTexts(root as unknown as Element)).toEqual([]);
    });
});
