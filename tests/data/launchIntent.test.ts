import { afterEach, describe, expect, it } from 'vitest';
import { clearLaunch, LAUNCH_INTENT_MS, launchPending, markLaunch } from '../../src/data/launchIntent';

describe('launchIntent', () => {
    afterEach(clearLaunch);

    it('is pending for the launched game only, for LAUNCH_INTENT_MS', () => {
        markLaunch(42, 1000);
        expect(launchPending(42, 1000)).toBe(true);
        expect(launchPending(42, 1000 + LAUNCH_INTENT_MS - 1)).toBe(true);
        expect(launchPending(42, 1000 + LAUNCH_INTENT_MS)).toBe(false);
        expect(launchPending(7, 1000)).toBe(false);
        expect(launchPending(42, 999)).toBe(false);
    });
    it('clears, and a later launch replaces an earlier one; broken ids are ignored', () => {
        markLaunch(42, 1000);
        clearLaunch();
        expect(launchPending(42, 1000)).toBe(false);
        markLaunch(1, 1000);
        markLaunch(2, 1001);
        expect(launchPending(1, 1001)).toBe(false);
        expect(launchPending(2, 1001)).toBe(true);
        markLaunch(0, 2000);
        markLaunch(Number.NaN, 2000);
        expect(launchPending(2, 2000)).toBe(true);
    });
});
