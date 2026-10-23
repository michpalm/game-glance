import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HomeRects, MotionVar, openMotion } from '../../src/home/openMotion';
import type { Box, PageTargets } from '../../src/home/openTargets';
import { MORPH_EASE, OPEN_TIMINGS, RETURN_TIMINGS } from '../../src/home/motion';
import { PAGE_LAYOUT, pillFocusScale } from '../../src/styles/themeCss';
import { HOME_PILL } from '../../src/home/homeCss';

const raw = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/openLayout/home-1500x844.json'), 'utf8')) as { canvasScale: number; rects: Record<string, Box> };
const r = raw.rects;
const s = raw.canvasScale;
// Captured before data-chip existed: the chips by order (device notes).
const homeRects = (): HomeRects => ({
    canvas: { x: 0, y: 0, w: 1440 * s, h: 810 * s },
    titleSlot: r.titleSlot,
    eyebrow: r.eyebrow,
    play: r.pill,
    circles: [r.circle0, r.circle1, r.circle2, r.circle3],
    infoCircle: 2,
    store: r.store,
    chips: [
        { key: 'played', shell: r['chip:chip0'], label: r['chip:chip0:label'], value: r['chip:chip0:value'], bar: null },
        { key: 'achievements', shell: r['chip:chip1'], label: r['chip:chip1:label'], value: r['chip:chip1:value'], bar: r['chip:chip1:bar'] },
        { key: 'hltb', shell: r['chip:chip2'], label: r['chip:chip2:label'], value: r['chip:chip2:value'], bar: r['chip:chip2:bar'] },
    ],
});
const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
const spotlight = (): PageTargets => ({
    titleBottomLeft: { x: 25, y: 426 },
    eyebrowBottomLeft: { x: 25, y: 455.6 },
    play: box(25, 493.1, 354.2, 62.5),
    circles: [box(393.7, 493.1, 62.5, 62.5), box(470.8, 493.1, 62.5, 62.5), box(547.9, 493.1, 62.5, 62.5), box(625, 493.1, 62.5, 62.5)],
    store: box(1372.1, 507.7, 102.9, 33.3),
    shells: [box(25, 593.1, 749.7, 185.4), box(793.4, 593.1, 681.6, 185.4)],
    stats: {
        played: { label: box(50.8, 614.7, 77.5, 17.2), value: box(50.8, 636.1, 77.5, 37.5) },
        achievements: { label: box(169.9, 614.7, 113.8, 17.2), value: box(169.9, 636.1, 113.8, 37.5) },
        hltb: { label: box(819.2, 642.3, 74.9, 17.2), value: box(819.2, 663.7, 74.9, 37.5) },
    },
});

const vars = (list: MotionVar[]) => Object.fromEntries(list.map((v) => [v.name, v.value]));
/** translate(x, y) [scale(a[, b])] from a transform value. */
function parse(t: string | undefined) {
    expect(t, 'transform var').toBeDefined();
    const m = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\)(?: scale\((-?[\d.]+)(?:, (-?[\d.]+))?\))?$/.exec(t!);
    expect(m, `parseable: ${t}`).not.toBeNull();
    const sx = m![3] === undefined ? 1 : Number(m![3]);
    return { tx: Number(m![1]), ty: Number(m![2]), sx, sy: m![4] === undefined ? sx : Number(m![4]) };
}

