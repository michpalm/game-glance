import type { HomeRects, MotionVar } from './openMotion';
import { STANDARD_HERO_ASPECT, fitMask, windowAspect } from './heroFit';
import type { Box, ExtraColumn, ExtrasAsked, LineMeasure, Measure, PageLook, PageStat, StatKey } from './openTargets';
import type { HltbResult } from '../data/hltb';
import { settleDelta, TwinSpec } from './openTwins';
import { tr } from '../i18n/steamText';
import { LOG_PREFIX } from '../constants';

/**
 * Spotlight Home's side of the open transition: which variant runs (openVariant), Home's boxes (measureHome), the
 * opening state on Home's root (applyOpening: CSS variables from openMotion plus data-gh-opening / data-gh-phase,
 * read by homeCss.openingRules), and the page's text widths for openTargets (canvasMeasure).
 */

/** morph: Home becomes the page; heroFade: another game's hero fades in over Home; fade: Home's UI fades on its hero. */
export type OpenVariant = 'morph' | 'heroFade' | 'fade';

/**
 * Morph only the selected game, with its full hero art (fallback or missing art would not match the page's header),
 * onto the restyled page. Another game (a feed card) gets its hero faded in; anything else just fades. Pure.
 */
export function openVariant(o: { sameGame: boolean; heroMode: 'full' | 'fallback' | 'none'; pageRestyled: boolean }): OpenVariant {
    if (!o.pageRestyled) return 'fade';
    if (!o.sameGame) return 'heroFade';
    return o.heroMode === 'full' ? 'morph' : 'fade';
}

const boxOf = (el: Element | null | undefined): Box | null => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/**
 * The window's exact size in CSS px: the page lays out from 100vw / 100vh, which are fractional at the Ally's pixel
 * ratio (466.38, where innerHeight says 466), so the targets must be too. innerWidth / innerHeight without a viewport.
 * With its pixel ratio: the page draws its cards' borders and edges on whole device px.
 */
export function viewportSize(win: {
    innerWidth: number; innerHeight: number; devicePixelRatio?: number; visualViewport?: { width: number; height: number } | null;
}): { width: number; height: number; dpr?: number } {
    const v = win.visualViewport;
    const size = v && v.width > 0 && v.height > 0 ? { width: v.width, height: v.height } : { width: win.innerWidth, height: win.innerHeight };
    return { ...size, dpr: win.devicePixelRatio };
}

/** The page's stat columns (Play time, Achievements, HowLongToBeat Main) Home showed no chip for, by Home's chip keys. Pure. */
export function missingStats(chipKeys: string[], drawn = ''): string[] {
    const extras = drawn.split(/\s+/);
    return ['played', 'achievements', 'hltb'].filter((key) => !chipKeys.includes(key) && !extras.includes(key));
}

/**
 * Screen px per canvas px, preserving the fractional layout width. Default growth makes the logical canvas fractional;
 * offsetWidth rounds it to an integer and shifts the moving glass away from the page's crisp ring (about 0.4 px on Ally).
 * Use the measured width, as the old card-origin/raster fixes require, rather than rounding the canvas before conversion.
 */
export function measureCanvasScale(root: Element): number {
    const canvas = root.querySelector('.gh-canvas');
    const win = root.ownerDocument?.defaultView;
    if (!canvas || !win) return 0;
    const width = parseFloat(win.getComputedStyle(canvas).width);
    const drawn = canvas.getBoundingClientRect().width;
    return Number.isFinite(width) && width > 0 && Number.isFinite(drawn) && drawn > 0 ? drawn / width : 0;
}

/** Home's boxes for openMotion (CSS px), or null when anything required is missing (no game selected, nothing laid out). */
export function measureHome(root: Element | null): HomeRects | null {
    try {
        if (!root) return null;
        const canvas = boxOf(root.querySelector('.gh-canvas'));
        const titleSlot = boxOf(root.querySelector('.gh-title-slot'));
        const eyebrow = boxOf(root.querySelector('.gh-eyebrow'));
        const play = boxOf(root.querySelector('.gh-actions .gh-btn[data-action="play"]'));
        if (!canvas || !titleSlot || !eyebrow || !play) return null;
        const circleEls = [...root.querySelectorAll('.gh-actions .gh-btn-circle')];
        const info = circleEls.findIndex((c) => c.getAttribute('data-action') === 'info');
        const chips = drawnChips(root).map((chip) => ({
            key: chip.getAttribute('data-chip') ?? '',
            shell: boxOf(chip)!,
            label: boxOf(chip.querySelector('.gh-chip-label'))!,
            value: boxOf(chip.querySelector('.gh-chip-value'))!,
            bar: boxOf(chip.querySelector('.gh-chip-bar')),
        })).filter((c) => c.label && c.value);
        return {
            root: boxOf(root) ?? undefined,
            canvas,
            titleSlot,
            titleText: root.querySelector('.gh-title-slot .gh-title') !== null,
            eyebrow,
            play,
            circles: circleEls.map((c) => boxOf(c)!),
            infoCircle: info >= 0 ? info : null,
            store: boxOf(root.querySelector('.gh-source')),
            chips,
        };
    } catch {
        return null;
    }
}

