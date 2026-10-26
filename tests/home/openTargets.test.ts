import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Box, cardBorder, ExtraColumn, Measure, pageTargets, PageLook, PageStat, StatKey } from '../../src/home/openTargets';
import { PAGE_LAYOUT, pageDUnit, ringBoost } from '../../src/styles/themeCss';
import { baseCanvas, defaultGrowth } from '../../src/home/scale';

interface Fixture {
    screen: { width: number; height: number };
    rects: Record<string, Box>;
    texts: Record<string, string>;
}
const fixture = (name: string): Fixture => JSON.parse(readFileSync(resolve(__dirname, 'fixtures/openLayout', `${name}.json`), 'utf8'));

// The Clean fixtures were captured before the page had data-stat: columns by order (device notes).
const CLEAN_COLUMNS: Array<[string, StatKey]> = [['col0', 'played'], ['col1', 'achievements'], ['col2', 'hltb']];
/** A fixture's stat columns: by data-stat when it was captured with it (scripts/cef-layout.mjs), else by order. */
const STAT_KEYS: StatKey[] = ['played', 'size', 'achievements', 'hltb'];
const columnsOf = (f: Fixture): Array<[string, StatKey]> =>
    f.rects['stat:played:label'] ? STAT_KEYS.filter((key) => f.rects[`stat:${key}:label`]).map((key) => [key, key]) : CLEAN_COLUMNS;

function pageStats(look: PageLook, f: Fixture): PageStat[] {
    return columnsOf(f).map(([col, key]) => ({
        key,
        label: f.texts[`stat:${col}:label`],
        value: f.texts[`stat:${col}:value`],
        bar: f.rects[`stat:${col}:bar`] !== undefined,
    }));
}

/** The HowLongToBeat card's other two columns (Spotlight), as the page drew them. */
const EXTRA_KEYS = ['mainExtras', 'completionist'] as const;
const extraColumns = (f: Fixture): ExtraColumn[] =>
    EXTRA_KEYS.map((key) => ({ key, label: f.texts[`stat:${key}:label`], value: f.texts[`stat:${key}:value`] }));

/** Text widths as the page drew them: a column's box is as wide as its widest text (or bar), so each text measures to its own natural width at most that. */
function measureFrom(look: PageLook, f: Fixture): Measure {
    return (text) => {
        for (const key of look === 'spotlight' ? EXTRA_KEYS : []) {
            if (f.texts[`stat:${key}:label`] === text || f.texts[`stat:${key}:value`] === text) return f.rects[`stat:${key}:label`].w;
        }
        for (const [col] of columnsOf(f)) {
            const label = f.rects[`stat:${col}:label`];
            const bar = f.rects[`stat:${col}:bar`];
            if (f.texts[`stat:${col}:label`] === text || f.texts[`stat:${col}:value`] === text) return bar && Math.abs(bar.w - label.w) < 0.5 ? 0 : label.w;
        }
        throw new Error(`unexpected text ${text}`);
    };
}

const near = (actual: number, expected: number, what: string) => {
    expect(Math.abs(actual - expected), `${what}: ${actual} vs ${expected}`).toBeLessThanOrEqual(2);
};
const nearBox = (actual: Box | undefined, expected: Box, what: string) => {
    expect(actual, what).toBeDefined();
    near(actual!.x, expected.x, `${what}.x`);
    near(actual!.y, expected.y, `${what}.y`);
    near(actual!.w, expected.w, `${what}.w`);
    near(actual!.h, expected.h, `${what}.h`);
};

