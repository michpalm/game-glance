import { describe, expect, it, vi } from 'vitest';
import { openMenuView, setMenuViewOpener } from '../../src/menu/openView';

describe('openMenuView: the game page asks the menu to open on a view', () => {
    it('says no while the menu is not running, so the caller falls back to Steam', () => {
        setMenuViewOpener(null);
        expect(openMenuView('achievements:1')).toBe(false);
    });
    it('hands the view to the running menu, which says whether it opened', () => {
        const opener = vi.fn(() => true);
        const stop = setMenuViewOpener(opener);
        expect(openMenuView('achievements:1')).toBe(true);
        expect(opener).toHaveBeenCalledWith('achievements:1');
        stop();
        expect(openMenuView('achievements:1')).toBe(false);
    });
    it('a stop from an older menu does not remove a newer one', () => {
        const stopOld = setMenuViewOpener(() => true);
        setMenuViewOpener(() => true);
        stopOld();
        expect(openMenuView('x')).toBe(true);
        setMenuViewOpener(null);
    });
});
