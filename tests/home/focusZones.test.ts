import { describe, expect, it } from 'vitest';
import {
    BUMPER_REPEAT_FIRST_MS, BUMPER_REPEAT_MS, bumperRepeatDelay, nextZone, onBack, opensGameMenu, recentsButton, repeatStep, selectionForButton, stepSelection, tabForButton,
} from '../../src/home/focusZones';

describe('focusZones', () => {
    it('nextZone walks actions-cards-tabs-feed and stops at the ends', () => {
        expect(nextZone('actions', 'down', true)).toBe('recents');
        expect(nextZone('recents', 'down', true)).toBe('tabs');
        expect(nextZone('tabs', 'down', true)).toBe('feed');
        expect(nextZone('feed', 'down', true)).toBe('feed');
        expect(nextZone('feed', 'up', true)).toBe('tabs');
        expect(nextZone('tabs', 'up', true)).toBe('recents');
        expect(nextZone('recents', 'up', true)).toBe('actions');
        expect(nextZone('actions', 'up', true)).toBe('actions');
        // No feed cards to go to: down from tabs stays on the tabs.
        expect(nextZone('tabs', 'down', false)).toBe('tabs');
        expect(nextZone('recents', 'down', false)).toBe('tabs');
    });

    it('onBack: feed -> tabs -> the game cards, the action row -> the game cards; on the cards B is Steam\'s own (stock)', () => {
        expect(onBack('feed')).toBe('tabs');
        expect(onBack('tabs')).toBe('recents');
        expect(onBack('actions')).toBe('recents');
        expect(onBack('recents')).toBe('stock');
    });

    describe('recentsButton (the game card row)', () => {
        const LEFT = 11;
        const RIGHT = 12;
        it('Left/Right select the previous / next game, through the Library card like L1/R1', () => {
            expect(recentsButton(RIGHT, 0, 3)).toEqual({ select: 1 });
            expect(recentsButton(RIGHT, 2, 3)).toEqual({ select: 3 });
            expect(recentsButton(RIGHT, 3, 3)).toEqual({ select: 0 });
            expect(recentsButton(LEFT, 0, 3)).toEqual({ select: 3 });
            expect(recentsButton(LEFT, 2, 3)).toEqual({ select: 1 });
        });
        it('a held direction stops at the ends instead of looping', () => {
            expect(recentsButton(RIGHT, 3, 3, true)).toEqual({ select: 3 });
            expect(recentsButton(LEFT, 0, 3, true)).toEqual({ select: 0 });
            expect(recentsButton(RIGHT, 1, 3, true)).toEqual({ select: 2 });
        });
        it('L1/R1 hand over to the bumpers (focus to Play), View/Menu open the game menu', () => {
            expect(recentsButton(5, 1, 3)).toBe('bumper');
            expect(recentsButton(6, 1, 3)).toBe('bumper');
            expect(recentsButton(13, 1, 3)).toBe('menu');
            expect(recentsButton(14, 1, 3)).toBe('menu');
        });
        it('A, B, up and down are Steam\'s; no games: nothing', () => {
            for (const b of [1, 2, 9, 10]) expect(recentsButton(b, 1, 3)).toBeNull();
            expect(recentsButton(RIGHT, 0, 0)).toBeNull();
            expect(recentsButton(5, 0, Number.NaN)).toBeNull();
        });
    });

    describe('repeatStep (a held Left/Right on the cards, at a held bumper\'s pace)', () => {
        it('a fresh press always steps and starts over', () => {
            expect(repeatStep(1000, null, false)).toEqual({ step: true, next: { at: 1000, repeats: 0 } });
            expect(repeatStep(1050, { at: 1000, repeats: 5 }, false)).toEqual({ step: true, next: { at: 1050, repeats: 0 } });
        });
        it('Steam\'s fast repeats are swallowed until the bumper delay has passed: 400 ms first, then 170 ms', () => {
            let last = repeatStep(0, null, false).next;
            expect(repeatStep(100, last, true).step).toBe(false);
            expect(repeatStep(399, last, true).step).toBe(false);
            const first = repeatStep(400, last, true);
            expect(first).toEqual({ step: true, next: { at: 400, repeats: 1 } });
            last = first.next;
            expect(repeatStep(500, last, true).step).toBe(false);
            expect(repeatStep(570, last, true)).toEqual({ step: true, next: { at: 570, repeats: 2 } });
        });
        it('a repeat with nothing held yet steps (focus arrived mid-hold)', () => {
            expect(repeatStep(10, null, true)).toEqual({ step: true, next: { at: 10, repeats: 0 } });
        });
    });

    describe('stepSelection (the step L1/R1 and the card row share)', () => {
        it('wraps through the Library card like L1/R1', () => {
            expect(stepSelection(2, 1, 3)).toBe(3);
            expect(stepSelection(3, 1, 3)).toBe(0);
            expect(stepSelection(0, -1, 3)).toBe(3);
            expect(stepSelection(3, -1, 3)).toBe(2);
            expect(stepSelection(1, 1, 3)).toBe(selectionForButton(1, 6, 3));
        });
        it('no games: null', () => {
            expect(stepSelection(0, 1, 0)).toBeNull();
        });
    });

    describe('selectionForButton (L1/R1 on the action row)', () => {
        // Three games: 0, 1, 2; index 3 is the Library card. BUMPER_LEFT = 5, BUMPER_RIGHT = 6.
        it('R1 moves to the next game, past the last game onto the Library card, then wraps to game 1', () => {
            expect(selectionForButton(0, 6, 3)).toBe(1);
            expect(selectionForButton(1, 6, 3)).toBe(2);
            expect(selectionForButton(2, 6, 3)).toBe(3);
            expect(selectionForButton(3, 6, 3)).toBe(0);
        });
        it('L1 goes the other way: game 1 -> Library card -> last game', () => {
            expect(selectionForButton(0, 5, 3)).toBe(3);
            expect(selectionForButton(3, 5, 3)).toBe(2);
            expect(selectionForButton(2, 5, 3)).toBe(1);
            expect(selectionForButton(1, 5, 3)).toBe(0);
        });
        it('a held bumper (repeat) walks the row but stops at the ends instead of looping', () => {
            expect(selectionForButton(1, 6, 3, true)).toBe(2);
            expect(selectionForButton(2, 6, 3, true)).toBe(3);
            expect(selectionForButton(3, 6, 3, true)).toBe(3);
            expect(selectionForButton(2, 5, 3, true)).toBe(1);
            expect(selectionForButton(0, 5, 3, true)).toBe(0);
            // From the Library card a held L1 still walks back.
            expect(selectionForButton(3, 5, 3, true)).toBe(2);
        });
        it('one game: R1 toggles between it and the Library card', () => {
            expect(selectionForButton(0, 6, 1)).toBe(1);
            expect(selectionForButton(1, 6, 1)).toBe(0);
            expect(selectionForButton(0, 5, 1)).toBe(1);
        });
        it('is null for other buttons and without games, so the event is left to Steam', () => {
            for (const button of [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, NaN]) expect(selectionForButton(0, button, 3)).toBeNull();
            expect(selectionForButton(0, 6, 0)).toBeNull();
            expect(selectionForButton(0, 6, NaN)).toBeNull();
        });
        it('clamps a broken current index into 0..count', () => {
            expect(selectionForButton(9, 6, 3)).toBe(0);
            expect(selectionForButton(-4, 6, 3)).toBe(1);
            expect(selectionForButton(NaN, 6, 3)).toBe(1);
        });
    });

    it('bumperRepeatDelay: the first repeat after a pause, then a steady 160-180 ms', () => {
        expect(bumperRepeatDelay(0)).toBe(BUMPER_REPEAT_FIRST_MS);
        expect(bumperRepeatDelay(1)).toBe(BUMPER_REPEAT_MS);
        expect(bumperRepeatDelay(7)).toBe(BUMPER_REPEAT_MS);
        expect(BUMPER_REPEAT_FIRST_MS).toBeGreaterThan(BUMPER_REPEAT_MS);
        expect(BUMPER_REPEAT_MS).toBeGreaterThanOrEqual(160);
        expect(BUMPER_REPEAT_MS).toBeLessThanOrEqual(180);
        expect(BUMPER_REPEAT_FIRST_MS).toBe(400);
    });

    it('opensGameMenu: View/Select (13) and the menu button (14), nothing else', () => {
        expect(opensGameMenu(13)).toBe(true);
        expect(opensGameMenu(14)).toBe(true);
        for (const button of [0, 1, 2, 3, 4, 5, 6, 12, 15, NaN]) expect(opensGameMenu(button)).toBe(false);
    });

    describe('tabForButton', () => {
        // GamepadButton.BUMPER_LEFT = 5 (L1), BUMPER_RIGHT = 6 (R1); three tabs.
        it('L1 at the first tab stays on it', () => {
            expect(tabForButton(0, 5, 3)).toBe(0);
        });
        it('R1 at the last tab stays on it', () => {
            expect(tabForButton(2, 6, 3)).toBe(2);
        });
        it('L1 and R1 move one tab from the middle, no wrap', () => {
            expect(tabForButton(1, 5, 3)).toBe(0);
            expect(tabForButton(1, 6, 3)).toBe(2);
            expect(tabForButton(0, 6, 3)).toBe(1);
            expect(tabForButton(2, 5, 3)).toBe(1);
        });
        it('is null for any other button, so the event is left to Steam', () => {
            for (const button of [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, NaN]) expect(tabForButton(1, button, 3)).toBeNull();
        });
        it('clamps a broken current tab or count', () => {
            expect(tabForButton(5, 5, 3)).toBe(1);
            expect(tabForButton(-1, 6, 3)).toBe(1);
            expect(tabForButton(0, 6, 0)).toBe(0);
            expect(tabForButton(NaN, 6, 3)).toBe(1);
        });
    });
});
