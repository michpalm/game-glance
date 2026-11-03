import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { activateDeckyPlugin, listDeckyPlugins } from '../../src/menu/steam/deckyPlugins';

const icon = createElement('svg');
const plugin = (name: string, extra: Record<string, unknown> = {}) => ({ name, version: '1.0', icon, ...extra });

describe('listDeckyPlugins', () => {
    it('orders loaded plugins by Decky’s order, once each, then the rest in load order', () => {
        const loader = { plugins: [plugin('Ambideck'), plugin('Game Glance'), plugin('Unifideck'), plugin('Animation Changer')],
            deckyState: { _pluginOrder: ['Unifideck', 'Animation Changer', 'Animation Changer', 'Deck Shelves', 'Game Glance'], _hiddenPlugins: [] } };
        expect(listDeckyPlugins(loader)!.map(p => p.name)).toEqual(['Unifideck', 'Animation Changer', 'Game Glance', 'Ambideck']);
    });
    it('leaves out hidden plugins', () => {
        const loader = { plugins: [plugin('A'), plugin('B')], deckyState: { _pluginOrder: ['A', 'B'], _hiddenPlugins: ['A'] } };
        expect(listDeckyPlugins(loader)!.map(p => p.name)).toEqual(['B']);
    });
    it('keeps name, version and a React icon; drops an icon that is not an element', () => {
        const loader = { plugins: [plugin('A'), plugin('B', { icon: { not: 'an element' }, version: 7 })], deckyState: {} };
        const [a, b] = listDeckyPlugins(loader)!;
        expect(a).toEqual({ name: 'A', version: '1.0', icon });
        expect(b).toEqual({ name: 'B', version: '', icon: null });
    });
    it('skips entries without a name and tolerates a missing state', () => {
        const loader = { plugins: [null, { version: '1' }, plugin('A')] };
        expect(listDeckyPlugins(loader)!.map(p => p.name)).toEqual(['A']);
    });
    it('returns null when the loader or its list cannot be read', () => {
        expect(listDeckyPlugins(null)).toBeNull();
        expect(listDeckyPlugins({ plugins: 'nope' })).toBeNull();
    });
});

describe('activateDeckyPlugin', () => {
    it('sets Decky’s active plugin by name, with the state as this', () => {
        const state = { _activePlugin: null as unknown, setActivePlugin: vi.fn(function (this: { _activePlugin: unknown }, name: string) { this._activePlugin = name; }) };
        activateDeckyPlugin('Unifideck', { plugins: [], deckyState: state });
        expect(state.setActivePlugin).toHaveBeenCalledWith('Unifideck');
        expect(state._activePlugin).toBe('Unifideck');
    });
    it('does nothing without a setter, and never throws', () => {
        expect(() => activateDeckyPlugin('A', null)).not.toThrow();
        expect(() => activateDeckyPlugin('A', { deckyState: {} })).not.toThrow();
        expect(() => activateDeckyPlugin('A', { deckyState: { setActivePlugin: () => { throw Error('x'); } } })).not.toThrow();
    });
});