for (const look of ['spotlight', 'clean'] as const) {
    for (const size of ['1500x844', '828x466']) {
        it(`matches the measured ${look} page at ${size} within 2 px`, () => {
            const f = fixture(`${look}-${size}`);
            const r = f.rects;
            // The fixtures' games had a bar (captions "7.3 h left in main story", "7.2 h left in main story").
            const extras = { columns: extraColumns(f), bar: true };
            const t = pageTargets(look, { ...f.screen, grow: 1 }, pageStats(look, f), measureFrom(look, f), { w: r.store.w, h: r.store.h }, extras);
            nearBox(t.play, r.play, 'play');
            // The circles the page drew (three for an installed game, two before it is installed).
            const circles = Object.keys(r).filter((k) => /^circle\d$/.test(k));
            expect(circles.length).toBeGreaterThanOrEqual(2);
            for (let i = 0; i < circles.length; i++) nearBox(t.circles[i], r[`circle${i}`], `circle${i}`);
            near(t.store.x, r.store.x, 'store.x');
            near(t.store.y, r.store.y, 'store.y');
            // The title block grows upward: its eyebrow sits at the bottom, the title above it.
            near(t.eyebrowBottomLeft.x, r.eyebrow.x, 'eyebrow x');
            near(t.eyebrowBottomLeft.y, r.eyebrow.y + r.eyebrow.h, 'eyebrow bottom');
            near(t.titleBottomLeft.y, r.title.y + r.title.h, 'title bottom');
            if (look === 'spotlight') {
                nearBox(t.shells[0], r.card0, 'info card');
                nearBox(t.shells[1], r.card1, 'HLTB card');
                // What Home draws as it turns into the page: the description (three lines) and the HowLongToBeat card's rest.
                nearBox(t.extras?.desc, r.desc, 'description');
                nearBox(t.extras?.hltbTitle, r.hltbTitle, 'HowLongToBeat title');
                for (const key of EXTRA_KEYS) {
                    nearBox(t.extras?.columns[key]?.label, r[`stat:${key}:label`], `${key} label`);
                    nearBox(t.extras?.columns[key]?.value, r[`stat:${key}:value`], `${key} value`);
                }
                nearBox(t.extras?.caption, r.caption, 'caption');
            } else {
                expect(t.shells).toHaveLength(1);
                nearBox(t.shells[0], r.clean, 'Clean panel');
                expect(t.extras, 'the Clean look shows no description or HowLongToBeat card').toBeUndefined();
            }
            for (const [col, key] of columnsOf(f)) {
                nearBox(t.stats[key]?.label, r[`stat:${col}:label`], `${key} label`);
                nearBox(t.stats[key]?.value, r[`stat:${col}:value`], `${key} value`);
                // Clean's progress bars are targets too (Home's chip bars move into them); the Spotlight cards' are not.
                const bar = r[`stat:${col}:bar`];
                if (look === 'clean' && bar) nearBox(t.stats[key]?.bar, bar, `${key} bar`);
                else expect(t.stats[key]?.bar, `${key} bar`).toBeUndefined();
            }
        });
    }
}

