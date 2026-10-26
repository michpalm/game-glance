import { SCALE_UNIT_CSS } from '../styles/screenScale';
import { DOWNLOAD_FILL_COLOR, DOWNLOAD_FILL_MS } from '../styles/downloadFill';
import { GiveWay, giveWay, roomMissing } from './giveWay';
import { withDomFocus } from './focusCss';
import { DEFAULT_ACCENT } from './accent';
import { SOURCE_PILL, sourcePillIcon, sourcePillLook } from '../styles/sourcePill';
import { CLOUD_COLOURS, CLOUD_DOT, CloudTone } from './cloud';
import { ART_FILL_FILTER } from './heroFit';
import { hoverRing, MOUSE_ATTR, NOT_MOUSE } from './mouseMode';
import { FRIEND_COLOURS } from './friends';
import { FEED_ROW2_HEADER } from './feedLayout';
import { PERSONA_DOT, PERSONA_DOT_COLOURS, PersonaDot, STATUS_BAR, STATUS_FADE_MS } from './statusItems';
import { ACCENT_MS, CAP_ART_FADE_MS, CAP_STATE_MS, FEED_ART_FADE_MS, FEED_SCROLL, HERO_FADE_MS, MORPH_EASE, OPEN_TIMINGS, RETURN_TIMINGS, SETTLE_WIDEN_MS, SHEET, SHEET_MS, SLIDE, SLIDE_EASE } from './motion';
import { PAGE_LAYOUT, PAGE_SCRIMS, cleanInfoCss, cardBaseCss, normalCardsCss, pageType, pillFocusScale, STEAM_PLAY_LINE, STEAM_TOP_GRADIENT } from '../styles/themeCss';
import { PAGE_LINES } from './openTargets';
import { CARD_SCALE_HANDHELD, GLOW as CAP_GLOW, RECENTS_BOTTOM, recentsGeometry } from './recentsLayout';
import { PILL_INSET, ROW_OFFSET, SIDE_INSET } from './insets';
import { RETURN_ATTR } from './openCancel';

/**
 * Marks every declaration `!important` (so CSS Loader themes cannot easily restyle Home, spec section 9),
 * except custom properties: the root's `--glance-accent` default must lose to the inline per-game value.
 * Properties the components set inline (canvas size/transform, bar widths, art urls) are never set here.
 */
/**
 * Declarations without `!important`: only an opacity that an animation must drive (an animation cannot override an
 * !important value): the open transition's late fades (openingRules).
 */
function soft(selector: string, body: string): string {
    return `${selector} { ${body}; }`;
}

/**
 * Properties Home animates that are never `!important`: Chromium runs no animation of an !important property on its
 * compositor (kAffectsImportantProperty, probed on the Ally), so the open transition's motion ran on the main thread,
 * repainting every frame, and stalled. Nothing outside Game Glance sets them on Home's elements (probed: 441 elements),
 * and dropping !important from all of them alike keeps every rule's place against the others.
 */
const ANIMATED = /^(transform|opacity)\s*:/;

function rule(selector: string, body: string): string {
    const decls = body
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => (d.startsWith('--') || ANIMATED.test(d) ? d : `${d} !important`));
    // A focus look also follows DOM focus (focusCss): Steam drops its focus classes after a tap, a click or the wheel.
    return `${withDomFocus(selector)} { ${decls.join('; ')}; }`;
}

/**
 * Home's parts with a backdrop blur (the glass), inside .gh-safe: the chips, the buttons, the store pill and the family
 * pill inside it, the Library card's body, the feed cards.
 */
export const HOME_GLASS = ['.gh-chip', '.gh-btn', '.gh-source', '.gh-store-choice', '.gh-family', '.gh-lib-body', '.gh-card'];
/** Hover looks apply only in mouse mode (mouseMode). */
const HOVER = `html[${MOUSE_ATTR}]`;
const GLASS = 'background: rgba(12,16,22,.38); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(14px)';
const SCRIM = '5,7,10';
const GLOW = '0 0 0 1px var(--glance-accent), 0 16px 40px -12px var(--glance-accent)';

/**
 * Title block metrics (handoff), in logical px from the screen top; the CSS below uses them. The title's slot is
 * `titleLines` lines tall with the text aligned to its bottom, so a longer name grows upward into the free space above
 * (at most `maxTitleLines` lines, never above the 52 px safe area) and nothing below it moves: the block never grows
 * past titleBlockBottom().
 */
/** Inside the Play pill: the glyph's inset, the glyph, the gap to the label, the label's type size (canvas px). */
/** Home's Play pill in canvas px: its padding, glyph, gap and type, and the 1 px border all .gh-btn have (its content sits inside it). */
/** `arrow`/`arrowGlyph`: the "Play from" segment (PAGE_LAYOUT.playArrow at Home's 54 px pill height against the page's 60). */
export const HOME_PILL = { width: 250, padX: 22, icon: 18, gap: 13, font: 19, border: 1, arrow: 50, arrowGlyph: 13 } as const;

export const TITLE_BLOCK = {
    top: 118,
    gap: 18,
    /** Eyebrow: 12px at line-height 1.2. */
    eyebrow: 12 * 1.2,
    titleSize: 58,
    titleLines: 2,
    /** Longest title shown whole; a third line rises above the slot (its top stays below the 52 px safe area). */
    maxTitleLines: 3,
    /** One row of chips: border 2 + padding 20 + label 12 + gap 4 + value 24 + gap 4 + bar 3. */
    chipRow: 69,
    actionsMargin: 8,
    button: 54,
    /** Room inside the title's clip for descenders and its text-shadow, cancelled by an equal negative margin. */
    titleBleed: 16,
} as const;

/** Home's Play pill focused: grows by what a circle grows (themeCss.pillFocusScale). */
const pillFocus = pillFocusScale(HOME_PILL.width, TITLE_BLOCK.button);

export interface TitleBlockLayout {
    /** Top of the title's two-line slot. */
    slotTop: number;
    /** Top of the title's glyph box: the slot's bottom minus its lines (it grows upward). */
    titleTop: number;
    eyebrowTop: number;
    chipsTop: number;
    actionsTop: number;
    bottom: number;
}

/**
 * Where each part of the title block sits for a title of `lines` lines (clamped to 1..maxTitleLines), in logical px
 * from the screen top, before the stack shift. Order: title slot (two lines tall, the title aligned to its bottom),
 * eyebrow, chips, actions. Only the title moves with its line count; eyebrow, chips and actions never do.
 */
export function titleBlockLayout(lines: number): TitleBlockLayout {
    const t = TITLE_BLOCK;
    const n = Number.isFinite(lines) ? Math.min(t.maxTitleLines, Math.max(1, Math.round(lines))) : 1;
    const slotBottom = t.top + t.titleLines * t.titleSize;
    const eyebrowTop = slotBottom + t.gap;
    const chipsTop = eyebrowTop + t.eyebrow + t.gap;
    const actionsTop = chipsTop + t.chipRow + t.gap + t.actionsMargin;
    return { slotTop: t.top, titleTop: slotBottom - n * t.titleSize, eyebrowTop, chipsTop, actionsTop, bottom: actionsTop + t.button };
}

const px = (n: number) => `${n}px`;

/** Friend pictures are squares with slightly rounded corners, as Steam draws avatars (about 4 px at 32 px). */
export const AVATAR_RADIUS = 5;
export const AVATAR_SMALL_RADIUS = 3;

