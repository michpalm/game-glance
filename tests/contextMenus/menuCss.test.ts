import { describe, expect, it } from 'vitest';
import { contextMenuCss, CTX_UNIT } from '../../src/contextMenus/menuCss';
import type { MenuClasses } from '../../src/contextMenus/menuClasses';
import { focusRing, MENU_DIM, menuDimColor } from '../../src/styles/tokens';

const KEYS = ['active', 'BasicContextMenuContainer', 'BasicContextMenuHeader', 'contextMenu', 'contextMenuContents', 'contextMenuItem', 'hasSubMenu', 'Selected', 'Focused', 'Destructive', 'MenuSectionHeader', 'SubMenu', 'ContextMenuSeparator', 'Label', 'Arrow'] as const;
const C = Object.fromEntries(KEYS.map((k) => [k, `_k_${k}`])) as MenuClasses;
const u = (n: number) => `calc(${n}px * var(${CTX_UNIT}, 1))`;

const rules = (css: string) => css.split('}').map((r) => r.trim()).filter(Boolean).map((r) => {
    const [sel, body] = r.split('{');
    return { selectors: sel.split(',').map((s) => s.trim()), body: body ?? '' };
});
const ruleFor = (css: string, selector: string) => rules(css).find((r) => r.selectors.includes(selector));

