import { describe, expect, it, vi } from 'vitest';
import { backOnCancel } from '../../src/contextMenus/pageCancel';

describe('backOnCancel', () => {
    it('goes back and stops B from reaching Steam\'s menu (which would close it)', () => {
        const back = vi.fn();
        const evt = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
        backOnCancel(back)(evt as unknown as Event);
        expect(back).toHaveBeenCalledTimes(1);
        expect(evt.stopPropagation).toHaveBeenCalledTimes(1);
        expect(evt.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('still goes back when the event has no stop methods', () => {
        const back = vi.fn();
        backOnCancel(back)(undefined);
        expect(back).toHaveBeenCalledTimes(1);
    });
});
