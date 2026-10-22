import { sourcePillIcon, sourcePillLook } from '../../src/styles/sourcePill';
import { describe, expect, it } from 'vitest';
import { arrivalSelectors, buildAccentCss, buildArrivingCss, buildCleanCss, buildSteamEnterOffCss, steamFooterSelector, buildDownloadCss, buildLaunchCss, buildRingCss, buildThemeCss, buildUnifideckCss, launchTargets, ThemeClasses } from '../../src/styles/themeCss';
import { homeCanvas } from '../../src/home/scale';
import { SETTLE } from '../../src/home/openTwins';
import { cardMaxWidths, PAGE_LAYOUT, PAGE_SCRIM_LAYERS, PAGE_SCRIMS, pageDUnit, PAGE_TYPE, pageType, pillFocusScale, playRowSelector, ringBoost, STEAM_LEGEND_PX, twinTargets } from '../../src/styles/themeCss';

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
    it('a card that responds to a tap (#24) gives under the finger (restyled look; the plain one stays 1.1.1)', () => {
        const css = buildThemeCss(full, { restyle: true });
        expect(css).toContain('.gg-card-tap:active { transform: scale(0.98); }');
        expect(css).toMatch(/\.gg-card-tap\s*\{[^}]*transition:\s*transform/);
        // Steam's page panel lies over the cards (seen on the Deck: a tap landed on it): the hero is lifted above it
        // and takes no touches itself, only the tappable cards do, so nothing else of Steam's below is covered.
        expect(css).toContain('.gg-hero { z-index: 2; pointer-events: none; }');
        expect(css).toContain('.gg-hero .gg-card-tap { pointer-events: auto; }');
    });
    it('puts populated feedback below the cards with equal insets and no duplicate spacer', () => {
        const css = buildThemeCss(full);
        const band = 'calc(100vh - var(--gg-play-top) - var(--gg-row-h))';
        const gap = '.rt_Play ~ *:not(.ps_Cloud):not(.rt_Tabs):has(> .Panel:not(:empty)):has(~ .rt_Tabs)';
        const row = ruleFor(css, `${gap} {`);
        expect(row).toContain(`margin-top: ${band} !important`);
        expect(row).toContain('padding: calc(var(--gg-side) / 2) !important');
        const card = ruleFor(css, `${gap} > .Panel {`);
        expect(card).toContain('margin: 0');
        expect(card).toContain('rgba(12, 16, 22, 0.38)');
        expect(card).toContain('border-radius: calc(16 * var(--gg-d, 1))');
        expect(ruleFor(css, `${gap} ~ *:not(.ps_Cloud):not(.rt_Tabs):has(> .Panel:not(:empty)):has(~ .rt_Tabs) {`)).toContain('margin-top: 0');
        expect(ruleFor(css, `${gap} ~ .rt_Tabs {`)).toContain('margin-top: 0');
        // No such row: the tabs still clear the band themselves.
        expect(ruleFor(css, '.rt_Tabs {')).toContain(`margin-top: ${band}`);
    });
    it('does not emit that clearance when the cloud class is unknown', () => {
        const css = buildThemeCss({ ...full, play: { ...full.play, CloudStatusRow: undefined } });
        expect(css).not.toContain('.rt_Play ~ *');
        expect(ruleFor(css, '.rt_Tabs {')).toContain('margin-top: calc(100vh - var(--gg-play-top) - var(--gg-row-h))');
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
        expect(ruleFor(css, ':where(html:not([data-gg-mouse])) .rt_PlayBtn [role="button"].gpfocus {')).toContain('background:');
        expect(ruleFor(css, ':where(html:not([data-gg-mouse])) .ps_Menu.gpfocus {')).toContain('background: #ffffff');
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

describe('buildUnifideckCss (a Unifideck game\u2019s page)', () => {
    it('moves Unifideck\u2019s Play row onto the art where Steam\u2019s Play row sits, scoped to Unifideck\u2019s page class', () => {
        const css = buildUnifideckCss(full);
        expect(css).toMatch(/\.ad_Inner\.unifideck-hide-native-play > div:has\(\.unifideck-play-btn, \.unifideck-install-btn, \.unifideck-resume-btn, \.unifideck-update-btn\) \{[^}]*position: absolute !important;[^}]*top: var\(--gg-play-top\) !important;[^}]*background: transparent !important;/);
        // Every rule is under Unifideck's marker, so no other page is touched.
        for (const line of css.split('\n').filter((l) => l.includes('{'))) expect(line).toContain('.unifideck-hide-native-play');
    });
    it('makes its primary buttons our accent pill, focus included (over Unifideck\u2019s own focus colours)', () => {
        const css = buildUnifideckCss(full);
        expect(css).toMatch(/\.unifideck-hide-native-play \.unifideck-install-btn[^{]*\{[^}]*width: var\(--gg-play-w\) !important;[^}]*border-radius: 999px !important;[^}]*background: var\(--gg-accent\) !important;/);
        expect(css).toContain('.unifideck-hide-native-play .unifideck-play-btn.gpfocus');
        expect(css).not.toContain('.unifideck-cancel-btn');
        expect(css).not.toContain('.unifideck-stop-btn');
    });
    it("Unifideck's main button reads as Home's pill and Steam's: its word as written, not in capitals (Unifideck's own style upper-cases it)", () => {
        const css = buildUnifideckCss(full, { restyle: true });
        expect(css).toMatch(/\.unifideck-install-btn[^{]*\{[^}]*text-transform: none !important/);
        expect(css).toMatch(/\.unifideck-play-btn[^{]*\{[^}]*text-transform: none !important/);
        // Laid out as Home's pill and Steam's: glyph and word from the left, at the page pill's inset, glyph size and gap.
        expect(css).toMatch(/\.unifideck-install-btn[^{]*\{[^}]*justify-content: flex-start !important/);
        // Its cloud button's in-sync check badge at Unifideck's proportion to the 24 glyph (our circles' rule would size it 24).
        expect(css).toContain('.unifideck-icon-btn svg.unifideck-cloud-badge { width: calc(13 * var(--gg-d)) !important; height: calc(13 * var(--gg-d)) !important; }');
        // Unifideck's inline 0.05em letter spacing drew its word wider than Home's and Steam's ("Play" stepped at the open).
        expect(css).toMatch(/\.unifideck-play-btn[^{]*\{[^}]*letter-spacing: normal !important/);
        // Unifideck's own 8 px flex gap would add to the glyph's gap (its word sat 14 px further right than Home's).
        expect(css).toMatch(/\.unifideck-install-btn[^{]*\{[^}]*gap: 0 !important/);
        expect(css).toContain(`padding: 0 calc(${PAGE_LAYOUT.pill.padX} * var(--gg-d)) !important`);
        expect(css).toMatch(new RegExp(`\\.unifideck-install-btn svg[^{]*\\{[^}]*width: calc\\(${PAGE_LAYOUT.pill.icon} \\* var\\(--gg-d\\)\\)`));
    });
    it('Spotlight Home\u2019s look adds the handoff type, white as everywhere, and focuses it as Home\u2019s Play (ring, glow, scale)', () => {
        const css = buildUnifideckCss(full, { restyle: true });
        expect(buildUnifideckCss(full)).not.toContain('#0b0d10');
        expect(css).not.toContain('#0b0d10');
        expect(css).toMatch(/\.unifideck-hide-native-play \.unifideck-play-btn[^{]*\{[^}]*color: #ffffff !important;/);
        const pf = pillFocusScale(PAGE_LAYOUT.playW, PAGE_LAYOUT.icon);
        expect(css).toMatch(new RegExp(`\\.unifideck-play-btn\\.gpfocus[^{]*\\{[^}]*transform: scale\\(${pf.x}, ${pf.y}\\) !important;`));
    });
    it('with Spotlight Home\u2019s look its row has Steam\u2019s padding (none above, 36 below), so the pill is level with Steam\u2019s', () => {
        const rowRule = /:has\([^)]*\) \{[^}]*padding-top: 0 !important; padding-bottom: [^;]+ !important;/;
        expect(buildUnifideckCss(full, { restyle: true })).toMatch(rowRule);
        expect(buildUnifideckCss(full)).not.toMatch(/padding-top: 0 !important/);
    });
    it('puts the cloud-save button after controller and settings (the row with four buttons only), extras last', () => {
        const css = buildUnifideckCss(full);
        expect(css).toMatch(/\.unifideck-hide-native-play [^{]*:has\(> :nth-child\(4\)\) > :first-child \{ order: 3 !important; \}/);
        expect(css).toMatch(/:has\(> :nth-child\(4\)\) > :nth-child\(n\+4\) \{ order: 4 !important; \}/);
    });
    it('hides Unifideck\u2019s own meta items (the class-less div after its primary button) only with our page on', () => {
        expect(buildUnifideckCss(full)).not.toContain('display: none');
        for (const css of [buildUnifideckCss(full, { restyle: true }), buildUnifideckCss({ ...full, details: undefined }, { restyle: true })]) {
            const line = css.split('\n').find((l) => l.includes('display: none'));
            expect(line).toMatch(/^\.unifideck-hide-native-play :is\(\.unifideck-play-btn, \.unifideck-install-btn, \.unifideck-resume-btn, \.unifideck-update-btn\) \+ div:not\(\[class\]\) \{ display: none !important; \}$/);
            // Not the buttons, the round buttons or the download UI.
            expect(line).not.toMatch(/cancel|stop|button/i);
            expect(css.split('\n').filter((l) => l.includes('display: none'))).toHaveLength(1);
        }
    });
    it('nothing without the full-screen layout (the page is stacked then, Unifideck\u2019s row already in place)', () => {
        expect(buildUnifideckCss({ ...full, root: { ...full.root, AppDetailsContainer: undefined } })).toBe('');
        expect(buildUnifideckCss({ ...full, details: undefined })).toBe('');
    });
});

describe('buildCleanCss (the Clean look)', () => {
    it('moves the Play row to the bottom and puts our block on it, letting clicks through', () => {
        const css = buildCleanCss(full);
        expect(css).toContain(':root { --gg-play-top: calc(100vh - calc(96 * var(--gg-d)) - max(calc(36 * var(--gg-d)), calc(61px - calc(36 * var(--gg-d))))); }');
        expect(css).toMatch(/\.ad_Inner > \.gg-hero \{[^}]*top: var\(--gg-play-top\) !important;[^}]*pointer-events: none;/);
    });
    it('hides the description and HowLongToBeat cards; the info card goes right, the store pill above the row, the title just above it', () => {
        const css = buildCleanCss(full);
        expect(css).toContain('.gg-cards { display: none !important; }');
        expect(css).toMatch(/\.gg-clean-info \{[^}]*position: absolute; right: 0;[^}]*border-radius:/);
        expect(css).toMatch(/\.gg-pill \{ top: auto; bottom: calc\(100% \+ /);
        expect(css).toMatch(/\.ad_Inner > \.gg-titleblock \{[^}]*top: calc\(var\(--gg-play-top\) - [^}]*transform: translateY\(-100%\)/);
    });
    it('nothing without the full-screen layout, so the page keeps its cards', () => {
        expect(buildCleanCss({ ...full, details: undefined })).toBe('');
        expect(buildCleanCss({ ...full, root: { ...full.root, AppDetailsContainer: undefined } })).toBe('');
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
          :where(html:not([data-gg-mouse])) .rt_PlayBtn [role="button"].gpfocus { background: rgba(255, 255, 255, 0.28) !important; }
          .rt_Buttons { margin-left: 0 !important; gap: var(--gg-gap) !important; }
          .rt_Buttons > * { margin: 0 !important; padding: 0 !important; }
          .ps_Menu { width: var(--gg-icon) !important; height: var(--gg-icon) !important; min-width: 0 !important; margin: 0 !important; box-sizing: border-box !important; border-radius: 50% !important;
                      background: rgba(255, 255, 255, 0.08) !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; }
          :where(html:not([data-gg-mouse])) .ps_Menu.gpfocus { background: #ffffff !important; color: #0b0f14 !important; }
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
          .rt_Play ~ *:not(.ps_Cloud):not(.rt_Tabs):has(> .Panel:not(:empty)):has(~ .rt_Tabs) { margin-top: calc(100vh - var(--gg-play-top) - var(--gg-row-h)) !important; padding: calc(var(--gg-side) / 2) !important; box-sizing: border-box !important; }
          .rt_Play ~ *:not(.ps_Cloud):not(.rt_Tabs):has(> .Panel:not(:empty)):has(~ .rt_Tabs) > .Panel { margin: 0 !important; width: auto !important; max-width: none !important; box-sizing: border-box !important; background: rgba(12, 16, 22, 0.38) !important; border: 1px solid rgba(255, 255, 255, 0.12) !important; border-radius: calc(16 * var(--gg-d, 1)) !important; backdrop-filter: blur(calc(16 * var(--gg-d, 1))) !important; }
          .rt_Play ~ *:not(.ps_Cloud):not(.rt_Tabs):has(> .Panel:not(:empty)):has(~ .rt_Tabs) ~ *:not(.ps_Cloud):not(.rt_Tabs):has(> .Panel:not(:empty)):has(~ .rt_Tabs) { margin-top: 0 !important; }
          .rt_Play ~ *:not(.ps_Cloud):not(.rt_Tabs):has(> .Panel:not(:empty)):has(~ .rt_Tabs) ~ .rt_Tabs { margin-top: 0 !important; }
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

    it('preferred version: the family pill replaces the native link without shifting cloud', () => {
        const withShared = buildThemeCss({ ...steam, shared: { SharedLibrary: 'sl_Shared', Row: 'sl_Row' } }, { restyle: true });
        expect(withShared).toContain('.sl_Shared { display: none !important;');
        expect(withShared).toContain('overflow: hidden !important;');
        expect(withShared).toContain('.sl_Shared a[role="button"] { display: none !important; }');
        expect(withShared).not.toContain('(var(--gg-buttons, 2) + 1)');
        expect(withShared).toContain('.gg-copy-plus');
        expect(restyled).not.toContain('sl_Shared');
        expect(restyled).toMatch(/\.gg-family \{ position: absolute; right: calc\(100% \+ calc\(10 \* var\(--gg-d\)\)\); top: 50%; transform: translateY\(-50%\);/);
        expect(rulesFor(restyled, '.gg-family')).toContain(sourcePillLook((n) => `calc(${n} * var(--gg-d))`));
    });
    it('hides HLTB for Deck’s box, which lands before Steam’s overview and pushes the Play row onto the cards (#67)', () => {
        expect(ruleFor(restyled, '.ad_Inner > #hltb-for-deck {')).toContain('display: none !important');
        // Only with the restyled layout: the stock page keeps HLTB for Deck's row, and so does a degraded layout.
        expect(buildThemeCss(steam)).not.toContain('hltb-for-deck');
        expect(buildThemeCss({ ...steam, root: { ...steam.root, AppDetailsContainer: undefined } }, { restyle: true })).not.toContain('hltb-for-deck');
    });
    it('the logo option: the same 560 x 180 box as Home, in the page\'s scale unit', () => {
        expect(restyled).toContain('.gg-logo { display: block; width: auto; height: auto; max-width: calc(560 * var(--gg-d)); max-height: calc(180 * var(--gg-d));');
    });

    it('changes nothing without the option, or with it off', () => {
        expect(buildThemeCss(steam, {})).toBe(buildThemeCss(steam));
        expect(buildThemeCss(steam, { restyle: false })).toBe(buildThemeCss(steam));
        expect(buildThemeCss(full, { restyle: false })).toBe(buildThemeCss(full));
    });
    it('only appends rules after the 1.1.1 output', () => {
        expect(restyled.startsWith(`${buildThemeCss(steam)}\n`)).toBe(true);
    });
    it('restyle: the cloud status is the same dark circle as the others, with the re-tuned state colours and Home’s focus ring', () => {
        const cloud = rulesFor(restyled, '.ps_Cloud');
        expect(cloud).toContain('background: rgba(12, 16, 22, 0.4) !important;');
        expect(cloud).toContain('border: 1px solid rgba(255, 255, 255, 0.18) !important;');
        expect(cloud).toContain('backdrop-filter: blur(calc(12 * var(--gg-d))) !important;');
        expect(cloud).toContain('--gg-ok: #5cf2b4; --gg-warn: #ffd84d; --gg-bad: #ff8585; --gg-off: #c4c9d1;');
        expect(rulesFor(restyled, '.ps_Cloud svg')).toContain('drop-shadow');
        expect(rulesFor(restyled, ':where(html:not([data-gg-mouse])) .ps_Cloud.gpfocus')).toContain('var(--glance-accent) !important; transform: scale(1.04) !important;');
        // The menu circles' fill is the same.
        expect(rulesFor(restyled, '.ps_Menu')).toContain('background: rgba(12, 16, 22, 0.4) !important;');
        // Not in the 1.1.1 output.
        expect(buildThemeCss(steam)).not.toContain('#5cf2b4');
    });
    it("the glass rings are Home's, 1 d unit (1 canvas px there), not 1 px: a 1 px border is drawn on 2 whole device px at the Ally's 2.32 and read brighter than Home's as the open transition handed over", () => {
        expect(rulesFor(restyled, '.ps_Menu')).toContain('border-width: calc(1 * var(--gg-d)) !important;');
        expect(rulesFor(restyled, '.gg-card')).toContain('border-width: calc(1 * var(--gg-d));');
        expect(buildCleanCss(full)).toMatch(/\.gg-clean-info \{[^}]*border: calc\(1 \* var\(--gg-d\)\) solid /);
        // The cloud keeps its 1 px: placed at a fractional position, it is drawn soft like Home's already (Michael: no change there).
        expect(rulesFor(restyled, '.ps_Cloud')).toContain('border: 1px solid rgba(255, 255, 255, 0.18) !important;');
    });
    it("the glass rings are as bright as Home's: their colour is Home's times --gg-ring (ringBoost), 1 when not set", () => {
        expect(rulesFor(restyled, '.ps_Menu')).toContain('border-color: rgba(255, 255, 255, calc(0.18 * var(--gg-ring, 1))) !important;');
        expect(rulesFor(restyled, '.gg-card')).toContain('border-color: rgba(255, 255, 255, calc(0.12 * var(--gg-ring, 1)));');
        expect(buildCleanCss(full)).toMatch(/\.gg-clean-info \{[^}]*border: calc\(1 \* var\(--gg-d\)\) solid rgba\(255, 255, 255, calc\(0\.12 \* var\(--gg-ring, 1\)\)\)/);
        expect(buildRingCss(1.15)).toBe(':root { --gg-ring: 1.15; }');
    });
    it("everything clickable takes the hover ring under a mouse (in d units), never when focused, ring only but the cards", () => {
        const ring = 'box-shadow: 0 0 0 calc(2 * var(--gg-d)) rgba(255,255,255,.45) !important;';
        const pill = rulesFor(restyled, 'html[data-gg-mouse] .rt_PlayBtn > div:has(> [role="button"]):hover');
        expect(pill).toContain(ring);
        expect(pill).not.toContain('transform');
        const circle = rulesFor(restyled, 'html[data-gg-mouse] .ps_Menu:hover');
        expect(circle).toContain(ring);
        expect(circle).not.toContain('transform');
        expect(rulesFor(restyled, 'html[data-gg-mouse] .ps_Cloud:hover')).toContain(ring);
        // In mouse mode the focus looks are off (Steam puts its focus back on a clicked button), at no weight: every focus
        // rule of the pill, the circles and the cloud sits behind :where(html:not([data-gg-mouse])).
        const gate = ':where(html:not([data-gg-mouse]))';
        const focusRules = (restyled.match(/[^{}]*\{[^}]*\}/g) ?? []).map((r) => r.slice(0, r.indexOf('{')).trim())
            .filter((s) => /\.(rt_PlayBtn|ps_Menu|ps_Cloud)/.test(s) && /(\.gpfocus|:focus)(?![\w-])/.test(s) && !s.split(gate).join('').includes(':not(') && !s.startsWith('html[data-gg-mouse]'));
        expect(focusRules.length).toBeGreaterThanOrEqual(8);
        for (const sel of focusRules) for (const part of sel.split(/,\s*(?=:where)/)) expect(part.trim(), sel).toMatch(/^:where\(html:not\(\[data-gg-mouse\]\)\)/);
        expect(rulesFor(restyled, `${gate} .ps_Menu.gpfocus`)).toContain('var(--glance-accent) !important; transform: scale(1.04) !important;');
        // Steam's own focus rule darkens a focused circle's icon (meant for its white focus look): in mouse mode it stays
        // the white of a circle at rest, or it showed black on the dark glass after coming back to the page.
        // (Steam darkens the icon's svg, whose paths fill with currentColor: the button and its svg both.)
        expect(rulesFor(restyled, 'html[data-gg-mouse] .ps_Menu:is(.gpfocus, :focus)')).toContain('color: #ffffff !important;');
        expect(rulesFor(restyled, 'html[data-gg-mouse] .ps_Menu:is(.gpfocus, :focus) svg')).toContain('color: #ffffff !important;');
        // And Steam's own focus fill on Play and its arrow (blue, green for some games: our transparent focus rules hid it).
        const play = rulesFor(restyled, 'html[data-gg-mouse] .rt_PlayBtn [role="button"]:is(.gpfocus, :focus)');
        expect(play).toContain('background: transparent !important;');
        expect(play).toContain('color: #ffffff !important;');
        // The cards (info, HowLongToBeat) lift as Home's feed cards do; a press still gives.
        const card = rulesFor(restyled, 'html[data-gg-mouse] .gg-card-tap:hover');
        expect(card).toContain(ring);
        expect(card).toContain('transform: translateY(calc(-2 * var(--gg-d)))');
        expect(rulesFor(restyled, 'html[data-gg-mouse] .gg-card-tap:hover:active')).toContain('scale(0.98)');
        // Not in the 1.1.1 output, and never without mouse mode.
        expect(buildThemeCss(steam)).not.toContain(':hover');
        for (const sel of restyled.match(/[^{}]*:hover[^{]*\{/g) ?? []) expect(sel).toContain('html[data-gg-mouse]');
    });
    it("a card the controller selected looks like Home's focused feed card (accent ring and glow, a lift), not in mouse mode", () => {
        const gate = ':where(html:not([data-gg-mouse]))';
        const look = rulesFor(restyled, `${gate} .gg-card-nav.gg-card-focus, ${gate} .gg-card-nav:focus`);
        expect(look).toContain('box-shadow: 0 0 0 calc(1 * var(--gg-d)) var(--glance-accent), 0 calc(16 * var(--gg-d)) calc(40 * var(--gg-d)) calc(-1 * calc(12 * var(--gg-d))) var(--glance-accent) !important;');
        expect(look).toContain('transform: translateY(calc(-4 * var(--gg-d)))');
        expect(buildThemeCss(steam)).not.toContain('gg-card-focus');
    });
    it('hides the temporary launch-option tip and marker only in the restyled page', () => {
        const classes = { ...full, play: { ...full.play, LaunchOptionCallout: 'ps_LaunchTip', LaunchOptionCalloutMessageContainer: 'ps_LaunchMessage' } };
        const css = buildThemeCss(classes, { restyle: true });
        expect(ruleFor(css, '.ps_LaunchTip {')).toContain('display: none !important');
        expect(ruleFor(css, '.ps_LaunchMessage {')).toContain('display: none !important');
        expect(buildThemeCss(classes)).not.toContain('.ps_LaunchMessage');
    });
    it("playRowSelector: Steam's Play row (the pill and its arrow, the circles, the cloud); null without its classes", () => {
        expect(playRowSelector(full)).toBe('.rt_PlayBtn, .ps_Menu, .ps_Cloud, .gg-copy-pill, .gg-store-choice');
        expect(playRowSelector({ ...full, root: {}, play: {} })).toBeNull();
    });
    it("PAGE_TYPE drives the page's own text rules", () => {
        const d = (n: number) => `calc(${n} * var(--gg-d))`;
        expect(PAGE_TYPE.title).toEqual({ size: 64, weight: 800, letterSpacing: '-0.02em', lineHeight: '1', upper: false });
        expect(PAGE_TYPE.eyebrow).toEqual({ size: 12, weight: 700, letterSpacing: '0.2em', lineHeight: '1.2', upper: true });
        expect(PAGE_TYPE.label).toMatchObject({ size: 11, weight: 700, letterSpacing: '0.18em', upper: true });
        expect(PAGE_TYPE.value).toMatchObject({ size: 30, weight: 700, lineHeight: '1.2', upper: false });
        expect(PAGE_TYPE.cleanValue).toMatchObject({ size: PAGE_LAYOUT.cleanInfo.value, weight: 700, lineHeight: '1.2' });
        expect(PAGE_TYPE.playLabel).toMatchObject({ size: 22, weight: 700, upper: false });
        // Each rule carries its role's declarations (the play label's are !important there).
        expect(restyled).toContain(`.gg-eyebrow { ${pageType('eyebrow', d)}`);
        expect(restyled).toContain(`.gg-title { margin: calc(-1 * ${d(16)}); padding: ${d(16)}; ${pageType('title', d)}`);
        expect(restyled).toContain(`.gg-label { ${pageType('label', d)}`);
        expect(restyled).toContain(`.gg-value { ${pageType('value', d)}`);
        expect(buildCleanCss(full)).toContain(`.gg-clean-info .gg-value { ${pageType('cleanValue', d)}`);
        expect(rulesFor(restyled, '.rt_PlayBtn [role="button"] > div')).toContain(pageType('playLabel', d, true));
        // Only what the page sets itself: nothing it inherits from Steam is declared.
        expect(pageType('playLabel', d)).toBe('font-size: calc(22 * var(--gg-d)); font-weight: 700;');
    });
    it("twinTargets: each twin's text on the page, in each look", () => {
        const sp = twinTargets(full, 'spotlight');
        expect(sp.title).toBe('.gg-title');
        expect(sp.eyebrow).toBe('.gg-eyebrow');
        expect(sp.play).toBe('.rt_PlayBtn [role="button"] > div');
        expect(sp['label-played']).toBe('.gg-hero [data-stat="played"] .gg-label');
        expect(sp['value-hltb']).toBe('.gg-hero [data-stat="hltb"] .gg-value');
        expect(twinTargets(full, 'clean')['value-size']).toBe('.gg-clean-info [data-stat="size"] .gg-value');
        expect(twinTargets({ ...full, root: {} }, 'spotlight').play).toBeUndefined();
        // The extras layer's text settles too (openTwins.SETTLE names): the HowLongToBeat card, the description, the columns.
        expect(sp[SETTLE.hltbTitle]).toBe('.gg-hltb > .gg-label');
        expect(sp[SETTLE.label('mainExtras')]).toBe('.gg-hltb [data-stat="mainExtras"] .gg-label');
        expect(sp[SETTLE.value('completionist')]).toBe('.gg-hltb [data-stat="completionist"] .gg-value');
        expect(sp[SETTLE.caption]).toBe('.gg-hltb .gg-caption');
        expect(sp[SETTLE.desc]).toBe('.gg-hero .gg-desc');
        expect(sp[SETTLE.statValue('played')]).toBe('.gg-hero [data-stat="played"] .gg-value');
        expect(twinTargets(full, 'clean')[SETTLE.statValue('size')]).toBe('.gg-clean-info [data-stat="size"] .gg-value');
    });
    it("the cloud's icon is centred in its circle, as on Home: Steam's icon box is as tall as the icon", () => {
        // (Its box kept the 1.1.1 theme's 16 u height under a 26 d unit icon, which hung out of its bottom: 1.65 px low docked.)
        expect(rulesFor(restyled, '.ps_CloudIcon')).toContain(`height: calc(${PAGE_LAYOUT.cloudIcon} * var(--gg-d)) !important;`);
    });
    it("ringBoost: Home's ring as drawn on screen over the page's, both on whole device px", () => {
        // The Ally handheld (2.32, 828x466: d 0.575): Home's 1 canvas px is 2 device px scaled to 1.15; the page's 1 d unit is 1.
        const d = pageDUnit(828.0172, 466.3793);
        expect(ringBoost(2.32, 828.0172, 466.3793)).toBeCloseTo(2 * d, 3);
        // The Deck (1, 1280x800: d 1): both 1 device px.
        expect(ringBoost(1, 1280, 800)).toBe(1);
        // A 1080p screen at 1 (d 1.333): Home's 1.333 device px, soft, against the page's 1.
        expect(ringBoost(1, 1920, 1080)).toBeCloseTo(pageDUnit(1920, 1080), 3);
        // Unknown ratio: no change.
        expect(ringBoost(0, 1280, 800)).toBe(1);
    });
    it('Play: white words and glyph on the accent pill, as on Home (Steam drew the glyph dark and the words white)', () => {
        expect(rulesFor(restyled, '.rt_PlayBtn [role="button"]')).toContain('color: #ffffff !important');
        expect(rulesFor(restyled, '.rt_PlayBtn [role="button"] > div')).toContain('color: #ffffff !important');
        expect(restyled).not.toContain('#0b0d10');
    });
    it("Play has no green sheen: Steam's focus shine (a green gradient on its ::after) is hidden on the accent pill", () => {
        expect(rulesFor(restyled, '.rt_PlayBtn [role="button"]::after')).toContain('display: none !important');
    });
    it("Play focused as Home's: the fill stays the accent (no lighter overlay), a white ring and accent glow, scaled as Home's", () => {
        expect(rulesFor(restyled, ':where(html:not([data-gg-mouse])) .rt_PlayBtn [role="button"].gpfocus')).toContain('background: transparent !important');
        const ring = rulesFor(restyled, ':where(html:not([data-gg-mouse])) .rt_PlayBtn > div:has(> [role="button"].gpfocus)');
        expect(ring).toContain('rgba(255, 255, 255, 0.9)');
        const pf = pillFocusScale(PAGE_LAYOUT.playW, PAGE_LAYOUT.icon);
        expect(ring).toContain(`transform: scale(${pf.x}, ${pf.y}) !important`);
        expect(rulesFor(restyled, '.rt_PlayBtn > div:has(> [role="button"])')).toContain('transition: transform 250ms, box-shadow 250ms !important');
    });
    it('the glass blurs the art: the round buttons and the cards join Steam\'s 3D scene, the hero art\'s (a flat container cut their blur off)', () => {
        // Steam lays the page out in a preserve-3d scene with the hero art in it; a backdrop-filter inside a flat container
        // sees only that container (probed on the Ally: controller and settings showed the art sharp, the cloud, a direct
        // child of the scene, blurred it). So every container from the play section down to the round buttons, and the
        // hero and its cards, keep the scene going.
        expect(rulesFor(restyled, '.rt_Play:has(.ps_Menu), .rt_Play :has(.ps_Menu)')).toContain('transform-style: preserve-3d !important');
        expect(rulesFor(restyled, '.gg-hero, .gg-cards')).toContain('transform-style: preserve-3d');
    });
    it('the page counts as arrived with Play under DOM focus too (opened by a tap or a click: no gpfocus, the hand-over waited out its timeout)', () => {
        const focus = arrivalSelectors(steam).focus ?? '';
        expect(focus.split(', ')).toHaveLength(2);
        expect(focus).toMatch(/ \.gpfocus, /);
        expect(focus).toMatch(/ :focus$/);
    });
    it('focus looks follow DOM focus too: a page opened by a tap or a click has Play focused without Steam\'s gpfocus', () => {
        // The open transition lands on a focused Play (openMotion): without this the pill shrank and lost its ring at the hand-over.
        const ring = rulesFor(restyled, ':where(html:not([data-gg-mouse])) .rt_PlayBtn > div:has(> [role="button"]:focus)');
        expect(ring).toContain('rgba(255, 255, 255, 0.9)');
        const pf = pillFocusScale(PAGE_LAYOUT.playW, PAGE_LAYOUT.icon);
        expect(ring).toContain(`transform: scale(${pf.x}, ${pf.y}) !important`);
        expect(ring).toContain('var(--glance-accent)');
        expect(rulesFor(restyled, ':where(html:not([data-gg-mouse])) .rt_PlayBtn [role="button"]:focus')).toContain('background: transparent !important');
        expect(rulesFor(restyled, ':where(html:not([data-gg-mouse])) .rt_PlayBtn [role="button"] + [role="button"]:focus')).toContain('background: rgba(255, 255, 255, 0.28) !important');
        expect(rulesFor(restyled, ':where(html:not([data-gg-mouse])) .ps_Menu:focus')).toContain('var(--glance-accent) !important; transform: scale(1.04) !important;');
        expect(rulesFor(restyled, ':where(html:not([data-gg-mouse])) .ps_Cloud:focus')).toContain('var(--glance-accent) !important; transform: scale(1.04) !important;');
    });
    it('the "Play from" arrow focused: the pill shows its focus and the arrow\'s segment is tinted, as on Home (Michael: Neva)', () => {
        expect(rulesFor(restyled, ':where(html:not([data-gg-mouse])) .rt_PlayBtn [role="button"] + [role="button"].gpfocus')).toContain('background: rgba(255, 255, 255, 0.28) !important');
    });
    it('buildThemeCss with restyle adds the eyebrow, title and accent rules', () => {
        // accent: one per-game colour, animated over 500 ms, on Play, the HLTB goal value and bar
        expect(restyled).toContain("@property --glance-accent { syntax: '<color>'; inherits: true; initial-value: #5fd1ae; }");
        expect(rulesFor(restyled, '.ad_Inner')).toContain('--gg-accent: var(--glance-accent);');
        expect(rulesFor(restyled, '.ad_Inner')).toContain('transition: --glance-accent 500ms ease;');
        expect(rulesFor(restyled, ':where(html:not([data-gg-mouse])) .rt_PlayBtn > div:has(> [role="button"].gpfocus)')).toContain('var(--glance-accent)');
        // handoff px scaled like Home: its 1440 canvas on 16:9, its 1280 canvas on 16:10
        expect(restyled).toContain(':root { --gg-d: min(calc(100vw / 1440), calc(100vh / 810)); }');
        expect(restyled).toContain('@media (max-aspect-ratio: 17/10) { :root { --gg-d: min(calc(100vw / 1280), calc(100vh / 800)); } }');
        // eyebrow and 64px/800 title
        expect(rulesFor(restyled, '.gg-eyebrow')).toContain('color: var(--glance-accent-text)');
        expect(rulesFor(restyled, '.gg-eyebrow')).toContain('text-transform: uppercase');
        expect(rulesFor(restyled, '.gg-eyebrow')).toContain('letter-spacing: 0.2em');
        const title = rulesFor(restyled, '.gg-title');
        expect(title).toContain('font-size: calc(64 * var(--gg-d))');
        expect(title).toContain('font-weight: 800');
        expect(title).toContain('-webkit-line-clamp: 3');
        // placed where the logo was (top 120 of 810), the logo and Steam's text title hidden in place
        expect(rulesFor(restyled, '.ad_Inner > .gg-titleblock')).toContain('position: absolute');
        expect(rulesFor(restyled, '.ad_Inner > .gg-titleblock')).toContain('top: calc(var(--gg-play-top) - calc(36 * var(--gg-d)))');
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
        // Each card at most its own width (cards.infoW / hltbW), sized to its content rather than the row: HowLongToBeat fits
        // three 3-digit times, the info card a little wider. On a screen with room to spare the art shows between them.
        const { infoW, hltbW, padX } = PAGE_LAYOUT.cards;
        expect([infoW, hltbW]).toEqual([540, 470]);
        expect(cardMaxWidths()).toEqual([infoW, hltbW]);
        expect(rulesFor(restyled, '.gg-cards')).not.toContain('max-width');
        // The cards are content-box: the cap is the outer width less the padding (2 x padX) and the 1 px borders.
        const content = (outer: number) => `max-width: calc(${outer - 2 * padX - 2} * var(--gg-d))`;
        expect(rulesFor(restyled, '.gg-card')).toContain(content(infoW));
        const hltbRules = rulesFor(restyled, '.gg-card.gg-hltb');
        expect(hltbRules).toContain(content(hltbW));
        // Wider than 9:5 (21:9, 32:9) the description card is as wide as HowLongToBeat.
        expect(PAGE_LAYOUT.cards.equalFromAspect).toBe(1.8);
        expect(cardMaxWidths(PAGE_LAYOUT.cards.equalFromAspect)).toEqual([hltbW, hltbW]);
        expect(restyled).toContain(`@media (min-aspect-ratio: 9/5) { .gg-card { ${content(hltbW)}; } }`);
        // Aligned to the row's right end at its full (capped) width, not shrunk to its content. Content-box like the cap:
        // a plain 100% added the padding and borders, spilling 2 x padX + 2 px left over the info card (issue #53, the Deck).
        expect(hltbRules).toContain('justify-self: end');
        expect(hltbRules).toContain(`width: calc(100% - calc(${2 * padX + 2} * var(--gg-d)))`);
        expect(hltbRules).not.toContain('width: 100%;');
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
    it('uses no fixed pixel sizes except hairline borders and Steam\'s own button legend', () => {
        // (A media query's viewport thresholds are conditions, not sizes. Steam's legend is a fixed 41 css px at every screen size.)
        const sizes = restyled.replace(/@media[^{]*\{/g, '{');
        const fixed = [...sizes.matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => m[1]).filter((n) => !['0', '1', '999', String(STEAM_LEGEND_PX)].includes(n));
        expect(fixed).toEqual([]);
    });
    it('a TV sets the Play row and cards from the bottom: the cards (three description lines) end 24 above Steam\'s legend; the handheld keeps its place', () => {
        expect(STEAM_LEGEND_PX).toBe(41);
        expect(restyled).toContain(':root { --gg-play-top: calc(100vh - calc(386 * var(--gg-d))); --gg-row-h: calc(96 * var(--gg-d)); }');
        // 298 = the row (96) + the cards (178, three description lines) + the gap (24, the TV's side inset).
        expect(restyled).toContain('@media (min-width: 1408px) and (min-height: 793px) { :root { --gg-play-top: calc(100vh - 41px - calc(298 * var(--gg-d))); } }');
        expect(restyled.indexOf('--gg-play-top: calc(100vh - 41px')).toBeGreaterThan(restyled.indexOf('--gg-play-top: calc(100vh - calc(386'));
    });
    it('the title block sits on the Play row on every screen: its bottom 36 above the row (the row-to-cards gap), so it grows upward', () => {
        expect(restyled).toMatch(/\.ad_Inner > \.gg-titleblock \{[^}]*top: calc\(var\(--gg-play-top\) - calc\(36 \* var\(--gg-d\)\)\) !important;\s+transform: translateY\(-100%\) !important/);
        expect(restyled).not.toContain('top: calc(120 * var(--gg-d))');
        expect(restyled).not.toMatch(/@media[^{]*\{ \.\w+ > \.gg-titleblock/);
    });
    it('a TV takes the tighter side inset (24 of the 1440 canvas, the status dot\'s centre line); the handheld and the Deck keep 56', () => {
        expect(restyled).toMatch(/:root \{ --gg-side: calc\(56 \* var\(--gg-d\)\); \}/);
        expect(restyled).toMatch(/@media \(min-width: 1408px\) and \(min-height: 793px\) \{ :root \{ --gg-side: calc\(24 \* var\(--gg-d\)\); \} \}/);
        // the media query comes after the default, so on a TV it wins; the thresholds are screenScale's 1.7x the handheld's 828x466
        expect(restyled.indexOf('@media (min-width: 1408px)')).toBeGreaterThan(restyled.indexOf('--gg-side: calc(56 * var(--gg-d))'));
        expect(Math.ceil(828 * 1.7)).toBe(1408);
        expect(Math.ceil(466 * 1.7)).toBe(793);
    });
    it('restyle rules do nothing when their Steam classes are missing and never touch layout', () => {
        const extra = (classes: ThemeClasses) => buildThemeCss(classes, { restyle: true }).slice(buildThemeCss(classes).length).replace(/\.gg-native-store-switcher \{[^}]*\}/, '');

        // No Steam classes at all: only our own elements and variables, no broken selectors.
        const none = extra({ header: undefined, details: undefined, overview: undefined, root: undefined, play: undefined });
        expect(none).not.toContain('undefined');
        expect(none).not.toMatch(/(^|[\s,])\.(\s|\{|,)/m);
        expect(none.replace(/\.gg-native-store-switcher \{[^}]*\}/, '')).not.toContain('visibility: hidden');
        expect(none).not.toContain('::after');
        expect(none).not.toContain('--gg-side:');
        // (our own family pill is positioned inside our own store pill; nothing of Steam's is)
        expect(none.replace(/\.gg-family \{[^}]*\}/, '')).not.toContain('position: absolute');
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
        expect(extra({ ...steam, root: { ...steam.root, ActionButtonAndStatusPanel: undefined } })).not.toContain('[role="button"]');
        const noInner = extra({ ...steam, details: { ...steam.details, InnerContainer: undefined } });
        expect(noInner).not.toContain('transition: --glance-accent');
        expect(noInner).not.toContain('> .gg-title');
        // Without the full-screen layout the title block stays hidden (see below) and the logo stays.
        const stacked = extra(header({ TopCapsule: undefined }));
        expect(stacked).not.toContain('visibility: hidden');
        // (the Play pill's hidden sheen is not layout: it holds in any layout)
        expect(stacked.replace(/^.*\[role="button"\]::after \{[^}]*\}$/m, '')).not.toContain('::after');
        expect(stacked).not.toContain('> .gg-title');
        expect(stacked).toContain('.gg-title {');

        // (display: only Steam's download bar is hidden; object-position: the hero's crop, which moves the picture, not the box)
        // Never layout: on Steam's elements the restyle sets colours, shadows, the scrim, the accent and the
        // logo's visibility (its box stays), plus the Play row's side padding (the handoff's 56 px insets), and the focused
        // Play's scale (a transform: drawn bigger, nothing laid out again).
        const steamRules = [...extra(steam).matchAll(/^\s*([^{}\n]+)\{([^}]*)\}/gm)]
            .filter((m) => /\.(hd|ad|ov|rt|ps)_/.test(m[1]) && !/^\s*\.ad_Inner > \.gg-/.test(m[1]));
        expect(steamRules.length).toBeGreaterThan(0);
        for (const [, selector, body] of steamRules) {
            const props = body.split(';').map((d) => d.split(':')[0].trim()).filter(Boolean);
            for (const prop of props) {
                expect([selector, prop]).toEqual([selector, expect.stringMatching(/^(--gg-accent|--gg-play-top|--gg-row-h|--gg-ok|--gg-warn|--gg-bad|--gg-off|transition|color|background|border|border-width|border-color|filter|box-shadow|visibility|padding-left|padding-right|padding-top|padding-bottom|font-size|font-weight|width|height|margin-right|top|min-width|flex|padding|backdrop-filter|display|object-position|transform|transform-style)$/)]);
            }
        }
        // (100vh only in the Play row's anchor variable, which the 1.1.1 layout rules read: the default and the TV's, and in
        // the d unit's height limit, the shared scale rule with Home: home/scale.ts)
        // (z-index only on our own hero, lifted over Steam's page panel so the tappable cards get touches, #24)
        expect(extra(steam).replace(/--gg-play-top: [^;]*;/g, '').replace(/--gg-d: min\([^;]*\);/g, '').replace('.gg-hero { z-index: 2; pointer-events: none; }', '')).not.toMatch(/z-index|100vh/);
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

describe('the page layout constants', () => {
    it('pageDUnit follows --gg-d: a 1440 wide canvas on 16:9, 1280 on 16:10 and narrower', () => {
        expect(pageDUnit(1500, 844)).toBeCloseTo(1500 / 1440);
        expect(pageDUnit(1280, 800)).toBeCloseTo(1);
        expect(pageDUnit(828, 466)).toBeCloseTo(828 / 1440);
    });
    it('pageDUnit scales a screen wider than 16:9 by its height, as Home does (one rule keeps the open transition aligned)', () => {
        expect(pageDUnit(1500, 643)).toBeCloseTo(643 / 810);
        expect(pageDUnit(2560, 1080)).toBeCloseTo(1080 / 810);
        for (const [w, h] of [[1920, 1080], [1280, 800], [1500, 844], [1500, 643], [2560, 1080], [3440, 1440], [1024, 768]]) {
            expect(pageDUnit(w, h)).toBeCloseTo(homeCanvas(w, h).scale, 10);
        }
    });
    it('the restyled theme is built from them', () => {
        const css = buildThemeCss(full, { restyle: true });
        expect(css).toContain(`--gg-play-top: calc(100vh - calc(${PAGE_LAYOUT.playTop.spotlight} * var(--gg-d)))`);
        for (const layer of PAGE_SCRIM_LAYERS) expect(css).toContain(layer);
        expect(PAGE_SCRIMS).toBe(PAGE_SCRIM_LAYERS.join(', '));
    });
});

describe('the page arriving after the open transition', () => {
    const play = full.play as Record<string, string>;
    it("'parts' hides only what Home had no counterpart for (Spotlight)", () => {
        const css = buildArrivingCss(full, 'spotlight', 'parts');
        for (const sel of ['.gg-desc', '.gg-hltb > .gg-label', '.gg-hltb [data-stat="mainExtras"]', '.gg-hltb [data-stat="completionist"]', '.gg-caption', '.gg-muted', '.gg-hltb .gg-bar', '.gg-family', '[data-stat="size"]']) {
            expect(css, sel).toContain(sel);
        }
        // Home's cloud button moves into the page's: the page's own is there at once (it blinked when hidden).
        expect(css).not.toContain(`.${play.CloudStatusRow}`);
        expect(css).toContain('opacity: 0 !important');
        expect(css).not.toContain('.gg-titleblock');
    });
    it("'parts' on Clean: the size column, family pill, cloud and the bars", () => {
        const css = buildArrivingCss(full, 'clean', 'parts');
        for (const sel of ['[data-stat="size"]', '.gg-family', '.gg-clean-info .gg-bar']) expect(css, sel).toContain(sel);
        expect(css).not.toContain(`.${play.CloudStatusRow}`);
        expect(css).not.toContain('.gg-desc');
    });
    it("the page's cloud arrives with the new parts when Home showed none (its state was not known yet)", () => {
        for (const look of ['spotlight', 'clean'] as const) {
            expect(buildArrivingCss(full, look, 'parts', false, { cloud: true }), look).toContain(`.${play.CloudStatusRow}`);
            expect(buildArrivingCss(full, look, 'parts', true, { cloud: true }), look).toMatch(new RegExp(`\\.${play.CloudStatusRow}[^{]*\\{ opacity: 1`));
        }
    });
    it("Clean: only the bars Home did not bring arrive (Home's chip bars moved onto the others)", () => {
        const css = buildArrivingCss(full, 'clean', 'parts', false, { bars: ['achievements', 'hltb'] });
        expect(css).toContain('.gg-clean-info > [data-stat]:not([data-stat="achievements"]):not([data-stat="hltb"]) .gg-bar');
        expect(css).not.toContain('.gg-clean-info .gg-bar');
    });
    it("Steam's focus fade on Play is off while the page arrives (Home's copy shows Play focused; the page's lit up over 200 ms after the hand-over)", () => {
        const root = full.root as Record<string, string>;
        for (const mode of ['parts', 'all'] as const) {
            expect(buildArrivingCss(full, 'clean', mode), mode).toContain(`.${root.ActionButtonAndStatusPanel} [role="button"], .${root.ActionButtonAndStatusPanel} > div:has(> [role="button"]) { transition: none !important; }`);
        }
    });
    it("the page's glass arrives blurred, as Home's copy is: the arriving page leaves its blur alone", () => {
        for (const look of ['spotlight', 'clean'] as const) {
            for (const revealed of [false, true]) expect(buildArrivingCss(full, look, 'parts', revealed), look).not.toContain('backdrop-filter');
        }
    });
    it('Spotlight: the description and the HowLongToBeat card are there at once when Home drew them as it opened', () => {
        const hltbParts = ['.gg-hltb > .gg-label', '.gg-hltb [data-stat="hltb"] > .gg-label', '.gg-hltb [data-stat="mainExtras"]', '.gg-hltb [data-stat="completionist"]', '.gg-caption', '.gg-hltb .gg-bar'];
        const desc = buildArrivingCss(full, 'spotlight', 'parts', false, { desc: true });
        expect(desc).not.toContain('.gg-desc');
        for (const sel of hltbParts) expect(desc, sel).toContain(sel);
        const hltb = buildArrivingCss(full, 'spotlight', 'parts', false, { hltb: true });
        expect(hltb).toContain('.gg-desc');
        for (const sel of hltbParts) expect(hltb, sel).not.toContain(sel);
        // The no-match line too (Home draws it as well): it arrives only when Home did not draw the card.
        expect(hltb).not.toContain('.gg-muted');
        expect(desc).toContain('.gg-muted');
        // The other new parts still arrive.
        for (const sel of ['.gg-family', '[data-stat="size"]']) expect(buildArrivingCss(full, 'spotlight', 'parts', false, { desc: true, hltb: true }), sel).toContain(sel);
    });
    it("a stat column Home did not show arrives with the new parts (a new game's Play time: Home had its Added chip)", () => {
        for (const look of ['spotlight', 'clean'] as const) {
            const css = buildArrivingCss(full, look, 'parts', false, { missing: ['played'] });
            expect(css, look).toContain('[data-stat="played"]');
            expect(buildArrivingCss(full, look, 'parts', false), look).not.toContain('[data-stat="played"]');
        }
        expect(buildArrivingCss(full, 'clean', 'parts', false, { missing: ['bad key"]'] })).not.toContain('bad key');
    });
    it("Unifideck's Uninstall circle (an installed game's fourth button; Home has none) arrives with the new parts (Michael: fade it in)", () => {
        const buttons = `.${full.root!.AppButtons}`;
        for (const look of ['spotlight', 'clean'] as const) {
            expect(buildArrivingCss(full, look, 'parts', false), look).toContain(`.unifideck-hide-native-play ${buttons}:has(> :nth-child(4)) > :nth-child(n+4)`);
            // Home drew one at its place as it opened (homeCss .gh-open-circle): the page's is there at once under the copy
            // (arriving after the copy had faded, it flickered).
            expect(buildArrivingCss(full, look, 'parts', false, { uninstall: true }), look).not.toContain(':nth-child(n+4)');
        }
    });
    it('a Unifideck size column Home drew (extras) is there at once; otherwise it arrives with the new parts', () => {
        for (const look of ['spotlight', 'clean'] as const) {
            expect(buildArrivingCss(full, look, 'parts', false), look).toContain('[data-stat="size"]');
            expect(buildArrivingCss(full, look, 'parts', false, { size: true }), look).not.toContain('[data-stat="size"]');
        }
    });
    it("Unifideck's store version dropdown (Steam's DialogDropDown) arrives with the new parts instead of popping in", () => {
        for (const look of ['spotlight', 'clean'] as const) {
            expect(buildArrivingCss(full, look, 'parts'), look).toContain(':has(> .DialogDropDown_CurrentDisplay)');
        }
    });
    it('the family pill is there at once when Home showed one (it moves with the store pill), and arrives otherwise', () => {
        for (const look of ['spotlight', 'clean'] as const) {
            expect(buildArrivingCss(full, look, 'parts', false, { family: true }), look).not.toContain('.gg-family');
            expect(buildArrivingCss(full, look, 'parts', false), look).toContain('.gg-family');
        }
    });
    it("revealing 'parts' fades opacity only: a part placed by its own transform keeps it (the family pill's translateY(-50%) next to the store pill)", () => {
        for (const look of ['spotlight', 'clean'] as const) {
            const css = buildArrivingCss(full, look, 'parts', true);
            const body = new RegExp(`\\.gg-family[^{]*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
            expect(body, look).toContain('opacity: 1 !important');
            expect(body, look).not.toContain('transform');
        }
        // 'all' still lowers the whole page by the rise and lifts it back.
        expect(buildArrivingCss(full, 'spotlight', 'all', true)).toContain('transform: none !important');
    });
    it("Spotlight: the HowLongToBeat card's Main label arrives (Home's 'HLTB main' fades as it moves)", () => {
        expect(buildArrivingCss(full, 'spotlight', 'parts')).toContain('.gg-hltb [data-stat="hltb"] > .gg-label');
        expect(buildArrivingCss(full, 'clean', 'parts')).not.toContain('[data-stat="hltb"] > .gg-label');
    });
    it("'all' hides the whole page but the art, lowered by the rise", () => {
        const css = buildArrivingCss(full, 'spotlight', 'all');
        for (const sel of ['.gg-titleblock', '.gg-hero', '.rt_Play']) expect(css, sel).toContain(sel);
        expect(css).toContain('transform: translateY(14px) !important');
    });
    it('revealed: the same elements fade back in over the reveal time', () => {
        const css = buildArrivingCss(full, 'spotlight', 'all', true);
        expect(css).toContain('opacity: 1 !important');
        expect(css).toContain('transform: none !important');
        expect(css).toContain('transition: opacity 200ms ease, transform 200ms');
    });
    it('is empty without the layout classes', () => {
        expect(buildArrivingCss({ ...full, header: {} }, 'spotlight', 'parts')).toBe('');
    });
    it("pins the page's hero to Home's crop (50% 30%) with the restyled layout", () => {
        expect(buildThemeCss(full, { restyle: true })).toContain('.hd_Top img { object-position: 50% 30% !important; }');
        expect(buildThemeCss(full)).not.toContain('object-position: 50% 30%');
    });
});

describe("Steam's own page-enter fade while the page arrives", () => {
    const withTransition = { ...full, transition: { TopLevelTransition: 'tl_Top', Enter: 'tl_Enter', EnterActive: 'tl_EnterActive' } };
    const rule = '.tl_Top.tl_Enter, .tl_Top.tl_EnterActive { opacity: 1 !important; transform: none !important; transition: none !important; }';
    it('is switched off in every arriving state, so the bridge never fades over a page Steam is still fading in', () => {
        for (const mode of ['parts', 'all'] as const) {
            for (const revealed of [false, true]) expect(buildArrivingCss(withTransition, 'spotlight', mode, revealed)).toContain(rule);
        }
    });
    it('is left alone when Steam’s transition classes are unknown', () => {
        expect(buildArrivingCss(full, 'spotlight', 'parts')).not.toContain('tl_');
    });
});

describe('buildSteamEnterOffCss', () => {
    it("is the page-enter switch-off alone (the open transition's bridge carries it, for Steam's own page too)", () => {
        expect(buildSteamEnterOffCss({ ...full, transition: { TopLevelTransition: 'a', Enter: 'b', EnterActive: 'c' } }))
            .toBe('.a.b, .a.c { opacity: 1 !important; transform: none !important; transition: none !important; }');
        expect(buildSteamEnterOffCss(full)).toBe('');
    });
    it("hides the page leaving at once (Steam's exit animation drew Home, offset, under the fading bridge; probed on the Ally)", () => {
        const css = buildSteamEnterOffCss({ ...full, transition: { TopLevelTransition: 'a', Enter: 'b', EnterActive: 'c', Exit: 'd', ExitActive: 'e' } });
        // visibility, not opacity with the transition off: Steam unmounts the leaving page when its exit transition
        // ends, so the transition must still run (without it Home stayed, hidden, and came back mid-open on B).
        expect(css).toContain('.a.d, .a.e { visibility: hidden !important; }');
        expect(css).not.toMatch(/\.a\.d[^{]*\{[^}]*transition/);
    });
});

describe('steamFooterSelector', () => {
    it("Steam's footer (BasicFooter, one element over every page): the open transition's bridge carries a copy", () => {
        expect(steamFooterSelector({ ...full, footer: { BasicFooter: 'f1', FooterLegend: 'f2' } })).toBe('.f1');
    });
    it('null when Steam renamed it', () => {
        expect(steamFooterSelector(full)).toBeNull();
    });
});

describe('the store pill', () => {
    it("is the same size on Home and the page: its height includes the border (the page's was 1.7 px taller at the hand-over)", () => {
        expect(sourcePillLook((n) => `${n}px`)).toContain('box-sizing: border-box');
    });
});

describe('the cloud button on the restyled page', () => {
    it("draws its icon in the page's unit at Home's size (it was in another unit, so its ratio to Home's changed with the screen)", () => {
        const css = buildThemeCss(full, { restyle: true });
        const play = full.play as Record<string, string>;
        expect(css).toContain(`.${play.CloudStatusRow} svg { width: calc(${PAGE_LAYOUT.cloudIcon} * var(--gg-d)) !important; height: calc(${PAGE_LAYOUT.cloudIcon} * var(--gg-d)) !important; }`);
    });
});

describe('the Play pill\'s "Play from" arrow', () => {
    it('is a 56 wide segment with a 14 px glyph at the pill\'s right end, in the page\'s d unit (Home draws the same, home/homeCss)', () => {
        expect(PAGE_LAYOUT.playArrow).toEqual({ w: 56, glyph: 14 });
    });
});

describe('pillFocusScale', () => {
    it("a focused pill grows by what a focused circle grows (its height's share), not by 4% of its width: the gap to the circles stays (Michael)", () => {
        const f = PAGE_LAYOUT.focusScale;
        const pf = pillFocusScale(340, 60);
        expect(pf.y).toBe(f);
        expect((pf.x - 1) * 340).toBeCloseTo((f - 1) * 60, 2);
        expect(pillFocusScale(250, 54).x).toBeCloseTo(1 + (0.04 * 54) / 250, 4);
    });
});

describe('the Spotlight cards have one height', () => {
    it("every game's cards are as tall as with three description lines (The Witcher's): a short description no longer shortens them after the open (Sonic)", () => {
        const css = buildThemeCss(full, { restyle: true });
        // The content's minimum (the card is content-box): the cards' height less padding and border, i.e. stats, gap and three lines.
        const content = PAGE_LAYOUT.playTop.tvCards - 2 * PAGE_LAYOUT.cards.padY - 2;
        const L = PAGE_LAYOUT;
        expect(content).toBeCloseTo(L.stats.label * 1.5 + L.stats.rowGap + L.stats.value * 1.2 + L.cards.colGap + L.cardText.desc * L.cardText.descLine * L.cardText.descLines, 5);
        expect(css).toContain(`min-height: calc(${content} * var(--gg-d))`);
        expect(css).toMatch(/\.gg-card \{[^}]*min-height: calc\(/);
    });
});
