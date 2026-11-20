import { expect, it } from 'vitest';
import { contextMenusOn } from '../../src/contextMenus/gate';

const on = { ready: true, masterEnabled: true, load: 'ready', enabled: true, restyle: true };
it('is on when every condition holds', () => expect(contextMenusOn(on)).toBe(true));
it.each([
    ['master settings not ready', { ready: false }],
    ['Game Glance off', { masterEnabled: false }],
    ['menu preferences not loaded', { load: 'loading' }],
    ['the menu off', { enabled: false }],
    ['Restyle off', { restyle: false }],
])('is off with %s', (_, change) => expect(contextMenusOn({ ...on, ...change })).toBe(false));
