import { DOWNLOAD_FILL_COLOR, DOWNLOAD_FILL_MS } from './downloadFill';
import { hoverRing, MOUSE_ATTR, NOT_MOUSE } from '../home/mouseMode';
import { DEFAULT_ACCENT, legibleAccent } from '../home/accent';
import { CLOUD_COLOURS, CLOUD_DOT, CLOUD_GLYPH_URL } from '../home/cloud';
import { homeCanvas } from '../home/scale';
import { LOGO_BOX } from './logoBox';
import { SCALE_UNIT_CSS } from './screenScale';
import { sourcePillIcon, sourcePillLook } from './sourcePill';

export type ClassMap = Record<string, string | undefined> | undefined;

/** Steam class maps, looked up by module key (see styles/theme.ts). Verified live on 2026-10-02. */
export interface ThemeClasses {
    header: ClassMap; // appDetailsHeaderClasses: TopCapsule, BoxSizer
    details: ClassMap; // appDetailsClasses: InnerContainer, AppDetailsOverviewPanel
    overview: ClassMap; // overview panel module: Backdrop
    root: ClassMap; // app details root module: AppDetailsRoot, PlaySection, ActionRow, ActionButtonAndStatusPanel, AppButtons, AppDetailsContainer
    play: ClassMap; // playSectionClasses: StatusAndStats, MenuButton, CloudStatus*, OfflineMode
    launch?: ClassMap; // Steam's launch overlay module: Container, ConfigurationHeader, ControlOverviewContainer, LaunchStatus
    shared?: ClassMap; // the Play section's family library line module: Row, SharedLibrary
    transition?: ClassMap; // Steam's top-level page transition module: TopLevelTransition, Enter, EnterActive (its page-enter fade)
    footer?: ClassMap; // Steam's footer module: BasicFooter, FooterLegend (the button legend along the bottom of every page)
}

function cls(map: ClassMap, key: string): string | null {
    const name = map?.[key];
    return typeof name === 'string' && name.length > 0 ? `.${name}` : null;
}

/** The native source remains mounted; the restyled metadata row mirrors only a blocking explanation. */
export function nativeUnavailableMessageSelectors({ root, play }: ThemeClasses): { container: string | null; message: string | null } {
    const status = cls(play, 'StatusAndStats');
    const unavailable = cls(play, 'PermanentlyUnavailable');
    const label = cls(play, 'DetailsSectionStatus');
    return { container: cls(root, 'ActionRow'), message: status && unavailable && label ? `${status}${unavailable} ${label}` : null };
}


/**
 * A focused pill's scale: 4% taller as a focused circle, but only as much wider as a circle grows (its height's share), not
 * 4% of its width: a 340 wide pill grew 6.8 px each side and halved its gap to the circles (Michael: too narrow). Same on
 * Home's pill, the page's and Unifideck's. Pure.
 */
export function pillFocusScale(width: number, height: number): { x: number; y: number } {
    const f = PAGE_LAYOUT.focusScale;
    return { x: Math.round((1 + (height * (f - 1)) / width) * 100000) / 100000, y: f };
}

/** One CSS rule, or nothing if any Steam class it needs is missing (so a Steam update skips it). */
function rule(selectors: Array<string | null> | string | null, body: string): string {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    if (list.length === 0 || list.some((s) => s === null)) return '';
    return `${list.join(', ')} {${body}}`;
}

const present = (list: Array<string | null>) => list.filter((s): s is string => s !== null);

/** The band under the Play row where `.gg-hero` is pinned. Tabs normally start below it. */
const CARD_BAND = 'calc(100vh - var(--gg-play-top) - var(--gg-row-h))';
/**
 * Steam inserts in-flow rows between the Play section and the tabs (Deck compatibility feedback).
 * Only a wrapper containing a populated Panel before the tabs counts as feedback. Steam also
 * mounts empty Panel placeholders there; styling those would remove the tabs' cards-band spacer
 * even when there is no feedback. Transfer that spacer to the first real row, then let later
 * rows and the tabs follow without a second spacer. Each feedback card has the same inset on
 * every side. The absolutely positioned cloud row is excluded.
 */
function cardBandClearance(playSection: string | null, tabs: string | null, cloud: string | null): string[] {
    if (!playSection || !tabs || !cloud) return [];
    const gap = `${playSection} ~ *:not(${cloud}):not(${tabs}):has(> .Panel:not(:empty)):has(~ ${tabs})`;
    const card = `${gap} > .Panel`;
    return [
        rule(gap, ` margin-top: ${CARD_BAND} !important; padding: calc(var(--gg-side) / 2) !important; box-sizing: border-box !important; `),
        rule(card, ` margin: 0 !important; width: auto !important; max-width: none !important; box-sizing: border-box !important; background: rgba(12, 16, 22, 0.38) !important; border: 1px solid rgba(255, 255, 255, 0.12) !important; border-radius: calc(16 * var(--gg-d, 1)) !important; backdrop-filter: blur(calc(16 * var(--gg-d, 1))) !important; `),
        rule(`${gap} ~ *:not(${cloud}):not(${tabs}):has(> .Panel:not(:empty)):has(~ ${tabs})`, ` margin-top: 0 !important; `),
        rule(`${gap} ~ ${tabs}`, ` margin-top: 0 !important; `),
    ];
}


/** A size in the theme's scale unit: `n` px on the handheld's 828×466 layout, larger on a TV (60% of the screen's growth; screenScale.ts). */
const u = (n: number) => `calc(${n} * var(--gg-u))`;

/**
 * A size from the design handoff, in its px, scaled exactly like Spotlight Home (home/scale.ts): the handoff's
 * 1440x810 canvas fills a 16:9 screen, its 1280x800 one a 16:10 screen (aspect 1.7 or less). The restyled title and
 * cards are Home's size on every screen, so Home's title block and the details title line up.
 */
const d = (px: number) => `calc(${px} * var(--gg-d))`;
/** Hover looks apply only in mouse mode (home/mouseMode). */
const HOVER = `html[${MOUSE_ATTR}]`;
/** Accent changes animate over 500 ms on every accent-coloured property, as on Home (handoff "Interactions & motion"). */
const ACCENT_MS = 500;

// The 1.1.1 scrims over the art (bottom, for the cards; left, for the logo).
const SCRIM_BOTTOM = 'linear-gradient(0deg, rgba(8, 11, 15, 0.94) 0%, rgba(8, 11, 15, 0.6) 34%, transparent 60%)';
const SCRIM_LEFT = 'linear-gradient(90deg, rgba(8, 11, 15, 0.45) 0%, transparent 45%)';
// The handoff's details scrims (scrim base rgb(5,7,10)), laid over the 1.1.1 ones when restyled.
const HANDOFF_SCRIM_LEFT = 'linear-gradient(90deg, rgba(5, 7, 10, 0.6) 0%, rgba(5, 7, 10, 0.1) 55%, rgba(5, 7, 10, 0) 75%)';
const HANDOFF_SCRIM_BOTTOM = 'linear-gradient(180deg, rgba(5, 7, 10, 0) 55%, rgba(5, 7, 10, 0.6) 100%)';
/** The restyled header's scrim layers, top to bottom (the handoff's over the 1.1.1 ones); also Home's page scrim in the open transition. */
export const PAGE_SCRIM_LAYERS = [HANDOFF_SCRIM_LEFT, HANDOFF_SCRIM_BOTTOM, SCRIM_BOTTOM, SCRIM_LEFT] as const;
/**
 * Steam's own shadow along the top of the game page (its header module's TopGradient: 75 px, black .5 to clear;
 * probed on the Ally). Steam draws it on the page itself; Spotlight Home draws it too (homeCss .gh-scrim-page).
 */
export const STEAM_TOP_GRADIENT = 'linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0px, rgba(0, 0, 0, 0) 75px)';
/** The same layers as one CSS background value. */
export const PAGE_SCRIMS = PAGE_SCRIM_LAYERS.join(', ');

/**
 * The restyled page's layout in the handoff's px (`d`, --gg-d), one source for the theme below and for the open
 * transition's targets (home/openTargets). Values in px are CSS px; everything else is in d units.
 */
export const PAGE_LAYOUT = {
    /**
     * --gg-d = min(100vw / width, 100vh / height): the 1440x810 canvas, or 1280x800 at an aspect of 17/10 or narrower,
     * scaled by the limiting side as Home's (home/scale.ts homeCanvas).
     */
    canvas: { wide: 1440, wideHeight: 810, deck: 1280, deckHeight: 800, deckMaxAspect: 1.7 },
    /** The TV media query (CSS px). */
    tvQuery: { minWidth: 1408, minHeight: 793 },
    side: { base: 56, tv: 24 },
    playW: 340,
    icon: 60,
    gap: 14,
    /** The Play row: the pill (icon) and the gap under it. */
    rowH: 96,
    /** Play row top: H - spotlight; on a TV H - legend - (rowH + tvCards + tvGap). */
    playTop: { spotlight: 386, tvCards: 178, tvGap: 24 },
    /** The Clean look: the row ends max(bottom, minBelowRow px - (rowH - icon)) above the bottom; title and store pill gaps above the row. */
    clean: { bottom: 36, minBelowRow: 61, gap: 28, storeGap: 20 },
    /** The title block's bottom above the Play row (Spotlight look). */
    titleGap: 36,
    /**
     * infoW / hltbW: the cards' widest outer widths, sized to their content rather than the row (issue #53): HowLongToBeat fits
     * three 3-digit times (406 of its 420 content), the info card a little wider. Where the row has room to spare the art
     * shows between them. From equalFromAspect (9:5, wider than any 16:9 window) both are as wide as the HowLongToBeat card.
     */
    cards: { gridGap: 18, padX: 24, padY: 20, colGap: 12, hltbGap: 10, split: [1.1, 1] as const, infoW: 540, hltbW: 470, equalFromAspect: 1.8 },
    stats: { label: 11, value: 30, colGapInfo: 40, colGapHltb: 36, rowGap: 4 },
    /** The title block: the gap between title and eyebrow, and the eyebrow's type size. */
    titleBlock: { gap: 14, eyebrow: 12, title: 64 },
    /** Inside the Play pill: its glyph's inset, the glyph, the gap to the label, the label's type size. */
    pill: { padX: 24, icon: 20, iconGap: 14, font: 22 },
    /** The Play pill's "Play from" arrow (a game on more than one device): its segment's width and glyph, at the pill's right end. */
    playArrow: { w: 56, glyph: 14 },
    /** The glyph in the controller and gear circles. */
    circleIcon: 24,
    /** A focused button grows by this about its centre (Home's buttons and the page's Play, alike). */
    focusScale: 1.04,
    /** The cloud circle's glyph (Home's size; the page's was in another unit, so its ratio to Home's changed with the screen). */
    cloudIcon: 26,
    cleanInfo: { padX: 24, padY: 14, colGap: 28, value: 22, barW: 96, barH: 4, barTop: 2 },
    /** Inside the Spotlight cards: the description's type size, line height and lines (clamped), the caption's type size, the HowLongToBeat bar's height. */
    cardText: { desc: 15, descLine: 1.5, descLines: 3, caption: 15, bar: 6 },
    /** The store pill's top above the cards block (.gg-hero), Spotlight look. */
    storePillTop: 82,
} as const;

