import { describe, expect, it, vi } from 'vitest';
import { gameStepSound, navSoundParts, shoulderSound } from '../../src/home/navSound';

// Steam's sound player and its sound names, as the in-page module exports them (numbers from Steam's enum, probed).
const navPlayer = vi.hoisted(() => ({ PlayNavSound: vi.fn() }));
vi.mock('@decky/ui', () => {
    const names = { LaunchGame: 0, IntoGameDetail: 13, OutOfGameDetail: 14, ChangeTabs: 20, BasicNav: 24, FailedNav: 25 };
    const module = { player: navPlayer, names };
    return { findModule: (test: (m: unknown) => boolean) => (test(module) ? module : undefined) };
});

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

describe('gameStepSound', () => {
    it("switching games: Steam's tab sound for L1/R1, its move sound for Left/Right (both taken before Steam plays one)", () => {
        expect(gameStepSound(0, 1, 'bumper')).toBe('ChangeTabs');
        expect(gameStepSound(5, 0, 'bumper')).toBe('ChangeTabs');
        expect(gameStepSound(2, 1, 'dpad')).toBe('BasicNav');
    });
    it('no sound when the selection does not change or there is none', () => {
        expect(gameStepSound(3, 3, 'bumper')).toBeNull();
        expect(gameStepSound(3, 3, 'dpad')).toBeNull();
        expect(gameStepSound(0, null, 'bumper')).toBeNull();
    });
});

describe('playNavSound (the game-page open and the game start)', () => {
    it("plays Steam's IntoGameDetail when a game page opens and its LaunchGame when a game starts", async () => {
        const { playNavSound } = await import('../../src/home/navSound');
        playNavSound('IntoGameDetail');
        playNavSound('LaunchGame');
        expect(navPlayer.PlayNavSound).toHaveBeenNthCalledWith(1, 13);
        expect(navPlayer.PlayNavSound).toHaveBeenNthCalledWith(2, 0);
    });
    it("plays Steam's OutOfGameDetail when B cancels an open", async () => {
        const { playNavSound } = await import('../../src/home/navSound');
        navPlayer.PlayNavSound.mockClear();
        playNavSound('OutOfGameDetail');
        expect(navPlayer.PlayNavSound).toHaveBeenCalledWith(14);
    });
});