describe('openMotion', () => {
    it('the title block moves by its bottom-left corner, in canvas px', () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        const t = parse(v['--gho-title']);
        const home = homeRects().titleSlot;
        expect(t.tx).toBeCloseTo((25 - home.x) / s, 1);
        expect(t.ty).toBeCloseTo((426 - (home.y + home.h)) / s, 1);
        const e = parse(v['--gho-eyebrow']);
        expect(e.ty).toBeCloseTo((455.6 - (r.eyebrow.y + r.eyebrow.h)) / s, 1);
    });

    it("a text title grows from Home's size to the page's, keeping its bottom-left corner on the target", () => {
        const text = { ...homeRects(), titleText: true };
        const t = parse(vars(openMotion(text, spotlight(), 'spotlight', s))['--gho-title']);
        const k = 64 / 58;
        expect(t.sx).toBeCloseTo(k, 3);
        const slot = text.titleSlot;
        // origin top-left: the scaled bottom is y + h * k
        expect(t.ty).toBeCloseTo((426 - slot.y - slot.h * k) / s, 1);
        const logo = parse(vars(openMotion(homeRects(), spotlight(), 'spotlight', s))['--gho-title']);
        expect(logo.sx).toBe(1);
    });

    it('a taller title (a logo, three lines) still lands with the same bottom', () => {
        const tall = homeRects();
        tall.titleSlot = { ...tall.titleSlot, y: tall.titleSlot.y - 80, h: tall.titleSlot.h + 80 };
        const a = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        const b = vars(openMotion(tall, spotlight(), 'spotlight', s));
        expect(b['--gho-title']).toBe(a['--gho-title']);
    });

    it("the extras layer: the description's box and the HowLongToBeat card's inside, in the root's own px, and the page's d", () => {
        const page: PageTargets = {
            ...spotlight(),
            extras: { desc: box(50.8, 686.1, 698.1, 70.3), hltbTitle: box(819.2, 614.7, 630, 17.2), columns: {}, caption: box(819.2, 728.2, 630, 22.7) },
        };
        const v = vars(openMotion({ ...homeRects(), root: box(10, 20, 1500, 844) }, page, 'spotlight', s));
        expect(v['--gho-x-d']).toBe(String(s));
        expect([v['--gho-x-desc-x'], v['--gho-x-desc-y'], v['--gho-x-desc-w']]).toEqual(['40.8px', '666.1px', '698.1px']);
        expect([v['--gho-x-hltb-x'], v['--gho-x-hltb-y'], v['--gho-x-hltb-w']]).toEqual(['809.2px', '594.7px', '630px']);
    });

    it("the page's d unit unrounded, so the extras' and twins' text is the page's size exactly (docked Ally: 30 x d is 31.25, not 31.251)", () => {
        const docked = 1500 / 1440;
        const v = vars(openMotion({ ...homeRects(), root: box(0, 0, 1500, 844) }, spotlight(), 'spotlight', docked));
        expect(v['--gho-x-d']).toBe(String(docked));
        expect(Math.abs(Number(v['--gho-x-d']) * 30 - 31.25)).toBeLessThan(1e-9);
        expect(v['--gho-x-played-font']).toBe(`${30 * docked}px`);
    });

    it("the extras' HowLongToBeat inside and Play time column each in a layer at the page card that holds them (root px)", () => {
        const page: PageTargets = {
            ...spotlight(),
            extras: { desc: box(50.8, 686.1, 698.1, 70.3), hltbTitle: box(819.2, 614.7, 630, 17.2), columns: {}, caption: box(819.2, 728.2, 630, 22.7) },
        };
        const v = vars(openMotion({ ...homeRects(), root: box(10, 20, 1500, 844) }, page, 'spotlight', s));
        expect([v['--gho-x-hltb-cx'], v['--gho-x-hltb-cy']]).toEqual(['783.4px', '573.1px']);
        expect([v['--gho-x-played-cx'], v['--gho-x-played-cy']]).toEqual(['15px', '573.1px']);
        // The description is not in a card.
        expect(v['--gho-x-desc-cx']).toBeUndefined();
    });

    it("the extras' sizes and card layers use the page's own d unit and cards as laid out, when the targets have them", () => {
        const page: PageTargets = {
            ...spotlight(),
            cards: [box(25, 593.103, 749.7, 185.4), box(793.4, 593.103, 681.6, 185.4)],
            d: 1500 / 1440,
            extras: { desc: box(50.8, 686.1, 698.1, 70.3), hltbTitle: box(819.2, 614.7, 630, 17.2), columns: {}, caption: box(819.2, 728.2, 630, 22.7) },
        };
        // Home's canvas scale as measured on the Ally: a float, not exactly the page's 1500 / 1440.
        const v = vars(openMotion(homeRects(), page, 'spotlight', 1.0416595458984375));
        expect(v['--gho-x-d']).toBe(String(1500 / 1440));
        expect(v['--gho-x-hltb-cy']).toBe('593.103px');
        expect(v['--gho-x-played-font']).toBe(`${30 * (1500 / 1440)}px`);
    });

    it("the Play time column's place and value size in the extras layer (a new game's), per look", () => {
        const v = vars(openMotion({ ...homeRects(), root: box(10, 20, 1500, 844) }, spotlight(), 'spotlight', s));
        expect([v['--gho-x-played-x'], v['--gho-x-played-y']]).toEqual([`${Math.round((50.8 - 10) * 10000) / 10000}px`, `${Math.round((614.7 - 20) * 10000) / 10000}px`]);
        expect(v['--gho-x-played-font']).toBe(`${30 * s}px`);
        const clean = vars(openMotion(homeRects(), { ...spotlight(), shells: [box(900, 480, 500, 90)] }, 'clean', s));
        expect(clean['--gho-x-played-font']).toBe(`${22 * s}px`);
    });

    it("the store pill's place in the extras layer, for both looks: its right edge and top on the page, in the root's px", () => {
        const v = vars(openMotion({ ...homeRects(), root: box(10, 20, 1500, 844) }, spotlight(), 'spotlight', s));
        expect([v['--gho-x-pill-x'], v['--gho-x-pill-y']]).toEqual([`${Math.round((1372.1 + 102.9 - 10) * 10000) / 10000}px`, `${Math.round((507.7 - 20) * 10000) / 10000}px`]);
        expect(v['--gho-x-d']).toBe(String(s));
    });

    it('without extras on the page targets (or no root measured): the extras sit in window px, or there are none', () => {
        expect(Object.keys(vars(openMotion(homeRects(), spotlight(), 'spotlight', s))).filter((n) => /^--gho-x-(desc|hltb)/.test(n))).toEqual([]);
        const page: PageTargets = { ...spotlight(), extras: { desc: box(50, 600, 700, 70), hltbTitle: box(800, 600, 600, 17), columns: {}, caption: box(800, 700, 600, 22) } };
        expect(vars(openMotion(homeRects(), page, 'spotlight', s))['--gho-x-desc-x']).toBe('50px');
    });

    it("no border variable: the panels keep Home's ring (homeCss), whatever the page's", () => {
        expect(vars(openMotion(homeRects(), { ...spotlight(), border: 2 / 2.32 }, 'spotlight', s))['--gho-x-border']).toBeUndefined();
    });

    it('one shell per card, placed at the card and scaled down onto the chips that merge into it', () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        // The info card's shell sits at the card (canvas px) ...
        expect(Number(v['--gho-shell-0-x'])).toBeCloseTo(25 / s, 1);
        expect(Number(v['--gho-shell-0-w'])).toBeCloseTo(749.7 / s, 1);
        // ... and starts on the union of the played and achievements chips.
        const from = parse(v['--gho-shell-0-from']);
        const union = { x: r['chip:chip0'].x, y: r['chip:chip0'].y, w: r['chip:chip1'].x + r['chip:chip1'].w - r['chip:chip0'].x, h: r['chip:chip0'].h };
        expect(from.tx).toBeCloseTo((union.x - 25) / s, 1);
        expect(from.ty).toBeCloseTo((union.y - 593.1) / s, 1);
        expect(from.sx).toBeCloseTo(union.w / 749.7, 3);
        expect(from.sy).toBeCloseTo(union.h / 185.4, 3);
        // The HowLongToBeat card's shell starts on the HLTB chip alone.
        expect(parse(v['--gho-shell-1-from']).sx).toBeCloseTo(r['chip:chip2'].w / 681.6, 3);
        expect(v['--gho-shell-0-o0']).toBe('1');
        expect(v['--gho-shell-count']).toBe('2');
    });

    it('chip texts move to their page stat and grow to the page type size', () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        const value = parse(v['--gho-chip-2-value']);
        expect(value.sx).toBeCloseTo(30 / 20, 3);
        expect(value.tx).toBeCloseTo((819.2 - r['chip:chip2:value'].x) / s, 1);
        expect(value.ty).toBeCloseTo((663.7 - r['chip:chip2:value'].y) / s, 1);
        // Labels: Home's line is 1.2, the page's 1.5, so the glyphs line up 0.15 em lower in the page's box.
        const label = parse(v['--gho-chip-0-label']);
        expect(label.sx).toBeCloseTo(11 / 10, 3);
        expect(label.ty).toBeCloseTo((614.7 + 0.15 * 11 * (1500 / 1440) - r['chip:chip0:label'].y) / s, 1);
        expect(v['--gho-chip-0-o']).toBe('1');
    });

    it('Clean values grow to the Clean type size', () => {
        const page = spotlight();
        page.shells = [box(1073.9, 693.3, 401.1, 90)];
        const v = vars(openMotion(homeRects(), page, 'clean', s));
        expect(parse(v['--gho-chip-0-value']).sx).toBeCloseTo(22 / 20, 3);
        expect(v['--gho-shell-count']).toBe('1');
    });

    it("Clean: Home's chip bars move onto the panel's bars (a chip without a bar, or a page stat without one, has none)", () => {
        const page = spotlight();
        page.shells = [box(1073.9, 693.3, 401.1, 90)];
        const target = box(1250, 760, 100, 4.2);
        page.stats.hltb = { ...page.stats.hltb!, bar: target };
        const v = vars(openMotion(homeRects(), page, 'clean', s));
        const bar = parse(v['--gho-chip-2-bar']);
        const from = r['chip:chip2:bar'];
        expect(bar.tx).toBeCloseTo((target.x - from.x) / s, 1);
        expect(bar.ty).toBeCloseTo((target.y - from.y) / s, 1);
        expect(bar.sx).toBeCloseTo(target.w / from.w, 3);
        expect(bar.sy).toBeCloseTo(target.h / from.h, 3);
        expect(v['--gho-chip-2-bar-o']).toBe('1');
        // Achievements has a bar on Home but no target here; Played has no bar at all.
        expect(v['--gho-chip-1-bar']).toBeUndefined();
        expect(v['--gho-chip-0-bar']).toBeUndefined();
    });

    it('a chip without a page stat fades and does not move', () => {
        const home = homeRects();
        home.chips[0] = { ...home.chips[0], key: 'added' };
        const v = vars(openMotion(home, spotlight(), 'spotlight', s));
        expect(v['--gho-chip-0-o']).toBe('0');
        expect(v['--gho-chip-0-label']).toBeUndefined();
        expect(v['--gho-chip-0-value']).toBeUndefined();
    });

    it('a shell no chip merges into fades in at its card', () => {
        const home = homeRects();
        home.chips = home.chips.slice(0, 2); // no HLTB chip
        const v = vars(openMotion(home, spotlight(), 'spotlight', s));
        expect(v['--gho-shell-1-o0']).toBe('0');
        expect(parse(v['--gho-shell-1-from']).sx).toBeCloseTo(1, 3);
    });

    it('the info circle is skipped: the others map to the page circles in order', () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        const cloud = parse(v['--gho-circle-3']);
        expect(cloud.tx).toBeCloseTo((547.9 - r.circle3.x) / s, 1);
        expect(cloud.sx).toBeCloseTo(62.5 / r.circle3.w, 3);
        expect(parse(v['--gho-circle-1']).tx).toBeCloseTo((470.8 - r.circle1.x) / s, 1);
        expect(v['--gho-circle-2']).toBeUndefined();
    });

    it("a Unifideck cloud's ring: in canvas px, as wide as Unifideck's 2 CSS px once the circle has grown onto the page's", () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        // Home's cloud (circle 3) grows from its own box onto the page's third circle (62.5 wide).
        expect(parseFloat(v['--gho-uni-ring'])).toBeCloseTo((2 * (r.circle3.w / s)) / 62.5, 3);
        expect(v['--gho-uni-ring']).toMatch(/px$/);
    });
    it("the page's fourth circle (Unifideck's trash) in canvas px, for the circle Home draws there as it opens", () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        expect(Number(v['--gho-circle-extra-x'])).toBeCloseTo(625 / s, 3);
        expect(Number(v['--gho-circle-extra-y'])).toBeCloseTo(493.1 / s, 3);
        expect(Number(v['--gho-circle-extra-w'])).toBeCloseTo(62.5 / s, 3);
    });

    // The page focuses Play on arrival, and a focused Play is scaled about its centre (as Home's): the morph lands on it.
    const f = PAGE_LAYOUT.focusScale;
    // The focused pill grows by what a circle grows (themeCss.pillFocusScale): 4% in height, the same px in width.
    const pf = pillFocusScale(PAGE_LAYOUT.playW, PAGE_LAYOUT.icon);
    const pageW = 354.2 * pf.x;
    const pageH = 62.5 * pf.y;
    it('the Play pill moves by its left edge and centre; its background layer, inside it, grows onto the page pill as focused', () => {
        expect(f).toBe(1.04);
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        const bg = parse(v['--gho-play-bg']);
        expect(bg.sx).toBeCloseTo(pageW / r.pill.w, 3);
        expect(bg.sy).toBeCloseTo(pageH / r.pill.h, 3);
        // Relative to the moved pill: no horizontal shift, and up by half the height it gains (it grows about its centre line).
        expect(bg.tx).toBe(0);
        expect(bg.ty).toBeCloseTo((r.pill.h - pageH) / 2 / s, 1);
        const fg = parse(v['--gho-play-fg']);
        expect(fg.sx).toBe(1);
        // The focused pill grows about its centre: its left edge sits half the growth left of the page pill's.
        expect(fg.tx).toBeCloseTo((25 - (pageW - 354.2) / 2 - r.pill.x) / s, 1);
        expect(fg.ty).toBeCloseTo((493.1 + 62.5 / 2 - (r.pill.y + r.pill.h / 2)) / s, 1);
        expect(parse(v['--gho-store']).ty).toBeCloseTo((507.7 - r.store.y) / s, 1);
    });

    it("the pill's glyph and label grow to the page's focused ones (20 and 22, scaled with the pill) and land where the page draws them", () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        const icon = parse(v['--gho-play-icon']);
        // The page's glyph starts 24 in (Home's 22) and is 20 (Home's 18); its label starts after a 14 gap (Home's 13).
        // (Home's glyph and label sit inside the pill's 1 px border; the page's pill has none.)
        expect(icon.tx).toBeCloseTo(24 * pf.x - (22 + 1), 2); // px values are written to 2 decimals
        expect(icon.sx).toBeCloseTo((20 * pf.x) / 18, 3);
        expect(icon.sy).toBeCloseTo((20 * pf.y) / 18, 3);
        const label = parse(v['--gho-play-label']);
        expect(label.tx).toBeCloseTo((24 + 20 + 14) * pf.x - (1 + 22 + 18 + 13), 2);
        expect(label.sx).toBeCloseTo((22 * pf.x) / 19, 3);
        expect(label.sy).toBeCloseTo((22 * pf.y) / 19, 3);
    });

    it("a game that can be streamed: Home's arrow segment, at the pill's right end, lands on the page's (its right end, the page's focused size)", () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        const a = parse(v['--gho-play-arrow']);
        // Origin: the segment's right edge and centre line, inside the pill (which moves by its left edge).
        expect(a.tx).toBeCloseTo((pageW - r.pill.w) / s, 1);
        expect(a.ty).toBe(0);
        expect(a.sx).toBeCloseTo((PAGE_LAYOUT.playArrow.w * pf.x) / HOME_PILL.arrow, 3);
        expect(a.sy).toBeCloseTo(pageH / r.pill.h, 3);
    });

    it("opened with a mouse, it lands on the page's pill unfocused (mouse mode hides the focus look and its growth)", () => {
        const page = spotlight();
        const v = vars(openMotion(homeRects(), page, 'spotlight', s, false));
        expect(Number(v['--gho-play-sx'])).toBeCloseTo(page.play.w / r.pill.w, 3);
        expect(Number(v['--gho-play-sy'])).toBeCloseTo(page.play.h / r.pill.h, 3);
        const fg = parse(v['--gho-play-fg']);
        expect(fg.tx).toBeCloseTo((page.play.x - r.pill.x) / s, 1);
        const a = parse(v['--gho-play-arrow']);
        expect(a.sx).toBeCloseTo(PAGE_LAYOUT.playArrow.w / HOME_PILL.arrow, 3);
    });
    it("the page's focused pill's exact box (round ends, unlike the stretched layer), relative to Home's pill", () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        expect(Number(v['--gho-play-sx'])).toBeCloseTo(pageW / r.pill.w, 3);
        expect(Number(v['--gho-play-sy'])).toBeCloseTo(pageH / r.pill.h, 3);
        expect(parseFloat(v['--gho-play-dy'])).toBeCloseTo((r.pill.h - pageH) / 2 / s, 1);
        expect(v['--gho-play-dy']).toMatch(/px$/);
    });

    it("each circle's icon shrinks as the circle grows, so it is the page's size throughout (it grew 11% and snapped back)", () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        for (const i of [0, 1, 3]) {
            const grow = parse(v[`--gho-circle-${i}`]).sx;
            expect(v[`--gho-circle-icon-${i}`]).toMatch(/^scale\([\d.]+\)$/);
            expect(Number(/scale\(([\d.]+)\)/.exec(v[`--gho-circle-icon-${i}`])![1]) * grow).toBeCloseTo(1, 3);
        }
        expect(v['--gho-circle-icon-2']).toBeUndefined(); // the info button fades where it is
    });

    it("Spotlight: the HLTB chip's label fades (the card's 'Main' arrives) and its value takes the accent, as the card's Main", () => {
        const v = vars(openMotion(homeRects(), spotlight(), 'spotlight', s));
        expect(v['--gho-chip-2-label-o']).toBe('0');
        expect(v['--gho-chip-2-accent']).toBe('1');
        expect(v['--gho-chip-0-label-o']).toBeUndefined();
        expect(v['--gho-chip-0-accent']).toBeUndefined();
        const clean = spotlight();
        clean.shells = [box(1073.9, 693.3, 401.1, 90)];
        const c = vars(openMotion(homeRects(), clean, 'clean', s));
        expect(c['--gho-chip-2-label-o']).toBeUndefined();
        expect(c['--gho-chip-2-accent']).toBeUndefined();
    });

    it('the output is stable: sorted by name', () => {
        const list = openMotion(homeRects(), spotlight(), 'spotlight', s);
        expect(list.map((x) => x.name)).toEqual([...list.map((x) => x.name)].sort());
    });
});

