import { sourcePillIcon, sourcePillLook } from '../../src/styles/sourcePill';
import { describe, expect, it } from 'vitest';
import { buildAccentCss, buildDownloadCss, buildLaunchCss, buildThemeCss, launchTargets, ThemeClasses } from '../../src/styles/themeCss';

const full: ThemeClasses = {
    header: { TopCapsule: 'hd_Top', BoxSizer: 'hd_Box' },
    details: { InnerContainer: 'ad_Inner', AppDetailsOverviewPanel: 'ad_Overview' },
    overview: { Backdrop: 'ov_Backdrop' },
    root: {
        AppDetailsRoot: 'rt_Root',
        PlaySection: 'rt_Play',
        ActionRow: 'rt_Row',
        ActionButtonAndStatusPanel: 'rt_PlayBtn',
        AppButtons: 'rt_Buttons',
        AppDetailsContainer: 'rt_Tabs',
    },
    play: {
        StatusAndStats: 'ps_Stats',
        Playtime: 'ps_Playtime',
        LastPlayed: 'ps_LastPlayed',
        MenuButton: 'ps_Menu',
        CloudStatusRow: 'ps_Cloud',
        CloudStatusLabel: 'ps_CloudLabel',
        CloudStatusIcon: 'ps_CloudIcon',
        CloudSynching: 'ps_Syncing',
        CloudSyncProblem: 'ps_Problem',
        CloudStatusSyncFail: 'ps_Fail',
        OfflineMode: 'ps_Offline',
    },
};

const ruleFor = (css: string, selector: string) => {
    const start = css.indexOf(selector);
    return start < 0 ? '' : css.slice(start, css.indexOf('}', start));
};

describe('buildThemeCss full-screen layout', () => {
    it('makes the art screen-tall, pulls Steam’s block onto it and overlays our cards', () => {
        const css = buildThemeCss(full);
        expect(ruleFor(css, '.hd_Top {')).toContain('height: 100vh');
        expect(ruleFor(css, '.ad_Overview {')).toContain('margin-top:');
        expect(ruleFor(css, '.ad_Inner > .gg-hero {')).toContain('position: absolute');
        expect(ruleFor(css, '.rt_Tabs {')).toContain('margin-top:');
        expect(ruleFor(css, '.ov_Backdrop {')).toContain('display: none');
        expect(ruleFor(css, '.hd_Box {')).toContain('top:');
    });
    it('is all-or-nothing: one missing piece keeps the stacked stock layout', () => {
        for (const drop of ['header', 'details', 'root'] as const) {
            const key = { header: 'TopCapsule', details: 'AppDetailsOverviewPanel', root: 'AppDetailsContainer' }[drop];
            const classes: ThemeClasses = { ...full, [drop]: { ...full[drop], [key]: undefined } } as ThemeClasses;
            const css = buildThemeCss(classes);
            expect(css).not.toMatch(/100vh(?! \/ 466)/); // screen-tall layout rules (the scale unit itself is fine)
            expect(css).not.toContain('position: absolute !important; top: calc(var(--gg-play-top)');
            expect(css).toContain('.gg-hero {');
        }
    });
});

