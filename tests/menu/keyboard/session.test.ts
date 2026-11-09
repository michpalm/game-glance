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
    it('keeps the text cursor, notifying only when it changes', () => {
        const session = createKeyboardSession(), seen = vi.fn();
        session.subscribe(seen);
        expect(session.cursor()).toBeNull();
        session.open(); expect(seen).toHaveBeenCalledTimes(1);
        session.setCursor(3); expect(session.cursor()).toBe(3); expect(seen).toHaveBeenCalledTimes(2);
        session.setCursor(3); expect(seen).toHaveBeenCalledTimes(2);
        session.setCursor(null); expect(session.cursor()).toBeNull(); expect(seen).toHaveBeenCalledTimes(3);
    });
    it('closing resets the cursor to null', () => {
        const session = createKeyboardSession();
        session.open(); session.setCursor(5);
        session.close();
        expect(session.cursor()).toBeNull();
        session.open(); expect(session.cursor()).toBeNull();
    });
});
