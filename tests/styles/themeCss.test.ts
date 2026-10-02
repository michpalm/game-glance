import { describe, expect, it } from 'vitest';
import { buildThemeCss, ThemeClasses } from '../../src/styles/themeCss';

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