describe('pageTargets stats', () => {
    const screen = { width: 1500, height: 844, grow: 1 }; // the layout's formulas, without Home's default growth
    const measure: Measure = (text) => text.length * 10;
    const store = { w: 100, h: 34 };
    const played: PageStat = { key: 'played', label: 'Play Time', value: '1 h' };
    const main: PageStat = { key: 'hltb', label: 'Main', value: '9 h' };
    const columns: ExtraColumn[] = [{ key: 'mainExtras', label: '+ Extras', value: '12 h' }, { key: 'completionist', label: '100%', value: '24 h' }];
    it("a label's line is the measured 'normal' one when Home measures it (21:9: 12.5, not 1.5 x 8.75), so the values below land where the page's are", () => {
        const wide = { width: 1500, height: 644.53125, dpr: 1.28, grow: 1 }; // recorded before Home's default growth
        const d = 644.53125 / 810;
        const lines = (role: 'label' | 'caption', fontPx: number) => (role === 'label' ? 12.5 : fontPx * 1.4);
        const t = pageTargets('spotlight', wide, [played, main], measure, store, { columns, bar: true }, lines);
        const s = t.stats.played!;
        expect(s.label.h).toBe(12.5);
        expect(s.value.y).toBeCloseTo(s.label.y + 12.5 + PAGE_LAYOUT.stats.rowGap * d, 6);
        expect(t.extras!.caption.h).toBeCloseTo(PAGE_LAYOUT.cardText.caption * d * 1.4, 6);
        // Without a measure: the old constants (1.5 for labels).
        const plain = pageTargets('spotlight', wide, [played, main], measure, store, { columns, bar: true });
        expect(plain.stats.played!.label.h).toBeCloseTo(PAGE_LAYOUT.stats.label * d * 1.5, 6);
    });
    it('the HowLongToBeat columns follow Main in order, one gap apart; the bar sits between them and the caption', () => {
        const t = pageTargets('spotlight', screen, [played, main], measure, store, { columns, bar: true });
        const m = t.stats.hltb!.label;
        const e = t.extras!.columns.mainExtras!.label;
        const c = t.extras!.columns.completionist!.label;
        expect(e.x).toBeGreaterThan(m.x + m.w);
        expect(c.x - (e.x + e.w)).toBeCloseTo(e.x - (m.x + m.w), 6);
        expect(t.extras!.bar!.y).toBeGreaterThan(t.extras!.columns.mainExtras!.value.y);
        expect(t.extras!.caption.y).toBeGreaterThan(t.extras!.bar!.y + t.extras!.bar!.h);
    });
    it('without a bar (not played yet), the caption takes the bar\'s place', () => {
        const withBar = pageTargets('spotlight', screen, [played, main], measure, store, { columns, bar: true }).extras!;
        const noBar = pageTargets('spotlight', screen, [played, main], measure, store, { columns, bar: false }).extras!;
        expect(noBar.bar).toBeUndefined();
        expect(noBar.caption.y).toBeCloseTo(withBar.bar!.y, 6);
    });
    it("the cards as laid out, unsnapped (the twins' layers sit there, as the page's card layers do), and the page's d unit", () => {
        const f = fixture('spotlight-1500x844');
        // The Ally docked: the window's real height (the fixture's is rounded to 844).
        const t = pageTargets('spotlight', { width: 1500, height: 844.53125, dpr: 1.28, grow: 1 }, pageStats('spotlight', f), measureFrom('spotlight', f), { w: f.rects.store.w, h: f.rects.store.h });
        // The glass panels are on whole device px (759 / 1.28); the cards themselves are where the page lays them out.
        expect(t.shells[1].y).toBe(759 / 1.28);
        // Probed on the Ally docked (2026-10-17): the HowLongToBeat card at 985.9375, 593.1030.
        expect(t.cards?.[1].y).toBeCloseTo(593.103, 1);
        expect(t.cards?.[1].x).toBeCloseTo(985.9375, 3);
        expect(t.cards?.[0].y).toBeCloseTo(f.rects.card0.y, 1);
        expect(t.d).toBe(1500 / 1440);
    });
    it('no extras asked for: none', () => {
        expect(pageTargets('spotlight', screen, [played, main], measure, store).extras).toBeUndefined();
    });
    it('the Spotlight cards keep their own widths: the info card at the left side, HowLongToBeat at the right, the art between', () => {
        const { infoW, hltbW } = PAGE_LAYOUT.cards;
        // The layout's formulas, without Home's default growth (grow 1).
        const cards = (w: number, h: number) => pageTargets('spotlight', { width: w, height: h, grow: 1 }, [played, main], measure, store).shells;
        // 21:9 (the Ally's TV window emulated at 1500x643): d = 643 / 810, 56 sides (not a TV by height).
        const d = 643 / 810;
        const side = PAGE_LAYOUT.side.base * d;
        const [info, hltb] = cards(1500, 643);
        expect(info.x).toBeCloseTo(side, 6);
        // Wider than 9:5, the description card is as wide as the HowLongToBeat card (Michael, 21:9 on the Ally).
        expect(hltb.w).toBeCloseTo(hltbW * d, 6);
        expect(info.w).toBeCloseTo(hltb.w, 6);
        expect(hltb.x + hltb.w).toBeCloseTo(1500 - side, 6);
        // 16:9 and 16:10 (the Ally's 828x466, the Deck's 854x534, 56 sides; a 1080p TV, 24 sides): each card its own width,
        // pinned to its side, so the HowLongToBeat card has no empty space after its times (issue #53).
        for (const [w, h, s, logical] of [[828, 466, PAGE_LAYOUT.side.base, 1440], [854, 534, PAGE_LAYOUT.side.base, 1280], [1500, 844, PAGE_LAYOUT.side.tv, 1440]]) {
            const unit = w / logical;
            const [i, t] = cards(w, h);
            expect(i.x).toBeCloseTo(s * unit, 6);
            expect(i.w).toBeCloseTo(infoW * unit, 6);
            expect(t.w).toBeCloseTo(hltbW * unit, 6);
            expect(t.x + t.w).toBeCloseTo(w - s * unit, 6);
            expect(t.x).toBeGreaterThan(i.x + i.w + PAGE_LAYOUT.cards.gridGap * unit);
        }
    });
    it('a stat the page lacks has no target', () => {
        const t = pageTargets('spotlight', screen, [{ key: 'played', label: 'Play Time', value: '1 h' }, { key: 'hltb', label: 'Main', value: '9 h' }], measure, store);
        expect(t.stats.achievements).toBeUndefined();
        expect(t.stats.played).toBeDefined();
    });
    it('a Unifideck size column shifts the others right and widens the Clean panel by the column plus one gap', () => {
        const base: PageStat[] = [{ key: 'played', label: 'Play Time', value: '1 h' }, { key: 'hltb', label: 'HLTB main', value: '9 h', bar: true }];
        const withSize: PageStat[] = [{ key: 'size', label: 'Install size', value: '4.1 GB' }, ...base];
        const a = pageTargets('clean', screen, base, measure, store);
        const b = pageTargets('clean', screen, withSize, measure, store);
        expect(b.stats.played!.label.x).toBeGreaterThan(b.stats.size!.label.x);
        const d = 1500 / 1440;
        near(b.shells[0].w - a.shells[0].w, 'Install size'.length * 10 + 28 * d, 'panel growth');
        // Right-aligned: the panel's right edge stays put.
        near(b.shells[0].x + b.shells[0].w, a.shells[0].x + a.shells[0].w, 'panel right edge');
    });
});