/** The page's Play pill focused (pillFocusScale on the pill's size). */
const PILL_FOCUS = pillFocusScale(PAGE_LAYOUT.playW, PAGE_LAYOUT.icon);

/** The TV media query as CSS. */
const TV_QUERY = `@media (min-width: ${PAGE_LAYOUT.tvQuery.minWidth}px) and (min-height: ${PAGE_LAYOUT.tvQuery.minHeight}px)`;

/**
 * The Spotlight cards' widest widths in handoff px, [info, HowLongToBeat]: cards.infoW and hltbW, so where the row is wider
 * the art shows between them. On a screen of `aspect` cards.equalFromAspect or wider, the info card is as wide as the
 * HowLongToBeat card. Shared by the theme and the open transition.
 */
export function cardMaxWidths(aspect = 0): [number, number] {
    const { infoW, hltbW, equalFromAspect } = PAGE_LAYOUT.cards;
    return [aspect >= equalFromAspect ? hltbW : infoW, hltbW];
}

/** Steam's own line height on the Play button's label, px whatever the screen (its class; probed on the Ally, docked). */
export const STEAM_PLAY_LINE = 20;

/** The page's text roles (the open transition's text twins draw the same, home/openTwins). */
export type TypeRole = 'title' | 'eyebrow' | 'label' | 'value' | 'cleanValue' | 'playLabel';

/**
 * The page's type per role, sizes in d units: one source for the page's rules and Home's text twins, so the open lands
 * on text drawn exactly as the page draws it. What the page inherits from Steam is left out (undefined), never declared:
 * the play label's spacing and line height, the values' spacing, the labels' line height (1.5).
 */
export const PAGE_TYPE: Record<TypeRole, { size: number; weight: number; letterSpacing?: string; lineHeight?: string; upper: boolean }> = {
    title: { size: PAGE_LAYOUT.titleBlock.title, weight: 800, letterSpacing: '-0.02em', lineHeight: '1', upper: false },
    eyebrow: { size: PAGE_LAYOUT.titleBlock.eyebrow, weight: 700, letterSpacing: '0.2em', lineHeight: '1.2', upper: true },
    label: { size: PAGE_LAYOUT.stats.label, weight: 700, letterSpacing: '0.18em', upper: true },
    value: { size: PAGE_LAYOUT.stats.value, weight: 700, lineHeight: '1.2', upper: false },
    cleanValue: { size: PAGE_LAYOUT.cleanInfo.value, weight: 700, lineHeight: '1.2', upper: false },
    playLabel: { size: PAGE_LAYOUT.pill.font, weight: 700, upper: false },
};

/** A role's declarations (PAGE_TYPE) with sizes in `unit`; `important` for rules that must beat Steam's. */
export function pageType(role: TypeRole, unit: (n: number) => string, important = false): string {
    const t = PAGE_TYPE[role];
    const imp = important ? ' !important' : '';
    const decls = [`font-size: ${unit(t.size)}`, `font-weight: ${t.weight}`];
    if (t.letterSpacing) decls.push(`letter-spacing: ${t.letterSpacing}`);
    if (t.lineHeight) decls.push(`line-height: ${t.lineHeight}`);
    if (t.upper) decls.push('text-transform: uppercase');
    return decls.map((x) => `${x}${imp};`).join(' ');
}

/** A card's max-width for its outer width `outer` (handoff px): the cards are content-box, so less the padding and the rings (1 d unit). */
const cardContentMax = (outer: number) => d(outer - 2 * PAGE_LAYOUT.cards.padX - 2);
/** A card's width filling its grid column, content-box as above: a plain 100% overflowed the column by the padding and borders. */
const CARD_FILL_WIDTH = `calc(100% - ${d(2 * PAGE_LAYOUT.cards.padX + 2)})`;

/** The page's d unit (CSS px per handoff px) for a Big Picture window of `width` x `height` CSS px, as --gg-d: Home's scale. */
export function pageDUnit(width: number, height: number): number {
    return homeCanvas(width, height).scale;
}

/**
 * How much brighter the page's glass rings are drawn to look like Home's, on a screen of `dpr` device px per CSS px and
 * `width` x `height` CSS px. Chromium draws a border on whole device px (at least one) in the element's own units:
 * Home's 1 canvas px is max(1, floor(dpr)) device px, then scaled by the canvas (soft: 1.15 on the Ally), the page's 1 d unit
 * is max(1, floor(d * dpr)) (crisp: 1 on the Ally). The ratio of the two, so the light each ring gives is the same; 1 when
 * the ratio is not known.
 */
export function ringBoost(dpr: number, width: number, height: number): number {
    if (!(dpr > 0)) return 1;
    const d = pageDUnit(width, height);
    const home = Math.max(1, Math.floor(dpr)) * d;
    const page = Math.max(1, Math.floor(d * dpr));
    return Math.round((home / page) * 1000) / 1000;
}

/** The page's ring boost (ringBoost) as --gg-ring, which the glass rings' colours are multiplied by. */
export function buildRingCss(boost: number): string {
    return `:root { --gg-ring: ${boost}; }`;
}

/** A ring colour: white at Home's `alpha`, times the page's ring boost (--gg-ring). */
const ring = (alpha: number) => `rgba(255, 255, 255, calc(${alpha} * var(--gg-ring, 1)))`;

export interface ThemeOptions {
    /** Spotlight Home's look (both toggles on, homeMode().restyleDetails): only appends rules to the 1.1.1 theme. */
    restyle?: boolean;
}

/**
 * The theme's CSS, built from Steam's class names. Pure, so it can be tested.
 *
 * Layout (all-or-nothing): Steam's header becomes screen-tall, Steam's overview block (Play row + tabs)
 * is pulled up onto the art, our cards are overlaid under the Play row, and the tabs start on the next
 * screen. A row Steam inserts between the Play section and the tabs takes that spacer instead, so it
 * does not sit on the cards. Nothing in Steam's page structure moves, so controller navigation and
 * scrolling stay Steam's.
 * If any class the layout needs is missing, none of the layout applies and the page stays stacked.
 * Without `restyle` the 1.1.1 layout is preserved, with unavailable-status explanations (#62); `restyle` appends restyleRules().
 */
