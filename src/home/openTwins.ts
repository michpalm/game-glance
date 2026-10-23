import { PAGE_LAYOUT, PAGE_TYPE, pillFocusScale, TypeRole } from '../styles/themeCss';

export { SETTLE } from '../styles/themeCss';
import { HOME_PILL, TITLE_BLOCK } from './homeCss';
import { HOME_CHIP_FONTS, HomeRects } from './openMotion';
import { cardAround } from './openTargets';
import type { Box, PageLook, PageStat, PageTargets, StatKey } from './openTargets';

export { cardAround };

/**
 * The open transition's text twins (spec docs/superpowers/specs/2026-10-17-open-text-twins-design.md): each moving text
 * is drawn again at the page's own size and type (themeCss.PAGE_TYPE), in Home's unscaled extras layer, where the page
 * puts it. It starts transformed onto Home's text and ends untransformed, so at the hand-over it is the page's text as
 * the page draws it (Home's text scaled up never was: text does not scale linearly). Positions are root px. Pure.
 */

/**
 * The point of a twin that is placed and scaled about: top-left, bottom-left, the left end of its centre line, or (the
 * Play label) `pill`: the twin is the page pill's box, its label centred on the line at the label's inset, transformed
 * about its top-left, so its text sits where the page's does inside the page's scaled pill (a scale on the label itself
 * put the text one device px lower in the bridge: text is snapped in its own local space before the transform).
 */
export type TwinOrigin = 'top' | 'base' | 'midline' | 'pill';

export interface TwinSpec {
    name: string;
    role: TypeRole;
    text: string;
    /** The origin point's place, root px. */
    x: number;
    y: number;
    origin: TwinOrigin;
    /** Transforms about the origin: onto Home's text at the start, and the end (none, or the focused pill's scale). */
    from: string;
    to: string;
    /** Drawn in the accent (Spotlight's HowLongToBeat time). */
    accent: boolean;
    /** A `pill` twin's box (the page pill's size) and its label's left inset, px. */
    box?: { w: number; h: number; inset: number };
    /**
     * The top-left of the page card the twin lands in, root px: the twin is drawn in a layer there (openHome.mountTwins).
     * The page's card is a compositing layer (its backdrop blur), whose origin Chromium puts on a whole device px, and its
     * text is snapped from there: the same text outside a layer at that place drew a device px lower (Ally, docked).
     */
    card?: { x: number; y: number };
    /**
     * A centre-line twin: how far its box's top sits above the origin point (half the page's line box), so its box is
     * placed by layout, not by a translate of half its height: a translate applies after the text is snapped, and 18.75 px
     * (24 device px) put the HowLongToBeat time a device px low (Ally, docked).
     */
    lift?: number;
}

// 4 decimals: at 2, the bridge sat 0.01 px off the page, which drew a row a whole device px off near a half pixel.
const r2 = (n: number) => Math.round(n * 10000) / 10000;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const anchor = (b: Box, origin: TwinOrigin) => ({ x: b.x, y: origin === 'top' ? b.y : origin === 'base' ? b.y + b.h : b.y + b.h / 2 });

/** The transform that puts a twin anchored at `at` onto Home's `home` box (the same origin point), scaled by `scale`. */
export function twinFrom(home: Box, at: { x: number; y: number }, scale: number, origin: TwinOrigin): string {
    const a = anchor(home, origin);
    return `translate(${r2(a.x - at.x)}px, ${r2(a.y - at.y)}px) scale(${r4(scale)})`;
}

/**
 * The twins for an open: the title (null `texts.title`: a logo, none), the eyebrow, the Play label, and each chip that
 * becomes a page column, its label and value in the page's own words (`stats`). Spotlight's HowLongToBeat column has no
 * label twin (the page names it in its card) and its value is in the accent. `focused`: the page will show Play focused.
 * `canvasScale`: Home's canvas scale, which is also the page's d unit.
 */
