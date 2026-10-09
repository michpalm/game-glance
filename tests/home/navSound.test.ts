import { describe, expect, it, vi } from 'vitest';
import { navSoundParts, shoulderSound } from '../../src/home/navSound';

describe('navSoundParts', () => {
    // The shape probed on the Ally: one module exports the sound names (an enum) and the player (minified names change).
    const names = { 0: 'LaunchGame', LaunchGame: 0, 20: 'ChangeTabs', ChangeTabs: 20, 24: 'BasicNav', BasicNav: 24, 25: 'FailedNav', FailedNav: 25 };
    it("finds Steam's player and sound names whatever the exports are called", () => {
        const player = { PlayNavSound: vi.fn() };
        const parts = navSoundParts({ PN: names, eZ: player });
        expect(parts?.player).toBe(player);
        expect(parts?.names.ChangeTabs).toBe(20);
        expect(navSoundParts({ x: player, y: names })?.names.FailedNav).toBe(25);
    });
    it('is null for any other module, or junk', () => {
        for (const m of [null, undefined, 7, 'x', {}, { a: { PlayNavSound: 1 }, b: names }, { a: { PlayNavSound: () => 0 } }, { b: names }]) {
            expect(navSoundParts(m)).toBeNull();
        }
    });
});

describe('shoulderSound', () => {
    it("L1/R1 on the tabs: Steam's tab sound when the tab changes, its failed sound at an end, none for other buttons", () => {
        expect(shoulderSound(0, 1)).toBe('ChangeTabs');
        expect(shoulderSound(2, 2)).toBe('FailedNav');
        expect(shoulderSound(1, null)).toBeNull();
    });
});
