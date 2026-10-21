import { describe, expect, it } from 'vitest';
import { rowFocusIndex, focusVisualNeighbour, focusRingClass, needsVisualNav, visualNeighbour } from '../../src/logic/rowNav';

// Unifideck's installed row in DOM order: Play, cloud, controller, settings, Uninstall; cloud shown after settings.
const xs = [58, 581, 427, 504, 658];

describe('rowNav', () => {
    it('only a row out of DOM order needs position stepping', () => {
        expect(needsVisualNav(xs)).toBe(true);
        expect(needsVisualNav([58, 427, 504, 581])).toBe(false);
        expect(needsVisualNav([])).toBe(false);
    });
    it('also steps an ordered row when its preferred-copy link belongs to another native focus group', () => {
        expect(needsVisualNav([58, 427, 504, 581], true)).toBe(true);
    });
    it('steps by position: Play, controller, settings, cloud, Uninstall', () => {
        expect(visualNeighbour(xs, 0, 'right')).toBe(2);
        expect(visualNeighbour(xs, 2, 'right')).toBe(3);
        expect(visualNeighbour(xs, 3, 'right')).toBe(1);
        expect(visualNeighbour(xs, 1, 'right')).toBe(4);
        expect(visualNeighbour(xs, 4, 'left')).toBe(1);
        expect(visualNeighbour(xs, 1, 'left')).toBe(3);
        expect(visualNeighbour(xs, 2, 'left')).toBe(0);
    });
    it('the ends have no neighbour; unknown buttons neither', () => {
        expect(visualNeighbour(xs, 4, 'right')).toBeNull();
        expect(visualNeighbour(xs, 0, 'left')).toBeNull();
        expect(visualNeighbour(xs, 9, 'right')).toBeNull();
    });
    it("recognises Steam's focus-ring rule and ignores the dialog rule that hides it", () => {
        const ring = '._1wPpl { position: absolute; pointer-events: none; outline-offset: 2px; outline: rgba(255, 255, 255, 0.6) solid 2px; }';
        const hidden = 'body:has(._dlg) ._1wPpl { outline: none !important; visibility: hidden !important; }';
        expect(focusRingClass(ring)).toBe('_1wPpl');
        expect(focusRingClass(hidden)).toBeNull();
        expect(focusRingClass('')).toBeNull();
    });
});

describe('focusVisualNeighbour', () => {
    it('skips a visible status-only cloud control that refuses focus', () => {
        const attempts: number[] = [];
        expect(focusVisualNeighbour([100, 200, 300, 600], 3, 'left', (i) => { attempts.push(i); return i !== 2; })).toBe(1);
        expect(attempts).toEqual([2, 1]);
        expect(focusVisualNeighbour([100, 200, 300, 600], 1, 'right', (i) => i !== 2)).toBe(3);
        expect(focusVisualNeighbour([100, 200], 1, 'right', () => true)).toBeNull();
    });
});

describe('rowFocusIndex', () => {
    it('prefers the event target over a stale focus class earlier in DOM order', () => {
        const controls = [{ name: 'play' }, { name: 'controller' }, { name: 'settings' }];
        const contains = (a: object, b: object) => a === b;
        expect(rowFocusIndex(controls, controls[1], controls[0], contains)).toBe(1);
        expect(rowFocusIndex(controls, null, controls[0], contains)).toBe(0);
        expect(rowFocusIndex(controls, {}, null, contains)).toBe(-1);
    });
});