export function twinSpecs(home: HomeRects, page: PageTargets, texts: { title: string | null; eyebrow: string; play: string }, stats: PageStat[], look: PageLook, focused: boolean, canvasScale: number): TwinSpec[] {
    const ox = home.root?.x ?? 0;
    const oy = home.root?.y ?? 0;
    const local = (b: Box): Box => ({ x: b.x - ox, y: b.y - oy, w: b.w, h: b.h });
    const out: TwinSpec[] = [];
    const add = (name: string, role: TypeRole, text: string, homeBox: Box, at: { x: number; y: number }, origin: TwinOrigin, homeFont: number, extra: Partial<TwinSpec> = {}) => {
        const where = { x: r2(at.x - ox), y: r2(at.y - oy) };
        const around = cardAround(page.cards ?? page.shells, at);
        const card = around ? { card: { x: r2(around.x - ox), y: r2(around.y - oy) } } : {};
        out.push({ name, role, text, ...where, origin, from: twinFrom(local(homeBox), where, homeFont / PAGE_TYPE[role].size, origin), to: 'none', accent: false, ...card, ...extra });
    };

    if (texts.title !== null && home.titleText !== false) add('title', 'title', texts.title, home.titleSlot, page.titleBottomLeft, 'base', TITLE_BLOCK.titleSize);
    add('eyebrow', 'eyebrow', texts.eyebrow, home.eyebrow, page.eyebrowBottomLeft, 'base', PAGE_TYPE.eyebrow.size);

    // Home's canvas and the page share one scale (openMotion: d = s).
    const s = canvasScale;
    // The Play label: the page pill's box, its label at the page's inset on the centre line; Home's label sits after its
    // border, inset and glyph, on its pill's centre line (as openMotion places it). Transforms about the box's top-left.
    const pill = PAGE_LAYOUT.pill;
    const box = local(page.play);
    const inset = r2((pill.padX + pill.icon + pill.iconGap) * s);
    const k = HOME_PILL.font / PAGE_TYPE.playLabel.size;
    const hx = home.play.x - ox + (HOME_PILL.border + HOME_PILL.padX + HOME_PILL.icon + HOME_PILL.gap) * s - box.x;
    const hy = home.play.y - oy + home.play.h / 2 - box.y;
    let playTo = 'none';
    if (focused) {
        // The focused pill grows about its centre, as the page's does.
        const pf = pillFocusScale(PAGE_LAYOUT.playW, PAGE_LAYOUT.icon);
        playTo = `translate(${r2((box.w / 2) * (1 - pf.x))}px, ${r2((box.h / 2) * (1 - pf.y))}px) scale(${pf.x}, ${pf.y})`;
    }
    out.push({
        name: 'play',
        role: 'playLabel',
        text: texts.play,
        x: r2(box.x),
        y: r2(box.y),
        origin: 'pill',
        from: `translate(${r2(hx - k * inset)}px, ${r2(hy - k * (box.h / 2))}px) scale(${r4(k)})`,
        to: playTo,
        accent: false,
        box: { w: box.w, h: box.h, inset },
    });

    const words = new Map(stats.map((st) => [st.key, st]));
    for (const chip of home.chips) {
        const key = chip.key as StatKey;
        const to = Object.prototype.hasOwnProperty.call(page.stats, key) ? page.stats[key] : undefined;
        const st = words.get(key);
        if (!to || !st) continue;
        const spotlightHltb = look === 'spotlight' && key === 'hltb';
        if (!spotlightHltb) add(`label-${key}`, 'label', st.label, chip.label, anchor(to.label, 'midline'), 'midline', HOME_CHIP_FONTS.label, { lift: to.label.h / 2 });
        add(`value-${key}`, look === 'clean' ? 'cleanValue' : 'value', st.value, chip.value, anchor(to.value, 'midline'), 'midline', HOME_CHIP_FONTS.value, { accent: spotlightHltb, lift: to.value.h / 2 });
    }
    return out;
}

/**
 * Settle guards: the same text is within 2% of its size; a difference over 6 px is another element; under 0.005 px is
 * nothing (the spec's 0.25 was too coarse: on the Ally a 0.01 px offset drew a number a whole device px off).
 */
const SIZE_TOLERANCE = 0.02;
const MAX_GLIDE_PX = 6;
const MIN_GLIDE_PX = 0.005;

/**
 * How far a twin glides at the hand-over: from where it landed (`predicted`) to the page's text as measured, or null
 * when it should stay (no counterpart, not the same size, too far to be the same element, or already there). Pure.
 */
export function settleDelta(predicted: Box, measured: Box | null): { dx: number; dy: number } | null {
    if (!measured) return null;
    const off = (a: number, b: number) => Math.abs(b - a) > SIZE_TOLERANCE * Math.max(Math.abs(a), 1);
    if (off(predicted.w, measured.w) || off(predicted.h, measured.h)) return null;
    const dx = r2(measured.x - predicted.x);
    const dy = r2(measured.y - predicted.y);
    if (Math.abs(dx) > MAX_GLIDE_PX || Math.abs(dy) > MAX_GLIDE_PX) return null;
    if (Math.abs(dx) < MIN_GLIDE_PX && Math.abs(dy) < MIN_GLIDE_PX) return null;
    return { dx, dy };
}
