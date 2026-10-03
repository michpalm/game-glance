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

/** A size in the theme's scale unit: `n` px on the handheld's 828×466 layout, larger on a TV (60% of the screen's growth). */
const u = (n: number) => `calc(${n} * var(--gg-u))`;

/**
 * The theme's CSS, built from Steam's class names. Pure, so it can be tested.
 *
 * Layout (all-or-nothing): Steam's header becomes screen-tall, Steam's overview block (Play row + tabs)
 * is pulled up onto the art, our cards are overlaid under the Play row, and the tabs start on the next
 * screen. Nothing in Steam's page structure moves, so controller navigation and scrolling stay Steam's.
 * If any class the layout needs is missing, none of the layout applies and the page stays stacked.
 */
export function buildThemeCss({ header, details, overview, root, play, launch }: ThemeClasses): string {
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
            --gg-u: calc(1px + (min(calc(100vh / 466), calc(100vw / 828)) - 1px) * 0.6);
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
                background: linear-gradient(0deg, rgba(8, 11, 15, 0.94) 0%, rgba(8, 11, 15, 0.6) 34%, transparent 60%),
                            linear-gradient(90deg, rgba(8, 11, 15, 0.45) 0%, transparent 45%); `),
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
    return rules.filter((r) => r.length > 0).join('\n');
}
