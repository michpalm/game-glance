import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div' }));
import { StoragePageView } from '../../src/storage/StoragePage';
import type { GameRow, StorageView } from '../../src/storage/storageModel';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    if (typeof element.type === 'function') return tree((element.type as (p: unknown) => ReactNode)(element.props));
    return [element, ...tree(element.props.children)];
}
const text = (node: ReactNode): string => tree(node).flatMap(e => [e.props.children].flat().filter(c => typeof c === 'string' || typeof c === 'number')).join(' ');
const focus = (node: ReactNode, key: string) => tree(node).find(e => e.props['data-gg-focus'] === key);

const row = (appId: number, extra: Partial<GameRow> = {}): GameRow => ({ appId, name: `Game ${appId}`, status: 'Played today', size: '1.0 GB', progress: null,
    a: { label: 'Game page', run: 'page' }, x: { label: 'Move to SD card', run: 'move' }, y: { label: 'Uninstall', run: 'uninstall' }, ...extra });
const view = (extra: Partial<StorageView> = {}): StorageView => ({
    available: true, loading: false, picked: 0, eyebrow: 'On the internal drive · biggest first', empty: null, note: null,
    cards: [{ index: 0, name: 'Internal drive', kind: 'internal', free: '111', line: '354 of 465 GB used · 24 games', usedRatio: .76, moving: null },
        { index: 1, name: 'SD card', kind: 'sd', free: '12', line: '500 of 512 GB used · 0 games', usedRatio: .98, moving: 'Moving in · 15.5 GB to go' }],
    rows: [row(1), row(2, { x: null, y: null, status: 'Running now · Close the game first' })], ...extra });
const render = (v: StorageView, extra: Record<string, unknown> = {}) => StoragePageView({ view: v, art: id => id === 1 ? `art-${id}.jpg` : null, hero: null,
    onPick: () => {}, onRow: () => {}, ...extra });

describe('StoragePageView', () => {
    it('draws the title, cards, eyebrow and rows', () => {
        const out = render(view());
        const all = text(out);
        expect(all).toContain('Storage');
        expect(all).toContain('Internal drive');
        expect(all).toContain('354 of 465 GB used · 24 games');
        expect(all).toContain('Moving in · 15.5 GB to go');
        expect(all).toContain('On the internal drive · biggest first');
        expect(focus(out, 'storage:drive:0')?.props['aria-current']).toBe(true);
        expect(focus(out, 'storage:drive:1')?.props['aria-current']).toBe(false);
        expect(focus(out, 'storage:game:1')).toBeTruthy();
        expect(focus(out, 'storage:game:2')).toBeTruthy();
    });
    it('keeps the eyebrow above the scrolling list, so going back up to the first row never hides it or cuts its ring (PS5, 2026-11-18)', () => {
        const out = render(view());
        const list = tree(out).find(e => String(e.props.className).split(' ').includes('gg-storage-list'))!;
        expect(tree(list).some(e => e.props.className === 'gg-storage-eyebrow')).toBe(false);
        const games = tree(out).find(e => e.props.className === 'gg-storage-games')!;
        expect(tree(games).map(e => e.props.className).filter(c => c === 'gg-storage-eyebrow' || c === 'gg-storage-list')).toEqual(['gg-storage-eyebrow', 'gg-storage-list']);
    });
    it('puts the buttons on each row, and no hint for a missing one', () => {
        const onRow = vi.fn();
        const out = render(view(), { onRow });
        const first = focus(out, 'storage:game:1')!.props, second = focus(out, 'storage:game:2')!.props;
        expect(first).toMatchObject({ onOKActionDescription: 'Game page', onSecondaryActionDescription: 'Move to SD card', onOptionsActionDescription: 'Uninstall' });
        first.onClick(); first.onSecondaryButton(); first.onOptionsButton();
        expect(onRow.mock.calls.map(c => [c[0].appId, c[1]])).toEqual([[1, 'a'], [1, 'x'], [1, 'y']]);
        expect(second.onOKActionDescription).toBe('Game page');
        expect(second).not.toHaveProperty('onSecondaryButton');
        expect(second).not.toHaveProperty('onOptionsButton');
        expect(second).not.toHaveProperty('onSecondaryActionDescription');
        expect(second).not.toHaveProperty('onOptionsActionDescription');
    });
    it('picks a drive when its card takes focus', () => {
        const onPick = vi.fn();
        focus(render(view(), { onPick }), 'storage:drive:1')!.props.onFocus();
        expect(onPick).toHaveBeenCalledWith(1);
    });
    it('draws a moving row\'s progress, the empty line and the note', () => {
        const moving = render(view({ rows: [row(1, { progress: .61 })] }));
        expect(tree(moving).find(e => e.props.className === 'gg-storage-progress-fill')?.props.style).toEqual({ width: '61%' });
        const empty = render(view({ rows: [], empty: 'No games on this drive', note: 'One move at a time.' }));
        expect(text(empty)).toContain('No games on this drive');
        expect(tree(empty).find(e => e.props.role === 'status')?.props.children).toBe('One move at a time.');
    });
    it('shows art or a plain block', () => {
        const out = render(view());
        expect(tree(out).filter(e => e.type === 'img').map(e => e.props.src)).toEqual(['art-1.jpg']);
        expect(tree(focus(out, 'storage:game:2')!.props.children).some(e => e.props.className === 'gg-storage-art gg-storage-art-none')).toBe(true);
    });
    it('draws the hero behind the page when there is one', () => {
        expect(tree(render(view(), { hero: 'hero.jpg' })).find(e => e.props.className === 'gg-storage-hero')?.props.style).toEqual({ backgroundImage: 'url("hero.jpg")' });
        expect(tree(render(view())).some(e => e.props.className === 'gg-storage-hero')).toBe(false);
    });
    it('draws only the title while loading', () => {
        const out = render(view({ available: false, loading: true, cards: [], rows: [], picked: null }));
        expect(text(out)).not.toContain('Storage is unavailable.');
        expect(text(out)).toContain('Storage');
    });
    it('says only that Storage is unavailable', () => {
        const out = render(view({ available: false, cards: [], rows: [], picked: null }));
        expect(text(out)).toContain('Storage is unavailable.');
        expect(tree(out).some(e => e.props['data-gg-focus'])).toBe(false);
    });
});