describe('pageTargets at a fractional pixel ratio', () => {
    // The Ally handheld (2.32 device px per CSS px), measured on the device: Ori's page in the Spotlight look, then with a
    // 1 px ring (drawn 2 device px, 0.862 CSS px). The ring is now 1 d unit (0.575 CSS px), drawn 1 device px (0.431):
    // everything inside the cards sits 0.431 px further up and left, and each card is 0.862 px narrower and shorter.
    const screen = { width: 828.0172, height: 466.3793, dpr: 2.32, grow: 1 }; // recorded before Home's default growth
    const d = baseCanvas(screen.width, screen.height).scale;
    // Measured: rings of 2 / 2.32 inside widths that allowed 2 px for them. Now: 1 / 2.32 inside widths allowing 2 d units.
    const was = 2 / 2.32;
    const now = 1 / 2.32;
    const narrower = 2 * (1 - was) - 2 * (d - now);
    const measure: Measure = (text) => text.length * 6;
    const stats: PageStat[] = [
        { key: 'played', label: 'Play Time', value: '2.3 h' },
        { key: 'achievements', label: 'Achievements', value: '1 / 37' },
        { key: 'hltb', label: 'Main', value: '12 h' },
    ];
    const columns: ExtraColumn[] = [{ key: 'mainExtras', label: '+ Extras', value: '15.7 h' }, { key: 'completionist', label: '100%', value: '18.3 h' }];
    const t = pageTargets('spotlight', screen, stats, measure, { w: 50, h: 20 }, { columns, bar: true });
    // The info card keeps its left edge, HowLongToBeat its right one (it sits at the row's end).
    const cards: Box[] = [
        { x: 32.2, y: 299.623, w: 310.224 + narrower, h: 102.916 - 2 * (was - now) },
        { x: 525.84 - narrower, y: 299.623, w: 269.98 + narrower, h: 102.916 - 2 * (was - now) },
    ];
    /** A text measured in card `i` at (x, y), where it is now: moved with its card, and inside the thinner ring. */
    const at = (actual: { x: number; y: number }, i: number, x: number, y: number, what: string) => {
        const ex = x + (i === 1 ? -narrower : 0) - (was - now);
        const ey = y - (was - now);
        expect(Math.abs(actual.x - ex), `${what}.x: ${actual.x} vs ${ex}`).toBeLessThan(0.05);
        expect(Math.abs(actual.y - ey), `${what}.y: ${actual.y} vs ${ey}`).toBeLessThan(0.05);
    };
    it('puts the texts inside the cards where the page does (inside their device-px ring)', () => {
        at(t.stats.played!.label, 0, 46.86, 311.98, 'Play Time label');
        at(t.stats.played!.value, 0, 46.86, 323.76, 'Play Time value');
        at(t.extras!.desc, 0, 46.86, 351.35, 'description');
        at(t.extras!.hltbTitle, 1, 540.5, 311.98, 'HowLongToBeat title');
        at(t.stats.hltb!.label, 1, 540.5, 327.21, 'Main label');
        at(t.stats.hltb!.value, 1, 540.5, 338.99, 'Main value');
    });
    it("gives the panels the cards' edges as drawn, on whole device px (a crisp ring, as the page's)", () => {
        t.shells.forEach((shell, i) => {
            const card = cards[i];
            const edges = [[shell.x, card.x], [shell.y, card.y], [shell.x + shell.w, card.x + card.w], [shell.y + shell.h, card.y + card.h]];
            for (const [mine, page] of edges) {
                expect(Math.abs(mine * screen.dpr - Math.round(mine * screen.dpr)), `shell ${i} edge ${mine} on a device px`).toBeLessThan(1e-6);
                expect(Math.abs(mine - page), `shell ${i} edge ${mine} vs ${page}`).toBeLessThanOrEqual(0.5 / screen.dpr + 1e-6);
            }
        });
    });
    it('the ring the cards draw: 1 d unit on whole device px, at least one; the d unit itself when the ratio is not known', () => {
        expect(cardBorder(2.32, 0.575)).toBeCloseTo(1 / 2.32, 6);
        expect(cardBorder(1, 0.889)).toBe(1);
        expect(cardBorder(1, 1.333)).toBe(1);
        expect(cardBorder(2, 1.333)).toBe(1);
        expect(cardBorder(3, 1.34)).toBeCloseTo(4 / 3, 6);
        expect(cardBorder(undefined, 0.575)).toBe(0.575);
    });
});

describe('pageTargets with Home\'s default growth (#55)', () => {
    it('sizes the page in the grown unit', () => {
        const measure: Measure = (text) => text.length * 10;
        const played: PageStat = { key: 'played', label: 'Play Time', value: '1 h' };
        const grown = pageTargets('spotlight', { width: 1920, height: 1080 }, [played], measure, { w: 100, h: 34 });
        const base = pageTargets('spotlight', { width: 1920, height: 1080, grow: 1 }, [played], measure, { w: 100, h: 34 });
        expect(grown.d! / base.d!).toBeCloseTo(defaultGrowth(810), 6);
    });
});

describe('the page cards\' ring for the open transition', () => {
    it('is the page\'s: its width on whole device px and its brightness', () => {
        const screen = { width: 1500, height: 844, dpr: 1.28 };
        const t = pageTargets('spotlight', screen, [], (text) => text.length * 10, { w: 100, h: 34 });
        expect(t.border).toBeCloseTo(cardBorder(1.28, t.d!), 10);
        expect(t.ring).toBe(ringBoost(1.28, 1500, 844));
    });
});
