import { Component, createElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { expandDeveloper } from '../../src/contextMenus/developerPage';
import { kt, Vs } from './steamTree';

const proton = createElement(kt, { key: 'ClearProton', onSelected: () => 'p', children: 'Delete Proton files' } as Record<string, unknown>);
/** Steam's Developer component (Xt) as probed 2026-11-12: a plain function that returns one Vs, or null. */
const devOf = (ret: () => unknown) => createElement(function Xt() { return ret() as null; }, { rgApps: [] } as Record<string, unknown>);

describe('expandDeveloper', () => {
    it('reads Steam\'s Developer submenu into a page, dropping items Steam leaves out', () => {
        const page = expandDeveloper(devOf(() => createElement(Vs, { label: 'Developer', children: [proton, false] } as Record<string, unknown>)));
        expect(page).not.toBeUndefined();
        expect(page!.label).toBe('Developer');
        expect(page!.items.map((i) => (i as ReactElement).key)).toEqual(['ClearProton']);
    });
    it('is null when Steam shows no Developer menu', () => {
        expect(expandDeveloper(devOf(() => null))).toBeNull();
    });
    it('cannot expand (undefined: keep Steam\'s own submenu) when the shape is not as probed', () => {
        expect(expandDeveloper(null)).toBeUndefined();
        expect(expandDeveloper(devOf(() => createElement('div')))).toBeUndefined();
        expect(expandDeveloper(devOf(() => createElement(Vs, { label: 'Developer', children: 'x' } as Record<string, unknown>)))).toBeUndefined();
        expect(expandDeveloper(devOf(() => { throw new Error('steam'); }))).toBeUndefined();
        class Cls extends Component { render() { return null; } }
        expect(expandDeveloper(createElement(Cls))).toBeUndefined();
    });
});
