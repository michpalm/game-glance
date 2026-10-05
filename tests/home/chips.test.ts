import { describe, expect, it } from 'vitest';
import { gameChips, libraryChips } from '../../src/home/chips';

const NOW = 1_700_000_000;
const base = { playedMinutes: 600, achievements: { achieved: 5, total: 20 }, lastPlayed: NOW, hltbMainHours: 20 };

describe('gameChips', () => {
    it('returns Played, Achievements, Last played, HLTB main in that order', () => {
        const chips = gameChips(base, NOW, 'en-US');
        expect(chips.map((c) => c.label)).toEqual(['Played', 'Achievements', 'Last played', 'HLTB main']);
        expect(chips[0].value).toBe('10 h');
        expect(chips[2].value).toBe('Today');
    });
    it('achievements chip has progress achieved/total', () => {
        const chip = gameChips(base, NOW, 'en-US')[1];
        expect(chip.value).toBe('5 / 20');
        expect(chip.progress).toBe(0.25);
    });
    it('HLTB chip progress is played hours over main, capped at 1', () => {
        expect(gameChips(base, NOW, 'en-US')[3].progress).toBe(0.5);
        expect(gameChips({ ...base, playedMinutes: 6000 }, NOW, 'en-US')[3].progress).toBe(1);
    });
    it('achievements chip is omitted when the game has none', () => {
        const labels = gameChips({ ...base, achievements: null }, NOW, 'en-US').map((c) => c.label);
        expect(labels).toEqual(['Played', 'Last played', 'HLTB main']);
        const zero = gameChips({ ...base, achievements: { achieved: 0, total: 0 } }, NOW, 'en-US');
        expect(zero.map((c) => c.label)).not.toContain('Achievements');
    });
    it('HLTB chip shows a dash and no progress when there is no HLTB time', () => {
        const chip = gameChips({ ...base, hltbMainHours: null }, NOW, 'en-US')[3];
        expect(chip.value).toBe('—');
        expect(chip.progress).toBeUndefined();
    });
});

describe('libraryChips', () => {
    const lib = { games: 490, installed: 21, favorites: 4, storageBytes: 209_867_996_485 };
    it('returns Games, Installed, Favorites, Storage', () => {
        const chips = libraryChips(lib, 'en-US');
        expect(chips.map((c) => c.label)).toEqual(['Games', 'Installed', 'Favorites', 'Storage']);
        expect(chips.map((c) => c.value)).toEqual(['490', '21', '4', '195.5 GB']);
    });
    it('omits Storage when storageBytes is null', () => {
        const labels = libraryChips({ ...lib, storageBytes: null }, 'en-US').map((c) => c.label);
        expect(labels).toEqual(['Games', 'Installed', 'Favorites']);
    });
});
