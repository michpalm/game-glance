import { describe, expect, it } from 'vitest';
import { giveWay, MIN_LOGICAL_HEIGHT, roomMissing, STACK_NUMBERS, titleGive } from '../../src/home/giveWay';
import { FEED_SHEET } from '../../src/home/homeCss';

describe('giveWay (what of Home gives way when Steam\'s scale leaves too little room)', () => {
    it('takes nothing when nothing is missing', () => expect(giveWay(0)).toEqual({ need: 0, titleLines: 2, gapsTight: false, chipsHidden: false }));
    it('takes the air first', () => expect(giveWay(52)).toEqual({ need: 52, titleLines: 2, gapsTight: false, chipsHidden: false }));
    it('drops the title to one line past the air', () => expect(giveWay(53)).toEqual({ need: 53, titleLines: 1, gapsTight: false, chipsHidden: false }));
    it('tightens the gaps past the title line', () => expect(giveWay(111)).toMatchObject({ titleLines: 1, gapsTight: true, chipsHidden: false }));
    it('hides the chips last', () => expect(giveWay(136)).toMatchObject({ titleLines: 1, gapsTight: true, chipsHidden: true }));
    it('never moves more than the four steps give', () => expect(giveWay(500).need).toBe(222));
    it('treats a negative or broken need as nothing', () => {
        for (const n of [-5, NaN]) expect(giveWay(n).need).toBe(0);
    });
    it('frees the title block by the steps that apply', () => expect(titleGive(giveWay(136))).toBe(58 + 25 + 87));
});

describe('roomMissing', () => {
    it('lacks no room at 810 or 800', () => {
        expect(roomMissing(810.75, 46)).toBe(0);
        expect(roomMissing(800, 46)).toBe(0);
    });
    it('lacks the difference on a shorter canvas', () => expect(roomMissing(675, 46)).toBe(123));
    it('lacks nothing for a broken height', () => expect(roomMissing(NaN, 46)).toBe(0));
    it('fits the whole stack at the minimum height', () => expect(MIN_LOGICAL_HEIGHT).toBe(576));
});

describe('the stack numbers', () => {
    it('are homeCss FEED_SHEET\'s', () => {
        expect(STACK_NUMBERS).toEqual({ tabsTop: FEED_SHEET.tabsTop, tabHeight: FEED_SHEET.tabHeight, tabClearance: FEED_SHEET.tabClearance, legendReserve: FEED_SHEET.legendReserve });
    });
});