export function buildThemeCss(classes: ThemeClasses, options: ThemeOptions = {}): string {
    const { header, details, overview, root, play, launch } = classes;
    const launchOverlay = cls(launch, 'Container');
    const topCapsule = cls(header, 'TopCapsule');
    const logoBox = cls(header, 'BoxSizer');
    const inner = cls(details, 'InnerContainer');
    const overviewPanel = cls(details, 'AppDetailsOverviewPanel');
    const backdrop = cls(overview, 'Backdrop');
    const appRoot = cls(root, 'AppDetailsRoot');
    const playSection = cls(root, 'PlaySection');
    const actionRow = cls(root, 'ActionRow');
    const playButton = cls(root, 'ActionButtonAndStatusPanel');
    const appButtons = cls(root, 'AppButtons');
    const tabs = cls(root, 'AppDetailsContainer');
    const cloud = cls(play, 'CloudStatusRow');
    const cloudLabel = cls(play, 'CloudStatusLabel');
    const cloudIcon = cls(play, 'CloudStatusIcon');
    const syncing = cls(play, 'CloudSynching');
    const problem = cls(play, 'CloudSyncProblem');
    const fail = cls(play, 'CloudStatusSyncFail');
    const offline = cls(play, 'OfflineMode');
    const menuButton = cls(play, 'MenuButton');
    const statusAndStats = cls(play, 'StatusAndStats');
    const unavailable = cls(play, 'PermanentlyUnavailable');
    // This wrapper also owns Steam's install-blocking explanations (#62), not just duplicate statistics.
    // If its unavailable class is unknown, keep the wrapper rather than silently hiding the reason.
    const hidden = present([statusAndStats && unavailable ? `${statusAndStats}:not(${unavailable})` : null, cls(play, 'GameStatsSection'), cls(play, 'Playtime'), cls(play, 'LastPlayed')]);

    const layout = topCapsule && inner && overviewPanel && tabs;

    const rules: string[] = [
        `:root {
            --gg-accent: #1fbf8f;
            --gg-ok: #1fbf8f;
            --gg-warn: #e6b800;
            --gg-bad: #e5484d;
            --gg-off: #8a8f98;
            --gg-glass: rgba(255, 255, 255, 0.045);
            --gg-border: rgba(255, 255, 255, 0.11);
            --gg-muted: rgba(255, 255, 255, 0.6);
            --gg-u: ${SCALE_UNIT_CSS};
            --gg-row-h: ${u(88)};
            --gg-play-w: ${u(246)};
            --gg-icon: ${u(44)};
            --gg-gap: ${u(10)};
            --gg-side: 2.8vw;
        }`,
        // Our elements (stacked fallback position; the layout below overlays them).
        `.gg-hero { position: relative; margin: 1vh var(--gg-side); font-family: inherit; color: #fff; }`,
        `.gg-cards { display: flex; gap: ${u(14)}; align-items: stretch; }`,
        `.gg-card { flex: 1 1 0; min-width: 0; background: var(--gg-glass); border: 1px solid var(--gg-border);
            border-radius: ${u(10)}; padding: ${u(9)} ${u(12)}; backdrop-filter: blur(${u(10)}); }`,
        `.gg-card.gg-hltb { flex: 0.95 1 0; }`,
        `.gg-label { font-size: ${u(8.5)}; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gg-muted); white-space: nowrap; }`,
        `.gg-value { font-size: ${u(17)}; font-weight: 700; white-space: nowrap; }`,
        `.gg-stats { display: flex; gap: ${u(18)}; margin-top: ${u(2)}; }`,
        `.gg-goal .gg-value { color: var(--gg-accent); }`,
        `.gg-desc { margin: ${u(6)} 0 0; font-size: ${u(10.5)}; line-height: 1.4; color: rgba(255, 255, 255, 0.85);
            display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }`,
        `.gg-muted { margin-top: ${u(8)}; font-size: ${u(10)}; color: var(--gg-muted); }`,
        `.gg-bar { margin-top: ${u(8)}; height: ${u(4)}; border-radius: ${u(2)}; background: rgba(255, 255, 255, 0.14); overflow: hidden; }`,
        `.gg-bar > div { height: 100%; border-radius: ${u(2)}; background: var(--gg-accent); }`,
        `.gg-caption { margin-top: ${u(5)}; font-size: ${u(10)}; color: var(--gg-muted); }`,
        `.gg-skeleton { display: inline-block; width: 3.2em; height: 1em; border-radius: ${u(4)}; background: rgba(255, 255, 255, 0.12); }`,
        `.gg-pill { position: absolute; right: 0; top: calc(-1 * ${u(60)}); height: ${u(24)}; display: inline-flex; align-items: center; padding: 0 ${u(10)};
            border-radius: 999px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.2); font-size: ${u(11)}; }`,
        `.gg-pill-icon { flex: 0 0 auto; width: ${u(12)}; height: ${u(12)}; margin-right: ${u(6)}; }`,
        `.gg-more { position: absolute; left: 50%; bottom: ${u(44)}; transform: translateX(-50%); font-size: ${u(20)}; line-height: 1; opacity: 0.35; pointer-events: none; }`,

        // Duplicate stats: our info card already shows play time.
        rule(hidden.length ? hidden : null, ` display: none !important; `),
        // Unavailable reasons belong below the main button, in the row's existing lower gap. Keeping the wrapper
        // in the flex row would push the controller/settings controls to the right (#62, found on the Ally).
        rule(actionRow && statusAndStats && unavailable && `${actionRow}:has(> ${statusAndStats}${unavailable})`, ` position: relative !important; `),
        rule(actionRow && statusAndStats && unavailable && `${actionRow} > ${statusAndStats}${unavailable}`, ` position: absolute !important; left: 0 !important;
            top: calc(var(--gg-icon) + ${u(4)}) !important; max-height: none !important; overflow: visible !important; `),

        // Play row: pill Play button, round icon buttons, room for the cloud icon.
        rule(actionRow, ` justify-content: flex-start !important; align-items: flex-start !important; gap: var(--gg-gap) !important; `),
        rule(playButton, ` width: var(--gg-play-w) !important; flex: 0 0 var(--gg-play-w) !important; `),
        // Play is one pill; games with a "Play from" arrow (local vs. streaming) get it as a segment inside the pill.
        rule(playButton && `${playButton} > div:has(> [role="button"])`, ` display: flex !important; width: 100% !important; height: var(--gg-icon) !important;
            border-radius: 999px !important; overflow: hidden !important; background: var(--gg-accent) !important; box-shadow: none !important; `),
        rule(playButton && `${playButton} [role="button"]`, ` background: transparent !important; border-radius: 0 !important; width: auto !important;
            flex: 1 1 auto !important; min-width: 0 !important; min-height: 0 !important; height: 100% !important; color: #ffffff !important;
            font-size: ${u(16)} !important; padding: ${u(8)} ${u(16)} !important; `),
        rule(playButton && `${playButton} [role="button"] > div`, ` font-size: ${u(16)} !important; `),
        rule(playButton && `${playButton} [role="button"] + [role="button"]`, ` flex: 0 0 ${u(38)} !important; width: ${u(38)} !important; padding: 0 !important;
            display: flex !important; align-items: center !important; justify-content: center !important; border-left: 1px solid rgba(4, 17, 12, 0.25) !important; `),
        rule(playButton && `${NOT_MOUSE} ${playButton} [role="button"].gpfocus`, ` background: rgba(255, 255, 255, 0.28) !important; `),
        rule(appButtons, ` margin-left: 0 !important; gap: var(--gg-gap) !important; `),
        rule(appButtons && `${appButtons} > *`, ` margin: 0 !important; padding: 0 !important; `),
        rule(menuButton, ` width: var(--gg-icon) !important; height: var(--gg-icon) !important; min-width: 0 !important; margin: 0 !important; box-sizing: border-box !important; border-radius: 50% !important;
            background: rgba(255, 255, 255, 0.08) !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; `),
        rule(menuButton && `${NOT_MOUSE} ${menuButton}.gpfocus`, ` background: #ffffff !important; color: #0b0f14 !important; `),
        // Steam's own icons and row padding, scaled like the rest (Steam sizes them in fixed pixels).
        rule(playButton && menuButton && [`${playButton} svg`, `${menuButton} svg`], ` width: ${u(24)} !important; height: ${u(24)} !important; `),
        rule(playButton && `${playButton} [role="button"] svg`, ` margin-right: ${u(16)} !important; `),
        rule(playButton && `${playButton} [role="button"] + [role="button"] svg`, ` width: ${u(12)} !important; height: ${u(12)} !important; margin: 0 !important; `),
        rule(playSection, ` background: transparent !important; padding-top: ${u(16)} !important; padding-bottom: ${u(16)} !important; `),

        // Cloud sync row shrunk to a coloured icon after the last button (non-Steam games have none, so it goes last).
        // It is a sibling of Steam's Play section, not in the row, so it is placed by counting the row's buttons.
        rule(cloud, ` position: absolute !important; top: ${u(16)} !important;
            left: calc(var(--gg-side) + var(--gg-play-w) + var(--gg-gap) + var(--gg-buttons, 2) * (var(--gg-icon) + var(--gg-gap))) !important;
            width: var(--gg-icon) !important; height: var(--gg-icon) !important; padding: 0 !important; margin: 0 !important; box-sizing: border-box !important;
            display: flex; align-items: center; justify-content: center; border-radius: 50%;
            background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.18); color: var(--gg-ok) !important; `),
        ...[1, 2, 3, 4, 5].map((n) =>
            rule(playSection && appButtons && cloud && `${playSection}:has(${appButtons} > :nth-child(${n}):last-child) ~ ${cloud}`, ` --gg-buttons: ${n}; `),
        ),
        rule(cloud && [`${cloud}::before`, `${cloud}::after`], ` content: none !important; `),
        rule(cloud && `${cloud} svg`, ` fill: currentColor !important; color: inherit !important;
            width: ${u(16)} !important; height: ${u(16)} !important; margin: 0 ${u(8)} ${u(4)} !important; `),
        rule(cloudIcon, ` height: ${u(16)} !important; `),
        rule(cloudLabel, ` display: none !important; `),
        rule(cloud && syncing && [`${cloud}${syncing}`, `${syncing} ${cloud}`, `${cloud} ${syncing}`], ` color: var(--gg-warn) !important; `),
        rule(cloud && problem && [`${cloud}${problem}`, `${problem} ${cloud}`, `${cloud} ${problem}`], ` color: var(--gg-bad) !important; `),
        rule(cloud && fail && [`${cloud}${fail}`, `${fail} ${cloud}`, `${cloud} ${fail}`], ` color: var(--gg-bad) !important; `),
        rule(cloud && offline && `${offline} ${cloud}`, ` color: var(--gg-off) !important; `),

        // Steam's launch overlay (controller layout and "Starting launch..." text) sits straight on our art and cards.
        // Dimming what is behind it makes its text readable; it fades in with the overlay.
        rule(launchOverlay, ` background: rgba(0, 0, 0, 0.75) !important; `),
    ];

    if (layout) {
        rules.push(
            // The Play row's top, measured from the bottom so the row and cards sit at the bottom of any screen
            // (205px = 44vh down on the handheld; on a TV the art above gets the extra room).
            `:root { --gg-play-top: calc(100vh - ${u(261)}); }`,
            rule(topCapsule, ` height: 100vh !important; min-height: 0 !important; `),
            rule(`${topCapsule}::after`, ` content: ''; position: absolute; inset: 0; pointer-events: none;
                background: ${SCRIM_BOTTOM},
                            ${SCRIM_LEFT}; `),
            rule(logoBox, ` top: 6% !important; height: 30% !important; `),
            rule(inner, ` position: relative !important; `),
            rule(overviewPanel, ` margin-top: calc(var(--gg-play-top) - 100vh) !important; position: relative; `),
            rule(backdrop, ` display: none !important; `),
            rule(appRoot, ` background: transparent !important; `),
            rule(tabs, ` margin-top: ${CARD_BAND} !important; background: rgba(14, 20, 27, 0.9) !important; `),
            ...cardBandClearance(playSection, tabs, cloud),
            rule(`${inner} > .gg-hero`, ` position: absolute !important; top: calc(var(--gg-play-top) + var(--gg-row-h)) !important;
                left: var(--gg-side) !important; right: var(--gg-side) !important; height: calc(100vh - var(--gg-play-top) - var(--gg-row-h)) !important;
                margin: 0 !important; `),
        );
    }
    if (options.restyle) rules.push(...restyleRules(classes, Boolean(layout)));
    return rules.filter((r) => r.length > 0).join('\n');
}

/**
 * Unifideck (https://github.com/mubaraknumann/unifideck, read 2026-10-05 at ed43931): on the games it manages it marks
 * Steam's page container with this class, hides Steam's Play row and tabs, and puts its own Play row (a Focusable with
 * its buttons) and an info panel right after the header. Our header is screen-tall, so its row would sit on the next
 * screen ("broken view" on Reddit); these rules place it where Steam's Play row sits on the art.
 */
export const UNIFIDECK_PAGE = '.unifideck-hide-native-play';
/** Unifideck's primary buttons (Play, Install, Resume, Update), each as one pill like ours. Cancel and Stop keep its look. */
export const UNIFIDECK_PRIMARY = ['.unifideck-play-btn', '.unifideck-install-btn', '.unifideck-resume-btn', '.unifideck-update-btn'];

/** Unifideck's meta row on its page: the class-less div right after its primary button (hidden by our page; read for its words, data/unifideckLabel). */
export const UNIFIDECK_META = `${UNIFIDECK_PAGE} :is(${UNIFIDECK_PRIMARY.join(', ')}) + div:not([class])`;

/**
 * The Game Glance layout on a Unifideck game's page, as its own stylesheet next to buildThemeCss's (with the layout only;
 * scoped to Unifideck's own page class, so no other page is touched; '' when the layout's classes are missing). Its Play row moves onto the art at the Play row's place (its info panel then starts the next
 * screen, as Steam's tabs do) and its primary button becomes our accent pill. Its circle buttons wear Steam's
 * MenuButton class, so the round buttons above already apply to them; its icon group wears AppButtons (no push right).
 */