describe('buildThemeCss play row', () => {
    it('hides Steam’s duplicate play time and last played', () => {
        const css = buildThemeCss(full);
        for (const cls of ['ps_Stats', 'ps_Playtime', 'ps_LastPlayed']) {
            expect(css).toMatch(new RegExp(`\\.${cls}[^{]*\\{[^}]*display: none`));
        }
    });
    it('turns Play into one pill, including the split "Play from" arrow some games have', () => {
        const css = buildThemeCss(full);
        const pill = ruleFor(css, '.rt_PlayBtn > div:has(> [role="button"]) {');
        expect(pill).toContain('border-radius: 999px');
        expect(pill).toContain('background: var(--gg-accent)');
        expect(ruleFor(css, '.rt_PlayBtn [role="button"] {')).toContain('background: transparent');
        expect(ruleFor(css, '.rt_PlayBtn [role="button"] {')).toContain('color: #ffffff');
        expect(ruleFor(css, '.rt_PlayBtn [role="button"] + [role="button"] {')).toContain('flex: 0 0 calc(38 * var(--gg-u))');
    });
    it('keeps a visible focus highlight on Play, the arrow and the icon buttons', () => {
        const css = buildThemeCss(full);
        expect(ruleFor(css, '.rt_PlayBtn [role="button"].gpfocus {')).toContain('background:');
        expect(ruleFor(css, '.ps_Menu.gpfocus {')).toContain('background: #ffffff');
        expect(ruleFor(css, '.ps_Menu {')).toContain('border-radius: 50%');
    });
    it('shrinks the cloud row to an icon coloured by sync state', () => {
        const css = buildThemeCss(full);
        expect(css).toMatch(/\.ps_CloudLabel[^{]*\{[^}]*display: none/);
        expect(css).toContain('.ps_Cloud.ps_Syncing');
        expect(css).toContain('.ps_Cloud.ps_Problem');
        expect(css).toContain('.ps_Cloud.ps_Fail');
        expect(css).toContain('.ps_Offline .ps_Cloud');
    });
});

describe('buildThemeCss resilience', () => {
    it('never emits broken selectors when class maps are missing', () => {
        const css = buildThemeCss({ header: undefined, details: undefined, overview: undefined, root: undefined, play: undefined });
        expect(css).not.toContain('undefined');
        expect(css).not.toMatch(/(^|[\s,])\.(\s|\{|,)/m);
        expect(css).not.toContain('display: none');
        expect(css).toContain('.gg-hero {');
    });
});

describe('buildThemeCss while a game launches', () => {
    it('styles only the button group as the pill, never Steam’s launch progress bar', () => {
        const css = buildThemeCss(full);
        expect(css).not.toContain('.rt_PlayBtn > div {');
        expect(ruleFor(css, '.rt_Row {')).toContain('align-items: flex-start');
    });
    it('sets no stacking order on our cards or Steam’s block, so Steam’s launch screen covers them', () => {
        const css = buildThemeCss(full);
        expect(ruleFor(css, '.ad_Inner > .gg-hero {')).not.toContain('z-index');
        expect(ruleFor(css, '.ad_Overview {')).not.toContain('z-index');
        expect(ruleFor(css, '.gg-hero {')).not.toContain('z-index');
    });
});

describe('buildThemeCss button spacing', () => {
    it('removes Steam’s own margins so every gap in the Play row is the same', () => {
        const css = buildThemeCss(full);
        expect(ruleFor(css, '.rt_Buttons > * {')).toContain('margin: 0');
        expect(ruleFor(css, '.ps_Menu {')).toContain('margin: 0');
        expect(ruleFor(css, '.ps_Cloud {')).toContain('box-sizing: border-box');
    });
    it('puts the cloud icon last, so games without one leave no hole in the row', () => {
        const css = buildThemeCss(full);
        expect(ruleFor(css, '.rt_Buttons {')).toContain('margin-left: 0');
        expect(ruleFor(css, '.ps_Cloud {')).toContain('var(--gg-buttons, 2) * (var(--gg-icon) + var(--gg-gap))');
    });
    it('counts Steam’s icon buttons to place the cloud after the last one', () => {
        const css = buildThemeCss(full);
        expect(ruleFor(css, '.rt_Play:has(.rt_Buttons > :nth-child(3):last-child) ~ .ps_Cloud {')).toContain('--gg-buttons: 3');
        expect(ruleFor(css, '.rt_Play:has(.rt_Buttons > :nth-child(1):last-child) ~ .ps_Cloud {')).toContain('--gg-buttons: 1');
    });
});

describe('buildThemeCss on bigger screens (TV)', () => {
    it('defines one scale unit: 1px on the handheld’s 828×466 layout, growing gently with the screen', () => {
        const css = buildThemeCss(full);
        // 60% of the screen's growth: 1.49x on the TV's 1500x844 layout instead of 1.81x
        expect(css).toContain('--gg-u: calc(1px + (min(calc(100vh / 466), calc(100vw / 828)) - 1px) * 0.6);');
    });
    it('uses no fixed pixel sizes except hairline borders', () => {
        const css = buildThemeCss(full);
        const fixed = [...css.matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => m[1]).filter((n) => !['0', '1', '999'].includes(n)); // 999px = fully round
        expect(fixed).toEqual([]);
    });
    it('scales Steam’s own label, icons and padding inside the Play row', () => {
        const css = buildThemeCss(full);
        expect(ruleFor(css, '.rt_PlayBtn [role="button"] {')).toContain('font-size: calc(16 * var(--gg-u))');
        expect(ruleFor(css, '.rt_PlayBtn [role="button"] > div {')).toContain('font-size: calc(16 * var(--gg-u))'); // Steam sizes the label itself
        expect(ruleFor(css, '.rt_PlayBtn [role="button"] {')).toContain('padding: calc(8 * var(--gg-u)) calc(16 * var(--gg-u))');
        expect(ruleFor(css, '.rt_PlayBtn svg, .ps_Menu svg {')).toContain('width: calc(24 * var(--gg-u))');
        expect(ruleFor(css, '.rt_PlayBtn [role="button"] svg {')).toContain('margin-right: calc(16 * var(--gg-u))');
        expect(ruleFor(css, '.rt_PlayBtn svg, .ps_Menu svg {')).not.toContain('margin');
        // the "Play from" arrow is Steam's small 12px triangle, not a full-size icon
        expect(ruleFor(css, '.rt_PlayBtn [role="button"] + [role="button"] svg {')).toContain('width: calc(12 * var(--gg-u))');
        expect(ruleFor(css, '.rt_PlayBtn [role="button"] + [role="button"] svg {')).toContain('margin: 0');
        expect(ruleFor(css, '.ps_Cloud svg {')).toContain('width: calc(16 * var(--gg-u))');
        expect(ruleFor(css, '.ps_CloudIcon {')).toContain('height: calc(16 * var(--gg-u))');
        expect(ruleFor(css, '.rt_Play {')).toContain('padding-top: calc(16 * var(--gg-u))');
    });
});

describe('buildThemeCss store pill', () => {
    it('sizes the store icon with the text and the screen', () => {
        const css = buildThemeCss(full);
        expect(ruleFor(css, '.gg-pill-icon {')).toContain('width: calc(12 * var(--gg-u))');
        expect(ruleFor(css, '.gg-pill-icon {')).toContain('margin-right: calc(6 * var(--gg-u))');
    });
});

describe('buildThemeCss bottom anchoring', () => {
    it('keeps the Play row and cards at the bottom of any screen (44vh down on the handheld)', () => {
        const css = buildThemeCss(full);
        // 261 units = the handheld's 466 - 205 px below the top of the Play row
        expect(css).toContain('--gg-play-top: calc(100vh - calc(261 * var(--gg-u)));');
    });
});

describe('buildThemeCss launch overlay', () => {
    const withLaunch: ThemeClasses = { ...full, launch: { Container: 'ln_Container', ConfigurationHeader: 'ln_Header' } };

    it('dims what is behind Steam’s launch overlay so its text is easier to read', () => {
        const rule = ruleFor(buildThemeCss(withLaunch), '.ln_Container {');
        expect(rule).toMatch(/background(-color)?: rgba\(0, 0, 0, 0\.\d+\)/);
    });
    it('does nothing if Steam’s launch overlay class is not known, and never touches the layout', () => {
        expect(buildThemeCss(full)).not.toContain('ln_Container');
        expect(buildThemeCss({ ...full, launch: {} })).toBe(buildThemeCss(full));
        const stripped = buildThemeCss(withLaunch).replace(/\n?\.ln_Container \{[^}]*\}/, '');
        expect(stripped).toBe(buildThemeCss(full));
    });
});

describe('buildLaunchCss (while a game launches)', () => {
    const withLaunch: ThemeClasses = {
        ...full,
        header: { ...full.header, TitleImageContainer: 'hd_Title', SVGTitle: 'hd_Svg' },
        launch: { Container: 'ln_Container' },
    };

    it('hides everything with text on it: our title and cards, Steam\u2019s logo, title, Play row and tabs, never the art', () => {
        const { overlay, hide } = launchTargets(withLaunch);
        expect(overlay).toBe('.ln_Container');
        expect(hide).toEqual(['.gg-titleblock', '.gg-hero', '.hd_Box', '.hd_Title', '.hd_Svg', '.ad_Overview', '.rt_Tabs']);
        expect(hide).not.toContain('.hd_Top');
        const css = buildLaunchCss(withLaunch);
        expect(css).toContain(`${hide.join(', ')} { opacity: 0 !important; transition: opacity 200ms ease !important; }`);
    });
    it('lets more of the art through the overlay than its resting dim', () => {
        const css = buildLaunchCss(withLaunch);
        expect(css).toContain(':root .ln_Container { background: rgba(0, 0, 0, 0.55) !important; }');
    });
    it('hides nothing when the overlay class is unknown; Steam classes that are missing are just left out', () => {
        expect(buildLaunchCss(full)).toBe('');
        expect(launchTargets({ ...full, launch: {} })).toEqual({ overlay: null, hide: [] });
        const none: ThemeClasses = { header: undefined, details: undefined, overview: undefined, root: undefined, play: undefined, launch: { Container: 'ln_Container' } };
        expect(launchTargets(none).hide).toEqual(['.gg-titleblock', '.gg-hero']);
    });
});

describe('buildThemeCss 1.1.1 baseline', () => {
    const none: ThemeClasses = { header: undefined, details: undefined, overview: undefined, root: undefined, play: undefined };

    it('buildThemeCss without restyle is identical to 1.1.1 output', () => {
        expect(buildThemeCss(full)).toMatchInlineSnapshot(`
          ":root {
                      --gg-accent: #1fbf8f;
                      --gg-ok: #1fbf8f;
                      --gg-warn: #e6b800;
                      --gg-bad: #e5484d;
                      --gg-off: #8a8f98;
                      --gg-glass: rgba(255, 255, 255, 0.045);
                      --gg-border: rgba(255, 255, 255, 0.11);
                      --gg-muted: rgba(255, 255, 255, 0.6);
                      --gg-u: calc(1px + (min(calc(100vh / 466), calc(100vw / 828)) - 1px) * 0.6);
                      --gg-row-h: calc(88 * var(--gg-u));
                      --gg-play-w: calc(246 * var(--gg-u));
                      --gg-icon: calc(44 * var(--gg-u));
                      --gg-gap: calc(10 * var(--gg-u));
                      --gg-side: 2.8vw;
                  }
          .gg-hero { position: relative; margin: 1vh var(--gg-side); font-family: inherit; color: #fff; }
          .gg-cards { display: flex; gap: calc(14 * var(--gg-u)); align-items: stretch; }
          .gg-card { flex: 1 1 0; min-width: 0; background: var(--gg-glass); border: 1px solid var(--gg-border);
                      border-radius: calc(10 * var(--gg-u)); padding: calc(9 * var(--gg-u)) calc(12 * var(--gg-u)); backdrop-filter: blur(calc(10 * var(--gg-u))); }
          .gg-card.gg-hltb { flex: 0.95 1 0; }
          .gg-label { font-size: calc(8.5 * var(--gg-u)); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gg-muted); white-space: nowrap; }
          .gg-value { font-size: calc(17 * var(--gg-u)); font-weight: 700; white-space: nowrap; }
          .gg-stats { display: flex; gap: calc(18 * var(--gg-u)); margin-top: calc(2 * var(--gg-u)); }
          .gg-goal .gg-value { color: var(--gg-accent); }
          .gg-desc { margin: calc(6 * var(--gg-u)) 0 0; font-size: calc(10.5 * var(--gg-u)); line-height: 1.4; color: rgba(255, 255, 255, 0.85);
                      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
          .gg-muted { margin-top: calc(8 * var(--gg-u)); font-size: calc(10 * var(--gg-u)); color: var(--gg-muted); }
          .gg-bar { margin-top: calc(8 * var(--gg-u)); height: calc(4 * var(--gg-u)); border-radius: calc(2 * var(--gg-u)); background: rgba(255, 255, 255, 0.14); overflow: hidden; }
          .gg-bar > div { height: 100%; border-radius: calc(2 * var(--gg-u)); background: var(--gg-accent); }
          .gg-caption { margin-top: calc(5 * var(--gg-u)); font-size: calc(10 * var(--gg-u)); color: var(--gg-muted); }
          .gg-skeleton { display: inline-block; width: 3.2em; height: 1em; border-radius: calc(4 * var(--gg-u)); background: rgba(255, 255, 255, 0.12); }
          .gg-pill { position: absolute; right: 0; top: calc(-1 * calc(60 * var(--gg-u))); height: calc(24 * var(--gg-u)); display: inline-flex; align-items: center; padding: 0 calc(10 * var(--gg-u));
                      border-radius: 999px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.2); font-size: calc(11 * var(--gg-u)); }
          .gg-pill-icon { flex: 0 0 auto; width: calc(12 * var(--gg-u)); height: calc(12 * var(--gg-u)); margin-right: calc(6 * var(--gg-u)); }
          .gg-more { position: absolute; left: 50%; bottom: calc(44 * var(--gg-u)); transform: translateX(-50%); font-size: calc(20 * var(--gg-u)); line-height: 1; opacity: 0.35; pointer-events: none; }
          .ps_Stats, .ps_Playtime, .ps_LastPlayed { display: none !important; }
          .rt_Row { justify-content: flex-start !important; align-items: flex-start !important; gap: var(--gg-gap) !important; }
          .rt_PlayBtn { width: var(--gg-play-w) !important; flex: 0 0 var(--gg-play-w) !important; }
          .rt_PlayBtn > div:has(> [role="button"]) { display: flex !important; width: 100% !important; height: var(--gg-icon) !important;
                      border-radius: 999px !important; overflow: hidden !important; background: var(--gg-accent) !important; box-shadow: none !important; }
          .rt_PlayBtn [role="button"] { background: transparent !important; border-radius: 0 !important; width: auto !important;
                      flex: 1 1 auto !important; min-width: 0 !important; min-height: 0 !important; height: 100% !important; color: #ffffff !important;
                      font-size: calc(16 * var(--gg-u)) !important; padding: calc(8 * var(--gg-u)) calc(16 * var(--gg-u)) !important; }
          .rt_PlayBtn [role="button"] > div { font-size: calc(16 * var(--gg-u)) !important; }
          .rt_PlayBtn [role="button"] + [role="button"] { flex: 0 0 calc(38 * var(--gg-u)) !important; width: calc(38 * var(--gg-u)) !important; padding: 0 !important;
                      display: flex !important; align-items: center !important; justify-content: center !important; border-left: 1px solid rgba(4, 17, 12, 0.25) !important; }
          .rt_PlayBtn [role="button"].gpfocus { background: rgba(255, 255, 255, 0.28) !important; }
          .rt_Buttons { margin-left: 0 !important; gap: var(--gg-gap) !important; }
          .rt_Buttons > * { margin: 0 !important; padding: 0 !important; }
          .ps_Menu { width: var(--gg-icon) !important; height: var(--gg-icon) !important; min-width: 0 !important; margin: 0 !important; box-sizing: border-box !important; border-radius: 50% !important;
                      background: rgba(255, 255, 255, 0.08) !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; }
          .ps_Menu.gpfocus { background: #ffffff !important; color: #0b0f14 !important; }
          .rt_PlayBtn svg, .ps_Menu svg { width: calc(24 * var(--gg-u)) !important; height: calc(24 * var(--gg-u)) !important; }
          .rt_PlayBtn [role="button"] svg { margin-right: calc(16 * var(--gg-u)) !important; }
          .rt_PlayBtn [role="button"] + [role="button"] svg { width: calc(12 * var(--gg-u)) !important; height: calc(12 * var(--gg-u)) !important; margin: 0 !important; }
          .rt_Play { background: transparent !important; padding-top: calc(16 * var(--gg-u)) !important; padding-bottom: calc(16 * var(--gg-u)) !important; }
          .ps_Cloud { position: absolute !important; top: calc(16 * var(--gg-u)) !important;
                      left: calc(var(--gg-side) + var(--gg-play-w) + var(--gg-gap) + var(--gg-buttons, 2) * (var(--gg-icon) + var(--gg-gap))) !important;
                      width: var(--gg-icon) !important; height: var(--gg-icon) !important; padding: 0 !important; margin: 0 !important; box-sizing: border-box !important;
                      display: flex; align-items: center; justify-content: center; border-radius: 50%;
                      background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.18); color: var(--gg-ok) !important; }
          .rt_Play:has(.rt_Buttons > :nth-child(1):last-child) ~ .ps_Cloud { --gg-buttons: 1; }
          .rt_Play:has(.rt_Buttons > :nth-child(2):last-child) ~ .ps_Cloud { --gg-buttons: 2; }
          .rt_Play:has(.rt_Buttons > :nth-child(3):last-child) ~ .ps_Cloud { --gg-buttons: 3; }
          .rt_Play:has(.rt_Buttons > :nth-child(4):last-child) ~ .ps_Cloud { --gg-buttons: 4; }
          .rt_Play:has(.rt_Buttons > :nth-child(5):last-child) ~ .ps_Cloud { --gg-buttons: 5; }
          .ps_Cloud::before, .ps_Cloud::after { content: none !important; }
          .ps_Cloud svg { fill: currentColor !important; color: inherit !important;
                      width: calc(16 * var(--gg-u)) !important; height: calc(16 * var(--gg-u)) !important; margin: 0 calc(8 * var(--gg-u)) calc(4 * var(--gg-u)) !important; }
          .ps_CloudIcon { height: calc(16 * var(--gg-u)) !important; }
          .ps_CloudLabel { display: none !important; }
          .ps_Cloud.ps_Syncing, .ps_Syncing .ps_Cloud, .ps_Cloud .ps_Syncing { color: var(--gg-warn) !important; }
          .ps_Cloud.ps_Problem, .ps_Problem .ps_Cloud, .ps_Cloud .ps_Problem { color: var(--gg-bad) !important; }
          .ps_Cloud.ps_Fail, .ps_Fail .ps_Cloud, .ps_Cloud .ps_Fail { color: var(--gg-bad) !important; }
          .ps_Offline .ps_Cloud { color: var(--gg-off) !important; }
          :root { --gg-play-top: calc(100vh - calc(261 * var(--gg-u))); }
          .hd_Top { height: 100vh !important; min-height: 0 !important; }
          .hd_Top::after { content: ''; position: absolute; inset: 0; pointer-events: none;
                          background: linear-gradient(0deg, rgba(8, 11, 15, 0.94) 0%, rgba(8, 11, 15, 0.6) 34%, transparent 60%),
                                      linear-gradient(90deg, rgba(8, 11, 15, 0.45) 0%, transparent 45%); }
          .hd_Box { top: 6% !important; height: 30% !important; }
          .ad_Inner { position: relative !important; }
          .ad_Overview { margin-top: calc(var(--gg-play-top) - 100vh) !important; position: relative; }
          .ov_Backdrop { display: none !important; }
          .rt_Root { background: transparent !important; }
          .rt_Tabs { margin-top: calc(100vh - var(--gg-play-top) - var(--gg-row-h)) !important; background: rgba(14, 20, 27, 0.9) !important; }
          .ad_Inner > .gg-hero { position: absolute !important; top: calc(var(--gg-play-top) + var(--gg-row-h)) !important;
                          left: var(--gg-side) !important; right: var(--gg-side) !important; height: calc(100vh - var(--gg-play-top) - var(--gg-row-h)) !important;
                          margin: 0 !important; }"
        `);
        expect(buildThemeCss(none)).toMatchInlineSnapshot(`
          ":root {
                      --gg-accent: #1fbf8f;
                      --gg-ok: #1fbf8f;
                      --gg-warn: #e6b800;
                      --gg-bad: #e5484d;
                      --gg-off: #8a8f98;
                      --gg-glass: rgba(255, 255, 255, 0.045);
                      --gg-border: rgba(255, 255, 255, 0.11);
                      --gg-muted: rgba(255, 255, 255, 0.6);
                      --gg-u: calc(1px + (min(calc(100vh / 466), calc(100vw / 828)) - 1px) * 0.6);
                      --gg-row-h: calc(88 * var(--gg-u));
                      --gg-play-w: calc(246 * var(--gg-u));
                      --gg-icon: calc(44 * var(--gg-u));
                      --gg-gap: calc(10 * var(--gg-u));
                      --gg-side: 2.8vw;
                  }
          .gg-hero { position: relative; margin: 1vh var(--gg-side); font-family: inherit; color: #fff; }
          .gg-cards { display: flex; gap: calc(14 * var(--gg-u)); align-items: stretch; }
          .gg-card { flex: 1 1 0; min-width: 0; background: var(--gg-glass); border: 1px solid var(--gg-border);
                      border-radius: calc(10 * var(--gg-u)); padding: calc(9 * var(--gg-u)) calc(12 * var(--gg-u)); backdrop-filter: blur(calc(10 * var(--gg-u))); }
          .gg-card.gg-hltb { flex: 0.95 1 0; }
          .gg-label { font-size: calc(8.5 * var(--gg-u)); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gg-muted); white-space: nowrap; }
          .gg-value { font-size: calc(17 * var(--gg-u)); font-weight: 700; white-space: nowrap; }
          .gg-stats { display: flex; gap: calc(18 * var(--gg-u)); margin-top: calc(2 * var(--gg-u)); }
          .gg-goal .gg-value { color: var(--gg-accent); }
          .gg-desc { margin: calc(6 * var(--gg-u)) 0 0; font-size: calc(10.5 * var(--gg-u)); line-height: 1.4; color: rgba(255, 255, 255, 0.85);
                      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
          .gg-muted { margin-top: calc(8 * var(--gg-u)); font-size: calc(10 * var(--gg-u)); color: var(--gg-muted); }
          .gg-bar { margin-top: calc(8 * var(--gg-u)); height: calc(4 * var(--gg-u)); border-radius: calc(2 * var(--gg-u)); background: rgba(255, 255, 255, 0.14); overflow: hidden; }
          .gg-bar > div { height: 100%; border-radius: calc(2 * var(--gg-u)); background: var(--gg-accent); }
          .gg-caption { margin-top: calc(5 * var(--gg-u)); font-size: calc(10 * var(--gg-u)); color: var(--gg-muted); }
          .gg-skeleton { display: inline-block; width: 3.2em; height: 1em; border-radius: calc(4 * var(--gg-u)); background: rgba(255, 255, 255, 0.12); }
          .gg-pill { position: absolute; right: 0; top: calc(-1 * calc(60 * var(--gg-u))); height: calc(24 * var(--gg-u)); display: inline-flex; align-items: center; padding: 0 calc(10 * var(--gg-u));
                      border-radius: 999px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.2); font-size: calc(11 * var(--gg-u)); }
          .gg-pill-icon { flex: 0 0 auto; width: calc(12 * var(--gg-u)); height: calc(12 * var(--gg-u)); margin-right: calc(6 * var(--gg-u)); }
          .gg-more { position: absolute; left: 50%; bottom: calc(44 * var(--gg-u)); transform: translateX(-50%); font-size: calc(20 * var(--gg-u)); line-height: 1; opacity: 0.35; pointer-events: none; }"
        `);
    });
});

/** Every rule body for `selector` (exact selector text), joined: the restyle adds later rules for some selectors. */
const rulesFor = (css: string, selector: string) => {
    const bodies: string[] = [];
    let start = css.indexOf(`${selector} {`);
    while (start >= 0) {
        const lineStart = css.lastIndexOf('\n', start) + 1;
        if (css.slice(lineStart, start).trim() === '') bodies.push(css.slice(start, css.indexOf('}', start)));
        start = css.indexOf(`${selector} {`, start + 1);
    }
    return bodies.join('\n');
};

describe('buildThemeCss restyle (Spotlight Home on)', () => {
    const steam: ThemeClasses = {
        ...full,
        header: { ...full.header, TitleImageContainer: 'hd_TitleImg', SVGTitle: 'hd_Svg' },
    };
    const restyled = buildThemeCss(steam, { restyle: true });

    it('changes nothing without the option, or with it off', () => {
        expect(buildThemeCss(steam, {})).toBe(buildThemeCss(steam));
        expect(buildThemeCss(steam, { restyle: false })).toBe(buildThemeCss(steam));
        expect(buildThemeCss(full, { restyle: false })).toBe(buildThemeCss(full));
    });
    it('only appends rules after the 1.1.1 output', () => {
        expect(restyled.startsWith(`${buildThemeCss(steam)}\n`)).toBe(true);
    });
    it('restyle: the cloud status is the same dark circle as the others, with the re-tuned state colours and a white focus', () => {
        const cloud = rulesFor(restyled, '.ps_Cloud');
        expect(cloud).toContain('background: rgba(12, 16, 22, 0.4) !important;');
        expect(cloud).toContain('border: 1px solid rgba(255, 255, 255, 0.18) !important;');
        expect(cloud).toContain('backdrop-filter: blur(calc(12 * var(--gg-d))) !important;');
        expect(cloud).toContain('--gg-ok: #5cf2b4; --gg-warn: #ffd84d; --gg-bad: #ff8585; --gg-off: #c4c9d1;');
        expect(rulesFor(restyled, '.ps_Cloud svg')).toContain('drop-shadow');
        expect(rulesFor(restyled, '.ps_Cloud.gpfocus')).toContain('background: #ffffff !important; color: #b3261e !important;');
        // The menu circles' fill is the same.
        expect(rulesFor(restyled, '.ps_Menu')).toContain('background: rgba(12, 16, 22, 0.4) !important;');
        // Not in the 1.1.1 output.
        expect(buildThemeCss(steam)).not.toContain('#5cf2b4');
    });
    it('buildThemeCss with restyle adds the eyebrow, title and accent rules', () => {
        // accent: one per-game colour, animated over 500 ms, on Play, the HLTB goal value and bar
        expect(restyled).toContain("@property --glance-accent { syntax: '<color>'; inherits: true; initial-value: #5fd1ae; }");
        expect(rulesFor(restyled, '.ad_Inner')).toContain('--gg-accent: var(--glance-accent);');
        expect(rulesFor(restyled, '.ad_Inner')).toContain('transition: --glance-accent 500ms ease;');
        expect(rulesFor(restyled, '.rt_PlayBtn [role="button"]')).toContain('color: #0b0d10 !important');
        expect(rulesFor(restyled, '.rt_PlayBtn > div:has(> [role="button"].gpfocus)')).toContain('var(--glance-accent)');
        // handoff px scaled like Home: its 1440 canvas on 16:9, its 1280 canvas on 16:10
        expect(restyled).toContain(':root { --gg-d: calc(100vw / 1440); }');
        expect(restyled).toContain('@media (max-aspect-ratio: 17/10) { :root { --gg-d: calc(100vw / 1280); } }');
        // eyebrow and 64px/800 title
        expect(rulesFor(restyled, '.gg-eyebrow')).toContain('color: var(--glance-accent-text)');
        expect(rulesFor(restyled, '.gg-eyebrow')).toContain('text-transform: uppercase');
        expect(rulesFor(restyled, '.gg-eyebrow')).toContain('letter-spacing: 0.2em');
        const title = rulesFor(restyled, '.gg-title');
        expect(title).toContain('font-size: calc(64 * var(--gg-d))');
        expect(title).toContain('font-weight: 800');
        expect(title).toContain('-webkit-line-clamp: 2');
        // placed where the logo was (top 120 of 810), the logo and Steam's text title hidden in place
        expect(rulesFor(restyled, '.ad_Inner > .gg-titleblock')).toContain('position: absolute');
        expect(rulesFor(restyled, '.ad_Inner > .gg-titleblock')).toContain('top: calc(120 * var(--gg-d))');
        // (only while our title is rendered, so a failed render never leaves the page without a title)
        expect(rulesFor(restyled, '.ad_Inner:has(> .gg-titleblock) .hd_Top .hd_TitleImg')).toContain('visibility: hidden');
        expect(rulesFor(restyled, '.ad_Inner:has(> .gg-titleblock) .hd_Top .hd_Svg')).toContain('visibility: hidden');
        // stronger scrims over the art
        const scrim = rulesFor(restyled, '.hd_Top::after');
        expect(scrim).toContain('linear-gradient(90deg, rgba(5, 7, 10, 0.6) 0%, rgba(5, 7, 10, 0.1) 55%, rgba(5, 7, 10, 0) 75%)');
        expect(scrim).toContain('linear-gradient(180deg, rgba(5, 7, 10, 0) 55%, rgba(5, 7, 10, 0.6) 100%)');
        // cards: grid 1.1fr / 1fr, gap 18, padding 20x24, radius 16, side insets 56
        expect(rulesFor(restyled, '.gg-cards')).toContain('grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr)');
        expect(rulesFor(restyled, '.gg-cards')).toContain('gap: calc(18 * var(--gg-d))');
        expect(rulesFor(restyled, '.gg-card')).toContain('padding: calc(20 * var(--gg-d)) calc(24 * var(--gg-d))');
        expect(rulesFor(restyled, '.gg-card')).toContain('border-radius: calc(16 * var(--gg-d))');
        expect(rulesFor(restyled, '.gg-value')).toContain('font-size: calc(30 * var(--gg-d))');
        expect(rulesFor(restyled, '.gg-bar')).toContain('height: calc(6 * var(--gg-d))');
        expect(restyled).toContain(':root { --gg-side: calc(56 * var(--gg-d)); }');
        expect(rulesFor(restyled, '.rt_Play')).toContain('padding-left: var(--gg-side) !important');
    });
    it('restyled Play row matches the handoff: pill 340x60 at H-386, cards at H-290, circles 60, gap 14', () => {
        expect(restyled).toContain('--gg-play-w: calc(340 * var(--gg-d));');
        expect(restyled).toContain('--gg-icon: calc(60 * var(--gg-d));');
        expect(restyled).toContain('--gg-gap: calc(14 * var(--gg-d));');
        // actions row top = screen height - 386; the 36 below the pill puts the cards at H - 290
        expect(restyled).toContain(':root { --gg-play-top: calc(100vh - calc(386 * var(--gg-d))); --gg-row-h: calc(96 * var(--gg-d)); }');
        // Steam's own px min-width on the pill group (218 with the "Play from" arrow) must not widen it past the slot
        expect(rulesFor(restyled, '.rt_PlayBtn > div:has(> [role="button"])')).toContain('min-width: 0 !important');
        // the min-width override is restyle only: the 1.1.1 output has the group rule without it
        const plain = rulesFor(buildThemeCss(steam), '.rt_PlayBtn > div:has(> [role="button"])');
        expect(plain).not.toBe('');
        expect(plain).not.toContain('min-width');
        expect(rulesFor(restyled, '.rt_Play')).toContain('padding-top: 0 !important');
        expect(rulesFor(restyled, '.rt_Play')).toContain('padding-bottom: calc(36 * var(--gg-d)) !important');
        expect(rulesFor(restyled, '.rt_PlayBtn [role="button"]')).toContain('font-size: calc(22 * var(--gg-d)) !important');
        expect(rulesFor(restyled, '.rt_PlayBtn [role="button"]')).toContain('font-weight: 700 !important');
        expect(rulesFor(restyled, '.rt_PlayBtn [role="button"] svg')).toContain('width: calc(20 * var(--gg-d)) !important');
        expect(rulesFor(restyled, '.ps_Menu svg')).toContain('width: calc(24 * var(--gg-d)) !important');
        expect(rulesFor(restyled, '.ps_Cloud')).toContain('top: 0 !important');
    });
    it('restyled HLTB card: MAIN is always the accent, no goal-tier highlight', () => {
        expect(rulesFor(restyled, '.gg-hltb .gg-stats > div .gg-value')).toContain('color: inherit');
        expect(rulesFor(restyled, '.gg-hltb .gg-stats > div:first-child .gg-value')).toContain('color: var(--glance-accent-text, var(--gg-accent))');
    });
    it('restyled layout hides the chevron hint and keeps the source pill, expanded, beside the Play row', () => {
        expect(rulesFor(restyled, '.gg-more')).toContain('display: none');
        expect(buildThemeCss(steam)).not.toContain('.gg-more { display: none');
        const pill = rulesFor(restyled, '.gg-pill');
        expect(pill).toContain('font-size: calc(15 * var(--gg-d))');
        expect(pill).toContain('top: calc(-1 * calc(82 * var(--gg-d)))');
        expect(pill).not.toContain('display: none');
        // One definition shared with Spotlight Home's pill.
        expect(pill).toContain(sourcePillLook((n) => `calc(${n} * var(--gg-d))`));
        expect(rulesFor(restyled, '.gg-pill-icon')).toContain(sourcePillIcon((n) => `calc(${n} * var(--gg-d))`));
    });
    it('uses no fixed pixel sizes except hairline borders', () => {
        const fixed = [...restyled.matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => m[1]).filter((n) => !['0', '1', '999'].includes(n));
        expect(fixed).toEqual([]);
    });
    it('restyle rules do nothing when their Steam classes are missing and never touch layout', () => {
        const extra = (classes: ThemeClasses) => buildThemeCss(classes, { restyle: true }).slice(buildThemeCss(classes).length);

        // No Steam classes at all: only our own elements and variables, no broken selectors.
        const none = extra({ header: undefined, details: undefined, overview: undefined, root: undefined, play: undefined });
        expect(none).not.toContain('undefined');
        expect(none).not.toMatch(/(^|[\s,])\.(\s|\{|,)/m);
        expect(none).not.toContain('visibility: hidden');
        expect(none).not.toContain('::after');
        expect(none).not.toContain('--gg-side:');
        expect(none).not.toContain('position: absolute');
        expect(none).toContain('.gg-title {');
        expect(none).toContain('.gg-eyebrow {');

        // Each rule needs its own classes.
        const header = (h: Record<string, string | undefined>) => ({ ...steam, header: { ...steam.header, ...h } });
        expect(extra(header({ TitleImageContainer: undefined }))).not.toContain('hd_TitleImg');
        expect(extra(header({ TitleImageContainer: undefined }))).toContain('.hd_Top .hd_Svg {');
        expect(extra(header({ TitleImageContainer: undefined, SVGTitle: undefined }))).not.toContain('visibility');
        expect(extra(header({ SVGTitle: undefined }))).not.toContain('hd_Svg');
        expect(extra({ ...steam, root: { ...steam.root, PlaySection: undefined } })).not.toContain('--gg-side:');
        expect(extra({ ...steam, root: { ...steam.root, PlaySection: undefined } })).not.toContain('padding-left');
        expect(extra({ ...steam, root: { ...steam.root, ActionButtonAndStatusPanel: undefined } })).not.toContain('#0b0d10');
        const noInner = extra({ ...steam, details: { ...steam.details, InnerContainer: undefined } });
        expect(noInner).not.toContain('transition: --glance-accent');
        expect(noInner).not.toContain('> .gg-title');
        // Without the full-screen layout the title block stays hidden (see below) and the logo stays.
        const stacked = extra(header({ TopCapsule: undefined }));
        expect(stacked).not.toContain('visibility: hidden');
        expect(stacked).not.toContain('::after');
        expect(stacked).not.toContain('> .gg-title');
        expect(stacked).toContain('.gg-title {');

        // (display: only Steam's download bar is hidden)
        // Never layout: on Steam's elements the restyle sets colours, shadows, the scrim, the accent and the
        // logo's visibility (its box stays), plus the Play row's side padding (the handoff's 56 px insets).
        const steamRules = [...extra(steam).matchAll(/^\s*([^{}\n]+)\{([^}]*)\}/gm)]
            .filter((m) => /\.(hd|ad|ov|rt|ps)_/.test(m[1]) && !/^\s*\.ad_Inner > \.gg-/.test(m[1]));
        expect(steamRules.length).toBeGreaterThan(0);
        for (const [, selector, body] of steamRules) {
            const props = body.split(';').map((d) => d.split(':')[0].trim()).filter(Boolean);
            for (const prop of props) {
                expect([selector, prop]).toEqual([selector, expect.stringMatching(/^(--gg-accent|--gg-play-top|--gg-row-h|--gg-ok|--gg-warn|--gg-bad|--gg-off|transition|color|background|border|filter|box-shadow|visibility|padding-left|padding-right|padding-top|padding-bottom|font-size|font-weight|width|height|margin-right|top|min-width|flex|padding|backdrop-filter|display)$/)]);
            }
        }
        // (100vh only in the Play row's anchor variable, which the 1.1.1 layout rules read)
        expect(extra(steam).replace(/--gg-play-top: [^;]*;/, '')).not.toMatch(/z-index|100vh/);
    });
});

describe('buildThemeCss restyle title block (degraded layout)', () => {
    const steam: ThemeClasses = { ...full, header: { ...full.header, TitleImageContainer: 'hd_TitleImg', SVGTitle: 'hd_Svg' } };
    const display = (css: string, selector: string) => [...rulesFor(css, selector).matchAll(/display:\s*([a-z-]+)/g)].map((m) => m[1]);

    it('hides the title block when a layout class is missing, so it never sits next to Steam\'s logo', () => {
        for (const drop of ['header', 'details', 'root'] as const) {
            const key = { header: 'TopCapsule', details: 'AppDetailsOverviewPanel', root: 'AppDetailsContainer' }[drop];
            const classes = { ...steam, [drop]: { ...steam[drop], [key]: undefined } } as ThemeClasses;
            const css = buildThemeCss(classes, { restyle: true });
            expect(display(css, '.gg-titleblock')).toEqual(['none']);
            expect(css).not.toMatch(/> \.gg-titleblock \{[^}]*display: flex/);
        }
        const none = buildThemeCss({ header: undefined, details: undefined, overview: undefined, root: undefined, play: undefined }, { restyle: true });
        expect(display(none, '.gg-titleblock')).toEqual(['none']);
    });

    it('shows the title block only inside the full-screen layout rule', () => {
        const css = buildThemeCss(steam, { restyle: true });
        expect(display(css, '.gg-titleblock')).toEqual(['none']);
        expect(rulesFor(css, '.ad_Inner > .gg-titleblock')).toContain('display: flex !important');
    });
});

describe('buildAccentCss', () => {
    it('sets the game’s accent on Steam’s page container, so Play and our cards share it', () => {
        expect(buildAccentCss(full, '#f39ac0')).toBe('.ad_Inner { --glance-accent: #f39ac0; --glance-accent-text: #f39ac0; }');
        expect(buildAccentCss(full, '#8a1c1c')).toMatch(/--glance-accent: #8a1c1c; --glance-accent-text: #(?!8a1c1c)[0-9a-f]{6};/);
    });
    it('does nothing for anything but a #rrggbb colour, or without the container class', () => {
        expect(buildAccentCss(full, 'red; } body { display: none')).toBe('');
        expect(buildAccentCss(full, '')).toBe('');
        expect(buildAccentCss({ ...full, details: undefined }, '#f39ac0')).toBe('');
    });
});

describe('buildDownloadCss (restyled Play pill fill)', () => {
    it('fills the pill by the percent (Steam\'s bar is hidden by the restyle rules, not here)', () => {
        const css = buildDownloadCss(full, 41.6);
        expect(css).toContain('.rt_PlayBtn > div:has(> [role="button"]) {');
        expect(css).toContain('background-size: 42% 100% !important');
        expect(css).not.toContain('progressbar');
    });
    it('clamps the percent', () => {
        expect(buildDownloadCss(full, 250)).toContain('background-size: 100% 100%');
        expect(buildDownloadCss(full, -4)).toContain('background-size: 0% 100%');
    });
    it('is empty without a percent or without the pill class', () => {
        expect(buildDownloadCss(full, null)).toBe('');
        expect(buildDownloadCss(full, NaN)).toBe('');
        expect(buildDownloadCss({ ...full, root: undefined }, 40)).toBe('');
    });
    it('does not change the theme: buildThemeCss output is independent of it', () => {
        const before = buildThemeCss(full);
        buildDownloadCss(full, 50);
        expect(buildThemeCss(full)).toBe(before);
        expect(buildThemeCss(full, { restyle: true })).toContain('.rt_PlayBtn [role="progressbar"] { display: none !important; }');
        expect(buildThemeCss(full)).not.toContain('progressbar');
        expect(buildThemeCss({ ...full, root: undefined }, { restyle: true })).not.toContain('progressbar');
    });
});
