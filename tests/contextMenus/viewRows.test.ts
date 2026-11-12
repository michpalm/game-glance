import { createElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { reshapeGameMenu } from '../../src/contextMenus/reshape';
import { collectionsEnd, viewRows } from '../../src/contextMenus/viewRows';
import { Dev, Family, kt, steamTree } from './steamTree';

const model = (o = {}) => reshapeGameMenu(steamTree(o))!;
const brief = (rows: ReturnType<typeof viewRows>) => rows.map((r) => [r.kind, r.icon ?? null, r.on ?? null, r.page ?? null]);

describe('viewRows', () => {
    it('lays out the main list as the mock-up', () => {
        const rows = viewRows(model({ fav: true }), 'main');
        expect(brief(rows)).toEqual([
            ['check', 'star', true, null],
            ['page', 'folder', null, 'collections'],
            ['page', 'wrench', null, 'manage'],
            ['steam', null, null, null],
            ['steam', 'code', null, null],
            ['separator', null, null, null],
            ['steam', 'gear', null, null],
        ]);
        expect((rows[3].element as ReactElement).type).toBe(Family);
        expect((rows[4].element as ReactElement).type).toBe(Dev);
        expect(rows[1].end).toBe('Playing');
    });
    it('puts rows other plugins add after Developer, with an image icon for artwork', () => {
        const rows = viewRows(model({ plugin: true }), 'main');
        const i = rows.findIndex((r) => r.icon === 'code');
        expect([rows[i + 1].kind, rows[i + 1].icon, (rows[i + 1].element as ReactElement).key]).toEqual(['steam', 'image', 'sgdb-change-artwork']);
    });
    it('leaves out what Steam does not offer', () => {
        expect(viewRows(model({ manage: false }), 'main').some((r) => r.page === 'manage')).toBe(false);
    });
    it('lists every collection as a checkbox, then New collection', () => {
        const rows = viewRows(model(), 'collections');
        expect(brief(rows)).toEqual([['check', null, false, null], ['check', null, true, null], ['separator', null, null, null], ['steam', 'plus', null, null]]);
        expect(rows.map((r) => r.label ?? null).slice(0, 2)).toEqual(['Backlog', 'Playing']);
    });
    it('runs add for a collection the game is not in, remove for one it is in', () => {
        const [backlog, playing] = viewRows(model(), 'collections');
        expect(backlog.run!.key).toBe('add-to-a');
        expect(playing.run!.key).toBe('remove-from-b');
    });
    it('makes Developer a page when its items could be read', () => {
        const dev = { label: 'Developer', items: [createElement(kt, { key: 'ClearProton' })] };
        const rows = viewRows(model(), 'main', dev);
        const row = rows.find((r) => r.icon === 'code')!;
        expect([row.kind, row.page, row.label]).toEqual(['page', 'developer', 'Developer']);
        expect(viewRows(model(), 'developer', dev).map((r) => [r.kind, (r.element as ReactElement).key])).toEqual([['steam', 'ClearProton']]);
    });
    it('leaves Developer out when Steam shows none', () => {
        expect(viewRows(model(), 'main', null).some((r) => r.icon === 'code')).toBe(false);
    });
    it('lists Manage as Steam built it', () => {
        expect(viewRows(model(), 'manage').map((r) => [r.kind, (r.element as ReactElement).key])).toEqual([['steam', 'Uninstall'], ['steam', null]]);
    });
});

describe('collectionsEnd', () => {
    const c = (name: string, inIt: boolean) => ({ id: name, name, inIt, add: null as never, remove: null });
    it('names where the game is', () => {
        expect(collectionsEnd([c('Backlog', false)])).toBe('');
        expect(collectionsEnd([c('Backlog', true)])).toBe('Backlog');
        expect(collectionsEnd([c('Backlog', true), c('Co-op', true), c('Test', true), c('X', false)])).toBe('Backlog +2');
    });
});
