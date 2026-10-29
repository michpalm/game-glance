import { describe, expect, it } from 'vitest';
import { menuStyles } from '../../src/menu/styles';
import { socialStyles } from '../../src/menu/socialStyles';
import { focusRing, labelText, TOKENS, tokenCss } from '../../src/styles/tokens';
const rule=(selector:string)=>menuStyles.split('\n').find(line=>line.startsWith(selector+'{'))??'';
describe('menu glass and reveal motion',()=>{
    it('draws the bar and panel in the visual language glass over the frosted game',()=>{
        expect(rule('.gg-menu .gg-menu-bar,.gg-menu .gg-menu-panel')).toContain(`background:${TOKENS.glass}`);
    });
    it('gives the notification bell, the third frost region, the same glass and edge', ()=>{
        const bell=rule('.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-notifications.DialogButton');
        expect(bell).toContain(`background:${TOKENS.glass}`);
        expect(bell).toContain('border-color:var(--gg-edge)');
    });
    it('lifts unselected tabs and Performance categories to the idle-tab white, leaving other dim text alone', ()=>{
        expect(TOKENS.idle).toBe('rgba(255,255,255,.80)');
        expect(tokenCss('.x')).toContain(`--gg-text-idle:${TOKENS.idle}`);
        for (const selector of ['.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton', '.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton'])
            expect(rule(selector)).toContain('color:var(--gg-text-idle)');
        expect(rule('.gg-menu p')).toContain('color:var(--gg-text-dim)');
    });
    it('raises the menu’s grey labels to 90% with the text shadow, leaving Home’s grey alone', ()=>{
        // Measured over frosted Ori on the Ally (2026-10-28): 62% labels fell to 2.3-4.8:1;
        // with the calmer frost, 90% keeps them above 5:1 even over a bright scene.
        expect(TOKENS.label).toBe('rgba(255,255,255,.90)');
        expect(rule('.gg-menu')).toContain(`--gg-text-dim:${TOKENS.label}`);
        expect(tokenCss('.x')).toContain(`--gg-text-dim:${TOKENS.dim}`);
        const dimRules=[...menuStyles.split('\n'),...socialStyles.split('\n')].flatMap(line=>line.match(/[^{}]+\{[^}]*color:var\(--gg-text-dim\)[^}]*\}/g)??[]);
        expect(dimRules.length).toBeGreaterThan(10);
        for(const css of dimRules) expect(css, css.slice(0,80)).toContain('text-shadow:var(--gg-text-shadow)');
    });
    it('fades the menu and status pills in over the fast motion token, linear like the frost shader',()=>{
        expect(rule('.gg-menu')).toMatch(/transition:[^;}]*opacity var\(--gg-fast\) linear/);
        expect(rule('.gg-menu-status-host')).toContain('transition:opacity var(--gg-fast) linear');
    });
    const all = [...menuStyles.split('\n'), ...socialStyles.split('\n')];
    it('draws options in the bar and tracks as full-height slices in a card track', () => {
        expect(rule('.gg-menu-tabs')).toMatch(/padding:0[;}]/);
        expect(rule('.gg-menu-tabs')).toMatch(/gap:0[;}]/);
        expect(rule('.gg-menu-tabs')).toContain('align-items:stretch');
        for (const track of ['.gg-menu-segmented', '.gg-menu-perf-tabs']) {
            expect(rule(track)).toContain('border-radius:var(--gg-r-card)');
            expect(rule(track)).toContain('overflow:hidden');
            expect(rule(track)).toMatch(/padding:0[;}]/);
        }
        for (const slice of ['.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton',
            '.gg-menu-native-host .gg-menu .gg-menu-segmented button.gg-menu-action.DialogButton',
            '.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton'])
            expect(rule(slice)).toContain('border-radius:0');
    });
    it('uses pills only where the round shape is the control', () => {
        const pills = all.filter(line => line.includes('--gg-r-pill'));
        for (const line of pills) expect(line, line.slice(0, 90)).toMatch(/SliderTrack|SliderHandle|role=checkbox|gg-ingame-bar|gg-ingame-progress|gg-social-avatar|gh-status-pill/);
    });
    it('marks every selected item with the shade and faint edge, never an accent fill', () => {
        const selected = all.flatMap(line => line.match(/[^{}]*\[aria-pressed=true\][^{}]*\{[^}]*\}/g) ?? [])
            .filter(css => !css.includes(':not([aria-pressed=true])'));
        expect(selected.length).toBeGreaterThanOrEqual(5);
        for (const css of selected) {
            expect(css, css.slice(0, 90)).not.toContain('background:var(--gg-accent)');
            if (!css.includes('::after')) expect(css, css.slice(0, 90)).toContain('var(--gg-selected-edge)');
        }
    });
    it('focuses with the white ring only: no growth, no glow', () => {
        expect(menuStyles + socialStyles).not.toContain('--gg-focus-shadow');
        expect(menuStyles + socialStyles).not.toContain('scale(1.04)');
        expect(menuStyles).toContain('outline-offset:-2px');
    });
    it('keeps every focus rule out of mouse mode', () => {
        for (const line of all.filter(l => /gpfocus|:focus-visible|:focus-within/.test(l)))
            expect(line, line.slice(0, 90)).toMatch(/^:where\(html:not\(\[data-gg-mouse\]\)\)/);
    });
    it('keeps tab labels on one line and the bar scrollable', () => {
        expect(rule('.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton')).toContain('white-space:nowrap');
        expect(rule('.gg-menu-tabs')).toContain('overflow-x:auto');
        // Tabs grow to fill the bar but never shrink below their label, so a long row scrolls instead.
        expect(rule('.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton')).toContain('flex:1 0 auto');
    });
    it('lets a slider without a partner take the full row', () => {
        expect(menuStyles).toContain('.gg-menu-quick-sliders>:only-child{grid-column:1/-1}');
    });
    it('gives tiles one height on every page', () => {
        expect(rule('.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton')).toMatch(/height:112px/);
        expect(rule('.gg-menu .gg-ingame-grid')).not.toMatch(/flex:1/);
    });
    it('turns a pending option’s spinner into a still ring under reduced motion', () => {
        expect(menuStyles).toMatch(/\.gg-menu-pending::after\{[^}]*animation:gg-menu-spin/);
        // animation is not inherited and `*` skips pseudo-elements, so the spinner needs its own entry.
        expect(menuStyles).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[^{]*\.gg-menu \*::after[^{]*\{[^}]*animation:none!important/);
    });
});

