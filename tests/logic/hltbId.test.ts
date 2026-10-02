import { describe, expect, it } from 'vitest';
import { checkOverride, parseHltbId } from '../../src/logic/hltbId';

describe('parseHltbId', () => {
    it('accepts plain ids and HLTB links', () => {
        expect(parseHltbId('10270')).toBe(10270);
        expect(parseHltbId(' https://howlongtobeat.com/game/10270 ')).toBe(10270);
        expect(parseHltbId('howlongtobeat.com/game/10270?ref=x')).toBe(10270);
    });
    it('rejects anything else', () => {
        expect(parseHltbId('')).toBeNull();
        expect(parseHltbId('0')).toBeNull();
        expect(parseHltbId('witcher')).toBeNull();
        expect(parseHltbId('https://example.com/game')).toBeNull();
    });
});

describe('checkOverride', () => {
    it('accepts HowLongToBeat ids and links', () => {
        expect(checkOverride('https://howlongtobeat.com/game/10270', 292030)).toEqual({ id: 10270 });
        expect(checkOverride('10270', 292030)).toEqual({ id: 10270 });
    });
    it("rejects the game's own Steam app id with an explanation", () => {
        const result = checkOverride('292030', 292030);
        expect(result).toHaveProperty('error');
        expect((result as { error: string }).error).toContain('Steam');
        expect((result as { error: string }).error).toContain('howlongtobeat.com/game/');
    });
    it('rejects input that is not an id or link', () => {
        expect(checkOverride('witcher', 292030)).toEqual({ error: 'Enter a HowLongToBeat link or game ID.' });
    });
});