export function buildUnifideckCss({ header, details, root }: ThemeClasses, options: ThemeOptions = {}): string {
    const inner = cls(details, 'InnerContainer');
    // Our page is on: Unifideck's own meta items (Installed size or Space required, Played, Last played) are hidden, as our
    // card shows them. They are the children of one class-less div right after the primary button (Install or Play; the
    // Downloading row has none, nor its Cancel / Stop). Structural, since its labels are translated; whatever the layout.
    const hideMeta = options.restyle
        ? rule(UNIFIDECK_META, ` display: none !important; `)
        : '';
    // The rest only with the full-screen layout (the same classes buildThemeCss needs for it); otherwise the page is stacked and
    // Unifideck's row is already where it belongs.
    if (!(cls(header, 'TopCapsule') && inner && cls(details, 'AppDetailsOverviewPanel') && cls(root, 'AppDetailsContainer'))) return hideMeta;
    const primary = UNIFIDECK_PRIMARY.map((c) => `${UNIFIDECK_PAGE} ${c}`);
    const focused = UNIFIDECK_PRIMARY.flatMap((c) => ['.gpfocus', ':focus', ':focus-within', ':hover'].map((f) => `${UNIFIDECK_PAGE} ${c}${f}`));
    // Steam's circles run controller, settings, cloud, then extras. Unifideck's installed row has its cloud-save button first, then
    // controller, settings and Uninstall (the only row with four buttons; the others have two), so the cloud moves after settings
    // and anything beyond the usual four goes after it.
    const buttons = cls(root, 'AppButtons');
    const circleOrder = buttons
        ? [
            rule(`${UNIFIDECK_PAGE} ${buttons}:has(> :nth-child(4)) > :first-child`, ` order: 3 !important; `),
            rule(`${UNIFIDECK_PAGE} ${buttons}:has(> :nth-child(4)) > :nth-child(n+4)`, ` order: 4 !important; `),
        ]
        : [];
    return [
        hideMeta,
        ...circleOrder,
        rule(`${inner}${UNIFIDECK_PAGE} > div:has(${UNIFIDECK_PRIMARY.join(', ')})`, ` position: absolute !important; top: var(--gg-play-top) !important;
            left: 0 !important; right: 0 !important; width: auto !important; z-index: 2 !important; box-sizing: border-box !important;
            padding: ${u(16)} var(--gg-side) !important; gap: var(--gg-gap) !important; background: transparent !important; `),
        rule(primary, ` width: var(--gg-play-w) !important; min-width: 0 !important; flex: 0 0 var(--gg-play-w) !important; height: var(--gg-icon) !important;
            justify-content: center !important; border-radius: 999px !important; background: var(--gg-accent) !important; box-shadow: none !important;
            color: #ffffff !important; font-size: ${u(16)} !important; `),
        rule(focused, ` background: var(--gg-accent) !important; box-shadow: 0 0 0 ${u(2)} rgba(255, 255, 255, 0.9) !important; `),
        // Spotlight Home's look: Steam's Play row has no top padding and a 36 one below (see the playSection rule above), so the buttons start
        // at --gg-play-top; the same here, or Unifideck's pill sits lower than Steam's.
        options.restyle ? rule(`${inner}${UNIFIDECK_PAGE} > div:has(${UNIFIDECK_PRIMARY.join(', ')})`, ` padding-top: 0 !important; padding-bottom: ${d(36)} !important; `) : '',
        // And the handoff's pill type, white on the accent and focused as our own Play pill (ring, glow, focus scale).
        options.restyle ? rule(primary, ` font-size: ${d(22)} !important; font-weight: 700 !important; color: #ffffff !important; transition: transform 250ms, box-shadow 250ms !important; `) : '',
        // Read and laid out as Home's pill and Steam's (consistent on Home and every page): the word as written, not in
        // Unifideck's capitals, and glyph and word from the left at the page pill's inset, glyph size and gap.
        // (Unifideck's inline 0.05em letter spacing too: it drew the word wider than Home's, which stepped at the open's hand-over.)
        options.restyle ? rule(primary, ` text-transform: none !important; letter-spacing: normal !important; justify-content: flex-start !important; gap: 0 !important; padding: 0 ${d(PAGE_LAYOUT.pill.padX)} !important; `) : '',
        // Its cloud button's in-sync check badge at Unifideck's proportion to the 24 glyph (the circles' rule sizes every svg 24).
        options.restyle ? rule('.unifideck-icon-btn svg.unifideck-cloud-badge', ` width: ${d(13)} !important; height: ${d(13)} !important; `) : '',
        options.restyle ? rule(primary.map((p) => `${p} svg`), ` width: ${d(PAGE_LAYOUT.pill.icon)} !important; height: ${d(PAGE_LAYOUT.pill.icon)} !important; margin: 0 ${d(PAGE_LAYOUT.pill.iconGap)} 0 0 !important; flex: 0 0 auto !important; `) : '',
        options.restyle ? rule(`${UNIFIDECK_PAGE} .unifideck-icon-btn`, ` ${actionTransition} `) : '',
        options.restyle ? rule(`${NOT_MOUSE} ${UNIFIDECK_PAGE} .unifideck-icon-btn:is(.gpfocus, :focus)`, ` background: rgba(12, 16, 22, 0.4) !important; color: #ffffff !important; ${actionFocused} `) : '',
        options.restyle ? rule(`${NOT_MOUSE} ${UNIFIDECK_PAGE} .unifideck-icon-btn:not(.gg-uni-cloud):is(.gpfocus, :focus) svg`, ` color: #ffffff !important; fill: currentColor !important; `) : '',
        options.restyle ? rule(focused, ` box-shadow: 0 0 0 ${d(2)} rgba(255, 255, 255, 0.9), 0 ${d(14)} ${d(40)} calc(-1 * ${d(8)}) var(--gg-accent) !important; transform: scale(${PILL_FOCUS.x}, ${PILL_FOCUS.y}) !important; `) : '',
    ].filter((r) => r.length > 0).join('\n');
}

/** The Clean look's bottom margin under the Play row (room for Steam's button legend), and the gaps around the row. */
const CLEAN_BOTTOM = PAGE_LAYOUT.clean.bottom;
/**
 * The least space, in CSS px, from the Play pill's bottom to the screen's bottom: Steam's button legend is a fixed ~41 px strip (measured
 * on the Ally at 828x466 and 1500x844), so on the small handheld screen the scaled 2 x 36 would put the pill under it. Docked it is exceeded (75).
 */
/** Steam's bottom button legend (MENU / SELECT / BACK): a fixed css height at every screen size (measured on the Ally, handheld and docked). */
export const STEAM_LEGEND_PX = 41;
/** The restyled cards' height with three description lines, in canvas px (measured docked: 185 css px at 1500 wide). */
const TV_CARDS_H = PAGE_LAYOUT.playTop.tvCards;
/** On a TV the cards end this far above Steam's legend: the TV's side inset (home/insets.SIDE_INSET.tv). */
const TV_CARDS_GAP = PAGE_LAYOUT.playTop.tvGap;
const CLEAN_MIN_BELOW_ROW = PAGE_LAYOUT.clean.minBelowRow;
const CLEAN_GAP = PAGE_LAYOUT.clean.gap;

/**
 * The Game Glance page's Clean look (homeMode().cleanDetails, on top of the restyled page): the art takes the screen;
 * the eyebrow and title sit just above one row at the bottom, which holds Steam's Play row (Play, controller, settings,
 * cloud) at the left and our info card (.gg-clean-info: played, achievements, HLTB main) at the right; the store pill
 * sits above the row at the right edge. The description and HowLongToBeat cards are not shown; Steam's tabs still
 * start on the next screen. Its own stylesheet, only with the full-screen layout (the classes buildThemeCss needs for
 * it); '' otherwise, and the page keeps its usual look.
 */
export function buildCleanCss({ header, details, root }: ThemeClasses): string {
    const inner = cls(details, 'InnerContainer');
    if (!(cls(header, 'TopCapsule') && inner && cls(details, 'AppDetailsOverviewPanel') && cls(root, 'AppDetailsContainer'))) return '';
    return [
        // The Play row moves down to the bottom: the row (pill 60 + 36 gap, --gg-row-h) ends CLEAN_BOTTOM above the screen's
        // bottom. Steam's tabs still start at 100vh (their margin follows --gg-play-top), so nothing else moves.
        `:root { --gg-play-top: calc(100vh - ${d(PAGE_LAYOUT.rowH)} - max(${d(CLEAN_BOTTOM)}, calc(${CLEAN_MIN_BELOW_ROW}px - ${d(PAGE_LAYOUT.rowH - PAGE_LAYOUT.icon)}))); }`,
        // Our block sits on the Play row itself (not under it), clicks go through to Steam's buttons.
        rule(`${inner} > .gg-hero`, ` top: var(--gg-play-top) !important; height: var(--gg-icon) !important; pointer-events: none; `),
        // No description or HowLongToBeat cards in this look.
        `.gg-cards { display: none !important; }`,
        // The info card at the right end of the row, vertically centred on the Play pill; the glass of the other cards.
        `.gg-clean-info { position: absolute; right: 0; top: 50%; transform: translateY(-50%); display: flex; align-items: flex-start; gap: ${d(PAGE_LAYOUT.cleanInfo.colGap)};
            padding: ${d(PAGE_LAYOUT.cleanInfo.padY)} ${d(PAGE_LAYOUT.cleanInfo.padX)}; border-radius: ${d(16)}; border: ${d(1)} solid ${ring(0.12)}; background: rgba(12, 16, 22, 0.38);
            backdrop-filter: blur(${d(16)}); color: #fff; }`,
        `.gg-clean-info > div { display: flex; flex-direction: column; gap: ${d(PAGE_LAYOUT.stats.rowGap)}; }`,
        `.gg-clean-info .gg-value { ${pageType('cleanValue', d)} }`,
        `.gg-clean-info .gg-bar { width: ${d(PAGE_LAYOUT.cleanInfo.barW)}; height: ${d(PAGE_LAYOUT.cleanInfo.barH)}; margin-top: ${d(PAGE_LAYOUT.cleanInfo.barTop)}; }`,
        // The store pill above the row, at its right edge.
        `.gg-pill { top: auto; bottom: calc(100% + ${d(PAGE_LAYOUT.clean.storeGap)}); }`,
        // The eyebrow and title just above the row, at the left (their bottom CLEAN_GAP above the Play pill).
        rule(`${inner} > .gg-titleblock`, ` top: calc(var(--gg-play-top) - ${d(CLEAN_GAP)}) !important; transform: translateY(-100%); `),
    ].filter((r) => r.length > 0).join('\n');
}

/** How long the page takes to fade away under Steam's launch overlay (and back if the launch is cancelled). */
const LAUNCH_FADE_MS = 200;

/**
 * Names for the open's extras layer text that settles onto the page at the hand-over (home/OpenExtras data-settle,
 * openHome.settleTwins), as the twins do: the layer is laid out by its own rules, which landed 1/64 device px off the
 * page's (a layout unit), enough to draw a row a whole device px off near a half pixel (Ally, docked).
 */
