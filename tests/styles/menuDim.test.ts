import { describe, expect, it } from 'vitest';
import { MENU_DIM, menuDimColor } from '../../src/styles/tokens';

describe('MENU_DIM', () => {
    // One value for the context menus and the Game Glance menu (spec 2026-11-12-menu-dim): they must match.
    it('is the context menus\' dim: 38% of rgb(5,7,10) and a 6 px blur', () => {
        expect(MENU_DIM).toEqual({ rgb: [5, 7, 10], alpha: .38, blur: 6 });
        expect(menuDimColor()).toBe('rgba(5,7,10,.38)');
    });
});
