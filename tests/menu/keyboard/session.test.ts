import { describe, expect, it, vi } from 'vitest';
import { createKeyboardSession } from '../../../src/menu/keyboard/session';
describe('keyboard session', () => {
    it('opens and closes, notifying subscribers only on a change', () => {
        const session = createKeyboardSession(), seen = vi.fn();
        expect(session.get()).toEqual({ open: false });
        const stop = session.subscribe(seen);
        session.open(); session.open(); expect(session.get().open).toBe(true); expect(seen).toHaveBeenCalledTimes(1);
        session.close(); session.close(); expect(session.get().open).toBe(false); expect(seen).toHaveBeenCalledTimes(2);
        stop(); session.open(); expect(seen).toHaveBeenCalledTimes(2);
    });
});