export const SETTLE = {
    hltbTitle: 'x-hltb-title',
    caption: 'x-caption',
    muted: 'x-muted',
    desc: 'x-desc',
    label: (key: string) => `x-label-${key}`,
    value: (key: string) => `x-value-${key}`,
    statLabel: (key: string) => `x-stat-label-${key}`,
    statValue: (key: string) => `x-stat-value-${key}`,
};

/**
 * Each text twin's counterpart on the page (home/openTwins names): where the open's twins glide to at the hand-over
 * (openHome.settleTwins). The Play label's is left out without Steam's class.
 */
export function twinTargets({ root }: ThemeClasses, look: 'spotlight' | 'clean' | 'steam'): Record<string, string> {
    const out: Record<string, string> = { title: '.gg-title', eyebrow: '.gg-eyebrow' };
    const playButton = cls(root, 'ActionButtonAndStatusPanel');
    if (playButton) out.play = `${playButton} [role="button"] > div`;
    const scope = look === 'clean' ? '.gg-clean-info' : '.gg-hero';
    for (const k of ['size', 'played', 'achievements', 'hltb']) {
        out[`label-${k}`] = `${scope} [data-stat="${k}"] .gg-label`;
        out[`value-${k}`] = `${scope} [data-stat="${k}"] .gg-value`;
        out[SETTLE.statLabel(k)] = `${scope} [data-stat="${k}"] .gg-label`;
        out[SETTLE.statValue(k)] = `${scope} [data-stat="${k}"] .gg-value`;
    }
    out[SETTLE.hltbTitle] = '.gg-hltb > .gg-label';
    out[SETTLE.caption] = '.gg-hltb .gg-caption';
    out[SETTLE.muted] = '.gg-hltb .gg-muted';
    out[SETTLE.desc] = '.gg-hero .gg-desc';
    for (const k of ['hltb', 'mainExtras', 'completionist']) {
        out[SETTLE.label(k)] = `.gg-hltb [data-stat="${k}"] .gg-label`;
        out[SETTLE.value(k)] = `.gg-hltb [data-stat="${k}"] .gg-value`;
    }
    return out;
}

/** Steam's Play row on the game page (the Play pill with its arrow, the circles, the cloud): logic/cardNav's `play`; null without its classes. */
export function playRowSelector({ root, play, shared }: ThemeClasses): string | null {
    const list = [cls(root, 'ActionButtonAndStatusPanel'), cls(play, 'MenuButton'), cls(play, 'CloudStatusRow')];
    if (list.some((s) => s === null)) return null;
    const library = cls(shared, 'SharedLibrary');
    if (library) list.push(`${library} a[role="button"]`);
    list.push('.gg-copy-pill', '.gg-store-choice');
    return list.join(', ');
}

/**
 * What hides while Steam's launch overlay is up: `overlay`, the overlay's selector (null: unknown, nothing hides), and
 * `hide`, everything on the page with text on it (our title and cards, Steam's logo and title, its Play row and tabs).
 * Steam's art (the header itself) is not in the list, so only the game's art is left under the overlay.
 */
export function launchTargets({ header, details, root, launch }: ThemeClasses): { overlay: string | null; hide: string[] } {
    const overlay = cls(launch, 'Container');
    if (!overlay) return { overlay: null, hide: [] };
    const hide = present([
        cls(header, 'BoxSizer'),
        cls(header, 'TitleImageContainer'),
        cls(header, 'SVGTitle'),
        cls(details, 'AppDetailsOverviewPanel'),
        cls(root, 'AppDetailsContainer'),
    ]);
    return { overlay, hide: ['.gg-titleblock', '.gg-hero', ...hide] };
}

/**
 * While a game launches (only while the overlay is shown, see launchOverlay.launchOverlayShown): the page's text fades
 * away and the overlay dims the art less than its resting dim, so Steam's launch screen sits on the game's art alone
 * (Reddit feedback: the page's text bled through the overlay's). '' when the overlay's class is unknown.
 */
export function buildLaunchCss(classes: ThemeClasses): string {
    const { overlay, hide } = launchTargets(classes);
    if (!overlay) return '';
    return [
        `${hide.join(', ')} { opacity: 0 !important; transition: opacity ${LAUNCH_FADE_MS}ms ease !important; }`,
        `:root ${overlay} { background: rgba(0, 0, 0, 0.55) !important; }`,
    ].join('\n');
}

/**
 * Spotlight Home's details look (handoff "2. Game Glance (details)"), appended after the 1.1.1 rules so they win
 * without touching them. Same defensive pattern: a rule needing a Steam class that is missing is skipped. On Steam's
 * elements it only sets colours, the focus glow, the scrim, the logo's visibility (its box stays in place) and the
 * Play row's side padding (the handoff's 56 px insets); everything else styles our own `.gg-*` elements.
 * The eyebrow/title block is shown only with the full-screen layout, where the logo was; otherwise (a renamed Steam
 * class) it stays hidden and Steam's logo is left alone, so the page never shows two titles.
 */
const actionFocusShadow = `box-shadow: 0 0 0 ${d(2)} rgba(255, 255, 255, 0.9), 0 ${d(14)} ${d(40)} calc(-1 * ${d(8)}) var(--glance-accent) !important;`;
const actionFocused = `${actionFocusShadow} transform: scale(${PAGE_LAYOUT.focusScale}) !important;`;
const actionTransition = 'transition: transform 250ms, box-shadow 250ms !important;';