describe('contextMenuCss', () => {
    it('is empty without the class module', () => {
        expect(contextMenuCss(null)).toBe('');
    });
    it('scopes every rule to a context menu', () => {
        for (const r of rules(contextMenuCss(C))) for (const s of r.selectors)
            expect(s.startsWith('.BasicUIContextMenu') || s.startsWith('.FullModalOverlay:has(.BasicUIContextMenu)'), s).toBe(true);
    });
    it('leaves Steam\'s full-screen menu layer clear', () => {
        expect(ruleFor(contextMenuCss(C), '.BasicUIContextMenu')!.body).toContain('background:transparent');
    });
    it('dims the screen with the shared menu dim', () => {
        const css = contextMenuCss(C);
        const dim = ruleFor(css, '.FullModalOverlay:has(.BasicUIContextMenu)')!.body;
        expect(dim).toContain(`background:${menuDimColor()}`);
        // A backdrop-filter on the overlay makes it a backdrop root: the box inside could then frost only the overlay,
        // not the page (Deck, 2026-11-12: the box showed the dim's 4 px blur, not its own 16 px). The dim's blur is a
        // layer inside the overlay, behind the menu, so the box frosts the dimmed page.
        expect(dim).not.toContain('backdrop-filter');
        const layer = ruleFor(css, '.FullModalOverlay:has(.BasicUIContextMenu)::before')!.body;
        expect(layer).toContain(`backdrop-filter:blur(${u(MENU_DIM.blur)})`);
        for (const d of ['content:""', 'position:fixed', 'inset:0', 'z-index:-1', 'pointer-events:none']) expect(layer).toContain(d);
    });
    it('clears Steam\'s own 85% black layer under the dim', () => {
        const bg = ruleFor(contextMenuCss(C), '.FullModalOverlay:has(.BasicUIContextMenu) > .ModalOverlayBackground')!.body;
        expect(bg).toContain('background:transparent');
        expect(bg).toContain('backdrop-filter:none');
    });
    it('draws the box as Game Glance glass', () => {
        const box = ruleFor(contextMenuCss(C), '.BasicUIContextMenu ._k_BasicContextMenuContainer')!.body;
        expect(box).toContain('background:rgba(12,16,22,.40)');
        expect(box).toContain(`backdrop-filter:blur(${u(16)})`);
        expect(box).toContain('border:1px solid rgba(255,255,255,.12)');
        expect(box).toContain(`border-radius:${u(16)}`);
    });
    it('focuses a row with the menu ring, not a white bar', () => {
        const css = contextMenuCss(C);
        const r = rules(css).find((x) => x.selectors.includes('.BasicUIContextMenu .contextMenuItem._k_Focused'))!;
        expect(r.selectors).toContain('.BasicUIContextMenu .contextMenuItem.gpfocus');
        expect(r.selectors).toContain('.BasicUIContextMenu .contextMenuItem:focus');
        expect(r.body).toContain('background:rgba(255,255,255,.12)');
        expect(r.body).toContain('color:rgba(255,255,255,.9)');
        for (const part of focusRing('slice', u).split(';')) expect(r.body).toContain(part);
        for (const x of rules(css).filter((x) => x.selectors.some((sel) => sel.includes('contextMenuItem')))) expect(x.body).not.toMatch(/background:(#fff|white)/);
    });
    it('covers every row kind', () => {
        const css = contextMenuCss(C);
        expect(ruleFor(css, '.BasicUIContextMenu .contextMenuItem._k_Selected')).toBeTruthy();
        const disabled = rules(css).find((r) => r.selectors.includes('.BasicUIContextMenu .contextMenuItem[aria-disabled="true"]'))!;
        expect(disabled.selectors).toContain('.BasicUIContextMenu .contextMenuItem:disabled');
        expect(disabled.selectors).toContain('.BasicUIContextMenu .contextMenuItem.disabled');
        expect(disabled.selectors).toContain('.BasicUIContextMenu .contextMenuItem[disabled]');
        expect(ruleFor(css, '.BasicUIContextMenu .contextMenuItem._k_active')!.body).toContain('background:rgba(255,255,255,.08)');
        expect(disabled.body).toContain('opacity:.45');
        const sep = ruleFor(css, '.BasicUIContextMenu ._k_ContextMenuSeparator')!.body;
        expect(sep).toContain('rgba(255,255,255,.10)');
        expect(sep).toContain('1px');
        expect(ruleFor(css, '.BasicUIContextMenu ._k_MenuSectionHeader')).toBeTruthy();
        expect(ruleFor(css, '.BasicUIContextMenu ._k_Arrow')!.body).toContain('#fff');
        const title = ruleFor(css, '.FullModalOverlay:has(.BasicUIContextMenu) ._k_BasicContextMenuHeader')!.body;
        expect(title).toContain('color:#fff');
        expect(title).toContain('font-weight:700');
    });
    it('writes every length in canvas px times the unit', () => {
        const stripped = contextMenuCss(C).replace(/calc\(-?\d+(\.\d+)?px \* var\(--gg-ctx-u, 1\)\)/g, '').replace(/1px/g, '');
        expect(stripped).not.toMatch(/\d+px/);
    });
    it('leaves out a part whose class is missing', () => {
        const css = contextMenuCss({ ...C, ContextMenuSeparator: undefined });
        expect(css).not.toContain('undefined');
        expect(css).not.toContain('rgba(255,255,255,.10)');
    });
});

describe('the game menu panel', () => {
    const css = () => contextMenuCss(C);
    const D = '.FullModalOverlay:has(.BasicUIContextMenu)';
    it('makes Steam\'s list the mock-up\'s width', () => {
        expect(ruleFor(css(), `${D} ._k_contextMenuContents:has(.gg-gm)`)!.body).toContain(`width:${u(540)}`);
    });
    it('draws the art 150 tall with the name over its foot', () => {
        expect(ruleFor(css(), `${D} .gg-gm-hero`)!.body).toContain(`height:${u(150)}`);
        expect(ruleFor(css(), `${D} .gg-gm-art`)!.body).toContain('background-size:cover');
        expect(ruleFor(css(), `${D} .gg-gm-art::after`)!.body).toContain('linear-gradient(transparent 30%,rgba(8,10,14,.85))');
        expect(ruleFor(css(), `${D} .gg-gm-name`)!.body).toContain(`font-size:${u(25)}`);
    });
    // The art fills the top of the box edge to edge (Michael, Deck 2026-11-12): the box drops its top and side padding
    // for the panel and the list takes the 8 px side inset instead; only the art reaches past it (negative margins inside
    // the list's own box, so nothing is clipped). Side margins on the rows would not do: Steam's rows are width:100%, the
    // list overflowed and scrolled sideways (Deck: art short on the right, rows flush).
    it('lets the art fill the top of the box edge to edge', () => {
        expect(ruleFor(css(), `${D} ._k_BasicContextMenuContainer:has(.gg-gm)`)!.body).toContain(`padding:0 0 ${u(8)}`);
        const list = ruleFor(css(), `${D} ._k_contextMenuContents:has(.gg-gm)`)!.body;
        expect(list).toContain(`padding-left:${u(8)}`);
        expect(list).toContain(`padding-right:${u(8)}`);
        const hero = ruleFor(css(), `${D} .gg-gm-hero`)!.body;
        expect(hero).toContain(`margin:0 ${u(-8)} ${u(8)}`);
        expect(hero).toContain('border-radius:0');
        expect(css()).not.toContain(':not(.gg-gm-hero)');
        // The name lines up with the rows' icons: 8 inset + 20 row padding.
        const text = ruleFor(css(), `${D} .gg-gm-hero-text`)!.body;
        expect(text).toContain(`left:${u(28)}`);
        expect(text).toContain(`right:${u(28)}`);
    });
    it('sizes rows, icons and checkboxes as the mock-up', () => {
        const row = ruleFor(css(), `${D} .contextMenuItem.gg-gm-row`)!.body;
        expect(row).toContain(`min-height:${u(58)}`);
        expect(row).toContain(`font-size:${u(21)}`);
        expect(ruleFor(css(), `${D} .gg-gm-icon`)!.body).toContain(`width:${u(22)}`);
        const chk = ruleFor(css(), `${D} .gg-gm-chk`)!.body;
        expect(chk).toContain(`width:${u(24)}`);
        expect(chk).toContain(`border-radius:${u(7)}`);
        expect(ruleFor(css(), `${D} .gg-gm-chk.on`)!.body).toContain('background:#fff');
        expect(ruleFor(css(), `${D} .gg-gm-end`)!.body).toContain('rgba(255,255,255,.55)');
    });
    it('sizes rows other plugins add into the panel like ours', () => {
        const r = ruleFor(css(), `${D} ._k_contextMenuContents:has(.gg-gm) > .contextMenuItem:not(.gg-gm-row)`)!.body;
        expect(r).toContain(`min-height:${u(58)}`);
        expect(r).toContain(`padding:0 ${u(20)} 0 ${u(66)}`);
    });
    it('drops Steam\'s Cancel and its separator from the panel (B closes)', () => {
        const r = rules(css()).find((x) => x.selectors.includes(`${D} ._k_contextMenuContents:has(.gg-gm) > .contextMenuItem:last-child:not(.gg-gm-row)`))!;
        expect(r.selectors).toContain(`${D} ._k_contextMenuContents:has(.gg-gm) > ._k_ContextMenuSeparator:nth-last-child(2)`);
        expect(r.body).toContain('display:none');
    });
    it('hides a wrapper whose Steam element drew nothing', () => {
        expect(ruleFor(css(), `${D} .gg-gm-lead:not(:has(.contextMenuItem))`)!.selectors).toContain(`${D} .gg-gm-steam:not(:has(.contextMenuItem))`);
    });
    it('hides Steam\'s title while the panel names the game', () => {
        expect(ruleFor(css(), `${D}:has(.gg-gm) ._k_BasicContextMenuHeader`)!.body).toContain('display:none');
    });
});
