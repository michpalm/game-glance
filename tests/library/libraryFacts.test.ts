import { describe, expect, it } from 'vitest';
import { formatLastPlayed, formatPlayed, formatSize, glance } from '../../src/library/libraryFacts';
import type { LibGame } from '../../src/library/libraryModel';

const w3: LibGame = { appId: 292030, name: 'The Witcher 3', playedMin: 2563, lastPlayed: 1794495475, sizeBytes: 69795378546, installed: true, shortcut: false };
const now = new Date('2026-11-19T12:00:00Z');

describe('glance', () => {
    it('matches the mock-up', () => expect(glance(w3, { achievements: { achieved: 13, total: 78 }, hltbMainHours: 56.8, protonTier: 'platinum' }, ['Favorites', 'Backlog', 'Playing'], now)).toEqual({
        progress: [{ label: 'Achievements', value: '13 of 78', ratio: 13 / 78 }, { label: 'HLTB main story', value: '43 of 57 h', ratio: 2563 / 60 / 56.8 }],
        facts: [{ label: 'Played', value: '42 h 43 min' }, { label: 'Last played', value: '12 Nov' }, { label: 'On disk', value: '65.0 GB' }, { label: 'ProtonDB', value: 'Platinum', tone: 'platinum' }],
        collections: ['Favorites', 'Backlog', 'Playing'],
    }));
    it('caps the story bar at 1', () => {
        const out = glance({ ...w3, playedMin: 7200 }, { hltbMainHours: 56.8 }, [], now);
        expect(out.progress).toEqual([{ label: 'HLTB main story', value: '120 of 57 h', ratio: 1 }]);
    });
    it('leaves out what is unknown (Review Focus 3)', () => expect(glance({ ...w3, playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false }, { achievements: { achieved: 0, total: 0 } }, ['Horror'], now))
        .toEqual({ progress: [], facts: [], collections: ['Horror'] }));
    it('an installed game of unknown size shows no On disk', () =>
        expect(glance({ ...w3, sizeBytes: 0 }, {}, [], now).facts.map(f => f.label)).toEqual(['Played', 'Last played']));
});

describe('device check 5', () => {
    it('a game that is not installed shows the space it needs', () => {
        const out = glance({ ...w3, installed: false, sizeBytes: 0 }, { requiredBytes: 13207024435 }, [], now);
        expect(out.facts).toContainEqual({ label: 'Required space', value: '12.3 GB' });
        expect(out.facts.some(f => f.label === 'On disk')).toBe(false);
    });
    it('an installed game shows On disk, not the space it needs', () => {
        const labels = glance(w3, { requiredBytes: 13207024435 }, [], now).facts.map(f => f.label);
        expect(labels).toContain('On disk');
        expect(labels).not.toContain('Required space');
    });
    it('an unknown ProtonDB tier name gets no tone', () =>
        expect(glance(w3, { protonTier: 'pending' }, [], now).facts.find(f => f.label === 'ProtonDB')).toEqual({ label: 'ProtonDB', value: 'Pending' }));
});

describe('formatting', () => {
    it('playtime', () => {
        expect(formatPlayed(14)).toBe('14 min');
        expect(formatPlayed(60)).toBe('1 h');
        expect(formatPlayed(2563)).toBe('42 h 43 min');
    });
    it('last played: day and month this year, with the year otherwise', () => {
        expect(formatLastPlayed(1794495475, now)).toBe('12 Nov');
        expect(formatLastPlayed(1730000000, now)).toBe('27 Oct 2024');
    });
    it('size in binary units, as Steam shows it', () => {
        expect(formatSize(69795378546)).toBe('65.0 GB');
        expect(formatSize(1073741824 / 2)).toBe('512 MB');
    });
});
