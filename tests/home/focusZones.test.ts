import { describe, expect, it } from 'vitest';
import {
    BUMPER_REPEAT_FIRST_MS, BUMPER_REPEAT_MS, bumperRepeatDelay, edgeStep, nextZone, onBack, opensGameMenu, selectionForButton, stepSelection, tabForButton,
} from '../../src/home/focusZones';

describe('focusZones', () => {
    it('nextZone walks actions-tabs-feed (the recents row is display only) and stops at the ends', () => {
        expect(nextZone('actions', 'down', true)).toBe('tabs');
        expect(nextZone('tabs', 'down', true)).toBe('feed');
        expect(nextZone('feed', 'down', true)).toBe('feed');
        expect(nextZone('feed', 'up', true)).toBe('tabs');
        expect(nextZone('tabs', 'up', true)).toBe('actions');
        expect(nextZone('actions', 'up', true)).toBe('actions');
        // No feed cards to go to: down from tabs stays on the tabs.
        expect(nextZone('tabs', 'down', false)).toBe('tabs');
        expect(nextZone('actions', 'down', false)).toBe('tabs');
    });

    it('onBack: feed -> tabs -> actions, and from the actions B is Steam\'s own (stock)', () => {
        expect(onBack('feed')).toBe('tabs');
        expect(onBack('tabs')).toBe('actions');
        expect(onBack('actions')).toBe('stock');
    });

    describe('edgeStep (Left/Right past the action row\'s ends)', () => {
        const LEFT = 11;
        const RIGHT = 12;
        it('Left on the Play pill steps back a game, Right on the last button steps forward', () => {
            expect(edgeStep(LEFT, 0, 4)).toBe(-1);
            expect(edgeStep(RIGHT, 3, 4)).toBe(1);
        });
        it('inside the row Left/Right are Steam\'s own moves between buttons', () => {
            expect(edgeStep(RIGHT, 0, 4)).toBeNull();
            expect(edgeStep(LEFT, 3, 4)).toBeNull();
            expect(edgeStep(LEFT, 2, 4)).toBeNull();
            expect(edgeStep(RIGHT, 1, 4)).toBeNull();
        });
        it('the Library card\'s single pill is both ends: Left goes back, Right forward', () => {
            expect(edgeStep(LEFT, 0, 1)).toBe(-1);
            expect(edgeStep(RIGHT, 0, 1)).toBe(1);
        });
        it('a held direction never crosses to another game', () => {
            expect(edgeStep(RIGHT, 3, 4, true)).toBeNull();
            expect(edgeStep(LEFT, 0, 4, true)).toBeNull();
        });
        it('other buttons, an unknown focus or a broken count do nothing', () => {
            expect(edgeStep(9, 0, 4)).toBeNull();
            expect(edgeStep(10, 3, 4)).toBeNull();
            expect(edgeStep(5, 0, 4)).toBeNull();
            expect(edgeStep(LEFT, -1, 4)).toBeNull();
            expect(edgeStep(RIGHT, 4, 4)).toBeNull();
            expect(edgeStep(RIGHT, 0, 0)).toBeNull();
            expect(edgeStep(RIGHT, Number.NaN, 4)).toBeNull();
        });
    });

    describe('stepSelection (the step L1/R1 and the row\'s edges share)', () => {
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
