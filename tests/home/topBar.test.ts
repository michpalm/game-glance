import { describe, expect, it } from 'vitest';
import { isTopBarRect } from '../../src/home/topBar';

describe('isTopBarRect', () => {
    it("accepts Steam's top strip: flush with the top, thin, across the screen", () => {
        expect(isTopBarRect({ top: 0, height: 40, width: 1500 }, 1500)).toBe(true);
        expect(isTopBarRect({ top: 0, height: 40, width: 828 }, 828)).toBe(true);
    });
    it('rejects the avatar, the page and anything not at the top', () => {
        expect(isTopBarRect({ top: 4, height: 32, width: 32 }, 1500)).toBe(false);
        expect(isTopBarRect({ top: 0, height: 845, width: 1500 }, 1500)).toBe(false);
        expect(isTopBarRect({ top: 300, height: 40, width: 1500 }, 1500)).toBe(false);
        expect(isTopBarRect({ top: 0, height: 40, width: 1500 }, 0)).toBe(false);
    });
});
