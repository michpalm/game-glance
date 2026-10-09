import { describe, expect, it } from 'vitest';
import {
    FEED_SHEET, hexAlpha, homeCss, MAX_STACK_SHIFT, openOverlayCss, sourcePillTop, stackShift, TITLE_BLOCK, titleBlockBottom, titleBlockLayout,
} from '../../src/home/homeCss';
import { sourcePillLook } from '../../src/styles/sourcePill';
import { ACCENT_MS, CAP_ART_FADE_MS, CAP_STATE_MS, HERO_FADE_MS, SHEET_MS, SLIDE_MS } from '../../src/home/motion';
import { CARD_SCALE_DOCKED, CARD_SCALE_HANDHELD, recentsGeometry, recentsGlowTop } from '../../src/home/recentsLayout';

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
        out.push(...prelude.split(',').map((s) => s.trim()).filter(Boolean));
    }
    return out;
}

describe('homeCss', () => {
    it('homeCss prefixes every class with gh-', () => {
        const css = homeCss();
        const list = selectors(css);
        expect(list.length).toBeGreaterThan(10);
        for (const sel of list) expect(sel.startsWith('.gh-'), sel).toBe(true);
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
    it('the recents row is display only: no pointer events, so a tap or click on a card does nothing', () => {
        const css = homeCss(CARD_SCALE_HANDHELD);
        expect(css).toMatch(/\.gh-recents\s*\{[^}]*pointer-events:\s*none\s*!important/);
        // While the card row has focus, the selected (or Library) card gets a white ring outside it and an even accent
        // glow (no y offset), and no bar along its bottom edge.
        expect(css).toMatch(/\.gh-recents-focus \.gh-cap-wide, \.gh-recents-focus \.gh-cap-lib-on\s*\{[^}]*box-shadow:\s*0 0 0 2px rgba\(255,255,255,\.9\), 0 0 [\d.]+px [\d.]+px var\(--glance-accent\)/);
        expect(css).not.toMatch(/gh-recents-focus[^{]*\.gh-cap-bar/);
        // A game new to the library: a small light "New" pill at the card's top left.
        expect(css).toMatch(/\.gh-cap-new\s*\{[^}]*position:\s*absolute[^}]*text-transform:\s*uppercase[^}]*background:\s*rgba\(255,255,255,\.92\)/);
        expect(css).not.toMatch(/\.gh-cap\s*\{[^}]*cursor:\s*pointer/);
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
            expect(css).toMatch(/\.gh-page\s*\{[^}]*top:\s*var\(--gh-shift\)\s*!important[^}]*height:\s*100%/);
            expect(css).toMatch(/\.gh-page\.gh-page-up\s*\{[^}]*transform:\s*translateY\(calc\(-1 \* var\(--gh-raise, 440px\) - var\(--gh-shift\)\)\)/);
            expect(css).toMatch(/\.gh-tabs\s*\{[^}]*top:\s*calc\(700px - var\(--gh-top\)\)/);
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
    it('the cloud circle is the same circle as the others; only its icon takes the state colour, with a halo', () => {
        const css = homeCss();
        expect(css).not.toMatch(/\.gh-btn-cloud\s*\{/);
        expect(css).toMatch(/\.gh-btn-cloud svg\s*\{[^}]*width:\s*26px[^}]*drop-shadow/);
        expect(css).toMatch(/\.gh-btn-cloud\.gh-cloud-ok\s*\{\s*color:\s*#5cf2b4\s*!important/);
        expect(css).toMatch(/\.gh-btn-cloud\.gh-cloud-busy\s*\{\s*color:\s*#ffd84d/);
        expect(css).toMatch(/\.gh-btn-cloud\.gh-cloud-bad\s*\{\s*color:\s*#ff8585/);
        expect(css).toMatch(/\.gh-btn-cloud\.gh-cloud-off\s*\{\s*color:\s*#c4c9d1/);
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
        expect(css).toMatch(/\.gh-card\.gh-card-focus \{[^}]*--gh-edge: rgba\(255,255,255,\.3\)/);
        expect(css).toMatch(/\.gh-cap \{[^}]*--gh-edge: rgba\(255,255,255,\.08\)/);
        expect(css).toMatch(/\.gh-cap-wide \{\s*--gh-edge: rgba\(255,255,255,\.35\)/);
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
    it('homeCss fades Home out over 300 ms while the open overlay is up', () => {
        expect(homeCss()).toMatch(/\.gh-root\[data-gh-leaving\]\s*\{[^}]*opacity:\s*0\s*!important[^}]*transition:\s*opacity 300ms/);
    });
    it('openOverlayCss expands over 480 ms and fades from 520 ms over 450 ms, over an ink base, gh- classes only', () => {
        const css = openOverlayCss();
        const list = selectors(css);
        expect(list.length).toBeGreaterThan(1);
        for (const sel of list) expect(sel.startsWith('.gh-'), sel).toBe(true);
        expect(css).toMatch(/\.gh-open\s*\{[^}]*position:\s*fixed\s*!important[^}]*pointer-events:\s*none/);
        expect(css).toMatch(/gh-open-expand 480ms cubic-bezier\(\.6,0,\.2,1\) both/);
        expect(css).toMatch(/gh-open-fade 450ms ease 520ms forwards/);
        expect(css).toMatch(/\.gh-open-clone\s*\{[^}]*background-color:\s*#07090c/);
        // Animated properties must not be set !important in a rule, or the animation could not move them.
        expect(css).not.toMatch(/\.gh-open-clone\s*\{[^}]*(?:[;{]\s*)(?:left|top|width|height|border-radius|opacity):/);
        expect(css).toMatch(/@keyframes gh-open-expand\s*\{\s*from\s*\{[^}]*var\(--gh-from-w\)[^}]*\}\s*to\s*\{[^}]*width:\s*100%[^}]*border-radius:\s*0/);
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
        expect(rule).toMatch(/position: absolute !important; right: calc\(100% \+ 10px\) !important; top: 50% !important; transform: translateY\(-50%\) !important/);
        expect(rule).toContain(sourcePillLook((n) => `${n}px`).split(';')[0]);
        expect(css).toMatch(/\.gh-family-icon\s*\{/);
    });
});