function restyleRules({ header, details, root, play, shared }: ThemeClasses, layout: boolean): string[] {
    // Play focused, as Home's: a white ring and accent glow, grown by the focus scale (by the controller or DOM focus).
    const pillFocused = ` box-shadow: 0 0 0 ${d(2)} rgba(255, 255, 255, 0.9), 0 ${d(14)} ${d(40)} calc(-1 * ${d(8)}) var(--glance-accent) !important; transform: scale(${PILL_FOCUS.x}, ${PILL_FOCUS.y}) !important; `;
    const topCapsule = cls(header, 'TopCapsule');
    const titleImage = cls(header, 'TitleImageContainer');
    const svgTitle = cls(header, 'SVGTitle');
    const inner = cls(details, 'InnerContainer');
    const playSection = cls(root, 'PlaySection');
    const playButton = cls(root, 'ActionButtonAndStatusPanel');
    const menuButton = cls(play, 'MenuButton');
    const cloud = cls(play, 'CloudStatusRow');
    const cloudIcon = cls(play, 'CloudStatusIcon');
    const syncing = cls(play, 'CloudSynching');
    const problem = cls(play, 'CloudSyncProblem');
    const fail = cls(play, 'CloudStatusSyncFail');
    const offline = cls(play, 'OfflineMode');
    const versionRow = cls(shared, 'SharedLibrary');
    const versionLink = versionRow && `${versionRow} a[role="button"]`;

    const rules: string[] = [
        // Steam's temporary saved-launch-option tip is positioned for its stock layout and clips over our hero.
        rule(cls(play, 'LaunchOptionCallout'), ` display: none !important; `),
        rule(cls(play, 'LaunchOptionCalloutMessageContainer'), ` display: none !important; `),
        // Steam's thin download bar under the Play pill is never shown (the pill itself fills, buildDownloadCss), so it
        // cannot flash before the progress is known.
        rule(playButton && `${playButton} [role="progressbar"]`, ` display: none !important; `),
        // The game's accent (buildAccentCss sets it on the page container) becomes the theme's accent:
        // the Play pill, the HLTB goal value and bar. Registered so it can animate, as on Home.
        `@property --glance-accent { syntax: '<color>'; inherits: true; initial-value: ${DEFAULT_ACCENT}; }`,
        `:root { --gg-d: min(calc(100vw / ${PAGE_LAYOUT.canvas.wide}), calc(100vh / ${PAGE_LAYOUT.canvas.wideHeight})); }`,
        `@media (max-aspect-ratio: 17/10) { :root { --gg-d: min(calc(100vw / ${PAGE_LAYOUT.canvas.deck}), calc(100vh / ${PAGE_LAYOUT.canvas.deckHeight})); } }`,
        rule(inner, ` --gg-accent: var(--glance-accent); transition: --glance-accent ${ACCENT_MS}ms ease; `),

        // Side insets 56: Steam's Play row (2.8vw of its own) and everything placed by --gg-side move together,
        // so the cloud icon's position (counted from --gg-side) stays right.
        playSection ? `:root { --gg-side: ${d(PAGE_LAYOUT.side.base)}; }` : '',
        // A TV (screenScale.isTvScreen: 1.7x the handheld's 828x466 or more: 1408 x 793) takes the status dot's centre line (1.7vw, 24 canvas px) instead of 3.9vw:
        // 56 read too far from the edge on a big screen. The handheld and the Deck keep 56. (Home does the same: home/insets.)
        playSection ? `${TV_QUERY} { :root { --gg-side: ${d(PAGE_LAYOUT.side.tv)}; } }` : '',
        rule(playSection, ` padding-left: var(--gg-side) !important; padding-right: var(--gg-side) !important; `),

        // Handoff sizes (Play pill 340x60, 60px circles, gap 14), scaled like Home's. They feed the 1.1.1 rules
        // (Play button width, buttons, the cloud icon's position), which keep working unchanged.
        `:root { --gg-play-w: ${d(PAGE_LAYOUT.playW)}; --gg-icon: ${d(PAGE_LAYOUT.icon)}; --gg-gap: ${d(PAGE_LAYOUT.gap)}; }`,
        // The row sits on a 36 gap above the cards: Play row top = H - 386, cards top = H - 290 (handoff).
        rule(playSection, ` padding-top: 0 !important; padding-bottom: ${d(PAGE_LAYOUT.rowH - PAGE_LAYOUT.icon)} !important; `),
        rule(cloud, ` top: 0 !important; `),
        // Steam gives the pill group a fixed min-width in px (164, and 218 for games with a "Play from" arrow), which would
        // push the arrow segment past the slot into the circles. The group is exactly the slot; the arrow sits inside its right end.
        rule(playButton && `${playButton} > div:has(> [role="button"])`, ` min-width: 0 !important; `),
        rule(playButton && `${playButton} [role="button"]`, ` font-size: ${d(PAGE_LAYOUT.pill.font)} !important; font-weight: 700 !important; padding: ${d(8)} ${d(PAGE_LAYOUT.pill.padX)} !important; `),
        // The label bold like Home's (Steam's own class sets 500), so nothing changes at the open transition's hand-over.
        rule(playButton && `${playButton} [role="button"] > div`, ` ${pageType('playLabel', d, true)} color: #ffffff !important; `),
        rule(playButton && `${playButton} [role="button"] svg`, ` width: ${d(PAGE_LAYOUT.pill.icon)} !important; height: ${d(PAGE_LAYOUT.pill.icon)} !important; margin-right: ${d(PAGE_LAYOUT.pill.iconGap)} !important; `),
        rule(playButton && `${playButton} [role="button"] + [role="button"]`, ` flex: 0 0 ${d(PAGE_LAYOUT.playArrow.w)} !important; width: ${d(PAGE_LAYOUT.playArrow.w)} !important; padding: 0 !important; `),
        rule(playButton && `${playButton} [role="button"] + [role="button"] svg`, ` width: ${d(PAGE_LAYOUT.playArrow.glyph)} !important; height: ${d(PAGE_LAYOUT.playArrow.glyph)} !important; `),
        // Its ring is Home's: 1 d unit (1 canvas px on Home), never 1 px, which is drawn on whole device px (2 at the Ally's
        // 2.32) and read brighter than Home's as the open transition handed over (Michael on the Ally). Not the cloud: placed
        // at a fractional position, its 1 px is drawn soft like Home's already. Its colour is Home's, as bright as Home's (ringBoost).
        rule(menuButton, ` background: rgba(12, 16, 22, 0.4) !important; border-width: ${d(1)} !important; border-color: ${ring(0.18)} !important; backdrop-filter: blur(${d(12)}) !important; ${actionTransition} `),
        rule(menuButton && `${NOT_MOUSE} ${menuButton}.gpfocus`, ` background: rgba(12, 16, 22, 0.4) !important; color: #ffffff !important; ${actionFocused} `),
        // (Each focus look here also under DOM focus: after a tap or a click Steam keeps focus but drops gpfocus, and a page
        // opened that way has its Play focused without it, which the open transition lands on.)
        rule(menuButton && `${NOT_MOUSE} ${menuButton}:focus`, ` background: rgba(12, 16, 22, 0.4) !important; color: #ffffff !important; ${actionFocused} `),
        rule(menuButton && `${NOT_MOUSE} ${menuButton}:is(.gpfocus, :focus) svg`, ` color: #ffffff !important; `),
        rule(menuButton && `${menuButton} svg`, ` width: ${d(PAGE_LAYOUT.circleIcon)} !important; height: ${d(PAGE_LAYOUT.circleIcon)} !important; `),
        // The cloud status is the same circle as the others (Steam's own row background, and the lighter 1.1.1 fill, gave it
        // a lighter tinted disc); its icon keeps the state colour, re-tuned for the dark fill (CLOUD_COLOURS, shared with
        // Home) with a dark halo for bright art. Focus keeps the state colour and adds Home’s ring and glow.
        rule(cloud, ` background: rgba(12, 16, 22, 0.4) !important; border-width: ${d(1)} !important; border-color: ${ring(0.18)} !important;
            backdrop-filter: blur(${d(12)}) !important; box-shadow: none !important; ${actionTransition}
            --gg-ok: ${CLOUD_COLOURS.ok}; --gg-warn: ${CLOUD_COLOURS.busy}; --gg-bad: ${CLOUD_COLOURS.bad}; --gg-off: ${CLOUD_COLOURS.off}; `),
        rule(cloud && `${cloud} svg`, ` filter: drop-shadow(0 0 ${d(1.5)} rgba(0, 0, 0, 0.7)) !important; `),
        rule(cloud && `${cloud} svg`, ` width: ${d(PAGE_LAYOUT.cloudIcon)} !important; height: ${d(PAGE_LAYOUT.cloudIcon)} !important; `),
        // Centred as Home's: Steam's icon box (16 u in the 1.1.1 theme) as tall as the icon, which hung out of its bottom
        // and sat low in the circle after the open transition (1.65 px docked, Michael on the Ally).
        rule(cloudIcon, ` height: ${d(PAGE_LAYOUT.cloudIcon)} !important; `),
        // One white cloud in every state, as Home's (#64): Steam's state icon is hidden and ours drawn in its place, with
        // the halo; the state is the badge at the top right (CLOUD_DOT, from --gg-cloud-dot set by the state rules above).
        rule(cloud, ` color: #ffffff !important; overflow: visible !important; `),
        rule(cloud && syncing && [`${cloud}${syncing}`, `${syncing} ${cloud}`, `${cloud} ${syncing}`], ` color: #ffffff !important; --gg-cloud-dot: var(--gg-warn); `),
        rule(cloud && problem && [`${cloud}${problem}`, `${problem} ${cloud}`, `${cloud} ${problem}`], ` color: #ffffff !important; --gg-cloud-dot: var(--gg-bad); `),
        rule(cloud && fail && [`${cloud}${fail}`, `${fail} ${cloud}`, `${cloud} ${fail}`], ` color: #ffffff !important; --gg-cloud-dot: var(--gg-bad); `),
        rule(cloud && offline && `${offline} ${cloud}`, ` color: #ffffff !important; --gg-cloud-dot: var(--gg-off); `),
        rule(cloud && `${cloud} svg`, ` display: none !important; `),
        rule(cloud && `${cloud}::before`, ` content: "" !important; display: block !important; position: absolute !important; inset: 0 !important; margin: auto !important; width: ${d(PAGE_LAYOUT.cloudIcon)} !important; height: ${d(PAGE_LAYOUT.cloudIcon)} !important;
            background: ${CLOUD_GLYPH_URL} center / contain no-repeat !important; filter: drop-shadow(0 0 ${d(1.5)} rgba(0, 0, 0, 0.7)) !important; `),
        rule(cloud && `${cloud}::after`, ` content: "" !important; position: absolute !important; top: ${d(CLOUD_DOT.inset)} !important; right: ${d(CLOUD_DOT.inset)} !important;
            left: auto !important; bottom: auto !important; margin: 0 !important;
            width: ${d(CLOUD_DOT.size)} !important; height: ${d(CLOUD_DOT.size)} !important; box-sizing: content-box !important; border-radius: 50% !important;
            background: var(--gg-cloud-dot, var(--gg-ok)) !important; border: ${d(CLOUD_DOT.ring)} solid ${CLOUD_DOT.ringColour} !important; pointer-events: none !important; `),
        rule(cloud && `${NOT_MOUSE} ${cloud}.gpfocus`, ` background: rgba(12, 16, 22, 0.4) !important; ${actionFocused} `),
        rule(cloud && `${NOT_MOUSE} ${cloud}:focus`, ` background: rgba(12, 16, 22, 0.4) !important; ${actionFocused} `),

        // Play: white words and glyph on the accent pill, as on Home. Focused as Home's Play: the fill stays the accent (no
        // lighter overlay), a white ring and accent glow, and it grows by the focus scale.
        rule(playButton && `${playButton} [role="button"]`, ` color: #ffffff !important; `),
        rule(playButton && `${NOT_MOUSE} ${playButton} [role="button"].gpfocus`, ` background: transparent !important; `),
        rule(playButton && `${NOT_MOUSE} ${playButton} [role="button"]:focus`, ` background: transparent !important; `),
        // The "Play from" arrow focused: the pill shows its focus (below) and the arrow's segment is tinted, as on Home.
        rule(playButton && `${NOT_MOUSE} ${playButton} [role="button"] + [role="button"].gpfocus`, ` background: rgba(255, 255, 255, 0.28) !important; `),
        rule(playButton && `${NOT_MOUSE} ${playButton} [role="button"] + [role="button"]:focus`, ` background: rgba(255, 255, 255, 0.28) !important; `),
        // Steam's focus shine on Play (a green gradient on its ::after) would show over the accent pill.
        rule(playButton && `${playButton} [role="button"]::after`, ` display: none !important; `),
        rule(playButton && `${playButton} > div:has(> [role="button"])`, ` transition: transform 250ms, box-shadow 250ms !important; `),
        rule(playButton && `${NOT_MOUSE} ${playButton} > div:has(> [role="button"].gpfocus)`, pillFocused),
        rule(playButton && `${NOT_MOUSE} ${playButton} > div:has(> [role="button"]:focus)`, pillFocused),
        // A mouse over anything clickable (home/mouseMode, never a finger or the controller): Home's hover ring, ring only, in
        // d units, focused too: the focus looks are off in mouse mode (NOT_MOUSE). The pill with its "Play from" arrow takes it as one.
        rule(playButton && `${HOVER} ${playButton} > div:has(> [role="button"]):hover`, ` box-shadow: ${hoverRing(d(2))} !important; `),
        rule(menuButton && `${HOVER} ${menuButton}:hover`, ` box-shadow: ${hoverRing(d(2))} !important; `),
        rule(cloud && `${HOVER} ${cloud}:hover`, ` box-shadow: ${hoverRing(d(2))} !important; `),
        // With the focus looks off, Steam's own show through on a focused button: its fill on Play and the arrow (blue, green
        // for some games) and a dark icon on the circles, meant for its white focus look (black on the glass after coming
        // back to the page, Michael on the Ally). In mouse mode a focused button keeps its look at rest instead.
        rule(playButton && `${HOVER} ${playButton} [role="button"]:is(.gpfocus, :focus)`, ` background: transparent !important; color: #ffffff !important; `),
        rule(menuButton && `${HOVER} ${menuButton}:is(.gpfocus, :focus)`, ` color: #ffffff !important; `),
        rule(menuButton && `${HOVER} ${menuButton}:is(.gpfocus, :focus) svg`, ` color: #ffffff !important; `),

        // Eyebrow ("Last played · Today", accent) and the 64px/800 title, at most two lines. Hidden unless the
        // full-screen layout applies (below): all-or-nothing, like the rest of the layout.
        `.gg-titleblock { display: none; flex-direction: column; gap: ${d(PAGE_LAYOUT.titleBlock.gap)}; max-width: ${d(640)}; margin: 1vh var(--gg-side); color: #fff; font-family: inherit; }`,
        `.gg-eyebrow { ${pageType('eyebrow', d)} color: var(--glance-accent-text); }`,
        `.gg-metadata { display: flex; flex-wrap: wrap; align-items: center; column-gap: ${d(16)}; row-gap: ${d(6)}; }`,
        `.gg-availability { display: inline-flex; align-items: center; gap: ${d(6)}; font-size: ${d(PAGE_LAYOUT.titleBlock.eyebrow)}; line-height: 1.2; font-weight: 700; text-transform: uppercase; color: #fff; }`,
        `.gg-availability img { display: block; width: ${d(14)}; height: ${d(14)}; object-fit: contain; }`,
        // Keep the native fallback until the mirrored reason exists; never hide the only explanation.
        rule(layout && inner && cls(play, 'StatusAndStats') && cls(play, 'PermanentlyUnavailable') ? `${inner}:has(> .gg-titleblock .gg-availability) ${cls(play, 'StatusAndStats')}${cls(play, 'PermanentlyUnavailable')}` : null, ` display: none !important; `),
        // The clip gets a bleed for descenders and the shadow; equal negative margins keep the box at two lines.
        `.gg-title { margin: calc(-1 * ${d(16)}); padding: ${d(16)}; ${pageType('title', d)}
            text-wrap: balance; text-shadow: 0 ${d(4)} ${d(30)} rgba(0, 0, 0, 0.4); overflow-wrap: anywhere;
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }`,

        // The logo option (components/GameTitle): the game's logo in the title's place, the same box as on Home (homeCss.LOGO_BOX).
        `.gg-logo { display: block; width: auto; height: auto; max-width: ${d(LOGO_BOX.width)}; max-height: ${d(LOGO_BOX.height)}; object-fit: contain; object-position: left bottom;
            filter: drop-shadow(0 ${d(4)} ${d(24)} rgba(0, 0, 0, 0.45)); }`,

        // Cards: grid 1.1fr / 1fr, gap 18; padding 20x24, radius 16, the handoff's glass (its ring 1 d unit, as Home's: see the
        // menu circles); its type sizes. Each card at most
        // its own width (cardMaxWidths): with room to spare the info card stays left, HowLongToBeat at the right edge.
        `.gg-cards { display: grid; grid-template-columns: minmax(0, ${PAGE_LAYOUT.cards.split[0]}fr) minmax(0, ${PAGE_LAYOUT.cards.split[1]}fr); gap: ${d(PAGE_LAYOUT.cards.gridGap)}; }`,
        `.gg-card { display: flex; flex-direction: column; gap: ${d(PAGE_LAYOUT.cards.colGap)}; padding: ${d(PAGE_LAYOUT.cards.padY)} ${d(PAGE_LAYOUT.cards.padX)}; border-radius: ${d(16)};
            background: rgba(12, 16, 22, 0.38); border-color: ${ring(0.12)}; border-width: ${d(1)}; backdrop-filter: blur(${d(16)});
            min-height: ${d(PAGE_LAYOUT.playTop.tvCards - 2 * PAGE_LAYOUT.cards.padY - 2)}; max-width: ${cardContentMax(cardMaxWidths()[0])}; }`,
        // (One height for every game: three description lines' worth, as The Witcher's (its content: stats, gap and three
        // lines, 136 of the 178 the cards take with their padding and border; measured 179 on the Ally with Steam's border); a short description, or none, left
        // them shorter, which the open transition's panels (openTargets, the same height) then shrank to after the hand-over.)
        `.gg-card.gg-hltb { gap: ${d(PAGE_LAYOUT.cards.hltbGap)}; width: ${CARD_FILL_WIDTH}; max-width: ${cardContentMax(cardMaxWidths()[1])}; justify-self: end; }`,
        // A card that responds to a tap (#24, components/cardActions) gives a little under the finger.
        `.gg-card-tap { transition: transform 120ms ease, box-shadow 120ms ease; }`,
        `.gg-card-tap:active { transform: scale(0.98); }`,
        // Under a mouse, a card lifts with the hover ring, as Home's feed cards do; a press still gives.
        `${HOVER} .gg-card-tap:hover { box-shadow: ${hoverRing(d(2))} !important; transform: translateY(${d(-2)}); }`,
        `${HOVER} .gg-card-tap:hover:active { transform: translateY(${d(-2)}) scale(0.98); }`,
        // Selected with the controller (logic/cardNav, components/GameHero): Home's focused feed card, an accent ring and
        // glow and a lift, in d units; off in mouse mode, as every focus look (the hover look is the mouse's).
        `${NOT_MOUSE} .gg-card-nav.gg-card-focus, ${NOT_MOUSE} .gg-card-nav:focus { box-shadow: 0 0 0 ${d(1)} var(--glance-accent), 0 ${d(16)} ${d(40)} calc(-1 * ${d(12)}) var(--glance-accent) !important; transform: translateY(${d(-4)}); outline: none; }`,
        // Steam's page panel lies over the cards (a tap landed on it, on the Deck): the hero is lifted above it and takes
        // no touches itself, only the tappable cards do, so nothing of Steam's below is covered.
        `.gg-hero { z-index: 2; pointer-events: none; }`,
        `.gg-hero .gg-card-tap { pointer-events: auto; }`,
        // The glass blurs the art behind it. Steam lays the page out as a preserve-3d scene with the hero art in it, and a
        // backdrop-filter inside a flat container sees only that container: the cards (in the hero) and the round buttons
        // (three flat levels under the play section) showed the art sharp through their tint, only the cloud (a direct child
        // of the scene) blurred it (probed on the Ally). Every container down to them keeps the scene going.
        `.gg-hero, .gg-cards { transform-style: preserve-3d; }`,
        rule(playSection && menuButton && [`${playSection}:has(${menuButton})`, `${playSection} :has(${menuButton})`], ' transform-style: preserve-3d !important; '),
        // (9/5: cards.equalFromAspect as a media query ratio.)
        `@media (min-aspect-ratio: 9/5) { .gg-card { max-width: ${cardContentMax(cardMaxWidths(PAGE_LAYOUT.cards.equalFromAspect)[0])}; } }`,
        `.gg-label { ${pageType('label', d)} color: rgba(255, 255, 255, 0.62); }`,
        `.gg-value { ${pageType('value', d)} }`,
        `.gg-stats { gap: ${d(PAGE_LAYOUT.stats.colGapInfo)}; margin-top: 0; }`,
        `.gg-hltb .gg-stats { gap: ${d(PAGE_LAYOUT.stats.colGapHltb)}; }`,
        `.gg-stats > div { display: flex; flex-direction: column; gap: ${d(PAGE_LAYOUT.stats.rowGap)}; }`,
        `.gg-desc { margin: 0; font-size: ${d(PAGE_LAYOUT.cardText.desc)}; line-height: ${PAGE_LAYOUT.cardText.descLine}; color: rgba(255, 255, 255, 0.84); }`,
        `.gg-bar { margin-top: 0; height: ${d(PAGE_LAYOUT.cardText.bar)}; border-radius: ${d(3)}; }`,
        `.gg-bar > div { border-radius: ${d(3)}; }`,
        `.gg-caption, .gg-muted { margin-top: 0; font-size: ${d(PAGE_LAYOUT.cardText.caption)}; color: rgba(255, 255, 255, 0.72); }`,
        // HLTB: MAIN is always the accent (handoff), not the tier the player is working toward.
        `.gg-hltb .gg-stats > div .gg-value { color: inherit; }`,
        `.gg-hltb .gg-stats > div:first-child .gg-value { color: var(--glance-accent-text, var(--gg-accent)); transition: color ${ACCENT_MS}ms; }`,
        // No chevron hint (handoff has none). The source pill stays, expanded, level with the Play row at the right.
        `.gg-more { display: none; }`,
        `.gg-pill { top: calc(-1 * ${d(PAGE_LAYOUT.storePillTop)}); ${sourcePillLook(d)} }`,
        `.gg-pill-icon { ${sourcePillIcon(d)} }`,
        // The native copy chooser is activated by the family pill; its stock row and circle stay hidden.
        rule(versionRow, ` display: none !important; position: static !important; height: 0 !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; font-size: 0 !important; line-height: 0 !important; pointer-events: none !important; `),
        rule(versionLink, ` display: none !important; `),
        `.gg-copy-pill { cursor: pointer; pointer-events: auto; ${actionTransition} }`,
        `.gg-native-store-switcher { visibility: hidden !important; pointer-events: none !important; }`,
        `.gg-native-store-switcher > [role="combobox"] { width: 100% !important; min-width: 0 !important; height: 100% !important; }`,
        `.gg-pill.gg-store-selectable { padding: 0; border: 0; background: transparent; backdrop-filter: none; }`,
        `.gg-store-choice { display: inline-flex; align-items: center; border: 1px solid; border-radius: 999px; cursor: pointer; pointer-events: auto; color: #fff; ${sourcePillLook(d)} ${actionTransition} }`,
        `${NOT_MOUSE} .gg-store-choice:is(.gpfocus, .gg-store-focus, :focus) { background: rgba(12, 16, 22, 0.4) !important; color: #fff !important; ${actionFocused} }`,
        `${HOVER} .gg-store-choice:hover { box-shadow: ${hoverRing(d(2))} !important; }`,
        `.gg-copy-plus { flex: 0 0 auto; display: block; margin-left: ${d(8)}; width: ${d(12)}; height: ${d(12)}; }`,
        `${NOT_MOUSE} .gg-copy-pill:is(.gpfocus, .gg-copy-focus, :focus) { background: rgba(12, 16, 22, 0.4) !important; color: #fff !important; ${actionFocusShadow} transform: translateY(-50%) scale(${PAGE_LAYOUT.focusScale}) !important; }`,
        `${HOVER} .gg-copy-pill:hover { box-shadow: ${hoverRing(d(2))} !important; }`,
        `.gg-family { position: absolute; right: calc(100% + ${d(10)}); top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center;
            margin: 0; border-radius: 999px; border: 1px solid; color: #fff; line-height: 1; white-space: nowrap; ${sourcePillLook(d)} }`,
        `.gg-family-icon { flex: 0 0 auto; ${sourcePillIcon(d)} }`,
    ];

    if (layout) {
        rules.push(
            // Steam's header crops the hero at 50% 50%, Home at 50% 30%: the same image then sits the same on both screens,
            // so the open transition's hand-over shows no jump (identical for standard heroes; taller custom art differs).
            rule(topCapsule && `${topCapsule} img`, ` object-position: 50% 30% !important; `),
            // The title (or logo) and the eyebrow under it, at the left inset, their bottom the row-to-cards gap (36) above the
            // Play row on every screen (the row sits lower on a TV, --gg-play-top's media query): title, eyebrow, row and
            // cards stay one stack, the eyebrow always the same distance above the row, and a longer title grows upward.
            rule(`${inner} > .gg-titleblock`, ` display: flex !important; position: absolute !important; top: calc(var(--gg-play-top) - ${d(PAGE_LAYOUT.titleGap)}) !important;
                transform: translateY(-100%) !important; left: var(--gg-side) !important; right: var(--gg-side) !important; margin: 0 !important; `),
            // Steam's logo, and its text title for games without one, give way to our title (hidden in place), only
            // while our title is on the page: Steam's header is the first child of the page container.
            rule(titleImage && `${inner}:has(> .gg-titleblock) ${topCapsule} ${titleImage}`, ` visibility: hidden !important; `),
            rule(svgTitle && `${inner}:has(> .gg-titleblock) ${topCapsule} ${svgTitle}`, ` visibility: hidden !important; `),
            // HLTB for Deck (hulkrelax/hltb-for-deck) splices its row in before Steam's overview once its lookup answers; in
            // flow (its default style), it pushed the Play row onto our cards (#67). Our HowLongToBeat card shows the same times.
            rule(`${inner} > #hltb-for-deck`, ` display: none !important; `),
            // Handoff: Play row top = H - 386 and row = pill 60 + 36 gap, so the cards (at the row's bottom) start at H - 290.
            `:root { --gg-play-top: calc(100vh - ${d(PAGE_LAYOUT.playTop.spotlight)}); --gg-row-h: ${d(PAGE_LAYOUT.rowH)}; }`,
            // A TV (the side inset's media query): Steam's legend is a fixed STEAM_LEGEND_PX at every size, so the handoff's
            // H - 386, made for the handheld (where the legend is a third of that space), left a wide band under the cards.
            // There the row and cards are set from the bottom: the cards (three description lines, TV_CARDS_H) end the TV's
            // side inset (24) above the legend. The handheld and the Deck keep H - 386.
            `${TV_QUERY} { :root { --gg-play-top: calc(100vh - ${STEAM_LEGEND_PX}px - ${d(PAGE_LAYOUT.rowH + TV_CARDS_H + TV_CARDS_GAP)}); } }`,
            // The handoff's stronger scrims over the 1.1.1 ones.
            rule(`${topCapsule}::after`, ` background: ${HANDOFF_SCRIM_LEFT}, ${HANDOFF_SCRIM_BOTTOM},
                ${SCRIM_BOTTOM}, ${SCRIM_LEFT}; `),
        );
    }
    return rules;
}

