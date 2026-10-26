import { SETTLE_WIDEN_MS } from '../../src/home/fastCycle';
import { CLOUD_COLOURS, CLOUD_DOT } from '../../src/home/cloud';
import { ART_FILL_FILTER } from '../../src/home/heroFit';
import { describe, expect, it } from 'vitest';
import {
    statusCss, HOME_GLASS, HOME_PILL,
    FEED_SHEET, giveWayVars, hexAlpha, homeCss, homeStack, MAX_STACK_SHIFT, sourcePillTop, stackShift, TITLE_BLOCK, titleBlockBottom, titleBlockLayout,
} from '../../src/home/homeCss';
import { sourcePillLook } from '../../src/styles/sourcePill';
import { PAGE_LAYOUT, PAGE_SCRIMS, pageType, pillFocusScale, STEAM_PLAY_LINE, STEAM_TOP_GRADIENT } from '../../src/styles/themeCss';
import { ACCENT_MS, CAP_ART_FADE_MS, CAP_STATE_MS, HERO_FADE_MS, OPEN_TIMINGS, RETURN_TIMINGS, SHEET_MS, SLIDE_MS } from '../../src/home/motion';
import { CARD_SCALE_DOCKED, CARD_SCALE_HANDHELD, recentsGeometry, recentsGlowTop } from '../../src/home/recentsLayout';

/** Splits a selector list at the commas outside parentheses (`:is(a, b)` stays one selector). */
function topLevelCommas(list: string): string[] {
    const parts: string[] = [];
    let depth = 0, from = 0;
    for (let i = 0; i < list.length; i++) {
        if (list[i] === '(') depth++;
        else if (list[i] === ')') depth--;
        else if (list[i] === ',' && depth === 0) {
            parts.push(list.slice(from, i));
            from = i + 1;
        }
    }
    parts.push(list.slice(from));
    return parts;
}

/** Selector lists of every style rule, @-rule preludes (keyframes, @property) excluded. */
function selectors(css: string): string[] {
    const out: string[] = [];
    const flat = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Keyframe bodies hold `from`/`to`/percent selectors; drop them before scanning.
    const noKeyframes = flat.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    const re = /([^{}]+)\{[^{}]*\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(noKeyframes)) !== null) {
        const prelude = m[1].trim();
        if (prelude.startsWith('@')) continue;
        out.push(...topLevelCommas(prelude).map((s) => s.trim()).filter(Boolean));
    }
    return out;
}

