import { Settings } from '../data/settings';

export interface HomeMode {
    gamePage: boolean;
    home: boolean;
    restyleDetails: boolean;
    /** The Game Glance page's Clean look (one row at the bottom, no description or HowLongToBeat cards). */
    cleanDetails: boolean;
}

export function homeMode(s: Settings): HomeMode {
    return {
        gamePage: s.enabled,
        home: s.spotlightHome,
        // The Clean look is built on the restyled page (its title, Play pill and accent), with or without Spotlight Home.
        restyleDetails: s.enabled && (s.spotlightHome || s.cleanPage),
        cleanDetails: s.enabled && s.cleanPage,
    };
}
