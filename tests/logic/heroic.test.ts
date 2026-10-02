import { describe, expect, it } from 'vitest';
import { heroicStoreLabel, parseHeroicLaunch } from '../../src/logic/heroic';

describe('parseHeroicLaunch', () => {
    it('reads the current query form Heroic writes into Steam shortcuts', () => {
        const options = 'run com.heroicgameslauncher.hgl --no-gui --no-sandbox "heroic://launch?appName=2067731250&runner=gog"';
        expect(parseHeroicLaunch(options)).toEqual({ runner: 'gog', appName: '2067731250' });
    });
    it('reads the query form with the parameters in either order and encoded names', () => {
        expect(parseHeroicLaunch('heroic://launch?runner=legendary&appName=Fortnite%3ALive')).toEqual({ runner: 'legendary', appName: 'Fortnite:Live' });
    });
    it('reads the older path form', () => {
        expect(parseHeroicLaunch('"heroic://launch/legendary/Quail" --no-gui')).toEqual({ runner: 'legendary', appName: 'Quail' });
    });
    it('ignores anything that is not a Heroic launch link', () => {
        expect(parseHeroicLaunch('')).toBeNull();
        expect(parseHeroicLaunch('-novid %command%')).toBeNull();
        expect(parseHeroicLaunch('heroic://launch?runner=gog')).toBeNull();
        expect(parseHeroicLaunch(undefined)).toBeNull();
    });
});

describe('heroicStoreLabel', () => {
    it('names the store behind each Heroic runner', () => {
        expect(heroicStoreLabel({ runner: 'gog', appName: '1' })).toBe('GOG');
        expect(heroicStoreLabel({ runner: 'legendary', appName: '1' })).toBe('Epic');
        expect(heroicStoreLabel({ runner: 'nile', appName: '1' })).toBe('Amazon');
        expect(heroicStoreLabel({ runner: 'sideload', appName: '1' })).toBe('Heroic');
        expect(heroicStoreLabel(null)).toBeNull();
    });
});
