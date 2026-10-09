import { describe, expect, it } from 'vitest';
import { BUMPER_REPEAT_MS } from '../../src/home/focusZones';
import { accentNow, SELECTION_SETTLE_MS } from '../../src/home/useHomeData';

describe('SELECTION_SETTLE_MS', () => {
    it('is longer than a held bumper\'s repeat, so holding L1/R1 never settles on the games it passes', () => {
        expect(SELECTION_SETTLE_MS).toBeGreaterThan(BUMPER_REPEAT_MS);
        expect(SELECTION_SETTLE_MS).toBeLessThanOrEqual(300);
    });
});

describe('accentNow', () => {
    const memo = new Map([[10, '#ff0000']]);

    it('a known colour shows on the step itself, moving or resting, with no lookup', () => {
        expect(accentNow(10, null, memo)).toEqual({ show: '#ff0000', fetch: false });
        expect(accentNow(10, 10, memo)).toEqual({ show: '#ff0000', fetch: false });
    });
    it('an unknown colour is looked up only once the selection rests on that game', () => {
        expect(accentNow(20, null, memo)).toEqual({ fetch: false });
        expect(accentNow(20, 10, memo)).toEqual({ fetch: false });
        expect(accentNow(20, 20, memo)).toEqual({ fetch: true });
    });
    it('no game: nothing', () => {
        expect(accentNow(null, null, memo)).toEqual({ fetch: false });
    });
});
