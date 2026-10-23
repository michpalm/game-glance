import { cardMaxWidths, PAGE_LAYOUT, pageDUnit, ringBoost, STEAM_LEGEND_PX } from '../styles/themeCss';
import { baseCanvas } from './scale';

/**
 * Where the Game Glance page (restyled, Spotlight or Clean look) puts the things Spotlight Home morphs into during the
 * open transition, for a Big Picture window of a given size. Built from the same constants as the page's theme
 * (themeCss.PAGE_LAYOUT), so the two cannot drift apart; checked against layouts measured on the device
 * (tests/home/fixtures/openLayout). CSS px of the Big Picture window. Pure.
 */

export type PageLook = 'spotlight' | 'clean';
export interface Box { x: number; y: number; w: number; h: number }
export type StatKey = 'size' | 'played' | 'achievements' | 'hltb';
/** One of the page's stat columns, in page order; `bar`: the column has a progress bar under its value (Clean). */
export interface PageStat { key: StatKey; label: string; value: string; bar?: boolean }
export interface PageTargets {
    /** The page cards' ring as Chromium draws it (cardBorder: whole device px), in CSS px; and its brightness (themeCss ringBoost, --gg-ring). */
    border?: number;
    ring?: number;
    /** The title's bottom-left corner (it grows upward), and the eyebrow's under it. */
    titleBottomLeft: { x: number; y: number };
    eyebrowBottomLeft: { x: number; y: number };
    play: Box;
    /** Circle slots 0..3 after the Play pill. */
    circles: Box[];
    /** The store pill, right-aligned (its size is the given one). */
    store: Box;
    /** Spotlight: [info card, HowLongToBeat card]; Clean: [panel]. On whole device px, as Chromium draws a card's edges. */
    shells: Box[];
    /**
     * The same cards where the page lays them out, unsnapped: each is a compositing layer on the page, and text inside one
     * is snapped from its origin, so the open's layers for card text sit here (openTwins.TwinSpec.card). Absent: shells.
     */
    cards?: Box[];
    /** The page's d unit (CSS px per handoff px), exactly as its --gg-d. Absent: Home's canvas scale. */
    d?: number;
    /** Each stat's label and value; on Clean, the progress bar under a stat that has one. */
    stats: Partial<Record<StatKey, { label: Box; value: Box; bar?: Box }>>;
    /** Spotlight look, when asked for: the description and the rest of the HowLongToBeat card. */
    extras?: PageExtras;
}
/** One of the HowLongToBeat card's columns after Main (Spotlight look), with the texts it shows. */
export interface ExtraColumn { key: 'mainExtras' | 'completionist'; label: string; value: string }
/** What Spotlight Home draws as it turns into the page's Spotlight look, besides the stats: the cards' other parts. */
export interface ExtrasAsked {
    /** The HowLongToBeat card's columns after Main, in order. */
    columns: ExtraColumn[];
    /** Whether the card has a progress bar (not when the game was never played); its caption follows it. */
    bar: boolean;
}
export interface PageExtras {
    /** The info card's description: three lines (it is clamped to them). */
    desc: Box;
    /** The HowLongToBeat card's title label. */
    hltbTitle: Box;
    columns: Partial<Record<ExtraColumn['key'], { label: Box; value: Box }>>;
    bar?: Box;
    caption: Box;
}
/** A text's width in CSS px as the page draws it: a stat label (uppercase, its letter spacing), a card value or a Clean value. */
export type Measure = (text: string, role: 'label' | 'value' | 'cleanValue', fontPx: number) => number;

/**
 * The cards' and the Clean panel's ring (1 d unit, as Home's: themeCss) as Chromium draws it at `dpr` device px per CSS
 * px: a whole number of device px, at least one (1 at the Ally's 2.32 and d 0.575, so 0.431 CSS px). CSS px; the d unit
 * itself when the ratio is not known.
 */
export function cardBorder(dpr: number | undefined, d: number): number {
    return dpr && dpr > 0 ? Math.max(1, Math.floor(d * dpr)) / dpr : d;
}
/**
 * The page's line heights, as Home's open transition draws the same texts: values are set to 1.2 (themeCss); labels and
 * the HowLongToBeat caption keep Steam's 'normal', the font's own line, rounded to whole device px. That came to 1.5 for
 * the labels at 16:9 docked, but about 1.43 at 21:9, where a 1.5 stood each label row 0.6 px taller than the page's and
 * the text under it landed lower (Ally, emulated 1500x644).
 */
export const PAGE_LINES = { label: 'normal', value: 1.2, caption: 'normal' } as const;
/** A 'normal' line's height in CSS px for a role's font size, measured in Home's document (openHome.lineMeasure); 0: unknown. */
export type LineMeasure = (role: 'label' | 'caption', fontPx: number) => number;
/** Without a measure: the lines as measured at 16:9 docked. */
const LABEL_LINE = 1.5;
const VALUE_LINE = PAGE_LINES.value;
const CAPTION_LINE = 1.45;
/** The Spotlight cards' height with three description lines (handoff px; the theme's TV_CARDS_H). */
const CARDS_H = PAGE_LAYOUT.playTop.tvCards;

