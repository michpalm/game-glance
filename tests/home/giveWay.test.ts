import { describe, expect, it } from 'vitest';
import { GIVE_WAY, giveWay, roomMissing, STACK_NUMBERS } from '../../src/home/giveWay';
import { FEED_SHEET } from '../../src/home/homeCss';

describe('giveWay (the air above the title gives way to the default growth, #55)', () => {
    it('takes nothing when nothing is missing', () => expect(giveWay(0)).toEqual({ need: 0 }));
    it('takes the missing room from the air', () => expect(giveWay(30)).toEqual({ need: 30 }));
    it('never takes more than the air', () => expect(giveWay(500).need).toBe(GIVE_WAY.air));
    it('treats a negative or broken need as nothing', () => {
        for (const n of [-5, NaN]) expect(giveWay(n).need).toBe(0);
    });
});

describe('roomMissing', () => {
    it('lacks no room at 810 or 800', () => {
        expect(roomMissing(810.75, 46)).toBe(0);
        expect(roomMissing(800, 46)).toBe(0);
    });
    it('lacks the difference on a shorter canvas', () => expect(roomMissing(745.6, 46)).toBe(52));
    it('lacks nothing for a broken height', () => expect(roomMissing(NaN, 46)).toBe(0));
});

describe('the stack numbers', () => {
    it('are homeCss FEED_SHEET\'s', () => {
        expect(STACK_NUMBERS).toEqual({ tabsTop: FEED_SHEET.tabsTop, tabHeight: FEED_SHEET.tabHeight, tabClearance: FEED_SHEET.tabClearance, legendReserve: FEED_SHEET.legendReserve });
    });
});
