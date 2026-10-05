import { DOWNLOAD_FILL_COLOR, DOWNLOAD_FILL_MS } from './downloadFill';
import { DEFAULT_ACCENT, legibleAccent } from '../home/accent';
import { CLOUD_COLOURS, CLOUD_FOCUS_BAD } from '../home/cloud';
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
}

function cls(map: ClassMap, key: string): string | null {
    const name = map?.[key];
    return typeof name === 'string' && name.length > 0 ? `.${name}` : null;
}

/** One CSS rule, or nothing if any Steam class it needs is missing (so a Steam update skips it). */
function rule(selectors: Array<string | null> | string | null, body: string): string {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    if (list.length === 0 || list.some((s) => s === null)) return '';
    return `${list.join(', ')} {${body}}`;
}

const present = (list: Array<string | null>) => list.filter((s): s is string => s !== null);

/** A size in the theme's scale unit: `n` px on the handheld's 828×466 layout, larger on a TV (60% of the screen's growth; screenScale.ts). */
const u = (n: number) => `calc(${n} * var(--gg-u))`;

/**
 * A size from the design handoff, in its px, scaled exactly like Spotlight Home (home/scale.ts): the handoff's
 * 1440x810 canvas fills a 16:9 screen, its 1280x800 one a 16:10 screen (aspect 1.7 or less). The restyled title and
 * cards are Home's size on every screen, so Home's title block and the details title line up.
 */
const d = (px: number) => `calc(${px} * var(--gg-d))`;
/** Accent changes animate over 500 ms on every accent-coloured property, as on Home (handoff "Interactions & motion"). */
const ACCENT_MS = 500;

// The 1.1.1 scrims over the art (bottom, for the cards; left, for the logo).
const SCRIM_BOTTOM = 'linear-gradient(0deg, rgba(8, 11, 15, 0.94) 0%, rgba(8, 11, 15, 0.6) 34%, transparent 60%)';
const SCRIM_LEFT = 'linear-gradient(90deg, rgba(8, 11, 15, 0.45) 0%, transparent 45%)';
// The handoff's details scrims (scrim base rgb(5,7,10)), laid over the 1.1.1 ones when restyled.
const HANDOFF_SCRIM_LEFT = 'linear-gradient(90deg, rgba(5, 7, 10, 0.6) 0%, rgba(5, 7, 10, 0.1) 55%, rgba(5, 7, 10, 0) 75%)';
const HANDOFF_SCRIM_BOTTOM = 'linear-gradient(180deg, rgba(5, 7, 10, 0) 55%, rgba(5, 7, 10, 0.6) 100%)';

export interface ThemeOptions {
    /** Spotlight Home's look (both toggles on, homeMode().restyleDetails): only appends rules to the 1.1.1 theme. */
    restyle?: boolean;
}

