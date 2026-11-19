import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, Menu: 'div', MenuItem: 'div' }));
import { requiredSpace } from '../../src/library/LibraryPage';

describe('Required space comes from Steam\'s details store (PS5: the 64-game memo dropped it)', () => {
    it('reads lDiskSpaceRequiredBytes from Steam\'s store first', () =>
        expect(requiredSpace({ GetAppDetails: () => ({ lDiskSpaceRequiredBytes: 2424009225 }) }, 701160, () => 5)).toBe(2424009225));
    it('falls back to the memo when Steam\'s store has none', () => {
        expect(requiredSpace({ GetAppDetails: () => null }, 1, () => 7)).toBe(7);
        expect(requiredSpace(undefined, 1, () => 7)).toBe(7);
    });
    it('ignores anything but a positive number, and never throws', () => {
        expect(requiredSpace({ GetAppDetails: () => ({ lDiskSpaceRequiredBytes: 0 }) }, 1, () => undefined)).toBeUndefined();
        expect(requiredSpace({ GetAppDetails: () => { throw new Error('x'); } }, 1, () => 3)).toBe(3);
    });
});
