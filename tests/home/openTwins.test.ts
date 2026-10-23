import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HomeRects } from '../../src/home/openMotion';
import { HOME_CHIP_FONTS } from '../../src/home/openMotion';
import type { Box, PageStat, PageTargets } from '../../src/home/openTargets';
import { cardAround, settleDelta, twinFrom, twinSpecs } from '../../src/home/openTwins';
import { OPEN_TIMINGS } from '../../src/home/motion';
import { HOME_PILL, TITLE_BLOCK } from '../../src/home/homeCss';
import { PAGE_LAYOUT, PAGE_TYPE, pillFocusScale } from '../../src/styles/themeCss';

const raw = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/openLayout/home-1500x844.json'), 'utf8')) as { canvasScale: number; rects: Record<string, Box> };
const r = raw.rects;
const s = raw.canvasScale;
const homeRects = (): HomeRects => ({
    canvas: { x: 0, y: 0, w: 1440 * s, h: 810 * s },
    titleSlot: r.titleSlot,
    titleText: true,
    eyebrow: r.eyebrow,
    play: r.pill,
    circles: [r.circle0, r.circle1, r.circle2, r.circle3],
    infoCircle: 2,
    store: r.store,
    chips: [
        { key: 'played', shell: r['chip:chip0'], label: r['chip:chip0:label'], value: r['chip:chip0:value'], bar: null },
        { key: 'achievements', shell: r['chip:chip1'], label: r['chip:chip1:label'], value: r['chip:chip1:value'], bar: r['chip:chip1:bar'] },
        { key: 'hltb', shell: r['chip:chip2'], label: r['chip:chip2:label'], value: r['chip:chip2:value'], bar: r['chip:chip2:bar'] },
        { key: 'added', shell: r['chip:chip2'], label: r['chip:chip2:label'], value: r['chip:chip2:value'], bar: null },
    ],
});
const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
const page = (): PageTargets => ({
    titleBottomLeft: { x: 25, y: 426 },
    eyebrowBottomLeft: { x: 25, y: 455.6 },
    play: box(25, 493.1, 354.2, 62.5),
    circles: [],
    store: box(1372.1, 507.7, 102.9, 33.3),
    shells: [],
    stats: {
        played: { label: box(50.8, 614.7, 77.5, 17.2), value: box(50.8, 636.1, 77.5, 37.5) },
        achievements: { label: box(169.9, 614.7, 113.8, 17.2), value: box(169.9, 636.1, 113.8, 37.5) },
        hltb: { label: box(819.2, 642.3, 74.9, 17.2), value: box(819.2, 663.7, 74.9, 37.5) },
    },
});
const stats: PageStat[] = [
    { key: 'played', label: 'Played', value: '12 h' },
    { key: 'achievements', label: 'Achievements', value: '4 / 20' },
    { key: 'hltb', label: 'Main', value: '30 h' },
];
const texts = { title: 'Cronos', eyebrow: 'Last played · Today', play: 'Play' };
/** translate(x, y) scale(k) from a twin's from transform. */
const parse = (t: string) => {
    const m = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\((-?[\d.]+)\)$/.exec(t);
    expect(m, t).not.toBeNull();
    return { tx: Number(m![1]), ty: Number(m![2]), k: Number(m![3]) };
};
const byName = (list: ReturnType<typeof twinSpecs>) => Object.fromEntries(list.map((t) => [t.name, t]));

describe('twinFrom', () => {
    const home = box(100, 200, 80, 20);
    const at = { x: 300, y: 500 };
    it("maps the anchor onto Home's box: top-left, bottom-left or the centre line's left end", () => {
        for (const k of [0.5, 1.6]) {
            expect(parse(twinFrom(home, at, k, 'top'))).toEqual({ tx: -200, ty: -300, k });
            expect(parse(twinFrom(home, at, k, 'base'))).toEqual({ tx: -200, ty: -280, k });
            expect(parse(twinFrom(home, at, k, 'midline'))).toEqual({ tx: -200, ty: -290, k });
        }
    });
});