/**
 * The theme's CSS, built from Steam's class names. Pure, so it can be tested.
 *
 * Layout (all-or-nothing): Steam's header becomes screen-tall, Steam's overview block (Play row + tabs)
 * is pulled up onto the art, our cards are overlaid under the Play row, and the tabs start on the next
 * screen. Nothing in Steam's page structure moves, so controller navigation and scrolling stay Steam's.
 * If any class the layout needs is missing, none of the layout applies and the page stays stacked.
 * Without `restyle` the output is exactly 1.1.1's (pinned by a snapshot test); `restyle` appends restyleRules().
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
    const hidden = present([cls(play, 'StatusAndStats'), cls(play, 'GameStatsSection'), cls(play, 'Playtime'), cls(play, 'LastPlayed')]);

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
        rule(playButton && `${playButton} [role="button"].gpfocus`, ` background: rgba(255, 255, 255, 0.28) !important; `),
        rule(appButtons, ` margin-left: 0 !important; gap: var(--gg-gap) !important; `),
        rule(appButtons && `${appButtons} > *`, ` margin: 0 !important; padding: 0 !important; `),
        rule(menuButton, ` width: var(--gg-icon) !important; height: var(--gg-icon) !important; min-width: 0 !important; margin: 0 !important; box-sizing: border-box !important; border-radius: 50% !important;
            background: rgba(255, 255, 255, 0.08) !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; `),
        rule(menuButton && `${menuButton}.gpfocus`, ` background: #ffffff !important; color: #0b0f14 !important; `),
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
            rule(tabs, ` margin-top: calc(100vh - var(--gg-play-top) - var(--gg-row-h)) !important; background: rgba(14, 20, 27, 0.9) !important; `),
            rule(`${inner} > .gg-hero`, ` position: absolute !important; top: calc(var(--gg-play-top) + var(--gg-row-h)) !important;
                left: var(--gg-side) !important; right: var(--gg-side) !important; height: calc(100vh - var(--gg-play-top) - var(--gg-row-h)) !important;
                margin: 0 !important; `),
        );
    }
    if (options.restyle) rules.push(...restyleRules(classes, Boolean(layout)));
    return rules.filter((r) => r.length > 0).join('\n');
}

/**
 * Spotlight Home's details look (handoff "2. Game Glance (details)"), appended after the 1.1.1 rules so they win
 * without touching them. Same defensive pattern: a rule needing a Steam class that is missing is skipped. On Steam's
 * elements it only sets colours, the focus glow, the scrim, the logo's visibility (its box stays in place) and the
 * Play row's side padding (the handoff's 56 px insets); everything else styles our own `.gg-*` elements.
 * The eyebrow/title block is shown only with the full-screen layout, where the logo was; otherwise (a renamed Steam
 * class) it stays hidden and Steam's logo is left alone, so the page never shows two titles.
 */
