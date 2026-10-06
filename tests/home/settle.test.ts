import { describe, expect, it } from 'vitest';
import { BUMPER_REPEAT_MS } from '../../src/home/focusZones';
import { SELECTION_SETTLE_MS } from '../../src/home/useHomeData';

describe('SELECTION_SETTLE_MS', () => {
    it('is longer than a held bumper\'s repeat, so holding L1/R1 never settles on the games it passes', () => {
        expect(SELECTION_SETTLE_MS).toBeGreaterThan(BUMPER_REPEAT_MS);
        expect(SELECTION_SETTLE_MS).toBeLessThanOrEqual(300);
    });
});