it('the status bar in the menu takes the soft corner of the status bar outside it (VDL Section 7, option B)', () => {
    expect(menuStyles).toMatch(/\.gg-menu-status-host \.gh-status-pill\{[^}]*border-radius:var\(--gg-r-card\)/);
    // On Home the page's own bar stays up; the popup copy keeps its layout (for its frost area) but is never seen.
    expect(menuStyles).toMatch(/\.gg-menu-status-host\.gg-menu-status-home\{visibility:hidden!important\}/);
});

it('the status bar in the menu takes Home\'s glass over the in-game frost, not the old solid .75', () => {
    const pill = menuStyles.match(/\.gg-menu-status-host \.gh-status-pill\{([^}]*)\}/)?.[1] ?? '';
    expect(pill).not.toContain('glass-solid');
    expect(pill).not.toMatch(/background:/);
    // The frost shader blurs the game under it (frost area "status"); a CSS blur in the popup would see nothing.
    expect(pill).toContain('backdrop-filter:none!important');
});

it('the reset for Steam fields in a setting row leaves our segmented track alone (Steam\'s Focusable is a .Panel too)', () => {
    expect(menuStyles).toContain('.gg-menu .gg-menu-setting .Panel:not(.gg-menu-segmented)');
    expect(menuStyles).not.toMatch(/\.gg-menu \.gg-menu-setting \.Panel[,{]/);
});

it('the end options of a track take its corners, so their focus ring and selection are not cut off', () => {
    const track = ':is(.gg-menu-segmented,.gg-menu-perf-tabs)';
    expect(menuStyles).toContain(`${track} button.gg-menu-action.DialogButton:first-child{border-radius:calc(var(--gg-r-card) - 1px) 0 0 calc(var(--gg-r-card) - 1px)}`);
    expect(menuStyles).toContain(`${track} button.gg-menu-action.DialogButton:last-child{border-radius:0 calc(var(--gg-r-card) - 1px) calc(var(--gg-r-card) - 1px) 0}`);
});

describe('the menu keyboard', () => {
    const lines = socialStyles.split('\n');
    const css = (selector: string) => lines.find(line => line.startsWith(selector + '{')) ?? '';
    const key = '.gg-menu-native-host .gg-menu .gg-keyboard .gg-keyboard-row button.gg-keyboard-key.DialogButton';
    it('floats a 409 × 210 glass panel with the menu edge and corners', () => {
        const panel = css('.gg-menu .gg-keyboard');
        for (const part of ['position:absolute', 'width:409px', 'height:210px', `background:${TOKENS.solid}`, 'border:1px solid var(--gg-edge)', 'border-radius:var(--gg-r-panel)']) expect(panel).toContain(part);
        // Rows are 385 px wide inside the 1 px edge.
        expect(panel).toMatch(/padding:\d+px 11px/);
    });
    it('keeps keyboard keys free of the menu button transitions so focus moves instantly', () => {
        expect(socialStyles).toMatch(new RegExp(key.replace(/[.]/g, '\\.') + '\\{[^}]*transition:none'));
    });
    it('blurs the Social columns under the keyboard, fading in and out', () => {
        expect(socialStyles).toContain('.gg-social-friend-list.gg-keyboard-under,.gg-social-timeline.gg-keyboard-under{filter:blur(16px)}');
        expect(css('.gg-social-friend-list')).toContain('transition:filter var(--gg-fast) linear');
        expect(css('.gg-social-timeline')).toContain('transition:filter var(--gg-fast) linear');
    });
    it('lifts the panel while it is dragged', () => {
        const lifted = css('.gg-menu .gg-keyboard.gg-keyboard-dragging');
        expect(lifted).toContain('box-shadow:'); expect(lifted).toContain('border-color:var(--gg-edge-active)');
    });
    it('draws 34 × 40 keys with 5 px gaps and 10 px corners that narrow to fit a long row', () => {
        expect(css('.gg-keyboard-row')).toContain('gap:5px');
        expect(css('.gg-keyboard-keys')).toContain('gap:5px');
        const k = css(key);
        for (const part of ['flex:0 1 34px', 'min-width:0', 'height:40px', 'border-radius:10px', 'background:rgba(255,255,255,.10)']) expect(k).toContain(part);
        expect(css(`${key}.gg-keyboard-mod`)).toContain('background:rgba(255,255,255,.20)');
        expect(css(`${key}.gg-keyboard-send`)).toContain('background:var(--gg-accent)');
    });
    it('rings a focused key with the menu’s white ring', () => {
        expect(socialStyles).toContain(`:where(html:not([data-gg-mouse])) ${key}:is(.gpfocus,:focus-visible){${focusRing('menu')}`);
    });
    it('shows the strip’s "Hold to move" label only while the move button has controller focus', () => {
        const label = css('.gg-keyboard-strip-label');
        expect(label).toContain('display:none');
        for (const part of ['font-size:11px', labelText()]) expect(label).toContain(part);
        const focused = css(':where(html:not([data-gg-mouse])) .gg-menu-native-host .gg-menu .gg-keyboard-strip button.gg-keyboard-move.DialogButton:is(.gpfocus,:focus-visible) .gg-keyboard-strip-label');
        expect(focused).toMatch(/display:(inline-)?flex/);
        const badge = css('.gg-keyboard-badge');
        for (const part of ['width:14px', 'height:14px', 'border:1px solid', 'border-radius:50%', 'font-size:10px', 'font-weight:700']) expect(badge).toContain(part);
    });
    it('gives the move strip 24 px at the bottom', () => {
        expect(css('.gg-keyboard-strip')).toContain('height:24px');
    });
});