describe('homeCss', () => {
    it('matches the action buttons’ focus ring and glow on both selector pills', () => {
        const css = homeCss();
        expect(/!important\s+!important/.test(css)).toBe(false);
        const focus = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, selector]) => selector.includes('.gh-copy-choice.gh-pill-focus'));
        expect(focus?.[1]).toContain('.gh-store-choice.gh-pill-focus');
        const button = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, selector]) => selector.includes('.gh-btn.gh-focus'));
        const shadow = (body: string) => /box-shadow:\s*([^;]+)/.exec(body)?.[1];
        expect(shadow(focus?.[2] ?? '')).toBe(shadow(button?.[2] ?? ''));
        expect(focus?.[2]).not.toContain('background:');
        expect(css).toContain(`transform: translateY(-50%) scale(${PAGE_LAYOUT.focusScale})`);
    });
    it('homeCss prefixes every class with gh-', () => {
        const css = homeCss();
        const list = selectors(css);
        expect(list.length).toBeGreaterThan(10);
        // (Hover looks sit under mouse mode's mark on the document's root, ours too: mouseMode.MOUSE_ATTR.)
        for (const sel of list) expect(sel.replace(/^(html\[data-gg-mouse\]|:where\(html:not\(\[data-gg-mouse\]\)\)) /, '').startsWith('.gh-'), sel).toBe(true);
        const classes = css.match(/\.[a-zA-Z_][\w-]*/g) ?? [];
        for (const cls of classes) expect(cls.startsWith('.gh-'), cls).toBe(true);
    });
    it('homeCss defines --glance-accent with the default and never transitions it on the root (whole-tree restyle per frame)', () => {
        const css = homeCss();
        expect(css).toMatch(/--glance-accent:\s*#5fd1ae/);
        expect(css).not.toMatch(/transition:[^;}]*--glance-accent/);
        expect(css).toMatch(/\.gh-root\s*\{[^}]*--glance-accent-text:\s*#5fd1ae/);
        // Small accent text uses the legible variant; bars, fills and rings keep the true accent.
        expect(css).toMatch(/\.gh-eyebrow\s*\{[^}]*color:\s*var\(--glance-accent-text\)/);
        expect(css).not.toMatch(/(?<![-\w])color:\s*var\(--glance-accent\)/);
        expect(css).toMatch(/\.gh-root\s*\{[^}]*transition:\s*none\s*!important/);
        // The accent-coloured elements fade their own colour instead.
        expect(css).toMatch(new RegExp(`\\.gh-btn\\s*\\{[^}]*background ${ACCENT_MS}ms`));
        expect(css).toMatch(new RegExp(`\\.gh-chip-fill\\s*\\{[^}]*width ${ACCENT_MS}ms`));
    });
    describe('switch timings (motion.ts): short for L1/R1, the sheet and feed unchanged', () => {
        it('pins the ranges', () => {
            expect(HERO_FADE_MS).toBeGreaterThanOrEqual(200);
            expect(HERO_FADE_MS).toBeLessThanOrEqual(320);
            expect(SLIDE_MS).toBeGreaterThanOrEqual(180);
            expect(SLIDE_MS).toBeLessThanOrEqual(260);
            expect(ACCENT_MS).toBeGreaterThanOrEqual(200);
            expect(ACCENT_MS).toBeLessThanOrEqual(320);
            expect(CAP_ART_FADE_MS).toBeGreaterThanOrEqual(100);
            expect(CAP_ART_FADE_MS).toBeLessThanOrEqual(200);
            expect(CAP_STATE_MS).toBeLessThanOrEqual(SLIDE_MS);
            expect(SHEET_MS).toBe(500);
        });
        it('the CSS uses them: hero fade, card slide with the snappy curve, wide-art fade; the sheet rises over 500 ms', () => {
            const css = homeCss(CARD_SCALE_DOCKED);
            expect(css).toMatch(new RegExp(`\\.gh-hero-layer\\s*\\{[^}]*gh-fade-in ${HERO_FADE_MS}ms`));
            expect(css).toMatch(/\.gh-hero-layer\.gh-hero-settled\s*\{[^}]*animation:\s*none\s*!important[^}]*opacity:\s*1/);
            expect(css).toMatch(new RegExp(`\\.gh-recents-track\\s*\\{[^}]*transform ${SLIDE_MS}ms cubic-bezier\\(\\.2,\\.9,\\.25,1\\)`));
            expect(css).toMatch(new RegExp(`\\.gh-cap\\s*\\{[^}]*left ${SLIDE_MS}ms[^}]*width ${SLIDE_MS}ms`));
            expect(css).not.toMatch(/\.gh-cap\s*\{[^}]*transition:[^}]*box-shadow/);
            expect(css).toMatch(new RegExp(`\\.gh-cap-art\\s*\\{[^}]*gh-fade-in ${CAP_ART_FADE_MS}ms`));
            expect(css).toMatch(/\.gh-page\s*\{[^}]*transform 500ms cubic-bezier\(\.2,\.8,\.2,1\)/);
        });
    });
    it("homeCss reserves 52px top and 46px bottom for Steam's bars", () => {
        const css = homeCss();
        expect(css).toMatch(/--gh-top:\s*52px/);
        expect(css).toMatch(/--gh-bottom:\s*46px/);
        expect(css).toMatch(/\.gh-safe\s*\{[^}]*top:\s*var\(--gh-top\)\s*!important[^}]*bottom:\s*var\(--gh-bottom\)\s*!important/);
    });
    it('homeCss never hides the portrait under the wide art, so failed landscape urls still show the capsule', () => {
        const css = homeCss();
        // The wide layer covers the portrait when it loads (it is mounted after it); nothing may hide the portrait.
        expect(css).not.toMatch(/gh-cap-cover\s*\{[^}]*opacity:\s*0\s*!important/);
        expect(css).not.toMatch(/gh-cap-art-on/);
        expect(css).toMatch(/\.gh-cap-art\s*\{[^}]*animation:\s*gh-fade-in \d+ms/);
    });
    it('the store pill sits at the right edge, centred on the action row, drawn like the game page\'s pill', () => {
        const css = homeCss();
        // Action row 379.4..433.4 -> centre 406.4; pill 32 tall -> top 390.4.
        expect(sourcePillTop()).toBeCloseTo(390.4, 5);
        const pill = css.match(/\.gh-source\s*\{[^}]*\}/)?.[0] ?? '';
        expect(pill).toMatch(/right:\s*var\(--gh-pill,\s*56px\)\s*!important/);
        expect(pill).toMatch(/top:\s*calc\(390\.4px - var\(--gh-top\)\)/);
        expect(pill).toMatch(/border-radius:\s*999px/);
        expect(pill).toMatch(/pointer-events:\s*none/);
        // The same look as the game page: one definition.
        for (const decl of sourcePillLook((n) => `${n}px`).split(';').map((d) => d.trim()).filter(Boolean)) expect(pill).toContain(`${decl} !important`);
        expect(css).toMatch(/\.gh-source-icon\s*\{[^}]*width:\s*16px[^}]*margin-right:\s*8px/);
        // The old icon-only chip badge is gone; the chip row keeps its fixed height.
        expect(css).not.toMatch(/\.gh-source\s*\{[^}]*var\(--gh-r-card\)/);
    });
    it('the status bar sits in Steam\'s top strip, right-aligned with the store pill, in the same glass pill', () => {
        const css = homeCss();
        const bar = css.match(/\.gh-status\s*\{[^}]*\}/)?.[0] ?? '';
        // Placed by StatusBar from the canvas scale (the dot over Steam's avatar), with the fixed place as the fallback.
        expect(bar).toMatch(/right:\s*var\(--gh-status-right,\s*32px\)\s*!important/);
        expect(bar).toMatch(/top:\s*calc\(var\(--gh-status-cy,\s*32px\) - 16px\)\s*!important/);
        expect(bar).toMatch(/height:\s*32px/);
        expect(bar).toMatch(/pointer-events:\s*none/);
        expect(bar).toMatch(/transition:\s*opacity 150ms/);
        expect(css).toMatch(/\.gh-status\.gh-status-away\s*\{[^}]*opacity:\s*0/);
        const pill = css.match(/\.gh-status-pill\s*\{[^}]*\}/)?.[0] ?? '';
        for (const decl of sourcePillLook((n) => `${n}px`).split(';').map((d) => d.trim()).filter(Boolean)) expect(pill).toContain(`${decl} !important`);
        expect(css).toMatch(/\.gh-status-low\s*\{[^}]*color:\s*#ff8585/);
        // The status dot: the Friends tab's green and blue, grey when invisible or offline.
        expect(css).toMatch(/\.gh-status-dot\s*\{[^}]*width:\s*12px[^}]*border-radius:\s*50%/);
        expect(css).toMatch(/\.gh-status-dot-online\s*\{[^}]*background:\s*#8cd61d/);
        expect(css).toMatch(/\.gh-status-dot-away\s*\{[^}]*background:\s*#4cb4ff/);
        expect(css).toMatch(/\.gh-status-dot-off\s*\{[^}]*background:\s*rgba\(196,201,209,\.85\)/);
    });
    it('the open transition lands on the page\'s exact edges: the glass panels\' 1px border and the Play pill\'s outer size', () => {
        const css = homeCss(CARD_SCALE_HANDHELD);
        // The panels are drawn in the scaled canvas with Home's own 1px ring, so it looks the same as the chips' all the way.
        // (Chromium snaps a border to whole device px in the canvas's own units before the scale: the page's 1 device px,
        // 0.75 canvas px on the Ally, became 1 device px there and 0.575 on screen, half as bright as both ends.)
        // (The ring is drawn by its ::before, which fades out as the page's crisp ring, outside the canvas, fades in; the
        // panel keeps a transparent 1px border so its box and edges stay the page card's.)
        expect(css).toMatch(/\.gh-open-shell \{[^}]*border: 1px solid transparent/);
        expect(css).toMatch(/\.gh-open-shell::before \{[^}]*inset: -1px[^}]*border: 1px solid rgba\(255,255,255,\.12\)/);
        expect(css).not.toContain('--gho-x-border');
        // The pill's layers that grow into the page pill start at its outer edge (its 1px border), as openMotion's scales assume.
        expect(css).toMatch(/\.gh-btn\[data-action="play"\]::before \{[^}]*left: -1px[^}]*top: -1px[^}]*width: calc\(100% \+ 2px\)[^}]*height: calc\(100% \+ 2px\)/);
        expect(css).toMatch(/\.gh-btn\[data-action="play"\]::after \{[^}]*left: -1px[^}]*top: calc\(var\(--gho-play-dy\) - 1px\)[^}]*width: calc\(\(100% \+ 2px\) \* var\(--gho-play-sx\)\)[^}]*height: calc\(\(100% \+ 2px\) \* var\(--gho-play-sy\)\)/);
    });
    it('never marks transform or opacity !important: Chromium will not run an animation of an !important property on its compositor', () => {
        // (compositeFailed 262144, kAffectsImportantProperty, probed on the Ally: the open transition's motion then ran on the
        // main thread and repainted every frame, the GPU near its limit, and stalled and jumped to its end on the screen.)
        const css = [homeCss(CARD_SCALE_HANDHELD), homeCss(CARD_SCALE_DOCKED)].join('\n');
        expect(css).not.toMatch(/(?<![-\w])transform:[^;}]*!important/);
        expect(css).not.toMatch(/(?<![-\w])opacity:[^;}]*!important/);
        // The rest stays !important (Steam's own styles must not win), the transitions too.
        expect(css).toMatch(/\.gh-recents-track \{[^}]*position: absolute !important[^}]*transition: transform [^;]*!important/);
    });
    it('focus looks follow DOM focus too: after a tap, a click or the wheel Steam drops its focus classes', () => {
        const css = homeCss(CARD_SCALE_HANDHELD);
        // The selected card's ring and glow, with the row under DOM focus.
        expect(css).toMatch(/\.gh-recents:focus \.gh-cap-sel, \.gh-recents:focus \.gh-cap-lib-on\s*\{[^}]*box-shadow:\s*0 0 0 2px rgba\(255,255,255,\.9\)/);
        // A button, the Play pill's growth, a feed card and a tab's line.
        expect(css).toMatch(/\.gh-btn:focus\s*\{[^}]*box-shadow:\s*0 0 0 2px rgba\(255,255,255,\.9\)/);
        expect(css).toMatch(/\.gh-actions > \.gh-btn-play\.gh-btn:focus\s*\{[^}]*transform:\s*scale/);
        expect(css).toMatch(/\.gh-card:focus\s*\{[^}]*translateY\(-4px\)/);
        expect(css).toMatch(/\.gh-tab:focus \.gh-tab-line\s*\{[^}]*opacity:\s*1/);
        // A hover never shows over a focused card.
        expect(css).toMatch(/\.gh-card\.gh-card-hover:not\(\.gh-card-focus\):not\(:focus\)\s*\{/);
    });
    it('a mouse lights the card under it: a faint ring, weaker than the selection, never on the selected card', () => {
        const css = homeCss(CARD_SCALE_HANDHELD);
        // Games row: a half-strength white ring, no accent glow, and a little brighter.
        expect(css).toMatch(/\.gh-cap\.gh-cap-hover:not\(\.gh-cap-sel\):not\(\.gh-cap-lib-on\)\s*\{[^}]*box-shadow:\s*0 0 0 2px rgba\(255,255,255,\.45\)[^}]*filter:\s*brightness\(1\.12\)/);
        expect(css).not.toMatch(/\.gh-cap-hover[^{]*\{[^}]*glance-accent/);
        // An uninstalled game loses some of its grey under the cursor (after the grey rule, so it wins).
        const off = css.indexOf('.gh-cap-off:not(.gh-cap-sel)');
        const offHover = css.search(/\.gh-cap-off\.gh-cap-hover:not\(\.gh-cap-sel\)\s*\{[^}]*grayscale\(\.5\)/);
        expect(off).toBeGreaterThan(-1);
        expect(offHover).toBeGreaterThan(off);
        // Feed cards: the same ring and a 2px lift (a focused card lifts 4px).
        expect(css).toMatch(/\.gh-card\.gh-card-hover:not\(\.gh-card-focus\):not\(:focus\)\s*\{[^}]*box-shadow:\s*0 0 0 2px rgba\(255,255,255,\.45\)[^}]*transform:\s*translateY\(-2px\)/);
    });
    it('the recents row takes touch: pointer events on, its own gestures, off under the sheet and while opening', () => {
        const css = homeCss(CARD_SCALE_HANDHELD);
        expect(css).toMatch(/\.gh-recents\s*\{[^}]*pointer-events:\s*auto\s*!important[^}]*touch-action:\s*none\s*!important[^}]*user-select:\s*none\s*!important/);
        expect(css).toMatch(/\.gh-page-up \.gh-recents\s*\{[^}]*pointer-events:\s*none\s*!important/);
        // The root's own pointer-events: none (while a game opens) doesn't reach a child that sets auto: the row is
        // switched off explicitly, so a tap during the open transition does nothing.
        expect(css).toMatch(/\.gh-root\[data-gh-opening\] \.gh-recents\s*\{[^}]*pointer-events:\s*none\s*!important/);
        // While a finger drags the row the track follows it directly: no slide transition (useRowDrag).
        expect(css).toMatch(/\.gh-recents-drag \.gh-recents-track\s*\{[^}]*transition:\s*none\s*!important/);
        // The loop preview's ghosts take taps as part of the row (a ghost selects its game): they inherit the row's
        // pointer-events, so they too take none under the sheet or while a game opens (an explicit auto would escape both).
        expect(css).toMatch(/\.gh-ghost\s*\{[^}]*cursor:\s*default/);
        expect(css).not.toMatch(/\.gh-ghost\s*\{[^}]*pointer-events/);
        // While the card row has focus, the selected (or Library) card gets a white ring outside it and an even accent
        // glow (no y offset), and no bar along its bottom edge. Wide or narrow (a fast L1/R1 run), only the selected card
        // (gh-cap-sel): in Steam's row style the wide card is the first game, selected or not, and gets no ring.
        expect(css).toMatch(/\.gh-recents-focus \.gh-cap-sel, \.gh-recents-focus \.gh-cap-lib-on, \.gh-recents:focus \.gh-cap-sel, \.gh-recents:focus \.gh-cap-lib-on\s*\{[^}]*box-shadow:\s*0 0 0 2px rgba\(255,255,255,\.9\), 0 0 [\d.]+px [\d.]+px var\(--glance-accent\)/);
        expect(css).not.toMatch(/gh-recents-focus[^{]*\.gh-cap-bar/);
        expect(css).not.toMatch(/\.gh-cap-wide[,\s]*\{[^}]*(box-shadow|--gh-edge)/);
        expect(css).not.toMatch(/\.gh-recents-focus \.gh-cap-wide/);
        expect(css).toMatch(/\.gh-cap-sel\s*\{\s*--gh-edge: rgba\(255,255,255,\.35\)/);
        // When the run ends the card widens quickly (SETTLE_WIDEN_MS), its neighbours moving with it.
        expect(css).toMatch(new RegExp(`\\.gh-recents-snap \\.gh-cap\\s*\\{[^}]*transition: left ${SETTLE_WIDEN_MS}ms cubic-bezier\\([^)]*\\), width ${SETTLE_WIDEN_MS}ms`));
        // A game new to the library: a small light "New" pill at the card's top left.
        expect(css).toMatch(/\.gh-cap-marks\s*\{[^}]*position:\s*absolute[^}]*flex-direction:\s*column/);
        expect(css).toMatch(/\.gh-cap-wide \.gh-cap-marks\s*\{[^}]*flex-direction:\s*row/);
        expect(css).toMatch(/\.gh-cap-new\s*\{[^}]*text-transform:\s*uppercase[^}]*background:\s*rgba\(255,255,255,\.92\)/);
    });
    it('homeCss gives ghosts no blur base and no recents-on-library variant', () => {
        const css = homeCss();
        expect(css).not.toMatch(/gh-recents-onlib/);
        expect(css).not.toMatch(/\.gh-ghost[^{]*\.gh-cap-blur/);
    });
    it('homeCss sizes the recents row from the card scale: handheld x1.5 and docked x1.6', () => {
        const hand = homeCss(1.5);
        expect(hand).toMatch(/\.gh-recents\s*\{[^}]*top:\s*calc\(478px - var\(--gh-top\)\)\s*!important[^}]*height:\s*210px/);
        expect(hand).toMatch(/\.gh-cap\s*\{[^}]*height:\s*210px\s*!important[^}]*border-radius:\s*12px/);
        expect(hand).toMatch(/\.gh-cap-cover\s*\{[^}]*width:\s*140px/);
        expect(hand).toMatch(/\.gh-cap\.gh-cap-focus\s*\{[^}]*box-shadow:\s*0 0 0 1px var\(--glance-accent\), 0 24px 60px -18px var\(--glance-accent\)/);
        expect(hand).toMatch(/\.gh-ghost-icon\s*\{[^}]*width:\s*54px/);
        const dock = homeCss(1.6);
        expect(dock).toMatch(/\.gh-recents\s*\{[^}]*top:\s*calc\(464px - var\(--gh-top\)\)\s*!important[^}]*height:\s*224px/);
        expect(dock).toMatch(/\.gh-cap\s*\{[^}]*height:\s*224px\s*!important[^}]*border-radius:\s*12\.8px/);
        expect(dock).toMatch(/\.gh-cap-cover\s*\{[^}]*width:\s*149px/);
        expect(dock).toMatch(/\.gh-cap\.gh-cap-focus\s*\{[^}]*box-shadow:\s*0 0 0 1px var\(--glance-accent\), 0 25\.6px 64px -19\.2px var\(--glance-accent\)/);
        expect(dock).toMatch(/\.gh-cap-bar\s*\{[^}]*height:\s*4\.8px/);
        expect(dock).toMatch(/\.gh-ghost-icon\s*\{[^}]*width:\s*57\.6px[^}]*font-size:\s*32px/);
        expect(dock).toMatch(/\.gh-ghost-label\s*\{[^}]*font-size:\s*15\.2px/);
        // Default (before Home has measured its box): handheld.
        expect(homeCss()).toBe(homeCss(CARD_SCALE_HANDHELD));
    });
    it('homeCss clamps the title to 3 lines with an ellipsis, keeping balance and the shadow, in a 2-line slot', () => {
        const css = homeCss();
        const title = css.match(/\.gh-title\s*\{[^}]*\}/)?.[0] ?? '';
        expect(title).toMatch(/display:\s*-webkit-box\s*!important/);
        expect(title).toMatch(/-webkit-line-clamp:\s*3\s*!important/);
        expect(title).toMatch(/-webkit-box-orient:\s*vertical\s*!important/);
        expect(title).toMatch(/overflow:\s*hidden\s*!important/);
        // Not shrunk to the 2-line slot: a third line keeps its height and rises above it.
        expect(title).toMatch(/flex:\s*0 0 auto\s*!important/);
        expect(title).toMatch(/text-wrap:\s*balance/);
        expect(title).toMatch(/text-shadow:\s*0 4px 30px rgba\(0,0,0,\.4\)/);
        expect(title).toMatch(/font-size:\s*58px/);
        // Room for descenders and the shadow inside the clip, cancelled by equal negative margins (layout stays 116 tall).
        expect(title).toMatch(/padding:\s*16px\s*!important/);
        expect(title).toMatch(/margin:\s*-16px\s*!important/);
        expect(TITLE_BLOCK.titleLines).toBe(2);
        expect(TITLE_BLOCK.maxTitleLines).toBe(3);
    });
    describe('title block: fixed from the eyebrow down, the title grows upward', () => {
        it('order is title slot, eyebrow, chips, actions, each 18 apart (actions add their 8 margin)', () => {
            const two = titleBlockLayout(2);
            expect(two.slotTop).toBe(118);
            expect(two.titleTop).toBe(118);
            expect(two.eyebrowTop).toBe(118 + 116 + 18); // 252
            expect(two.chipsTop).toBeCloseTo(252 + 14.4 + 18, 5); // 284.4
            expect(two.actionsTop).toBeCloseTo(284.4 + 69 + 18 + 8, 5); // 379.4
            expect(two.bottom).toBeCloseTo(433.4, 5);
        });
        it('a one-line title only moves the title down inside its slot: eyebrow, chips and actions do not move', () => {
            const one = titleBlockLayout(1);
            const two = titleBlockLayout(2);
            expect(one.titleTop).toBe(two.titleTop + 58);
            expect(one.eyebrowTop).toBe(two.eyebrowTop);
            expect(one.chipsTop).toBe(two.chipsTop);
            expect(one.actionsTop).toBe(two.actionsTop);
            expect(one.bottom).toBe(two.bottom);
        });
        it('a three-line title rises one line above the slot, leaving the rest where it is; clamps to 1..3 lines', () => {
            const two = titleBlockLayout(2);
            const three = titleBlockLayout(3);
            expect(three.titleTop).toBe(two.titleTop - 58);
            expect(three.eyebrowTop).toBe(two.eyebrowTop);
            expect(three.bottom).toBe(two.bottom);
            expect(titleBlockLayout(9)).toEqual(three);
            expect(titleBlockLayout(0)).toEqual(titleBlockLayout(1));
            expect(titleBlockLayout(NaN)).toEqual(titleBlockLayout(1));
        });
        it('a three-line title still starts below the 52 px safe area on every screen, with the stack shift', () => {
            for (const h of [800, 466 / (828 / 1440), 810.75]) {
                expect(titleBlockLayout(3).titleTop + stackShift(h)).toBeGreaterThanOrEqual(52);
            }
        });
        it('worst case (2-line title) clears Steam\'s 52 px top bar on every screen, with the stack shift', () => {
            for (const h of [800, 466 / (828 / 1440), 810.75]) {
                // Its bleed (16) is for descenders and the shadow; the glyphs start at the slot top.
                expect(titleBlockLayout(2).titleTop + stackShift(h) - TITLE_BLOCK.titleBleed).toBeGreaterThan(52 + 40);
            }
        });
        it('the CSS: a 116-tall slot aligning the title to its bottom, a one-line eyebrow, a fixed-height chip row', () => {
            const css = homeCss();
            expect(css).toMatch(/\.gh-title-slot\s*\{[^}]*height:\s*116px\s*!important[^}]*justify-content:\s*flex-end/);
            expect(css).toMatch(/\.gh-eyebrow\s*\{[^}]*white-space:\s*nowrap[^}]*text-overflow:\s*ellipsis/);
            expect(css).toMatch(/\.gh-chips\s*\{[^}]*height:\s*69px\s*!important[^}]*flex-wrap:\s*nowrap/);
        });
    });
    it('the tallest title block (2-line title) ends above the recents glow at both card scales', () => {
        // 118 + eyebrow 14.4 + 18 + title 2 x 58 + 18 + chips 69 + 18 + 8 + 54 = 433.4
        expect(titleBlockBottom()).toBeCloseTo(433.4, 5);
        // Glow top = row top - 12 x scale (blur 40 - offset 16 - spread 12) - the 1px ring.
        const hand = recentsGlowTop(recentsGeometry(CARD_SCALE_HANDHELD));
        const dock = recentsGlowTop(recentsGeometry(CARD_SCALE_DOCKED));
        expect(hand).toBeCloseTo(464 - 19.2 - 1, 5); // 443.8, 10.4 below the actions (433.4)
        expect(dock).toBeCloseTo(464 - 19.2 - 1, 5); // 443.8
        expect(titleBlockBottom()).toBeLessThan(dock);
        expect(titleBlockBottom()).toBeLessThan(hand);
        // The CSS uses the same metrics.
        const css = homeCss();
        expect(css).toMatch(/\.gh-title-block\s*\{[^}]*top:\s*calc\(118px - var\(--gh-top\)\)[^}]*gap:\s*18px/);
        expect(css).toMatch(/\.gh-actions\s*\{[^}]*margin:\s*8px 0 0 0/);
        expect(css).toMatch(/\.gh-btn\s*\{[^}]*height:\s*54px/);
        expect(homeCss(CARD_SCALE_DOCKED)).toMatch(/\.gh-cap\.gh-cap-focus\s*\{[^}]*0 25\.6px 64px -19\.2px var\(--glance-accent\)/);
    });
    describe('stackShift: the whole Home stack moves down into the bottom slack', () => {
        // Tab strip 700 + 33.6 (padding 8 + 10, 13px at line-height 1.2) = 733.6; it ends 18 above the 46 legend reserve.
        it('pins the tab strip metrics', () => {
            expect(FEED_SHEET.tabsTop).toBe(700);
            expect(FEED_SHEET.tabHeight).toBeCloseTo(33.6, 5);
            expect(FEED_SHEET.legendReserve).toBe(46);
            expect(FEED_SHEET.tabClearance).toBe(18);
            expect(FEED_SHEET.raise).toBe(440);
        });
        it('per screen: 1080p TV / Ally 16:9 (canvas 1440 x 810.75) 13, handheld 828x466 (810.4) 12, Deck 1280x800 (800) 2', () => {
            expect(stackShift(810.75)).toBe(13); // docked, probed: root 1500 x 844.5 at scale 1.0417
            expect(stackShift(466 / (828 / 1440))).toBe(12);
            expect(stackShift(810)).toBe(12);
            expect(stackShift(800)).toBe(2);
        });
        it('the tab strip then ends 18-19 above the legend reserve (about 24 above Steam\'s real 40 px legend docked)', () => {
            for (const h of [800, 810, 810.75]) {
                const gap = h - FEED_SHEET.legendReserve - (FEED_SHEET.tabsTop + FEED_SHEET.tabHeight + stackShift(h));
                expect(gap).toBeGreaterThanOrEqual(18);
                expect(gap).toBeLessThan(19);
            }
        });
        it('never moves up, is bounded, and tolerates broken input', () => {
            expect(stackShift(700)).toBe(0);
            expect(stackShift(5000)).toBe(MAX_STACK_SHIFT);
            expect(stackShift(NaN)).toBe(0);
            expect(stackShift(-1)).toBe(0);
        });
        it('the CSS moves the page as one unit and the raised sheet keeps its old place (rise 440 + shift)', () => {
            const css = homeCss();
            expect(css).toMatch(/\.gh-root\s*\{[^}]*--gh-shift:\s*0px/);
            expect(css).toMatch(/\.gh-page\s*\{[^}]*top:\s*calc\(var\(--gh-shift\) \+ var\(--gh-give, 0px\)\)\s*!important[^}]*height:\s*100%/);
            expect(css).toMatch(/\.gh-page\.gh-page-up\s*\{[^}]*transform:\s*translateY\(calc\(-1 \* var\(--gh-raise, 440px\) - var\(--gh-shift\) - var\(--gh-give, 0px\)\)\)/);
            expect(css).toMatch(/\.gh-tabs\s*\{[^}]*top:\s*calc\(700px - var\(--gh-top\)\)/);
        });
        it('Home handles a finger itself: no browser panning, and a dragged feed row follows the finger', () => {
            const css = homeCss();
            expect(css).toMatch(/\.gh-root\s*\{[^}]*touch-action:\s*none\s*!important/);
            expect(css).toMatch(/\.gh-feed-track\.gh-feed-drag\s*\{[^}]*transition:\s*none\s*!important/);
        });
        it('the tabs take taps only with the sheet up: at rest they are out of sight under the games row', () => {
            const css = homeCss();
            expect(css).toMatch(/\.gh-tabs\s*\{[^}]*pointer-events:\s*none\s*!important/);
            expect(css).toMatch(/\.gh-page-up \.gh-tabs\s*\{[^}]*pointer-events:\s*auto\s*!important/);
        });
        it('with the largest shift the title block still clears the top bar and the raised cards clear the legend', () => {
            for (const h of [800, 810, 810.75]) {
                const shift = stackShift(h);
                expect(TITLE_BLOCK.top + shift).toBeGreaterThan(52 + 40);
                // Raised: cards 756 + shift - (440 + shift) = 316, 260 tall: end 576, far above the legend.
                expect(756 + 260 + shift - (FEED_SHEET.raise + shift)).toBeLessThan(h - FEED_SHEET.legendReserve);
            }
        });
    });
    it('hero Fit: the art fill behind, the whole art at the top with its fade; Fill unchanged', () => {
        const css = homeCss();
        const body = (sel: string) => (css.match(new RegExp(`(^|\\n)\\s*${sel.replace(/[.()[\]:]/g, '\\$&')}\\s*\\{([^}]*)\\}`)) ?? [])[2] ?? '';
        expect(body('.gh-hero-full.gh-hero-fit')).toMatch(/isolation:\s*isolate/);
        const fill = body('.gh-hero-full.gh-hero-fit::before');
        for (const part of ['inset: -120px', 'background-image: inherit', 'background-size: cover', `filter: ${ART_FILL_FILTER}`]) expect(fill).toContain(part);
        const art = body('.gh-hero-full.gh-hero-fit::after');
        for (const part of ['inset: 0', 'background-image: inherit', 'background-size: contain', 'background-position: center top', '-webkit-mask-image: var(--gh-hero-mask)']) expect(art).toContain(part);
        expect(body('.gh-hero-full')).toContain('background-size: cover');
        expect(body('.gh-hero-full')).toContain('background-position: center 30%');
    });
    it("hero Fit: another game's hero fades in with Fit's framing; without Fit as before", () => {
        const css = homeCss();
        const body = (sel: string) => (css.match(new RegExp(`(^|\\n)\\s*${sel.replace(/[.()[\]:]/g, '\\$&')}\\s*\\{([^}]*)\\}`)) ?? [])[2] ?? '';
        const open = body('.gh-fit .gh-hero-open');
        expect(open).toMatch(/isolation:\s*isolate/);
        expect(open).toMatch(/background-image:\s*none/);
        const fill = body('.gh-fit .gh-hero-open::before');
        for (const part of ['background-image: var(--gho-hero', 'background-size: cover', `filter: ${ART_FILL_FILTER}`, 'inset: -120px']) expect(fill).toContain(part);
        const art = body('.gh-fit .gh-hero-open::after');
        for (const part of ['background-image: var(--gho-hero', 'background-size: contain', 'background-position: center top', '-webkit-mask-image: var(--gho-hero-mask)']) expect(art).toContain(part);
        expect(body('.gh-hero-open')).toContain('background-size: cover');
    });
    it("Steam's own controller and gear icons are drawn at the page's size", () => {
        expect(homeCss()).toMatch(new RegExp(`\\.gh-steam-icon svg\\s*\\{[^}]*width:\\s*${PAGE_LAYOUT.circleIcon}px[^;]*;\\s*height:\\s*${PAGE_LAYOUT.circleIcon}px`));
    });
    it('the cloud circle is the same circle as the others: a white cloud with a halo, its state in a badge at the top right (#64)', () => {
        const css = homeCss();
        expect(css).not.toMatch(/\.gh-btn-cloud\s*\{/);
        expect(css).toMatch(/\.gh-btn-cloud svg\s*\{[^}]*width:\s*26px[^}]*drop-shadow/);
        for (const [tone, colour] of Object.entries(CLOUD_COLOURS)) {
            expect(css).toMatch(new RegExp(`\\.gh-btn-cloud\\.gh-cloud-${tone}\\s*\\{\\s*--gh-cloud-dot:\\s*${colour}`));
        }
        expect(css).not.toMatch(/\.gh-btn-cloud\.gh-cloud-ok\s*\{[^}]*color:\s*#5cf2b4/);
        expect(css).toMatch(/\.gh-btn-cloud:not\(\.gh-cloud-uni\)\s*\{[^}]*position:\s*relative/);
        expect(css).toMatch(
            new RegExp(
                `\\.gh-btn-cloud:not\\(\\.gh-cloud-uni\\)::after\\s*\\{[^}]*content:\\s*""[^}]*top:\\s*${CLOUD_DOT.inset}px[^}]*right:\\s*${CLOUD_DOT.inset}px[^}]*width:\\s*${CLOUD_DOT.size}px[^}]*height:\\s*${CLOUD_DOT.size}px[^}]*border-radius:\\s*50%[^}]*background:\\s*var\\(--gh-cloud-dot\\)[^}]*border:\\s*${CLOUD_DOT.ring}px solid ${CLOUD_DOT.ringColour.replace(/[().]/g, '\\$&')}`,
            ),
        );
    });
    it('feed rows: card height from the row (inline variable), rows and their header placed inline, compact wide cards', () => {
        const css = homeCss();
        expect(css).toMatch(/\.gh-card \{[^}]*height: var\(--gh-card-h, 260px\) !important/);
        expect(css).not.toMatch(/\.gh-feed \{[^}]*height:/);
        expect(css).toMatch(/\.gh-feed-row \{[^}]*position: absolute/);
        expect(css).toMatch(/\.gh-feed-row-title \{[^}]*height: 24px[^}]*text-transform: uppercase[^}]*color: rgba\(255,255,255,\.62\) !important; \}/);
        expect(css).toMatch(/\.gh-card-wide \.gh-card-title \{[^}]*font-size: 14px/);
    });
    it('card and capsule edges are drawn over the art (no border beside it), so no bright bottom row can show', () => {
        const css = homeCss();
        for (const sel of ['gh-card', 'gh-cap']) {
            expect(css).toMatch(new RegExp(`\\.${sel} \\{[^}]*border: none !important`));
            expect(css).toMatch(new RegExp(`\\.${sel}::after \\{[^}]*content: '' !important[^}]*inset: 0 !important[^}]*border-radius: inherit[^}]*pointer-events: none[^}]*box-shadow: inset 0 0 0 1px var\\(--gh-edge\\)`));
        }
        // The same edge colours as before, now as --gh-edge.
        expect(css).toMatch(/\.gh-card \{[^}]*--gh-edge: rgba\(255,255,255,\.1\)/);
        expect(css).toMatch(/\.gh-card\.gh-card-focus, \.gh-card:focus \{[^}]*--gh-edge: rgba\(255,255,255,\.3\)/);
        expect(css).toMatch(/\.gh-cap \{[^}]*--gh-edge: rgba\(255,255,255,\.08\)/);
        expect(css).toMatch(/\.gh-cap-sel \{\s*--gh-edge: rgba\(255,255,255,\.35\)/);
        expect(css).toMatch(/\.gh-ghost \{[^}]*--gh-edge: rgba\(255,255,255,\.06\)/);
        expect(css).not.toMatch(/\.gh-(card|cap)[^{]*\{[^}]*border-color/);
        // The shade reaches 1px past the art.
        expect(css).toMatch(/\.gh-card-shade \{[^}]*inset: -1px 0 !important/);
    });
    it('trending cards: small overlapping friend avatars top right, "+N" pill', () => {
        const css = homeCss();
        expect(css).toMatch(/\.gh-card-friends \{[^}]*position: absolute !important[^}]*right: 10px[^}]*top: 10px/);
        expect(css).toMatch(/\.gh-card-friend \{[^}]*width: 24px[^}]*border-radius: 3px/);
        expect(css).toMatch(/\.gh-card-friend-more \{[^}]*width: auto/);
    });
    it('news art is fitted whole: contained at the top (centred on the featured card) over a blurred cover copy', () => {
        const css = homeCss();
        expect(css).toMatch(/\.gh-card-fit-blur \{[^}]*inset: -28px[^}]*background-size: cover[^}]*filter: blur\(24px\)/);
        expect(css).toMatch(/\.gh-card-fit \{[^}]*inset: 0[^}]*background-size: contain[^}]*background-position: center top/);
        expect(css).toMatch(/\.gh-card-featured \.gh-card-fit \{\s*background-position: center/);
        expect(css).toMatch(/\.gh-card-fitted \.gh-card-title \{\s*-webkit-line-clamp: 2/);
    });
    it('friend card placeholder: blurred, darkened avatar backdrop, faint presence tint, accent gradient without an avatar', () => {
        const css = homeCss();
        expect(css).toMatch(/\.gh-card-backdrop \{[^}]*inset: -28px[^}]*background-size: cover[^}]*filter: blur\(28px\) saturate\(\.55\) brightness\(\.5\)/);
        expect(css).toMatch(/\.gh-card-backdrop-none \{[^}]*filter: none[^}]*linear-gradient\(160deg, color-mix\(in srgb, var\(--gh-card-accent\) 38%/);
        expect(css).toMatch(/\.gh-card-tint-online \{\s*background: rgba\(140,214,29,0\.12\)/);
        expect(css).toMatch(/\.gh-card-tint-away \{\s*background: rgba\(76,180,255,0\.12\)/);
        expect(hexAlpha('#4cb4ff', 0.5)).toBe('rgba(76,180,255,0.5)');
    });
    it('friend pictures are squares with slightly rounded corners (as Steam), rings and outlines follow the corners', () => {
        const css = homeCss();
        expect(css).toMatch(/\.gh-avatar \{[^}]*width: 42px[^}]*height: 42px[^}]*border-radius: 5px !important/);
        expect(css).toMatch(/\.gh-avatar-img \{[^}]*border-radius: inherit/);
        expect(css).toMatch(/\.gh-card-friend \{[^}]*border-radius: 3px !important[^}]*box-shadow: 0 0 0 2px/);
        expect(css).not.toMatch(/\.gh-(avatar|card-friend)[^{]*\{[^}]*border-radius: 50%/);
    });
    it('the Friends tab count: faded with nobody online, the online green (not the accent) with anyone connected', () => {
        const css = homeCss();
        expect(css).toMatch(/\.gh-tab-count \{[^}]*color: rgba\(255,255,255,\.4\) !important/);
        expect(css).toMatch(/\.gh-tab-count\.gh-tab-count-on \{\s*color: #8cd61d !important/);
        expect(css).not.toMatch(/\.gh-tab-count[^{]*\{[^}]*--glance-accent/);
    });
    it('friend avatars: green ring online or in game, Steam\'s away blue away, offline no ring and dimmed', () => {
        const css = homeCss();
        expect(css).toMatch(/\.gh-card-ring-online \{\s*--gh-ring: #8cd61d/);
        expect(css).toMatch(/\.gh-card-ring-away \{\s*--gh-ring: #4cb4ff/);
        expect(css).toMatch(/\.gh-card-offline \.gh-avatar \{[^}]*box-shadow: none !important[^}]*opacity: \.55/);
        expect(css).not.toMatch(/\.gh-card-ingame \{[^}]*--gh-ring/);
    });
});

describe('family pill on Home', () => {
    it('sits just left of the store pill (inside it, so it follows it), drawn like it', () => {
        const css = homeCss();
        const rule = css.match(/\.gh-family\s*\{[^}]*\}/)?.[0] ?? '';
        expect(rule).toMatch(/position: absolute !important; right: calc\(100% \+ 10px\) !important; top: 50% !important; transform: translateY\(-50%\);/);
        expect(rule).toContain(sourcePillLook((n) => `${n}px`).split(';')[0]);
        expect(css).toMatch(/\.gh-family-icon\s*\{/);
    });
});

describe('homeCss open transition', () => {
    /** Each rule as [selector list, body]. */
    const rules = (css: string): Array<[string, string]> => {
        const out: Array<[string, string]> = [];
        const re = /([^{}]+)\{([^{}]*)\}/g;
        let m: RegExpExecArray | null;
        const flat = css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
        while ((m = re.exec(flat)) !== null) out.push([m[1].trim(), m[2]]);
        return out;
    };
    const css = homeCss();

    it('moves the title block by its variable once the motion starts', () => {
        const title = rules(css).find(([sel]) => sel.includes('[data-gh-opening="morph"][data-gh-phase="to"] .gh-title-slot'));
        expect(title?.[1]).toContain('transform: var(--gho-title)');
    });
    it('animates only transform and opacity while opening', () => {
        const opening = rules(css).filter(([sel]) => sel.includes('data-gh-opening'));
        expect(opening.length).toBeGreaterThan(10);
        for (const [sel, body] of opening) {
            for (const m of body.matchAll(/transition:\s*([^;]+)/g)) {
                const props = m[1].split(/,(?![^(]*\))/).map((p) => p.trim().split(/\s+/)[0]);
                // (translate: the individual transform property, composited as transform is; the twins' glide in the bridge.)
                for (const p of props) expect(['transform', 'translate', 'opacity', 'none'], `${sel}: ${m[1]}`).toContain(p);
            }
        }
    });
    it('the Play label needs no copy while opening: it is white on Home and on the page', () => {
        const all = rules(css);
        expect(all.some(([sel]) => sel.includes('data-gh-opening') && sel.endsWith('.gh-btn-label::after'))).toBe(false);
    });
    it("a chip's bar moves onto the page's when the morph gives it a place, and fades otherwise", () => {
        const all = rules(css);
        const bar = all.find(([sel]) => sel.includes('data-gh-phase="to"') && sel.endsWith('.gh-chip:nth-child(3) .gh-chip-bar'));
        expect(bar?.[1]).toContain('transform: var(--gho-chip-2-bar, none)');
        expect(bar?.[1]).toContain('opacity: var(--gho-chip-2-bar-o, 0)');
        expect(all.some(([sel, body]) => sel.includes('data-gh-opening') && sel.includes('.gh-chip-bar') && /transform-origin:\s*0 0/.test(body))).toBe(true);
    });
    it("the morph ends on the page's own look: the glass is the page's tint and blur, the pill its exact round shape", () => {
        const all = rules(css);
        const body = (pred: (sel: string) => boolean) => all.filter(([sel]) => pred(sel)).map(([, b]) => b).join(' ');
        const settleAt = Math.round(((OPEN_TIMINGS.morph - OPEN_TIMINGS.settle) / OPEN_TIMINGS.morph) * 100000) / 1000;
        // The glass: the page panel's tint and blur from the start (Michael, on the Ally: moving blurred felt more seamless
        // than a blur growing in after the hand-over). 16 canvas px, the page's 16 d units.
        const shell = body((sel) => sel === '.gh-open-shell');
        expect(shell).toMatch(/background:\s*rgba\(12,16,22,\.38\)/);
        expect(shell).toContain('backdrop-filter: blur(16px)');
        // No backdrop blur on a pseudo-element of the panel (it would see nothing behind it); its ::before draws only the ring.
        expect(all.some(([sel, b]) => sel.includes('.gh-open-shell::') && b.includes('backdrop-filter'))).toBe(false);
        // The pill: the page's focused pill at its exact size, faded in as the stretched layer stops.
        const pill = body((sel) => sel.includes('data-gh-opening="morph"') && !sel.includes('data-gh-phase') && sel.endsWith('[data-action="play"]::after'));
        expect(pill).toContain('width: calc((100% + 2px) * var(--gho-play-sx))');
        expect(pill).toContain('height: calc((100% + 2px) * var(--gho-play-sy))');
        expect(pill).toContain('top: calc(var(--gho-play-dy) - 1px)');
        expect(pill).not.toContain('transform: var(--gho-play-bg)');
        expect(body((sel) => sel.includes('data-gh-phase="to"') && sel.endsWith('[data-action="play"]::after'))).toContain(`animation: gh-open-settle ${OPEN_TIMINGS.morph}ms linear both`);
        expect(css).toContain(`@keyframes gh-open-settle { 0%, ${settleAt}% { opacity: 0; animation-timing-function: ease-in-out; } 100% { opacity: 1; } }`);
    });
    it("a chip's label can fade on its own, and an accent copy of its value (data-text) can fade in over it", () => {
        const all = rules(css);
        const label = all.find(([sel]) => sel.includes('data-gh-phase="to"') && sel.endsWith('.gh-chip:nth-child(3) .gh-chip-label'));
        expect(label?.[1]).toContain('opacity: var(--gho-chip-2-label-o, var(--gho-chip-2-o, 0))');
        const copy = all.find(([sel]) => sel.includes('data-gh-opening') && !sel.includes('data-gh-phase') && sel.endsWith('.gh-chip-value::after'));
        expect(copy?.[1]).toMatch(/content:\s*attr\(data-text\)/);
        expect(copy?.[1]).toContain('color: var(--glance-accent-text)');
        expect(copy?.[1]).toMatch(/opacity:\s*0/);
        const lit = all.find(([sel]) => sel.includes('data-gh-phase="to"') && sel.endsWith('.gh-chip:nth-child(3) .gh-chip-value::after'));
        expect(lit?.[1]).toContain('opacity: var(--gho-chip-2-accent, 0)');
    });
    it("a game that can be streamed: the Play pill ends in the page's arrow segment (Home's size), and a focusable arrow over it", () => {
        const all = rules(css);
        const seg = all.find(([sel]) => sel === '.gh-btn-play > .gh-play-arrow');
        expect(seg?.[1]).toMatch(new RegExp(`position: absolute[^;]*;[^]*right: -1px[^]*width: ${HOME_PILL.arrow}px[^]*border-left: 1px solid rgba\\(4,17,12,\\.25\\)`));
        expect(css).toMatch(new RegExp(`\\.gh-play-arrow svg\\s*\\{[^}]*width: ${HOME_PILL.arrowGlyph}px`));
        // The arrow button lies over the segment (the row's gap pulled back), with no ring or growth of its own: focused,
        // the segment lights as the page's does.
        const btn = all.find(([sel]) => sel === '.gh-actions > .gh-btn-stream');
        expect(btn?.[1]).toMatch(new RegExp(`width: ${HOME_PILL.arrow}px[^]*margin-left: -${HOME_PILL.arrow + 12}px[^]*background: transparent`));
        // Nothing of its own over the pill: a button's glass blur here blurred the segment away (device, 8e90058).
        expect(btn?.[1]).toMatch(/backdrop-filter: none/);
        expect(btn?.[1]).toMatch(/border: none/);
        const focus = all.find(([sel]) => sel.split(', ')[0] === ':where(html:not([data-gg-mouse])) .gh-actions > .gh-btn-stream.gh-focus');
        expect(focus?.[1]).toMatch(/background: transparent[^]*box-shadow: none[^]*transform: none/);
        // Focused, the whole pill shows Home's focus (as the page's pill does for its arrow), and the segment is tinted.
        const pill = all.find(([sel]) => sel.split(', ')[0] === ':where(html:not([data-gg-mouse])) .gh-actions > .gh-btn-play:has(+ .gh-btn-stream.gh-focus)');
        const hp = pillFocusScale(HOME_PILL.width, TITLE_BLOCK.button);
        expect(pill?.[1]).toMatch(new RegExp(`box-shadow: 0 0 0 2px rgba\\(255,255,255,\\.9\\)[^]*transform: scale\\(${hp.x}, ${hp.y}\\)`));
        const tint = all.find(([sel]) => sel.split(', ')[0] === ':where(html:not([data-gg-mouse])) .gh-actions > .gh-btn-play:has(+ .gh-btn-stream.gh-focus) > .gh-play-arrow');
        expect(tint?.[1]).toMatch(/background: rgba\(255,255,255,\.28\)/);
        // Opening: the segment moves with the pill and grows onto the page's (openMotion --gho-play-arrow), about its right end.
        expect(all.some(([sel, body]) => sel.includes('data-gh-phase="to"') && sel.endsWith('.gh-play-arrow') && body.includes('transform: var(--gho-play-arrow)'))).toBe(true);
        expect(all.some(([sel, body]) => sel.includes('data-gh-opening') && !sel.includes('data-gh-phase') && sel.endsWith('.gh-play-arrow') && /transform-origin:\s*100% 50%/.test(body))).toBe(true);
        // The arrow button itself fades with the info button.
        expect(all.some(([sel, body]) => sel.includes('data-gh-phase="to"') && sel.endsWith('.gh-btn-stream') && /opacity:\s*0/.test(body))).toBe(true);
    });
    it("the cloud's state badge takes its circle's counter-scale about its top-right corner, so it stays the page's size and on the corner (#64)", () => {
        const all = rules(css);
        for (const i of [0, 1, 2, 3]) {
            const badge = all.find(([sel]) => sel.includes('data-gh-phase="to"') && sel.endsWith(`.gh-btn-circle:nth-child(${i + 1} of .gh-btn-circle).gh-btn-cloud:not(.gh-cloud-uni)::after`));
            expect(badge?.[1]).toContain(`transform: var(--gho-circle-icon-${i}, none)`);
        }
        expect(all.some(([sel, body]) => sel.includes('data-gh-opening') && !sel.includes('data-gh-phase') && sel.endsWith('.gh-btn-cloud:not(.gh-cloud-uni)::after') && /transform-origin:\s*100% 0/.test(body))).toBe(true);
    });
    it("a circle's icon takes the counter-scale about its centre while the circle grows", () => {
        const all = rules(css);
        // Picked among the circles (openHome measures .gh-btn-circle in order), so the stream arrow before them shifts nothing.
        const icon = all.find(([sel]) => sel.includes('data-gh-phase="to"') && sel.endsWith('.gh-btn-circle:nth-child(2 of .gh-btn-circle) > .gh-btn-icon'));
        expect(icon?.[1]).toContain('transform: var(--gho-circle-icon-1, none)');
        expect(all.some(([sel, body]) => sel.includes('data-gh-opening') && !sel.includes('data-gh-phase') && sel.includes('.gh-btn-circle > .gh-btn-icon') && /transform-origin:\s*50% 50%/.test(body))).toBe(true);
        // The cloud's icon is the page's size too (PAGE_LAYOUT.cloudIcon, on both).
        expect(css).toMatch(new RegExp(`\\.gh-btn-cloud svg\\s*\\{[^}]*width:\\s*${PAGE_LAYOUT.cloudIcon}px`));
    });
    it("Home shades its art as the game page does, at rest (Michael: Cronos's page shading, by default), so opening never changes it", () => {
        const all = rules(css);
        const page = all.find(([sel]) => sel === '.gh-scrim-page');
        // Steam's own top shadow on the page (its header's TopGradient, 75 px, probed on the Ally), then the restyle's layers.
        expect(page?.[1]).toContain(`background: ${STEAM_TOP_GRADIENT}, ${PAGE_SCRIMS}`);
        expect(STEAM_TOP_GRADIENT).toBe('linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0px, rgba(0, 0, 0, 0) 75px)');
        expect(page?.[1]).not.toMatch(/opacity:\s*0/);
        // Home's own gradients are gone, and nothing about the shading changes while opening.
        expect(all.some(([sel]) => sel.includes('.gh-scrim-v') || sel.includes('.gh-scrim-l'))).toBe(false);
        expect(all.some(([sel]) => sel.includes('data-gh-opening') && sel.includes('.gh-scrim-page'))).toBe(false);
        // No dimming at rest (the page has none); the feed sheet still dims (SpotlightHome's DIM_SHEET).
        expect(all.find(([sel]) => sel === '.gh-root')?.[1]).toMatch(/--gh-dim:\s*0;/);
    });
    it("the extras layer (the description, the HowLongToBeat card's rest) is hidden at rest and shown, part by part, only by a morph", () => {
        const all = rules(css);
        expect(all.find(([sel]) => sel === '.gh-open-extras')?.[1]).toContain('display: none');
        const shown = all.find(([sel]) => sel === '.gh-root[data-gh-opening="morph"][data-gh-extras] .gh-open-extras')?.[1];
        expect(shown).toContain('display: block');
        // Hidden by its own (soft) opacity until the morph's late fade shows it.
        expect(css).toContain('.gh-open-extras { opacity: 0; }');
        for (const part of ['desc', 'hltb']) {
            expect(all.find(([sel]) => sel === `.gh-open-extras .gh-x-${part}`)?.[1], part).toContain('display: none');
            expect(all.some(([sel, body]) => sel === `.gh-root[data-gh-extras~="${part}"] .gh-x-${part}` && body.includes('display'))).toBe(true);
        }
    });
    it("the extras layer's store pill is the page's: its look in the page's d unit, right-aligned at its place, the family pill in it", () => {
        const all = rules(css);
        const body = (sel: string) => all.find(([s]) => s === sel)?.[1] ?? '';
        const dd = (n: number) => `calc(${n}px * var(--gho-x-d))`;
        expect(body('.gh-x-pill')).toContain(sourcePillLook(dd).split(';')[1].trim());
        for (const decl of ['left: var(--gho-x-pill-x)', 'top: var(--gho-x-pill-y)', 'transform: translateX(-100%)']) expect(body('.gh-x-pill')).toContain(decl);
        expect(body('.gh-x-family')).toContain(`right: calc(100% + ${dd(10)})`);
        expect(all.some(([sel, b]) => sel === '.gh-root[data-gh-extras~="pills"] .gh-x-pill' && b.includes('display: inline-flex'))).toBe(true);
        expect(body('.gh-x-pill')).toContain('var(--gho-x-pill-from');
        const mover = body('.gh-root[data-gh-opening="morph"][data-gh-phase="to"] .gh-x-pill');
        expect(mover).toContain('transform: translateX(-100%)');
        expect(mover).toContain(`transform ${OPEN_TIMINGS.morph}ms`);
        // Home's own pill (moving into place) fades out as the page's fades in, still moving.
        const home = body('.gh-root[data-gh-opening="morph"][data-gh-phase="to"][data-gh-extras~="pills"] .gh-source');
        expect(home).toContain(`animation: gh-open-pill-out ${OPEN_TIMINGS.morph}ms linear both`);
        expect(home).toMatch(/transition: transform \d+ms cubic-bezier\([^)]*\)/);
    });
    it("the extras layer's Unifideck size column: hidden unless Home drew it, at its place, in the page's value size", () => {
        const all = rules(css);
        const body = (sel: string) => all.find(([s]) => s === sel)?.[1] ?? '';
        expect(body('.gh-open-extras .gh-x-size')).toContain('display: none');
        for (const decl of ['left: calc(var(--gho-x-size-x) - var(--gho-x-size-cx, 0px))', 'top: calc(var(--gho-x-size-y) - var(--gho-x-size-cy, 0px))']) expect(body('.gh-open-extras .gh-x-size')).toContain(decl);
        expect(all.some(([sel, b]) => sel === '.gh-root[data-gh-extras~="size"] .gh-x-size' && b.includes('display: flex'))).toBe(true);
        expect(body('.gh-open-extras .gh-x-size .gh-x-value')).toContain('font-size: var(--gho-x-size-font)');
    });
    it("the extras layer's Play time column: the page's label and value, at its place, in the page's value size", () => {
        const all = rules(css);
        const body = (sel: string) => all.find(([s]) => s === sel)?.[1] ?? '';
        expect(body('.gh-open-extras .gh-x-played')).toContain('display: none');
        for (const decl of ['left: calc(var(--gho-x-played-x) - var(--gho-x-played-cx, 0px))', 'top: calc(var(--gho-x-played-y) - var(--gho-x-played-cy, 0px))']) expect(body('.gh-open-extras .gh-x-played')).toContain(decl);
        expect(body('.gh-open-extras .gh-x-played .gh-x-value')).toContain('font-size: var(--gho-x-played-font)');
        expect(all.some(([sel, b]) => sel === '.gh-root[data-gh-extras~="played"] .gh-x-played' && b.includes('display: flex'))).toBe(true);
    });
    it('the extras fade in (opacity only) during the morph and are complete at the hand-over', () => {
        const to = rules(css).find(([sel]) => sel === '.gh-root[data-gh-opening="morph"][data-gh-phase="to"][data-gh-extras] .gh-open-extras')?.[1];
        // Over the whole morph, held at 0 until its last OPEN_TIMINGS.extras ms (see "delayed fades" below).
        expect(to).toContain(`animation: gh-open-extras-in ${OPEN_TIMINGS.morph}ms linear both`);
    });
    it("the extras are laid out as the page's cards, in the page's d unit (openMotion's --gho-x-d)", () => {
        const all = rules(css);
        const body = (sel: string) => all.find(([s]) => s === sel)?.[1] ?? '';
        const dd = (n: number) => `calc(${n}px * var(--gho-x-d))`;
        expect(body('.gh-open-extras .gh-x-desc')).toContain(`font-size: ${dd(PAGE_LAYOUT.cardText.desc)}`);
        expect(body('.gh-open-extras .gh-x-desc')).toContain(`-webkit-line-clamp: ${PAGE_LAYOUT.cardText.descLines}`);
        expect(body('.gh-open-extras .gh-x-hltb')).toContain(`gap: ${dd(PAGE_LAYOUT.cards.hltbGap)}`);
        expect(body('.gh-open-extras .gh-x-label')).toContain(`font-size: ${dd(PAGE_LAYOUT.stats.label)}`);
        expect(body('.gh-open-extras .gh-x-value')).toContain(`font-size: ${dd(PAGE_LAYOUT.stats.value)}`);
        expect(body('.gh-open-extras .gh-x-stats')).toContain(`gap: ${dd(PAGE_LAYOUT.stats.colGapHltb)}`);
        expect(body('.gh-open-extras .gh-x-bar')).toContain(`height: ${dd(PAGE_LAYOUT.cardText.bar)}`);
        expect(body('.gh-open-extras .gh-x-caption')).toContain(`font-size: ${dd(PAGE_LAYOUT.cardText.caption)}`);
        // Main's time is Home's chip, moving there: the layer keeps its place without drawing it.
        expect(body('.gh-open-extras .gh-x-stats > div:first-child .gh-x-value')).toContain('visibility: hidden');
    });
    it("the HowLongToBeat inside, Play time and size columns each sit in a layer at their page card's place, laid out inside it", () => {
        const all = rules(css);
        const body = (sel: string) => all.find(([s]) => s === sel)?.[1] ?? '';
        for (const n of ['hltb', 'played', 'size']) {
            const card = body(`.gh-open-extras .gh-x-card[data-for="${n}"]`);
            expect(card, n).toContain(`left: var(--gho-x-${n}-cx, 0px)`);
            expect(card, n).toContain(`top: var(--gho-x-${n}-cy, 0px)`);
            expect(card, n).toContain('will-change: transform');
            expect(body(`.gh-open-extras .gh-x-${n}`), n).toContain(`left: calc(var(--gho-x-${n}-x) - var(--gho-x-${n}-cx, 0px))`);
            expect(body(`.gh-open-extras .gh-x-${n}`), n).toContain(`top: calc(var(--gho-x-${n}-y) - var(--gho-x-${n}-cy, 0px))`);
        }
    });
    it("the extras' labels and caption have the page's line height, 'normal' (the font's own: 1.5 fit only at 16:9)", () => {
        const all = rules(css);
        const body = (sel: string) => all.find(([s]) => s === sel)?.[1] ?? '';
        expect(body('.gh-open-extras .gh-x-label')).toContain('line-height: normal');
        expect(body('.gh-open-extras .gh-x-caption')).toContain('line-height: normal');
        expect(body('.gh-open-extras .gh-x-value')).toContain('line-height: 1.2');
    });
    it('the glass panels are hidden until opening, and the second only when there are two', () => {
        const all = rules(css);
        expect(all.find(([sel]) => sel === '.gh-open-shell')?.[1]).toContain('display: none');
        expect(all.some(([sel]) => sel.includes('[data-gh-shells="2"]') && sel.includes('.gh-open-shell[data-i="1"]'))).toBe(true);
    });
});

describe('homeCss bridge', () => {
    it('nothing inside the bridge animates again (the hero layer would replay its fade-in)', () => {
        expect(homeCss()).toContain('.gh-root.gh-bridge, .gh-root.gh-bridge * { animation: none !important; transition: none !important; }');
    });
});

describe('homeCss logo', () => {
    it("leaves the logo's size to GameTitle's inline area sizing, as on the game page (an !important size here overrode it)", () => {
        const body = /\.gh-logo \{([^}]*)\}/.exec(homeCss())?.[1] ?? '';
        expect(body).not.toBe('');
        for (const prop of ['width', 'height', 'max-width', 'max-height']) expect(body, prop).not.toMatch(new RegExp(`(^|[;\\s])${prop}:`));
    });
});

describe('homeCss accent on hidden bars', () => {
    it('bars nobody sees take a new accent at once (no colour transition): an unselected card, the hidden feed and tabs', () => {
        const css = homeCss();
        // Each L1/R1 step changes the accent: these ran ~30 colour transitions a step, all invisible (measured on the Ally).
        expect(css).toMatch(/\.gh-cap:not\(\.gh-cap-focus\) \.gh-cap-bar \{ transition: opacity 250ms !important; \}/);
        expect(css).toMatch(/\.gh-card:not\(\.gh-card-focus\):not\(:focus\) \.gh-card-bar \{ transition: opacity 250ms !important; \}/);
        expect(css).toMatch(/\.gh-page:not\(\.gh-page-up\) \.gh-tab-line \{ transition: none !important; \}/);
    });
});

describe('statusCss', () => {
    it("one status bar at a time: while Home's is up, the page's (mounted later, on the same body) stays invisible", () => {
        // Two stacked bars drew their white text twice, brighter, as Home's frozen copy faded over them (Michael: it blinked white).
        expect(statusCss()).toMatch(/\.gg-status-host ~ \.gg-status-host \{[^}]*visibility: hidden/);
    });
});

describe('homeCss Play pill', () => {
    it('white words and glyph on the accent, as on the page', () => {
        const body = /\.gh-btn-play \{([^}]*background: var\(--glance-accent\)[^}]*)\}/.exec(homeCss())?.[1] ?? '';
        expect(body).toContain('color: #fff');
        expect(body).not.toContain('--gh-on-accent');
    });
    it("focused: a white ring and accent glow, scaled by the page's focus scale (the page focuses its Play the same)", () => {
        const body = /:where\(html:not\(\[data-gg-mouse\]\)\) \.gh-btn\.gh-focus, :where\(html:not\(\[data-gg-mouse\]\)\) \.gh-btn:focus \{([^}]*)\}/.exec(homeCss())?.[1] ?? '';
        expect(body).toContain('0 0 0 2px rgba(255,255,255,.9)');
        expect(body).toContain(`scale(${PAGE_LAYOUT.focusScale})`);
        // The Play pill grows by what a circle grows (its height's share), so its gap to the circles stays.
        const hp = pillFocusScale(HOME_PILL.width, TITLE_BLOCK.button);
        expect(/\.gh-actions > \.gh-btn-play\.gh-focus, :where\(html:not\(\[data-gg-mouse\]\)\) \.gh-actions > \.gh-btn-play\.gh-btn:focus \{([^}]*)\}/.exec(homeCss())?.[1] ?? '').toContain(`scale(${hp.x}, ${hp.y})`);
    });
});

