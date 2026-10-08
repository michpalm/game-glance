import { describe, expect, it } from 'vitest';
import { Settings } from '../../src/data/settings';
import { homeMode } from '../../src/home/mode';

const make = (enabled: boolean, spotlightHome: boolean, cleanPage = false): Settings => ({
    enabled,
    autoPreload: true,
    spotlightHome,
    wishlistDeals: false,
    homeFeed: true,
    homeNewGames: false,
    cleanPage,
    homeStatusBar: true,
    preferLogos: true,
});

describe('homeMode', () => {
    it('homeMode all four combinations', () => {
        expect(homeMode(make(true, false))).toEqual({ gamePage: true, home: false, restyleDetails: false, cleanDetails: false });
        expect(homeMode(make(true, true))).toEqual({ gamePage: true, home: true, restyleDetails: true, cleanDetails: false });
        expect(homeMode(make(false, true))).toEqual({ gamePage: false, home: true, restyleDetails: false, cleanDetails: false });
        expect(homeMode(make(false, false))).toEqual({ gamePage: false, home: false, restyleDetails: false, cleanDetails: false });
    });
    it('the Clean look turns on the restyled page, with or without Spotlight Home, and only with the page on', () => {
        expect(homeMode(make(true, false, true))).toEqual({ gamePage: true, home: false, restyleDetails: true, cleanDetails: true });
        expect(homeMode(make(true, true, true))).toEqual({ gamePage: true, home: true, restyleDetails: true, cleanDetails: true });
        expect(homeMode(make(false, true, true))).toEqual({ gamePage: false, home: true, restyleDetails: false, cleanDetails: false });
    });
});
