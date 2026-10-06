import { DOWNLOAD_FILL_COLOR, DOWNLOAD_FILL_MS } from '../styles/downloadFill';
import { DEFAULT_ACCENT } from './accent';
import { SOURCE_PILL, sourcePillIcon, sourcePillLook } from '../styles/sourcePill';
import { CLOUD_COLOURS, CloudTone } from './cloud';
import { FRIEND_COLOURS } from './friends';
import { FEED_ROW2_HEADER } from './feedLayout';
import { PERSONA_DOT, PERSONA_DOT_COLOURS, PersonaDot, STATUS_BAR, STATUS_FADE_MS } from './statusItems';
import { ACCENT_MS, CAP_ART_FADE_MS, CAP_STATE_MS, FEED_ART_FADE_MS, FEED_SCROLL, HERO_FADE_MS, SHEET, SHEET_MS, SLIDE } from './motion';
import { TIMINGS } from './openTransition';
import { CARD_SCALE_HANDHELD, GLOW as CAP_GLOW, RECENTS_BOTTOM, recentsGeometry } from './recentsLayout';

/**
 * Marks every declaration `!important` (so CSS Loader themes cannot easily restyle Home, spec section 9),
 * except custom properties: the root's `--glance-accent` default must lose to the inline per-game value.
 * Properties the components set inline (canvas size/transform, bar widths, art urls) are never set here.
 */
function rule(selector: string, body: string): string {
    const decls = body
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => (d.startsWith('--') ? d : `${d} !important`));
    return `${selector} { ${decls.join('; ')}; }`;
}

const GLASS = 'background: rgba(12,16,22,.38); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(14px)';
const SCRIM = '5,7,10';
const GLOW = '0 0 0 1px var(--glance-accent), 0 16px 40px -12px var(--glance-accent)';

/**
 * Title block metrics (handoff), in logical px from the screen top; the CSS below uses them. The title is clamped to
 * `titleLines` lines, so the block never grows past titleBlockBottom() (a long name would otherwise wrap to three
 * lines and push the actions into the recents row docked).
 */
export const TITLE_BLOCK = {
    top: 118,
    gap: 18,
    /** Eyebrow: 12px at line-height 1.2. */
    eyebrow: 12 * 1.2,
    titleSize: 58,
    titleLines: 2,
    /** One row of chips: border 2 + padding 20 + label 12 + gap 4 + value 24 + gap 4 + bar 3. */
    chipRow: 69,
    actionsMargin: 8,
    button: 54,
    /** Room inside the title's clip for descenders and its text-shadow, cancelled by an equal negative margin. */
    titleBleed: 16,
} as const;

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
 * Where each part of the title block sits for a title of `lines` lines (clamped to 1..titleLines), in logical px
 * from the screen top, before the stack shift. Order: title slot (two lines tall, the title aligned to its bottom),
 * eyebrow, chips, actions. Only the title moves with its line count; eyebrow, chips and actions never do.
 */
