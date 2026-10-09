import { describe, expect, it } from 'vitest';
import { needsVisualNav, visualNeighbour } from '../../src/logic/rowNav';

// Unifideck's installed row in DOM order: Play, cloud, controller, settings, Uninstall; cloud shown after settings.
const xs = [58, 581, 427, 504, 658];

describe('rowNav', () => {
    it('only a row out of DOM order needs position stepping', () => {
        expect(needsVisualNav(xs)).toBe(true);
        expect(needsVisualNav([58, 427, 504, 581])).toBe(false);
        expect(needsVisualNav([])).toBe(false);
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
});