/** "#rrggbb" at an alpha, as rgba(). */
export function hexAlpha(hex: string, alpha: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Top of the store pill: centred on the action row (titleBlockLayout), before the stack shift. */
export function sourcePillTop(): number {
    const row = titleBlockLayout(TITLE_BLOCK.titleLines);
    return row.actionsTop + TITLE_BLOCK.button / 2 - SOURCE_PILL.height / 2;
}

/** Bottom of the title block (fixed whatever the title's length): 433.4. */
export function titleBlockBottom(): number {
    return titleBlockLayout(TITLE_BLOCK.titleLines).bottom;
}

/**
 * The tab strip and feed sheet (handoff), in logical px from the screen top, and the bottom reserve for Steam's legend.
 * `tabHeight`: padding 8 + 10 plus 13px at line-height 1.2.
 */
export const FEED_SHEET = {
    tabsTop: 700,
    tabHeight: 8 + 10 + 13 * 1.2,
    /** Steam's button legend (the handoff's 46; probed docked at about 40 logical px). */
    legendReserve: 46,
    /** Room between the tab strip's bottom and the legend reserve. */
    tabClearance: 18,
    /** How far the page rises (before the shift) when focus enters the tabs or feed: tabs 700 -> 260, cards 756 -> 316. */
    raise: 440,
} as const;

/** The mouse's sheet toggle (a chevron): its box, its icon, and how far its top sits above the games row's. */
export const SHEET_TOGGLE = { w: 44, h: 24, lift: 18 + 24, icon: { w: 28, h: 12 } } as const;

/** Home's root variable for the give-way (home/giveWay, #55): the page moves up by `need` (--gh-give). */
export function giveWayVars(g: GiveWay): Record<string, string> {
    return { '--gh-give': `${g.need > 0 ? -g.need : 0}px` };
}

/**
 * The stack's two offsets on a canvas `logicalHeight` tall: what the air above the title gives for the room the default
 * growth takes (home/giveWay, #55), and stackShift computed on the stack as it is after that, so a legend taller than the
 * reserve (which stackShift already answers by moving up) is not counted twice. With room to spare: today's shift.
 */
export function homeStack(logicalHeight: number, legendReserve: number, feed: boolean): { shift: number; give: GiveWay } {
    const give = giveWay(roomMissing(logicalHeight, legendReserve));
    return { shift: stackShift(logicalHeight + give.need, legendReserve, feed), give };
}

/** The most the stack moves down, whatever the screen. */
export const MAX_STACK_SHIFT = 120;
/** ...and the most it moves up when Steam's legend is taller than the 46 reserve (handheld: 72 logical px). */
export const MIN_STACK_SHIFT = -60;

/**
 * With the bottom section hidden (no tab strip), how much further the stack moves down so the recents row ends where
 * the tab strip ended (`tabClearance` above the legend) instead of leaving its room empty: 733.6 - 688 -> 45.
 */
export const FEEDLESS_DROP = Math.floor(FEED_SHEET.tabsTop + FEED_SHEET.tabHeight - RECENTS_BOTTOM);

/**
 * How far the whole Home stack (title block, actions, recents, tabs, feed) moves down on a canvas `logicalHeight`
 * tall, so the tab strip ends `tabClearance` above the legend reserve instead of leaving slack under it. Every gap
 * between elements stays; the raised sheet keeps its old place (the page rises by `raise` plus the shift). Whole px,
 * never upwards, at most MAX_STACK_SHIFT. 1440 x 810.75 (1080p TV, Ally) -> 13, 1280 x 800 (Deck) -> 2.
 * `feed` false (the bottom section hidden): FEEDLESS_DROP more, so the recents row takes the tab strip's place.
 */
export function stackShift(logicalHeight: number, legendReserve: number = FEED_SHEET.legendReserve, feed = true): number {
    if (!Number.isFinite(logicalHeight)) return feed ? 0 : FEEDLESS_DROP;
    return clampedShift(logicalHeight, legendReserve) + (feed ? 0 : FEEDLESS_DROP);
}

function clampedShift(logicalHeight: number, legendReserve: number): number {
    const f = FEED_SHEET;
    const legend = Number.isFinite(legendReserve) ? legendReserve : f.legendReserve;
    const slack = logicalHeight - legend - f.tabClearance - (f.tabsTop + f.tabHeight);
    // Downwards into the slack, or upwards (to MIN_STACK_SHIFT) when the legend is taller than the reserve, so the tab
    // strip always ends `tabClearance` above the real legend. A short screen with the default legend never moves up.
    return Math.min(MAX_STACK_SHIFT, Math.max(legend > f.legendReserve ? MIN_STACK_SHIFT : 0, Math.floor(slack)));
}

/**
 * The status bar's rules (clock, battery, connection and your online dot): Spotlight Home's, and the game page's own copy of the
 * bar (components/GameStatusBar), drawn on the same scaled canvas so both look and sit alike.
 */
export function statusRules(): string[] {
    return [

        // Status bar (clock, battery, connection) in Steam's top strip: the store pill's glass pill, then your online status
        // dot over Steam's top-bar avatar (StatusBar sets --gh-status-right / --gh-status-cy from statusPlacement; STATUS_BAR is the fallback), above the page (the raised feed slides under it). It all fades out while
        // focus is in Steam's own top bar (`.gh-status-away`, set by SpotlightHome).
        rule('.gh-status', `position: absolute; right: var(--gh-status-right, ${STATUS_BAR.right}px); top: calc(var(--gh-status-cy, ${STATUS_BAR.centreY}px) - ${SOURCE_PILL.height / 2}px);
            height: ${SOURCE_PILL.height}px; display: flex; align-items: center; gap: var(--gh-status-gap, ${STATUS_BAR.gap}px); margin: 0; padding: 0;
            pointer-events: none; z-index: 1; opacity: 1; transition: opacity ${STATUS_FADE_MS}ms ease;
            transform: scale(var(--gh-status-k, 1)); transform-origin: 100% 50%`),
        rule('.gh-status-dot', `flex: 0 0 auto; width: ${PERSONA_DOT.size}px; height: ${PERSONA_DOT.size}px; margin: 0; padding: 0; border-radius: 50%;
            box-shadow: 0 0 0 2px rgba(12,16,22,.55), 0 1px 4px rgba(0,0,0,.4); transition: background ${ACCENT_MS}ms`),
        ...(Object.keys(PERSONA_DOT_COLOURS) as PersonaDot[]).map((dot) => rule(`.gh-status-dot-${dot}`, `background: ${PERSONA_DOT_COLOURS[dot]}`)),
        rule('.gh-status.gh-status-away', 'opacity: 0'),
        rule('.gh-status-pill', `display: inline-flex; align-items: center; gap: 14px; margin: 0; border-radius: 999px; border: 1px solid; color: rgba(255,255,255,.9);
            line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums; ${sourcePillLook(px)} font-weight: 600`),
        rule('.gh-status-item', 'display: inline-flex; align-items: center; gap: 6px; margin: 0; padding: 0'),
        rule('.gh-status-item svg', 'flex: 0 0 auto; height: 18px; width: auto; display: block'),
        // Your avatar in the pill (#9): a circle, ringed in your status colour (set inline), the pill grows to fit it.
        rule('.gh-status-avatar', 'flex: 0 0 auto; width: 26px; height: 26px; box-sizing: border-box; border: 2px solid var(--gh-avatar-ring, #fff); border-radius: 50%; background-size: cover; background-position: center'),
        rule('.gh-status-low', `color: ${CLOUD_COLOURS.bad}`),
        rule('.gh-status-offline svg', 'opacity: .6'),
    ];
}

/** The status bar's CSS on its own, for the game page. */
export function statusCss(): string {
    return [
        ...statusRules(),
        // One status bar at a time (components/GameStatusBar portals each host to the body): while Home's is up, the page's,
        // mounted later, stays invisible and takes over in place when Home's goes (two stacked drew their white text twice,
        // brighter, as the open transition's copy faded over them).
        rule('.gg-status-host ~ .gg-status-host', 'visibility: hidden'),
    ].join('\n');
}

/**
 * Spotlight Home's stylesheet. Pure, so it can be tested. Every class starts with `gh-`.
 * Positions are logical px on the authored canvas (1440x810 or 1280x800); `.gh-canvas` is scaled to the
 * screen. Steam's own top bar (52) and button legend (46) stay: `.gh-safe` is the area between them. Every top
 * below is before the stack shift (stackShift: the page moves down into the slack under the tab strip).
 * Handoff tokens: ink #07090c, scrim rgb(5,7,10), glass rgba(12,16,22,.38) + blur(14px), radii 8/12/16/999.
 * `cardScale` sizes the recents row (recentsLayout.recentsGeometry: 1.3 handheld, 1.6 docked).
 */
export function homeCss(cardScale: number = CARD_SCALE_HANDHELD): string {
    const geo = recentsGeometry(cardScale);
    const k = geo.fine;
    // The recents edge glow and shadows scale with the cards; the 1px ring stays crisp.
    const capGlow = `0 0 0 1px var(--glance-accent), 0 ${k(CAP_GLOW.y)}px ${k(CAP_GLOW.blur)}px ${k(CAP_GLOW.spread)}px var(--glance-accent)`;
    const capShadow = `0 ${k(6)}px ${k(20)}px -${k(10)}px rgba(0,0,0,.6)`;
    const t = TITLE_BLOCK;
    return [
        `@property --glance-accent { syntax: '<color>'; inherits: true; initial-value: ${DEFAULT_ACCENT}; }`,
        `@property --gh-card-accent { syntax: '<color>'; inherits: true; initial-value: ${DEFAULT_ACCENT}; }`,
        `@keyframes gh-fade-in { from { opacity: 0; } to { opacity: 1; } }`,
        rule('.gh-root', `--gh-side: ${SIDE_INSET.handheld}px; --gh-row: ${SIDE_INSET.handheld - ROW_OFFSET}px; --gh-pill: ${PILL_INSET.handheld}px; --glance-accent: ${DEFAULT_ACCENT}; --glance-accent-text: ${DEFAULT_ACCENT}; --gh-top: 52px; --gh-bottom: ${FEED_SHEET.legendReserve}px; --gh-shift: 0px; --gh-dim: 0;
            --gh-ink: #07090c; --gh-on-accent: #0b0d10; --gh-r-capsule: 8px; --gh-r-card: 12px; --gh-r-panel: 16px; --gh-r-pill: 999px;
            transition: none;
            position: absolute; inset: 0; overflow: hidden; overflow: clip; z-index: 0; background: var(--gh-ink); color: #fff;
            font-family: inherit; text-align: left; line-height: normal; letter-spacing: normal; text-transform: none`),
        // A finger on Home is Home's own (home/useRowDrag, the sheet swipes): no browser panning or pull gestures.
        rule('.gh-root', 'touch-action: none'),
        rule('.gh-root *', 'box-sizing: border-box'),

        // Hero art: full-bleed on the real screen (not the scaled canvas). Each new art fades in over the last.
        rule('.gh-hero', 'position: absolute; inset: 0; overflow: hidden; pointer-events: none'),
        rule('.gh-hero-layer', `position: absolute; inset: 0; will-change: opacity; animation: gh-fade-in ${HERO_FADE_MS}ms ease both`),
        // A layer whose fade a newer switch interrupted: shown at once (HeroBackground keeps at most two layers).
        rule('.gh-hero-layer.gh-hero-settled', 'animation: none; opacity: 1'),
        rule('.gh-hero-none', 'background: var(--gh-ink)'),
        rule('.gh-hero-full', 'position: absolute; inset: 0; background-size: cover; background-position: center 30%; background-repeat: no-repeat'),
        // Fit (settings heroFit): the whole art at the top centre, fading (heroFit.fitMask, --gh-hero-mask) into a blurred copy
        // of it (the visual language's art-fill), drawn past the box so its blurred edges stay off screen.
        rule('.gh-hero-full.gh-hero-fit', 'isolation: isolate'),
        rule('.gh-hero-full.gh-hero-fit::before', `content: ""; position: absolute; inset: -120px; background-image: inherit; background-size: cover; background-position: center;
            background-repeat: no-repeat; filter: ${ART_FILL_FILTER}; pointer-events: none`),
        rule('.gh-hero-full.gh-hero-fit::after', `content: ""; position: absolute; inset: 0; background-image: inherit; background-size: contain; background-position: center top;
            background-repeat: no-repeat; -webkit-mask-image: var(--gh-hero-mask); mask-image: var(--gh-hero-mask); pointer-events: none`),
        rule('.gh-hero-blur', 'position: absolute; inset: -60px; background-size: cover; background-position: center; filter: blur(42px) saturate(1.25) brightness(.8)'),
        rule('.gh-hero-sharp', `position: absolute; right: 0; top: 0; height: 100%; width: 62%; background-size: cover; background-position: center 30%;
            background-repeat: no-repeat; opacity: .92;
            -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 45%); mask-image: linear-gradient(90deg, transparent 0%, #000 45%)`),

        // Scrims: the game page's own shading (themeCss PAGE_SCRIMS; Michael: Cronos's page shading, on Home by default),
        // so the art looks the same on both and opening a game never changes it; a flat dim only under the feed sheet.
        rule('.gh-scrim', 'position: absolute; inset: 0; pointer-events: none'),
        rule('.gh-scrim-dim', `background: rgba(${SCRIM},var(--gh-dim)); transition: background ${SHEET_MS}ms`),
        rule('.gh-scrim-page', `background: ${STEAM_TOP_GRADIENT}, ${PAGE_SCRIMS}`),

        // Scaled canvas; width, height and transform are set inline from homeCanvas().
        rule('.gh-canvas', 'position: absolute; left: 0; top: 0; transform-origin: 0 0'),
        rule('.gh-safe', 'position: absolute; left: 0; right: 0; top: var(--gh-top); bottom: var(--gh-bottom)'),
        // The page holds the whole stack; it sits --gh-shift lower (stackShift, set inline by SpotlightHome), so every
        // element moves as one unit and keeps its gaps.
        rule('.gh-page', `position: absolute; left: 0; right: 0; top: calc(var(--gh-shift) + var(--gh-give, 0px)); height: 100%; transform: none; transition: transform ${SHEET}, opacity 300ms`),
        // Focus in the tabs or feed: the page rises 440 plus the shift, so the raised sheet keeps its place (tabs at 260, cards at 316).
        // The tab strip (reachable with Down) is out of sight until the sheet is raised; it fades in with the rise. The stack sits where the
        // tab strip would have been (stackShift without the feed), so the recents row ends there.
        rule('.gh-page .gh-tabs', 'transition: opacity 300ms'),
        rule('.gh-page:not(.gh-page-up) .gh-tabs', 'opacity: 0'),
        rule('.gh-page.gh-page-up', `transform: translateY(calc(-1 * var(--gh-raise, ${FEED_SHEET.raise}px) - var(--gh-shift) - var(--gh-give, 0px)))`),

        // Title block (handoff: left 56, top 118 from the screen top, width 620, gap 18): title slot, eyebrow, chips, actions.
        rule('.gh-title-block', `position: absolute; left: var(--gh-side, ${SIDE_INSET.handheld}px); top: calc(${t.top}px - var(--gh-top)); width: 620px; display: flex; flex-direction: column; gap: ${t.gap}px; margin: 0; padding: 0`),
        // The title's slot: always two lines tall, the title aligned to its bottom, so a one-line title leaves room above
        // it and nothing below moves (titleBlockLayout). Not clipped: the title's own bleed reaches past it.
        rule('.gh-title-slot', `height: ${t.titleLines * t.titleSize}px; display: flex; flex-direction: column; justify-content: flex-end; margin: 0; padding: 0; overflow: visible`),
        // Eyebrow, between the title and the chips: always one line (ellipsis), so it never pushes the chips.
        rule('.gh-eyebrow', `margin: 0; font-size: 12px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; line-height: 1.2; height: ${t.eyebrow}px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--glance-accent-text)`),
        // At most two lines with an ellipsis (TITLE_BLOCK). The clip gets a bleed on every side for descenders and the
        // shadow; equal negative margins keep the layout box at exactly two 58px lines.
        rule('.gh-title', `margin: -${t.titleBleed}px; padding: ${t.titleBleed}px; font-size: ${t.titleSize}px; line-height: 1; font-weight: 800; letter-spacing: -.02em; text-wrap: balance;
            text-shadow: 0 4px 30px rgba(0,0,0,.4); color: #fff; overflow-wrap: anywhere;
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${t.maxTitleLines}; overflow: hidden; flex: 0 0 auto`),
        // The logo option (GameTitle): the game's logo in the title's place, bottom-left in the slot; it rises like a longer
        // title. Its size is GameTitle's inline area sizing (at most LOGO_BOX), the same as on the game page: no size here,
        // since every declaration of this sheet is !important and would override it.
        rule('.gh-logo', `display: block; flex: 0 0 auto; margin: 0; padding: 0;
            object-fit: contain; object-position: left bottom; align-self: flex-start; filter: drop-shadow(0 4px 24px rgba(0,0,0,.45))`),
        // One row of fixed height, present even with no chips yet, so the actions never move.
        rule('.gh-chips', `height: ${t.chipRow}px; display: flex; gap: 10px; flex-wrap: nowrap; align-items: stretch; margin: 0; padding: 0`),
        rule('.gh-chip', `display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; min-width: 104px; border-radius: var(--gh-r-card); ${GLASS}`),
        rule('.gh-chip-label', 'font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; line-height: 1.2; color: rgba(255,255,255,.62)'),
        rule('.gh-chip-value', 'font-size: 20px; font-weight: 700; line-height: 1.2; color: #fff; white-space: nowrap'),
        rule('.gh-chip-bar', 'height: 3px; border-radius: 2px; background: rgba(255,255,255,.14); overflow: hidden'),
        rule('.gh-chip-fill', `height: 100%; background: var(--glance-accent); transition: width ${ACCENT_MS}ms`),

        // Store pill (icon + name) at the right edge, centred on the action row: the game page's pill (styles/sourcePill.ts).
        rule('.gh-source', `position: absolute; right: var(--gh-pill, ${SOURCE_PILL.right}px); top: calc(${sourcePillTop()}px - var(--gh-top)); display: inline-flex; align-items: center;
            margin: 0; border-radius: 999px; border: 1px solid; color: #fff; line-height: 1; white-space: nowrap; pointer-events: none; ${sourcePillLook(px)}`),
        rule('.gh-source-icon', `flex: 0 0 auto; ${sourcePillIcon(px)}`),
        // A game from the family library: its pill (data/family) just left of the store pill, inside it so it follows it.
        rule('.gh-family', `position: absolute; right: calc(100% + 10px); top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center;
            margin: 0; border-radius: 999px; border: 1px solid; color: #fff; line-height: 1; white-space: nowrap; ${sourcePillLook(px)}`),
        rule('.gh-family-icon', `flex: 0 0 auto; ${sourcePillIcon(px)}`),
        rule('.gh-copy-choice, .gh-store-choice', 'pointer-events: auto; cursor: pointer; transition: transform 250ms, box-shadow 250ms'),
        rule('.gh-copy-plus', 'display: block; flex: 0 0 auto; width: 12px; height: 12px; margin-left: 8px'),
        rule('.gh-source.gh-source-selectable', 'padding: 0; border: 0; background: transparent; backdrop-filter: none'),
        rule('.gh-store-choice', `display: inline-flex; align-items: center; border: 1px solid; border-radius: 999px; color: #fff; ${sourcePillLook(px)}`),
        rule(':where(html:not([data-gg-mouse])) .gh-copy-choice.gh-pill-focus, :where(html:not([data-gg-mouse])) .gh-copy-choice:focus, :where(html:not([data-gg-mouse])) .gh-store-choice.gh-pill-focus, :where(html:not([data-gg-mouse])) .gh-store-choice:focus', 'box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 14px 40px -8px var(--glance-accent)'),
        rule(`${NOT_MOUSE} .gh-copy-choice.gh-pill-focus, ${NOT_MOUSE} .gh-copy-choice:focus`, `transform: translateY(-50%) scale(${PAGE_LAYOUT.focusScale})`),
        rule(`${NOT_MOUSE} .gh-store-choice.gh-pill-focus, ${NOT_MOUSE} .gh-store-choice:focus`, `transform: scale(${PAGE_LAYOUT.focusScale})`),
        rule('html[data-gg-mouse] .gh-copy-choice:hover, html[data-gg-mouse] .gh-store-choice:hover', 'box-shadow: 0 0 0 2px rgba(255,255,255,.45)'),
        ...statusRules(),
        ...openingRules(),
        // Actions: Play pill 250x54 and three 54px circles, gap 12, margin-top 8.
        rule('.gh-actions', `display: flex; gap: 12px; align-items: center; margin: ${t.actionsMargin}px 0 0 0; padding: 0`),
        rule('.gh-btn', `height: ${t.button}px; min-width: 0; margin: 0; padding: 0; border-radius: var(--gh-r-pill); display: flex; align-items: center; justify-content: center; gap: 12px;
            font-size: 19px; font-weight: 700; line-height: 1; color: #fff; background: rgba(12,16,22,.4); border: 1px solid rgba(255,255,255,.18);
            backdrop-filter: blur(12px); box-shadow: none; transform: none; outline: none; cursor: pointer;
            transition: transform 250ms, box-shadow 250ms, background ${ACCENT_MS}ms, border-color ${ACCENT_MS}ms`),
        rule('.gh-btn-circle', 'width: 54px; flex: 0 0 54px; font-size: 22px'),
        // Steam's own controller and gear icons (steamIcons), at the page's size, so the open transition's hand-over changes nothing.
        rule('.gh-steam-icon svg', `width: ${PAGE_LAYOUT.circleIcon}px; height: ${PAGE_LAYOUT.circleIcon}px; margin: 0; fill: currentColor`),
        // Cloud circle: the same circle as the others; only its icon is coloured by the sync state (cloud.CLOUD_COLOURS,
        // light tints for the dark translucent fill) with a dark halo so it reads over bright art too.
        rule('.gh-btn-cloud svg', `width: ${PAGE_LAYOUT.cloudIcon}px; height: ${PAGE_LAYOUT.cloudIcon}px; margin: 0; fill: currentColor; filter: drop-shadow(0 0 1.5px rgba(0,0,0,.7))`),
        // The state is a badge at the top right (#64): the glyph stays white, the dot takes the state colour.
        ...(Object.keys(CLOUD_COLOURS) as CloudTone[]).map((tone) => rule(`.gh-btn-cloud.gh-cloud-${tone}`, `--gh-cloud-dot: ${CLOUD_COLOURS[tone]}`)),
        rule('.gh-btn-cloud:not(.gh-cloud-uni)', 'position: relative'),
        rule('.gh-btn-cloud:not(.gh-cloud-uni)::after', `content: ""; position: absolute; top: ${CLOUD_DOT.inset}px; right: ${CLOUD_DOT.inset}px; width: ${CLOUD_DOT.size}px; height: ${CLOUD_DOT.size}px;
            box-sizing: content-box; border-radius: 50%; background: var(--gh-cloud-dot); border: ${CLOUD_DOT.ring}px solid ${CLOUD_DOT.ringColour}; pointer-events: none`),
        // A Unifideck game's cloud button wears Unifideck's own look (data/unifideckCloud, as its page's button): a white
        // Font Awesome glyph at the circles' size, its state's ring inside the circle (focus shows ours instead), dimmed
        // without cloud support; its breathing is Unifideck's own class.
        rule('.gh-btn-cloud.gh-cloud-uni', 'color: #fff'),
        rule('.gh-btn-cloud.gh-cloud-uni svg', `width: ${PAGE_LAYOUT.circleIcon}px; height: ${PAGE_LAYOUT.circleIcon}px; filter: none`),
        rule('.gh-btn-cloud.gh-cloud-uni:not(.gh-focus)', 'box-shadow: 0 0 0 2px var(--gh-uni-ring, transparent) inset'),
        // Opening, its ring grows with the circle to the page's 2 CSS px (openMotion --gho-uni-ring), not to 2 canvas px.
        rule('.gh-root[data-gh-opening="morph"] .gh-btn-cloud.gh-cloud-uni:not(.gh-focus)', 'box-shadow: 0 0 0 var(--gho-uni-ring, 2px) var(--gh-uni-ring, transparent) inset'),
        rule('.gh-btn-cloud.gh-cloud-uni-dim', 'opacity: .5'),
        rule('.gh-btn-cloud.gh-cloud-uni svg.gh-uni-badge', 'width: 13px; height: 13px'),
        // White words and glyph on the accent, as on the game page's Play.
        rule('.gh-btn-play', `width: ${HOME_PILL.width}px; flex: 0 0 ${HOME_PILL.width}px; background: var(--glance-accent); border-color: var(--glance-accent); color: #fff`),
        // The pill fills with the download progress: the shared darker layer (styles/downloadFill) from the left, clipped to
        // the pill's radius, under the icon and label, exactly as on the details page. No bar below.
        rule('.gh-btn-play', 'position: relative; overflow: hidden'),
        // The download pill's text and glyph are white, as on the details page.
        rule('.gh-btn-play.gh-btn-dl', 'color: #fff'),
        rule('.gh-btn-fill', `position: absolute; left: 0; top: 0; bottom: 0; background: ${DOWNLOAD_FILL_COLOR}; pointer-events: none; transition: width ${DOWNLOAD_FILL_MS}ms linear`),
        rule('.gh-btn-play > .gh-btn-icon, .gh-btn-play > .gh-btn-label', 'position: relative'),
        // The Play pill, laid out as the details page's: the glyph at the left, the label left-aligned after it.
        rule('.gh-btn-play', `justify-content: flex-start; padding: 0 ${HOME_PILL.padX}px; gap: ${HOME_PILL.gap}px; font-size: ${HOME_PILL.font}px`),
        rule('.gh-btn-play svg', `width: ${HOME_PILL.icon}px; height: ${HOME_PILL.icon}px; margin: 0`),
        rule('.gh-btn-icon', 'display: flex; align-items: center; justify-content: center; line-height: 1'),
        rule('.gh-btn-play .gh-btn-icon', `font-size: ${HOME_PILL.icon}px`),
        rule(`${NOT_MOUSE} .gh-btn.gh-focus`, `box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 14px 40px -8px var(--glance-accent); transform: scale(${PAGE_LAYOUT.focusScale})`),
        // A mouse over a button (mouseMode, never a finger or the controller): the game cards' hover ring, ring only (focused
        // too: the focus looks are off in mouse mode, NOT_MOUSE). The stream
        // segment is part of the Play pill: the pill takes the ring, as it takes the focus look.
        rule(`${HOVER} .gh-btn:hover:not(.gh-btn-stream)`, `box-shadow: ${hoverRing('2px')}`),
        rule(`${HOVER} .gh-actions > .gh-btn-play:has(+ .gh-btn-stream:hover)`, `box-shadow: ${hoverRing('2px')}`),
        // The Play pill grows by what a circle grows (themeCss.pillFocusScale), so its gap to the circles stays.
        rule(`${NOT_MOUSE} .gh-actions > .gh-btn-play.gh-focus`, `transform: scale(${pillFocus.x}, ${pillFocus.y})`),
        // A game on more than one device (home/streaming): the pill ends in the page's "Play from" segment (a divider and
        // Steam's arrow glyph, part of the pill, so it grows with it), and a focusable arrow lies over it, right after Play
        // in the row (the row's gap pulled back). Focused, the segment lights as the page's does; no ring or growth of its own.
        rule('.gh-btn-play > .gh-play-arrow', `position: absolute; top: -1px; bottom: -1px; right: -1px; width: ${HOME_PILL.arrow}px; display: flex; align-items: center; justify-content: center;
            border-left: 1px solid rgba(4,17,12,.25); pointer-events: none`),
        rule('.gh-play-arrow svg', `width: ${HOME_PILL.arrowGlyph}px; height: ${HOME_PILL.arrowGlyph}px; margin: 0; fill: currentColor`),
        rule('.gh-actions > .gh-btn-stream', `position: relative; z-index: 1; flex: 0 0 ${HOME_PILL.arrow}px; width: ${HOME_PILL.arrow}px; margin-left: -${HOME_PILL.arrow + 12}px; background: transparent;
            border: none; border-radius: 0 999px 999px 0; backdrop-filter: none; box-shadow: none; transform: none`),
        rule(`${NOT_MOUSE} .gh-actions > .gh-btn-stream.gh-focus`, 'background: transparent; box-shadow: none; transform: none'),
        // The arrow focused: the whole pill shows Home's focus, as the page's pill does for its arrow; the segment is tinted.
        rule(`${NOT_MOUSE} .gh-actions > .gh-btn-play:has(+ .gh-btn-stream.gh-focus)`, `box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 14px 40px -8px var(--glance-accent); transform: scale(${pillFocus.x}, ${pillFocus.y})`),
        rule(`${NOT_MOUSE} .gh-actions > .gh-btn-play:has(+ .gh-btn-stream.gh-focus) > .gh-play-arrow`, 'background: rgba(255,255,255,.28)'),

        // Recents row (handoff: left 44, 140 tall; times the card scale, its bottom stays at 688 and it grows upwards
        // from geo.top). Overflow stays visible: earlier capsules scroll off to the left edge.
        // Every size here derives from recentsGeometry; left, width, dim and ghost opacity are inline. The row is one
        // gamepad focusable (RecentsRow); taps select or open a card, drags step the selection (useRowDrag). It handles
        // both axes itself (touch-action: none: a vertical swipe raises the sheet), and takes no taps under the sheet or
        // while a game opens (the root's own pointer-events: none doesn't reach a child that sets auto).
        rule('.gh-recents', `position: absolute; left: var(--gh-row, ${SIDE_INSET.handheld - ROW_OFFSET}px); right: 0; top: calc(${geo.top}px - var(--gh-top)); height: ${geo.capsuleH}px; margin: 0; padding: 0; pointer-events: auto; touch-action: none; user-select: none`),
        rule('.gh-page-up .gh-recents', 'pointer-events: none'),
        // The sheet toggle, for a mouse only (mouseMode; a finger swipes, the controller presses Down / B): a chevron centred
        // above the games row, its bottom 18 px above the cards (3 was too tight, Michael; the buttons' row ends left of it,
        // so it may rise past their bottom; no room for a circle), drawn over the tabs row (which spans the page and took its
        // clicks once the sheet was up), that raises the feed
        // sheet; with the sheet up it rides onto the middle of the tabs row, which the tab names leave free, pointing up, and
        // brings the games back. One element, moved and turned by transform only (motion.ts), with the sheet.
        rule('.gh-sheet-toggle', `position: absolute; left: 50%; top: calc(${geo.top - SHEET_TOGGLE.lift}px - var(--gh-top)); width: ${SHEET_TOGGLE.w}px; height: ${SHEET_TOGGLE.h}px;
            margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.7); filter: drop-shadow(0 1px 3px rgba(0,0,0,.6));
            z-index: 3; cursor: pointer; opacity: 0; pointer-events: none; transform: translate(-50%, 0); transition: transform ${SHEET}, opacity 200ms, color 150ms`),
        rule('.gh-sheet-toggle svg', `width: ${SHEET_TOGGLE.icon.w}px; height: ${SHEET_TOGGLE.icon.h}px; margin: 0; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round`),
        rule(`${HOVER} .gh-sheet-toggle`, 'opacity: 1; pointer-events: auto'),
        rule(`${HOVER} .gh-sheet-toggle:hover`, 'color: #fff'),
        rule('.gh-page-up .gh-sheet-toggle', `transform: translate(-50%, ${Math.round((FEED_SHEET.tabsTop + (FEED_SHEET.tabHeight - SHEET_TOGGLE.h) / 2 - (geo.top - SHEET_TOGGLE.lift)) * 100) / 100}px) rotate(180deg)`),
        rule('.gh-root[data-gh-opening] .gh-sheet-toggle', 'opacity: 0'),
        rule('.gh-root[data-gh-opening] .gh-recents', 'pointer-events: none'),
        rule('.gh-recents-track', `position: absolute; inset: 0; transition: transform ${SLIDE}`),
        rule('.gh-recents-drag .gh-recents-track', 'transition: none'),
        rule('.gh-cap', `position: absolute; top: 0; height: ${geo.capsuleH}px; margin: 0; padding: 0; border-radius: ${k(8)}px; overflow: hidden; background: #111;
            border: none; --gh-edge: rgba(255,255,255,.08); box-shadow: ${capShadow}; outline: none;
            transition: left ${SLIDE}, width ${SLIDE}, opacity ${CAP_STATE_MS}ms, filter ${CAP_STATE_MS}ms`),
        // The 1px edge is drawn OVER the art (::after, inset ring) instead of a border beside it: with a border the art
        // ended inside it at a fractional device pixel, leaving a bright 1-device-px row of un-shaded art at the bottom.
        rule('.gh-cap::after', `content: ''; position: absolute; inset: 0; margin: 0; padding: 0; border-radius: inherit; pointer-events: none;
            box-shadow: inset 0 0 0 1px var(--gh-edge); transition: box-shadow ${CAP_STATE_MS}ms`),
        rule('.gh-cap.gh-cap-focus', `box-shadow: ${capGlow}; --gh-edge: rgba(255,255,255,.35)`),
        rule('.gh-cap-blur', `position: absolute; inset: -${k(30)}px; background-size: cover; background-position: center; filter: blur(${k(22)}px) brightness(.75)`),
        // Wide art is mounted only on the expanded capsule, after (over) the portrait, and fades in. The portrait is
        // never hidden: loaded wide art is opaque and covers it; if every wide url fails, the portrait shows through.
        rule('.gh-cap-art', `position: absolute; inset: 0; background-size: cover; background-position: center 30%; background-repeat: no-repeat; animation: gh-fade-in ${CAP_ART_FADE_MS}ms ease both`),
        rule('.gh-cap-cover', `position: absolute; right: 0; top: 0; width: ${geo.capsuleW}px; height: 100%; background-size: cover; background-position: center; background-repeat: no-repeat; opacity: 1`),
        rule('.gh-cap-bar', `position: absolute; left: 0; right: 0; bottom: 0; height: ${k(3)}px; background: var(--glance-accent); opacity: 0; transition: opacity 250ms, background ${ACCENT_MS}ms`),
        rule('.gh-cap.gh-cap-focus .gh-cap-bar', 'opacity: 1'),
        // A bar nobody sees takes a new accent at once (each L1/R1 step changes it: ~30 invisible colour transitions a step).
        rule('.gh-cap:not(.gh-cap-focus) .gh-cap-bar', 'transition: opacity 250ms'),
        // "New" (a game new to the library) and "Demo" marks: small light pills at the top left, over the art; side by side
        // on the wide card, one under the other on a capsule.
        rule('.gh-cap-marks', `position: absolute; left: ${k(8)}px; top: ${k(8)}px; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: flex-start; gap: ${k(4)}px; pointer-events: none`),
        rule('.gh-cap-wide .gh-cap-marks', 'flex-direction: row'),
        rule('.gh-cap-new', `position: relative; margin: 0; padding: ${k(3)}px ${k(7)}px; border-radius: 999px;
            font-size: ${k(8.5)}px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; line-height: 1.2; white-space: nowrap;
            color: #0b0d10; background: rgba(255,255,255,.92); box-shadow: 0 ${k(2)}px ${k(8)}px rgba(0,0,0,.35); pointer-events: none`),
        // While the card row has focus the selected card (or the Library card) is the focused one: a 2px white ring just
        // outside it and an accent glow even on every side (no downward offset, no bar along its bottom edge: on the Ally
        // those read as the card being cut at the bottom). Unfocused it keeps its resting look. Only the selected card: in
        // Steam's row style the wide card is the first game, selected or not.
        rule('.gh-recents-focus .gh-cap-sel, .gh-recents-focus .gh-cap-lib-on', `box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 0 ${k(28)}px ${k(2)}px var(--glance-accent); --gh-edge: rgba(255,255,255,.35)`),
        // The selected card's brighter edge, wide or narrow (a fast L1/R1 run, home/fastCycle, keeps it narrow).
        rule('.gh-cap-sel', '--gh-edge: rgba(255,255,255,.35)'),
        // A game not installed here (RecentsRow.greyedOut) is grey until selected, as Steam's library shows them.
        rule('.gh-cap-off:not(.gh-cap-sel)', 'filter: grayscale(1) brightness(.7)'),
        // A mouse over a card (home/mouse.hoverKey, never a finger): a faint white ring, half the selection's and without
        // its accent glow, and a little brighter; an uninstalled game loses some of its grey. Not the selected card.
        rule('.gh-cap.gh-cap-hover:not(.gh-cap-sel):not(.gh-cap-lib-on)', `box-shadow: ${hoverRing('2px')}, ${capShadow}; filter: brightness(1.12)`),
        rule('.gh-cap-off.gh-cap-hover:not(.gh-cap-sel)', 'filter: grayscale(.5) brightness(.9)'),
        // The way back (B from a page): the art is there at once; Home's title, chips, buttons and row fade in over it. Never
        // as one layer: a parent fading (opacity under 1) cuts the glass inside it off from the art, which showed unblurred
        // until the fade ended (Michael on the Ally). The glass fades itself, and around it the largest parts that hold no
        // glass, each once; from transparent to its own opacity (what rests hidden stays hidden). Not in the open's copy.
        // A cancelled open (B during the opening animation) uses the same fade.
        `@keyframes gh-return-in { from { opacity: 0; } }`,
        rule(`.gh-root:is(.gh-back, [${RETURN_ATTR}]):not(.gh-bridge) .gh-safe :is(${HOME_GLASS.join(', ')}), .gh-root:is(.gh-back, [${RETURN_ATTR}]):not(.gh-bridge) :is(.gh-safe, .gh-safe :has(${HOME_GLASS.join(', ')})) > :not(:has(${HOME_GLASS.join(', ')})):not(${HOME_GLASS.join(', ')})`,
            `animation: gh-return-in ${RETURN_TIMINGS.fade}ms ease backwards`),
        rule('.gh-recents-snap .gh-cap', `transition: left ${SETTLE_WIDEN_MS}ms ${SLIDE_EASE}, width ${SETTLE_WIDEN_MS}ms ${SLIDE_EASE}, opacity ${CAP_STATE_MS}ms, filter ${CAP_STATE_MS}ms`),
        // "View more in your Library" card.
        rule('.gh-cap-lib', '--gh-edge: rgba(255,255,255,.14)'),
        rule('.gh-cap-lib.gh-cap-lib-on', '--gh-edge: rgba(255,255,255,.35)'),
        rule('.gh-lib-body', `position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${k(10)}px; padding: ${k(12)}px;
            text-align: center; background: rgba(12,16,22,.55); backdrop-filter: blur(16px)`),
        rule('.gh-lib-grid', `display: grid; grid-template-columns: repeat(2, ${k(12)}px); gap: ${k(4)}px`),
        rule('.gh-lib-cell', `height: ${k(16)}px; border-radius: ${k(2)}px; background: rgba(255,255,255,.7)`),
        rule('.gh-lib-cell-accent', `background: var(--glance-accent); transition: background ${SHEET_MS}ms`),
        rule('.gh-lib-label', `font-size: ${k(10.5)}px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; line-height: 1.4; text-wrap: balance; color: #fff`),
        // Loop preview: the first games again, decorative only (not focusable).
        // Opacity is inline per ghost (recentsLayout.ghostOpacity): .4 (.55 on the Library card) fading to .08.
        rule('.gh-ghost', 'cursor: default; --gh-edge: rgba(255,255,255,.06); box-shadow: none; filter: grayscale(.6) brightness(.75)'),
        rule('.gh-ghost.gh-cap-off', 'filter: grayscale(1) brightness(.65)'),
        rule('.gh-ghost-badge', `position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${k(6)}px; background: rgba(5,7,10,.45)`),
        rule('.gh-ghost-icon', `width: ${k(36)}px; height: ${k(36)}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: ${k(20)}px; font-weight: 700; line-height: 1; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.35); color: #fff`),
        rule('.gh-ghost-label', `font-size: ${k(9.5)}px; font-weight: 800; letter-spacing: .18em; line-height: 1.2; text-align: center; color: #fff`),
        rule('.gh-btn-library', 'width: 280px; flex: 0 0 280px; background: var(--glance-accent); border-color: var(--glance-accent); color: var(--gh-on-accent)'),

        // Feed sheet: tab strip (handoff: top 700 from the screen top plus the stack shift, ending 18 above the legend reserve at rest).
        rule('.gh-tabs', `position: absolute; left: var(--gh-row, ${SIDE_INSET.handheld - ROW_OFFSET}px); right: var(--gh-row, ${SIDE_INSET.handheld - ROW_OFFSET}px); top: calc(${FEED_SHEET.tabsTop}px - var(--gh-top)); display: flex; justify-content: flex-start; gap: 30px; margin: 0; padding: 0; pointer-events: none`),
        // Out of sight under the games row at rest: taps there are the row's; with the sheet up a tap picks a tab.
        rule('.gh-page-up .gh-tabs', 'pointer-events: auto'),
        rule('.gh-tab', `position: relative; margin: 0; padding: 8px 2px 10px; font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
            line-height: 1.2; white-space: nowrap; color: rgba(255,255,255,.6); background: transparent; outline: none; cursor: pointer; transition: color 200ms`),
        rule('.gh-tab.gh-tab-on', 'color: #fff'),
        rule(`${HOVER} .gh-tab:hover:not(.gh-tab-on)`, 'color: rgba(255,255,255,.85)'),
        rule('.gh-tab-line', `position: absolute; left: 0; right: 0; bottom: 0; height: 3px; border-radius: 2px; background: var(--glance-accent); opacity: 0; box-shadow: none;
            transition: opacity 250ms, box-shadow 250ms, background ${ACCENT_MS}ms`),
        rule('.gh-tab.gh-tab-on .gh-tab-line', 'opacity: .55'),
        // The tabs are out of sight while the sheet is down: their line takes a new accent at once.
        rule('.gh-page:not(.gh-page-up) .gh-tab-line', 'transition: none'),
        rule(`${NOT_MOUSE} .gh-tab.gh-tab-focus .gh-tab-line`, 'opacity: 1; box-shadow: 0 0 14px 2px var(--glance-accent)'),
        // Friends tab: people icon and the number of friends online, after the label.
        rule('.gh-tab-count', `display: inline-flex; align-items: center; gap: 4px; margin: 0 0 0 8px; font-size: 11px; letter-spacing: .04em; line-height: 1;
            vertical-align: 1px; color: ${FRIEND_COLOURS.none}; transition: color 200ms`),
        // Someone connected (online, away or in game): Steam's in-game green, never the game accent.
        rule('.gh-tab-count.gh-tab-count-on', `color: ${FRIEND_COLOURS.online}`),
        // Cards (top 756, 260 tall, gap 14); hidden until the sheet is up. Left, width and the art url are inline.
        rule('.gh-feed', `position: absolute; left: var(--gh-row, ${SIDE_INSET.handheld - ROW_OFFSET}px); right: 0; top: calc(756px - var(--gh-top)); margin: 0; padding: 0; opacity: 0; pointer-events: none; transition: opacity 400ms`),
        // One or two card rows (feedLayout.feedRows; heights inline), each with its own track and scroll; the second row's
        // small header sits just above it.
        rule('.gh-feed-row', 'position: absolute; left: 0; right: 0; margin: 0; padding: 0'),
        rule('.gh-feed-row-title', `position: absolute; left: 0; height: ${FEED_ROW2_HEADER}px; margin: 0; padding: 0; display: flex; align-items: flex-start;
            font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; line-height: 1.2; color: rgba(255,255,255,.62)`),
        rule('.gh-page-up .gh-feed', 'opacity: 1; pointer-events: auto'),
        rule('.gh-feed-track', `position: absolute; inset: 0; margin: 0; padding: 0; transition: transform ${FEED_SCROLL}`),
        rule('.gh-feed-track.gh-feed-drag', 'transition: none'),
        rule('.gh-feed-empty', 'position: absolute; left: 0; top: 0; height: 260px; display: flex; align-items: center; font-size: 16px; font-weight: 700; letter-spacing: .02em; color: rgba(255,255,255,.62)'),
        rule('.gh-card', `--gh-ring: rgba(255,255,255,.25);
            position: absolute; top: 0; height: var(--gh-card-h, 260px); margin: 0; padding: 0; border-radius: var(--gh-r-card); overflow: hidden; color: #fff;
            background: rgba(12,16,22,.4); border: none; --gh-edge: rgba(255,255,255,.1); backdrop-filter: blur(16px); box-shadow: 0 6px 20px -10px rgba(0,0,0,.6);
            transform: none; outline: none; cursor: pointer; transition: box-shadow 300ms, transform 300ms, --gh-card-accent ${ACCENT_MS}ms ease`),
        // The edge over the art and shade, as on the recents capsules (no un-shaded bottom row).
        rule('.gh-card::after', `content: ''; position: absolute; inset: 0; margin: 0; padding: 0; border-radius: inherit; pointer-events: none;
            box-shadow: inset 0 0 0 1px var(--gh-edge); transition: box-shadow 300ms`),
        rule('.gh-card.gh-card-focus', `box-shadow: ${GLOW}; --gh-edge: rgba(255,255,255,.3); transform: translateY(-4px)`),
        // A mouse over a feed card: the recents' faint ring and half the focused card's lift.
        rule('.gh-card.gh-card-hover:not(.gh-card-focus)', `box-shadow: ${hoverRing('2px')}, 0 6px 20px -10px rgba(0,0,0,.6); transform: translateY(-2px)`),
        // Avatar rings: green online or in game, Steam's away blue away; offline: no ring and a dimmed avatar.
        rule('.gh-card-ring-online', `--gh-ring: ${FRIEND_COLOURS.online}`),
        rule('.gh-card-ring-away', `--gh-ring: ${FRIEND_COLOURS.away}`),
        rule('.gh-card-offline .gh-avatar', 'box-shadow: none; opacity: .55; filter: grayscale(.4)'),
        // Friend card placeholder (no game art): the friend's avatar as a backdrop, scaled to cover, blurred once (a single
        // filter on one element per card; feed scroll measured unchanged on the Ally with 7 such cards), darkened and
        // desaturated; a faint presence tint over it; without an avatar a soft gradient from the card's accent.
        rule('.gh-card-backdrop', 'position: absolute; inset: -28px; margin: 0; padding: 0; background-size: cover; background-position: center; filter: blur(28px) saturate(.55) brightness(.5)'),
        rule('.gh-card-backdrop-none', `inset: 0; filter: none; background: linear-gradient(160deg, color-mix(in srgb, var(--gh-card-accent) 38%, transparent) 0%, rgba(12,16,22,.35) 75%)`),
        rule('.gh-card-tint', 'position: absolute; inset: 0; margin: 0; padding: 0; pointer-events: none'),
        rule('.gh-card-tint-online', `background: ${hexAlpha(FRIEND_COLOURS.online, 0.12)}`),
        rule('.gh-card-tint-away', `background: ${hexAlpha(FRIEND_COLOURS.away, 0.12)}`),
        rule('.gh-card-art', `position: absolute; inset: 0; background-size: cover; background-position: center 30%; background-repeat: no-repeat; animation: gh-fade-in ${FEED_ART_FADE_MS}ms ease both`),
        // News art shown whole (feedLayout `fit`): any aspect fits inside the card, at the top of a news card so the text
        // sits under it on the blurred fill, centred on the wide featured card. The fill is the same image scaled to cover
        // and blurred once (one filter per card, as the friend backdrop), so the bands around the art carry its colours.
        rule('.gh-card-fit-blur', `position: absolute; inset: -28px; margin: 0; padding: 0; background-size: cover; background-position: center; background-repeat: no-repeat;
            filter: blur(24px) saturate(.8) brightness(.55); animation: gh-fade-in ${FEED_ART_FADE_MS}ms ease both`),
        rule('.gh-card-fit', `position: absolute; inset: 0; margin: 0; padding: 0; background-size: contain; background-position: center top; background-repeat: no-repeat;
            animation: gh-fade-in ${FEED_ART_FADE_MS}ms ease both`),
        rule('.gh-card-featured .gh-card-fit', 'background-position: center'),
        // Under fitted art the text has the fill below the image: two title lines keep it there.
        rule('.gh-card-fitted .gh-card-title', '-webkit-line-clamp: 2'),
        // 1px past the art at the top and bottom, so no un-shaded sliver can show at a fractional edge.
        rule('.gh-card-shade', `position: absolute; inset: -1px 0; background: linear-gradient(180deg, rgba(${SCRIM},0) 30%, rgba(${SCRIM},.88) 100%)`),
        rule('.gh-card-text', 'position: absolute; left: 16px; right: 16px; bottom: 16px; display: flex; flex-direction: column; align-items: flex-start; gap: 7px'),
        rule('.gh-pill', `padding: 4px 10px; border-radius: var(--gh-r-pill); font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; line-height: 1.2;
            white-space: nowrap; color: var(--gh-on-accent); background: var(--gh-card-accent)`),
        rule('.gh-card-title', `font-size: 16px; line-height: 1.15; font-weight: 700; text-wrap: pretty; overflow-wrap: anywhere; color: #fff;
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden`),
        // Second-row cards: short and wide, a compact one-line title and its line under it.
        rule('.gh-card-wide .gh-card-text', 'left: 12px; right: 12px; bottom: 10px; gap: 4px'),
        rule('.gh-card-wide .gh-card-title', 'font-size: 14px; -webkit-line-clamp: 1'),
        rule('.gh-card-wide .gh-card-sub', 'font-size: 9.5px; -webkit-line-clamp: 1'),
        rule('.gh-card-wide .gh-pill', 'padding: 3px 8px; font-size: 9.5px'),
        rule('.gh-card-featured .gh-card-title', 'font-size: 26px; -webkit-line-clamp: 2'),
        // A sale's full price, struck through (no "was" to translate), a little dimmer than the price it was cut to.
        rule('.gh-card-was', 'text-decoration: line-through; text-decoration-thickness: 1.5px; opacity: .7'),
        rule('.gh-card-sub', `font-size: 10.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; line-height: 1.4; color: rgba(255,255,255,.62);
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden`),
        rule('.gh-card-bar', `position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--glance-accent); opacity: 0; transition: opacity 250ms, background ${ACCENT_MS}ms`),
        rule('.gh-card.gh-card-focus .gh-card-bar', 'opacity: 1'),
        rule('.gh-card:not(.gh-card-focus) .gh-card-bar', 'transition: opacity 250ms'),
        // Friend avatar: a 42px square with Steam's slightly rounded corners, top-left, with a square presence ring (the
        // box-shadow follows the radius; see below).
        rule('.gh-avatar', `position: absolute; left: 14px; top: 14px; width: 42px; height: 42px; border-radius: ${AVATAR_RADIUS}px; overflow: hidden;
            display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 800; line-height: 1;
            color: var(--gh-on-accent); background: rgba(255,255,255,.85); box-shadow: 0 0 0 3px rgba(${SCRIM},.6), 0 0 0 5px var(--gh-ring)`),
        // Trending cards: up to three small square friend avatars (overlapping, a dark square outline between them) and "+N",
        // top right, clear of the text.
        rule('.gh-card-friends', 'position: absolute; right: 10px; top: 10px; display: flex; flex-direction: row; margin: 0; padding: 0'),
        rule('.gh-card-friend', `position: relative; width: 24px; height: 24px; margin: 0 0 0 -6px; border-radius: ${AVATAR_SMALL_RADIUS}px; overflow: hidden; display: flex; align-items: center;
            justify-content: center; font-size: 11px; font-weight: 800; line-height: 1; color: var(--gh-on-accent); background: rgba(255,255,255,.85);
            box-shadow: 0 0 0 2px rgba(${SCRIM},.75)`),
        rule('.gh-card-friend-more', 'width: auto; min-width: 24px; padding: 0 6px; color: #fff; background: rgba(12,16,22,.75); font-size: 10px'),
        rule('.gh-avatar-img', 'position: absolute; inset: 0; border-radius: inherit; background-size: cover; background-position: center; background-repeat: no-repeat'),

        // No-games state, centred in the area between Steam's bars: the message and the Open Library pill.
        rule('.gh-empty', 'position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 0 56px; text-align: center; font-size: 22px; font-weight: 700; letter-spacing: .02em; color: rgba(255,255,255,.72)'),
        rule('.gh-empty .gh-actions', 'margin: 0'),
    ].join('\n');
}

/**
 * The open transition's states on Home (openHome.applyOpening sets them, openMotion's variables drive them):
 * `data-gh-opening` = morph | heroFade | fade, `data-gh-phase` = from (the start frame: the glass panels appear on the
 * chips, the page's scrim and the opened game's hero are ready, all still) then to (the motion). Only transform and
 * opacity animate (motion.ts: anything else costs whole frames on the Ally). The morph's element list mirrors
 * openMotion's variables: title, eyebrow, Play pill (its background grows in a layer inside it), circles by position
 * in the row (the info button, which the page has not, fades), store pill, chip texts by position; the chips' glass
 * gives way to one panel per page card (.gh-open-shell, Michael's choice on the device).
 */
export function openingRules(): string[] {
    const T = OPEN_TIMINGS;
    const O = '.gh-root[data-gh-opening]';
    const M = '.gh-root[data-gh-opening="morph"]';
    const MT = `${M}[data-gh-phase="to"]`;
    const FADES = ['heroFade', 'fade'].map((v) => `.gh-root[data-gh-opening="${v}"][data-gh-phase="to"]`);
    const move = `transform ${T.morph}ms ${MORPH_EASE}`;
    const play = '.gh-actions > .gh-btn[data-action="play"]';
    const shell = (i: number) => [
        rule(`${M}${i === 1 ? '[data-gh-shells="2"]' : ''} .gh-open-shell[data-i="${i}"]`, `display: block; left: calc(var(--gho-shell-${i}-x) * 1px); top: calc(var(--gho-shell-${i}-y) * 1px);
            width: calc(var(--gho-shell-${i}-w) * 1px); height: calc(var(--gho-shell-${i}-h) * 1px); transform: var(--gho-shell-${i}-from); opacity: var(--gho-shell-${i}-o0)`),
        rule(`${MT}${i === 1 ? '[data-gh-shells="2"]' : ''} .gh-open-shell[data-i="${i}"]`, `transform: none; opacity: 1; transition: ${move}, opacity ${T.morph}ms ease`),
        rule(`${MT}${i === 1 ? '[data-gh-shells="2"]' : ''} .gh-open-shell[data-i="${i}"]::before`, `opacity: 0; transition: opacity ${T.morph}ms ease`),
        // The page card's crisp ring, outside the canvas (.gh-open-ring): it grows with the panel and fades in as the panel's
        // soft ring fades out, so the hand-over shows the ring the page draws.
        rule(`${M}${i === 1 ? '[data-gh-shells="2"]' : ''} .gh-open-ring[data-i="${i}"]`, `display: block; left: calc(var(--gho-ring-${i}-x) * 1px); top: calc(var(--gho-ring-${i}-y) * 1px);
            width: calc(var(--gho-ring-${i}-w) * 1px); height: calc(var(--gho-ring-${i}-h) * 1px); transform: var(--gho-ring-${i}-from); opacity: 0`),
        rule(`${MT}${i === 1 ? '[data-gh-shells="2"]' : ''} .gh-open-ring[data-i="${i}"]`, `transform: none; opacity: 1; transition: ${move}, opacity ${T.morph}ms ease`),
    ];
    // Fades that start late in the morph are keyframe animations over the whole morph that hold their start value until
    // then, never delayed transitions: on Steam's browser the GPU draws a delayed opacity transition at its end value
    // during the delay (docked, the description and HowLongToBeat numbers showed over the game cards from the first frame).
    const hold = (fade: number) => Math.round(((T.morph - fade) / T.morph) * 100000) / 1000;
    const lateFade = (name: string, from: number, to: number, fade: number, ease: string) =>
        `@keyframes ${name} { 0%, ${hold(fade)}% { opacity: ${from}; animation-timing-function: ${ease}; } 100% { opacity: ${to}; } }`;
    const late = (name: string) => `animation: ${name} ${T.morph}ms linear both`;
    // The morph's last part: the page pill's exact look fades in as it comes to rest (opacity only).
    const settle = late('gh-open-settle');
    // The extras layer: the page's own sizes, in its d unit (openMotion's --gho-x-d), outside the scaled canvas.
    const L = PAGE_LAYOUT;
    const dd = (n: number) => `calc(${n}px * var(--gho-x-d))`;
    const X = '.gh-open-extras';
    const at = (name: string) => `left: var(--gho-x-${name}-x); top: var(--gho-x-${name}-y); width: var(--gho-x-${name}-w)`;
    // A part the page draws inside a card: placed inside its .gh-x-card layer (at the card, openMotion --gho-x-NAME-cx/cy).
    const inCard = (name: string) => `left: calc(var(--gho-x-${name}-x) - var(--gho-x-${name}-cx, 0px)); top: calc(var(--gho-x-${name}-y) - var(--gho-x-${name}-cy, 0px))`;
    // The twins' crossfade ends at this share of the morph; the Home text each twin replaces, by twin name.
    const twinAt = Math.round((T.twinFade / T.morph) * 1000) / 10;
    const twinOut: Array<[string, string]> = [
        ['title', '.gh-title-slot'],
        ['eyebrow', '.gh-eyebrow'],
        ['play', `.gh-btn[data-action="play"] .gh-btn-label`],
        ...(['size', 'played', 'achievements', 'hltb'] as const).flatMap((k): Array<[string, string]> => [
            [`label-${k}`, `.gh-chip[data-chip="${k}"] .gh-chip-label`],
            [`value-${k}`, `.gh-chip[data-chip="${k}"] .gh-chip-value`],
        ]),
    ];
    return [
        lateFade('gh-open-extras-in', 0, 1, T.extras, 'ease-out'),
        lateFade('gh-open-pill-out', 1, 0, T.extras, 'ease-in'),
        lateFade('gh-open-settle', 0, 1, T.settle, 'ease-in-out'),
        // Always there, hidden: the page's scrims over Home's, the opened game's hero (heroFade), the glass panels.
        rule('.gh-hero-open', 'position: absolute; inset: 0; pointer-events: none; background-image: var(--gho-hero, none); background-size: cover; background-position: center 30%; background-repeat: no-repeat; opacity: 0'),
        // In Fit (settings heroFit, .gh-fit on the root) the other game's hero arrives framed as Home and the page draw it: the
        // art fill behind, the whole art at the top with its fade (--gho-hero-mask, set beside --gho-hero by applyOpening).
        rule('.gh-fit .gh-hero-open', 'isolation: isolate; background-image: none'),
        rule('.gh-fit .gh-hero-open::before', `content: ""; position: absolute; inset: -120px; background-image: var(--gho-hero, none); background-size: cover;
            background-position: center; background-repeat: no-repeat; filter: ${ART_FILL_FILTER}; pointer-events: none`),
        rule('.gh-fit .gh-hero-open::after', `content: ""; position: absolute; inset: 0; background-image: var(--gho-hero, none); background-size: contain;
            background-position: center top; background-repeat: no-repeat; -webkit-mask-image: var(--gho-hero-mask); mask-image: var(--gho-hero-mask); pointer-events: none`),
        // The glass: the page's cards and Clean panel, their tint, border and blur, so the page's arrive as they are (Michael,
        // on the Ally: moving blurred felt more seamless than a blur growing in after the hand-over). 16 canvas px is the page's
        // 16 d units. Its ring is Home's 1px, so it looks like the chips' all the way: Chromium snaps a border to whole device px
        // in the canvas's own units, before the scale, so the page's 1 device px drawn in here came out half as bright on the Ally.
        // The page cards' ring drawn as the page draws it (openMotion --gho-ring-*): outside the scaled canvas, so Chromium
        // snaps it to whole device px as it does the page's; brightened by the page's --gg-ring (ringBoost).
        rule('.gh-open-ring', 'display: none; position: absolute; left: 0; top: 0; margin: 0; padding: 0; pointer-events: none; transform-origin: 0 0; box-sizing: border-box; background: none; border-radius: var(--gho-ring-r, 16px); border: var(--gho-ring-w, 1px) solid rgba(255,255,255,calc(.12 * var(--gho-ring-boost, 1)))'),
        rule('.gh-open-shell', 'display: none; position: absolute; left: 0; top: 0; margin: 0; padding: 0; pointer-events: none; transform-origin: 0 0; border-radius: 16px; background: rgba(12,16,22,.38); border: 1px solid transparent; backdrop-filter: blur(16px)'),
        // Its soft canvas ring, as Home's chips draw theirs: fades out as the crisp ring (.gh-open-ring) fades in.
        rule('.gh-open-shell::before', 'content: ""; position: absolute; inset: -1px; border-radius: inherit; border: 1px solid rgba(255,255,255,.12); pointer-events: none; opacity: 1'),
        // A Unifideck game's page has a fourth circle (Uninstall) Home has no button for: one is drawn at its place as Home's
        // circles look at the page's size, and fades in late as the page's other parts do, so it does not pop in after the
        // hand-over. Its own fade, not the extras layer's: a backdrop blur inside a fading parent sees nothing behind it.
        rule('.gh-open-circle', `display: none; position: absolute; left: 0; top: 0; margin: 0; padding: 0; pointer-events: none; box-sizing: border-box; aspect-ratio: 1;
            align-items: center; justify-content: center; border-radius: 999px; color: #fff; background: rgba(12,16,22,.4); border: 1px solid rgba(255,255,255,.18);
            backdrop-filter: blur(12px); opacity: 0`),
        rule('.gh-open-circle svg', `width: ${PAGE_LAYOUT.circleIcon}px; height: ${PAGE_LAYOUT.circleIcon}px; margin: 0; fill: currentColor`),
        rule(`${M} .gh-open-circle`, 'display: flex; left: calc(var(--gho-circle-extra-x) * 1px); top: calc(var(--gho-circle-extra-y) * 1px); width: calc(var(--gho-circle-extra-w) * 1px)'),
        rule(`${MT} .gh-open-circle`, late('gh-open-extras-in')),
        rule('.gh-root.gh-bridge[data-gh-opening][data-gh-phase] .gh-open-circle', 'opacity: 1; animation: none'),
        rule(O, 'pointer-events: none'),
        // The bridge (openBridge): a frozen copy of Home in its final state; nothing inside it may animate again.
        rule('.gh-root.gh-bridge, .gh-root.gh-bridge *', 'animation: none; transition: none'),
        rule('.gh-root.gh-bridge *::before, .gh-root.gh-bridge *::after', 'animation: none; transition: none'),
        // With nothing animating, the copy holds the late fades' end values (their own values are the start ones).
        // Stated as specifically as the rules that animate them, so the freeze wins: the late fades. (Home's way-back fade
        // never applies in the copy: :not(.gh-bridge), and the copy also drops .gh-back, openBridge.)
        rule('.gh-root.gh-bridge[data-gh-opening][data-gh-phase][data-gh-extras] .gh-open-extras', 'opacity: 1; animation: none'),
        rule('.gh-root.gh-bridge[data-gh-opening][data-gh-phase][data-gh-extras~="pills"] .gh-source', 'opacity: 0; animation: none'),
        rule(`.gh-root.gh-bridge[data-gh-opening][data-gh-phase] ${play}::after`, 'opacity: 1; animation: none'),

        // Scrims: Home already shades its art as the page does; only the feed sheet's dim goes.
        rule(`${MT} .gh-scrim-dim`, `opacity: 0; transition: opacity ${T.morph}ms ease`),
        rule(FADES.map((f) => `${f} .gh-scrim-dim`).join(', '), `opacity: 0; transition: opacity ${T.feedHero}ms ease`),

        // Leave: the game cards row and the tabs drop and fade; the info button fades.
        rule([`${MT} .gh-recents`, `${MT} .gh-tabs`].join(', '), `transform: translateY(${T.leaveDrop}px); opacity: 0; transition: transform ${T.leave}ms cubic-bezier(.4,0,1,1), opacity ${T.leave}ms cubic-bezier(.4,0,1,1)`),
        rule([`${MT} .gh-actions > .gh-btn[data-action="info"]`, `${MT} .gh-actions > .gh-btn-stream`].join(', '), `opacity: 0; transition: opacity ${T.infoFade}ms ease`),

        // Morph: the movers, from their own place (origin top-left, as openMotion computes).
        rule([`${M} .gh-title-slot`, `${M} .gh-eyebrow`, `${M} .gh-source`, `${M} .gh-actions > .gh-btn`, `${M} .gh-chip-label`, `${M} .gh-chip-value`].join(', '), 'transform-origin: 0 0'),
        rule(`${MT} .gh-title-slot`, `transform: var(--gho-title); transition: ${move}`),
        rule(`${MT} .gh-eyebrow`, `transform: var(--gho-eyebrow); transition: ${move}`),
        rule(`${MT} .gh-source`, `transform: var(--gho-store); transition: ${move}`),
        // The Play pill moves; its accent background becomes a layer inside it that grows to the page pill (the pill
        // stops clipping it, and keeps its focus ring on that layer).
        rule(`${M} ${play}`, 'overflow: visible; background: transparent; border-color: transparent; box-shadow: none'),
        // (Both layers start at the pill's outer edge, its 1px border, as openMotion's scales are of its outer size: from inside
        // the border they ended a border's width short all round, and the page pill grew at the hand-over.)
        rule(`${M} ${play}::before`, "content: ''; position: absolute; left: -1px; top: -1px; width: calc(100% + 2px); height: calc(100% + 2px); border-radius: 999px; background: var(--glance-accent); transform-origin: 0 0; pointer-events: none"),
        // The page focuses Play (its white ring and accent glow, as Home's focus): the page's focused pill at its exact size
        // (round ends; the stretched layer's are oval) fades in as the pill comes to rest, under the glyph and label.
        rule(`${M} ${play}::after`, "content: ''; position: absolute; left: -1px; top: calc(var(--gho-play-dy) - 1px); width: calc((100% + 2px) * var(--gho-play-sx)); height: calc((100% + 2px) * var(--gho-play-sy)); border-radius: 999px; background: var(--glance-accent); box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 14px 40px -8px var(--glance-accent); pointer-events: none"),
        soft(`${M} ${play}::after`, 'opacity: 0'),
        // Opened with a mouse, the page shows its Play without the focus look (mouseMode): the pill grows without its ring and glow.
        rule(`${HOVER} ${M} ${play}::after`, 'box-shadow: none'),
        rule([`${M} ${play} > .gh-btn-icon`, `${M} ${play} > .gh-btn-label`, `${M} ${play} > .gh-play-arrow`].join(', '), 'z-index: 1'),
        rule(`${M} ${play} > .gh-play-arrow`, 'transform-origin: 100% 50%'),
        rule(`${MT} ${play} > .gh-play-arrow`, `transform: var(--gho-play-arrow); transition: ${move}`),
        rule(`${MT} ${play}`, `transform: var(--gho-play-fg); transition: ${move}`),
        // Its glyph and label grow to the page's, from the pill's left edge and centre line (white on both).
        rule([`${M} ${play} > .gh-btn-icon`, `${M} ${play} > .gh-btn-label`].join(', '), 'transform-origin: 0 50%'),
        rule(`${MT} ${play} > .gh-btn-icon`, `transform: var(--gho-play-icon); transition: ${move}`),
        rule(`${MT} ${play} > .gh-btn-label`, `transform: var(--gho-play-label); transition: ${move}`),
        rule(`${MT} ${play}::before`, `transform: var(--gho-play-bg); transition: ${move}`),
        rule(`${MT} ${play}::after`, settle),
        // The circles by their order among circles (openHome measures .gh-btn-circle), whatever comes before them (the stream arrow).
        ...[0, 1, 2, 3].map((i) => rule(`${MT} .gh-actions > .gh-btn-circle:nth-child(${i + 1} of .gh-btn-circle)`, `transform: var(--gho-circle-${i}, none); transition: ${move}`)),
        // Each circle's icon shrinks as the circle grows (openMotion), so it is the page's size throughout.
        rule(`${M} .gh-actions > .gh-btn-circle > .gh-btn-icon`, 'transform-origin: 50% 50%'),
        ...[0, 1, 2, 3].map((i) => rule(`${MT} .gh-actions > .gh-btn-circle:nth-child(${i + 1} of .gh-btn-circle) > .gh-btn-icon`, `transform: var(--gho-circle-icon-${i}, none); transition: ${move}`)),
        // The cloud's state badge (#64) too, about its top-right corner: that corner is the circle's, which the circle's
        // scale carries onto the page's corner, so the badge stays the page's size there throughout (no settling).
        rule(`${M} .gh-actions > .gh-btn-cloud:not(.gh-cloud-uni)::after`, 'transform-origin: 100% 0'),
        ...[0, 1, 2, 3].map((i) => rule(`${MT} .gh-actions > .gh-btn-circle:nth-child(${i + 1} of .gh-btn-circle).gh-btn-cloud:not(.gh-cloud-uni)::after`, `transform: var(--gho-circle-icon-${i}, none); transition: ${move}`)),
        // Chips: their glass gives way to the panels at once; texts move and grow; the bars and unmatched chips fade.
        rule(`${M} .gh-chip`, 'background: transparent; border-color: transparent; backdrop-filter: none; box-shadow: none'),
        // An accent copy of a value's words (data-text) over it, for a value the page draws in the accent (openMotion).
        rule(`${M} .gh-chip-value`, 'position: relative'),
        rule(`${M} .gh-chip-value::after`, 'content: attr(data-text); position: absolute; left: 0; top: 0; color: var(--glance-accent-text); opacity: 0; pointer-events: none'),
        ...[0, 1, 2, 3].flatMap((i) => [
            rule(`${MT} .gh-chip:nth-child(${i + 1}) .gh-chip-label`, `transform: var(--gho-chip-${i}-label, none); opacity: var(--gho-chip-${i}-label-o, var(--gho-chip-${i}-o, 0)); transition: ${move}, opacity ${T.infoFade}ms ease`),
            rule(`${MT} .gh-chip:nth-child(${i + 1}) .gh-chip-value`, `transform: var(--gho-chip-${i}-value, none); opacity: var(--gho-chip-${i}-o, 0); transition: ${move}, opacity ${T.infoFade}ms ease`),
            rule(`${MT} .gh-chip:nth-child(${i + 1}) .gh-chip-value::after`, `opacity: var(--gho-chip-${i}-accent, 0); transition: opacity ${T.morph}ms ease`),
        ]),
        // A bar moves onto the page's (Clean's panel) when the morph gives it a place (openMotion), and fades otherwise.
        rule(`${M} .gh-chip-bar`, 'transform-origin: 0 0'),
        ...[0, 1, 2, 3].map((i) => rule(`${MT} .gh-chip:nth-child(${i + 1}) .gh-chip-bar`, `transform: var(--gho-chip-${i}-bar, none); opacity: var(--gho-chip-${i}-bar-o, 0); transition: ${move}, opacity ${T.infoFade}ms ease`)),
        ...shell(0),
        ...shell(1),

        // The page's parts Home draws as it turns into it (Spotlight look; SpotlightHome's .gh-open-extras, openMotion's
        // --gho-x-*): the description and the HowLongToBeat card's title, other columns, bar and caption, laid out as the
        // page's card, each part only when Home has it (data-gh-extras), fading in to be complete at the hand-over.
        rule(X, 'display: none; position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; color: #fff'),
        soft(X, 'opacity: 0'),
        rule(`${M}[data-gh-extras] ${X}`, 'display: block'),
        // Its own opacity stays the start value (0, soft: an animation cannot override !important): the GPU draws that until
        // the animation runs, and the animation holds the end.
        rule(`${MT}[data-gh-extras] ${X}`, late('gh-open-extras-in')),
        // The text twins (home/openTwins, openHome.mountTwins): each moving text drawn again in its own layer at the page's
        // size and type (themeCss.PAGE_TYPE, in the page's d unit), placed where the page puts it, from Home's text to no
        // transform, so the hand-over shows the page's text as the page draws it. Home's text hands over to them over the
        // morph's first 40% (OPEN_TIMINGS.twinFade), opacity only. (Own layer: the extras layer fades in only at the end.)
        `@keyframes gh-twin-in { 0% { opacity: 0; animation-timing-function: ease-out; } ${twinAt}%, 100% { opacity: 1; } }`,
        `@keyframes gh-twin-out { 0% { opacity: 1; animation-timing-function: ease-in; } ${twinAt}%, 100% { opacity: 0; } }`,
        soft('.gh-open-twins', 'display: none; position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; pointer-events: none'),
        soft(`${M} .gh-open-twins`, 'display: block'),
        // The origin point is placed by the translate property (its share of the twin's own height, plus the glide at the
        // hand-over, --t-dx/--t-dy), so transform carries only the morph, about that same point.
        soft('.gh-twin', `position: absolute; left: var(--t-x); top: var(--t-y); margin: 0; padding: 0; white-space: nowrap; color: #fff;
            transform-origin: var(--t-origin, 0 0); translate: var(--t-dx, 0px) calc(var(--t-dy, 0px) - var(--t-shift, 0%)); transform: var(--t-from); opacity: 0`),
        // A page card's twins (openTwins TwinSpec.card): in a layer at the card's place, as the page's card is one (see
        // .gh-x-card below), placed inside it.
        soft('.gh-twin-card', 'position: absolute; left: var(--t-card-x); top: var(--t-card-y); margin: 0; padding: 0; will-change: transform'),
        soft('.gh-twin[data-origin="top"]', '--t-origin: 0 0; --t-shift: 0%'),
        soft('.gh-twin[data-origin="base"]', 'transform-origin: 0 100%; --t-shift: 100%'),
        soft('.gh-twin[data-origin="midline"]', 'transform-origin: 0 50%; --t-shift: 50%'),
        // The Play label's twin: the page pill's box with its label centred on the line at the label's inset (openTwins 'pill').
        soft('.gh-twin[data-origin="pill"]', 'transform-origin: 0 0; --t-shift: 0%; width: var(--t-w); height: var(--t-h); display: flex; align-items: center; padding: 0 0 0 var(--t-inset); box-sizing: border-box'),
        soft(`${MT} .gh-twin`, `transform: var(--t-to); transition: ${move}; animation: gh-twin-in ${T.morph}ms linear both`),
        soft('.gh-twin[data-role="title"]', `${pageType('title', dd)} max-width: ${dd(640)}; white-space: normal; text-wrap: balance; overflow-wrap: anywhere; text-shadow: 0 ${dd(4)} ${dd(30)} rgba(0,0,0,.4)`),
        soft('.gh-twin[data-role="eyebrow"]', `${pageType('eyebrow', dd)} color: var(--glance-accent-text)`),
        // The page's labels inherit a 1.5 line height from Steam (PAGE_TYPE leaves it out): stated here.
        soft('.gh-twin[data-role="label"]', `${pageType('label', dd)} line-height: ${PAGE_LINES.label}; color: rgba(255,255,255,.62)`),
        soft('.gh-twin[data-role="value"]', pageType('value', dd)),
        soft('.gh-twin[data-role="cleanValue"]', pageType('cleanValue', dd)),
        // Steam's fixed line height on the Play label (STEAM_PLAY_LINE): the browser places text in a 20 px line box a little
        // higher than in a default one, so the twin's text landed 0.65 px low and stepped up at the end (Ally, docked).
        soft('.gh-twin[data-role="playLabel"]', `${pageType('playLabel', dd)} line-height: ${STEAM_PLAY_LINE}px`),
        soft('.gh-twin[data-accent]', 'color: var(--glance-accent-text)'),
        cardBaseCss('gh-normal', (n) => `calc(${n} * var(--gg-u))`),
        normalCardsCss('gh-normal', dd),
        `.gh-normal-cards { display:none; position:absolute; margin:0; padding:0; color:#fff; pointer-events:none; transform-style:preserve-3d; --gg-u:${SCALE_UNIT_CSS}; --gg-accent:var(--glance-accent); --gg-ring:var(--gho-ring-boost,1); }`,
        rule('.gh-normal-card', 'box-sizing:content-box'),
        `${M}[data-gh-normal] .gh-normal-cards { display:grid; }`,
        // Keep native text layout outside the glass's nonuniform scale (as the Play pill's foreground).
        rule(`${M}[data-gh-normal]:not(.gh-bridge) .gh-normal-card`, 'position:relative; z-index:0; background:transparent; border-color:transparent; backdrop-filter:none'),
        `${M}[data-gh-normal]:not(.gh-bridge) .gh-normal-card::before { content:""; position:absolute; inset:calc(-1 * var(--normal-border)); box-sizing:border-box; border:var(--normal-border) solid var(--normal-ring); border-radius:inherit; background:var(--normal-bg); backdrop-filter:var(--normal-blur); pointer-events:none; z-index:-1; transform-origin:0 0; transform:var(--normal-from); }`,
        `${MT}[data-gh-normal]:not(.gh-bridge) .gh-normal-card::before { transform:none; transition:${move}; }`,
        `${M}[data-gh-normal] [data-normal-move] { transform-origin:0 0; transform:var(--normal-from); opacity:0; }`,
        `${MT}[data-gh-normal] [data-normal-move] { transform:none; transition:${move}; animation:gh-twin-in ${T.morph}ms linear both; }`,
        `${MT}[data-gh-normal] [data-normal-move="extra"], ${MT}[data-gh-normal] [data-normal-empty] { animation:gh-open-extras-in ${T.morph}ms linear both; }`,
        `${MT}[data-gh-normal] :is(.gh-chip-label,.gh-chip-value,.gh-chip-bar) { animation:gh-twin-out ${T.morph}ms linear both; }`,
        rule(`${M}[data-gh-normal] :is(.gh-open-shell,.gh-open-ring)[data-i], ${M}[data-gh-normal] :is(.gh-x-card,.gh-x-desc)`, 'display:none'),
        '.gh-root.gh-bridge[data-gh-normal][data-gh-opening][data-gh-phase] .gh-normal-card { transform:none; transition:none; opacity:1; animation:none; }',
        '.gh-root.gh-bridge[data-gh-normal][data-gh-opening][data-gh-phase] [data-normal-move] { transform:none; opacity:1; animation:none; transition:none; }',
        '.gh-root.gh-bridge[data-gh-normal][data-gh-opening][data-gh-phase] :is(.gh-chip-label,.gh-chip-value,.gh-chip-bar) { opacity:0; animation:none; }',
        cleanInfoCss('.gh-clean-info', dd, 'gh-clean'),
        '.gh-clean-info { display:none; pointer-events:none; --gg-accent:var(--glance-accent); --gg-ring:var(--gho-ring-boost,1); }',
        `${M}[data-gh-clean] .gh-clean-info { display:flex; transform-origin:0 0; transform:translateY(-50%) var(--clean-from); }`,
        `${MT}[data-gh-clean] .gh-clean-info { transform:translateY(-50%); transition:${move}; }`,
        `${M}[data-gh-clean] .gh-clean-info [data-clean-move] { transform-origin:0 0; transform:var(--clean-from); opacity:0; }`,
        `${MT}[data-gh-clean] .gh-clean-info [data-clean-move] { transform:none; transition:${move}; animation:gh-twin-in ${T.morph}ms linear both; }`,
        `${MT}[data-gh-clean] :is(.gh-chip-label,.gh-chip-value,.gh-chip-bar) { animation:gh-twin-out ${T.morph}ms linear both; }`,
        rule(`${M}[data-gh-clean] :is(.gh-open-shell,.gh-open-ring)[data-i]`, 'display:none'),
        rule(`${M}[data-gh-clean] .gh-x-card:is([data-for="played"],[data-for="size"])`, 'display:none'),
        '.gh-root.gh-bridge[data-gh-clean][data-gh-opening][data-gh-phase] .gh-clean-info { transform:translateY(-50%); transition:none; }',
        '.gh-root.gh-bridge[data-gh-clean][data-gh-opening][data-gh-phase] .gh-clean-info [data-clean-move] { transform:none; opacity:1; animation:none; transition:none; }',
        '.gh-root.gh-bridge[data-gh-clean][data-gh-opening][data-gh-phase] :is(.gh-chip-label,.gh-chip-value,.gh-chip-bar) { opacity:0; animation:none; }',
        ...twinOut.map(([name, sel]) => soft(`${MT}[data-gh-twins~="${name}"] ${sel}`, `animation: gh-twin-out ${T.morph}ms linear both`)),
        // The bridge (nothing animates in it): the twins at their end, Home's twinned text hidden, stated above the live rules.
        soft(`.gh-root.gh-bridge[data-gh-opening][data-gh-phase] .gh-twin`, `opacity: 1; transform: var(--t-to); animation: none; transition: translate ${T.settleGlide}ms ease-out !important`),
        // The extras layer's text glides onto the page's the same way (OpenExtras data-settle, openHome.settleTwins).
        soft(`.gh-root.gh-bridge[data-gh-opening][data-gh-phase] [data-settle]`, `translate: var(--t-dx, 0px) var(--t-dy, 0px); transition: translate ${T.settleGlide}ms ease-out !important`),
        ...twinOut.map(([name, sel]) => soft(`.gh-root.gh-bridge[data-gh-opening][data-gh-phase][data-gh-twins~="${name}"] ${sel}`, 'opacity: 0; animation: none')),
        rule(`${X} .gh-x-desc`, `display: none; position: absolute; ${at('desc')}; margin: 0; font-size: ${dd(L.cardText.desc)}; font-weight: 400; line-height: ${L.cardText.descLine};
            color: rgba(255,255,255,.84); -webkit-line-clamp: ${L.cardText.descLines}; -webkit-box-orient: vertical; overflow: hidden`),
        rule('.gh-root[data-gh-extras~="desc"] .gh-x-desc', 'display: -webkit-box'),
        // The page's cards are compositing layers (their backdrop blur): Chromium puts a layer's origin on a whole device px
        // and snaps its text from there, so the same text outside one drew a device px lower (the HowLongToBeat times, Ally
        // docked). Each part the page draws in a card sits in a layer at that card's place, as the page's does.
        ...(['hltb', 'played', 'size'] as const).map((n) =>
            rule(`${X} .gh-x-card[data-for="${n}"]`, `position: absolute; left: var(--gho-x-${n}-cx, 0px); top: var(--gho-x-${n}-cy, 0px); margin: 0; padding: 0; will-change: transform`)),
        rule(`${X} .gh-x-hltb`, `display: none; position: absolute; ${inCard('hltb')}; width: var(--gho-x-hltb-w); flex-direction: column; gap: ${dd(L.cards.hltbGap)}`),
        rule('.gh-root[data-gh-extras~="hltb"] .gh-x-hltb', 'display: flex'),
        // The page's store pill (and family pill in it), right-aligned where the page draws it, as themeCss draws .gg-pill
        // and .gg-family. The legacy path crossfades; measured openings use one translated pair below.
        rule('.gh-x-pill', `display: none; position: absolute; left: var(--gho-x-pill-x); top: var(--gho-x-pill-y); transform: translateX(-100%) var(--gho-x-pill-from, translate(0px, 0px)); align-items: center;
            border-radius: 999px; border: 1px solid; color: #fff; white-space: nowrap; ${sourcePillLook(dd)}`),
        rule('.gh-root[data-gh-extras~="pills"] .gh-x-pill', 'display: inline-flex'),
        rule(`${MT} .gh-x-pill`, `transform: translateX(-100%); transition: ${move}`),
        rule('.gh-root.gh-bridge[data-gh-opening][data-gh-phase] .gh-x-pill', 'transform: translateX(-100%); transition: none'),
        rule('.gh-x-pill-icon', `flex: 0 0 auto; ${sourcePillIcon(dd)}`),
        rule('.gh-x-family', `position: absolute; right: calc(100% + ${dd(10)}); top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center;
            margin: 0; border-radius: 999px; border: 1px solid; color: #fff; line-height: 1; white-space: nowrap; ${sourcePillLook(dd)}`),
        rule('.gh-x-family-icon', `flex: 0 0 auto; ${sourcePillIcon(dd)}`),
        rule('.gh-x-copy-plus', `display: block; flex: 0 0 auto; width: ${dd(12)}; height: ${dd(12)}; margin-left: ${dd(8)}`),

        rule('.gh-x-pill.gh-x-selectable', 'padding:0; border:0; background:transparent; backdrop-filter:none'),
        rule('.gh-x-store-choice', `display:inline-flex; align-items:center; border:1px solid; border-radius:999px; color:#fff; ${sourcePillLook(dd)}`),
        rule(`${M}[data-gh-pill] .gh-source`, 'visibility:hidden'),
        `${M}[data-gh-pill] .gh-x-pill { transform:var(--pill-from); opacity:1; }`,
        `${MT}[data-gh-pill] .gh-x-pill { transform:none; transition:${move}; }`,
        `${M}[data-gh-pill] .gh-x-family { transform:translateY(-50%) var(--pill-from,translate(0px,0px)); }`,
        `${MT}[data-gh-pill] .gh-x-family { transform:translateY(-50%); transition:${move}; }`,
        '.gh-root.gh-bridge[data-gh-pill][data-gh-opening][data-gh-phase] .gh-x-pill { transform:none; opacity:1; animation:none; transition:none; }',
        '.gh-root.gh-bridge[data-gh-pill][data-gh-opening][data-gh-phase] .gh-x-family { transform:translateY(-50%); animation:none; transition:none; }',
        rule(`${MT}:not([data-gh-pill]) .gh-x-pill`, late('gh-open-extras-in')),
        // A new game's Play time column (Home shows its Added chip instead), as the page draws it, at its place.
        rule(`${X} .gh-x-played`, `display: none; position: absolute; ${inCard('played')}; flex-direction: column; gap: ${dd(L.stats.rowGap)}`),
        rule('.gh-root[data-gh-extras~="played"] .gh-x-played', 'display: flex'),
        rule(`${X} .gh-x-played .gh-x-value`, 'font-size: var(--gho-x-played-font)'),
        // A Unifideck game's size column (right after Played), as the page draws it, at its place.
        rule(`${X} .gh-x-size`, `display: none; position: absolute; ${inCard('size')}; flex-direction: column; gap: ${dd(L.stats.rowGap)}`),
        rule('.gh-root[data-gh-extras~="size"] .gh-x-size', 'display: flex'),
        rule(`${X} .gh-x-size .gh-x-value`, 'font-size: var(--gho-x-size-font)'),
        rule(`${MT}[data-gh-extras~="pills"] .gh-source`, `transition: ${move}; ${late('gh-open-pill-out')}`),
        rule(`${X} .gh-x-label`, `font-size: ${dd(L.stats.label)}; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; line-height: ${PAGE_LINES.label}; white-space: nowrap; color: rgba(255,255,255,.62)`),
        rule(`${X} .gh-x-stats`, `display: flex; gap: ${dd(L.stats.colGapHltb)}`),
        rule(`${X} .gh-x-stats > div`, `display: flex; flex-direction: column; gap: ${dd(L.stats.rowGap)}`),
        rule(`${X} .gh-x-value`, `font-size: ${dd(L.stats.value)}; font-weight: 700; line-height: ${PAGE_LINES.value}; white-space: nowrap`),
        rule(`${X} .gh-x-stats > div:first-child .gh-x-value`, 'visibility: hidden'),
        rule(`${X} .gh-x-bar`, `height: ${dd(L.cardText.bar)}; border-radius: ${dd(3)}; background: rgba(255,255,255,.14); overflow: hidden`),
        rule(`${X} .gh-x-bar > div`, `height: 100%; border-radius: ${dd(3)}; background: var(--glance-accent)`),
        rule(`${X} .gh-x-caption`, `font-size: ${dd(L.cardText.caption)}; line-height: ${PAGE_LINES.caption}; color: rgba(255,255,255,.72)`),

        // heroFade and fade: the opened game's hero over Home's (heroFade), Home's UI fading as one.
        rule('.gh-root[data-gh-opening="heroFade"][data-gh-phase="to"] .gh-hero-open', `opacity: 1; transition: opacity ${T.feedHero}ms ease`),
        rule(FADES.map((f) => `${f} .gh-page`).join(', '), `opacity: 0; transition: opacity ${T.feedUi}ms ease`),
    ];
}

