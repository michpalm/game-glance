import { describe, expect, it } from 'vitest';
import { parseLutrisLaunch } from '../../src/logic/lutris';

describe('parseLutrisLaunch (the shortcut Lutris creates; probed on the Ally, Lutris 0.5.22)', () => {
    it('the Flatpak shortcut', () => expect(parseLutrisLaunch('run net.lutris.Lutris lutris:rungameid/1')).toEqual({ gameId: 1, flatpak: true }));
    it('a native shortcut, quoted or not', () => {
        expect(parseLutrisLaunch('lutris:rungameid/42')).toEqual({ gameId: 42, flatpak: false });
        expect(parseLutrisLaunch("'lutris:rungameid/42'")).toEqual({ gameId: 42, flatpak: false });
    });
    it('a launch configuration after the id keeps the id', () => expect(parseLutrisLaunch('run net.lutris.Lutris lutris:rungameid/7/Config')).toEqual({ gameId: 7, flatpak: true }));
    it('anything else is not Lutris', () => {
        for (const v of [undefined, null, '', 'heroic://launch?appName=1&runner=gog', 'lutris:rungame/rdr2', 'lutris:rungameid/x', 'lutris:rungameid/0']) expect(parseLutrisLaunch(v)).toBeNull();
    });
});
