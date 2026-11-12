import { createElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { reshapeGameMenu } from '../../src/contextMenus/reshape';
import { Dev, Family, K5, kt, steamTree } from './steamTree';

const kids = (e: ReactElement) => (e.props as { children: unknown[] }).children;

describe('reshapeGameMenu', () => {
    it('reads the name, Favorite and Properties', () => {
        const tree = steamTree({ fav: true });
        const m = reshapeGameMenu(tree)!;
        expect(m.name).toBe('Portal 2');
        expect(m.favorite).toEqual({ on: true, item: kids(tree)[2] });
        expect(reshapeGameMenu(steamTree({ fav: false }))!.favorite!.on).toBe(false);
        expect((m.properties!.props as { children: string }).children).toBe('Properties…');
        expect(m.types.kt).toBe(kt);
        expect(m.types.K5).toBe(K5);
    });
    it('joins Add to and Remove from into one collections list', () => {
        const m = reshapeGameMenu(steamTree())!;
        expect(m.collections!.list.map((c) => [c.id, c.name, c.inIt, Boolean(c.remove)])).toEqual([['a', 'Backlog', false, false], ['b', 'Playing', true, true]]);
        expect(m.collections!.list[0].add.key).toBe('add-to-a');
        expect(m.collections!.newCollection!.key).toBe('add-all-to-new');
    });
    it('handles a library with no collections', () => {
        const m = reshapeGameMenu(steamTree({ collections: [] }))!;
        expect(m.collections!.list).toEqual([]);
        expect(m.collections!.newCollection!.key).toBe('add-all-to-new');
    });
    it('reads Manage and keeps the rest as Steam built it', () => {
        const m = reshapeGameMenu(steamTree())!;
        expect(m.manage!.label).toBe('Manage');
        expect(m.manage!.items.map((i) => (i as ReactElement).key)).toEqual(['Uninstall', null]);
        expect(m.rest.map((e) => (e as ReactElement).type)).toEqual([Family]);
        expect((m.developer as ReactElement).type).toBe(Dev);
        expect(reshapeGameMenu(steamTree({ manage: false }))!.manage).toBeNull();
    });
    it('keeps rows other plugins add after Developer', () => {
        const m = reshapeGameMenu(steamTree({ plugin: true }))!;
        expect(m.after.map((e) => (e as ReactElement).key)).toEqual(['sgdb-change-artwork']);
        expect((m.properties!.props as { children: string }).children).toBe('Properties…');
        expect(reshapeGameMenu(steamTree())!.after).toEqual([]);
    });
    it('works without Properties (Steam\'s kiosk mode)', () => {
        const m = reshapeGameMenu(steamTree({ properties: false }))!;
        expect(m.properties).toBeNull();
        expect(m.types.kt).toBe(kt);
    });
    it('is null for any other shape, and never throws', () => {
        expect(reshapeGameMenu(null)).toBeNull();
        expect(reshapeGameMenu('x')).toBeNull();
        const tree = steamTree();
        expect(reshapeGameMenu(createElement(tree.type, tree.props as object, ...kids(tree).slice(0, 9)))).toBeNull();
        const noNew = createElement(tree.type, tree.props as object, ...kids(tree).map((k, i) => (i === 4 ? createElement(kt, {}) : k)));
        expect(reshapeGameMenu(noNew)).toBeNull();
        const bad = { type: 'x', props: { get children() { throw new Error('boom'); } } };
        expect(reshapeGameMenu(bad)).toBeNull();
    });
});