export function titleBlockLayout(lines: number): TitleBlockLayout {
    const t = TITLE_BLOCK;
    const n = Number.isFinite(lines) ? Math.min(t.titleLines, Math.max(1, Math.round(lines))) : 1;
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
        rule('.gh-root', `--glance-accent: ${DEFAULT_ACCENT}; --glance-accent-text: ${DEFAULT_ACCENT}; --gh-top: 52px; --gh-bottom: ${FEED_SHEET.legendReserve}px; --gh-shift: 0px; --gh-dim: .15;
            --gh-ink: #07090c; --gh-on-accent: #0b0d10; --gh-r-capsule: 8px; --gh-r-card: 12px; --gh-r-panel: 16px; --gh-r-pill: 999px;
            transition: none;
            position: absolute; inset: 0; overflow: hidden; overflow: clip; z-index: 0; background: var(--gh-ink); color: #fff;
            font-family: inherit; text-align: left; line-height: normal; letter-spacing: normal; text-transform: none`),
        rule('.gh-root *', 'box-sizing: border-box'),
        // Open transition: Home fades out under the overlay (attribute set and cleared by OpenOverlay).
        rule('.gh-root[data-gh-leaving]', `opacity: 0; pointer-events: none; transition: opacity ${TIMINGS.homeFade}ms ease`),

        // Hero art: full-bleed on the real screen (not the scaled canvas). Each new art fades in over the last.
        rule('.gh-hero', 'position: absolute; inset: 0; overflow: hidden; pointer-events: none'),
        rule('.gh-hero-layer', `position: absolute; inset: 0; will-change: opacity; animation: gh-fade-in ${HERO_FADE_MS}ms ease both`),
        // A layer whose fade a newer switch interrupted: shown at once (HeroBackground keeps at most two layers).
        rule('.gh-hero-layer.gh-hero-settled', 'animation: none; opacity: 1'),
        rule('.gh-hero-none', 'background: var(--gh-ink)'),
        rule('.gh-hero-full', 'position: absolute; inset: 0; background-size: cover; background-position: center 30%; background-repeat: no-repeat'),
        rule('.gh-hero-blur', 'position: absolute; inset: -60px; background-size: cover; background-position: center; filter: blur(42px) saturate(1.25) brightness(.8)'),
        rule('.gh-hero-sharp', `position: absolute; right: 0; top: 0; height: 100%; width: 62%; background-size: cover; background-position: center 30%;
            background-repeat: no-repeat; opacity: .92;
            -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 45%); mask-image: linear-gradient(90deg, transparent 0%, #000 45%)`),

        // Scrims: flat dim, vertical, left.
        rule('.gh-scrim', 'position: absolute; inset: 0; pointer-events: none'),
        rule('.gh-scrim-dim', `background: rgba(${SCRIM},var(--gh-dim)); transition: background ${SHEET_MS}ms`),
        rule('.gh-scrim-v', `background: linear-gradient(180deg, rgba(${SCRIM},.55) 0%, rgba(${SCRIM},0) 14%, rgba(${SCRIM},0) 48%, rgba(${SCRIM},.72) 100%)`),
        rule('.gh-scrim-l', `background: linear-gradient(90deg, rgba(${SCRIM},.72) 0%, rgba(${SCRIM},.25) 45%, rgba(${SCRIM},0) 70%)`),

        // Scaled canvas; width, height and transform are set inline from homeCanvas().
        rule('.gh-canvas', 'position: absolute; left: 0; top: 0; transform-origin: 0 0'),
        rule('.gh-safe', 'position: absolute; left: 0; right: 0; top: var(--gh-top); bottom: var(--gh-bottom)'),
        // The page holds the whole stack; it sits --gh-shift lower (stackShift, set inline by SpotlightHome), so every
        // element moves as one unit and keeps its gaps.
        rule('.gh-page', `position: absolute; left: 0; right: 0; top: var(--gh-shift); height: 100%; transform: none; transition: transform ${SHEET}, opacity 300ms`),
        // Focus in the tabs or feed: the page rises 440 plus the shift, so the raised sheet keeps its place (tabs at 260, cards at 316).
        rule('.gh-page.gh-page-up', `transform: translateY(calc(-1 * var(--gh-raise, ${FEED_SHEET.raise}px) - var(--gh-shift)))`),

        // Title block (handoff: left 56, top 118 from the screen top, width 620, gap 18): title slot, eyebrow, chips, actions.
        rule('.gh-title-block', `position: absolute; left: 56px; top: calc(${t.top}px - var(--gh-top)); width: 620px; display: flex; flex-direction: column; gap: ${t.gap}px; margin: 0; padding: 0`),
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
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${t.titleLines}; overflow: hidden`),
        // One row of fixed height, present even with no chips yet, so the actions never move.
        rule('.gh-chips', `height: ${t.chipRow}px; display: flex; gap: 10px; flex-wrap: nowrap; align-items: stretch; margin: 0; padding: 0`),
        rule('.gh-chip', `display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; min-width: 104px; border-radius: var(--gh-r-card); ${GLASS}`),
        rule('.gh-chip-label', 'font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; line-height: 1.2; color: rgba(255,255,255,.62)'),
        rule('.gh-chip-value', 'font-size: 20px; font-weight: 700; line-height: 1.2; color: #fff; white-space: nowrap'),
        rule('.gh-chip-bar', 'height: 3px; border-radius: 2px; background: rgba(255,255,255,.14); overflow: hidden'),
        rule('.gh-chip-fill', `height: 100%; background: var(--glance-accent); transition: width ${ACCENT_MS}ms`),

        // Store pill (icon + name) at the right edge, centred on the action row: the game page's pill (styles/sourcePill.ts).
        rule('.gh-source', `position: absolute; right: ${SOURCE_PILL.right}px; top: calc(${sourcePillTop()}px - var(--gh-top)); display: inline-flex; align-items: center;
            margin: 0; border-radius: 999px; border: 1px solid; color: #fff; line-height: 1; white-space: nowrap; pointer-events: none; ${sourcePillLook(px)}`),
        rule('.gh-source-icon', `flex: 0 0 auto; ${sourcePillIcon(px)}`),
        // Status bar (clock, battery, connection) in Steam's top strip: the store pill's glass pill, then your online status
        // dot, near the right edge (STATUS_BAR), above the page (the raised feed slides under it). It all fades out while
        // focus is in Steam's own top bar (`.gh-status-away`, set by SpotlightHome).
        rule('.gh-status', `position: absolute; right: ${STATUS_BAR.right}px; top: ${STATUS_BAR.centreY - SOURCE_PILL.height / 2}px;
            height: ${SOURCE_PILL.height}px; display: flex; align-items: center; gap: ${PERSONA_DOT.gap}px; margin: 0; padding: 0;
            pointer-events: none; z-index: 1; opacity: 1; transition: opacity ${STATUS_FADE_MS}ms ease`),
        rule('.gh-status-dot', `flex: 0 0 auto; width: ${PERSONA_DOT.size}px; height: ${PERSONA_DOT.size}px; margin: 0; padding: 0; border-radius: 50%;
            box-shadow: 0 0 0 2px rgba(12,16,22,.55), 0 1px 4px rgba(0,0,0,.4); transition: background ${ACCENT_MS}ms`),
        ...(Object.keys(PERSONA_DOT_COLOURS) as PersonaDot[]).map((dot) => rule(`.gh-status-dot-${dot}`, `background: ${PERSONA_DOT_COLOURS[dot]}`)),
        rule('.gh-status.gh-status-away', 'opacity: 0'),
        rule('.gh-status-pill', `display: inline-flex; align-items: center; gap: 14px; margin: 0; border-radius: 999px; border: 1px solid; color: rgba(255,255,255,.9);
            line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums; ${sourcePillLook(px)} font-weight: 600`),
        rule('.gh-status-item', 'display: inline-flex; align-items: center; gap: 6px; margin: 0; padding: 0'),
        rule('.gh-status-item svg', 'flex: 0 0 auto; height: 18px; width: auto; display: block'),
        rule('.gh-status-low', `color: ${CLOUD_COLOURS.bad}`),
        rule('.gh-status-offline svg', 'opacity: .6'),
        // Actions: Play pill 250x54 and three 54px circles, gap 12, margin-top 8.
        rule('.gh-actions', `display: flex; gap: 12px; align-items: center; margin: ${t.actionsMargin}px 0 0 0; padding: 0`),
        rule('.gh-btn', `height: ${t.button}px; min-width: 0; margin: 0; padding: 0; border-radius: var(--gh-r-pill); display: flex; align-items: center; justify-content: center; gap: 12px;
            font-size: 19px; font-weight: 700; line-height: 1; color: #fff; background: rgba(12,16,22,.4); border: 1px solid rgba(255,255,255,.18);
            backdrop-filter: blur(12px); box-shadow: none; transform: none; outline: none; cursor: pointer;
            transition: transform 250ms, box-shadow 250ms, background ${ACCENT_MS}ms, border-color ${ACCENT_MS}ms`),
        rule('.gh-btn-circle', 'width: 54px; flex: 0 0 54px; font-size: 22px'),
        // Cloud circle: the same circle as the others; only its icon is coloured by the sync state (cloud.CLOUD_COLOURS,
        // light tints for the dark translucent fill) with a dark halo so it reads over bright art too.
        rule('.gh-btn-cloud svg', 'width: 26px; height: 26px; margin: 0; fill: currentColor; filter: drop-shadow(0 0 1.5px rgba(0,0,0,.7))'),
        ...(Object.keys(CLOUD_COLOURS) as CloudTone[]).map((tone) => rule(`.gh-btn-cloud.gh-cloud-${tone}`, `color: ${CLOUD_COLOURS[tone]}`)),
        rule('.gh-btn-play', 'width: 250px; flex: 0 0 250px; background: var(--glance-accent); border-color: var(--glance-accent); color: var(--gh-on-accent)'),
        // The pill fills with the download progress: the shared darker layer (styles/downloadFill) from the left, clipped to
        // the pill's radius, under the icon and label, exactly as on the details page. No bar below.
        rule('.gh-btn-play', 'position: relative; overflow: hidden'),
        // The download pill's text and glyph are white, as on the details page.
        rule('.gh-btn-play.gh-btn-dl', 'color: #fff'),
        rule('.gh-btn-fill', `position: absolute; left: 0; top: 0; bottom: 0; background: ${DOWNLOAD_FILL_COLOR}; pointer-events: none; transition: width ${DOWNLOAD_FILL_MS}ms linear`),
        rule('.gh-btn-play > .gh-btn-icon, .gh-btn-play > .gh-btn-label', 'position: relative'),
        // The Play pill, laid out as the details page's: the glyph at the left, the label left-aligned after it.
        rule('.gh-btn-play', 'justify-content: flex-start; padding: 0 22px; gap: 13px'),
        rule('.gh-btn-play svg', 'width: 18px; height: 18px; margin: 0'),
        rule('.gh-btn-icon', 'display: flex; align-items: center; justify-content: center; line-height: 1'),
        rule('.gh-btn-play .gh-btn-icon', 'font-size: 18px'),
        rule('.gh-btn.gh-focus', `box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 14px 40px -8px var(--glance-accent); transform: scale(1.04)`),

        // Recents row (handoff: left 44, 140 tall; times the card scale, its bottom stays at 688 and it grows upwards
        // from geo.top). Overflow stays visible: earlier capsules scroll off to the left edge.
        // Every size here derives from recentsGeometry; left, width, dim and ghost opacity are inline. The row is one
        // gamepad focusable (RecentsRow); no pointer events, so a tap or click on a card does nothing.
        rule('.gh-recents', `position: absolute; left: 44px; right: 0; top: calc(${geo.top}px - var(--gh-top)); height: ${geo.capsuleH}px; margin: 0; padding: 0; pointer-events: none`),
        rule('.gh-recents-track', `position: absolute; inset: 0; transition: transform ${SLIDE}`),
        rule('.gh-cap', `position: absolute; top: 0; height: ${geo.capsuleH}px; margin: 0; padding: 0; border-radius: ${k(8)}px; overflow: hidden; background: #111;
            border: none; --gh-edge: rgba(255,255,255,.08); box-shadow: ${capShadow}; outline: none;
            transition: left ${SLIDE}, width ${SLIDE}, opacity ${CAP_STATE_MS}ms`),
        // The 1px edge is drawn OVER the art (::after, inset ring) instead of a border beside it: with a border the art
        // ended inside it at a fractional device pixel, leaving a bright 1-device-px row of un-shaded art at the bottom.
        rule('.gh-cap::after', `content: ''; position: absolute; inset: 0; margin: 0; padding: 0; border-radius: inherit; pointer-events: none;
            box-shadow: inset 0 0 0 1px var(--gh-edge); transition: box-shadow ${CAP_STATE_MS}ms`),
        rule('.gh-cap-wide', '--gh-edge: rgba(255,255,255,.35)'),
        rule('.gh-cap.gh-cap-focus', `box-shadow: ${capGlow}; --gh-edge: rgba(255,255,255,.35)`),
        rule('.gh-cap-blur', `position: absolute; inset: -${k(30)}px; background-size: cover; background-position: center; filter: blur(${k(22)}px) brightness(.75)`),
        // Wide art is mounted only on the expanded capsule, after (over) the portrait, and fades in. The portrait is
        // never hidden: loaded wide art is opaque and covers it; if every wide url fails, the portrait shows through.
        rule('.gh-cap-art', `position: absolute; inset: 0; background-size: cover; background-position: center 30%; background-repeat: no-repeat; animation: gh-fade-in ${CAP_ART_FADE_MS}ms ease both`),
        rule('.gh-cap-cover', `position: absolute; right: 0; top: 0; width: ${geo.capsuleW}px; height: 100%; background-size: cover; background-position: center; background-repeat: no-repeat; opacity: 1`),
        rule('.gh-cap-bar', `position: absolute; left: 0; right: 0; bottom: 0; height: ${k(3)}px; background: var(--glance-accent); opacity: 0; transition: opacity 250ms, background ${ACCENT_MS}ms`),
        rule('.gh-cap.gh-cap-focus .gh-cap-bar', 'opacity: 1'),
        // "New" badge on a game new to the library: a small light pill at the top left, over the art.
        rule('.gh-cap-new', `position: absolute; left: ${k(8)}px; top: ${k(8)}px; margin: 0; padding: ${k(3)}px ${k(7)}px; border-radius: 999px;
            font-size: ${k(8.5)}px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; line-height: 1.2; white-space: nowrap;
            color: #0b0d10; background: rgba(255,255,255,.92); box-shadow: 0 ${k(2)}px ${k(8)}px rgba(0,0,0,.35); pointer-events: none`),
        // While the card row has focus the selected card (or the Library card) is the focused one: a 2px white ring just
        // outside it and an accent glow even on every side (no downward offset, no bar along its bottom edge: on the Ally
        // those read as the card being cut at the bottom). Unfocused it keeps its resting look.
        rule('.gh-recents-focus .gh-cap-wide, .gh-recents-focus .gh-cap-lib-on', `box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 0 ${k(28)}px ${k(2)}px var(--glance-accent); --gh-edge: rgba(255,255,255,.35)`),
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
        rule('.gh-ghost', 'cursor: default; pointer-events: none; --gh-edge: rgba(255,255,255,.06); box-shadow: none; filter: grayscale(.6) brightness(.75)'),
        rule('.gh-ghost-badge', `position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${k(6)}px; background: rgba(5,7,10,.45)`),
        rule('.gh-ghost-icon', `width: ${k(36)}px; height: ${k(36)}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: ${k(20)}px; font-weight: 700; line-height: 1; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.35); color: #fff`),
        rule('.gh-ghost-label', `font-size: ${k(9.5)}px; font-weight: 800; letter-spacing: .18em; line-height: 1.2; text-align: center; color: #fff`),
        rule('.gh-btn-library', 'width: 280px; flex: 0 0 280px; background: var(--glance-accent); border-color: var(--glance-accent); color: var(--gh-on-accent)'),

        // Feed sheet: tab strip (handoff: top 700 from the screen top plus the stack shift, ending 18 above the legend reserve at rest).
        rule('.gh-tabs', `position: absolute; left: 44px; right: 44px; top: calc(${FEED_SHEET.tabsTop}px - var(--gh-top)); display: flex; justify-content: flex-start; gap: 30px; margin: 0; padding: 0`),
        rule('.gh-tab', `position: relative; margin: 0; padding: 8px 2px 10px; font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
            line-height: 1.2; white-space: nowrap; color: rgba(255,255,255,.6); background: transparent; outline: none; cursor: pointer; transition: color 200ms`),
        rule('.gh-tab.gh-tab-on', 'color: #fff'),
        rule('.gh-tab-line', `position: absolute; left: 0; right: 0; bottom: 0; height: 3px; border-radius: 2px; background: var(--glance-accent); opacity: 0; box-shadow: none;
            transition: opacity 250ms, box-shadow 250ms, background ${ACCENT_MS}ms`),
        rule('.gh-tab.gh-tab-on .gh-tab-line', 'opacity: .55'),
        rule('.gh-tab.gh-tab-focus .gh-tab-line', 'opacity: 1; box-shadow: 0 0 14px 2px var(--glance-accent)'),
        // Friends tab: people icon and the number of friends online, after the label.
        rule('.gh-tab-count', `display: inline-flex; align-items: center; gap: 4px; margin: 0 0 0 8px; font-size: 11px; letter-spacing: .04em; line-height: 1;
            vertical-align: 1px; color: ${FRIEND_COLOURS.none}; transition: color 200ms`),
        // Someone connected (online, away or in game): Steam's in-game green, never the game accent.
        rule('.gh-tab-count.gh-tab-count-on', `color: ${FRIEND_COLOURS.online}`),
        rule('.gh-tabs-more', 'margin: 0 0 0 auto; align-self: center; font-size: 11px; letter-spacing: .16em; font-weight: 700; line-height: 1.2; color: rgba(255,255,255,.55); opacity: 1; transition: opacity 300ms'),
        rule('.gh-page-up .gh-tabs-more', 'opacity: 0'),
        // Cards (top 756, 260 tall, gap 14); hidden until the sheet is up. Left, width and the art url are inline.
        rule('.gh-feed', 'position: absolute; left: 44px; right: 0; top: calc(756px - var(--gh-top)); margin: 0; padding: 0; opacity: 0; pointer-events: none; transition: opacity 400ms'),
        // One or two card rows (feedLayout.feedRows; heights inline), each with its own track and scroll; the second row's
        // small header sits just above it.
        rule('.gh-feed-row', 'position: absolute; left: 0; right: 0; margin: 0; padding: 0'),
        rule('.gh-feed-row-title', `position: absolute; left: 0; height: ${FEED_ROW2_HEADER}px; margin: 0; padding: 0; display: flex; align-items: flex-start;
            font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; line-height: 1.2; color: rgba(255,255,255,.62)`),
        rule('.gh-page-up .gh-feed', 'opacity: 1; pointer-events: auto'),
        rule('.gh-feed-track', `position: absolute; inset: 0; margin: 0; padding: 0; transition: transform ${FEED_SCROLL}`),
        rule('.gh-feed-empty', 'position: absolute; left: 0; top: 0; height: 260px; display: flex; align-items: center; font-size: 16px; font-weight: 700; letter-spacing: .02em; color: rgba(255,255,255,.62)'),
        rule('.gh-card', `--gh-ring: rgba(255,255,255,.25);
            position: absolute; top: 0; height: var(--gh-card-h, 260px); margin: 0; padding: 0; border-radius: var(--gh-r-card); overflow: hidden; color: #fff;
            background: rgba(12,16,22,.4); border: none; --gh-edge: rgba(255,255,255,.1); backdrop-filter: blur(16px); box-shadow: 0 6px 20px -10px rgba(0,0,0,.6);
            transform: none; outline: none; cursor: pointer; transition: box-shadow 300ms, transform 300ms, --gh-card-accent ${ACCENT_MS}ms ease`),
        // The edge over the art and shade, as on the recents capsules (no un-shaded bottom row).
        rule('.gh-card::after', `content: ''; position: absolute; inset: 0; margin: 0; padding: 0; border-radius: inherit; pointer-events: none;
            box-shadow: inset 0 0 0 1px var(--gh-edge); transition: box-shadow 300ms`),
        rule('.gh-card.gh-card-focus', `box-shadow: ${GLOW}; --gh-edge: rgba(255,255,255,.3); transform: translateY(-4px)`),
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
        rule('.gh-card-sub', `font-size: 10.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; line-height: 1.4; color: rgba(255,255,255,.62);
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden`),
        rule('.gh-card-bar', `position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--glance-accent); opacity: 0; transition: opacity 250ms, background ${ACCENT_MS}ms`),
        rule('.gh-card.gh-card-focus .gh-card-bar', 'opacity: 1'),
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
 * The open transition's overlay stylesheet (OpenOverlay injects it inside the overlay, which lives in the
 * document body so it outlives Home: Steam unmounts Home when the game page opens). The clone is placed over
 * the source (`--gh-from-*`, inline, relative to the overlay) and expands to the whole overlay with the radius
 * going to 0, then fades from `navigateAt`. Its z-index only has to clear Steam's UI root (BasicUI, z-index 5,
 * the body's only layer; probed on the Ally), so it covers Steam's bars too for the second it is up. Left, top, size, radius and opacity are animated only, never set in a
 * rule: `!important` declarations would beat the animation. Ink under the art, so failed art still animates.
 * The clone starts with the capsule's corner radius at `cardScale` (the rect itself is measured, so it follows any scale).
 */
export function openOverlayCss(cardScale: number = CARD_SCALE_HANDHELD): string {
    const { expand, navigateAt, overlayFade } = TIMINGS;
    const k = recentsGeometry(cardScale).fine;
    return [
        `@keyframes gh-open-expand { from { left: var(--gh-from-l); top: var(--gh-from-t); width: var(--gh-from-w); height: var(--gh-from-h); border-radius: ${k(8)}px; } `
            + 'to { left: 0; top: 0; width: 100%; height: 100%; border-radius: 0; } }',
        '@keyframes gh-open-fade { from { opacity: 1; } to { opacity: 0; } }',
        rule('.gh-open', 'position: fixed; z-index: 99999; margin: 0; padding: 0; overflow: hidden; pointer-events: none; background: transparent'),
        rule('.gh-open-clone', `position: absolute; margin: 0; padding: 0; background-color: #07090c; background-size: cover; background-position: center 30%;
            background-repeat: no-repeat; box-shadow: 0 0 0 1px var(--glance-accent), 0 20px 60px -10px var(--glance-accent);
            animation: gh-open-expand ${expand}ms cubic-bezier(.6,0,.2,1) both, gh-open-fade ${overlayFade}ms ease ${navigateAt}ms forwards`),
    ].join('\n');
}
