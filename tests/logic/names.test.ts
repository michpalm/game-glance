import { describe, expect, it } from 'vitest';
import { cleanTitle, sameTitle } from '../../src/logic/names';

describe('cleanTitle', () => {
    it('strips trademark symbols', () => {
        expect(cleanTitle('DOOM™ Eternal')).toBe('DOOM Eternal');
        expect(cleanTitle('Batman®: Arkham Knight')).toBe('Batman: Arkham Knight');
    });
    it('strips edition suffixes, repeatedly', () => {
        expect(cleanTitle('The Witcher 3: Wild Hunt – Game of the Year Edition')).toBe('The Witcher 3: Wild Hunt');
        expect(cleanTitle('Batman: Arkham Knight GOTY')).toBe('Batman: Arkham Knight');
        expect(cleanTitle('Game — Definitive Edition™')).toBe('Game');
        expect(cleanTitle('Mafia: Definitive Edition Remastered')).toBe('Mafia');
    });
    it('leaves normal and non-Latin titles alone', () => {
        expect(cleanTitle('Final Fantasy VII Remake')).toBe('Final Fantasy VII Remake');
        expect(cleanTitle('ペルソナ５ ザ・ロイヤル')).toBe('ペルソナ５ ザ・ロイヤル');
    });
    it('never returns an empty string', () => {
        expect(cleanTitle('Remastered')).toBe('Remastered');
        expect(cleanTitle('™')).toBe('™');
        expect(cleanTitle('  ')).toBe('');
    });
});

describe('sameTitle', () => {
    it('matches names that differ only in case, symbols, punctuation or edition suffixes', () => {
        expect(sameTitle('Chained Echoes', 'chained echoes')).toBe(true);
        expect(sameTitle('Hades™', 'Hades')).toBe(true);
        expect(sameTitle('The Witcher 3: Wild Hunt - Game of the Year Edition', 'The Witcher 3 Wild Hunt')).toBe(true);
        expect(sameTitle('Pokémon Café', 'Pokemon Cafe')).toBe(true);
    });
    it('rejects different games, DLC and soundtracks', () => {
        expect(sameTitle('Chained Echoes', 'Chained Echoes: Ashes of Elrant')).toBe(false);
        expect(sameTitle('Chained Echoes', 'Chained Echoes (Original Game Soundtrack)')).toBe(false);
        expect(sameTitle('Hades', 'Hades II')).toBe(false);
        expect(sameTitle('', '')).toBe(false);
        expect(sameTitle('™', '®')).toBe(false);
    });
});