/**
 * Puts Home in its opening state: the variables, `data-gh-opening` = variant and the start frame (`data-gh-phase`
 * "from": the glass panels appear on the chips), then on the next frame the motion ("to"). `heroUrl`: the opened
 * game's hero for heroFade. Returns the undo (a cancel before the hand-over): every variable and attribute goes, and
 * the pending frame does nothing.
 */
/**
 * The open's text twins (home/openTwins) drawn in their own layer in `root` (homeCss .gh-open-twins), each with its text
 * and its place and transforms as variables; returns their removal. Nothing for no specs.
 */
export function mountTwins(root: HTMLElement, specs: TwinSpec[]): () => void {
    if (specs.length === 0) return () => undefined;
    const doc = root.ownerDocument;
    const layer = doc.createElement('div');
    layer.className = 'gh-open-twins';
    // One layer per page card, at the card's place (TwinSpec.card): its twins are placed inside it.
    const cards = new Map<string, HTMLElement>();
    const cardFor = (c: { x: number; y: number }) => {
        const key = `${c.x},${c.y}`;
        let card = cards.get(key);
        if (!card) {
            card = doc.createElement('div');
            card.className = 'gh-twin-card';
            card.style.setProperty('--t-card-x', `${c.x}px`);
            card.style.setProperty('--t-card-y', `${c.y}px`);
            layer.appendChild(card);
            cards.set(key, card);
        }
        return card;
    };
    for (const t of specs) {
        const el = doc.createElement('div');
        el.className = 'gh-twin';
        el.setAttribute('data-twin', t.name);
        el.setAttribute('data-role', t.role);
        el.setAttribute('data-origin', t.origin);
        if (t.accent) el.setAttribute('data-accent', '');
        el.textContent = t.text;
        const ox = t.card?.x ?? 0;
        const oy = t.card?.y ?? 0;
        el.style.setProperty('--t-x', `${Math.round((t.x - ox) * 10000) / 10000}px`);
        el.style.setProperty('--t-y', `${Math.round((t.y - (t.lift ?? 0) - oy) * 10000) / 10000}px`);
        // Placed by its top (TwinSpec.lift): no share of its own height to shift by.
        if (t.lift !== undefined) el.style.setProperty('--t-shift', '0%');
        el.style.setProperty('--t-from', t.from);
        el.style.setProperty('--t-to', t.to);
        if (t.box) {
            el.style.setProperty('--t-w', `${t.box.w}px`);
            el.style.setProperty('--t-h', `${t.box.h}px`);
            el.style.setProperty('--t-inset', `${t.box.inset}px`);
        }
        (t.card ? cardFor(t.card) : layer).appendChild(el);
    }
    root.appendChild(layer);
    return () => layer.remove();
}

/**
 * Twins whose text the extras layer also lays out, as the page does, inside the same card (by twin name: that text, which
 * the extras keep hidden for the twin). Spotlight's HowLongToBeat time: Main's column in the card's tiers.
 */
const TWIN_REST: Record<string, string> = {
    'value-hltb': '.gh-x-card[data-for="hltb"] .gh-x-stats > div:first-child .gh-x-value',
};

/**
 * Once opening (the extras laid out): each twin in TWIN_REST rests where the extras lay its text out, measured from its
 * card layer, instead of where openTargets predicts: inside a card layer the text is snapped from the card's origin, and
 * a prediction 0.03 px off still drew the time a device px low (Ally, docked), while the extras' own columns, laid out as
 * the page's, drew on the page's row. Placed by its top-left, so nothing shifts it by a share of its height.
 */