describe('homeCss Play pill while opening', () => {
    it("takes on the page's focused look as the morph settles (Steam focuses Play there): a ring layer at the page pill's exact size", () => {
        const css = homeCss();
        const after = /\.gh-root\[data-gh-opening="morph"\] \.gh-actions > \.gh-btn\[data-action="play"\]::after \{([^}]*)\}/.exec(css)?.[1] ?? '';
        expect(after).toContain('box-shadow: 0 0 0 2px rgba(255,255,255,.9)');
        expect(css).toContain('.gh-root[data-gh-opening="morph"] .gh-actions > .gh-btn[data-action="play"]::after { opacity: 0; }');
        // The page's focused Play keeps its accent fill, as Home's (no lighter overlay any more).
        expect(after).toContain('background: var(--glance-accent)');
        expect(after).not.toContain('rgba(255,255,255,.28)');
        const to = /\[data-gh-phase="to"\] \.gh-actions > \.gh-btn\[data-action="play"\]::after \{([^}]*)\}/.exec(css)?.[1] ?? '';
        expect(to).not.toContain('transform');
        // Faded in by the late-fade animation, which holds it at 1 (its own value stays 0: see "delayed fades").
        expect(to).toContain('animation: gh-open-settle');
    });
});

describe('HOME_PILL arrow', () => {
    it("is the page's arrow at Home's pill height (54 against the page's 60), so its morph grows it evenly", () => {
        expect(HOME_PILL.arrow).toBe(Math.round((PAGE_LAYOUT.playArrow.w * 54) / PAGE_LAYOUT.icon));
        expect(HOME_PILL.arrowGlyph).toBe(Math.round((PAGE_LAYOUT.playArrow.glyph * 54) / PAGE_LAYOUT.icon));
    });
});

