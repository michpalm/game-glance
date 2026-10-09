import { describe, expect, it } from 'vitest';
import { menuOpen } from '../../src/home/steamMenu';

describe('menuOpen (the status bar steps aside while a Steam menu is open)', () => {
    // Steam's menu store, probed on the Ally: IsAnySideMenuVisible(), GetOpenSideMenu() 1 = main menu, 2 = Quick Access.
    const store = (visible: boolean) => ({ IsAnySideMenuVisible: () => visible });
    it("follows Steam's own menu store, whatever the window's system focus", () => {
        expect(menuOpen(store(true), true)).toBe(true);
        expect(menuOpen(store(false), false)).toBe(false);
    });
    it('falls back to the window losing focus when the store is missing or throws', () => {
        expect(menuOpen(undefined, false)).toBe(true);
        expect(menuOpen(undefined, true)).toBe(false);
        expect(menuOpen({ IsAnySideMenuVisible: () => { throw new Error('x'); } }, false)).toBe(true);
        expect(menuOpen({}, true)).toBe(false);
    });
});
