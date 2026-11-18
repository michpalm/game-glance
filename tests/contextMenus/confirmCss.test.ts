import { describe, expect, it } from 'vitest';
import { confirmDialogCss } from '../../src/contextMenus/confirmCss';
import { menuDimColor } from '../../src/styles/tokens';

const css = confirmDialogCss();
const block = (selector: string) => {
    const at = css.indexOf(`${selector}{`);
    return at < 0 ? '' : css.slice(at, css.indexOf('}', at));
};

describe('Steam\'s confirm dialogs in the Game Glance look (mock-up B: menu rows)', () => {
    const BOX = '.FullModalOverlay .GenericConfirmDialog';
    it('the box: the menu\'s .40 glass with its frost, rim and rounded corners', () => {
        expect(block(BOX)).toContain('background:rgba(12,16,22,.40)!important');
        expect(block(BOX)).toMatch(/backdrop-filter:blur\(calc\(16px \* var\(--gg-ctx-u, 1\)\)\)!important/);
        expect(block(BOX)).toMatch(/border-radius:calc\(16px/);
    });
    it('the dim behind it is Game Glance\'s, not Steam\'s 85% black', () => {
        expect(block('.FullModalOverlay:has(.GenericConfirmDialog)')).toContain(`background:${menuDimColor()}!important`);
        expect(block('.FullModalOverlay:has(.GenericConfirmDialog) > .ModalOverlayBackground')).toContain('background:transparent!important');
    });
    it('the buttons stack as full-width rows, Confirm first', () => {
        expect(block(`${BOX} .DialogFooter ._DialogColLayout`)).toContain('flex-direction:column!important');
        const row = block(`${BOX} .DialogFooter .DialogButton`);
        expect(row).toContain('width:100%!important');
        // Steam's two-column footer caps each button at calc(50% - 14px) (probed on the PS5).
        expect(row).toContain('max-width:none!important');
        expect(row).toContain('text-align:left!important');
        expect(row).toMatch(/border-radius:calc\(12px/);
    });
    it('the focused row: the menu\'s fill and white ring; Steam\'s blue primary is gone', () => {
        expect(css).toMatch(/\.DialogButton\.gpfocus[^{]*\{[^}]*background:rgba\(255,255,255,\.12\)!important/);
        expect(block(`${BOX} .DialogFooter .DialogButton`)).toContain('background:rgba(255,255,255,.06)!important');
    });
    it('touches only confirm dialogs', () => {
        for (const selector of css.split('}').map((r) => r.split('{')[0]).filter(Boolean))
            for (const part of selector.split(',')) expect(part).toContain('GenericConfirmDialog');
    });
});