describe('twinSpecs', () => {
    it('twin specs for spotlight: title, eyebrow, play, and each column\'s label and value', () => {
        const t = byName(twinSpecs(homeRects(), page(), texts, stats, 'spotlight', true, s));
        expect(Object.keys(t).sort()).toEqual(['eyebrow', 'label-achievements', 'label-played', 'play', 'title', 'value-achievements', 'value-hltb', 'value-played']);
        expect(t.title).toMatchObject({ role: 'title', text: 'Cronos', origin: 'base', x: 25, y: 426, to: 'none' });
        expect(parse(t.title.from).k).toBeCloseTo(TITLE_BLOCK.titleSize / PAGE_TYPE.title.size, 4);
        expect(t.eyebrow).toMatchObject({ role: 'eyebrow', origin: 'base', x: 25, y: 455.6 });
        expect(t['label-played']).toMatchObject({ role: 'label', text: 'Played', origin: 'midline', x: 50.8, y: Math.round((614.7 + 17.2 / 2) * 10000) / 10000 });
        expect(parse(t['label-played'].from).k).toBeCloseTo(HOME_CHIP_FONTS.label / PAGE_TYPE.label.size, 4);
        expect(t['value-played']).toMatchObject({ role: 'value', text: '12 h', accent: false });
        expect(parse(t['value-played'].from).k).toBeCloseTo(HOME_CHIP_FONTS.value / PAGE_TYPE.value.size, 4);
        const home = homeRects().chips[0].label;
        const f = parse(t['label-played'].from);
        expect(f.tx).toBeCloseTo(home.x - 50.8, 1);
        expect(f.ty).toBeCloseTo(home.y + home.h / 2 - (614.7 + 17.2 / 2), 1);
    });
    it('no title twin for a logo', () => {
        expect(byName(twinSpecs(homeRects(), page(), { ...texts, title: null }, stats, 'spotlight', true, s)).title).toBeUndefined();
    });
    it("play twin: a pill-sized box at the page pill's place, its label at the page's inset; the focus scale about the pill's centre when focused, none when not", () => {
        const p = page().play;
        const d = s;
        const inset = (PAGE_LAYOUT.pill.padX + PAGE_LAYOUT.pill.icon + PAGE_LAYOUT.pill.iconGap) * d;
        const off = byName(twinSpecs(homeRects(), page(), texts, stats, 'spotlight', false, s)).play;
        expect(off).toMatchObject({ role: 'playLabel', text: 'Play', origin: 'pill', x: p.x, y: p.y, to: 'none' });
        expect(off.box).toEqual({ w: p.w, h: p.h, inset: Math.round(inset * 10000) / 10000 });
        // From: the label's anchor in the box (its inset, the centre line) lands on Home's label, at Home's type size.
        const k = HOME_PILL.font / PAGE_TYPE.playLabel.size;
        const home = homeRects().play;
        const hx = home.x + (HOME_PILL.border + HOME_PILL.padX + HOME_PILL.icon + HOME_PILL.gap) * s - p.x;
        const hy = home.y + home.h / 2 - p.y;
        const f = parse(off.from);
        expect(f.k).toBeCloseTo(k, 4);
        expect(f.tx).toBeCloseTo(hx - k * inset, 1);
        expect(f.ty).toBeCloseTo(hy - k * (p.h / 2), 1);
        const on = byName(twinSpecs(homeRects(), page(), texts, stats, 'spotlight', true, s)).play;
        const pf = pillFocusScale(PAGE_LAYOUT.playW, PAGE_LAYOUT.icon);
        const r = (n: number) => Math.round(n * 10000) / 10000;
        expect(on.to).toBe(`translate(${r((p.w / 2) * (1 - pf.x))}px, ${r((p.h / 2) * (1 - pf.y))}px) scale(${pf.x}, ${pf.y})`);
    });
    it('hltb in spotlight: value twin only, accent', () => {
        const t = byName(twinSpecs(homeRects(), page(), texts, stats, 'spotlight', true, s));
        expect(t['label-hltb']).toBeUndefined();
        expect(t['value-hltb']).toMatchObject({ accent: true, text: '30 h' });
    });
    it('no twin for a chip the page has no column for', () => {
        expect(Object.keys(byName(twinSpecs(homeRects(), page(), texts, stats, 'spotlight', true, s))).some((n) => n.endsWith('added'))).toBe(false);
    });
    it('clean values use cleanValue, and clean keeps the hltb label', () => {
        const t = byName(twinSpecs(homeRects(), page(), texts, stats, 'clean', true, s));
        expect(t['value-played'].role).toBe('cleanValue');
        expect(t['label-hltb']).toBeDefined();
        expect(t['value-hltb'].accent).toBe(false);
    });
    it("the Play label's inset is in the canvas scale given (a 16:10 canvas is 1280 wide, not 1440)", () => {
        const narrow = { ...homeRects(), canvas: { x: 0, y: 0, w: 1280 * s, h: 800 * s } };
        const a = byName(twinSpecs(narrow, page(), texts, stats, 'spotlight', false, s)).play;
        const b = byName(twinSpecs(homeRects(), page(), texts, stats, 'spotlight', false, s)).play;
        expect(a.x).toBeCloseTo(b.x, 5);
        expect(a.from).toBe(b.from);
    });
    it("a stat's twins sit in a layer at the page card that holds them (root px); the title, eyebrow and Play in none", () => {
        const p = { ...page(), shells: [box(25, 593.1, 749.7, 185.4), box(793.4, 593.1, 681.6, 185.4)] };
        const t = byName(twinSpecs({ ...homeRects(), root: box(10, 20, 1500, 844) }, p, texts, stats, 'spotlight', true, s));
        const r = (n: number) => Math.round(n * 10000) / 10000;
        expect(t['value-hltb'].card).toEqual({ x: r(793.4 - 10), y: r(593.1 - 20) });
        expect(t['label-played'].card).toEqual({ x: 15, y: r(593.1 - 20) });
        expect(t['value-achievements'].card).toEqual({ x: 15, y: r(593.1 - 20) });
        for (const n of ['title', 'eyebrow', 'play']) expect(t[n].card, n).toBeUndefined();
    });
    it("a stat's card is the card as laid out when the targets have it, not the glass panel snapped to device px", () => {
        const p = { ...page(), shells: [box(25, 592.9688, 749.7, 185.4), box(793.4, 592.9688, 681.6, 185.4)], cards: [box(25, 593.103, 749.7, 185.4), box(793.4, 593.103, 681.6, 185.4)] };
        expect(byName(twinSpecs(homeRects(), p, texts, stats, 'spotlight', true, s))['value-hltb'].card).toEqual({ x: 793.4, y: 593.103 });
    });
    it("a centre-line twin's box is placed by its top: lift is half the page's line box (a translate is applied after the text is snapped)", () => {
        const t = byName(twinSpecs(homeRects(), page(), texts, stats, 'spotlight', true, s));
        expect(t['value-hltb'].lift).toBe(37.5 / 2);
        expect(t['label-played'].lift).toBe(17.2 / 2);
        expect(t.title.lift).toBeUndefined();
    });
    it('places to 4 decimals', () => {
        const p = { ...page(), stats: { ...page().stats, played: { label: box(50.8, 614.71234, 77.5, 17.2), value: box(50.8, 636.1, 77.5, 37.5) } } };
        expect(byName(twinSpecs(homeRects(), p, texts, stats, 'spotlight', true, s))['label-played'].y).toBe(Math.round((614.71234 + 8.6) * 10000) / 10000);
    });
    it("in the root's px: Home's root offset is taken off", () => {
        const home = { ...homeRects(), root: box(10, 20, 1500, 844) };
        const t = byName(twinSpecs(home, page(), texts, stats, 'spotlight', true, s));
        expect(t.title.x).toBe(15);
        expect(t.title.y).toBe(406);
    });
    it('the timings: the crossfade is the first 40% of the morph, the glide 150 ms', () => {
        expect(OPEN_TIMINGS.twinFade).toBe(180);
        expect(OPEN_TIMINGS.twinFade / OPEN_TIMINGS.morph).toBeCloseTo(0.4, 5);
        expect(OPEN_TIMINGS.settleGlide).toBe(150);
    });
});