describe('the way back (B from a page)', () => {
    const css = homeCss(CARD_SCALE_HANDHELD);
    const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    it("Home's title, chips, buttons and row fade in over the art, which is there at once (opacity only)", () => {
        expect(css).not.toMatch(/\.gh-back \.gh-hero/);
        // From transparent to each part's own opacity (no end value: the tabs and bars that rest hidden stay hidden).
        expect(css).toMatch(/@keyframes gh-return-in \{ from \{ opacity: 0; \} \}/);
        expect(css).toMatch(new RegExp(`animation: gh-return-in ${RETURN_TIMINGS.fade}ms ease backwards`));
    });
    it('never as one layer: a fading parent cuts the glass inside it off from the art, which then shows unblurred until the fade ends', () => {
        expect(css).not.toMatch(/\.gh-back \.gh-safe\s*\{/);
        const glass = HOME_GLASS.join(', ');
        // The glass fades itself; around it, the largest parts that hold no glass fade, each once.
        expect(css).toMatch(new RegExp(`\\.gh-root:is\\(\\.gh-back, \\[data-gh-return\\]\\):not\\(\\.gh-bridge\\) \\.gh-safe :is\\(${esc(glass)}\\)[,\\s]`));
        expect(css).toMatch(new RegExp(`\\.gh-root:is\\(\\.gh-back, \\[data-gh-return\\]\\):not\\(\\.gh-bridge\\) :is\\(\\.gh-safe, \\.gh-safe :has\\(${esc(glass)}\\)\\) > :not\\(:has\\(${esc(glass)}\\)\\):not\\(${esc(glass)}\\)`));
    });
    it('a cancelled open (data-gh-return, openCancel.showCancelReturn) fades in exactly as the way back does', () => {
        expect(css).toMatch(/\.gh-root:is\(\.gh-back, \[data-gh-return\]\):not\(\.gh-bridge\) \.gh-safe :is\(/);
        expect(css).not.toMatch(/\.gh-root\.gh-back:not\(\.gh-bridge\)/);
    });
    it("HOME_GLASS lists every part of Home with a backdrop blur (the open transition's panels and extras, and the status bar, are outside .gh-safe)", () => {
        const blurred = [...css.matchAll(/([^{}]+)\{[^}]*backdrop-filter: blur/g)].map((m) => m[1].trim());
        expect(blurred.length).toBeGreaterThan(0);
        for (const sel of blurred) {
            if (['.gh-x-pill', '.gh-x-store-choice', '.gh-x-family', '.gh-normal-card', '.gh-clean-info', '.gh-open-shell', '.gh-open-extras', '.gh-open-circle', '.gh-status'].some((outside) => sel.includes(outside))) continue;
            const last = sel.split(',').map((p) => p.trim().split(/[\s>+~]+/).pop()!);
            for (const compound of last) expect(HOME_GLASS.some((g) => compound.includes(g)), sel).toBe(true);
        }
    });
});

describe('delayed fades in the open transition', () => {
    // On Steam's browser the GPU draws a delayed opacity transition at its end value during the delay (docked, Michael saw
    // the description and HowLongToBeat numbers over the game cards; the page's computed opacity read 0 meanwhile).
    const css = homeCss(CARD_SCALE_HANDHELD);
    const at = (delay: number) => Math.round(((OPEN_TIMINGS.morph - delay) / OPEN_TIMINGS.morph) * 100000) / 1000;
    it('no opacity transition waits (a delay after its duration)', () => {
        expect(css).not.toMatch(/opacity \d+ms [a-z-]+(?:\([^)]*\))? \d+ms/);
    });
    it('the extras fade in as a keyframe animation that holds them at 0 for the wait, complete at the hand-over', () => {
        expect(css).toContain(`@keyframes gh-open-extras-in { 0%, ${at(OPEN_TIMINGS.extras)}% { opacity: 0; animation-timing-function: ease-out; } 100% { opacity: 1; } }`);
        const rule = css.match(/\.gh-root\[data-gh-opening="morph"\]\[data-gh-phase="to"\]\[data-gh-extras\] \.gh-open-extras\s*\{[^}]*\}/)?.[0] ?? '';
        expect(rule).toContain(`animation: gh-open-extras-in ${OPEN_TIMINGS.morph}ms linear both`);
    });
    // The GPU draws an element's own value until its animation runs: with the end value as its own, the extras showed in
    // full over the cards for the first frames (docked).
    it("the start value is each element's own: extras 0, Home's pill 1, the settle layer 0", () => {
        const body = (re: RegExp) => css.match(re)?.[0] ?? '';
        expect(css).toContain('.gh-open-extras { opacity: 0; }');
        expect(body(/\.gh-root\[data-gh-opening="morph"\]\[data-gh-phase="to"\]\[data-gh-extras\] \.gh-open-extras\s*\{[^}]*\}/)).not.toContain('opacity');
        expect(body(/\.gh-root\[data-gh-opening="morph"\]\[data-gh-phase="to"\]\[data-gh-extras~="pills"\] \.gh-source\s*\{[^}]*\}/)).not.toContain('opacity');
        expect(body(/\.gh-root\[data-gh-opening="morph"\]\[data-gh-phase="to"\] \.gh-actions > \.gh-btn\[data-action="play"\]::after\s*\{[^}]*\}/)).not.toMatch(/opacity: 1/);
    });
    it("their own opacity is never !important: an animation cannot override an !important value (the extras and Play's ring stayed hidden through the morph, then popped in with the bridge)", () => {
        const opacities = (target: string) => [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
            .filter(([, sel]) => !sel.includes('gh-bridge') && sel.trim().endsWith(target))
            .map(([, sel, body]) => [sel.trim(), body.match(/opacity:[^;]*/)?.[0] ?? ''] as const)
            .filter(([, o]) => o !== '');
        for (const target of ['.gh-open-extras', '[data-action="play"]::after']) {
            const found = opacities(target);
            expect(found.length, target).toBeGreaterThan(0);
            for (const [sel, o] of found) expect(o, sel).not.toContain('!important');
        }
    });
    it("the bridge's freeze outranks every animation rule: the late fades and Home's way-back fade (opened soon after B)", () => {
        // Home's way-back fade never applies in the copy.
        expect(css).toMatch(/\.gh-root:is\(\.gh-back, \[data-gh-return\]\):not\(\.gh-bridge\)/);
        for (const target of ['\\.gh-open-extras', '\\.gh-source', '\\[data-action="play"\\]::after']) {
            expect(css).toMatch(new RegExp(`\\.gh-root\\.gh-bridge\\[data-gh-opening\\]\\[data-gh-phase\\][^{]*${target}\\s*\\{[^}]*animation: none`));
        }
    });
    it('the bridge (a frozen copy, nothing animates in it, pseudo-elements too) holds the end values', () => {
        expect(css).toContain('.gh-root.gh-bridge *::before, .gh-root.gh-bridge *::after { animation: none !important; transition: none !important; }');
        expect(css).toMatch(/\.gh-root\.gh-bridge\[data-gh-opening\]\[data-gh-phase\]\[data-gh-extras\] \.gh-open-extras\s*\{[^}]*opacity: 1/);
        expect(css).toMatch(/\.gh-root\.gh-bridge\[data-gh-opening\]\[data-gh-phase\]\[data-gh-extras~="pills"\] \.gh-source\s*\{[^}]*opacity: 0/);
        expect(css).toMatch(/\.gh-root\.gh-bridge\[data-gh-opening\]\[data-gh-phase\] \.gh-actions > \.gh-btn\[data-action="play"\]::after\s*\{[^}]*opacity: 1/);
    });
    it("Home's store pill fades out the same way, held at 1 for the wait", () => {
        expect(css).toContain(`@keyframes gh-open-pill-out { 0%, ${at(OPEN_TIMINGS.extras)}% { opacity: 1; animation-timing-function: ease-in; } 100% { opacity: 0; } }`);
    });
});