/** The page's new parts' fade-in after the open transition (motion.OPEN_TIMINGS.reveal, rise feedRise). */
const ARRIVE_MS = 200;
const ARRIVE_RISE_PX = 14;

/**
 * The game page arriving after Spotlight Home's open transition (data/openIntent). 'parts': Home morphed into the page,
 * so only what Home had no counterpart for is hidden (Spotlight: the description, the HowLongToBeat title, its other
 * tiers, caption and bar; both looks: a size column, the family pill; Clean: the bars). 'all': the
 * whole page but its art (our title block and cards, Steam's Play row), lowered by the rise. `revealed`: the same
 * elements back to visible over ARRIVE_MS. Its own stylesheet, only with the full-screen layout; '' otherwise.
 */
export function buildArrivingCss(
    classes: ThemeClasses, look: 'spotlight' | 'clean', mode: 'parts' | 'all', revealed = false,
    extra: { cloud?: boolean; bars?: string[]; desc?: boolean; hltb?: boolean; family?: boolean; missing?: string[]; size?: boolean; uninstall?: boolean } = {},
): string {
    const { header, details, root, play } = classes;
    if (!(cls(header, 'TopCapsule') && cls(details, 'InnerContainer') && cls(details, 'AppDetailsOverviewPanel') && cls(root, 'AppDetailsContainer'))) return '';
    // Not the cloud button: Home's moves into its place, so the page's own must be there at once. Unless Home showed
    // none (`extra.cloud`: its state was not known yet), when the page's arrives like the other new parts.
    const cloud = extra.cloud ? cls(play, 'CloudStatusRow') : null;
    // Nor the family pill when Home showed one (`extra.family`): it moved in with Home's store pill.
    // A stat column Home showed no chip for (`extra.missing`: a new game's Play time), and Unifideck's store version
    // dropdown (Steam's DialogDropDown), arrive too instead of popping in.
    const missing = (extra.missing ?? []).filter((key) => /^[a-z]+$/i.test(key)).map((key) => `[data-stat="${key}"]`);
    // Unifideck's Uninstall circle (its installed row's fourth button: Home's row has none) arrives too, not popping in;
    // unless Home drew one at its place as it opened (`extra.uninstall`: homeCss .gh-open-circle), when the page's is
    // there at once under the copy (arriving after the copy had faded, it flickered).
    const buttons = cls(root, 'AppButtons');
    const uninstall = buttons && !extra.uninstall ? [`${UNIFIDECK_PAGE} ${buttons}:has(> :nth-child(4)) > :nth-child(n+4)`] : [];
    const shared = [...(extra.size ? [] : ['[data-stat="size"]']), ...uninstall, ...missing, ...(extra.family ? [] : ['.gg-family']), ...(cloud ? [cloud] : []), ':has(> .DialogDropDown_CurrentDisplay)'];
    // Spotlight: the description and the HowLongToBeat card's rest, unless Home drew them as it opened (`extra.desc`,
    // `extra.hltb`: home/OpenExtras), when the page's are there at once under Home's copy.
    const desc = extra.desc ? [] : ['.gg-desc'];
    const hltb = extra.hltb ? [] : ['.gg-hltb > .gg-label', '.gg-hltb [data-stat="hltb"] > .gg-label', '.gg-hltb [data-stat="mainExtras"]', '.gg-hltb [data-stat="completionist"]', '.gg-caption', '.gg-hltb .gg-bar', '.gg-muted'];
    const parts = look === 'spotlight'
        ? [...desc, ...hltb, ...shared]
        : [...shared, cleanBarsArriving(extra.bars)];
    const all = present(['.gg-titleblock', '.gg-hero', cls(root, 'PlaySection')]);
    const list = mode === 'all' ? all : parts;
    // Steam fades every page in by itself (TopLevelTransition: 200 ms delay, then 600 ms; probed on the Ally). Under the
    // open transition's bridge that fade would show black; the arriving page is shown at once instead.
    const steamFade = buildSteamEnterOffCss(classes);
    // Revealed: 'all' lifts the whole page back from its rise; 'parts' only fades in, so a part placed by its own
    // transform (the family pill's translateY(-50%) beside the store pill) keeps it.
    const body = revealed
        ? mode === 'all'
            ? ` opacity: 1 !important; transform: none !important; transition: opacity ${ARRIVE_MS}ms ease, transform ${ARRIVE_MS}ms cubic-bezier(.2,.8,.2,1) !important; `
            : ` opacity: 1 !important; transition: opacity ${ARRIVE_MS}ms ease !important; `
        : mode === 'all'
            ? ` opacity: 0 !important; transform: translateY(${ARRIVE_RISE_PX}px) !important; `
            : ' opacity: 0 !important; ';
    // Steam fades its focus look onto Play (background and colour, 200 ms) as it focuses it, after the page is ready;
    // Home's copy already shows Play focused, so the page's must be lit at once.
    const playButton = cls(root, 'ActionButtonAndStatusPanel');
    const focusAtOnce = rule(playButton && [`${playButton} [role="button"]`, `${playButton} > div:has(> [role="button"])`], ' transition: none !important; ');
    // (The glass, Clean panel and Spotlight cards, keeps its own blur: Home's copy draws it blurred too.)
    return [steamFade, rule(list, body), focusAtOnce].filter((r) => r.length > 0).join('\n');
}