export function restTwinsOnExtras(root: HTMLElement) {
    for (const [name, sel] of Object.entries(TWIN_REST)) {
        const twin = root.querySelector(`.gh-twin[data-twin="${name}"]`) as HTMLElement | null;
        const text = root.querySelector(sel);
        const card = twin?.parentElement;
        if (!twin || !text || !card) continue;
        const at = text.getBoundingClientRect();
        if (!(at.width > 0 && at.height > 0)) continue;
        const from = card.getBoundingClientRect();
        // Unrounded: layout positions are 1/64 px, which 4 decimals would move.
        twin.style.setProperty('--t-x', `${at.left - from.left}px`);
        twin.style.setProperty('--t-y', `${at.top - from.top}px`);
        twin.style.setProperty('--t-shift', '0%');
    }
}


/**
 * At the page's ready, in the bridge `copy`: each text twin glides onto its counterpart on the page (`targets`, by twin
 * name: themeCss.twinTargets) as measured in the page's `doc`, within openTwins.settleDelta's guards (homeCss: the copy's
 * twins transition their translate by --t-dx/--t-dy). A twin without a counterpart, or one too far off, stays.
 */
export function settleTwins(copy: HTMLElement, doc: Document, targets: Record<string, string>) {
    // The text's own extent (a Range over its contents), never the element's box: the page's texts sit in stretched boxes
    // (the eyebrow and title span the 640-unit title block, the title has padding, a column's label and value share its
    // width), which the size guard rejected, so the title, eyebrow and narrower stat texts never glided (final review).
    const box = (el: Element) => {
        let r: { left: number; top: number; width: number; height: number } | null = null;
        try {
            const range = doc.createRange?.();
            if (range) {
                range.selectNodeContents(el);
                r = range.getBoundingClientRect();
            }
        } catch {
            r = null;
        }
        r ??= el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    // The twins, and the extras layer's text that settles the same way (OpenExtras data-settle).
    for (const twin of copy.querySelectorAll<HTMLElement>('.gh-twin, [data-settle]')) {
        const sel = targets[twin.getAttribute('data-twin') ?? twin.getAttribute('data-settle') ?? ''];
        const page = sel ? doc.querySelector<HTMLElement>(sel) : null;
        const glide = settleDelta(box(twin), page ? box(page) : null);
        if (!glide) continue;
        twin.style.setProperty('--t-dx', `${glide.dx}px`);
        twin.style.setProperty('--t-dy', `${glide.dy}px`);
    }
}

/** The texts the twins draw, as Home shows them: the title (null for a logo), the eyebrow, the Play label. */
export function readTwinTexts(root: Element): { title: string | null; eyebrow: string; play: string } {
    const text = (sel: string) => root.querySelector(sel)?.textContent ?? null;
    return { title: text('.gh-title-slot .gh-title'), eyebrow: text('.gh-eyebrow') ?? '', play: text('.gh-btn[data-action="play"] .gh-btn-label') ?? '' };
}

export function applyOpening(root: HTMLElement, variant: OpenVariant, vars: MotionVar[], heroUrl: string | null, extras = '', twins: TwinSpec[] = []): () => void {
    const names: string[] = [];
    const set = (name: string, value: string) => {
        root.style.setProperty(name, value);
        names.push(name);
    };
    for (const v of vars) set(v.name, v.value);
    if (heroUrl) {
        set('--gho-hero', `url("${heroUrl.replace(/"/g, '%22')}")`);
        // Its fade in Fit (homeCss .gh-fit .gh-hero-open): the standard hero shape, as the other game's art is not decoded yet.
        set('--gho-hero-mask', fitMask(STANDARD_HERO_ASPECT, windowAspect(root.ownerDocument?.defaultView)));
    }
    const shells = vars.find((v) => v.name === '--gho-shell-count')?.value;
    if (shells) root.setAttribute('data-gh-shells', shells);
    // The page's parts Home draws as it turns into it (extrasParts): homeCss shows only those.
    if (extras) root.setAttribute('data-gh-extras', extras);
    // The text twins (morph only): homeCss fades out Home's text each one replaces (data-gh-twins).
    let unmountTwins = () => undefined as void;
    if (variant === 'morph' && twins.length > 0) {
        try {
            unmountTwins = mountTwins(root, twins);
            root.setAttribute('data-gh-twins', twins.map((t) => t.name).join(' '));
        } catch (error) {
            // Without them Home's own text morphs, as before the twins.
            console.warn(`${LOG_PREFIX} Home: could not draw the text twins`, error);
        }
    }
    root.setAttribute('data-gh-opening', variant);
    root.setAttribute('data-gh-phase', 'from');
    if (variant === 'morph' && twins.length > 0) {
        try {
            restTwinsOnExtras(root);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: could not rest the text twins on the extras`, error);
        }
    }
    let live = true;
    const start = () => {
        if (live) root.setAttribute('data-gh-phase', 'to');
    };
    const view = root.ownerDocument?.defaultView;
    if (view?.requestAnimationFrame) view.requestAnimationFrame(start);
    else start();
    return () => {
        live = false;
        for (const name of names) root.style.removeProperty(name);
        for (const attr of ['data-gh-opening', 'data-gh-phase', 'data-gh-shells', 'data-gh-extras', 'data-gh-twins']) root.removeAttribute(attr);
        unmountTwins();
    };
}

/**
 * The page's text widths, measured with a 2D canvas in Home's document and font (the page uses Steam's font too):
 * labels in capitals with their 0.18em letter spacing, values bold. 0 when nothing can be measured (the layout then
 * uses its bars and other columns).
 */
export function canvasMeasure(root: Element): Measure {
    let ctx: CanvasRenderingContext2D | null = null;
    let family = 'sans-serif';
    try {
        const doc = root.ownerDocument;
        ctx = doc.createElement('canvas').getContext('2d');
        family = doc.defaultView?.getComputedStyle(root).fontFamily || family;
    } catch {
        ctx = null;
    }
    return (text, role, fontPx) => {
        if (!ctx) return 0;
        const label = role === 'label';
        ctx.font = `700 ${fontPx}px ${family}`;
        const shown = label ? text.toUpperCase() : text;
        return ctx.measureText(shown).width + (label ? shown.length * 0.18 * fontPx : 0);
    };
}

/**
 * The page's 'normal' line height for a label (bold) or the caption (regular) at a font size, as the page draws it: a
 * hidden line in Home's document in the same font (a 'normal' line is the font's own, rounded to whole device px, so no
 * constant fits every screen). Once per role and size; 0 when nothing can be measured.
 */
export function lineMeasure(root: Element): LineMeasure {
    const known = new Map<string, number>();
    return (role, fontPx) => {
        const key = `${role}|${fontPx}`;
        const kept = known.get(key);
        if (kept !== undefined) return kept;
        let height = 0;
        try {
            const doc = root.ownerDocument;
            if (!doc) return 0;
            const el = doc.createElement('div');
            Object.assign(el.style, {
                position: 'absolute', left: '0', top: '0', visibility: 'hidden', pointerEvents: 'none', margin: '0', padding: '0', border: '0',
                whiteSpace: 'nowrap', lineHeight: 'normal', fontSize: `${fontPx}px`, fontWeight: role === 'label' ? '700' : '400',
                fontFamily: doc.defaultView?.getComputedStyle(root).fontFamily || 'sans-serif',
            });
            el.textContent = role === 'label' ? 'PLAY TIME' : 'Played';
            root.appendChild(el);
            height = el.getBoundingClientRect().height;
            el.remove();
        } catch {
            height = 0;
        }
        const h = Number.isFinite(height) && height > 0 ? height : 0;
        known.set(key, h);
        return h;
    };
}

/** A chip as Home shows it (its key, texts, and whether it has a progress bar). */
export interface ChipText { key: string; label: string; value: string; bar: boolean }

/**
 * The page's stat columns, as Home can know them from its chips (the same Steam words and numbers): Spotlight calls
 * HowLongToBeat's column "Main"; Clean keeps Home's texts and bars. A new
 * game's Added chip stands for the page's Play time of 0 h. Only these three; a Unifideck size column is not known
 * here (its column then makes the page's others sit a little further right, which the hand-over's fade covers). Pure.
 */
/** `size`: a Unifideck game's size column as Home draws it (OpenExtras), right after Played as on the page. */
export function pageStatsFromChips(chips: ChipText[], look: PageLook, size?: { label: string; value: string } | null): PageStat[] {
    const byKey = new Map(chips.map((c) => [c.key, c]));
    const out: PageStat[] = [];
    const played = byKey.get('played');
    if (played) out.push({ key: 'played', label: played.label, value: played.value, bar: look === 'clean' && played.bar });
    else if (byKey.has('added')) out.push({ key: 'played', label: tr('played'), value: '0 h', bar: false });
    // The size item: a Unifideck game's (passed in), else Home's chip for a Steam game's Space Required (the same item).
    const sized = size ?? (byKey.has('size') ? { label: byKey.get('size')!.label, value: byKey.get('size')!.value } : null);
    if (sized) out.push({ key: 'size', label: sized.label, value: sized.value, bar: false });
    const add = (key: StatKey, label: string, value: string, bar: boolean) => out.push({ key, label, value, bar: look === 'clean' && bar });
    const ach = byKey.get('achievements');
    if (ach) add('achievements', ach.label, ach.value, ach.bar);
    const hltb = byKey.get('hltb');
    // Spotlight's card has no Main column without a time (no match: Home's chip says '—'), so the chip has no target there.
    if (hltb && (look !== 'spotlight' || /\d/.test(hltb.value))) add('hltb', look === 'spotlight' ? 'Main' : hltb.label, hltb.value, hltb.bar);
    return out;
}

/** The Unifideck size column Home drew in its extras layer (OpenExtras), or null. */
export function readExtrasSize(root: Element): { label: string; value: string } | null {
    const column = root.querySelector('.gh-open-extras .gh-x-size');
    const label = column?.querySelector('.gh-x-label')?.textContent?.trim() ?? '';
    const value = column?.querySelector('.gh-x-value')?.textContent?.trim() ?? '';
    return label && value ? { label, value } : null;
}

/**
 * Home's chips as drawn: a chip with no box (hidden by CSS) is skipped, so the open transition never flies a stat twin
 * in from the corner nor counts a page column as covered by it.
 */
function drawnChips(root: Element): Element[] {
    return [...root.querySelectorAll('.gh-chip')].filter((chip) => {
        const r = chip.getBoundingClientRect?.();
        return !r || (r.width > 0 && r.height > 0);
    });
}

/** Home's chips as shown (data-chip, label, value, bar), for pageStatsFromChips. */
export function readChipTexts(root: Element): ChipText[] {
    return drawnChips(root).map((chip) => ({
        key: chip.getAttribute('data-chip') ?? '',
        label: chip.querySelector('.gh-chip-label')?.textContent?.trim() ?? '',
        value: chip.querySelector('.gh-chip-value')?.textContent?.trim() ?? '',
        bar: chip.querySelector('.gh-chip-bar') !== null,
    }));
}

/**
 * The page's parts Home can draw as it turns into the page's Spotlight look (SpotlightHome's .gh-open-extras), as
 * data-gh-extras words: `desc` when it has the description's text, `hltb` when HowLongToBeat found the game with a Main
 * time (without one the page writes "—" there, which Home's chip would not cover), `pills` when it knows the store (the
 * page's own store pill, and family pill, drawn at the page's size: Home's scaled one is a little narrower), `played` when
 * Home shows no Play time chip (a new game's Added chip): the page's Play time column, so it is there at the hand-over. Pure.
 */
export function extrasParts(description: string | null | undefined, hltb: HltbResult | undefined, source?: string | null, playedMissing = false, size = false): string {
    const parts: string[] = [];
    if (description && description.trim()) parts.push('desc');
    // The card's inside: its times, or (no match) its "No Matches Found" lines, which otherwise arrived after the hand-over.
    if ((hltb?.status === 'found' && hltb.times.main !== null) || hltb?.status === 'notFound') parts.push('hltb');
    if (source) parts.push('pills');
    if (playedMissing) parts.push('played');
    if (size) parts.push('size');
    return parts.join(' ');
}

/** The open intent's flags for the parts Home drew (extrasParts words): the page shows those at once. */
export function extrasFlags(parts: string, chipKeys: string[] = []): { homeDesc?: true; homeHltb?: true; homeSize?: true } {
    const words = parts.split(/\s+/);
    // A size Home drew in its extras (Unifideck's), or as a chip (a Steam game's Space Required): the page's arrives at once.
    const sized = words.includes('size') || chipKeys.includes('size');
    return {
        ...(words.includes('desc') ? { homeDesc: true as const } : {}),
        ...(words.includes('hltb') ? { homeHltb: true as const } : {}),
        ...(sized ? { homeSize: true as const } : {}),
    };
}

/** What the extras layer holds, for openTargets: its HowLongToBeat columns after Main, and whether it has a bar. */
export function readExtrasAsked(root: Element): ExtrasAsked {
    const keys: ExtraColumn['key'][] = ['mainExtras', 'completionist'];
    const columns = [...root.querySelectorAll('.gh-open-extras .gh-x-stats > div')].slice(1, 3).map((column, i) => ({
        key: keys[i],
        label: column.querySelector('.gh-x-label')?.textContent?.trim() ?? '',
        value: column.querySelector('.gh-x-value')?.textContent?.trim() ?? '',
    }));
    return { columns, bar: root.querySelector('.gh-open-extras .gh-x-bar') !== null };
}
