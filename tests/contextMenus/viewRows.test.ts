import { createElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { reshapeGameMenu } from '../../src/contextMenus/reshape';
import { collectionsEnd, pageGroupFocus, rootChildren, rowClassName, viewRows } from '../../src/contextMenus/viewRows';
import { isValidElement, Fragment } from 'react';
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
        const rows = viewRows(model({ plugin: 'other-artwork' }), 'main');
        const i = rows.findIndex((r) => r.icon === 'code');
        expect([rows[i + 1].kind, rows[i + 1].icon, (rows[i + 1].element as ReactElement).key]).toEqual(['steam', 'image', 'other-artwork']);
    });
    // SteamGridDB's item is in Steam's tree on the first render only; on the next one SteamGridDB inserts its own copy
    // before Properties. Drawing the first as our row made it hop across the separator 139 ms after opening (Ally,
    // 2026-11-13), so the panel leaves it to SteamGridDB's own insertion.
    it('leaves SteamGridDB\'s Change Artwork to SteamGridDB', () => {
        const rows = viewRows(model({ plugin: true }), 'main');
        expect(rows.some((r) => (r.element as ReactElement | undefined)?.key === 'sgdb-change-artwork')).toBe(false);
        const i = rows.findIndex((r) => r.icon === 'code');
        expect(rows[i + 1].kind).toBe('separator');
    });
    // SteamGridDB's own row lands a frame after the menu opens (Ally: 61 ms), so the box grew and Properties moved. While its
    // item is in Steam's tree (the first render), the panel holds its place: a stand-in with its label, before Properties.
    it('holds Change Artwork\'s place before Properties while SteamGridDB adds it', () => {
        const rows = viewRows(model({ plugin: true }), 'main');
        const p = rows.findIndex((r) => r.key === 'properties');
        expect([rows[p - 2].kind, rows[p - 1].kind, rows[p - 1].key, rows[p - 1].label, rows[p - 1].icon]).toEqual(['separator', 'slot', 'sgdb-slot', 'Change Artwork...', 'image']);
        expect(viewRows(model(), 'main').some((r) => r.kind === 'slot')).toBe(false);
        expect(viewRows(model({ plugin: 'other-artwork' }), 'main').some((r) => r.kind === 'slot')).toBe(false);
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

describe('the panel inside Steam\'s menu root', () => {
    // SteamGridDB adds Change Artwork into any list of children Steam's root gets, "before Properties"; a page has no
    // Properties, so splice(-1) put it between the header and the rows on every page (Ally, 2026-11-13). A page hands the
    // root one element, which it skips; the main list stays a list, so Change Artwork stays before Properties there.
    it('gives the root a list on the main list and one element on a page', () => {
        const header = createElement('div', { key: 'head' }), body = [createElement('div', { key: 'a' })];
        const main = rootChildren('main', header, body);
        expect(Array.isArray(main)).toBe(true);
        expect((main as unknown[]).length).toBe(2);
        const page = rootChildren('manage', header, body);
        expect(Array.isArray(page)).toBe(false);
        expect(isValidElement(page) && (page as ReactElement).type).toBe(Fragment);
        expect((page as { length?: number }).length).toBeUndefined();
    });
    // A page's first entries can be Steam components that render nothing (Manage on the Ally: nine empty ones before
    // Hide this game), so a mark on the first row could land on nothing and Steam focused its hidden Cancel: B closed.
    it('lets the page group take the first focus and hand it to its first real row', () => {
        expect(pageGroupFocus()).toEqual({ preferredFocus: true, navEntryPreferPosition: 0 });
    });
    it('marks Properties so the plugin row before it can be told apart', () => {
        expect(rowClassName({ key: 'properties', kind: 'steam' })).toBe('gg-gm-row gg-gm-properties');
        expect(rowClassName({ key: 'manage', kind: 'page' })).toBe('gg-gm-row');
    });
});
