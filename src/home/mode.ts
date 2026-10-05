import { Settings } from '../data/settings';

export interface HomeMode {
    gamePage: boolean;
    home: boolean;
    restyleDetails: boolean;
}

export function homeMode(s: Settings): HomeMode {
    return {
        gamePage: s.enabled,
        home: s.spotlightHome,
        restyleDetails: s.enabled && s.spotlightHome,
    };
}