export function pageTargets(
    look: PageLook, screen: { width: number; height: number; dpr?: number; grow?: number }, stats: PageStat[], measure: Measure, storeSize: { w: number; h: number }, asked?: ExtrasAsked,
    lines?: LineMeasure,
): PageTargets {
    const L = PAGE_LAYOUT;
    const W = screen.width;
    const H = screen.height;
    // The page's unit, with Home's default growth (#55); `grow` overrides it (pages recorded before it: 1).
    const d = typeof screen.grow === 'number' ? baseCanvas(W, H).scale * screen.grow : pageDUnit(W, H);
    const BORDER = cardBorder(screen.dpr, d);
    // The cards' widths allow 1 d unit for each ring (themeCss.cardContentMax, CARD_FILL_WIDTH): a thinner one as drawn
    // makes them this much narrower.
    const thinner = 2 * (d - BORDER);
    // A panel's edges where Chromium draws the card's: on whole device px.
    const snap = (v: number) => (screen.dpr && screen.dpr > 0 ? Math.round(v * screen.dpr) / screen.dpr : v);
    const snapBox = (b: Box): Box => {
        const x = snap(b.x);
        const y = snap(b.y);
        return { x, y, w: snap(b.x + b.w) - x, h: snap(b.y + b.h) - y };
    };
    const tv = W >= L.tvQuery.minWidth && H >= L.tvQuery.minHeight;
    const side = (tv ? L.side.tv : L.side.base) * d;
    const playTop = look === 'clean'
        ? H - L.rowH * d - Math.max(L.clean.bottom * d, L.clean.minBelowRow - (L.rowH - L.icon) * d)
        : tv
            ? H - STEAM_LEGEND_PX - (L.rowH + L.playTop.tvCards + L.playTop.tvGap) * d
            : H - L.playTop.spotlight * d;

    const play: Box = { x: side, y: playTop, w: L.playW * d, h: L.icon * d };
    const circles = [0, 1, 2, 3].map((i) => ({ x: side + (L.playW + L.gap + i * (L.icon + L.gap)) * d, y: playTop, w: L.icon * d, h: L.icon * d }));

    const blockBottom = playTop - (look === 'clean' ? L.clean.gap : L.titleGap) * d;
    const eyebrowH = L.titleBlock.eyebrow * VALUE_LINE * d;
    const eyebrowBottomLeft = { x: side, y: blockBottom };
    const titleBottomLeft = { x: side, y: blockBottom - eyebrowH - L.titleBlock.gap * d };

    const labelFont = L.stats.label * d;
    const lineOf = (role: 'label' | 'caption', fontPx: number, fallback: number) => {
        const h = lines?.(role, fontPx) ?? 0;
        return Number.isFinite(h) && h > 0 ? h : fontPx * fallback;
    };
    const labelH = lineOf('label', labelFont, LABEL_LINE);
    const valueRole = look === 'clean' ? 'cleanValue' : 'value';
    const valueFont = (look === 'clean' ? L.cleanInfo.value : L.stats.value) * d;
    const valueH = valueFont * VALUE_LINE;
    const barW = L.cleanInfo.barW * d;
    const columnWidth = (s: PageStat) => Math.max(measure(s.label, 'label', labelFont), measure(s.value, valueRole, valueFont), look === 'clean' && s.bar ? barW : 0);
    const out: PageTargets['stats'] = {};
    /** Lays `list` out as one flex row of columns from (x, y) with `gap` between them; returns the row's width. */
    const row = (list: PageStat[], x: number, y: number, gap: number): number => {
        let at = x;
        list.forEach((s, i) => {
            const w = columnWidth(s);
            const value: Box = { x: at, y: y + labelH + L.stats.rowGap * d, w, h: valueH };
            out[s.key] = { label: { x: at, y, w, h: labelH }, value };
            // Clean's bar: under the value, after the column's gap and its own margin.
            if (look === 'clean' && s.bar) out[s.key]!.bar = { x: at, y: value.y + valueH + (L.stats.rowGap + L.cleanInfo.barTop) * d, w: barW, h: L.cleanInfo.barH * d };
            at += w + (i < list.length - 1 ? gap : 0);
        });
        return at - x;
    };

    let shells: Box[];
    let cards: Box[];
    let store: Box;
    let extras: PageExtras | undefined;
    if (look === 'spotlight') {
        const top = playTop + L.rowH * d;
        // As the page's grid: the columns share the width between the sides; each card at most its cardMaxWidths,
        // the info card at the left, HowLongToBeat at the right end, so on a wider screen the art shows between them.
        const inner = W - 2 * side - L.cards.gridGap * d;
        const [a, b] = L.cards.split;
        const [infoMax, hltbMax] = cardMaxWidths(W / H);
        // Their min-height is CARDS_H less 2 for the rings, in d units, and the rings as drawn come on top.
        const cardH = (CARDS_H - 2) * d + 2 * BORDER;
        const info: Box = { x: side, y: top, w: Math.min((inner * a) / (a + b), infoMax * d - thinner), h: cardH };
        const hltbW = Math.min((inner * b) / (a + b), hltbMax * d) - thinner;
        const hltb: Box = { x: W - side - hltbW, y: top, w: hltbW, h: cardH };
        cards = [info, hltb];
        shells = cards.map(snapBox);
        const pad = (card: Box) => ({ x: card.x + BORDER + L.cards.padX * d, y: card.y + BORDER + L.cards.padY * d });
        const i0 = pad(info);
        row(stats.filter((s) => s.key !== 'hltb'), i0.x, i0.y, L.stats.colGapInfo * d);
        const h0 = pad(hltb);
        // The HowLongToBeat card: its title label, then the tiers (Main is the `hltb` stat; the others are the page's own).
        const tiersY = h0.y + labelH + L.cards.hltbGap * d;
        const mainW = row(stats.filter((s) => s.key === 'hltb'), h0.x, tiersY, L.stats.colGapHltb * d);
        if (asked) {
            // Each card is a column: its children one gap apart (the info card's gap, the HowLongToBeat card's smaller one).
            const statsH = labelH + L.stats.rowGap * d + valueH;
            const inner = (card: Box) => card.w - 2 * (BORDER + L.cards.padX * d);
            const infoStats = stats.some((s) => s.key !== 'hltb');
            const desc: Box = { x: i0.x, y: i0.y + (infoStats ? statsH + L.cards.colGap * d : 0), w: inner(info), h: L.cardText.desc * L.cardText.descLine * L.cardText.descLines * d };
            const columns: PageExtras['columns'] = {};
            let at = h0.x + mainW + L.stats.colGapHltb * d;
            for (const c of asked.columns) {
                const w = Math.max(measure(c.label, 'label', labelFont), measure(c.value, 'value', valueFont));
                columns[c.key] = { label: { x: at, y: tiersY, w, h: labelH }, value: { x: at, y: tiersY + labelH + L.stats.rowGap * d, w, h: valueH } };
                at += w + L.stats.colGapHltb * d;
            }
            const afterTiers = tiersY + statsH + L.cards.hltbGap * d;
            const bar: Box | undefined = asked.bar ? { x: h0.x, y: afterTiers, w: inner(hltb), h: L.cardText.bar * d } : undefined;
            const caption: Box = { x: h0.x, y: bar ? bar.y + bar.h + L.cards.hltbGap * d : afterTiers, w: inner(hltb), h: lineOf('caption', L.cardText.caption * d, CAPTION_LINE) };
            extras = { desc, hltbTitle: { x: h0.x, y: h0.y, w: inner(hltb), h: labelH }, columns, bar, caption };
        }
        store = { x: W - side - storeSize.w, y: top - L.storePillTop * d, w: storeSize.w, h: storeSize.h };
    } else {
        // Measure the row first (at 0, 0), then place the panel right-aligned and centred on the Play pill.
        const width = row(stats, 0, 0, L.cleanInfo.colGap * d);
        const barH = stats.some((s) => s.bar) ? (L.stats.rowGap + L.cleanInfo.barTop + L.cleanInfo.barH) * d : 0;
        const columnH = labelH + L.stats.rowGap * d + valueH + barH;
        const panel: Box = { x: 0, y: 0, w: width + 2 * (L.cleanInfo.padX * d + BORDER), h: columnH + 2 * (L.cleanInfo.padY * d + BORDER) };
        panel.x = W - side - panel.w;
        panel.y = playTop + (L.icon * d) / 2 - panel.h / 2;
        const ox = panel.x + BORDER + L.cleanInfo.padX * d;
        const oy = panel.y + BORDER + L.cleanInfo.padY * d;
        for (const key of Object.keys(out) as StatKey[]) {
            const s = out[key]!;
            s.label = { ...s.label, x: s.label.x + ox, y: s.label.y + oy };
            s.value = { ...s.value, x: s.value.x + ox, y: s.value.y + oy };
            if (s.bar) s.bar = { ...s.bar, x: s.bar.x + ox, y: s.bar.y + oy };
        }
        cards = [panel];
        shells = cards.map(snapBox);
        store = { x: W - side - storeSize.w, y: playTop - L.clean.storeGap * d - storeSize.h, w: storeSize.w, h: storeSize.h };
    }
    return { titleBottomLeft, eyebrowBottomLeft, play, circles, store, shells, cards, d, border: BORDER, ring: ringBoost(screen.dpr ?? 0, W, H), stats: out, extras };
}

/** The page card (`cards`: PageTargets.shells) that point `p` is in, edges included, or null. Pure. */
export function cardAround(cards: Box[], p: { x: number; y: number }): Box | null {
    return cards.find((c) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) ?? null;
}