describe('the Unifideck size column', () => {
    it("Home's drawn column goes where the page puts it, at the look's value size", () => {
        const page = { ...spotlight(), stats: { ...spotlight().stats, size: { label: box(200, 614.7, 120, 17.2), value: box(200, 636.1, 120, 37.5) } } };
        const v = vars(openMotion(homeRects(), page, 'spotlight', s));
        expect(v['--gho-x-size-x']).toBeDefined();
        expect(parseFloat(v['--gho-x-size-y']) - parseFloat(v['--gho-x-played-y'])).toBeCloseTo(0, 1);
        expect(v['--gho-x-size-font']).toBe(v['--gho-x-played-font']);
        expect(vars(openMotion(homeRects(), spotlight(), 'spotlight', s))['--gho-x-size-x']).toBeUndefined();
    });
});

describe('open timings', () => {
    it('match the spec', () => {
        expect(OPEN_TIMINGS).toEqual({ leave: 220, infoFade: 180, morph: 450, twinFade: 180, settleGlide: 150, settle: 180, extras: 250, feedHero: 300, feedUi: 220, bridgeFade: 300, bridgeIn: 150, readyCap: 500, revealDelay: 0, reveal: 200, leaveDrop: 70, feedRise: 14 });
        expect(MORPH_EASE).toBe('cubic-bezier(.3,.55,.15,1)');
    });
});

describe('return timings (B from a page: Home is just there)', () => {
    it('a short fade of Home\'s UI; Steam\'s fades stay off until its page-leave animation (0.2 s delay + 0.6 s) has ended', () => {
        expect(RETURN_TIMINGS.fade).toBe(200);
        expect(RETURN_TIMINGS.hold).toBeGreaterThanOrEqual(1200);
        expect(RETURN_TIMINGS.hold).toBeLessThanOrEqual(2000);
    });
});