function restyleRules({ header, details, root, play }: ThemeClasses, layout: boolean): string[] {
    const topCapsule = cls(header, 'TopCapsule');
    const titleImage = cls(header, 'TitleImageContainer');
    const svgTitle = cls(header, 'SVGTitle');
    const inner = cls(details, 'InnerContainer');
    const playSection = cls(root, 'PlaySection');
    const playButton = cls(root, 'ActionButtonAndStatusPanel');
    const menuButton = cls(play, 'MenuButton');
    const cloud = cls(play, 'CloudStatusRow');

    const rules: string[] = [
        // Steam's thin download bar under the Play pill is never shown (the pill itself fills, buildDownloadCss), so it
        // cannot flash before the progress is known.
        rule(playButton && `${playButton} [role="progressbar"]`, ` display: none !important; `),
        // The game's accent (buildAccentCss sets it on the page container) becomes the theme's accent:
        // the Play pill, the HLTB goal value and bar. Registered so it can animate, as on Home.
        `@property --glance-accent { syntax: '<color>'; inherits: true; initial-value: ${DEFAULT_ACCENT}; }`,
        `:root { --gg-d: calc(100vw / 1440); }`,
        `@media (max-aspect-ratio: 17/10) { :root { --gg-d: calc(100vw / 1280); } }`,
        rule(inner, ` --gg-accent: var(--glance-accent); transition: --glance-accent ${ACCENT_MS}ms ease; `),

        // Side insets 56: Steam's Play row (2.8vw of its own) and everything placed by --gg-side move together,
        // so the cloud icon's position (counted from --gg-side) stays right.
        playSection ? `:root { --gg-side: ${d(56)}; }` : '',
        rule(playSection, ` padding-left: var(--gg-side) !important; padding-right: var(--gg-side) !important; `),

        // Handoff sizes (Play pill 340x60, 60px circles, gap 14), scaled like Home's. They feed the 1.1.1 rules
        // (Play button width, buttons, the cloud icon's position), which keep working unchanged.
        `:root { --gg-play-w: ${d(340)}; --gg-icon: ${d(60)}; --gg-gap: ${d(14)}; }`,
        // The row sits on a 36 gap above the cards: Play row top = H - 386, cards top = H - 290 (handoff).
        rule(playSection, ` padding-top: 0 !important; padding-bottom: ${d(36)} !important; `),
        rule(cloud, ` top: 0 !important; `),
        // Steam gives the pill group a fixed min-width in px (164, and 218 for games with a "Play from" arrow), which would
        // push the arrow segment past the slot into the circles. The group is exactly the slot; the arrow sits inside its right end.
        rule(playButton && `${playButton} > div:has(> [role="button"])`, ` min-width: 0 !important; `),
        rule(playButton && `${playButton} [role="button"]`, ` font-size: ${d(22)} !important; font-weight: 700 !important; padding: ${d(8)} ${d(24)} !important; `),
        rule(playButton && `${playButton} [role="button"] > div`, ` font-size: ${d(22)} !important; `),
        rule(playButton && `${playButton} [role="button"] svg`, ` width: ${d(20)} !important; height: ${d(20)} !important; margin-right: ${d(14)} !important; `),
        rule(playButton && `${playButton} [role="button"] + [role="button"]`, ` flex: 0 0 ${d(56)} !important; width: ${d(56)} !important; padding: 0 !important; `),
        rule(playButton && `${playButton} [role="button"] + [role="button"] svg`, ` width: ${d(14)} !important; height: ${d(14)} !important; `),
        rule(menuButton, ` background: rgba(12, 16, 22, 0.4) !important; backdrop-filter: blur(${d(12)}) !important; `),
        rule(menuButton && `${menuButton}.gpfocus`, ` background: #ffffff !important; `),
        rule(menuButton && `${menuButton} svg`, ` width: ${d(24)} !important; height: ${d(24)} !important; `),
        // The cloud status is the same circle as the others (Steam's own row background, and the lighter 1.1.1 fill, gave it
        // a lighter tinted disc); its icon keeps the state colour, re-tuned for the dark fill (CLOUD_COLOURS, shared with
        // Home) with a dark halo for bright art. It only takes focus on a sync problem: white like the others, dark red icon.
        rule(cloud, ` background: rgba(12, 16, 22, 0.4) !important; border: 1px solid rgba(255, 255, 255, 0.18) !important;
            backdrop-filter: blur(${d(12)}) !important; box-shadow: none !important;
            --gg-ok: ${CLOUD_COLOURS.ok}; --gg-warn: ${CLOUD_COLOURS.busy}; --gg-bad: ${CLOUD_COLOURS.bad}; --gg-off: ${CLOUD_COLOURS.off}; `),
        rule(cloud && `${cloud} svg`, ` filter: drop-shadow(0 0 ${d(1.5)} rgba(0, 0, 0, 0.7)) !important; `),
        rule(cloud && `${cloud}.gpfocus`, ` background: #ffffff !important; color: ${CLOUD_FOCUS_BAD} !important; `),

        // Play: dark text on the accent pill (handoff "text on accent"), a white ring and accent glow when focused.
        rule(playButton && `${playButton} [role="button"]`, ` color: #0b0d10 !important; `),
        rule(playButton && `${playButton} > div:has(> [role="button"].gpfocus)`,
            ` box-shadow: 0 0 0 ${d(2)} rgba(255, 255, 255, 0.9), 0 ${d(14)} ${d(40)} calc(-1 * ${d(8)}) var(--glance-accent) !important; `),

        // Eyebrow ("Last played · Today", accent) and the 64px/800 title, at most two lines. Hidden unless the
        // full-screen layout applies (below): all-or-nothing, like the rest of the layout.
        `.gg-titleblock { display: none; flex-direction: column; gap: ${d(14)}; max-width: ${d(640)}; margin: 1vh var(--gg-side); color: #fff; font-family: inherit; }`,
        `.gg-eyebrow { font-size: ${d(12)}; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; line-height: 1.2; color: var(--glance-accent-text); }`,
        // The clip gets a bleed for descenders and the shadow; equal negative margins keep the box at two lines.
        `.gg-title { margin: calc(-1 * ${d(16)}); padding: ${d(16)}; font-size: ${d(64)}; line-height: 1; font-weight: 800; letter-spacing: -0.02em;
            text-wrap: balance; text-shadow: 0 ${d(4)} ${d(30)} rgba(0, 0, 0, 0.4); overflow-wrap: anywhere;
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }`,

        // Cards: grid 1.1fr / 1fr, gap 18; padding 20x24, radius 16, the handoff's glass; its type sizes.
        `.gg-cards { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: ${d(18)}; }`,
        `.gg-card { display: flex; flex-direction: column; gap: ${d(12)}; padding: ${d(20)} ${d(24)}; border-radius: ${d(16)};
            background: rgba(12, 16, 22, 0.38); border-color: rgba(255, 255, 255, 0.12); backdrop-filter: blur(${d(16)}); }`,
        `.gg-card.gg-hltb { gap: ${d(10)}; }`,
        `.gg-label { font-size: ${d(11)}; letter-spacing: 0.18em; color: rgba(255, 255, 255, 0.62); }`,
        `.gg-value { font-size: ${d(30)}; line-height: 1.2; }`,
        `.gg-stats { gap: ${d(40)}; margin-top: 0; }`,
        `.gg-hltb .gg-stats { gap: ${d(36)}; }`,
        `.gg-stats > div { display: flex; flex-direction: column; gap: ${d(4)}; }`,
        `.gg-desc { margin: 0; font-size: ${d(15)}; line-height: 1.5; color: rgba(255, 255, 255, 0.84); }`,
        `.gg-bar { margin-top: 0; height: ${d(6)}; border-radius: ${d(3)}; }`,
        `.gg-bar > div { border-radius: ${d(3)}; }`,
        `.gg-caption, .gg-muted { margin-top: 0; font-size: ${d(15)}; color: rgba(255, 255, 255, 0.72); }`,
        // HLTB: MAIN is always the accent (handoff), not the tier the player is working toward.
        `.gg-hltb .gg-stats > div .gg-value { color: inherit; }`,
        `.gg-hltb .gg-stats > div:first-child .gg-value { color: var(--glance-accent-text, var(--gg-accent)); transition: color ${ACCENT_MS}ms; }`,
        // No chevron hint (handoff has none). The source pill stays, expanded, level with the Play row at the right.
        `.gg-more { display: none; }`,
        `.gg-pill { top: calc(-1 * ${d(82)}); ${sourcePillLook(d)} }`,
        `.gg-pill-icon { ${sourcePillIcon(d)} }`,
    ];

    if (layout) {
        rules.push(
            // Where the logo was: left inset, top 120 (as on Home, measured from the screen's top).
            rule(`${inner} > .gg-titleblock`, ` display: flex !important; position: absolute !important; top: ${d(120)} !important;
                left: var(--gg-side) !important; right: var(--gg-side) !important; margin: 0 !important; `),
            // Steam's logo, and its text title for games without one, give way to our title (hidden in place), only
            // while our title is on the page: Steam's header is the first child of the page container.
            rule(titleImage && `${inner}:has(> .gg-titleblock) ${topCapsule} ${titleImage}`, ` visibility: hidden !important; `),
            rule(svgTitle && `${inner}:has(> .gg-titleblock) ${topCapsule} ${svgTitle}`, ` visibility: hidden !important; `),
            // Handoff: Play row top = H - 386 and row = pill 60 + 36 gap, so the cards (at the row's bottom) start at H - 290.
            `:root { --gg-play-top: calc(100vh - ${d(386)}); --gg-row-h: ${d(96)}; }`,
            // The handoff's stronger scrims over the 1.1.1 ones.
            rule(`${topCapsule}::after`, ` background: ${HANDOFF_SCRIM_LEFT}, ${HANDOFF_SCRIM_BOTTOM},
                ${SCRIM_BOTTOM}, ${SCRIM_LEFT}; `),
        );
    }
    return rules;
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
