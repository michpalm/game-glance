import { describe, expect, it } from 'vitest';
import { Settings } from '../../src/data/settings';
import { homeMode } from '../../src/home/mode';

const make = (enabled: boolean, spotlightHome: boolean): Settings => ({
    enabled,
    autoPreload: true,
    spotlightHome,
    wishlistDeals: false,
});

describe('homeMode', () => {
    it('homeMode all four combinations', () => {
        expect(homeMode(make(true, false))).toEqual({ gamePage: true, home: false, restyleDetails: false });
        expect(homeMode(make(true, true))).toEqual({ gamePage: true, home: true, restyleDetails: true });
        expect(homeMode(make(false, true))).toEqual({ gamePage: false, home: true, restyleDetails: false });
        expect(homeMode(make(false, false))).toEqual({ gamePage: false, home: false, restyleDetails: false });
    });
});