/** Clean's bars that arrive: all of them, or (`brought`: the stats whose bar Home's morph moved into place) the others. */
function cleanBarsArriving(brought: string[] | undefined): string {
    if (!brought || brought.length === 0) return '.gg-clean-info .gg-bar';
    return `.gg-clean-info > [data-stat]${brought.map((key) => `:not([data-stat="${key.replace(/[^a-z]/gi, '')}"])`).join('')} .gg-bar`;
}

/**
 * Steam's own page-enter fade switched off (TopLevelTransition Enter/EnterActive: a 200 ms delay, then 600 ms of
 * opacity and transform; probed on the Ally). The open transition's bridge carries it while it is up (so Steam's own
 * page, too, is there at once under it) and the arriving Game Glance page repeats it; '' when the classes are unknown.
 */
export function buildSteamEnterOffCss({ transition }: ThemeClasses): string {
    const top = cls(transition, 'TopLevelTransition');
    const enter = cls(transition, 'Enter');
    const enterActive = cls(transition, 'EnterActive');
    if (!top || !enter || !enterActive) return '';
    const exit = cls(transition, 'Exit');
    const exitActive = cls(transition, 'ExitActive');
    return [
        rule([`${top}${enter}`, `${top}${enterActive}`], ' opacity: 1 !important; transform: none !important; transition: none !important; '),
        // The page leaving (Home) is hidden at once: its exit animation drew it, offset, under the fading bridge. Only
        // hidden: Steam unmounts it when that animation ends, so the animation itself must still run.
        exit && exitActive ? rule([`${top}${exit}`, `${top}${exitActive}`], ' visibility: hidden !important; ') : '',
    ].filter((r) => r.length > 0).join('\n');
}

/** What the page's "ready" check reads (styles/pageReady): Steam's hero image (not its blurred placeholder), our title block, Steam's Play row, and its focus there (gpfocus, or DOM focus alone for a page opened by a tap or a click). */
export function arrivalSelectors({ header, root }: ThemeClasses): { headerImg: string | null; titleblock: string; play: string | null; focus: string | null } {
    const topCapsule = cls(header, 'TopCapsule');
    const play = cls(root, 'PlaySection');
    return { headerImg: topCapsule && `${topCapsule} img:not([src*="_blur"])`, titleblock: '.gg-titleblock', play, focus: play && `${play} .gpfocus, ${play} :focus` };
}

/** Steam's footer (one element over every page, Home's and the game page's alike), or null when its class is unknown. */
export function steamFooterSelector({ footer }: ThemeClasses): string | null {
    return cls(footer, 'BasicFooter');
}

/** The game's accent on Steam's page container (Play and our elements both inherit it); nothing for a non-#rrggbb value. */
export function buildAccentCss({ details }: ThemeClasses, color: string): string {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return '';
    return rule(cls(details, 'InnerContainer'), ` --glance-accent: ${color}; --glance-accent-text: ${legibleAccent(color)}; `);
}

/** The details Play pill's download fill: its darker layer's width, eased like Home's. */
const DOWNLOAD_FILL = DOWNLOAD_FILL_COLOR;

/**
 * While Steam downloads the game (restyled page only): the Play pill fills left to right with `percent` (0..100)
 * (Steam's own bar under it is hidden by the restyle rules). The pill keeps Steam's own label (Pause, Download...); only
 * the fill is ours. Nothing without a usable percent, or without the pill's class.
 * Separate from buildThemeCss, whose output (and its baseline test) is untouched. Pure.
 */
export function buildDownloadCss({ root }: ThemeClasses, percent: number | null): string {
    if (percent === null || !Number.isFinite(percent)) return '';
    const playButton = cls(root, 'ActionButtonAndStatusPanel');
    if (!playButton) return '';
    const p = Math.min(100, Math.max(0, Math.round(percent)));
    return [
        rule(`${playButton} > div:has(> [role="button"])`,
            ` background-image: linear-gradient(${DOWNLOAD_FILL}, ${DOWNLOAD_FILL}) !important; background-repeat: no-repeat !important;
            background-size: ${p}% 100% !important; transition: background-size ${DOWNLOAD_FILL_MS}ms linear !important; `),
    ].join('\n');
}