describe('cardAround', () => {
    const cards = [box(25, 593.1, 749.7, 185.4), box(793.4, 593.1, 681.6, 185.4)];
    it('the page card a point is in, edges included', () => {
        expect(cardAround(cards, { x: 819.2, y: 682.45 })).toEqual(cards[1]);
        expect(cardAround(cards, { x: 25, y: 593.1 })).toEqual(cards[0]);
    });
    it('none outside every card', () => {
        expect(cardAround(cards, { x: 25, y: 426 })).toBeNull();
        expect(cardAround([], { x: 50, y: 600 })).toBeNull();
    });
});

describe('settleDelta', () => {
    const at = box(100, 200, 80, 20);
    it('no counterpart: none', () => {
        expect(settleDelta(at, null)).toBeNull();
    });
    it('a size more than 2% off: none (not the same text)', () => {
        expect(settleDelta(at, box(101, 200, 80 * 1.03, 20))).toBeNull();
        expect(settleDelta(at, box(101, 200, 80, 20 * 0.97))).toBeNull();
    });
    it('more than 6 px off on either axis: none (the wrong element)', () => {
        expect(settleDelta(at, box(107, 200, 80, 20))).toBeNull();
        expect(settleDelta(at, box(100, 193.5, 80, 20))).toBeNull();
    });
    it('any difference from 0.005 px glides (0.01 px drew a number a whole device px off on the Ally); under it, none', () => {
        expect(settleDelta(at, box(100, 200.01, 80, 20))).toEqual({ dx: 0, dy: 0.01 });
        expect(settleDelta(at, box(100.002, 200.003, 80, 20))).toBeNull();
    });
    it('keeps 4 decimals (2 put the bridge 0.01 px off the page, a whole device px near a half pixel)', () => {
        expect(settleDelta(at, box(100.1234, 200.5678, 80, 20))).toEqual({ dx: 0.1234, dy: 0.5678 });
    });
    it('an ordinary difference: the glide', () => {
        expect(settleDelta(at, box(101.5, 199.25, 80.5, 20))).toEqual({ dx: 1.5, dy: -0.75 });
        expect(settleDelta(at, box(100.1, 200.2, 80, 20))).toEqual({ dx: 0.1, dy: 0.2 });
    });
});