describe("a Unifideck game's cloud button (Unifideck's own look, as on its page)", () => {
    const css = homeCss(CARD_SCALE_HANDHELD);
    it("opening, its ring grows with the circle to Unifideck's 2 CSS px on the page (openMotion --gho-uni-ring)", () => {
        expect(css).toMatch(/\.gh-root\[data-gh-opening="morph"\] \.gh-btn-cloud\.gh-cloud-uni:not\(\.gh-focus\):not\(:focus\)\s*\{[^}]*box-shadow: 0 0 0 var\(--gho-uni-ring, 2px\) var\(--gh-uni-ring, transparent\) inset/);
    });
    it("Unifideck's trash circle: drawn at the page's fourth circle as Home's circles look, fading in late, held in the bridge", () => {
        const body = (sel: string) => {
            const i = css.indexOf(`${sel} {`);
            return i < 0 ? '' : css.slice(i, css.indexOf('}', i));
        };
        expect(body('.gh-open-circle')).toContain('display: none');
        expect(body('.gh-open-circle')).toContain('backdrop-filter: blur(12px)');
        const at = body('.gh-root[data-gh-opening="morph"] .gh-open-circle');
        for (const d of ['display: flex', 'left: calc(var(--gho-circle-extra-x) * 1px)', 'top: calc(var(--gho-circle-extra-y) * 1px)', 'width: calc(var(--gho-circle-extra-w) * 1px)']) expect(at).toContain(d);
        expect(body('.gh-root[data-gh-opening="morph"][data-gh-phase="to"] .gh-open-circle')).toContain('animation: gh-open-extras-in');
        expect(body('.gh-root.gh-bridge[data-gh-opening][data-gh-phase] .gh-open-circle')).toContain('opacity: 1');
        expect(body('.gh-open-circle svg')).toContain(`width: ${PAGE_LAYOUT.circleIcon}px`);
    });

    it('a white glyph at the circles\' glyph size, its state ring inside it (unless focused), dimmed without cloud support', () => {
        expect(css).toMatch(/\.gh-btn-cloud\.gh-cloud-uni\s*\{[^}]*color: #fff/);
        expect(css).toMatch(new RegExp(`\\.gh-btn-cloud\\.gh-cloud-uni svg\\s*\\{[^}]*width: ${PAGE_LAYOUT.circleIcon}px[^}]*filter: none`));
        expect(css).toMatch(/\.gh-btn-cloud\.gh-cloud-uni:not\(\.gh-focus\):not\(:focus\)\s*\{[^}]*box-shadow: 0 0 0 2px var\(--gh-uni-ring, transparent\) inset/);
        expect(css).toMatch(/\.gh-btn-cloud\.gh-cloud-uni-dim\s*\{[^}]*opacity: \.5/);
        // Its in-sync check badge at Unifideck's proportion to the cloud (13 of the 24).
        expect(css).toMatch(/\.gh-btn-cloud\.gh-cloud-uni svg\.gh-uni-badge\s*\{[^}]*width: 13px/);
    });
});

describe('homeCss mouse hover', () => {
    const css = homeCss(CARD_SCALE_HANDHELD);
    const ring = '0 0 0 2px rgba(255,255,255,.45)';
    it("the buttons (Play pill, circles) take the game cards' ring under a mouse, focused or not (no focus look then), ring only", () => {
        const body = css.match(/html\[data-gg-mouse\] \.gh-btn:hover:not\(\.gh-btn-stream\) \{([^}]*)\}/)?.[1] ?? '';
        expect(body).toContain(`box-shadow: ${ring} !important`);
        expect(body).not.toContain('transform');
        expect(css).toMatch(/html\[data-gg-mouse\] \.gh-actions > \.gh-btn-play:has\(\+ \.gh-btn-stream:hover\) \{/);
    });
    it('a feed tab brightens its label under a mouse (not the selected one)', () => {
        expect(css).toMatch(/html\[data-gg-mouse\] \.gh-tab:hover:not\(\.gh-tab-on\) \{[^}]*color: rgba\(255,255,255,\.85\)/);
    });
    it("in mouse mode the buttons' and tabs' focus looks are off (Steam puts its focus back on a clicked button), at no weight", () => {
        const gate = ':where(html:not([data-gg-mouse]))';
        // Every focus look of a button or a tab, and its DOM-focus twin, sits behind the gate; :where() adds nothing to its weight.
        for (const sel of selectors(css).filter((s) => /\.gh-(btn[\w-]*|tab)[^{]*(\.gh-focus|\.gh-tab-focus)(?![\w-])/.test(s) && !/:not\(\.gh-focus\)/.test(s))) expect(sel, sel).toContain(gate);
        expect(css).toContain(`${gate} .gh-btn.gh-focus`);
        expect(css).toContain(`${gate} .gh-tab.gh-tab-focus .gh-tab-line`);
        // The selected game keeps its look: it says whose art and buttons these are.
        for (const sel of selectors(css).filter((s) => s.includes('gh-recents-focus'))) expect(sel).not.toContain(gate);
    });
    it('the game cards keep their ring, now the shared one', () => {
        expect(css).toContain(`.gh-cap.gh-cap-hover:not(.gh-cap-sel):not(.gh-cap-lib-on)`);
        expect(css).toMatch(new RegExp(`\\.gh-cap\\.gh-cap-hover[^{]*\\{[^}]*box-shadow: ${ring.replace(/[().]/g, '\\$&')}`));
    });
    it("opened with a mouse, the growing Play pill has no focus ring or glow (the page shows none then)", () => {
        expect(css).toMatch(/html\[data-gg-mouse\] \.gh-root\[data-gh-opening="morph"\] \.gh-actions > \.gh-btn\[data-action="play"\]::after \{[^}]*box-shadow: none !important/);
    });
    it('no hover look without mouse mode: every :hover rule is under html[data-gg-mouse]', () => {
        for (const sel of css.match(/[^{}]*:hover[^{]*\{/g) ?? []) expect(sel).toContain('html[data-gg-mouse]');
    });
});

describe('homeCss sheet toggle (mouse only)', () => {
    const css = homeCss(CARD_SCALE_HANDHELD);
    const geo = recentsGeometry(CARD_SCALE_HANDHELD);
    const body = (sel: string) => css.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`))?.[1] ?? '';
    it('a chevron centred in the gap above the games row, hidden and unclickable unless a mouse is in use', () => {
        const rest = body('.gh-sheet-toggle');
        expect(rest).toContain('left: 50%');
        // Its bottom 18 px above the cards (Michael: 3 was too tight); the buttons' row ends left of it, so it may rise past them.
        expect(rest).toContain(`top: calc(${geo.top - 18 - 24}px - var(--gh-top))`);
        // Above the tabs row, which spans the page and takes clicks once the sheet is up (it covered the chevron there).
        expect(rest).toMatch(/z-index: [1-9]/);
        expect(rest).toContain('opacity: 0');
        expect(rest).toContain('pointer-events: none');
        const on = body('html[data-gg-mouse] .gh-sheet-toggle');
        expect(on).toContain('opacity: 1');
        expect(on).toContain('pointer-events: auto');
    });
    it('with the sheet up it moves onto the tabs row and points up, by transform only, with the sheet', () => {
        const dy = Math.round((FEED_SHEET.tabsTop + (FEED_SHEET.tabHeight - 24) / 2 - (geo.top - 18 - 24)) * 100) / 100;
        expect(body('.gh-page-up .gh-sheet-toggle')).toContain(`transform: translate(-50%, ${dy}px) rotate(180deg)`);
        expect(body('.gh-sheet-toggle')).toMatch(/transition: transform 500ms/);
    });
    it('brightens under the mouse, and goes away while a game opens', () => {
        expect(body('html[data-gg-mouse] .gh-sheet-toggle:hover')).toContain('color: #fff');
        expect(css).toMatch(/\.gh-root\[data-gh-opening\] \.gh-sheet-toggle \{[^}]*opacity: 0/);
    });
    it('the tabs row has no "more" hint any more (it never showed: inside the tabs, which are hidden at rest)', () => {
        expect(css).not.toContain('gh-tabs-more');
    });
});

describe('homeCss open transition: text twins', () => {
    const css = homeCss(CARD_SCALE_HANDHELD);
    // (--gho-x-d is a plain number: sizes are px times it.)
    const dd = (n: number) => `calc(${n}px * var(--gho-x-d))`;
    const body = (sel: string) => {
        const i = css.indexOf(`${sel} {`);
        return i < 0 ? '' : css.slice(i, css.indexOf('}', i));
    };
    const M = '.gh-root[data-gh-opening="morph"]';
    const MT = `${M}[data-gh-phase="to"]`;
    it("a page card's twins share a layer at the card's place (its text snapped as the page's card snaps it)", () => {
        const card = body('.gh-twin-card');
        expect(card).toContain('position: absolute');
        expect(card).toContain('left: var(--t-card-x)');
        expect(card).toContain('top: var(--t-card-y)');
        expect(card).toContain('will-change: transform');
    });
    it("twins: page type in d units, placed, from → to with the morph, faded in over the first 40%", () => {
        for (const role of ['title', 'eyebrow', 'label', 'value', 'cleanValue', 'playLabel'] as const) {
            expect(body(`.gh-twin[data-role="${role}"]`), role).toContain(pageType(role, dd));
        }
        expect(body('.gh-open-twins')).toContain('display: none');
        expect(body(`${M} .gh-open-twins`)).toContain('display: block');
        const twin = body('.gh-twin');
        expect(twin).toContain('left: var(--t-x)');
        expect(twin).toContain('top: var(--t-y)');
        expect(twin).toContain('transform: var(--t-from)');
        expect(twin).toContain('opacity: 0');
        expect(twin).toContain('translate: var(--t-dx, 0px) calc(var(--t-dy, 0px) - var(--t-shift, 0%))');
        const to = body(`${MT} .gh-twin`);
        expect(to).toContain('transform: var(--t-to)');
        expect(to).toContain(`transform ${OPEN_TIMINGS.morph}ms`);
        expect(to).toContain(`animation: gh-twin-in ${OPEN_TIMINGS.morph}ms linear both`);
        expect(css).toMatch(/@keyframes gh-twin-in \{ 0% \{ opacity: 0;[^}]*\} 40%, 100% \{ opacity: 1; \} \}/);
        expect(body('.gh-twin[data-origin="base"]')).toContain('transform-origin: 0 100%');
        expect(body('.gh-twin[data-origin="base"]')).toContain('--t-shift: 100%');
        expect(body('.gh-twin[data-origin="midline"]')).toContain('--t-shift: 50%');
        // The Play twin is a pill-sized box (the page pill's), its label centred on the line at the label's inset.
        const pill = body('.gh-twin[data-origin="pill"]');
        for (const decl of ['transform-origin: 0 0', '--t-shift: 0%', 'width: var(--t-w)', 'height: var(--t-h)', 'display: flex', 'align-items: center', 'padding: 0 0 0 var(--t-inset)', 'box-sizing: border-box']) expect(pill, decl).toContain(decl);
        // The Play label takes Steam's fixed 20 px line height (its own rule, probed on the Ally): with the default the
        // browser placed the twin's text 0.65 px lower than the page's in the same centred box, and it stepped up at the end.
        expect(body('.gh-twin[data-role="playLabel"]')).toContain(`line-height: ${STEAM_PLAY_LINE}px`);
        expect(STEAM_PLAY_LINE).toBe(20);
        // The page's labels have Steam's line height, 'normal': the font's own, rounded to device px (1.5 at 16:9 docked,
        // about 1.43 at 21:9, where 1.5 stood each row 0.6 px taller). The twins take the same.
        expect(body('.gh-twin[data-role="label"]')).toContain('line-height: normal');
        expect(body('.gh-twin[data-accent]')).toContain('color: var(--glance-accent-text)');
    });
    it("home's text fades out as its twin fades in, only where a twin exists", () => {
        expect(css).toMatch(/@keyframes gh-twin-out \{ 0% \{ opacity: 1;[^}]*\} 40%, 100% \{ opacity: 0; \} \}/);
        const out = `animation: gh-twin-out ${OPEN_TIMINGS.morph}ms linear both`;
        expect(body(`${MT}[data-gh-twins~="title"] .gh-title-slot`)).toContain(out);
        expect(body(`${MT}[data-gh-twins~="eyebrow"] .gh-eyebrow`)).toContain(out);
        expect(body(`${MT}[data-gh-twins~="play"] .gh-btn[data-action="play"] .gh-btn-label`)).toContain(out);
        for (const k of ['size', 'played', 'achievements', 'hltb']) {
            expect(body(`${MT}[data-gh-twins~="label-${k}"] .gh-chip[data-chip="${k}"] .gh-chip-label`), k).toContain(out);
            expect(body(`${MT}[data-gh-twins~="value-${k}"] .gh-chip[data-chip="${k}"] .gh-chip-value`), k).toContain(out);
        }
    });
    it("title twin keeps the page's max width (and wraps as the page's does)", () => {
        const t = body('.gh-twin[data-role="title"]');
        expect(t).toContain(`max-width: ${dd(640)}`);
        expect(t).toContain('white-space: normal');
        expect(t).toContain('text-wrap: balance');
    });
    it("the bridge holds the twins' end state and Home's text hidden, nothing replaying", () => {
        const B = '.gh-root.gh-bridge[data-gh-opening][data-gh-phase]';
        const twin = body(`${B} .gh-twin`);
        expect(twin).toContain('opacity: 1');
        expect(twin).toContain('animation: none');
        expect(twin).toContain('transform: var(--t-to)');
        // The glide onto the page as measured (openHome.settleTwins sets --t-dx/--t-dy), above the copy's transition: none.
        expect(twin).toContain(`transition: translate ${OPEN_TIMINGS.settleGlide}ms ease-out !important`);
        // The extras layer's text glides the same way (data-settle).
        const x = body(`${B} [data-settle]`);
        expect(x).toContain('translate: var(--t-dx, 0px) var(--t-dy, 0px)');
        expect(x).toContain(`transition: translate ${OPEN_TIMINGS.settleGlide}ms ease-out !important`);
        const hide = body(`${B}[data-gh-twins~="label-played"] .gh-chip[data-chip="played"] .gh-chip-label`);
        expect(hide).toContain('opacity: 0');
        expect(hide).toContain('animation: none');
        expect(body(`${B}[data-gh-twins~="title"] .gh-title-slot`)).toContain('opacity: 0');
    });
    it('no !important on transform or opacity in any twin rule', () => {
        for (const m of css.matchAll(/[^{}]*gh-twin[^{]*\{([^}]*)\}/g)) expect(m[1]).not.toMatch(/(?:transform|opacity|translate):[^;]*!important/);
    });
});

describe('the stack under the default growth (#55)', () => {
    const top = (h: number, legend: number) => { const s = homeStack(h, legend, false); return s.shift - s.give.need; };
    it('places the stack as before at 810 and 800 (nothing missing)', () => {
        for (const h of [810.75, 800]) expect(homeStack(h, 46, false)).toEqual({ shift: stackShift(h, 46, false), give: { need: 0 } });
    });
    it('moves the stack up by the room the growth takes, out of the air', () => {
        const s = homeStack(745.6, 46, false);
        expect(s.give.need).toBe(52);
        expect(s.shift).toBe(stackShift(745.6 + 52, 46, false));
    });
    it('does not count a tall legend twice (stackShift already moves up for it)', () => expect(top(810.75, 72)).toBe(stackShift(810.75, 72, false)));
    it('writes the move as --gh-give', () => {
        expect(giveWayVars({ need: 0 })).toEqual({ '--gh-give': '0px' });
        expect(giveWayVars({ need: 40 })).toEqual({ '--gh-give': '-40px' });
    });
    it('moves the page by the give-way and keeps the raised sheet in place', () => {
        const css = homeCss();
        expect(css).toMatch(/\.gh-page \{[^}]*top: calc\(var\(--gh-shift\) \+ var\(--gh-give, 0px\)\)/);
        expect(css).toMatch(/\.gh-page\.gh-page-up \{[^}]*translateY\(calc\(-1 \* var\(--gh-raise, 440px\) - var\(--gh-shift\) - var\(--gh-give, 0px\)\)\)/);
    });
});

describe('the cards\' crisp ring in the open transition', () => {
    const css = homeCss();
    it('draws it as the page\'s card ring, outside the canvas', () => {
        expect(css).toMatch(/\.gh-open-ring \{[^}]*display: none[^}]*position: absolute[^}]*border-radius: var\(--gho-ring-r, 16px\)[^}]*border: var\(--gho-ring-w, 1px\) solid rgba\(255,255,255,calc\(\.12 \* var\(--gho-ring-boost, 1\)\)\)/);
    });
    it('starts on the chips, transparent, and grows to the card as it fades in', () => {
        expect(css).toMatch(/\.gh-root\[data-gh-opening="morph"\] \.gh-open-ring\[data-i="0"\] \{[^}]*display: block[^}]*transform: var\(--gho-ring-0-from\)[^}]*opacity: 0/);
        expect(css).toMatch(/\.gh-root\[data-gh-opening="morph"\]\[data-gh-phase="to"\] \.gh-open-ring\[data-i="0"\] \{[^}]*transform: none[^}]*opacity: 1[^}]*transition: transform/);
    });
    it('fades the panel\'s soft canvas ring out as the crisp one fades in', () => {
        expect(css).toMatch(/\.gh-open-shell::before \{[^}]*border: 1px solid rgba\(255,255,255,\.12\)/);
        expect(css).toMatch(/\.gh-root\[data-gh-opening="morph"\]\[data-gh-phase="to"\] \.gh-open-shell\[data-i="0"\]::before \{[^}]*opacity: 0[^}]*transition: opacity/);
    });
});
