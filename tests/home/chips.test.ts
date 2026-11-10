import { describe, expect, it } from 'vitest';
import { gameChips, libraryChips } from '../../src/home/chips';
import { formatBytes } from '../../src/logic/format';

const NOW = 1_700_000_000;
const base = { playedMinutes: 600, achievements: { achieved: 5, total: 20 }, lastPlayed: NOW, hltbMainHours: 20 };

describe('gameChips', () => {
    it('returns Played, Achievements, HLTB main in that order (Last played is the eyebrow\'s)', () => {
        const chips = gameChips(base, NOW, 'en-US');
        expect(chips.map((c) => c.label)).toEqual(['Played', 'Achievements', 'HLTB main']);
        expect(chips[0].value).toBe('10 h');
        expect(chips[2].value).toBe('20 h');
    });
    it('a game new to the library: Added to library (when) instead of Played', () => {
        const chips = gameChips({ ...base, playedMinutes: 0, lastPlayed: 0, addedAt: NOW }, NOW, 'en-US');
        expect(chips.map((c) => c.label)).toEqual(['Added to library', 'Achievements', 'HLTB main']);
        expect(chips[0].value).toBe('Today');
    });
    it('achievements chip has progress achieved/total', () => {
        const chip = gameChips(base, NOW, 'en-US')[1];
        expect(chip.value).toBe('5 / 20');
        expect(chip.progress).toBe(0.25);
    });
    it('HLTB chip progress is played hours over main, capped at 1', () => {
        expect(gameChips(base, NOW, 'en-US')[2].progress).toBe(0.5);
        expect(gameChips({ ...base, playedMinutes: 6000 }, NOW, 'en-US')[2].progress).toBe(1);
    });
    it('achievements chip is omitted when the game has none', () => {
        const labels = gameChips({ ...base, achievements: null }, NOW, 'en-US').map((c) => c.label);
        expect(labels).toEqual(['Played', 'HLTB main']);
        const zero = gameChips({ ...base, achievements: { achieved: 0, total: 0 } }, NOW, 'en-US');
        expect(zero.map((c) => c.label)).not.toContain('Achievements');
    });
    it('HLTB chip shows a dash and no progress when there is no HLTB time', () => {
        const chip = gameChips({ ...base, hltbMainHours: null }, NOW, 'en-US')[2];
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

describe('gameChips: the space a Steam game that is not installed needs', () => {
    it('sits right of Played when the game is not installed and its space is known', () => {
        const chips = gameChips({ ...base, installed: false, spaceBytes: 691079517 }, NOW, 'en-US');
        expect(chips.map((c) => c.label)).toEqual(['Played', 'Space Required', 'Achievements', 'HLTB main']);
        expect(chips[1].value).toBe(formatBytes(691079517, 'en-US'));
    });
    it('right of Added to library for a new game', () => {
        const chips = gameChips({ ...base, installed: false, spaceBytes: 691079517, addedAt: NOW }, NOW, 'en-US');
        expect(chips.map((c) => c.label)).toEqual(['Added to library', 'Space Required', 'Achievements', 'HLTB main']);
    });
    it('no chip when the game is installed, or its space is not known', () => {
        expect(gameChips({ ...base, installed: true, spaceBytes: 691079517 }, NOW, 'en-US').map((c) => c.label)).not.toContain('Space Required');
        expect(gameChips({ ...base, installed: false, spaceBytes: null }, NOW, 'en-US').map((c) => c.label)).not.toContain('Space Required');
        expect(gameChips(base, NOW, 'en-US').map((c) => c.label)).not.toContain('Space Required');
    });
});

describe('gameChips: ProtonDB', () => {
    it("comes last, with the rating's name and its tone", () => {
        const chips = gameChips({ ...base, protonTier: 'gold' }, NOW, 'en-US');
        expect(chips.map((c) => c.key)).toEqual(['played', 'achievements', 'hltb', 'protondb']);
        expect(chips[3]).toEqual({ key: 'protondb', label: 'ProtonDB', value: 'Gold', tone: 'gold' });
        expect(gameChips({ ...base, protonTier: 'borked' }, NOW, 'en-US')[3].value).toBe('Borked');
    });
    it('is left out when the rating is unknown', () => {
        expect(gameChips({ ...base, protonTier: null }, NOW, 'en-US').map((c) => c.key)).not.toContain('protondb');
        expect(gameChips(base, NOW, 'en-US').map((c) => c.key)).not.toContain('protondb');
    });
});
